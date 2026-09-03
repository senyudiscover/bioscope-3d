import { describe, expect, it } from 'vitest';
import type { VanatomeStructure } from '@vixotic/vanatome-react';
import type {
  AnatomySystemFilter,
  DisplayLayerFilter,
} from '@/lib/anatomy-filters';
import {
  createPickableStates,
  resolvePickCandidates,
} from '@/lib/picking-manager';

// ============================================================================
// Picking 对抗性 / 性质测试（Deep Assurance #002 · Track C）
//
// 与 tests/picking-manager.test.ts（回归基线）互补：这里专测【畸形输入、
// 极端组合与不依赖具体分数的普适不变量】。全部为 characterization：
// 锁定当前行为，不认定其理想。发现项分类：
//   KNOWN BEHAVIOR   —— 刻意固化的现状
//   POSSIBLE BUG     —— 记录在 Deep Assurance 报告，不在测试内"修复"
//
// 已知但【不放入测试】的缺陷：resolvePickCandidates → getAncestors 对
// cyclic parentId 无环保护，构造环会导致该函数死循环（createPickableStates
// 的 BFS 有 visited 集合，是安全的——见下方环图测试）。为避免拖垮测试
// 套件，挂死行为只在报告/文档中记录，不写成测试。
// ============================================================================

type ResolveInput = Parameters<typeof resolvePickCandidates>[0];

const structure = (
  seed: Partial<VanatomeStructure> & Pick<VanatomeStructure, 'id' | 'name'>,
): VanatomeStructure => ({
  system: 'test-neutral',
  layer: 'test-layer',
  kind: 'part',
  position: [5, 0, 0],
  ...seed,
});

const resolvePick = (
  overrides: Partial<ResolveInput> & Pick<ResolveInput, 'structures' | 'hitId'>,
) =>
  resolvePickCandidates({
    activeSystem: 'all' as AnatomySystemFilter,
    displayLayer: 'mixed' as DisplayLayerFilter,
    selectedId: null,
    hiddenIds: [],
    isolation: null,
    ...overrides,
  });

const candidateIds = (resolution: ReturnType<typeof resolvePickCandidates>) =>
  resolution.candidates.map((item) => item.id);

