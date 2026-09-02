import type { KnowledgeNode } from '@/data/knowledge/anatomy';
import { knowledgeNodes } from '@/data/knowledge';
import { sharedKnowledgeNodeIds } from '@/data/knowledge';
import { modelNodeMap } from '@/data/knowledge/anatomy';
import { plantKnowledgeNodes } from '@/data/knowledge/plants';
import { knowledgeNodes as anatomyKnowledgeNodes } from '@/data/knowledge/anatomy';
import {
  lightReactionSteps,
  microStructureTerms,
  photosynthesisScenes,
} from '@/data/photosynthesis/micro-lab';

/**
 * Knowledge Graph 深度审计（Deep Assurance #002 · Track F，只读）。
 *
 * Track F 的核心问题不是「ID 是否存在」（validate:knowledge 已覆盖），
 * 而是「这张图在学习体验上是否走得通」：
 *   1. 连通分量 —— 图被切成了几块？植物与人体是否只靠 shared 节点桥接？
 *   2. 入口可达性 —— 从学习入口（human / spinach）沿 related 边能走到哪些节点？
 *      走不到的节点 = UI 上「Related 永远不会带你到这里」的死点。
 *   3. 单向边全景 —— 所有 A→B 缺 B→A 的对（BIO-004 只点名了核心链）。
 *   4. followUp 图距离 —— exploreQuestions 的"继续探索"是否会把用户送到
 *      与当前节点毫无 related 联系的孤岛？
 *   5. knowledge↔model 双向一致性 —— modelNodeMap 说 structure X 属于节点 N，
 *      节点 N 的 modelStructureIds 是否真的包含 X？
 *
 * 执行方式与既有审计一致（数据层 '@/' 别名需 vitest 解析）：
 *   vitest run tests/knowledge-graph-deep-audit.test.ts
 */

export type DeepAuditReport = {
  nodeCount: number;
  edgeCount: number;
  /** 无向连通分量（按大小降序，含成员 id）。 */
  components: Array<{ size: number; members: string[] }>;
  /** 从学习入口 BFS（有向 related 边）不可达的节点。 */
  unreachableFromEntries: string[];
  entries: string[];
  /** 单向边：有 a→b 无 b→a（排除自引用），按 source 排序。 */
  oneWayPairs: Array<{ from: string; to: string }>;
  /** followUp 目标中，与来源节点无任何 related 直接联系（双向皆无）的。 */
  followUpDisconnected: Array<{ from: string; to: string; kind: string }>;
  /** modelNodeMap 指向的节点，其 modelStructureIds 未回指该 structure id。 */
  modelBindingAsymmetry: Array<{ structureId: string; nodeId: string }>;
  /** 被至少一个 photosynthesis 绑定引用的知识节点。 */
  photosynthesisBoundNodes: string[];
  /** photosynthesis 绑定节点的桥接判定（所在连通分量是否跨 registry）。 */
  bridges: Array<{ nodeId: string; inSharedIds: boolean; spansRegistries: boolean; origins: string[] }>;
  relationTypeHistogram: Record<string, number>;
};

const relatedIds = (node: KnowledgeNode | undefined): string[] =>
  (node?.related ?? []).map((item) => item.targetId);

