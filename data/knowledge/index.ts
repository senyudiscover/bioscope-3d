import {
  knowledgeNodes as anatomyKnowledgeNodes,
  type KnowledgeNode,
} from './anatomy';
import { plantKnowledgeNodes } from './plants';

/** BioScope 的统一知识入口：不同 Atlas 共享同一稳定节点注册表。 */
export const knowledgeNodes: Record<string, KnowledgeNode> = {
  ...anatomyKnowledgeNodes,
  ...plantKnowledgeNodes,
};

export const sharedKnowledgeNodeIds = [
  'atp',
  'oxygen',
  'mitochondrion',
  'cellular-respiration',
  'electron-transport-chain',
  'atp-synthase',
] as const;

export function getRelationReason(
  fromId: string,
  toId: string,
): string | undefined {
  return knowledgeNodes[fromId]?.related?.find((item) => item.targetId === toId)
    ?.reason;
}

export {
  type KnowledgeKeyStructure,
  type KnowledgeNode,
  type KnowledgeQuestion,
  type KnowledgeRelation,
  type KnowledgeRelationType,
  type KnowledgeScale,
  modelNodeMap,
  primaryModelStructureId,
  relation,
  relationTypeLabels,
  scaleLabels,
} from './anatomy';
