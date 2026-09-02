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
// 回归基线测试（audit NEXT ACTION，v1）
//
// 本文件固化 lib/picking-manager.ts 的【当前】行为，包括所有魔法常量
// （0.16 空间邻域、14 分歧阈值、各评分权重、internal-structures 降权）。
// 这些测试不是行为规范，而是行为快照：修改评分算法或常量前，必须先
// 有意识地更新这里的期望值，防止无意回归。
//
// 不测 anatomy-workbench 的 CandidateMenu UI 层；ambiguous 布尔值就是
// picking-manager 提供给 UI 的全部"是否歧义"信号。
// ============================================================================

type ResolveInput = Parameters<typeof resolvePickCandidates>[0];
type StatesInput = Parameters<typeof createPickableStates>[0];

/** 默认 position 放在远处 [5,0,0]，避免多结构 fixture 意外进入 0.16 空间邻域。 */
const structure = (
  seed: Partial<VanatomeStructure> &
    Pick<VanatomeStructure, 'id' | 'name'>,
): VanatomeStructure => ({
  system: 'cardiovascular',
  layer: 'test-layer',
  kind: 'part',
  position: [5, 0, 0],
  ...seed,
});

const resolvePick = (
  overrides: Partial<ResolveInput> &
    Pick<ResolveInput, 'structures' | 'hitId'>,
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

// ---------------------------------------------------------------------------
// A. 基础命中
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · A 基础命中', () => {
  it('普通可选结构被命中时成为唯一候选与 primary', () => {
    const alpha = structure({ id: 'alpha-organ', name: 'Alpha Organ', kind: 'organ' });

    const resolution = resolvePick({ structures: [alpha], hitId: 'alpha-organ' });

    expect(resolution.primary?.id).toBe('alpha-organ');
    expect(candidateIds(resolution)).toEqual(['alpha-organ']);
    expect(resolution.ambiguous).toBe(false);
  });

  it('hitId 为 null 或未知 id 时返回空结果', () => {
    const alpha = structure({ id: 'alpha-organ', name: 'Alpha Organ' });

    const nullHit = resolvePick({ structures: [alpha], hitId: null });
    const unknownHit = resolvePick({ structures: [alpha], hitId: 'ghost' });

    expect(nullHit).toEqual({ primary: null, candidates: [], ambiguous: false });
    expect(unknownHit).toEqual({ primary: null, candidates: [], ambiguous: false });
  });

  it('没有额外祖先/近邻时结果稳定（重复调用一致）', () => {
    const alpha = structure({ id: 'alpha-organ', name: 'Alpha Organ', kind: 'organ' });

    const first = resolvePick({ structures: [alpha], hitId: 'alpha-organ' });
    const second = resolvePick({ structures: [alpha], hitId: 'alpha-organ' });

    expect(candidateIds(first)).toEqual(candidateIds(second));
    expect(first.ambiguous).toBe(second.ambiguous);
  });
});