export function auditKnowledgeGraphDeep(
  mergedNodes: Record<string, KnowledgeNode>,
  input: {
    /** 用于给节点标注来源注册表（桥接判定需要区分 anatomy / plants）。 */
    registries: Array<{ name: string; nodes: Record<string, KnowledgeNode> }>;
    sharedIds: readonly string[];
    modelNodeMap: Record<string, string>;
    microLab: {
      microStructureTerms: Record<string, { knowledgeNodeId?: string }>;
      scenes: Record<string, { knowledgeNodeId: string }>;
      steps: ReadonlyArray<{ id: string; knowledgeNodeIds?: readonly string[] }>;
    };
  },
): DeepAuditReport {
  const ids = Object.keys(mergedNodes);
  const idSet = new Set(ids);
  const originByNode = new Map<string, string>();
  for (const registry of input.registries) {
    for (const id of Object.keys(registry.nodes)) {
      if (!originByNode.has(id)) originByNode.set(id, registry.name);
    }
  }

  // ---- 有向边收集 + 关系类型直方图 ----
  const edges: Array<{ from: string; to: string }> = [];
  const relationTypeHistogram: Record<string, number> = {};
  for (const [id, node] of Object.entries(mergedNodes)) {
    for (const relation of node.related ?? []) {
      edges.push({ from: id, to: relation.targetId });
      relationTypeHistogram[relation.relationType] =
        (relationTypeHistogram[relation.relationType] ?? 0) + 1;
    }
  }

  // ---- 无向连通分量（union-find）----
  const parent = new Map<string, string>(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (parent.get(x) !== root) {
      const next = parent.get(x)!;
      parent.set(x, root);
      x = next;
    }
    return root;
  };
  const union = (a: string, b: string) => {
    if (!idSet.has(a) || !idSet.has(b)) return;
    parent.set(find(a), find(b));
  };
  for (const edge of edges) union(edge.from, edge.to);
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), id]);
  }
  const components = [...groups.values()]
    .map((members) => ({ size: members.length, members: [...members].sort() }))
    .sort((a, b) => b.size - a.size || a.members[0].localeCompare(b.members[0]));
  const componentRootByNode = new Map<string, string>();
  for (const [root, members] of groups) {
    for (const id of members) componentRootByNode.set(id, root);
  }
  const componentOriginSpan = new Map<string, Set<string>>();
  for (const [root, members] of groups) {
    const origins = new Set<string>();
    for (const id of members) {
      const origin = originByNode.get(id);
      if (origin) origins.add(origin);
    }
    componentOriginSpan.set(root, origins);
  }

  // ---- 入口可达性（BFS，有向）----
  const entries = ['human', 'spinach'].filter((id) => idSet.has(id));
  const reachable = new Set<string>(entries);
  const queue = [...entries];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of relatedIds(mergedNodes[current])) {
      if (idSet.has(next) && !reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  const unreachableFromEntries = ids.filter((id) => !reachable.has(id)).sort();

  // ---- 单向边全景 ----
  const forward = new Set(edges.map((edge) => `${edge.from}\u0000${edge.to}`));
  const oneWayPairs: DeepAuditReport['oneWayPairs'] = [];
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    if (!forward.has(`${edge.to}\u0000${edge.from}`)) {
      oneWayPairs.push({ from: edge.from, to: edge.to });
    }
  }
  oneWayPairs.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

  // ---- followUp 图距离（与来源节点无双向直接边即视为断联）----
  const followUpDisconnected: DeepAuditReport['followUpDisconnected'] = [];
  for (const [id, node] of Object.entries(mergedNodes)) {
    const questions = node.exploreQuestions;
    if (!questions) continue;
    for (const kind of ['why', 'how', 'whatIf'] as const) {
      for (const followUp of questions[kind]?.followUps ?? []) {
        if (!idSet.has(followUp) || followUp === id) continue;
        const linked =
          forward.has(`${id}\u0000${followUp}`) || forward.has(`${followUp}\u0000${id}`);
        if (!linked) followUpDisconnected.push({ from: id, to: followUp, kind });
      }
    }
  }

  // ---- modelNodeMap ↔ modelStructureIds 双向一致性 ----
  const modelBindingAsymmetry: DeepAuditReport['modelBindingAsymmetry'] = [];
  for (const [structureId, nodeId] of Object.entries(input.modelNodeMap)) {
    const node = mergedNodes[nodeId];
    if (!node) continue;
    const bound = (node.modelStructureIds ?? []).includes(structureId) || node.modelRef === structureId;
    if (!bound) modelBindingAsymmetry.push({ structureId, nodeId });
  }

  // ---- photosynthesis 绑定 + shared 桥接 ----
  const photosynthesisBound = new Set<string>();
  for (const term of Object.values(input.microLab.microStructureTerms)) {
    if (term.knowledgeNodeId) photosynthesisBound.add(term.knowledgeNodeId);
  }
  for (const scene of Object.values(input.microLab.scenes)) {
    photosynthesisBound.add(scene.knowledgeNodeId);
  }
  for (const step of input.microLab.steps) {
    for (const id of step.knowledgeNodeIds ?? []) photosynthesisBound.add(id);
  }
  const boundInGraph = [...photosynthesisBound].filter((id) => idSet.has(id)).sort();
  const bridges = boundInGraph.map((nodeId) => {
    const root = componentRootByNode.get(nodeId);
    const spans = root ? componentOriginSpan.get(root) ?? new Set<string>() : new Set<string>();
    return {
      nodeId,
      inSharedIds: input.sharedIds.includes(nodeId),
      /** 该节点所在连通分量是否同时包含多个 registry 来源（真正跨模块桥接）。 */
      spansRegistries: spans.size > 1,
      origins: [...spans].sort(),
    };
  });

  return {
    nodeCount: ids.length,
    edgeCount: edges.length,
    components,
    unreachableFromEntries,
    entries,
    oneWayPairs,
    followUpDisconnected,
    modelBindingAsymmetry,
    photosynthesisBoundNodes: boundInGraph,
    bridges,
    relationTypeHistogram,
  };
}

