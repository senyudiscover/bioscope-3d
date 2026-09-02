import { AnatomyWorkbench } from '@/app/anatomy-workbench';
import { PhotosynthesisWorkbench } from '@/app/photosynthesis-workbench';
import type { BioScopeModule, BioScopeModuleId } from '@/lib/bioscope-core';

export const bioscopeModules: Record<BioScopeModuleId, BioScopeModule> = {
  'human-anatomy': {
    id: 'human-anatomy',
    titleZh: '人体',
    titleEn: 'Human Anatomy',
    description: '分层人体解剖探索',
    icon: 'human',
    status: 'stable',
    defaultKnowledgeNodeId: 'human',
    component: ({ moduleSelector }) => (
      <AnatomyWorkbench atlasSwitcher={moduleSelector} />
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
};

export const bioscopeModuleList = Object.values(bioscopeModules);
