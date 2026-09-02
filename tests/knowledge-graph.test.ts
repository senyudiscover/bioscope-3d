import { describe, expect, it } from 'vitest';
import type { KnowledgeNode } from '@/data/knowledge/anatomy';
import type { KnowledgeGraphInput } from '@/lib/knowledge-graph-validator';
import { validateKnowledgeGraph } from '@/lib/knowledge-graph-validator';
import {
  formatKnowledgeGraphReport,
  runBioScopeKnowledgeGraph,
} from '@/scripts/validate-knowledge-graph';

// ============================================================================
// Knowledge Graph Integrity Validator 测试
//
// 第 1-9 组用独立 fixture 验证验证器自身的语义；
// 第 10 组直接对当前真实 BioScope 知识数据运行验证器并固化现状
// （characterization：如果未来出现新的 ERROR，此测试会失败并迫使
// 开发者有意识地处理，而不是让坏引用静默进入 UI）。
// ============================================================================

const node = (id: string, overrides: Partial<KnowledgeNode> = {}): KnowledgeNode => ({
  id,
  nameZh: id,
  typeZh: '测试',
  typeEn: 'Test',
  scale: 'cell',
  summary: 'fixture node',
  ...overrides,
});

const source = (name: string, ...nodes: KnowledgeNode[]) => ({
  name,
  nodes: Object.fromEntries(nodes.map((item) => [item.id, item])),
});

const codes = (issues: Array<{ code: string }>) => issues.map((issue) => issue.code);

// ---------------------------------------------------------------------------
// 1. 正常 graph
// ---------------------------------------------------------------------------

describe('1 · 正常 graph', () => {
  it('引用完整的小图：0 error，计数正确', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('a', node('heart', { related: [{ targetId: 'blood', relationType: 'transports', reason: 'r' }] })),
        source('b', node('blood', { related: [{ targetId: 'heart', relationType: 'participates_in', reason: 'r' }] })),
      ],
      sharedKnowledgeNodeIds: ['heart'],
      microLab: {
        microStructureTerms: { heartMesh: { knowledgeNodeId: 'heart' } },
        scenes: { cell: { knowledgeNodeId: 'heart', childSceneIds: ['organ'] }, organ: { knowledgeNodeId: 'blood', parentSceneId: 'cell', childSceneIds: [] } },
        steps: [{ id: 's1', knowledgeNodeIds: ['heart'], relatedKnowledgeNodeIds: ['heart'] }],
      },
    });

    expect(report.errors).toEqual([]);
    expect(report.nodeCount).toBe(2);
    expect(report.relationCount).toBe(2);
    expect(report.modelReferenceChecks).toBe('skipped');
  });
});

// ---------------------------------------------------------------------------
// 2. duplicate node ID（跨注册表）
// ---------------------------------------------------------------------------

describe('2 · duplicate node id', () => {
  it('两个注册表出现同名 id → ERROR MERGE_COLLISION，并指出覆盖方向', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('anatomy', node('heart', { nameZh: '心脏' })),
        source('plants', node('heart', { nameZh: '植物心脏占位' })),
        source('plants', node('leaf', {})),
      ],
    });

    const collisions = report.errors.filter((issue) => issue.code === 'MERGE_COLLISION');
    expect(collisions).toHaveLength(1);
    expect(collisions[0].message).toContain('"heart"');
    expect(collisions[0].message).toContain('"anatomy"');
    expect(collisions[0].message).toContain('"plants"');
    expect(collisions[0].message).toContain('silently keeps "plants"');
    // 合并视图按 spread 语义只保留一份。
    expect(report.nodeCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 3. missing related target
// ---------------------------------------------------------------------------

describe('3 · missing related target', () => {
  it('related[].targetId 不存在 → ERROR，消息含 source/relation/target', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', { related: [{ targetId: 'ghost', relationType: 'requires', reason: 'r' }] }))],
    });

    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].code).toBe('MISSING_RELATED_TARGET');
    expect(report.errors[0].message).toContain('"heart"');
    expect(report.errors[0].message).toContain('requires');
    expect(report.errors[0].message).toContain('"ghost"');
    // 坏关系仍按声明计数。
    expect(report.relationCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. self references
// ---------------------------------------------------------------------------

describe('4 · self references', () => {
  it('related 自引用 → WARNING（当前 schema 不禁止）', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', { related: [{ targetId: 'heart', relationType: 'related_to', reason: 'r' }] }))],
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toContain('SELF_RELATED_TARGET');
  });

  it('followUps 自引用 → WARNING SELF_FOLLOWUP', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('a', node('stomach', { exploreQuestions: { why: { question: 'q', answer: 'a', followUps: ['stomach'] } } })),
      ],
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toContain('SELF_FOLLOWUP');
  });

  it('keyStructures[].id 自引用 → WARNING SELF_KEY_STRUCTURE_NODE', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', { keyStructures: [{ id: 'heart', nameZh: '心房' }] }))],
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toContain('SELF_KEY_STRUCTURE_NODE');
  });
});

