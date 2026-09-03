import { describe, expect, it } from 'vitest';
import type { VanatomeStructure } from '@vixotic/vanatome-react';
import type { AnatomySystemFilter, DisplayLayerFilter } from '@/lib/anatomy-filters';
import {
  availableDisplayLayers,
  displayLayerOptions,
  displayLayersFor,
  matchesDisplayLayer,
  matchesSystem,
  systemFilterOptions,
} from '@/lib/anatomy-filters';

// ============================================================================
// Anatomy Filter 分类器碰撞矩阵 + 确定性 fuzz（Deep Assurance #002 · Track D）
//
// 只输出证据、不修改任何 classifier regex。矩阵行 = 【当前正则下】真实
// 解剖名会落入的显示层组合，用于暴露三类问题：
//   COLLISION   —— 一个名字同时命中多个语义冲突的层（如 ulnar nerve → 骨骼+神经血管）
//   MISS        —— 常见解剖名完全不命中任何词表，只能落 mixed（依赖 atlas 元数据兜底）
//   POLLUTION   —— 已知误归类基线（tendon/ligament→muscle、spinalis→neurovascular），
//                  anatomy-filters.test.ts D 组已固化，此处仅纳入矩阵全貌
// ============================================================================

type Case = {
  id: string;
  name: string;
  system?: string;
  kind?: 'system' | 'organ' | 'part';
  /** 当前实现下的期望层（排序后）。 */
  expect: DisplayLayerFilter[];
  /** 碰撞类别与说明（写入矩阵的证据列）。 */
  note: string;
};

const CASES: Case[] = [
  // —— COLLISION：跨层同时命中 ——
  { id: 'x1', name: 'Ulnar nerve', expect: ['mixed', 'skeleton', 'neurovascular'], note: 'COLLISION: "ulna" 是 "ulnar" 子串 → 神经被归入骨骼层' },
  { id: 'x2', name: 'Fibular artery', expect: ['mixed', 'skeleton', 'neurovascular'], note: 'COLLISION: "fibula" ⊂ "fibular" → 动脉被归入骨骼层' },
  { id: 'x3', name: 'Vertebral artery', expect: ['mixed', 'skeleton', 'neurovascular'], note: 'COLLISION: vertebra(骨) + arter(血管) 双命中' },
  { id: 'x4', name: 'Muscular artery', expect: ['mixed', 'muscle', 'neurovascular'], note: 'COLLISION: muscular(肌) + arter(血管) 双命中' },
  { id: 'x5', name: 'Adrenal medulla', expect: ['mixed', 'neurovascular'], note: 'COLLISION: 内分泌器官的髓质按 "medulla" 落入神经血管层' },
  { id: 'x6', name: 'Cerebral arterial circle', expect: ['mixed', 'neurovascular'], note: 'OK: cerebr+arter 同层' },
  { id: 'x7', name: 'Cardiac muscle', kind: 'organ', expect: ['mixed', 'muscle', 'organ'], note: 'COLLISION(合理): 肌层+器官层' },
  // —— POLLUTION：已知误归类基线 ——
  { id: 'x8', name: 'Tendon', expect: ['mixed', 'muscle'], note: 'POLLUTION(基线): 结缔组织计入肌层' },
  { id: 'x9', name: 'Ligament', expect: ['mixed', 'muscle'], note: 'POLLUTION(基线): 结缔组织计入肌层' },
  { id: 'x10', name: 'Spinalis', expect: ['mixed', 'neurovascular'], note: 'POLLUTION(基线): 肌肉被 "spinal" 归入神经血管层' },
  { id: 'x11', name: 'Papillary muscle', expect: ['mixed', 'muscle'], note: 'POLLUTION(基线): 心内结构计入肌层' },
  // —— MISS：词表完全不命中（mixed 兜底；atlas system 元数据可部分挽救）——
  { id: 'x12', name: 'Gluteus maximus', expect: ['mixed'], note: 'MISS: 主要骨骼肌无关键词;仅当 system=muscular 才入肌层' },
  { id: 'x13', name: 'Gluteus maximus', system: 'muscular', expect: ['mixed', 'muscle'], note: 'MISS 兜底: system 元数据接管' },
  { id: 'x14', name: 'Biceps brachii', expect: ['mixed'], note: 'MISS: 无关键词' },
  { id: 'x15', name: 'Sternocleidomastoid', expect: ['mixed'], note: 'MISS: 颈部主要肌肉;sternocleidomastoid 不含 sternum' },
  { id: 'x16', name: 'Sphincter', expect: ['mixed'], note: 'MISS: 括约肌' },
  { id: 'x17', name: 'Vena cava', expect: ['mixed'], note: 'MISS: 主要静脉;vein/venous 都不匹配 "vena cava"' },
  { id: 'x18', name: 'Aortic valve', kind: 'organ', expect: ['mixed', 'organ'], note: 'MISS: "aortic" 不含 "aorta"(a-o-r-t-i-c)→ 不入神经血管层' },
  { id: 'x19', name: 'Pericardium', kind: 'organ', expect: ['mixed', 'organ'], note: 'MISS: 心包无关键词' },
  { id: 'x20', name: 'Intercostal', expect: ['mixed'], note: 'MISS: 肋间肌不含 rib' },
  // —— OK：正常命中 ——
  { id: 'x21', name: 'Femur', expect: ['mixed', 'skeleton'], note: 'OK' },
  { id: 'femur.l', name: '', expect: ['mixed', 'skeleton'], note: 'OK: text = id+name,侧别后缀不影响词根命中' },
  { id: 'x22', name: 'Radial artery', expect: ['mixed', 'neurovascular'], note: 'OK: "radial" 不含 "radius",无骨骼误命中' },
  { id: 'x23', name: 'Optic nerve', expect: ['mixed', 'neurovascular'], note: 'OK' },
  { id: 'x24', name: 'Brachial plexus', expect: ['mixed', 'neurovascular'], note: 'OK' },
  { id: 'x25', name: 'Fascia lata', expect: ['mixed', 'surface'], note: '基线: fascia → surface' },
  { id: 'body-shell', name: 'Body Shell', kind: 'organ', expect: ['mixed', 'surface'], note: '基线: id 精确排除 organ 层' },
  { id: 'x26-system', name: 'Something', kind: 'organ', system: 'cardiovascular', expect: ['mixed', 'neurovascular'], note: '基线: -system 后缀 id 排除 organ 层' },
  { id: 'x27', name: 'Heart', kind: 'organ', system: 'cardiovascular', expect: ['mixed', 'neurovascular', 'organ'], note: '基线: organ+system 兜底' },
];

