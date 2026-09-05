import type { MechanismStep, VisualScene } from '@/lib/bioscope-core';

export type PhotosynthesisSceneId =
  | 'mesophyll-cell'
  | 'chloroplast'
  | 'thylakoid';

export type LightReactionStepId =
  | 'photon-absorption'
  | 'water-oxidation'
  | 'electron-transport'
  | 'proton-gradient'
  | 'atp-synthesis'
  | 'nadph-formation';

export type LightReactionStep = MechanismStep & {
  id: LightReactionStepId;
  meshIds: string[];
  /** Derived compatibility alias for the knowledge validator. */
  relatedKnowledgeNodeIds: string[];
};

const baseLightReactionSteps: Array<Omit<LightReactionStep, 'relatedKnowledgeNodeIds'>> = [
  {
    id: 'photon-absorption',
    titleZh: '光子吸收',
    titleEn: 'Photon absorption',
    description:
      '光子被类囊体膜中光系统 II 的光合色素吸收，引发后续电子转移。光不是通过膜运输的物质。',
    knowledgeNodeIds: ['light-reactions', 'chloroplast'],
    meshIds: ['photosystem-ii'],
  },
  {
    id: 'water-oxidation',
    titleZh: '水参与并释放氧气',
    titleEn: 'Water oxidation',
    description:
      '水参与反应并提供电子，同时形成 H⁺并释放 O₂。光合作用释放的氧气主要来源于水。',
    knowledgeNodeIds: ['oxygen', 'light-reactions'],
    meshIds: ['thylakoid-lumen'],
  },
  {
    id: 'electron-transport',
    titleZh: '电子传递',
    titleEn: 'Electron transport',
    description:
      '电子沿类囊体膜上的电子传递过程移动，能量转换与跨膜质子转运相互耦联。',
    knowledgeNodeIds: ['electron-transport-chain', 'light-reactions'],
    meshIds: ['electron-transport'],
  },
  {
    id: 'proton-gradient',
    titleZh: '质子梯度',
    titleEn: 'Proton gradient',
    description: '类囊体腔内积累较多 H⁺，在类囊体膜两侧形成电化学梯度。',
    knowledgeNodeIds: ['light-reactions', 'atp-synthase'],
    meshIds: ['thylakoid-lumen'],
  },
  {
    id: 'atp-synthesis',
    titleZh: 'ATP形成',
    titleEn: 'ATP synthesis',
    description: 'H⁺顺梯度通过 ATP 合酶，驱动 ADP 与无机磷酸形成 ATP。',
    knowledgeNodeIds: ['atp-synthase', 'atp'],
    meshIds: ['atp-synthase'],
  },
  {
    id: 'nadph-formation',
    titleZh: 'NADPH形成',
    titleEn: 'NADPH formation',
    description:
      '光系统 I 参与后续电子转移并形成 NADPH。NADPH 为后续碳固定相关反应提供还原力。',
    knowledgeNodeIds: ['light-reactions', 'photosynthesis'],
    meshIds: ['photosystem-i'],
  },
];

export const lightReactionSteps: LightReactionStep[] = baseLightReactionSteps.map(
  (step) => ({ ...step, relatedKnowledgeNodeIds: [...step.knowledgeNodeIds] }),
);

export const photosynthesisScenes: Record<
  PhotosynthesisSceneId,
  VisualScene<PhotosynthesisSceneId>
> = {
  'mesophyll-cell': {
    id: 'mesophyll-cell',
    titleZh: '叶肉细胞',
    titleEn: 'Mesophyll cell',
    scale: 'cell',
    knowledgeNodeId: 'mesophyll-cell',
    type: 'micro-lab',
    viewerKind: 'r3f',
    childSceneIds: ['chloroplast'],
  },
  chloroplast: {
    id: 'chloroplast',
    titleZh: '叶绿体',
    titleEn: 'Chloroplast',
    scale: 'organelle',
    knowledgeNodeId: 'chloroplast',
    type: 'micro-lab',
    viewerKind: 'r3f',
    parentSceneId: 'mesophyll-cell',
    childSceneIds: ['thylakoid'],
  },
  thylakoid: {
    id: 'thylakoid',
    titleZh: '类囊体膜',
    titleEn: 'Thylakoid membrane',
    scale: 'membrane',
    knowledgeNodeId: 'thylakoid',
    type: 'micro-lab',
    viewerKind: 'r3f',
    parentSceneId: 'chloroplast',
    childSceneIds: [],
  },
};

export const sceneOrder: PhotosynthesisSceneId[] = [
  'mesophyll-cell',
  'chloroplast',
  'thylakoid',
];

export const microStructureTerms: Record<
  string,
  { nameZh: string; nameEn: string; knowledgeNodeId?: string }
> = {
  'mesophyll-cell': {
    nameZh: '叶肉细胞',
    nameEn: 'Mesophyll cell',
    knowledgeNodeId: 'mesophyll-cell',
  },
  'cell-wall': {
    nameZh: '细胞壁',
    nameEn: 'Cell wall',
    knowledgeNodeId: 'cell-wall',
  },
  'cell-membrane': {
    nameZh: '细胞膜',
    nameEn: 'Cell membrane',
    knowledgeNodeId: 'cell-membrane',
  },
  cytoplasm: {
    nameZh: '细胞质',
    nameEn: 'Cytoplasm',
    knowledgeNodeId: 'cytoplasm',
  },
  vacuole: {
    nameZh: '中央液泡',
    nameEn: 'Central vacuole',
    knowledgeNodeId: 'vacuole',
  },
  nucleus: {
    nameZh: '细胞核',
    nameEn: 'Nucleus',
    knowledgeNodeId: 'nucleus',
  },
  chloroplast: {
    nameZh: '叶绿体',
    nameEn: 'Chloroplast',
    knowledgeNodeId: 'chloroplast',
  },
  mitochondrion: {
    nameZh: '线粒体',
    nameEn: 'Mitochondrion',
    knowledgeNodeId: 'mitochondrion',
  },
  'outer-membrane': { nameZh: '外膜', nameEn: 'Outer membrane' },
  'inner-membrane': { nameZh: '内膜', nameEn: 'Inner membrane' },
  stroma: { nameZh: '基质', nameEn: 'Stroma' },
  granum: {
    nameZh: '基粒',
    nameEn: 'Granum',
    knowledgeNodeId: 'thylakoid',
  },
  thylakoid: {
    nameZh: '类囊体',
    nameEn: 'Thylakoid',
    knowledgeNodeId: 'thylakoid',
  },
  'thylakoid-membrane': {
    nameZh: '类囊体膜',
    nameEn: 'Thylakoid membrane',
    knowledgeNodeId: 'thylakoid',
  },
  'thylakoid-lumen': {
    nameZh: '类囊体腔',
    nameEn: 'Thylakoid lumen',
    knowledgeNodeId: 'thylakoid',
  },
  'photosystem-ii': { nameZh: '光系统II', nameEn: 'Photosystem II' },
  'electron-transport': {
    nameZh: '电子传递区域',
    nameEn: 'Electron transport',
    knowledgeNodeId: 'electron-transport-chain',
  },
  'photosystem-i': { nameZh: '光系统I', nameEn: 'Photosystem I' },
  'atp-synthase': {
    nameZh: 'ATP合酶',
    nameEn: 'ATP synthase',
    knowledgeNodeId: 'atp-synthase',
  },
};
