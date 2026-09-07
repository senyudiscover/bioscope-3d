export const BRAIN_STRUCTURE_COUNT = 437;

export const DEFAULT_HIDDEN_BRAIN_CATEGORIES = [
  'cranial_nerves',
  'arteries',
  'veins_sinuses',
] as const;

export const BRAIN_ASSET = {
  url: '/models/brain/brain.glb',
  byteLength: 4_650_816,
  sha256: '76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453',
  decoderPath: '/vendor/draco/',
} as const;

export type BrainSide = 'left' | 'right' | 'median';

export type BrainManifestNode = {
  id: number;
  name: string;
  label: string;
  category: string;
  side: BrainSide;
  region: string;
  core: boolean;
  ta2: string[];
  source: string;
};

export type BrainCategory = {
  label: string;
  count: number;
};

export type BrainManifest = {
  nodes: BrainManifestNode[];
  categories: Record<string, BrainCategory>;
};

export type BrainObjectLike = {
  parent?: BrainObjectLike | null;
  userData?: Record<string, unknown>;
};

export type BrainVisualState = {
  selectedId: number | null;
  hiddenCategories: ReadonlySet<string>;
  fadeOthers: boolean;
  isolateSelected: boolean;
  cortexOpacity: number;
};

export type BrainAppearance = {
  visible: boolean;
  opacity: number;
  highlighted: boolean;
};

const BX_ID_KEYS = ['bx_id', 'bxId'] as const;

/** GLB extras live on either a mesh or one of its parent groups. */
export function findBrainMetadataOwner(
  object: BrainObjectLike | null | undefined,
): BrainObjectLike | null {
  let current = object ?? null;
  while (current) {
    if (
      BX_ID_KEYS.some((key) => {
        const value = current?.userData?.[key];
        return (
          value !== null &&
          value !== undefined &&
          Number.isInteger(Number(value))
        );
      })
    ) {
      return current;
    }
    current = current.parent ?? null;
  }
  return null;
}

export function getBrainStructureId(
  object: BrainObjectLike | null | undefined,
): number | null {
  const owner = findBrainMetadataOwner(object);
  if (!owner) return null;
  for (const key of BX_ID_KEYS) {
    const value = owner.userData?.[key];
    const id = Number(value);
    if (Number.isInteger(id)) return id;
  }
  return null;
}

export function indexBrainManifest(manifest: BrainManifest) {
  return new Map(manifest.nodes.map((node) => [node.id, node]));
}

export function validateBrainManifest(manifest: BrainManifest): string[] {
  const errors: string[] = [];
  const ids = new Set(manifest.nodes.map((node) => node.id));
  if (manifest.nodes.length !== BRAIN_STRUCTURE_COUNT) {
    errors.push(
      `Expected ${BRAIN_STRUCTURE_COUNT} structures, received ${manifest.nodes.length}.`,
    );
  }
  for (let id = 0; id < BRAIN_STRUCTURE_COUNT; id += 1) {
    if (!ids.has(id)) errors.push(`Missing structure id ${id}.`);
  }
  if (ids.size !== manifest.nodes.length) {
    errors.push('Structure ids are not unique.');
  }
  for (const [category, expected] of Object.entries(manifest.categories)) {
    const actual = manifest.nodes.filter(
      (node) => node.category === category,
    ).length;
    if (actual !== expected.count) {
      errors.push(
        `Category ${category} declares ${expected.count} structures, received ${actual}.`,
      );
    }
  }
  return errors;
}

export function getBrainAppearance(
  node: Pick<BrainManifestNode, 'id' | 'category'>,
  state: BrainVisualState,
): BrainAppearance {
  if (state.hiddenCategories.has(node.category)) {
    return { visible: false, opacity: 0, highlighted: false };
  }
  const highlighted = state.selectedId === node.id;
  if (state.isolateSelected && state.selectedId !== null && !highlighted) {
    return { visible: false, opacity: 0, highlighted: false };
  }
  let opacity = node.category === 'cortex' ? state.cortexOpacity : 1;
  if (highlighted && (state.fadeOthers || state.isolateSelected)) opacity = 1;
  if (state.fadeOthers && state.selectedId !== null && !highlighted) {
    opacity = Math.min(opacity, 0.12);
  }
  return { visible: opacity > 0.05, opacity, highlighted };
}

export function filterBrainNodes(
  nodes: readonly BrainManifestNode[],
  query: string,
  category: string | null,
): BrainManifestNode[] {
  const normalized = query.trim().toLocaleLowerCase();
  return nodes.filter(
    (node) =>
      (!category || node.category === category) &&
      (!normalized ||
        [node.label, node.name, node.region, node.side, String(node.id)].some(
          (value) => value.toLocaleLowerCase().includes(normalized),
        )),
  );
}
