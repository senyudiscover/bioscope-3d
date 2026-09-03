import { describe, expect, it } from 'vitest';
import type { VanatomeStructure } from '@vixotic/vanatome-react';
import {
  availableDisplayLayers,
  createFilteredAtlas,
  displayLayerOptions,
  displayLayersFor,
  matchesDisplayLayer,
  matchesSystem,
  systemFilterOptions,
} from '@/lib/anatomy-filters';

// ============================================================================
// 过滤层回归基线测试（audit 稳定化护栏 · 任务 3）
//
// 本文件固化 lib/anatomy-filters.ts 的【当前】真实行为，包括已知的
// musclePattern "污染"（tendon/ligament 计入肌肉层、Spinalis 被归入
// 神经血管层等）。这些测试不认可分类在医学上正确，只锁定现状，
// 为未来有意识地修改分类规则提供 diff 基线。
// ============================================================================

const structure = (
  seed: Partial<VanatomeStructure> & Pick<VanatomeStructure, 'id' | 'name'>,
): VanatomeStructure => ({
  // 默认 system 选一个不触发任何 system 兜底分类的值（muscular/skeletal 会给
  // muscle/skeleton 层，nervous/cardiovascular/lymphatic 会给 neurovascular 层）。
  system: 'test-neutral',
  layer: 'test-layer',
  kind: 'part',
  position: [0, 0, 0],
  ...seed,
});

const layerNames = (structure: VanatomeStructure) =>
  [...displayLayersFor(structure)].sort();

const ids = (structures: readonly VanatomeStructure[]) =>
  structures.map((item) => item.id);

// ---------------------------------------------------------------------------
// A. System Filtering
// ---------------------------------------------------------------------------