// ---------------------------------------------------------------------------
// 5. duplicate relation
// ---------------------------------------------------------------------------

describe('5 · duplicate relation', () => {
  it('同一 source/target/type 重复声明 → WARNING DUPLICATE_RELATION，按声明计数', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source(
          'a',
          node('heart', {
            related: [
              { targetId: 'blood', relationType: 'transports', reason: 'r1' },
              { targetId: 'blood', relationType: 'transports', reason: 'r2' },
            ],
          }),
        ),
        source('b', node('blood', {})),
      ],
    });

    expect(report.errors).toEqual([]);
    expect(report.warnings.filter((issue) => issue.code === 'DUPLICATE_RELATION')).toHaveLength(1);
    expect(report.relationCount).toBe(2);
  });

  it('同 target 不同 relationType 不算重复', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source(
          'a',
          node('heart', {
            related: [
              { targetId: 'blood', relationType: 'transports', reason: 'r1' },
              { targetId: 'blood', relationType: 'requires', reason: 'r2' },
            ],
          }),
        ),
        source('b', node('blood', {})),
      ],
    });

    expect(codes(report.warnings)).not.toContain('DUPLICATE_RELATION');
  });
});

// ---------------------------------------------------------------------------
// 6. shared knowledge node ids
// ---------------------------------------------------------------------------

describe('6 · sharedKnowledgeNodeIds', () => {
  it('缺失 → ERROR MISSING_SHARED_NODE；重复 → WARNING DUPLICATE_SHARED_NODE', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('atp', {}))],
      sharedKnowledgeNodeIds: ['atp', 'oxygen', 'atp'],
    });

    expect(codes(report.errors)).toEqual(['MISSING_SHARED_NODE']);
    expect(codes(report.warnings)).toEqual(['DUPLICATE_SHARED_NODE']);
  });

  it('全部存在且无重复 → 0 error 0 warning', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('atp', {}), node('oxygen', {}))],
      sharedKnowledgeNodeIds: ['atp', 'oxygen'],
    });

    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 7. micro-lab / photosynthesis bindings
// ---------------------------------------------------------------------------

