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

export type BrainExplodeOffset = {
  category: readonly [number, number, number];
  structure: readonly [number, number, number];
};

export const BRAIN_CATEGORY_PALETTE: Readonly<Record<string, string>> = {
  cortex: '#d99a86',
  cranial_nerves: '#f3c96b',
  brainstem: '#c47b67',
  tracts: '#79b9c5',
  diencephalon: '#aa82bd',
  arteries: '#d75d58',
  white_matter: '#d5cab9',
  veins_sinuses: '#657eb6',
  cerebellum: '#b98670',
  deep_grey: '#9c78a9',
  ventricles: '#5fb9ca',
  meninges_dura: '#d8aa72',
};

/**
 * Anatomical fallback directions are used only when a category centroid is too
 * close to the whole-brain centroid to supply a stable radial direction.
 */
export const BRAIN_CATEGORY_DIRECTIONS: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  cortex: [0, 0.25, 1],
  cranial_nerves: [0, -0.9, 0.45],
  brainstem: [0, -1, -0.15],
  tracts: [0, -0.15, 1],
  diencephalon: [0, 0.15, 0.65],
  arteries: [0, -0.35, 0.85],
  white_matter: [0, 0.4, -0.9],
  veins_sinuses: [0, 0.85, -0.35],
  cerebellum: [0, -0.7, -0.75],
  deep_grey: [0, 0.2, -0.65],
  ventricles: [0, 0.9, 0],
  meninges_dura: [0, 1, 0.2],
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

function smoothstep(edge0: number, edge1: number, value: number): number {
  const normalized = Math.min(
    1,
    Math.max(0, (value - edge0) / (edge1 - edge0)),
  );
  return normalized * normalized * (3 - 2 * normalized);
}

/** Category separation leads; structure separation starts after roughly 1/3. */
export function getBrainExplodePhases(progress: number) {
  const normalized = Math.min(1, Math.max(0, progress / 100));
  return {
    category: smoothstep(0, 0.58, normalized),
    structure: smoothstep(0.32, 1, normalized),
  };
}

export function resolveBrainExplodeOffset(
  offset: BrainExplodeOffset,
  progress: number,
): [number, number, number] {
  const phases = getBrainExplodePhases(progress);
  return [0, 1, 2].map(
    (axis) =>
      offset.category[axis] * phases.category +
      offset.structure[axis] * phases.structure,
  ) as [number, number, number];
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
