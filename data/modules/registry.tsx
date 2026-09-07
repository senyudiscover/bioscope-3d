import { lazy } from 'react';
import { AnatomyWorkbench } from '@/app/anatomy-workbench';
import { PhotosynthesisWorkbench } from '@/app/photosynthesis-workbench';
import type { BioScopeModule, BioScopeModuleId } from '@/lib/bioscope-core';

const BrainWorkbench = lazy(() =>
  import('@/app/brain-workbench').then((module) => ({
    default: module.BrainWorkbench,
  })),
);

export const bioscopeModules: Record<BioScopeModuleId, BioScopeModule> = {
  'human-anatomy': {
    id: 'human-anatomy',
    titleZh: '人体',
    titleEn: 'Human Anatomy',
    description: '分层人体解剖探索',
    icon: 'human',
    status: 'stable',
    defaultKnowledgeNodeId: 'human',
    component: ({ moduleSelector, onNavigate }) => (
      <AnatomyWorkbench
        atlasSwitcher={moduleSelector}
        onOpenBrain={() => onNavigate('brain-atlas')}
      />
    ),
  },
  photosynthesis: {
    id: 'photosynthesis',
    titleZh: '光合作用',
    titleEn: 'Photosynthesis Micro Lab',
    description: '从叶肉细胞深入类囊体膜',
    icon: 'microscope',
    status: 'experimental',
    defaultKnowledgeNodeId: 'photosynthesis',
    component: ({ moduleSelector }) => (
      <PhotosynthesisWorkbench atlasSwitcher={moduleSelector} />
    ),
  },
  'brain-atlas': {
    id: 'brain-atlas',
    titleZh: '脑图谱',
    titleEn: 'Brain Workbench',
    description: '437 个脑结构的交互式图谱',
    icon: 'brain',
    status: 'experimental',
    defaultKnowledgeNodeId: 'brain',
    component: ({ moduleSelector }) => (
      <BrainWorkbench atlasSwitcher={moduleSelector} />
    ),
  },
};

export const bioscopeModuleList = Object.values(bioscopeModules);