describe('7 · micro-lab bindings', () => {
  const baseInput: KnowledgeGraphInput = {
    registries: [source('a', node('heart', {}), node('lungs', {}))],
  };

  it('microStructureTerms.knowledgeNodeId 悬空 → ERROR', () => {
    const report = validateKnowledgeGraph({
      ...baseInput,
      microLab: { microStructureTerms: { mesh: { knowledgeNodeId: 'ghost' } } },
    });

    expect(codes(report.errors)).toEqual(['MISSING_MICRO_STRUCTURE_KNOWLEDGE_TARGET']);
    expect(report.errors[0].message).toContain('"mesh"');
  });

  it('photosynthesisScenes.knowledgeNodeId 悬空 → ERROR', () => {
    const report = validateKnowledgeGraph({
      ...baseInput,
      microLab: { scenes: { thylakoid: { knowledgeNodeId: 'ghost' } } },
    });

    expect(codes(report.errors)).toEqual(['MISSING_SCENE_KNOWLEDGE_TARGET']);
  });

  it('场景 parent/child 不一致 → WARNING（knowledge 引用本身完好则无 error）', () => {
    const report = validateKnowledgeGraph({
      ...baseInput,
      microLab: {
        scenes: {
          cell: { knowledgeNodeId: 'heart', childSceneIds: ['organ'] },
          organ: { knowledgeNodeId: 'lungs', parentSceneId: 'chloroplast', childSceneIds: [] },
        },
      },
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toContain('SCENE_PARENT_CHILD_MISMATCH');
  });

  it('lightReactionSteps 知识引用悬空 → ERROR；alias 漂移 → WARNING', () => {
    const report = validateKnowledgeGraph({
      ...baseInput,
      microLab: {
        steps: [
          { id: 'step-1', knowledgeNodeIds: ['heart', 'ghost-a'], relatedKnowledgeNodeIds: ['heart', 'ghost-b'] },
        ],
      },
    });

    expect(codes(report.errors).sort()).toEqual([
      'MISSING_STEP_KNOWLEDGE_TARGET',
      'MISSING_STEP_RELATED_KNOWLEDGE_TARGET',
    ]);
    expect(codes(report.warnings)).toEqual(['STEP_ALIAS_DIVERGENCE']);
  });

  it('alias 与主字段一致 → 无 STEP_ALIAS_DIVERGENCE', () => {
    const report = validateKnowledgeGraph({
      ...baseInput,
      microLab: {
        steps: [{ id: 'step-1', knowledgeNodeIds: ['heart'], relatedKnowledgeNodeIds: ['heart'] }],
      },
    });

    expect(codes(report.warnings)).not.toContain('STEP_ALIAS_DIVERGENCE');
  });
});

// ---------------------------------------------------------------------------
// 8. registry merge collision（JavaScript 行为证明 + 验证器检测）
// ---------------------------------------------------------------------------

describe('8 · registry merge safety', () => {
  it('object spread 遇到重复 id 会静默覆盖（后者胜出）——固化 JS 行为', () => {
    const anatomyNodes = { heart: { nameZh: '心脏' } };
    const plantNodes = { heart: { nameZh: '覆盖后的占位' } };

    const merged = { ...anatomyNodes, ...plantNodes };

    // 这就是 data/knowledge/index.ts 的合并方式：无任何报警。
    expect(merged.heart).toEqual({ nameZh: '覆盖后的占位' });
  });

  it('validator 在 merge 前检测到跨注册表重复（不改合并实现）', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('anatomy', node('heart', { nameZh: '心脏' })),
        source('plants', node('heart', { nameZh: '覆盖后的占位' })),
      ],
    });

    expect(codes(report.errors)).toContain('MERGE_COLLISION');
  });

  it('registry key 与 node.id 不一致 → ERROR NODE_ID_MISMATCH', () => {
    const registry = {
      nodes: { 'key-1': node('key-1'), 'key-2': node('different-id') },
    };

    const report = validateKnowledgeGraph({ registries: [{ name: 'a', ...registry }] });

    expect(codes(report.errors)).toEqual(['NODE_ID_MISMATCH']);
    expect(report.errors[0].message).toContain('"key-2"');
    expect(report.errors[0].message).toContain('"different-id"');
  });
});

// ---------------------------------------------------------------------------
// 9. orphan / leaf / reciprocal 诊断
// ---------------------------------------------------------------------------

describe('9 · graph diagnostics', () => {
  it('无入边节点 → INFO ORPHAN_NODE；无出边节点 → INFO LEAF_NODE', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source(
          'a',
          // root：无入边（孤儿），有出边。
          node('root', { related: [{ targetId: 'leafy', relationType: 'contains', reason: 'r' }] }),
          // leafy：有入边，无出边（叶子）。
          node('leafy', {}),
          // island：无入边也无出边（既是孤儿也是叶子）。
          node('island', {}),
        ),
      ],
    });

    expect(report.errors).toEqual([]);
    const orphans = report.infos.filter((issue) => issue.code === 'ORPHAN_NODE');
    const leaves = report.infos.filter((issue) => issue.code === 'LEAF_NODE');
    expect(orphans.map((issue) => issue.message)).toEqual([
      '"root" has no incoming relations (unreachable from the related graph)',
      '"island" has no incoming relations (unreachable from the related graph)',
    ]);
    expect(leaves.map((issue) => issue.message)).toEqual([
      '"leafy" declares no outgoing related relations',
      '"island" declares no outgoing related relations',
    ]);
  });

  it('互惠关系 A↔B → INFO，且每对只报告一次', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source(
          'a',
          node('heart', {
            related: [
              { targetId: 'blood', relationType: 'transports', reason: 'r' },
              { targetId: 'oxygen', relationType: 'requires', reason: 'r' },
            ],
          }),
          node('blood', { related: [{ targetId: 'heart', relationType: 'participates_in', reason: 'r' }] }),
          node('oxygen', { related: [{ targetId: 'heart', relationType: 'participates_in', reason: 'r' }] }),
        ),
      ],
    });

    const reciprocals = report.infos.filter((issue) => issue.code === 'RECIPROCAL_RELATION');
    expect(reciprocals).toHaveLength(2);
    expect(reciprocals.map((issue) => issue.message).sort()).toEqual([
      '"blood" <-> "heart" reference each other (by design for this knowledge layer)',
      '"heart" <-> "oxygen" reference each other (by design for this knowledge layer)',
    ]);
  });
});