const layerNames = (structure: VanatomeStructure) => [...displayLayersFor(structure)].sort();

const structureOf = (c: Case): VanatomeStructure => ({
  system: c.system ?? 'test-neutral',
  layer: 'test-layer',
  kind: c.kind ?? 'part',
  position: [0, 0, 0],
  id: c.id,
  name: c.name,
});

const SYSTEMS = ['test-neutral', 'cardiovascular', 'respiratory', 'digestive', 'nervous', 'endocrine', 'lymphatic', 'urinary', 'reproductive', 'muscular', 'skeletal', 'Cardiovascular'];
const KINDS = ['part', 'organ', 'system', undefined] as const;

const mk = (name: string, system: string, kind: (typeof KINDS)[number], i: number): VanatomeStructure => ({
  id: `${kind ?? 'p'}-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  system,
  layer: 'test-layer',
  kind,
  position: [0, 0, 0],
});

// ---------------------------------------------------------------------------
// 碰撞矩阵（characterization 快照）
// ---------------------------------------------------------------------------

describe('classifier collision matrix', () => {
  it.each(CASES.map((c) => [c, c] as const))('$note', (c) => {
    expect(layerNames(structureOf(c))).toEqual([...c.expect].sort());
  });

  it('矩阵自检：COLLISION/MISS 行确实存在（防止未来修词表后矩阵静默失真）', () => {
    const ulnar = displayLayersFor(structureOf(CASES[0]));
    expect(ulnar.has('skeleton') && ulnar.has('neurovascular')).toBe(true);
    expect(displayLayersFor(structureOf(CASES.find((c) => c.id === 'x12')!))).toEqual(new Set<DisplayLayerFilter>(['mixed']));
  });
});

// ---------------------------------------------------------------------------
// 性质不变量：语料 × system × kind 网格
// ---------------------------------------------------------------------------

describe('classifier 性质不变量', () => {
  const NAMES = CASES.map((c) => c.name).concat([
    'Left Ventricle', 'Right Atrium', 'Temporalis', 'Masseter', 'Linea alba',
    'Conus arteriosus', 'Ductus venosus', 'Nodulus', 'Coccygeal plexus',
    'Sacral canal', 'Skin of forehead', 'Pons', 'Medulla oblongata',
  ]);

  it("不变量：'mixed' 恒在层集合中（全网格）", () => {
    for (const name of NAMES) {
      for (const system of SYSTEMS) {
        for (const kind of KINDS) {
          const s = mk(name, system, kind, NAMES.indexOf(name));
          expect(displayLayersFor(s).has('mixed')).toBe(true);
          expect(matchesDisplayLayer(s, 'mixed')).toBe(true);
        }
      }
    }
  });

  it('不变量：organ 层 ⇔ kind=organ 且 id≠body-shell 且 id 不以 -system 结尾', () => {
    for (const name of NAMES) {
      for (const system of SYSTEMS) {
        for (const kind of KINDS) {
          const s = mk(name, system, kind, NAMES.indexOf(name));
          const expected =
            s.kind === 'organ' && s.id !== 'body-shell' && !s.id.endsWith('-system');
          expect(displayLayersFor(s).has('organ')).toBe(expected);
        }
      }
    }
  });

  it('不变量：matchesSystem 对每个 (structure, filter) 组合给出自洽结果', () => {
    for (const name of NAMES) {
      const s = mk(name, 'skeletal', 'part', 0);
      for (const option of systemFilterOptions) {
        const result = matchesSystem(s, option.id);
        if (option.id === 'all') expect(result).toBe(true);
        else if (option.id === 'musculoskeletal') expect(result).toBe(true); // skeletal
        else expect(result).toBe(false);
      }
    }
  });

  it('不变量：displayLayersFor 确定性（同输入两次调用集合相等）', () => {
    for (const name of NAMES) {
      const s = mk(name, 'muscular', 'organ', 0);
      expect([...displayLayersFor(s)].sort()).toEqual([...displayLayersFor(s)].sort());
    }
  });
});

// ---------------------------------------------------------------------------
// availableDisplayLayers 组合语义 + 确定性 fuzz
// ---------------------------------------------------------------------------

describe('availableDisplayLayers 语义', () => {
  it('恒包含 mixed；只统计同时通过 system 过滤的结构', () => {
    const structures = [
      mk('Femur', 'skeletal', 'part', 0),
      mk('Heart', 'cardiovascular', 'organ', 1),
      mk('Deltoid', 'muscular', 'part', 2),
    ];
    const all = [...availableDisplayLayers(structures, 'all')].sort();
    expect(all).toEqual(['mixed', 'muscle', 'neurovascular', 'organ', 'skeleton']);
    expect([...availableDisplayLayers([], 'all')]).toEqual(['mixed']);
    const cv = [...availableDisplayLayers(structures, 'cardiovascular')].sort();
    expect(cv).toEqual(['mixed', 'neurovascular', 'organ']);
  });

  it('fuzz（固定种子）：输出永远是合法层 id 子集且含 mixed', () => {
    // mulberry32 确定性 PRNG（与 picking-adversarial 相同实现，零依赖）。
    function mulberry32(seed: number) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const FRAGMENTS = ['muscle', 'nerve', 'arter', 'vein', 'bone', 'rib', 'vertebra', 'skull',
      'spinal', 'lymph', 'node', 'skin', 'fascia', 'tendon', 'ligament', 'aorta', 'plexus',
      'brain', 'cartilage', 'zzz', 'organ', 'shell', 'surface', ''];
    const validIds = new Set(displayLayerOptions.map((option) => option.id));

    for (let seed = 1; seed <= 40; seed += 1) {
      const rng = mulberry32(seed);
      const structures: VanatomeStructure[] = [];
      for (let i = 0; i < 12; i += 1) {
        const words = Array.from({ length: 1 + Math.floor(rng() * 3) }, () =>
          FRAGMENTS[Math.floor(rng() * FRAGMENTS.length)],
        );
        structures.push(mk(words.join(' '), SYSTEMS[Math.floor(rng() * SYSTEMS.length)], KINDS[Math.floor(rng() * KINDS.length)], i));
      }
      const system = (rng() < 0.5 ? 'all' : SYSTEMS[Math.floor(rng() * SYSTEMS.length)]) as AnatomySystemFilter;
      const layers = availableDisplayLayers(structures, system);
      expect(layers.has('mixed')).toBe(true);
      for (const id of layers) expect(validIds.has(id)).toBe(true);
      // 与全量重算一致：只有同时通过 system 过滤的结构才能贡献层。
      for (const option of displayLayerOptions) {
        if (option.id === 'mixed') continue;
        const shouldBeAvailable = structures.some(
          (s) => matchesSystem(s, system) && displayLayersFor(s).has(option.id),
        );
        expect(layers.has(option.id)).toBe(shouldBeAvailable);
      }
    }
  });
});
