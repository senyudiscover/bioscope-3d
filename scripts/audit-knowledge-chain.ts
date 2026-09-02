import type { KnowledgeNode, KnowledgeRelationType } from '@/data/knowledge/anatomy';
import { knowledgeNodes } from '@/data/knowledge';

/**
 * BioScope 知识链双向可达性审计（只读分析，不改任何数据）。
 *
 * 背景：BIO-004 怀疑核心学习链「肺→肺泡→氧气→血液→心脏→ATP→细胞呼吸→线粒体」
 * 不能严格双向走通（用户从任一节点都能"返回"上一节点）。
 *
 * 本模块只测量并报告，不补边：
 *   - 逐跳检查 forward（链方向）与 reverse（链反方向）的 related 声明；
 *   - 输出链上每个节点的 outgoing/incoming 度数，便于定位断点成因；
 *   - 补边是知识/产品判断，方案写入 Night Shift Report 的 CEO Decision Required。
 *
 * 执行方式与 validate-knowledge-graph.ts 相同：数据层使用 '@/ 别名与无扩展名
 * 相对导入，Node type-stripping 无法解析，因此经由 vitest 执行：
 *
 *   npm run audit:knowledge-chain    # = vitest run tests/knowledge-chain-audit.test.ts
 */

export type KnowledgeChainAuditInput = {
  nodes: Record<string, KnowledgeNode>;
  /** 有序节点 id 链；相邻两项构成一跳。 */
  chain: readonly string[];
};

export type ChainEdge = { relationType: KnowledgeRelationType; reason: string };

export type ChainHop = {
  from: string;
  to: string;
  forward: ChainEdge | null;
  reverse: ChainEdge | null;
};

export type KnowledgeChainAuditReport = {
  chain: readonly string[];
  /** 链上引用了但注册表中不存在的节点 id。 */
  missingNodes: string[];
  hops: ChainHop[];
  /** forward 与 reverse 都存在的跳数。 */
  bidirectionalHops: number;
  /** 缺任一方向的跳数。 */
  brokenHops: number;
  /** 链上节点的出/入度（含链外目标，仅 related[] 口径）。 */
  degrees: Record<string, { out: number; in: number }>;
};

const firstEdge = (
  node: KnowledgeNode | undefined,
  targetId: string,
): ChainEdge | null => {
  const relation = node?.related?.find((item) => item.targetId === targetId);
  return relation ? { relationType: relation.relationType, reason: relation.reason } : null;
};

export function auditKnowledgeChain(input: KnowledgeChainAuditInput): KnowledgeChainAuditReport {
  const { nodes, chain } = input;

  const missingNodes = chain.filter((id) => !nodes[id]);
  const hops: ChainHop[] = [];
  for (let i = 0; i + 1 < chain.length; i += 1) {
    const from = chain[i];
    const to = chain[i + 1];
    hops.push({
      from,
      to,
      forward: firstEdge(nodes[from], to),
      reverse: firstEdge(nodes[to], from),
    });
  }

  const degrees: KnowledgeChainAuditReport['degrees'] = {};
  for (const id of chain) {
    const node = nodes[id];
    const out = node?.related?.length ?? 0;
    let inCount = 0;
    for (const other of Object.values(nodes)) {
      if (other.related?.some((item) => item.targetId === id)) inCount += 1;
    }
    degrees[id] = { out, in: inCount };
  }

  const bidirectionalHops = hops.filter((hop) => hop.forward && hop.reverse).length;
  const brokenHops = hops.length - bidirectionalHops;

  return { chain, missingNodes, hops, bidirectionalHops, brokenHops, degrees };
}

/** BIO-004 验收标准中点名的核心学习链（板载原文顺序）。 */
export const CORE_LEARNING_CHAIN = [
  'lungs',
  'alveoli',
  'oxygen',
  'blood',
  'heart',
  'atp',
  'cellular-respiration',
  'mitochondrion',
] as const;

export function runCoreChainAudit(): KnowledgeChainAuditReport {
  return auditKnowledgeChain({ nodes: knowledgeNodes, chain: CORE_LEARNING_CHAIN });
}

/** 确定性文本输出：相同数据每次运行逐字节一致，供 CI / Agent 比对。 */
export function formatKnowledgeChainAudit(report: KnowledgeChainAuditReport): string {
  const lines: string[] = [];
  lines.push(`chain: ${report.chain.join(' -> ')}`);
  if (report.missingNodes.length > 0) {
    lines.push(`missing nodes: ${report.missingNodes.map((id) => `"${id}"`).join(', ')}`);
  }
  lines.push(`hops: ${report.hops.length} (bidirectional ${report.bidirectionalHops}, broken ${report.brokenHops})`);
  for (const hop of report.hops) {
    if (hop.forward && hop.reverse) {
      lines.push(`BIDIRECTIONAL ${hop.from} <-> ${hop.to} (${hop.forward.relationType} / ${hop.reverse.relationType})`);
    } else if (hop.forward && !hop.reverse) {
      lines.push(`ONE-WAY ${hop.from} -> ${hop.to} (forward ${hop.forward.relationType}; reverse edge "${hop.to}" -> "${hop.from}" missing)`);
    } else if (!hop.forward && hop.reverse) {
      lines.push(`ONE-WAY ${hop.from} <- ${hop.to} (reverse ${hop.reverse.relationType}; forward edge "${hop.from}" -> "${hop.to}" missing)`);
    } else {
      lines.push(`DISCONNECTED ${hop.from} / ${hop.to} (no declared edge in either direction)`);
    }
  }
  lines.push('node degrees (out = related[] entries, in = nodes pointing back):');
  for (const id of report.chain) {
    const degree = report.degrees[id];
    if (degree) lines.push(`  ${id}: out=${degree.out} in=${degree.in}`);
  }
  return lines.join('\n');
}