// ---------------------------------------------------------------------------
// 模型引用：第 1 层一致性 + 第 2 层可选验证
// ---------------------------------------------------------------------------

describe('model reference 分层验证', () => {
  it('第 1 层：modelRef 与 modelStructureIds[0] 漂移 → WARNING MODEL_REF_DRIFT', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('brain', { modelRef: 'cortex', modelStructureIds: ['cerebrum'] }))],
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toEqual(['MODEL_REF_DRIFT']);
    expect(report.warnings[0].message).toContain('ignores modelRef');
  });

  it('第 1 层：modelRef === modelStructureIds[0] 或只有其一 → 无警告', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source(
          'a',
          node('heart', { modelRef: 'heart', modelStructureIds: ['heart'] }),
          node('brain', { modelStructureIds: ['cerebrum', 'cerebellum'] }),
          node('blood', { modelRef: 'blood' }),
        ),
      ],
    });

    expect(report.warnings).toEqual([]);
  });

  it('空 modelStructureIds 且无 modelRef → INFO EMPTY_MODEL_STRUCTURE_IDS', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('x', { modelStructureIds: [] }))],
    });

    expect(codes(report.infos)).toContain('EMPTY_MODEL_STRUCTURE_IDS');
  });

  it('第 2 层：传入 knownStructureIds 时验证结构存在性，缺失 → ERROR', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('a', node('heart', { modelRef: 'heart', modelStructureIds: ['heart'], keyStructures: [{ nameZh: '瓣膜', modelRef: 'ghost-valve' }] })),
      ],
      knownStructureIds: new Set(['heart']),
    });

    expect(report.modelReferenceChecks).toBe('validated');
    expect(codes(report.errors)).toEqual(['MISSING_MODEL_STRUCTURE']);
    expect(report.errors[0].message).toContain('"ghost-valve"');
  });

  it('第 2 层：不传 knownStructureIds 时跳过（无网络依赖）', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', { modelRef: 'heart' }))],
    });

    expect(report.modelReferenceChecks).toBe('skipped');
    expect(report.errors).toEqual([]);
  });

  it('modelNodeMap 值悬空 → ERROR（死导出仍验证）', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', {}))],
      modelNodeMap: { cerebrum: 'brain' },
    });

    expect(codes(report.errors)).toEqual(['MISSING_MODEL_NODE_MAP_TARGET']);
  });
});

// ---------------------------------------------------------------------------
// 9b. 分支覆盖补全（night-shift NS-1 review）
//
// 独立 review 发现以下 5 个验证器分支此前没有任何测试断言，其中
// MISSING_FOLLOWUP_TARGET / MISSING_KEY_STRUCTURE_NODE 是 ERROR 级：
// 若重构破坏检测，CI 无法发现。本组逐一固化其触发条件与严重级。
// ---------------------------------------------------------------------------

describe('9b · 未覆盖分支补全', () => {
  it('followUps 目标不存在 → ERROR MISSING_FOLLOWUP_TARGET', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('a', node('stomach', { exploreQuestions: { why: { question: 'q', answer: 'a', followUps: ['ghost'] } } })),
      ],
    });

    expect(codes(report.errors)).toEqual(['MISSING_FOLLOWUP_TARGET']);
    expect(report.errors[0].message).toContain('"stomach"');
    expect(report.errors[0].message).toContain('"ghost"');
  });

  it('keyStructures[].id 指向不存在的节点 → ERROR MISSING_KEY_STRUCTURE_NODE', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', { keyStructures: [{ id: 'ghost-node', nameZh: '幽灵结构' }] }))],
    });

    expect(codes(report.errors)).toEqual(['MISSING_KEY_STRUCTURE_NODE']);
    expect(report.errors[0].message).toContain('"heart"');
    expect(report.errors[0].message).toContain('"ghost-node"');
  });

  it('空字符串 model 引用 → WARNING EMPTY_MODEL_REFERENCE（无需 knownStructureIds）', () => {
    const report = validateKnowledgeGraph({
      registries: [
        source('a', node('a-empty-id', { modelStructureIds: [''] })),
        source('b', node('b-blank-ref', { modelRef: '   ' })),
      ],
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toEqual(['EMPTY_MODEL_REFERENCE', 'EMPTY_MODEL_REFERENCE']);
  });

  it('scene.parentSceneId 不存在 → WARNING MISSING_SCENE_PARENT（knowledge 引用完好则无 error）', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', {}))],
      microLab: { scenes: { organ: { knowledgeNodeId: 'heart', parentSceneId: 'ghost-parent' } } },
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toEqual(['MISSING_SCENE_PARENT']);
    expect(report.warnings[0].message).toContain('"organ"');
    expect(report.warnings[0].message).toContain('"ghost-parent"');
  });

  it('scene.childSceneIds 指向不存在的场景 → WARNING MISSING_SCENE_CHILD', () => {
    const report = validateKnowledgeGraph({
      registries: [source('a', node('heart', {}))],
      microLab: { scenes: { cell: { knowledgeNodeId: 'heart', childSceneIds: ['ghost-child'] } } },
    });

    expect(report.errors).toEqual([]);
    expect(codes(report.warnings)).toEqual(['MISSING_SCENE_CHILD']);
    expect(report.warnings[0].message).toContain('"cell"');
    expect(report.warnings[0].message).toContain('"ghost-child"');
  });
});