describe('A · matchesSystem', () => {
  it("filter 'all' 恒为 true，包括未知 system 与空 system", () => {
    expect(matchesSystem(structure({ id: 'x', name: 'X' }), 'all')).toBe(true);
    expect(
      matchesSystem(structure({ id: 'x', name: 'X', system: 'nonexistent' }), 'all'),
    ).toBe(true);
    expect(matchesSystem(structure({ id: 'x', name: 'X', system: '' }), 'all')).toBe(true);
  });

  it('具体系统为严格相等（大小写敏感基线）', () => {
    expect(
      matchesSystem(structure({ id: 'x', name: 'X', system: 'cardiovascular' }), 'cardiovascular'),
    ).toBe(true);
    // 基线：大小写不同即不匹配（无大小写归一）。
    expect(
      matchesSystem(structure({ id: 'x', name: 'X', system: 'Cardiovascular' }), 'cardiovascular'),
    ).toBe(false);
    expect(
      matchesSystem(structure({ id: 'x', name: 'X', system: 'muscular' }), 'cardiovascular'),
    ).toBe(false);
  });

  it("'musculoskeletal' 只匹配 muscular 或 skeletal 两种 system", () => {
    expect(matchesSystem(structure({ id: 'x', name: 'X', system: 'muscular' }), 'musculoskeletal')).toBe(true);
    expect(matchesSystem(structure({ id: 'x', name: 'X', system: 'skeletal' }), 'musculoskeletal')).toBe(true);
    expect(matchesSystem(structure({ id: 'x', name: 'X', system: 'nervous' }), 'musculoskeletal')).toBe(false);
    // 名字含 muscle 但 system 不是 muscular → 不匹配（按 system 字段而非名称）。
    expect(
      matchesSystem(structure({ id: 'x', name: 'Deltoid', system: 'nervous' }), 'musculoskeletal'),
    ).toBe(false);
  });

  it('未知 system 值（不在 10 个 union 内）只能被 all 匹配', () => {
    const unknown = structure({ id: 'x', name: 'X', system: 'renal' });

    for (const filter of [
      'cardiovascular',
      'respiratory',
      'digestive',
      'nervous',
      'endocrine',
      'lymphatic',
      'urinary',
      'reproductive',
      'musculoskeletal',
    ] as const) {
      expect(matchesSystem(unknown, filter)).toBe(false);
    }
    expect(matchesSystem(unknown, 'all')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B. createFilteredAtlas
// ---------------------------------------------------------------------------

describe('B · createFilteredAtlas', () => {
  it("基线：system 'all' + layer 'mixed' 返回原数组引用（identity 快捷路径）", () => {
    const atlas = [structure({ id: 'a', name: 'A' }), structure({ id: 'b', name: 'B' })];

    expect(createFilteredAtlas(atlas, 'all', 'mixed')).toBe(atlas);
  });

  it('其他组合返回新数组（即使没有任何结构被剔除）', () => {
    const atlas = [structure({ id: 'a', name: 'A', system: 'cardiovascular' })];

    const result = createFilteredAtlas(atlas, 'cardiovascular', 'mixed');
    expect(result).not.toBe(atlas);
    expect(ids(result)).toEqual(['a']);
  });

  it('移除不匹配 system 的结构', () => {
    const atlas = [
      structure({ id: 'heart', name: 'Heart', system: 'cardiovascular' }),
      structure({ id: 'femur', name: 'Femur', system: 'skeletal' }),
    ];

    expect(ids(createFilteredAtlas(atlas, 'cardiovascular', 'mixed'))).toEqual(['heart']);
  });

  it('layer 不匹配的结构同样被移除（mixed 层除外）', () => {
    const atlas = [
      structure({ id: 'femur', name: 'Femur' }),
      structure({ id: 'liver', name: 'Liver', kind: 'organ' }),
    ];

    expect(ids(createFilteredAtlas(atlas, 'all', 'skeleton'))).toEqual(['femur']);
    // mixed 无条件匹配一切结构。
    expect(ids(createFilteredAtlas(atlas, 'all', 'mixed'))).not.toBe(atlas);
    expect(ids(createFilteredAtlas(atlas, 'all', 'mixed'))).toEqual(['femur', 'liver']);
  });

  it('没有任何匹配时返回空数组', () => {
    const atlas = [structure({ id: 'liver', name: 'Liver', kind: 'organ' })];

    expect(createFilteredAtlas(atlas, 'musculoskeletal', 'mixed')).toEqual([]);
    expect(createFilteredAtlas([], 'all', 'surface')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// C. Display Layer Classification
// ---------------------------------------------------------------------------

describe('C · displayLayersFor 分类基线', () => {
  it('skeleton：骨骼词表命中 或 system === skeletal', () => {
    expect(layerNames(structure({ id: 'x-femur', name: 'Femur' }))).toEqual([
      'mixed',
      'skeleton',
    ]);
    // system 兜底：名称中性但 system 为 skeletal。
    expect(layerNames(structure({ id: 'x-bone-thing', name: 'Thing', system: 'skeletal' }))).toEqual([
      'mixed',
      'skeleton',
    ]);
  });

  it('neurovascular：神经/血管词表命中，或 system 为 nervous/cardiovascular/lymphatic', () => {
    expect(layerNames(structure({ id: 'x-nerve', name: 'Optic Nerve' }))).toEqual([
      'mixed',
      'neurovascular',
    ]);
    expect(layerNames(structure({ id: 'x-aorta', name: 'Aorta' }))).toEqual([
      'mixed',
      'neurovascular',
    ]);
    // system 兜底（cardiovascular 结构恒为 neurovascular 层）。
    expect(
      layerNames(structure({ id: 'heart', name: 'Heart', kind: 'organ', system: 'cardiovascular' })),
    ).toEqual(['mixed', 'neurovascular', 'organ']);
    expect(layerNames(structure({ id: 'x-n', name: 'Thing', system: 'nervous' }))).toEqual([
      'mixed',
      'neurovascular',
    ]);
    expect(layerNames(structure({ id: 'x-l', name: 'Thing', system: 'lymphatic' }))).toEqual([
      'mixed',
      'neurovascular',
    ]);
  });

  it('organ：仅 kind === organ 且 id 非 body-shell、不以 -system 结尾', () => {
    expect(layerNames(structure({ id: 'liver', name: 'Liver', kind: 'organ' }))).toContain('organ');
    expect(layerNames(structure({ id: 'liver', name: 'Liver', kind: 'part' }))).not.toContain('organ');
    expect(layerNames(structure({ id: 'liver', name: 'Liver' }))).not.toContain('organ'); // kind 缺省
    // id 排除规则。
    expect(layerNames(structure({ id: 'body-shell', name: 'Shell', kind: 'organ' }))).not.toContain('organ');
    expect(layerNames(structure({ id: 'heart-system', name: 'Heart', kind: 'organ' }))).not.toContain('organ');
  });

  it('muscle：肌肉词表命中 或 system === muscular', () => {
    expect(layerNames(structure({ id: 'x-deltoid', name: 'Deltoid' }))).toEqual(['mixed', 'muscle']);
    expect(layerNames(structure({ id: 'x-m', name: 'Thing', system: 'muscular' }))).toEqual([
      'mixed',
      'muscle',
    ]);
  });

  it('surface：体表词表命中（body-shell/skin/fascia/surface/integument）', () => {
    expect(layerNames(structure({ id: 'x-skin', name: 'Skin' }))).toEqual(['mixed', 'surface']);
    expect(layerNames(structure({ id: 'body-shell', name: 'Shell' }))).toEqual(['mixed', 'surface']);
    expect(layerNames(structure({ id: 'x-f', name: 'Fascia' }))).toEqual(['mixed', 'surface']);
  });

  it('同一结构可同时属于多个层（多成员基线）', () => {
    // 'cardiac muscle' → muscle（词表）+ organ（kind organ）+ mixed。
    expect(layerNames(structure({ id: 'x-cm', name: 'Cardiac Muscle', kind: 'organ' }))).toEqual([
      'mixed',
      'muscle',
      'organ',
    ]);
  });

  it('选项常量与类型 union 一一对应（10 系统 / 6 显示层）', () => {
    expect(systemFilterOptions.map((option) => option.id)).toEqual([
      'all',
      'cardiovascular',
      'respiratory',
      'digestive',
      'nervous',
      'endocrine',
      'lymphatic',
      'urinary',
      'reproductive',
      'musculoskeletal',
    ]);
    expect(displayLayerOptions.map((option) => option.id)).toEqual([
      'surface',
      'muscle',
      'organ',
      'neurovascular',
      'skeleton',
      'mixed',
    ]);
  });
});

// ---------------------------------------------------------------------------
// D. Muscle Pattern Characterization（锁定现状，不认可/不修复）
// ---------------------------------------------------------------------------

describe('D · musclePattern 现状 characterization', () => {
  const muscleHits = [
    { name: 'Deltoid', note: '三角肌式骨骼肌词命中' },
    { name: 'Quadratus Lumborum', note: 'quadratus 命中' },
    { name: 'Rectus Abdominis', note: 'abdominis 命中' },
    { name: 'External Oblique', note: 'oblique 命中' },
    { name: 'Diaphragm', note: 'diaphragm 命中' },
    { name: 'Papillary Muscle', note: 'muscle 命中（心内结构计入肌肉层）' },
  ] as const;

  it.each(muscleHits)('词表命中：$name（$note）', ({ name }) => {
    expect(matchesDisplayLayer(structure({ id: 'x', name }), 'muscle')).toBe(true);
  });

  it('已知污染：tendon / ligament 计入 muscle 层（当前实现如此）', () => {
    // 肌腱与韧带是结缔组织而非肌肉，但正则将其归入肌肉显示层。
    // 锁定为基线，未来修改分类时此处应更新。
    expect(matchesDisplayLayer(structure({ id: 'x-t', name: 'Tendon' }), 'muscle')).toBe(true);
    expect(matchesDisplayLayer(structure({ id: 'x-l', name: 'Ligament' }), 'muscle')).toBe(true);
  });

  it('基线：Linea Alba 当前不匹配 musclePattern（仅 mixed）', () => {
    expect(layerNames(structure({ id: 'linea-alba', name: 'Linea alba' }))).toEqual(['mixed']);
  });

  it('反向污染：Spinalis（肌肉）当前被归入 neurovascular 而非 muscle', () => {
    // neurovascularPattern 含 'spinal'；'spinalis' 命中它，但 musclePattern 不命中。
    expect(layerNames(structure({ id: 'x-spinalis', name: 'Spinalis' }))).toEqual([
      'mixed',
      'neurovascular',
    ]);
    // 名称中含 'muscle' 时才同时进入两层。
    expect(layerNames(structure({ id: 'x-sm', name: 'Spinalis Muscle' }))).toEqual([
      'mixed',
      'muscle',
      'neurovascular',
    ]);
  });

  it('muscle 与 skeleton 互不包含（当前正则下）', () => {
    expect(layerNames(structure({ id: 'x-femur', name: 'Femur' }))).not.toContain('muscle');
    expect(layerNames(structure({ id: 'x-deltoid', name: 'Deltoid' }))).not.toContain('skeleton');
  });
});

// ---------------------------------------------------------------------------
// E. Mixed Layer 语义
// ---------------------------------------------------------------------------

describe('E · mixed 层语义', () => {
  it('mixed 是无条件 fallback：displayLayersFor 恒包含 mixed，一切结构匹配 mixed', () => {
    for (const item of [
      structure({ id: 'a', name: 'Femur' }),
      structure({ id: 'b', name: 'Deltoid' }),
      structure({ id: 'c', name: 'Unknown Thing' }),
      structure({ id: 'd', name: '', system: '' }),
    ]) {
      expect(displayLayersFor(item).has('mixed')).toBe(true);
      expect(matchesDisplayLayer(item, 'mixed')).toBe(true);
    }
  });

  it('availableDisplayLayers 恒包含 mixed，即使没有任何结构', () => {
    const result = availableDisplayLayers([], 'all');

    expect([...result]).toEqual(['mixed']);
  });

  it('availableDisplayLayers：只统计同时通过 system 过滤的结构', () => {
    const structures = [
      structure({ id: 'heart', name: 'Heart', kind: 'organ', system: 'cardiovascular' }),
      structure({ id: 'femur', name: 'Femur', system: 'skeletal' }),
      structure({ id: 'optic', name: 'Optic Nerve', system: 'nervous' }),
    ];

    const all = availableDisplayLayers(structures, 'all');
    expect([...all].sort()).toEqual(['mixed', 'neurovascular', 'organ', 'skeleton'].sort());

    // 只看心血管系统时，femur 的 skeleton 层不再可用。
    const cv = availableDisplayLayers(structures, 'cardiovascular');
    expect([...cv].sort()).toEqual(['mixed', 'neurovascular', 'organ'].sort());
    expect(cv.has('skeleton')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F. Ancestor Preservation（多级树）
// ---------------------------------------------------------------------------

describe('F · createFilteredAtlas 祖先保留', () => {
  // 多级树（system 'all' + layer 'skeleton' 驱动，匹配完全由词表决定）：
  //   skeletal-system (kind=system, skeletal → 自身有 skeleton 层但 kind=system 不自匹配)
  //   ├─ thigh-group (part, skeletal → 经 system 兜底自匹配)
  //   │   ├─ femur (organ, skeletal, 词表命中)
  //   │   │   └─ knee-region (part, digestive, 无任何层 → 命中结构的后代仍被剔除)
  //   │   └─ tibia (part, skeletal, 词表命中)
  //   └─ arm-group (part, digestive, 无任何层 → 仅因是 humerus 的祖先被保留)
  //       └─ humerus (part, skeletal, 词表命中)
  const skeletonTree = () => [
    structure({ id: 'skeletal-system', name: 'Skeletal System', kind: 'system' as const, system: 'skeletal' }),
    structure({ id: 'thigh-group', name: 'Thigh Group', parentId: 'skeletal-system', system: 'skeletal' }),
    structure({ id: 'femur', name: 'Femur', kind: 'organ' as const, parentId: 'thigh-group', system: 'skeletal' }),
    structure({ id: 'knee-region', name: 'Knee Region', parentId: 'femur', system: 'digestive' }),
    structure({ id: 'tibia', name: 'Tibia', parentId: 'thigh-group', system: 'skeletal' }),
    structure({ id: 'arm-group', name: 'Arm Region', parentId: 'skeletal-system', system: 'digestive' }),
    structure({ id: 'humerus', name: 'Humerus', parentId: 'arm-group', system: 'skeletal' }),
  ];

  it('命中深层结构时，全部祖先（含 kind=system 根）按引用链保留，后代不保留', () => {
    const result = createFilteredAtlas(skeletonTree(), 'all', 'skeleton');

    // 基线：knee-region 是命中结构 femur 的后代，但自身无 skeleton 层 → 被剔除
    // （只保留祖先，不保留后代）；skeletal-system 靠祖先链进入结果。
    expect(ids(result)).toEqual([
      'skeletal-system',
      'thigh-group',
      'femur',
      'tibia',
      'arm-group',
      'humerus',
    ]);
  });

  it('祖先链保留不要求祖先自身匹配 layer（arm-group 无任何层仍被保留）', () => {
    const result = createFilteredAtlas(skeletonTree(), 'all', 'skeleton');

    expect(ids(result)).toContain('arm-group');
    expect(matchesDisplayLayer(structure({ id: 'arm-group', name: 'Arm Region', system: 'digestive' }), 'skeleton')).toBe(false);
  });

  it("kind='system' 根节点不因自身匹配进入结果（只经祖先链）", () => {
    // heart 无父节点 → cardiovascular-system 无人引用 → 被剔除，
    // 即使它的 system 与过滤器一致。
    const atlas = [
      structure({ id: 'cardiovascular-system', name: 'Cardiovascular System', kind: 'system' as const, system: 'cardiovascular' }),
      structure({ id: 'heart', name: 'Heart', kind: 'organ' as const, system: 'cardiovascular' }),
    ];

    const result = createFilteredAtlas(atlas, 'cardiovascular', 'mixed');
    expect(ids(result)).toEqual(['heart']);
  });

  it('多个结构共享同一祖先时，祖先只出现一次（输入顺序保持）', () => {
    const result = createFilteredAtlas(skeletonTree(), 'all', 'skeleton');

    expect(ids(result).filter((id) => id === 'thigh-group')).toHaveLength(1);
    // filter 保持输入相对顺序。
    expect(ids(result).indexOf('thigh-group')).toBeLessThan(ids(result).indexOf('femur'));
  });

  it('system root 在无任何后代命中时整体消失', () => {
    // 同一棵树以 surface 层过滤：无任何结构命中 surface → 空结果，
    // system 根也不保留。
    expect(createFilteredAtlas(skeletonTree(), 'all', 'surface')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// G. Selectable / 元数据保真
// ---------------------------------------------------------------------------

describe('G · 元数据保真', () => {
  it('createFilteredAtlas 返回原结构对象引用（不克隆、不改字段）', () => {
    const femur = structure({
      id: 'femur',
      name: 'Femur',
      kind: 'organ',
      system: 'skeletal',
      selectable: false,
      parentId: 'thigh-group',
    });
    const atlas = [femur];

    const result = createFilteredAtlas(atlas, 'musculoskeletal', 'skeleton');

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(femur); // 同一引用
    expect(result[0].selectable).toBe(false);
    expect(result[0].parentId).toBe('thigh-group');
    expect(result[0].kind).toBe('organ');
    expect(result[0].system).toBe('skeletal');
  });

  it('本模块不负责 selectable / position 等字段（不修改、不推导）', () => {
    // 与 anatomy-workbench 中 viewerAtlas 的 mixed+system 路径（会改 selectable）
    // 划清边界：filters 模块本身永远原样返回结构对象。
    const atlas = [
      structure({ id: 'heart', name: 'Heart', kind: 'organ', selectable: true, system: 'cardiovascular' }),
      structure({ id: 'x', name: 'X', selectable: false, system: 'cardiovascular' }),
    ];

    const result = createFilteredAtlas(atlas, 'cardiovascular', 'mixed');
    expect(result[0].selectable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// H. Edge Cases
// ---------------------------------------------------------------------------

describe('H · 边界情况', () => {
  it('空 atlas：all+mixed 返回原引用，其他组合返回新空数组', () => {
    const empty: VanatomeStructure[] = [];

    expect(createFilteredAtlas(empty, 'all', 'mixed')).toBe(empty);
    const result = createFilteredAtlas(empty, 'all', 'surface');
    expect(result).toEqual([]);
    expect(result).not.toBe(empty);
  });

  it("structure system 为空字符串：仅 'all' 匹配，不影响层分类", () => {
    const blank = structure({ id: 'x', name: 'Thing', system: '' });

    expect(matchesSystem(blank, 'all')).toBe(true);
    expect(matchesSystem(blank, 'cardiovascular')).toBe(false);
    expect(layerNames(blank)).toEqual(['mixed']);
  });

  it('structure 无 kind：不进 organ 层，但可经词表进入其他层', () => {
    // 显式覆盖 helper 默认的 kind:'part'，模拟 loader 允许的 kind 缺省结构。
    const noKind = structure({ id: 'x-femur', name: 'Femur', kind: undefined });

    expect(noKind.kind).toBeUndefined();
    expect(layerNames(noKind)).toEqual(['mixed', 'skeleton']);
  });

  it('名称为空字符串时仍可用 id 命中词表（text = id + 空格）', () => {
    const result = structure({ id: 'femur-x', name: '' });

    expect(matchesDisplayLayer(result, 'skeleton')).toBe(true);
  });

  it('名称完全无词表命中、kind 缺省 → 仅 mixed（unmatched 落入 mixed）', () => {
    expect(layerNames(structure({ id: 'x-weird', name: 'Bla Bla' }))).toEqual(['mixed']);
  });

  it('重复祖先引用：多个命中共享祖先时 Set 去重，不产生重复项', () => {
    const atlas = [
      structure({ id: 'trunk', name: 'Trunk' }),
      structure({ id: 'a-femur', name: 'Femur', parentId: 'trunk' }),
      structure({ id: 'a-tibia', name: 'Tibia', parentId: 'trunk' }),
    ];

    const result = createFilteredAtlas(atlas, 'all', 'skeleton');
    expect(ids(result)).toEqual(['trunk', 'a-femur', 'a-tibia']);
  });
});
