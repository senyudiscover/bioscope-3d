import { describe, expect, it } from 'vitest';
import type { KnowledgeNode } from '@/data/knowledge/anatomy';
import {
  auditKnowledgeGraphDeep,
  formatDeepAudit,
  runKnowledgeGraphDeepAudit,
} from '@/scripts/audit-knowledge-graph-deep';

// ============================================================================
// Knowledge Graph 深度审计（Deep Assurance #002 · Track F）
//
// 第 1 组 fixture 验证审计器语义；第 2 组对真实数据固化【当前】图形态
// （characterization 基线）：任何知识数据改动若改变连通结构，必须先有
// 意识地更新此处期望值。
// ============================================================================

const node = (id: string, related: string[] = []): KnowledgeNode => ({
  id,
  nameZh: id,
  typeZh: '测试',
  typeEn: 'Test',
  scale: 'cell',
  summary: 'fixture node',
  related: related.map((targetId) => ({ targetId, relationType: 'related_to', reason: 'r' })),
});

const EMPTY_MICRO_LAB = { microStructureTerms: {}, scenes: {}, steps: [] } as const;

describe('1 · 深审器语义（fixture）', () => {
  // registry a：entry ↔ mid，mid→leaf（叶子）；registry b：island2→island。
  // entry→island2 使两个 registry 在无向意义上连通。
  const registries: Array<{ name: string; nodes: Record<string, KnowledgeNode> }> = [
    {
      name: 'a',
      nodes: {
        entry: node('entry', ['mid', 'island2']),
        mid: node('mid', ['entry', 'leaf']),
        leaf: node('leaf'),
      },
    },
    { name: 'b', nodes: { island: node('island'), island2: node('island2', ['island']) } },
  ];

  it('连通分量：无向连通合并跨 registry；分量标注来源跨度', () => {
    const report = auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      { registries, sharedIds: [], modelNodeMap: {}, microLab: EMPTY_MICRO_LAB },
    );

    expect(report.nodeCount).toBe(5);
    expect(report.components).toHaveLength(1);
    expect(report.components[0].size).toBe(5);
  });

  it('入口不可达：入口集为空 → 全部节点不可达；有向 BFS 只沿 related 方向', () => {
    // entry↔mid 双向，mid→leaf 单向，island2→island 单向。
    // 入口 human/spinach 不在 fixture 中 → 全部不可达。
    const report = auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      { registries, sharedIds: [], modelNodeMap: {}, microLab: EMPTY_MICRO_LAB },
    );

    expect(report.unreachableFromEntries).toEqual(['entry', 'island', 'island2', 'leaf', 'mid']);
  });

  it('单向边全景：entry→island2、mid→leaf、island2→island 三对单向', () => {
    const report = auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      { registries, sharedIds: [], modelNodeMap: {}, microLab: EMPTY_MICRO_LAB },
    );

    expect(report.oneWayPairs).toEqual([
      { from: 'entry', to: 'island2' },
      { from: 'island2', to: 'island' },
      { from: 'mid', to: 'leaf' },
    ]);
  });

  it('followUp 断联：followUps 指向无直接 related 联系的节点 → 记录', () => {
    const withQuestion = {
      entry: node('entry', ['mid']),
      mid: node('mid', ['entry']),
      far: node('far'),
    };
    withQuestion.entry.exploreQuestions = {
      why: { question: 'q', answer: 'a', followUps: ['far'] },
    };

    const report = auditKnowledgeGraphDeep(withQuestion, {
      registries: [{ name: 'a', nodes: withQuestion }],
      sharedIds: [],
      modelNodeMap: {},
      microLab: EMPTY_MICRO_LAB,
    });

    expect(report.followUpDisconnected).toEqual([{ from: 'entry', to: 'far', kind: 'why' }]);
  });

  it('model 双向绑定：modelNodeMap 指向的节点未回指该 structure id → 记录', () => {
    const nodes = { heart: node('heart') };

    const report = auditKnowledgeGraphDeep(nodes, {
      registries: [{ name: 'a', nodes }],
      sharedIds: [],
      modelNodeMap: { 'aorta-mesh': 'heart', 'heart-mesh': 'heart' },
      microLab: EMPTY_MICRO_LAB,
    });
    // heart 未声明任何 modelStructureIds/modelRef → 两条都失配。
    expect(report.modelBindingAsymmetry).toEqual([
      { structureId: 'aorta-mesh', nodeId: 'heart' },
      { structureId: 'heart-mesh', nodeId: 'heart' },
    ]);
  });

  it('桥接判定：共享节点所在分量跨 registry → spansRegistries=true', () => {
    const report = auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      {
        registries,
        sharedIds: ['entry', 'leaf'],
        modelNodeMap: {},
        microLab: {
          microStructureTerms: {},
          scenes: {},
          steps: [{ id: 's1', knowledgeNodeIds: ['entry'] }],
        },
      },
    );

    expect(report.photosynthesisBoundNodes).toEqual(['entry']);
    expect(report.bridges[0]).toMatchObject({
      nodeId: 'entry',
      inSharedIds: true,
      spansRegistries: true,
      origins: ['a', 'b'],
    });
  });

  it('输出确定性：同数据两次格式化逐字节一致', () => {
    const report = auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      { registries, sharedIds: ['entry'], modelNodeMap: {}, microLab: EMPTY_MICRO_LAB },
    );

    expect(formatDeepAudit(report)).toBe(formatDeepAudit(auditKnowledgeGraphDeep(
      { ...registries[0].nodes, ...registries[1].nodes },
      { registries, sharedIds: ['entry'], modelNodeMap: {}, microLab: EMPTY_MICRO_LAB },
    )));
  });
});

