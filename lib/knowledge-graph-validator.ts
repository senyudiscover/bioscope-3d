import type { KnowledgeNode } from '@/data/knowledge/anatomy';

// ============================================================================
// BioScope Knowledge Graph Integrity Validator（纯函数，零 I/O、零网络）
//
// 目标：在开发阶段发现知识层坏引用，而不是让它们在 UI 中静默消失
// （所有当前消费者的失败表现都是静默降级，见 audit v1 / G 组）。
//
// 本验证器只做引用完整性验证，不定义新的知识模型：
//   - ERROR   = 当前 schema/消费者语义下必然坏掉的引用
//               （missing target、registry key/id 不一致、合并覆盖）
//   - WARNING = 当前实现允许但可疑的结构
//               （自引用、重复关系、alias 漂移）
//   - INFO    = 图形态诊断（孤儿/叶子/互惠关系），不是缺陷
//
// 第 2 层验证（modelStructureIds/modelRef/keyStructures.modelRef 是否为真实
// 3D 结构 id）依赖 Vanatome catalog（远端）。设计为可选输入 knownStructureIds：
// 传入即验证，缺省则明确标记 skipped，绝不主动发起网络请求。
// ============================================================================

export type KnowledgeRegistrySource = {
  /** 注册表来源名（如 "anatomy" / "plants"），须与 data/knowledge/index.ts 的合并顺序一致。 */
  name: string;
  nodes: Record<string, KnowledgeNode>;
};

export type MicroStructureTermBinding = { knowledgeNodeId?: string };

export type KnowledgeSceneBinding = {
  knowledgeNodeId: string;
  parentSceneId?: string;
  childSceneIds?: readonly string[];
};

export type KnowledgeStepBinding = {
  id: string;
  knowledgeNodeIds?: readonly string[];
  /** 兼容 alias（见 data/photosynthesis/micro-lab.ts 类型注释），仅验证，不统一。 */
  relatedKnowledgeNodeIds?: readonly string[];
};

export type KnowledgeGraphInput = {
  /** 合并顺序敏感：与 data/knowledge/index.ts 的 object spread 顺序一致。 */
  registries: readonly KnowledgeRegistrySource[];
  sharedKnowledgeNodeIds?: readonly string[];
  modelNodeMap?: Record<string, string>;
  microLab?: {
    microStructureTerms?: Record<string, MicroStructureTermBinding>;
    scenes?: Record<string, KnowledgeSceneBinding>;
    steps?: readonly KnowledgeStepBinding[];
  };
  /** 第 2 层钩子：已知的 3D 结构 id 集合（Vanatome atlas / micro-lab 场景）。 */
  knownStructureIds?: ReadonlySet<string>;
};

export type KnowledgeIssueSeverity = 'error' | 'warning' | 'info';

export type KnowledgeIssue = {
  severity: KnowledgeIssueSeverity;
  /** 稳定的机器可读代码，供 CI / Agent 比对。 */
  code: string;
  message: string;
};

