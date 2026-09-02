import type { ComponentType, ReactNode } from 'react';
import type { KnowledgeScale } from './knowledge-nodes';

/** The active learning domain. It belongs to the global workspace only. */
export type ModuleContext = {
  moduleId: BioScopeModuleId;
};

/** What is rendered in the central visual workspace. */
export type VisualContext<SceneId extends string = string> = {
  sceneId: SceneId;
};

/** What the learner is reading in the knowledge panel. */
export type KnowledgeContext = {
  nodeId: string;
};

export type VisualScene<SceneId extends string = string> = {
  id: SceneId;
  type: 'atlas' | 'micro-lab' | 'molecular';
  scale: KnowledgeScale;
  titleZh: string;
  titleEn: string;
  knowledgeNodeId: string;
  parentSceneId?: SceneId;
  childSceneIds: SceneId[];
  viewerKind: 'vanatome' | 'r3f' | 'molstar';
};

export type MechanismStep = {
  id: string;
  titleZh: string;
  titleEn: string;
  description: string;
  knowledgeNodeIds: string[];
  duration?: number;
  cameraTarget?: string;
  visualState?: Record<string, string | number | boolean>;
};

export type ModuleShellProps = {
  moduleSelector: ReactNode;
};

export type BioScopeModuleId = 'human-anatomy' | 'photosynthesis';

export type BioScopeModule = {
  id: BioScopeModuleId;
  titleZh: string;
  titleEn: string;
  description: string;
  icon: 'human' | 'microscope';
  status: 'stable' | 'experimental';
  defaultKnowledgeNodeId: string;
  component: ComponentType<ModuleShellProps>;
};

export function getParentScene<SceneId extends string>(
  scene: VisualScene<SceneId>,
  scenes: Record<SceneId, VisualScene<SceneId>>,
) {
  return scene.parentSceneId ? scenes[scene.parentSceneId] : undefined;
}

export function getPrimaryChildScene<SceneId extends string>(
  scene: VisualScene<SceneId>,
  scenes: Record<SceneId, VisualScene<SceneId>>,
) {
  const childId = scene.childSceneIds[0];
  return childId ? scenes[childId] : undefined;
}