// ---------------------------------------------------------------------------
// B. ancestor / semantic parent
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · B 祖先候选', () => {
  it('命中子结构时祖先进入候选；当前评分下 organ 祖先胜过命中的 part', () => {
    // 评分基线（activeSystem 'all' / mixed / 无选中）：
    //   b-organ  = 100(system) + 45(layer) + 25(context) + 20.6(dist 0.01) + 34(organ) = 224.6
    //   b-part   = 100 + 45 + 25 + 20.6 + (12 - 2*7 = -2, part 深度惩罚) + 8(hit) = 196.6
    //   b-system = kind 'system' 且非直接命中 → 一律排除
    const sys = structure({
      id: 'b-system',
      name: 'B System',
      kind: 'system',
      position: [0, 0, 0],
    });
    const organ = structure({
      id: 'b-organ',
      name: 'B Organ',
      kind: 'organ',
      parentId: 'b-system',
      position: [0, 0, 0],
    });
    const part = structure({
      id: 'b-part',
      name: 'B Part',
      parentId: 'b-organ',
      position: [0.01, 0, 0],
    });

    const resolution = resolvePick({
      structures: [sys, organ, part],
      hitId: 'b-part',
    });

    // 当前真实结果：organ 祖先以 28 分差距排在命中者之前（勿"修复"，这是基线）。
    expect(candidateIds(resolution)).toEqual(['b-organ', 'b-part']);
    expect(resolution.primary?.id).toBe('b-organ');
    expect(resolution.ambiguous).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C. hiddenIds
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · C hiddenIds', () => {
  const target = structure({ id: 'c-target', name: 'C Target', position: [0, 0, 0] });
  const hidden = structure({ id: 'c-hidden', name: 'C Hidden', position: [0.01, 0, 0] });
  const hiddenChild = structure({
    id: 'c-hidden-child',
    name: 'C Hidden Child',
    parentId: 'c-hidden',
    position: [0.02, 0, 0],
  });

  it('hidden 结构及其后代不得进入候选（即使在 0.16 空间邻域内）', () => {
    const resolution = resolvePick({
      structures: [target, hidden, hiddenChild],
      hitId: 'c-target',
      hiddenIds: ['c-hidden'],
    });

    expect(candidateIds(resolution)).toEqual(['c-target']);
    expect(resolution.primary?.id).toBe('c-target');
  });

  it('直接命中 hidden 结构且 0.16 邻域内无可选结构时，返回空结果', () => {
    // 基线补充：若邻域内恰好有可选结构，点击 hidden 结构会被"救援"到该近邻
    // （见 F 组空间邻域语义），因此空结果只在无近邻时成立。
    const resolution = resolvePick({
      structures: [hidden, hiddenChild],
      hitId: 'c-hidden',
      hiddenIds: ['c-hidden'],
    });

    expect(resolution.primary).toBeNull();
    expect(resolution.candidates).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// D. isolation / context
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · D isolation', () => {
  const root = structure({ id: 'd-root', name: 'D Root', kind: 'organ', position: [5, 0, 0] });
  const child = structure({
    id: 'd-hit-child',
    name: 'D Hit Child',
    parentId: 'd-root',
    position: [5, 0, 0],
  });
  const otherOrgan = structure({
    id: 'd-other-organ',
    name: 'D Other Organ',
    kind: 'organ',
    position: [10, 0, 0],
  });

  it("isolation 'selected' 之外的结构不可选中：直接命中（无近邻）返回空", () => {
    const resolution = resolvePick({
      structures: [root, child, otherOrgan],
      hitId: 'd-other-organ',
      isolation: { id: 'd-root', mode: 'selected' },
    });

    expect(resolution.primary).toBeNull();
    expect(resolution.candidates).toEqual([]);
  });

  it('命中被隔离排除的结构时，0.16 邻域内的分支内结构可被解析为 primary', () => {
    // 基线：与 hidden 相同的"空间救援"语义——被排除结构本身不可候选，
    // 但与其共位的分支内结构会接管这次点击。
    const inside = structure({ id: 'd-inside', name: 'D Inside', position: [0, 0, 0] });
    const blocked = structure({ id: 'd-blocked', name: 'D Blocked', position: [0, 0, 0] });

    const resolution = resolvePick({
      structures: [inside, blocked],
      hitId: 'd-blocked',
      isolation: { id: 'd-inside', mode: 'selected' },
    });

    expect(candidateIds(resolution)).toEqual(['d-inside']);
    expect(resolution.primary?.id).toBe('d-inside');
  });

  it("isolation 'selected' 内部的命中正常解析（organ 祖先仍按现有评分胜出）", () => {
    const inside = structure({
      id: 'd-iso-in',
      name: 'D Iso In',
      parentId: 'd-iso-root',
      position: [5.01, 0, 0],
    });
    const isoRoot = structure({
      id: 'd-iso-root',
      name: 'D Iso Root',
      kind: 'organ',
      position: [5, 0, 0],
    });

    const resolution = resolvePick({
      structures: [isoRoot, inside],
      hitId: 'd-iso-in',
      isolation: { id: 'd-iso-root', mode: 'selected' },
    });

    expect(candidateIds(resolution)).toEqual(['d-iso-root', 'd-iso-in']);
    expect(resolution.primary?.id).toBe('d-iso-root');
  });

  it("parent-context 隔离：分支外结构同样不可候选，分支内解析与无隔离一致", () => {
    // 基线（重要）：createPickableStates 对 isolation 不区分 mode——parent-context
    // 下分支外结构 visible=false → 不可候选。context 惩罚分数只作用于
    // createPickableStates 的标志位（分支外 context=true），不会通过评分生效，
    // 因为这些结构根本进不了候选集。
    // （注意：VanatomeViewer 对 parent-context 的渲染是"淡化但可见"
    //   parentContextOpacity=0.12，此处记录的是 picking 层的真实口径。）
    const withoutIsolation = resolvePick({
      structures: [root, child, otherOrgan],
      hitId: 'd-hit-child',
    });
    const withParentContext = resolvePick({
      structures: [root, child, otherOrgan],
      hitId: 'd-hit-child',
      isolation: { id: 'd-root', mode: 'parent-context' },
    });

    // d-root = 100+45+25+22+34 = 226 > d-hit-child = 100+45+25+22+5+8 = 205（无选中时 organ 加分生效）。
    expect(candidateIds(withoutIsolation)).toEqual(['d-root', 'd-hit-child']);
    expect(candidateIds(withParentContext)).toEqual(['d-root', 'd-hit-child']);
    expect(candidateIds(withParentContext)).not.toContain('d-other-organ');
    expect(withParentContext.primary?.id).toBe('d-root');
    expect(withParentContext.ambiguous).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// E. system / display filtering
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · E system / display filtering', () => {
  it('activeSystem 不匹配的结构不可选，即使被命中', () => {
    const cv = structure({ id: 'e-cv', name: 'E Cv', system: 'cardiovascular', position: [0, 0, 0] });
    const digestive = structure({
      id: 'e-digestive',
      name: 'E Digestive',
      system: 'digestive',
      position: [0, 0, 0],
    });

    const resolution = resolvePick({
      structures: [cv, digestive],
      hitId: 'e-cv',
      activeSystem: 'cardiovascular',
    });

    expect(candidateIds(resolution)).toEqual(['e-cv']);
    expect(resolution.ambiguous).toBe(false);
  });

  it('displayLayer 不匹配的命中结构仍可见，但会被同位置的层匹配结构反超', () => {
    // 评分基线（displayLayer 'skeleton'）：
    //   e-bone = 100+45+25+22+12 = 204（层匹配，无 context 惩罚）
    //   e-soft = 100+45+0+22+12+8 = 187（层不匹配 → context 惩罚，但仍保留 +8 hit 分）
    const bone = structure({ id: 'e-bone', name: 'E Femur', position: [0, 0, 0] });
    const soft = structure({ id: 'e-soft', name: 'E Soft Tissue', position: [0, 0, 0] });

    const resolution = resolvePick({
      structures: [bone, soft],
      hitId: 'e-soft',
      displayLayer: 'skeleton',
    });

    // 基线：命中的层不匹配结构会被层匹配的同位置结构反超（当前真实行为）。
    expect(candidateIds(resolution)).toEqual(['e-bone', 'e-soft']);
    expect(resolution.primary?.id).toBe('e-bone');
    expect(resolution.ambiguous).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F. spatial-neighbor（0.16 邻域基线，勿改半径）
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · F 空间邻域', () => {
  it('距离 ≤ 0.16 的结构进入候选，> 0.16 的被排除', () => {
    const hit = structure({ id: 'f-hit', name: 'F Hit', position: [0, 0, 0] });
    const near = structure({ id: 'f-near', name: 'F Near', position: [0.16, 0, 0] });
    const far = structure({ id: 'f-far', name: 'F Far', position: [0.161, 0, 0] });

    const resolution = resolvePick({ structures: [hit, near, far], hitId: 'f-hit' });

    // 评分基线：f-hit = 100+45+25+22+12+8 = 212；f-near 距离项为 0 → 182。
    expect(candidateIds(resolution)).toEqual(['f-hit', 'f-near']);
    expect(candidateIds(resolution)).not.toContain('f-far');
    expect(resolution.ambiguous).toBe(false);
  });

  it('等距同分候选按 id 字母序稳定排序', () => {
    const hit = structure({ id: 'w-hit-part', name: 'W Hit', position: [0, 0, 0] });
    const left = structure({ id: 'w-a-part', name: 'W A', position: [0.05, 0, 0] });
    const right = structure({ id: 'w-b-part', name: 'W B', position: [-0.05, 0, 0] });

    const resolution = resolvePick({ structures: [hit, left, right], hitId: 'w-hit-part' });

    // w-a 与 w-b 距离相同、评分相同 → localeCompare 决定先后。
    expect(candidateIds(resolution)).toEqual(['w-hit-part', 'w-a-part', 'w-b-part']);
  });
});

// ---------------------------------------------------------------------------
// G. scoring regression（固定 fixture，锁定排序与歧义判定）
// ---------------------------------------------------------------------------

describe('resolvePickCandidates · G 评分回归', () => {
  it('organ-父/part-子 分差 <14 时，organ-首名例外抑制 ambiguous', () => {
    // 评分基线：g-organ = 100+45+25+(22-0.1*140=8)+34 = 212；
    //           g-part  = 100+45+25+22+(12-1*7=5)+8 = 205。分差 7 <14。
    // selectedId === null && candidates[0] 是 organ && 次名是其子 → ambiguous 强制 false。
    const organ = structure({ id: 'g-organ', name: 'G Organ', kind: 'organ', position: [0.1, 0, 0] });
    const part = structure({ id: 'g-part', name: 'G Part', parentId: 'g-organ', position: [0, 0, 0] });

    const resolution = resolvePick({ structures: [organ, part], hitId: 'g-part' });

    expect(candidateIds(resolution)).toEqual(['g-organ', 'g-part']);
    expect(resolution.ambiguous).toBe(false);
  });

  it('已有选中时：分支内 +28+depth*4 加分、分支外 -22；organ/part 加分不再生效', () => {
    // 评分基线（selectedId 'g2-root'）。注意：organ(+34)/part 深度加分只在
    // selectedId 为空时生效，选中态下完全关闭：
    //   g2-a    = 100+45+25+22+8(hit)+(28+1*4=32) = 232（分支内 depth 1）
    //   g2-root = 100+45+25+22+(28+0*4=28)        = 220（分支内 depth 0）
    //   g2-b    = 100+45+25+22-22                 = 170（分支外）
    const root = structure({ id: 'g2-root', name: 'G2 Root', kind: 'organ', position: [0, 0, 0] });
    const inBranch = structure({ id: 'g2-a', name: 'G2 A', parentId: 'g2-root', position: [0, 0, 0] });
    const outside = structure({ id: 'g2-b', name: 'G2 B', position: [0, 0, 0] });

    const resolution = resolvePick({
      structures: [root, inBranch, outside],
      hitId: 'g2-a',
      selectedId: 'g2-root',
    });

    expect(candidateIds(resolution)).toEqual(['g2-a', 'g2-root', 'g2-b']);
    expect(resolution.primary?.id).toBe('g2-a');
    // 基线：首两名分差 12（<14）且首名非 organ → ambiguous = true（当前行为）。
    expect(resolution.ambiguous).toBe(true);
  });

  it('直接命中 internal-structures 命名结构：被完全过滤，返回空结果', () => {
    // 基线（现行行为，疑似可用性问题，仅记录不改）：
    // /internal.*structures|structures.*internal/i 命中的结构会从候选列表中整体剔除，
    // 即使它是被 raycast 命中的那个结构 → primary = null。
    const internal = structure({
      id: 'g3-cardiac-internal-structures',
      name: 'Cardiac Internal Structures',
      kind: 'organ',
      position: [0, 0, 0],
    });

    const resolution = resolvePick({ structures: [internal], hitId: 'g3-cardiac-internal-structures' });

    expect(resolution.primary).toBeNull();
    expect(resolution.candidates).toEqual([]);
  });

  it('直接命中 kind=system 结构：system 可为 primary，但与近邻子结构构成歧义', () => {
    // 评分基线：g4-system = 100+45+25+22+8 = 200（system 无 organ/part 加分）；
    //           g4-leaf  = 100+45+25+20.6+(12-1*7=5) = 195.6。分差 ~4.4 <14。
    // 例外条款只认 organ 首名 → system 首名时 ambiguous = true（当前行为）。
    const sys = structure({ id: 'g4-system', name: 'G4 System', kind: 'system', position: [0, 0, 0] });
    const leaf = structure({ id: 'g4-leaf', name: 'G4 Leaf', parentId: 'g4-system', position: [0.01, 0, 0] });

    const resolution = resolvePick({ structures: [sys, leaf], hitId: 'g4-system' });

    expect(candidateIds(resolution)).toEqual(['g4-system', 'g4-leaf']);
    expect(resolution.primary?.id).toBe('g4-system');
    expect(resolution.ambiguous).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createPickableStates（可见/可点/语境标志的底层语义）
// ---------------------------------------------------------------------------

describe('createPickableStates', () => {
  const states = (overrides: Partial<StatesInput> & Pick<StatesInput, 'structures'>) =>
    createPickableStates({
      activeSystem: 'all' as AnatomySystemFilter,
      displayLayer: 'mixed' as DisplayLayerFilter,
      hiddenIds: [],
      isolation: null,
      ...overrides,
    });

  it('hiddenIds 使隐藏结构及其全部后代 visible=false 且不可点', () => {
    const parent = structure({ id: 'p1', name: 'P1' });
    const child = structure({ id: 'p2', name: 'P2', parentId: 'p1' });
    const grandchild = structure({ id: 'p3', name: 'P3', parentId: 'p2' });
    const stranger = structure({ id: 'p4', name: 'P4' });

    const result = states({
      structures: [parent, child, grandchild, stranger],
      hiddenIds: ['p1'],
    });

    expect(result.get('p1')?.visible).toBe(false);
    expect(result.get('p2')?.visible).toBe(false);
    expect(result.get('p3')?.visible).toBe(false);
    expect(result.get('p1')?.pickable).toBe(false);
    expect(result.get('p3')?.pickable).toBe(false);
    expect(result.get('p4')?.visible).toBe(true);
    expect(result.get('p4')?.pickable).toBe(true);
  });

  it("isolation 'selected'：分支外结构 visible=false", () => {
    const inside = structure({ id: 'in', name: 'In' });
    const outside = structure({ id: 'out', name: 'Out' });

    const result = states({
      structures: [inside, outside],
      isolation: { id: 'in', mode: 'selected' },
    });

    expect(result.get('in')?.visible).toBe(true);
    expect(result.get('out')?.visible).toBe(false);
    expect(result.get('out')?.pickable).toBe(false);
  });

  it("isolation 'parent-context'：分支内可见，分支外 visible=false 但 context=true", () => {
    // 基线（与 VanatomeViewer 渲染口径不同，仅记录）：createPickableStates 不区分
    // isolation mode，parent-context 下分支外结构 visible=false、pickable=false，
    // 同时保留 context=true 标志（该标志在当前评分路径中无法对分支外结构生效，
    // 因为它们不可候选）。
    const inside = structure({ id: 'in', name: 'In' });
    const outside = structure({ id: 'out', name: 'Out' });

    const result = states({
      structures: [inside, outside],
      isolation: { id: 'in', mode: 'parent-context' },
    });

    expect(result.get('in')?.visible).toBe(true);
    expect(result.get('in')?.pickable).toBe(true);
    expect(result.get('in')?.context).toBe(false);
    expect(result.get('out')?.visible).toBe(false);
    expect(result.get('out')?.pickable).toBe(false);
    expect(result.get('out')?.context).toBe(true);
  });

  it('displayLayer 不匹配只标记 context，不清除 pickable（层不等于不可点）', () => {
    const bone = structure({ id: 'bone', name: 'Femur' });
    const soft = structure({ id: 'soft', name: 'Soft Tissue' });

    const result = states({
      structures: [bone, soft],
      displayLayer: 'skeleton' as DisplayLayerFilter,
    });

    expect(result.get('bone')?.context).toBe(false);
    expect(result.get('soft')?.context).toBe(true);
    // 关键基线：层不匹配的结构仍然 pickable。
    expect(result.get('soft')?.pickable).toBe(true);
  });

  it('activeSystem 非 all 时，不匹配系统的结构 pickable=false', () => {
    const cv = structure({ id: 'cv', name: 'Cv', system: 'cardiovascular' });
    const digestive = structure({ id: 'dig', name: 'Dig', system: 'digestive' });

    const result = states({
      structures: [cv, digestive],
      activeSystem: 'cardiovascular' as AnatomySystemFilter,
    });

    expect(result.get('cv')?.pickable).toBe(true);
    expect(result.get('dig')?.pickable).toBe(false);
  });
});