// ---------------------------------------------------------------------------
// 10. 当前真实 BioScope 知识数据（characterization baseline）
// ---------------------------------------------------------------------------

describe('10 · 真实数据验证', () => {
  const report = runBioScopeKnowledgeGraph();

  it('输出确定性：同一数据两次运行结果逐字段一致', () => {
    const second = runBioScopeKnowledgeGraph();
    expect(second).toEqual(report);
    expect(formatKnowledgeGraphReport(second)).toBe(formatKnowledgeGraphReport(report));
    // 入口命令（npm run validate:knowledge）的可见输出：确定性全文报告。
    console.log(formatKnowledgeGraphReport(report));
  });

  it('真实数据现状：无 ERROR（引用完整性当前完好）', () => {
    expect(report.errors).toEqual([]);
  });

  it('真实数据规模基线', () => {
    expect(report.nodeCount).toBe(46);
    expect(report.relationCount).toBe(149);
    expect(report.modelReferenceChecks).toBe('skipped');
  });

  it('真实数据已知诊断基线（WARNING/INFO 快照）', () => {
    // 这些是当前数据中有意或历史形成的形态；修改知识数据前必须先更新此处。
    expect(codes(report.warnings).sort()).toEqual([
      'DUPLICATE_KEY_STRUCTURE_NODE',
      'SELF_FOLLOWUP',
      'SELF_KEY_STRUCTURE_NODE',
    ]);
    expect(report.warnings.map((issue) => issue.message)).toEqual([
      '"stomach".exploreQuestions.why.followUps contains itself',
      '"heart".keyStructures binds the node itself ("heart")',
      '"chloroplast".keyStructures binds node "thylakoid" more than once',
    ]);

    // INFO 形态基线：7 个孤儿（知识入口 human 与 6 个无 related 的植物结构节点）、
    // 5 个叶子（cell-wall/cell-membrane/cytoplasm/vacuole/nucleus）、40 对互惠关系。
    const orphans = report.infos.filter((issue) => issue.code === 'ORPHAN_NODE');
    const leaves = report.infos.filter((issue) => issue.code === 'LEAF_NODE');
    const reciprocals = report.infos.filter((issue) => issue.code === 'RECIPROCAL_RELATION');
    expect(orphans).toHaveLength(7);
    expect(leaves).toHaveLength(5);
    expect(reciprocals).toHaveLength(40);
    expect(report.infos).toHaveLength(52);
    // 孤儿名单本身即基线：新增节点若只被 keyStructures 引用（无 related 入边）
    // 也会进入此名单，需有意识地接受或补链。
    expect(orphans.map((issue) => issue.message)).toEqual([
      '"human" has no incoming relations (unreachable from the related graph)',
      '"cell-wall" has no incoming relations (unreachable from the related graph)',
      '"cell-membrane" has no incoming relations (unreachable from the related graph)',
      '"cytoplasm" has no incoming relations (unreachable from the related graph)',
      '"vacuole" has no incoming relations (unreachable from the related graph)',
      '"nucleus" has no incoming relations (unreachable from the related graph)',
      '"spinach" has no incoming relations (unreachable from the related graph)',
    ]);
  });
});