export function runKnowledgeGraphDeepAudit(): DeepAuditReport {
  return auditKnowledgeGraphDeep(knowledgeNodes, {
    registries: [
      { name: 'anatomy', nodes: anatomyKnowledgeNodes },
      { name: 'plants', nodes: plantKnowledgeNodes },
    ],
    sharedIds: sharedKnowledgeNodeIds,
    modelNodeMap,
    microLab: { microStructureTerms, scenes: photosynthesisScenes, steps: lightReactionSteps },
  });
}

/** 确定性文本输出（供审计文档引用）。 */
export function formatDeepAudit(report: DeepAuditReport): string {
  const lines: string[] = [];
  lines.push(`nodes: ${report.nodeCount}, related edges: ${report.edgeCount}`);
  lines.push(`entries: ${report.entries.join(', ')}`);
  lines.push(`components: ${report.components.length}`);
  for (const component of report.components) {
    lines.push(`  component(size=${component.size}): ${component.members.join(', ')}`);
  }
  lines.push(`unreachable from entries (${report.unreachableFromEntries.length}): ${report.unreachableFromEntries.join(', ') || '(none)'}`);
  lines.push(`one-way pairs (${report.oneWayPairs.length}):`);
  for (const pair of report.oneWayPairs) {
    lines.push(`  ${pair.from} -> ${pair.to} (no reverse)`);
  }
  lines.push(`followUp disconnected (${report.followUpDisconnected.length}):`);
  for (const item of report.followUpDisconnected) {
    lines.push(`  ${item.from} --${item.kind}.followUps--> ${item.to} (no direct related edge either way)`);
  }
  lines.push(`model binding asymmetry (${report.modelBindingAsymmetry.length}):`);
  for (const item of report.modelBindingAsymmetry) {
    lines.push(`  modelNodeMap["${item.structureId}"] -> "${item.nodeId}" (node does not list the structure back)`);
  }
  lines.push(`photosynthesis-bound nodes: ${report.photosynthesisBoundNodes.join(', ')}`);
  for (const bridge of report.bridges) {
    lines.push(
      `  bridge ${bridge.nodeId}: shared=${bridge.inSharedIds}, spansRegistries=${bridge.spansRegistries} (${bridge.origins.join('+')})`,
    );
  }
  lines.push(`relation types: ${Object.entries(report.relationTypeHistogram).map(([type, count]) => `${type}=${count}`).join(', ')}`);
  return lines.join('\n');
}
