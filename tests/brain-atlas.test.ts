import { describe, expect, it } from 'vitest';
import manifestJson from '@/data/brain/manifest.json';
import {
  BRAIN_STRUCTURE_COUNT,
  DEFAULT_HIDDEN_BRAIN_CATEGORIES,
  filterBrainNodes,
  findBrainMetadataOwner,
  getBrainAppearance,
  getBrainExplodePhases,
  getBrainStructureId,
  resolveBrainExplodeOffset,
  validateBrainManifest,
  type BrainManifest,
  type BrainVisualState,
} from '@/lib/brain-atlas';

const manifest = manifestJson as BrainManifest;
const byId = new Map(manifest.nodes.map((node) => [node.id, node]));
const baseVisualState: BrainVisualState = {
  selectedId: null,
  hiddenCategories: new Set(),
  fadeOthers: false,
  isolateSelected: false,
  cortexOpacity: 0.38,
};

describe('Brain manifest deterministic contract', () => {
  it('passes the production manifest validator', () => {
    expect(validateBrainManifest(manifest)).toEqual([]);
  });

  it('maps exactly 437 unique, contiguous structure ids', () => {
    const ids = manifest.nodes.map((node) => node.id);
    expect(ids).toHaveLength(BRAIN_STRUCTURE_COUNT);
    expect(new Set(ids).size).toBe(BRAIN_STRUCTURE_COUNT);
    expect([...ids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: BRAIN_STRUCTURE_COUNT }, (_, id) => id),
    );
  });

  it('matches every declared classification count', () => {
    for (const [category, declaration] of Object.entries(manifest.categories)) {
      expect(
        manifest.nodes.filter((node) => node.category === category),
        category,
      ).toHaveLength(declaration.count);
    }
  });

  it('preserves the verified side distribution', () => {
    expect(
      Object.fromEntries(
        ['left', 'right', 'median'].map((side) => [
          side,
          manifest.nodes.filter((node) => node.side === side).length,
        ]),
      ),
    ).toEqual({ left: 202, right: 201, median: 34 });
  });

  it('starts only high-draw context layers hidden', () => {
    expect([...DEFAULT_HIDDEN_BRAIN_CATEGORIES]).toEqual([
      'cranial_nerves',
      'arteries',
      'veins_sinuses',
    ]);
    expect(
      DEFAULT_HIDDEN_BRAIN_CATEGORIES.every(
        (category) => manifest.categories[category]?.count > 0,
      ),
    ).toBe(true);
  });

  it('contains representative cortex, deep, tract, small and bilateral structures', () => {
    expect(byId.get(284)).toMatchObject({
      label: 'Precentral gyrus',
      side: 'left',
      category: 'cortex',
    });
    expect(byId.get(285)).toMatchObject({
      label: 'Precentral gyrus',
      side: 'right',
      category: 'cortex',
    });
    expect(byId.get(49)).toMatchObject({
      label: 'Caudate nucleus',
      side: 'left',
      category: 'deep_grey',
    });
    expect(byId.get(50)).toMatchObject({
      label: 'Caudate nucleus',
      side: 'right',
      category: 'deep_grey',
    });
    expect(byId.get(35)).toMatchObject({
      label: 'Arcuate fasciculus',
      category: 'tracts',
    });
    expect(byId.get(151)).toMatchObject({
      label: 'Interpeduncular fossa',
      category: 'brainstem',
    });
  });

  it('uses only the reviewed upstream source set and no NC/ND source', () => {
    const reviewedSources = new Set([
      'Z-Anatomy / BodyParts3D',
      'HCP1065 (Yeh 2022, CC BY-SA 4.0)',
      'Najdenovska 2018',
      'CIT168 amygdala (Tyszka 2016)',
      'CIT168 (Pauli 2018)',
      'Neudorfer 2020',
    ]);
    const sources = new Set(manifest.nodes.map((node) => node.source));
    expect(sources).toEqual(reviewedSources);
    expect([...sources].join(' ')).not.toMatch(/CC BY-(?:NC|ND)/i);
  });
});