export type KnowledgeGraphReport = {
  nodeCount: number;
  /** 合并后注册表中声明的 related 关系总数（含重复/坏目标，按声明计）。 */
  relationCount: number;
  errors: KnowledgeIssue[];
  warnings: KnowledgeIssue[];
  infos: KnowledgeIssue[];
  /** 3D 结构 id 存在性验证：传入了 knownStructureIds 则 validated，否则 skipped。 */
  modelReferenceChecks: 'validated' | 'skipped';
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function validateKnowledgeGraph(input: KnowledgeGraphInput): KnowledgeGraphReport {
  const errors: KnowledgeIssue[] = [];
  const warnings: KnowledgeIssue[] = [];
  const infos: KnowledgeIssue[] = [];
  const push = (severity: KnowledgeIssueSeverity, code: string, message: string) => {
    const issue: KnowledgeIssue = { severity, code, message };
    if (severity === 'error') errors.push(issue);
    else if (severity === 'warning') warnings.push(issue);
    else infos.push(issue);
  };

  // ---- 1. 合并前跨注册表重复 id（object spread 会静默覆盖，后者胜出）----
  const ownerByNode = new Map<string, string>();
  for (const registry of input.registries) {
    for (const key of Object.keys(registry.nodes)) {
      const previousOwner = ownerByNode.get(key);
      if (previousOwner !== undefined) {
        push(
          'error',
          'MERGE_COLLISION',
          `knowledge node id "${key}" is defined in both "${previousOwner}" and "${registry.name}"; ` +
            `the object-spread merge in data/knowledge/index.ts silently keeps "${registry.name}"`,
        );
      } else {
        ownerByNode.set(key, registry.name);
      }
    }
  }

  // ---- 合并视图（复现 index.ts 的 spread 语义，仅用于校验）----
  const nodes = new Map<string, KnowledgeNode>();
  for (const registry of input.registries) {
    for (const [key, node] of Object.entries(registry.nodes)) nodes.set(key, node);
  }

  // ---- 2. registry key 与 node.id 一致性 ----
  for (const [key, node] of nodes) {
    if (node.id !== key) {
      push(
        'error',
        'NODE_ID_MISMATCH',
        `registry key "${key}" does not match node.id "${node.id}"; ` +
          `consumers look up by related[].targetId / followUps and would silently miss this node`,
      );
    }
  }

  // ---- 3. related[] 完整性 + 边收集（供诊断）----
  const incomingCount = new Map<string, number>();
  const edges: Array<{ source: string; target: string }> = [];
  const declaredRelationKeys = new Set<string>();
  let relationCount = 0;

  for (const [key, node] of nodes) {
    const related = node.related ?? [];
    relationCount += related.length;
    for (const relation of related) {
      incomingCount.set(relation.targetId, (incomingCount.get(relation.targetId) ?? 0) + 1);
      edges.push({ source: key, target: relation.targetId });
      if (!nodes.has(relation.targetId)) {
        push(
          'error',
          'MISSING_RELATED_TARGET',
          `"${key}" --${relation.relationType}--> "${relation.targetId}": target node does not exist; ` +
            `RelatedKnowledgeDock filters it out silently`,
        );
      }
      if (relation.targetId === key) {
        push('warning', 'SELF_RELATED_TARGET', `"${key}" declares a ${relation.relationType} relation to itself`);
      }
      const declarationKey = `${key}\u0000${relation.targetId}\u0000${relation.relationType}`;
      if (declaredRelationKeys.has(declarationKey)) {
        push(
          'warning',
          'DUPLICATE_RELATION',
          `"${key}" declares ${relation.relationType} -> "${relation.targetId}" more than once; ` +
            `the related dock would render duplicate cards`,
        );
      } else {
        declaredRelationKeys.add(declarationKey);
      }
    }
  }

  // ---- 4. exploreQuestions.followUps 完整性 ----
  for (const [key, node] of nodes) {
    const questions = node.exploreQuestions;
    if (!questions) continue;
    for (const kind of ['why', 'how', 'whatIf'] as const) {
      const followUps = questions[kind]?.followUps ?? [];
      for (const followUp of followUps) {
        if (!nodes.has(followUp)) {
          push(
            'error',
            'MISSING_FOLLOWUP_TARGET',
            `"${key}".exploreQuestions.${kind}.followUps -> "${followUp}": target node does not exist; ` +
              `the explore chip is silently dropped`,
          );
        }
        if (followUp === key) {
          push('warning', 'SELF_FOLLOWUP', `"${key}".exploreQuestions.${kind}.followUps contains itself`);
        }
      }
    }
  }

  // ---- 5. keyStructures 绑定 ----
  for (const [key, node] of nodes) {
    const seenKeyStructureNodeIds = new Set<string>();
    for (const item of node.keyStructures ?? []) {
      if (item.id !== undefined) {
        if (!nodes.has(item.id)) {
          push(
            'error',
            'MISSING_KEY_STRUCTURE_NODE',
            `"${key}".keyStructures["${item.nameZh}"] -> node id "${item.id}" does not exist`,
          );
        }
        if (item.id === key) {
          push('warning', 'SELF_KEY_STRUCTURE_NODE', `"${key}".keyStructures binds the node itself ("${item.id}")`);
        }
        if (seenKeyStructureNodeIds.has(item.id)) {
          push(
            'warning',
            'DUPLICATE_KEY_STRUCTURE_NODE',
            `"${key}".keyStructures binds node "${item.id}" more than once`,
          );
        } else {
          seenKeyStructureNodeIds.add(item.id);
        }
      }
      if (isNonEmptyString(item.modelRef) && input.knownStructureIds && !input.knownStructureIds.has(item.modelRef)) {
        push(
          'error',
          'MISSING_MODEL_STRUCTURE',
          `"${key}".keyStructures["${item.nameZh}"].modelRef "${item.modelRef}" is not a known 3D structure id`,
        );
      }
    }
  }

  // ---- 6. modelStructureIds / modelRef（第 1 层一致性 + 可选第 2 层）----
  for (const [key, node] of nodes) {
    const modelStructureIds = node.modelStructureIds ?? [];
    const modelRef = node.modelRef;

    for (const id of [...modelStructureIds, ...(modelRef ? [modelRef] : [])]) {
      if (!isNonEmptyString(id)) {
        push('warning', 'EMPTY_MODEL_REFERENCE', `"${key}" declares an empty model reference`);
      } else if (input.knownStructureIds && !input.knownStructureIds.has(id)) {
        push(
          'error',
          'MISSING_MODEL_STRUCTURE',
          `"${key}" references 3D structure "${id}" which is not a known structure id`,
        );
      }
    }

    // primaryModelStructureId()（data/knowledge/anatomy.ts）= modelStructureIds?.[0] ?? modelRef：
    // modelStructureIds 非空时 modelRef 被完全忽略，因此两者共存但不一致即是漂移。
    if (modelRef !== undefined && modelStructureIds.length > 0 && modelRef !== modelStructureIds[0]) {
      push(
        'warning',
        'MODEL_REF_DRIFT',
        `"${key}": modelRef "${modelRef}" differs from modelStructureIds[0] "${modelStructureIds[0]}"; ` +
          `primaryModelStructureId() ignores modelRef while modelStructureIds is non-empty`,
      );
    }

    if (node.modelStructureIds !== undefined && node.modelStructureIds.length === 0 && modelRef === undefined) {
      push('info', 'EMPTY_MODEL_STRUCTURE_IDS', `"${key}" declares an empty modelStructureIds array`);
    }
  }

  // ---- 7. sharedKnowledgeNodeIds ----
  const seenShared = new Set<string>();
  for (const id of input.sharedKnowledgeNodeIds ?? []) {
    if (!nodes.has(id)) {
      push('error', 'MISSING_SHARED_NODE', `sharedKnowledgeNodeIds references "${id}" which does not exist`);
    }
    if (seenShared.has(id)) {
      push('warning', 'DUPLICATE_SHARED_NODE', `sharedKnowledgeNodeIds lists "${id}" more than once`);
    } else {
      seenShared.add(id);
    }
  }

  // ---- 8. modelNodeMap（死导出，仅验证不清理）----
  for (const [structureId, nodeId] of Object.entries(input.modelNodeMap ?? {})) {
    if (!nodes.has(nodeId)) {
      push(
        'error',
        'MISSING_MODEL_NODE_MAP_TARGET',
        `modelNodeMap["${structureId}"] -> "${nodeId}" does not exist`,
      );
    }
  }

  // ---- 9. MicroLab / Photosynthesis 绑定 ----
  const microLab = input.microLab;
  if (microLab) {
    for (const [termId, term] of Object.entries(microLab.microStructureTerms ?? {})) {
      const knowledgeNodeId = term.knowledgeNodeId;
      if (knowledgeNodeId !== undefined && !nodes.has(knowledgeNodeId)) {
        push(
          'error',
          'MISSING_MICRO_STRUCTURE_KNOWLEDGE_TARGET',
          `microStructureTerms["${termId}"].knowledgeNodeId -> "${knowledgeNodeId}" does not exist; ` +
            `selecting this mesh would silently skip the knowledge switch`,
        );
      }
    }

    const sceneIds = Object.keys(microLab.scenes ?? {});
    const reportedScenePairs = new Set<string>();
    for (const sceneId of sceneIds) {
      const scene = microLab.scenes?.[sceneId];
      if (!scene) continue;
      if (!nodes.has(scene.knowledgeNodeId)) {
        push(
          'error',
          'MISSING_SCENE_KNOWLEDGE_TARGET',
          `photosynthesisScenes["${sceneId}"].knowledgeNodeId -> "${scene.knowledgeNodeId}" does not exist`,
        );
      }
      if (scene.parentSceneId !== undefined && !(microLab.scenes ?? {})[scene.parentSceneId]) {
        push('warning', 'MISSING_SCENE_PARENT', `photosynthesisScenes["${sceneId}"].parentSceneId "${scene.parentSceneId}" does not exist`);
      }
      for (const childId of scene.childSceneIds ?? []) {
        if (!(microLab.scenes ?? {})[childId]) {
          push('warning', 'MISSING_SCENE_CHILD', `photosynthesisScenes["${sceneId}"].childSceneIds -> "${childId}" does not exist`);
          continue;
        }
        const child = (microLab.scenes ?? {})[childId];
        if (child.parentSceneId !== sceneId && !reportedScenePairs.has(`${sceneId}->${childId}`)) {
          reportedScenePairs.add(`${sceneId}->${childId}`);
          push(
            'warning',
            'SCENE_PARENT_CHILD_MISMATCH',
            `photosynthesisScenes["${sceneId}"] lists "${childId}" as child, but the child's parentSceneId is "${String(child.parentSceneId)}"`,
          );
        }
      }
    }

    for (const step of microLab.steps ?? []) {
      for (const id of step.knowledgeNodeIds ?? []) {
        if (!nodes.has(id)) {
          push(
            'error',
            'MISSING_STEP_KNOWLEDGE_TARGET',
            `lightReactionSteps["${step.id}"].knowledgeNodeIds -> "${id}" does not exist`,
          );
        }
      }
      for (const id of step.relatedKnowledgeNodeIds ?? []) {
        if (!nodes.has(id)) {
          push(
            'error',
            'MISSING_STEP_RELATED_KNOWLEDGE_TARGET',
            `lightReactionSteps["${step.id}"].relatedKnowledgeNodeIds -> "${id}" does not exist`,
          );
        }
      }
      const primary = (step.knowledgeNodeIds ?? []).join(',');
      const alias = (step.relatedKnowledgeNodeIds ?? []).join(',');
      if (primary !== alias) {
        push(
          'warning',
          'STEP_ALIAS_DIVERGENCE',
          `lightReactionSteps["${step.id}"]: relatedKnowledgeNodeIds is the documented compatibility alias of knowledgeNodeIds but has diverged`,
        );
      }
    }
  }

  // ---- 10. 图形态诊断（INFO，不是缺陷）----
  for (const [key] of nodes) {
    if ((incomingCount.get(key) ?? 0) === 0) {
      push('info', 'ORPHAN_NODE', `"${key}" has no incoming relations (unreachable from the related graph)`);
    }
    if ((nodes.get(key)?.related ?? []).length === 0) {
      push('info', 'LEAF_NODE', `"${key}" declares no outgoing related relations`);
    }
  }

  const reportedReciprocalPairs = new Set<string>();
  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    const hasReverse = edges.some((candidate) => candidate.source === edge.target && candidate.target === edge.source);
    if (!hasReverse) continue;
    const pairKey = [edge.source, edge.target].sort().join('\u0000');
    if (reportedReciprocalPairs.has(pairKey)) continue;
    reportedReciprocalPairs.add(pairKey);
    const [a, b] = pairKey.split('\u0000');
    push('info', 'RECIPROCAL_RELATION', `"${a}" <-> "${b}" reference each other (by design for this knowledge layer)`);
  }

  return {
    nodeCount: nodes.size,
    relationCount,
    errors,
    warnings,
    infos,
    modelReferenceChecks: input.knownStructureIds ? 'validated' : 'skipped',
  };
}
