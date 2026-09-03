import { describe, expect, it } from 'vitest';
import { getParentScene, getPrimaryChildScene } from '@/lib/bioscope-core';
import { knowledgeNodes } from '@/data/knowledge';
import { lightReactionSteps } from '@/data/photosynthesis/micro-lab';

// ============================================================================
// 数据/纯函数不变量（Deep Assurance #002 · Track B 补齐）
//
// 此前三类「文档宣称但零测试」的约束在此固化：
//   1. PROJECT.md 宣称的 3-5-1 Rule 中可静态验证的两条：
//      每节点 related ≤ 5、coreFunctions ≤ 3（此前数据只是碰巧满足）。
//   2. lightReactionSteps（BIO-002A 的数据基座）的健全性：
//      id 唯一、标题非空、每步至少 1 个知识锚点。
//   3. photosynthesis 导航纯函数 getParentScene / getPrimaryChildScene
//      （canExplore 门禁的底层原语）此前零测试。
// ============================================================================

describe('knowledge 数据形状不变量（3-5-1 Rule 的静态部分）', () => {
  const entries = Object.entries(knowledgeNodes);

  it('registry key 与 node.id 一致（数据级复述，独立于 validator）', () => {
    for (const [key, node] of entries) {
      expect(node.id, `node "${key}"`).toBe(key);
    }
  });

  it('每个节点 nameZh 非空', () => {
    for (const [key, node] of entries) {
      expect(node.nameZh.trim().length, `node "${key}"`).toBeGreaterThan(0);
    }
  });

  it('每个节点 related ≤ 5（3-5-1 Rule）', () => {
    for (const [key, node] of entries) {
      expect(node.related?.length ?? 0, `node "${key}"`).toBeLessThanOrEqual(5);
    }
  });

  it('每个节点 coreFunctions ≤ 3（3-5-1 Rule）', () => {
    for (const [key, node] of entries) {
      expect(node.coreFunctions?.length ?? 0, `node "${key}"`).toBeLessThanOrEqual(3);
    }
  });

  it('规模基线：46 节点（34 anatomy + 12 plants）', () => {
    expect(entries).toHaveLength(46);
  });
});

describe('lightReactionSteps 数据健全性（BIO-002A 数据基座）', () => {
  it('id 唯一', () => {
    const ids = lightReactionSteps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每步 titleZh 非空且 description 非空', () => {
    for (const step of lightReactionSteps) {
      expect(step.titleZh.trim().length, `step "${step.id}"`).toBeGreaterThan(0);
      expect(step.description.trim().length, `step "${step.id}"`).toBeGreaterThan(0);
    }
  });

  it('每步至少 1 个 knowledgeNodeIds（无空锚点步骤）', () => {
    for (const step of lightReactionSteps) {
      expect(
        (step.knowledgeNodeIds ?? []).length,
        `step "${step.id}"`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('alias relatedKnowledgeNodeIds 与 knowledgeNodeIds 一致（validator WARNING 的数据面复述）', () => {
    for (const step of lightReactionSteps) {
      expect(step.relatedKnowledgeNodeIds).toEqual(step.knowledgeNodeIds);
    }
  });
});

describe('bioscope-core 场景导航纯函数', () => {
  const scenes = {
    cell: { knowledgeNodeId: 'n1', childSceneIds: ['chloro'] },
    chloro: { knowledgeNodeId: 'n2', parentSceneId: 'cell', childSceneIds: ['thyla'] },
    thyla: { knowledgeNodeId: 'n3', parentSceneId: 'chloro', childSceneIds: [] },
  } as unknown as Record<string, Parameters<typeof getParentScene>[0]>;

  it('getPrimaryChildScene 返回 childSceneIds[0] 的场景；无子场景/未知场景 → undefined', () => {
    expect(getPrimaryChildScene(scenes.cell, scenes)).toBe(scenes.chloro);
    expect(getPrimaryChildScene(scenes.chloro, scenes)).toBe(scenes.thyla);
    expect(getPrimaryChildScene(scenes.thyla, scenes)).toBeUndefined();
  });

  it('getParentScene 按 parentSceneId 查父场景对象；根场景 → undefined', () => {
    expect(getParentScene(scenes.thyla, scenes)).toBe(scenes.chloro);
    expect(getParentScene(scenes.cell, scenes)).toBeUndefined();
  });
});
