import type { KnowledgeScale } from '../knowledge';

export type PlantModelLevel =
  | 'spinach'
  | 'leaf'
  | 'mesophyll-cell'
  | 'chloroplast';

export type PlantExplorerItem = {
  id: string;
  children?: PlantExplorerItem[];
};

export const plantExplorerTree: PlantExplorerItem[] = [
  {
    id: 'spinach',
    children: [
      { id: 'leaf' },
      {
        id: 'mesophyll-cell',
        children: [{ id: 'chloroplast' }, { id: 'mitochondrion' }],
      },
    ],
  },
];

export const plantScaleLabels: Array<{
  id: KnowledgeScale;
  en: string;
  zh: string;
  enabled: boolean;
}> = [
  { id: 'plant', en: 'PLANT', zh: '植物', enabled: true },
  { id: 'organ', en: 'ORGAN', zh: '器官', enabled: true },
  { id: 'tissue', en: 'TISSUE', zh: '组织', enabled: false },
  { id: 'cell', en: 'CELL', zh: '细胞', enabled: true },
  { id: 'organelle', en: 'ORGANELLE', zh: '细胞器', enabled: true },
  { id: 'molecule', en: 'MOLECULE', zh: '分子', enabled: false },
];

export const plantLevelScale: Record<PlantModelLevel, KnowledgeScale> = {
  spinach: 'plant',
  leaf: 'organ',
  'mesophyll-cell': 'cell',
  chloroplast: 'organelle',
};

export const plantLevelLabels: Record<
  PlantModelLevel,
  { zh: string; en: string }
> = {
  spinach: { zh: '菠菜', en: 'Spinach' },
  leaf: { zh: '叶片', en: 'Leaf' },
  'mesophyll-cell': { zh: '叶肉细胞', en: 'Mesophyll cell' },
  chloroplast: { zh: '叶绿体', en: 'Chloroplast' },
};

export const structuresInPlantLevel: Record<PlantModelLevel, string[]> = {
  spinach: ['spinach', 'leaf'],
  leaf: ['leaf'],
  'mesophyll-cell': ['mesophyll-cell', 'chloroplast', 'mitochondrion'],
  chloroplast: ['chloroplast'],
};
