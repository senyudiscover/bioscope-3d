import { describe, expect, it } from 'vitest';
import type { KnowledgeNode, KnowledgeRelationType } from '@/data/knowledge/anatomy';
import {
  auditKnowledgeChain,
  formatKnowledgeChainAudit,
  runCoreChainAudit,
} from '@/scripts/audit-knowledge-chain';

// ============================================================================
// 核心知识链双向可达性审计（BIO-004 前置只读审计 · night-shift NS-2）
//
// 第 1 组用 fixture 验证审计器自身语义（四种跳分类：双向 / 仅正向 /
// 仅反向 / 完全断开）；
// 第 2 组对真实数据固化【当前】核心链形态（characterization 基线）：
// 3 处单向断点是有意锁定的现状。BIO-004 补反向边（需 CEO 决策）落地时，
// 必须有意识地更新这里的期望值，而不是让测试静默漂移。
// ============================================================================

const nodeWithRelated = (
  id: string,
  related: Array<{ targetId: string; relationType: KnowledgeRelationType; reason: string }>,
): KnowledgeNode => ({
  id,
  nameZh: id,
  typeZh: '测试',
  typeEn: 'Test',
  scale: 'cell',
  summary: 'fixture node',
  related,
});

describe('1 · 审计器语义（fixture）', () => {
  // 链 a→b→c→d 覆盖三种跳形态：
  //   a<->b 双向；b→c 仅正向（c 无回边）；c→d 仅反向（d 指回 c）。
  const nodes = {
    a: nodeWithRelated('a', [{ targetId: 'b', relationType: 'contains', reason: 'r' }]),
    b: nodeWithRelated('b', [
      { targetId: 'a', relationType: 'contains', reason: 'r' },
      { targetId: 'c', relationType: 'transports', reason: 'r' },
    ]),
    c: nodeWithRelated('c', []),
    d: nodeWithRelated('d', [{ targetId: 'c', relationType: 'participates_in', reason: 'r' }]),
  };

  it('双向跳、仅正向跳、仅反向跳分别正确分类', () => {
    const report = auditKnowledgeChain({ nodes, chain: ['a', 'b', 'c', 'd'] });

    expect(report.missingNodes).toEqual([]);
    expect(report.hops).toHaveLength(3);

    expect(report.hops[0]).toMatchObject({ from: 'a', to: 'b' });
    expect(report.hops[0].forward?.relationType).toBe('contains');
    expect(report.hops[0].reverse?.relationType).toBe('contains');

    expect(report.hops[1]).toMatchObject({ from: 'b', to: 'c' });
    expect(report.hops[1].forward?.relationType).toBe('transports');
    expect(report.hops[1].reverse).toBeNull();

    expect(report.hops[2]).toMatchObject({ from: 'c', to: 'd' });
    expect(report.hops[2].forward).toBeNull();
    expect(report.hops[2].reverse?.relationType).toBe('participates_in');

    expect(report.bidirectionalHops).toBe(1);
    expect(report.brokenHops).toBe(2);
  });

  it('链引用不存在的节点 → 记入 missingNodes，跳按 null 边处理', () => {
    const report = auditKnowledgeChain({ nodes, chain: ['a', 'ghost'] });

    expect(report.missingNodes).toEqual(['ghost']);
    expect(report.hops[0].forward).toBeNull();
    expect(report.hops[0].reverse).toBeNull();
  });

  it('首尾相接的环（a→b→a）逐跳审计', () => {
    const report = auditKnowledgeChain({ nodes, chain: ['a', 'b', 'a'] });

    expect(report.hops).toHaveLength(2);
    expect(report.bidirectionalHops).toBe(2);
    expect(report.brokenHops).toBe(0);
  });

  it('度数统计：out 为 related[] 声明数，in 为全图指回该节点的节点数', () => {
    const report = auditKnowledgeChain({ nodes, chain: ['a', 'b', 'c'] });

    expect(report.degrees.a).toEqual({ out: 1, in: 1 });
    expect(report.degrees.b).toEqual({ out: 2, in: 1 });
    // c 无出边；全图中指向 c 的是 b 与 d → in=2。
    expect(report.degrees.c).toEqual({ out: 0, in: 2 });
  });

  it('输出确定性：同数据两次格式化逐字节一致', () => {
    const first = formatKnowledgeChainAudit(auditKnowledgeChain({ nodes, chain: ['a', 'b', 'c'] }));
    const second = formatKnowledgeChainAudit(auditKnowledgeChain({ nodes, chain: ['a', 'b', 'c'] }));

    expect(second).toBe(first);
    expect(first).toContain('BIDIRECTIONAL a <-> b (contains / contains)');
    expect(first).toContain('ONE-WAY b -> c (forward transports; reverse edge "c" -> "b" missing)');
  });
});

describe('2 · 真实数据：核心学习链现状（characterization baseline）', () => {
  const report = runCoreChainAudit();

  it('输出确定性：两次运行全文一致（npm run audit:knowledge-chain 可见输出）', () => {
    const second = runCoreChainAudit();
    expect(formatKnowledgeChainAudit(second)).toBe(formatKnowledgeChainAudit(report));
    console.log(formatKnowledgeChainAudit(report));
  });

  it('链上节点全部存在（无悬空 id）', () => {
    expect(report.missingNodes).toEqual([]);
  });

  it('当前断点基线：恰好 3 处单向跳（4 处双向）', () => {
    expect(report.bidirectionalHops).toBe(4);
    expect(report.brokenHops).toBe(3);

    // 仅正向可走（反向缺失）：alveoli→oxygen、heart→atp。
    expect(report.hops.find((hop) => hop.from === 'alveoli' && hop.to === 'oxygen')).toMatchObject({
      forward: { relationType: 'transports' },
      reverse: null,
    });
    expect(report.hops.find((hop) => hop.from === 'heart' && hop.to === 'atp')).toMatchObject({
      forward: { relationType: 'requires' },
      reverse: null,
    });

    // 仅反向可走：mitochondrion→cellular-respiration 存在（related_to），
    // 但链方向的 cellular-respiration→mitochondrion 没有边。
    expect(
      report.hops.find((hop) => hop.from === 'cellular-respiration' && hop.to === 'mitochondrion'),
    ).toMatchObject({
      forward: null,
      reverse: { relationType: 'related_to' },
    });
  });
});
