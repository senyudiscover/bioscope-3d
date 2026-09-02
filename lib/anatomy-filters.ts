import type { VanatomeStructure } from '@vixotic/vanatome-react';

export type AnatomySystemFilter = 'all' | 'cardiovascular' | 'respiratory' | 'digestive' | 'nervous' | 'endocrine' | 'lymphatic' | 'urinary' | 'reproductive' | 'musculoskeletal';
export type DisplayLayerFilter = 'surface' | 'muscle' | 'organ' | 'neurovascular' | 'skeleton' | 'mixed';

export const systemFilterOptions: Array<{ id: AnatomySystemFilter; label: string }> = [
  { id: 'all', label: '全部人体' }, { id: 'cardiovascular', label: '心血管' }, { id: 'respiratory', label: '呼吸' },
  { id: 'digestive', label: '消化' }, { id: 'nervous', label: '神经' }, { id: 'endocrine', label: '内分泌' },
  { id: 'lymphatic', label: '淋巴' }, { id: 'urinary', label: '泌尿' }, { id: 'reproductive', label: '生殖' },
  { id: 'musculoskeletal', label: '肌肉骨骼' },
];

export const displayLayerOptions: Array<{ id: DisplayLayerFilter; label: string }> = [
  { id: 'surface', label: '表面' }, { id: 'muscle', label: '肌肉' }, { id: 'organ', label: '器官' },
  { id: 'neurovascular', label: '神经血管' }, { id: 'skeleton', label: '骨骼' }, { id: 'mixed', label: '混合' },
];

export function matchesSystem(structure: VanatomeStructure, filter: AnatomySystemFilter) {
  if (filter === 'all') return true;
  if (filter === 'musculoskeletal') return structure.system === 'muscular' || structure.system === 'skeletal';
  return structure.system === filter;
}

const musclePattern = /muscle|muscular|deltoid|oblique|abdominis|quadratus|diaphragm|tendon|ligament/i;
const skeletonPattern = /bone|rib|vertebra|vertebral|sternum|sacrum|coccyx|skull|mandible|maxilla|femur|tibia|fibula|humerus|radius|ulna|patella|scapula|clavicle|skeleton|cartilage/i;
const neurovascularPattern = /arter|vein|venous|aorta|vascular|vessel|nerve|ganglion|plexus|brain|spinal|medulla|pons|cerebr|lymph|node/i;
const surfacePattern = /body-shell|skin|fascia|surface|integument/i;

export function displayLayersFor(structure: VanatomeStructure): Set<DisplayLayerFilter> {
  const text = `${structure.id} ${structure.name}`;
  const result = new Set<DisplayLayerFilter>();
  if (surfacePattern.test(text)) result.add('surface');
  if (musclePattern.test(text) || structure.system === 'muscular') result.add('muscle');
  if (skeletonPattern.test(text) || structure.system === 'skeletal') result.add('skeleton');
  if (neurovascularPattern.test(text) || structure.system === 'nervous' || structure.system === 'cardiovascular' || structure.system === 'lymphatic') result.add('neurovascular');
  if (structure.kind === 'organ' && structure.id !== 'body-shell' && !structure.id.endsWith('-system')) result.add('organ');
  result.add('mixed');
  return result;
}

export function matchesDisplayLayer(structure: VanatomeStructure, filter: DisplayLayerFilter) {
  return displayLayersFor(structure).has(filter);
}

export function createFilteredAtlas(
  atlas: VanatomeStructure[],
  system: AnatomySystemFilter,
  displayLayer: DisplayLayerFilter,
) {
  if (system === 'all' && displayLayer === 'mixed') return atlas;
  const byId = new Map(atlas.map((item) => [item.id, item]));
  const included = new Set<string>();
  for (const structure of atlas) {
    if (structure.kind === 'system') continue;
    if (matchesSystem(structure, system) && matchesDisplayLayer(structure, displayLayer)) {
      included.add(structure.id);
      let parentId = structure.parentId;
      while (parentId) {
        included.add(parentId);
        parentId = byId.get(parentId)?.parentId;
      }
    }
  }
  return atlas.filter((structure) => included.has(structure.id));
}

export function availableDisplayLayers(structures: readonly VanatomeStructure[], system: AnatomySystemFilter) {
  return new Set(displayLayerOptions.filter((option) => option.id === 'mixed' || structures.some((structure) => matchesSystem(structure, system) && matchesDisplayLayer(structure, option.id))).map((option) => option.id));
}
