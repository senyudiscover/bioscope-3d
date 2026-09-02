// 兼容再导出：知识数据层已迁移至 data/knowledge/anatomy.ts。
// 保留此文件以兼容既有 import（lib/knowledge-nodes），避免改动页面其余部分。

export {
  type KnowledgeScale,
  type KnowledgeKeyStructure,
  type KnowledgeNode,
  type KnowledgeRelation,
  type KnowledgeRelationType,
  knowledgeNodes,
  modelNodeMap,
  scaleLabels,
  primaryModelStructureId,
  relationTypeLabels,
  sharedKnowledgeNodeIds,
} from '../data/knowledge';

/** 历史别名：等价于 KnowledgeScale。 */
export type LifeScale =
  | 'membrane'
  | 'plant'
  | 'human'
  | 'organ'
  | 'tissue'
  | 'cell'
  | 'organelle'
  | 'molecule';