describe('Brain GLB extras parent-chain mapping', () => {
  it('finds bx_id on a parent group for multi-primitive nodes', () => {
    const root = { userData: { bx_id: 284, bx_cat: 'cortex' }, parent: null };
    const group = { userData: {}, parent: root };
    const mesh = { userData: {}, parent: group };
    expect(findBrainMetadataOwner(mesh)).toBe(root);
    expect(getBrainStructureId(mesh)).toBe(284);
  });

  it('prefers the nearest metadata owner and rejects unmapped objects', () => {
    const root = { userData: { bx_id: 49 }, parent: null };
    const child = { userData: { bx_id: 50 }, parent: root };
    expect(getBrainStructureId(child)).toBe(50);
    expect(getBrainStructureId({ userData: {}, parent: null })).toBeNull();
  });
});

describe('Brain visibility interaction contract', () => {
  const cortex = byId.get(284)!;
  const caudate = byId.get(49)!;

  it('applies the cortex opacity without hiding a pickable cortex', () => {
    expect(getBrainAppearance(cortex, baseVisualState)).toEqual({
      visible: true,
      opacity: 0.38,
      highlighted: false,
    });
  });

  it('classification filtering takes precedence over selection', () => {
    expect(
      getBrainAppearance(cortex, {
        ...baseVisualState,
        selectedId: cortex.id,
        hiddenCategories: new Set(['cortex']),
      }),
    ).toEqual({ visible: false, opacity: 0, highlighted: false });
  });

  it('fade keeps the selection opaque and context pickable', () => {
    const state = {
      ...baseVisualState,
      selectedId: caudate.id,
      fadeOthers: true,
    };
    expect(getBrainAppearance(caudate, state)).toMatchObject({
      visible: true,
      opacity: 1,
      highlighted: true,
    });
    expect(getBrainAppearance(cortex, state)).toMatchObject({
      visible: true,
      opacity: 0.12,
    });
  });

  it('isolate removes every non-selected structure from visibility', () => {
    const state = {
      ...baseVisualState,
      selectedId: caudate.id,
      isolateSelected: true,
    };
    expect(getBrainAppearance(caudate, state).visible).toBe(true);
    expect(getBrainAppearance(cortex, state).visible).toBe(false);
  });
});

describe('Brain list filtering contract', () => {
  it('filters by hierarchy-facing classification and searchable metadata', () => {
    const results = filterBrainNodes(manifest.nodes, 'caudate', 'deep_grey');
    expect(results.map((node) => node.id)).toEqual([49, 50]);
    expect(filterBrainNodes(manifest.nodes, '285', null)[0]?.id).toBe(285);
  });
});

describe('Brain hierarchical explode contract', () => {
  const offset = {
    category: [10, 0, 0] as const,
    structure: [0, 4, 0] as const,
  };

  it('is assembled at zero and resolves the full cached offset at 100', () => {
    expect(resolveBrainExplodeOffset(offset, 0)).toEqual([0, 0, 0]);
    expect(resolveBrainExplodeOffset(offset, 100)).toEqual([10, 4, 0]);
  });

  it('separates categories before structures and clamps external input', () => {
    expect(getBrainExplodePhases(25).category).toBeGreaterThan(0);
    expect(getBrainExplodePhases(25).structure).toBe(0);
    expect(getBrainExplodePhases(-5)).toEqual({ category: 0, structure: 0 });
    expect(getBrainExplodePhases(120)).toEqual({ category: 1, structure: 1 });
  });

  it('is deterministic for the same cached plan and slider value', () => {
    expect(resolveBrainExplodeOffset(offset, 67)).toEqual(
      resolveBrainExplodeOffset(offset, 67),
    );
  });
});