/** mulberry32：确定性 PRNG，保证 fuzz 用例可复现（零新依赖）。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// CA. 畸形 / 对抗输入（KNOWN BEHAVIOR）
// ---------------------------------------------------------------------------

describe('CA · 对抗输入', () => {
  it('畸形元数据：structures 数组含重复 id → 结果确定、候选不重复（byId 后者胜出）', () => {
    const first = structure({ id: 'dup-organ', name: 'Dup First', kind: 'part' });
    const second = structure({ id: 'dup-organ', name: 'Dup Second', kind: 'organ' });

    const resolution = resolvePick({ structures: [first, second], hitId: 'dup-organ' });

    expect(candidateIds(resolution)).toEqual(['dup-organ']);
    expect(resolution.primary?.name).toBe('Dup Second');
    expect(resolution.ambiguous).toBe(false);
  });

  it('畸形元数据：hitId 结构 position 含 NaN → 不崩溃、仍确定性返回命中者', () => {
    // NaN 距离使空间邻域失效（NaN <= 0.16 为 false）、分数为 NaN；
    // 排序比较器 NaN 为 falsy → 回退 id 字典序，行为仍确定。
    const broken = structure({ id: 'a-nan-hit', name: 'Nan Hit', position: [Number.NaN, 0, 0] });
    const near = structure({ id: 'b-nan-near', name: 'Nan Near', position: [0.01, 0, 0] });

    const resolution = resolvePick({ structures: [broken, near], hitId: 'a-nan-hit' });

    // NaN 命中者仍是唯一显式种子；近邻无法经空间邻域进入（距离 NaN）。
    expect(candidateIds(resolution)).toEqual(['a-nan-hit']);
    expect(resolution.primary?.id).toBe('a-nan-hit');
    expect(resolution.ambiguous).toBe(false);
  });

  it('畸形元数据：hiddenIds / selectedId 含未知 id → 无副作用，正常解析', () => {
    const alpha = structure({ id: 'ghost-safe', name: 'Ghost Safe' });

    const withGhostHidden = resolvePick({
      structures: [alpha],
      hitId: 'ghost-safe',
      hiddenIds: ['not-a-structure'],
    });

    expect(withGhostHidden.primary?.id).toBe('ghost-safe');
  });

  it('畸形元数据：isolation 指向未知 id → 除该幽灵 id 外全部结构不可选（基线）', () => {
    // getDescendants('ghost') = {'ghost'}；真实结构都不在隔离集合内 → visible=false。
    const alpha = structure({ id: 'iso-victim', name: 'Iso Victim' });

    const resolution = resolvePick({
      structures: [alpha],
      hitId: 'iso-victim',
      isolation: { id: 'ghost-isolate', mode: 'selected' },
    });

    expect(resolution.primary).toBeNull();
    expect(resolution.candidates).toEqual([]);
  });

  it('畸形元数据：空 structures 数组 + 已知 hitId → 空结果', () => {
    const resolution = resolvePick({ structures: [], hitId: 'anything' });

    expect(resolution).toEqual({ primary: null, candidates: [], ambiguous: false });
  });
});

// ---------------------------------------------------------------------------
// CB. selectable:false（anatomy-workbench 真实会设置的标志，此前零覆盖）
// ---------------------------------------------------------------------------

describe('CB · selectable=false', () => {
  it('createPickableStates：selectable=false → pickable=false，visible 不受影响', () => {
    const marked = structure({ id: 'sel-off', name: 'Sel Off', selectable: false });
    const normal = structure({ id: 'sel-on', name: 'Sel On' });

    const result = createPickableStates({
      structures: [marked, normal],
      activeSystem: 'all' as AnatomySystemFilter,
      displayLayer: 'mixed' as DisplayLayerFilter,
      hiddenIds: [],
      isolation: null,
    });

    expect(result.get('sel-off')?.visible).toBe(true);
    expect(result.get('sel-off')?.pickable).toBe(false);
    expect(result.get('sel-on')?.pickable).toBe(true);
  });

  it('命中 selectable=false 结构且无近邻 → 空结果', () => {
    const off = structure({ id: 'cb-off', name: 'Cb Off', selectable: false });

    const resolution = resolvePick({ structures: [off], hitId: 'cb-off' });

    expect(resolution).toEqual({ primary: null, candidates: [], ambiguous: false });
  });

  it('命中 selectable=false 结构时 0.16 邻域内的可选结构接管点击（空间救援）', () => {
    const off = structure({ id: 'cb-off-hit', name: 'Cb Off Hit', selectable: false, position: [0, 0, 0] });
    const on = structure({ id: 'cb-on-near', name: 'Cb On Near', position: [0.05, 0, 0] });

    const resolution = resolvePick({ structures: [off, on], hitId: 'cb-off-hit' });

    expect(candidateIds(resolution)).toEqual(['cb-on-near']);
    expect(resolution.primary?.id).toBe('cb-on-near');
  });
});

// ---------------------------------------------------------------------------
// CC. 候选上限 / 歧义判定盲区
// ---------------------------------------------------------------------------

describe('CC · 候选上限与歧义例外', () => {
  it('候选最多保留 5 个（命中者 + 同分近邻中字典序前 4）', () => {
    const hit = structure({ id: 'cap-hit', name: 'Cap Hit', position: [0, 0, 0] });
    const near = Array.from({ length: 5 }, (_, i) =>
      structure({ id: `cap-${i + 1}`, name: `Cap ${i + 1}`, position: [0.01, 0, 0] }),
    );

    const resolution = resolvePick({ structures: [hit, ...near], hitId: 'cap-hit' });

    expect(candidateIds(resolution)).toEqual([
      'cap-hit',
      'cap-1',
      'cap-2',
      'cap-3',
      'cap-4',
    ]);
    expect(resolution.ambiguous).toBe(true);
  });

  it('organ 例外仅当第二候选是其子结构；非子结构近邻不抑制 ambiguous', () => {
    // 评分基线：organ 位于 0.05（距离项 15）→ 219；命中 part 212。分差 7 <14。
    // 命中者不是 organ 的子 → 例外条款不生效 → ambiguous = true。
    const organ = structure({ id: 'amb-organ', name: 'Amb Organ', kind: 'organ', position: [0.05, 0, 0] });
    const hit = structure({ id: 'amb-hit', name: 'Amb Hit', position: [0, 0, 0] });

    const resolution = resolvePick({ structures: [organ, hit], hitId: 'amb-hit' });

    expect(candidateIds(resolution)).toEqual(['amb-organ', 'amb-hit']);
    expect(resolution.ambiguous).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CD. 选中分支的空间救援（点击分支外结构时，分支内共位结构接管）
// ---------------------------------------------------------------------------

describe('CD · 选中分支救援', () => {
  it('点击选中分支之外：分支内共位子结构以分支加分反超命中者成为 primary', () => {
    // 评分基线（selectedId 'cd-root'）：
    //   cd-child = 100+45+25+22+(28+1*4)=232；cd-root = 220；cd-hit = 190（-22 分支外）。
    const root = structure({ id: 'cd-root', name: 'Cd Root', kind: 'organ', position: [0, 0, 0] });
    const child = structure({ id: 'cd-child', name: 'Cd Child', parentId: 'cd-root', position: [0, 0, 0] });
    const hit = structure({ id: 'cd-hit', name: 'Cd Hit', position: [0, 0, 0] });

    const resolution = resolvePick({
      structures: [root, child, hit],
      hitId: 'cd-hit',
      selectedId: 'cd-root',
    });

    expect(candidateIds(resolution)).toEqual(['cd-child', 'cd-root', 'cd-hit']);
    expect(resolution.primary?.id).toBe('cd-child');
    expect(resolution.ambiguous).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CE. 环图安全性（createPickableStates 必须可终止）
// ---------------------------------------------------------------------------

describe('CE · 环图安全性', () => {
  it('parentId 成环时 createPickableStates 可终止且隐藏/隔离语义不崩溃', () => {
    const a = structure({ id: 'cyc-a', name: 'Cyc A', parentId: 'cyc-b' });
    const b = structure({ id: 'cyc-b', name: 'Cyc B', parentId: 'cyc-a' });

    const hidden = createPickableStates({
      structures: [a, b],
      activeSystem: 'all' as AnatomySystemFilter,
      displayLayer: 'mixed' as DisplayLayerFilter,
      hiddenIds: ['cyc-a'],
      isolation: null,
    });
    expect(hidden.get('cyc-a')?.visible).toBe(false);
    expect(hidden.get('cyc-b')?.visible).toBe(false);

    const isolated = createPickableStates({
      structures: [a, b],
      activeSystem: 'all' as AnatomySystemFilter,
      displayLayer: 'mixed' as DisplayLayerFilter,
      hiddenIds: [],
      isolation: { id: 'cyc-a', mode: 'selected' },
    });
    expect(isolated.get('cyc-a')?.pickable).toBe(true);
    expect(isolated.get('cyc-b')?.pickable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CF. 确定性 fuzz：随机树 + 随机上下文的不变量（mulberry32 固定种子）
// ---------------------------------------------------------------------------

describe('CF · fuzz 不变量（随机树,固定种子）', () => {
  const SYSTEMS = [
    'cardiovascular',
    'digestive',
    'nervous',
    'skeletal',
    'muscular',
    'test-neutral',
  ] as const;

  /** 生成确定性随机场景：随机树 + 随机过滤器/隐藏/隔离/选中上下文。 */
  function buildScenario(rng: () => number) {
    const count = 8 + Math.floor(rng() * 50);
    const structures: VanatomeStructure[] = [];
    for (let i = 0; i < count; i += 1) {
      const parent = i === 0 ? undefined : structures[Math.floor(rng() * i)];
      const near = rng() < 0.3;
      const name = rng() < 0.1 ? `Part ${i} internal structures` : `Part ${i}`;
      structures.push(
        structure({
          id: `s-${i}`,
          name,
          kind: rng() < 0.2 ? 'organ' : rng() < 0.05 ? 'system' : 'part',
          system: SYSTEMS[Math.floor(rng() * SYSTEMS.length)],
          parentId: parent?.id,
          selectable: rng() < 0.9 ? undefined : false,
          position: near ? [rng() * 0.1, 0, 0] : [2 + rng() * 10, 0, 0],
        }),
      );
    }
    const hiddenCandidates = structures.filter(() => rng() < 0.05).map((item) => item.id);
    const isolation = rng() < 0.25
      ? {
          id: structures[Math.floor(rng() * structures.length)].id,
          mode: (rng() < 0.5 ? 'selected' : 'parent-context') as 'selected' | 'parent-context',
        }
      : null;
    const context = {
      structures,
      hitId: structures[Math.floor(rng() * structures.length)].id,
      activeSystem: (rng() < 0.5 ? 'all' : SYSTEMS[Math.floor(rng() * SYSTEMS.length)]) as AnatomySystemFilter,
      displayLayer: (['mixed', 'organ', 'muscle', 'skeleton', 'neurovascular', 'surface'] as const)[
        Math.floor(rng() * 6)
      ] as DisplayLayerFilter,
      selectedId: rng() < 0.4 ? structures[Math.floor(rng() * structures.length)].id : null,
      hiddenIds: hiddenCandidates,
      isolation,
    };
    return context;
  }

  /** 与输入顺序无关的确定性洗牌（Fisher-Yates，PRNG 驱动）。 */
  function shuffled<T>(items: readonly T[], rng: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const internalPattern = /internal.*structures|structures.*internal/i;
  const ITERATIONS = 30;

  it('不变量：确定性、与输入顺序无关、候选集合法、primary 与候选一致', () => {
    for (let seed = 1; seed <= ITERATIONS; seed += 1) {
      const context = buildScenario(mulberry32(seed));

      const first = resolvePick(context);
      const second = resolvePick(context);
      // 1) 同输入两次调用逐字段一致。
      expect(second).toEqual(first);

      // 2) 打乱 structures 数组顺序不改变结果（排序总序由分数+id 决定）。
      const reshuffled = resolvePick({
        ...context,
        structures: shuffled(context.structures, mulberry32(seed + 10_000)),
      });
      expect(candidateIds(reshuffled)).toEqual(candidateIds(first));
      expect(reshuffled.primary?.id ?? null).toBe(first.primary?.id ?? null);
      expect(reshuffled.ambiguous).toBe(first.ambiguous);

      // 3) 候选集合法性：≤5、无重复、全部 pickable、不含 internal-structures、
      //    primary 即 candidates[0]。
      const states = createPickableStates(context);
      expect(first.candidates.length).toBeLessThanOrEqual(5);
      expect(new Set(candidateIds(first)).size).toBe(first.candidates.length);
      for (const candidate of first.candidates) {
        expect(states.get(candidate.id)?.pickable).toBe(true);
        expect(internalPattern.test(`${candidate.id} ${candidate.name}`)).toBe(false);
      }
      expect(first.primary?.id ?? null).toBe(first.candidates[0]?.id ?? null);

      // 4) ambiguous 蕴含至少两个候选。
      if (first.ambiguous) expect(first.candidates.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('不变量：isolation/hidden 存在时，任何候选都不在其排除集合内', () => {
    for (let seed = 101; seed <= 130; seed += 1) {
      const context = buildScenario(mulberry32(seed));
      const resolution = resolvePick(context);
      const states = createPickableStates(context);

      for (const candidate of resolution.candidates) {
        const state = states.get(candidate.id);
        expect(state?.visible).toBe(true);
        expect(state?.pickable).toBe(true);
      }
    }
  });
});