describe('2 · 真实数据：图形态现状（characterization baseline）', () => {
  const report = runKnowledgeGraphDeepAudit();

  it('输出确定性：两次运行全文一致（审计文档引用此输出）', () => {
    const second = runKnowledgeGraphDeepAudit();
    expect(formatDeepAudit(second)).toBe(formatDeepAudit(report));
    console.log(formatDeepAudit(report));
  });

  it('规模基线：46 节点、related 边数与 validator relationCount 一致', () => {
    expect(report.nodeCount).toBe(46);
    expect(report.edgeCount).toBe(149);
    expect(report.entries).toEqual(['human', 'spinach']);
  });

  it('连通分量基线：一个 41 节点跨模块巨分量 + 5 个植物结构全孤岛', () => {
    expect(report.components).toHaveLength(6);
    expect(report.components[0].size).toBe(41);
    // 孤岛：既无入边也无出边（只能经 micro-lab mesh 点击触达，Related 永远到不了）。
    expect(report.components.slice(1).map((component) => component.members[0])).toEqual([
      'cell-membrane',
      'cell-wall',
      'cytoplasm',
      'nucleus',
      'vacuole',
    ]);
  });

  it('入口可达性基线：11 个节点从 human/spinach 沿 related 不可达', () => {
    // 两组真实的"学习体验死点"：
    //   神经系统链（brain/nervous-system/neuron/neural-signal）—— human 只 related
    //   到 5 个器官，没有任何边把神经系统接进来；
    //   {light-reactions, thylakoid} —— 与 thylakoid 互指的 2-环，无任何外部入边。
    expect(report.unreachableFromEntries).toEqual([
      'brain',
      'cell-membrane',
      'cell-wall',
      'cytoplasm',
      'light-reactions',
      'nervous-system',
      'neural-signal',
      'neuron',
      'nucleus',
      'thylakoid',
      'vacuole',
    ]);
  });

  it('单向边基线：全图 69 对（BIO-004 的图级证据，不只核心链 3 处）', () => {
    expect(report.oneWayPairs).toHaveLength(69);
  });

  it('followUp 断联基线：10 个"继续探索"芯片无任何 related 直连支撑', () => {
    expect(report.followUpDisconnected).toEqual([
      { from: 'human', to: 'blood', kind: 'why' },
      { from: 'human', to: 'homeostasis', kind: 'why' },
      { from: 'human', to: 'homeostasis', kind: 'how' },
      { from: 'human', to: 'nervous-system', kind: 'how' },
      { from: 'human', to: 'circulation', kind: 'whatIf' },
      { from: 'human', to: 'blood', kind: 'whatIf' },
      { from: 'heart', to: 'neural-signal', kind: 'how' },
      { from: 'heart', to: 'mitochondrion', kind: 'whatIf' },
      { from: 'lungs', to: 'homeostasis', kind: 'whatIf' },
      { from: 'brain', to: 'circulation', kind: 'whatIf' },
    ]);
  });

  it('model 双向绑定：modelNodeMap 与节点 modelStructureIds/modelRef 完全一致（0 失配）', () => {
    expect(report.modelBindingAsymmetry).toEqual([]);
  });

  it('photosynthesis 绑定与桥接基线', () => {
    expect(report.photosynthesisBoundNodes).toEqual([
      'atp',
      'atp-synthase',
      'cell-membrane',
      'cell-wall',
      'chloroplast',
      'cytoplasm',
      'electron-transport-chain',
      'light-reactions',
      'mesophyll-cell',
      'mitochondrion',
      'nucleus',
      'oxygen',
      'photosynthesis',
      'thylakoid',
      'vacuole',
    ]);
    // 5 个被 photosynthesis 绑定的 shared 节点（cellular-respiration 是 shared
    // 但未被任何 photosynthesis 绑定引用）全部落在跨模块巨分量中（桥接有效）。
    const sharedBridges = report.bridges.filter((bridge) => bridge.inSharedIds);
    expect(sharedBridges.map((bridge) => bridge.nodeId).sort()).toEqual([
      'atp',
      'atp-synthase',
      'electron-transport-chain',
      'mitochondrion',
      'oxygen',
    ]);
    for (const bridge of sharedBridges) expect(bridge.spansRegistries).toBe(true);
  });

  it('关系类型直方图基线', () => {
    expect(report.relationTypeHistogram).toEqual({
      contains: 23,
      participates_in: 29,
      produces: 19,
      related_to: 46,
      requires: 15,
      supports: 5,
      transports: 12,
    });
  });
});
