import { describe, expect, it } from 'vitest';
import manifestJson from '@/data/brain/manifest.json';
import {
  BRAIN_STRUCTURE_COUNT,
  createInitialBrainVisualState,
  DEFAULT_HIDDEN_BRAIN_CATEGORIES,
  filterBrainNodes,
  findBrainMetadataOwner,
  getBrainAppearance,
  getBrainExplodePhases,
  getBrainStructureId,
  reduceBrainVisualState,
  resolveBrainExplodeOffset,
  validateBrainManifest,
  type BrainManifest,
  type BrainVisualAction,
  type BrainVisualState,
} from '@/lib/brain-atlas';
import {
  BRAIN_CATEGORY_NAMES_ZH,
  BRAIN_HIERARCHY_NAMES_ZH,
  BRAIN_HIERARCHY_TECHNICAL_NODES,
  BRAIN_SIDE_NAMES_ZH,
  brainTerminologyReview,
  getBrainRegionNameZh,
  localizeBrainHierarchy,
  resolveBrainStructureTerm,
} from '@/lib/brain-terminology';
import { getStructureTerm } from '@/lib/anatomy-terminology';

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

  it('hides a hidden-category structure even when selected (appearance layer; the state reducer makes this state unreachable)', () => {
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

  it('finds the same verified structure by Chinese, English and atlas identifier', () => {
    expect(
      filterBrainNodes(manifest.nodes, '舌回', null).map((node) => node.id),
    ).toEqual([175, 176]);
    expect(
      filterBrainNodes(manifest.nodes, 'Lingual gyrus', null).map(
        (node) => node.id,
      ),
    ).toEqual([175, 176]);
    expect(
      filterBrainNodes(manifest.nodes, 'Lingual gyrus.l', null).map(
        (node) => node.id,
      ),
    ).toEqual([175]);
    expect(
      filterBrainNodes(manifest.nodes, '175', null).map((node) => node.id),
    ).toEqual([175]);
  });

  it('finds needs-review structures by Chinese candidate without losing English search', () => {
    expect(
      filterBrainNodes(manifest.nodes, '后横侧副沟', null).map(
        (node) => node.id,
      ),
    ).toEqual([0, 1]);
    expect(
      filterBrainNodes(
        manifest.nodes,
        'Posterior transverse collateral sulcus',
        null,
      ).map((node) => node.id),
    ).toEqual([0, 1]);
    expect(
      filterBrainNodes(manifest.nodes, '腺垂体', null).map((node) => node.id),
    ).toEqual([10]);
    expect(
      filterBrainNodes(manifest.nodes, '皮质延髓束', null).map(
        (node) => node.id,
      ),
    ).toEqual([75, 76]);
    expect(
      filterBrainNodes(manifest.nodes, 'Corticobulbar tract', null).map(
        (node) => node.id,
      ),
    ).toEqual([75, 76]);
  });

  it('searches by English category key and Chinese category name', () => {
    expect(filterBrainNodes(manifest.nodes, 'ventricles', null)).toHaveLength(
      7,
    );
    expect(filterBrainNodes(manifest.nodes, '脑室系统', null)).toHaveLength(7);
  });
});

describe('Brain zh-CN terminology contract', () => {
  it('localizes all 12 categories without changing their English manifest labels', () => {
    expect(BRAIN_CATEGORY_NAMES_ZH).toEqual({
      cortex: '大脑皮质——脑回、脑沟与脑叶',
      cranial_nerves: '脑神经（I–XII）',
      brainstem: '脑干',
      tracts: '白质纤维束（传导通路）',
      diencephalon: '间脑（丘脑、下丘脑）',
      arteries: '动脉（Willis 环）',
      white_matter: '白质与连合纤维',
      veins_sinuses: '硬脑膜静脉窦与静脉',
      cerebellum: '小脑',
      deep_grey: '深部灰质 / 基底神经节',
      ventricles: '脑室系统',
      meninges_dura: '脑膜与硬脑膜（大脑镰、小脑幕）',
    });
    expect(Object.keys(BRAIN_CATEGORY_NAMES_ZH)).toEqual(
      Object.keys(manifest.categories),
    );
    expect(manifest.categories.cortex.label).toBe(
      'Cortex – gyri, sulci & lobes',
    );
  });

  it('localizes every supported side deterministically', () => {
    expect(BRAIN_SIDE_NAMES_ZH).toEqual({
      left: '左侧',
      right: '右侧',
      median: '正中',
    });
    expect(
      new Set(
        manifest.nodes.map(
          (node) => resolveBrainStructureTerm(node).sideChinese,
        ),
      ),
    ).toEqual(new Set(['左侧', '右侧', '正中']));
  });

  it('covers 237 unique labels and all 437 occurrences in the review list', () => {
    expect(brainTerminologyReview).toHaveLength(237);
    expect(
      brainTerminologyReview.reduce(
        (total, entry) => total + entry.occurrences,
        0,
      ),
    ).toBe(BRAIN_STRUCTURE_COUNT);
    expect(
      Object.fromEntries(
        ['verified', 'needs_review', 'unavailable'].map((status) => [
          status,
          brainTerminologyReview.filter((entry) => entry.status === status)
            .length,
        ]),
      ),
    ).toEqual({ verified: 5, needs_review: 232, unavailable: 0 });
    expect(
      brainTerminologyReview
        .flatMap((entry) => entry.atlasIds)
        .sort((a, b) => a - b),
    ).toEqual(Array.from({ length: BRAIN_STRUCTURE_COUNT }, (_, id) => id));
    for (const entry of brainTerminologyReview) {
      expect(
        entry.atlasIds.every(
          (id) => byId.get(id)?.label === entry.englishLabel,
        ),
      ).toBe(true);
    }
  });

  it('inherits existing verified terms without upgrading generated candidates', () => {
    for (const entry of brainTerminologyReview) {
      const inherited = getStructureTerm({
        id: `brain:${entry.atlasIds[0]}`,
        name: entry.englishLabel,
      });
      if (entry.status === 'verified') {
        expect(inherited.translationStatus).toBe('verified');
        expect(entry.candidateChinese).toBe(inherited.zh);
      } else {
        expect(inherited.translationStatus).not.toBe('verified');
      }
    }
  });

  it('uses verified and needs-review Chinese as the primary label', () => {
    expect(resolveBrainStructureTerm(byId.get(175)!)).toMatchObject({
      primaryLabel: '舌回',
      chineseLabel: '舌回',
      englishLabel: 'Lingual gyrus',
      status: 'verified',
    });
    expect(resolveBrainStructureTerm(byId.get(10)!)).toMatchObject({
      primaryLabel: '腺垂体',
      chineseLabel: '腺垂体',
      candidateChinese: '腺垂体',
      status: 'needs_review',
    });
    expect(resolveBrainStructureTerm(byId.get(2)!)).toMatchObject({
      primaryLabel: '外展神经（VI）',
      chineseLabel: '外展神经（VI）',
      candidateChinese: '外展神经（VI）',
      status: 'needs_review',
    });
  });

  it('gives all 437 structures a Chinese primary label and preserves English', () => {
    for (const node of manifest.nodes) {
      const term = resolveBrainStructureTerm(node);
      expect(term.primaryLabel).not.toBe(node.label);
      expect(term.englishLabel).toBe(node.label);
      expect(term.chineseLabel).toBeTruthy();
    }
  });

  it('uses an explicit placeholder for an unknown label without inventing a term', () => {
    expect(
      resolveBrainStructureTerm({
        id: 999,
        label: 'Unknown atlas label',
        category: 'brainstem',
        side: 'median',
      }),
    ).toMatchObject({
      primaryLabel: '中文名称待整理',
      chineseLabel: '中文名称待整理',
      englishLabel: 'Unknown atlas label',
      candidateChinese: null,
      status: 'unavailable',
    });
  });

  it('localizes hierarchy display while preserving raw manifest metadata', () => {
    const stria = byId.get(338)!;
    expect(stria.ta2).toEqual([
      'Bonus collection',
      'Brain',
      'Central nervous system',
      'Cerebrum',
      'Diencephalon',
      'Head',
      'Main divisions',
      'Nervous system',
      'Regions of human body',
      'Scene Collection',
      'White matter of diencephalon',
    ]);
    expect(localizeBrainHierarchy(stria.ta2)).toEqual([
      '脑',
      '中枢神经系统',
      '大脑',
      '间脑',
      '头部',
      '主要分区',
      '神经系统',
      '人体区域',
      '间脑白质',
    ]);
    expect(getBrainRegionNameZh(stria.region)).toBe('间脑');
  });

  it('centralizes known hierarchy names and filters only scene metadata', () => {
    expect(BRAIN_HIERARCHY_NAMES_ZH).toMatchObject({
      Brain: '脑',
      'Central nervous system': '中枢神经系统',
      Cerebrum: '大脑',
      Diencephalon: '间脑',
      'Nervous system': '神经系统',
      'White matter of diencephalon': '间脑白质',
      Head: '头部',
      'Main divisions': '主要分区',
      'Regions of human body': '人体区域',
    });
    expect([...BRAIN_HIERARCHY_TECHNICAL_NODES]).toEqual([
      'Bonus collection',
      'Scene Collection',
    ]);
    expect(localizeBrainHierarchy(['Unknown anatomical parent'])).toEqual([
      'Unknown anatomical parent',
    ]);
  });

  it('keeps the corrected thalamic stria candidate in needs-review state', () => {
    expect(
      brainTerminologyReview.find(
        (entry) => entry.englishLabel === 'Stria medullaris thalami',
      ),
    ).toMatchObject({
      candidateChinese: '丘脑髓纹',
      status: 'needs_review',
    });
    expect(resolveBrainStructureTerm(byId.get(338)!)).toMatchObject({
      primaryLabel: '丘脑髓纹',
      englishLabel: 'Stria medullaris thalami',
      status: 'needs_review',
    });
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

describe('Brain interaction state reducer contract (BIO-015 pre-merge fixes)', () => {
  const reduce = (state: BrainVisualState, action: BrainVisualAction) =>
    reduceBrainVisualState(state, action, byId);
  const countVisible = (state: BrainVisualState) =>
    manifest.nodes.filter((node) => getBrainAppearance(node, state).visible)
      .length;
  const cortex = byId.get(284)!;
  const caudate = byId.get(49)!;

  it('A: selecting a structure of a hidden category auto-shows that category', () => {
    const hiddenNode = manifest.nodes.find((node) =>
      (DEFAULT_HIDDEN_BRAIN_CATEGORIES as readonly string[]).includes(
        node.category,
      ),
    )!;
    const state = createInitialBrainVisualState();
    expect(state.hiddenCategories.has(hiddenNode.category)).toBe(true);
    const next = reduce(state, { type: 'select', id: hiddenNode.id });
    expect(next.selectedId).toBe(hiddenNode.id);
    expect(next.hiddenCategories.has(hiddenNode.category)).toBe(false);
    expect(getBrainAppearance(hiddenNode, next).visible).toBe(true);
  });

  it('B: hiding the selected structure category clears selection, isolate and fade', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: cortex.id,
    });
    state = reduce(state, { type: 'toggle-isolate' });
    state = reduce(state, { type: 'toggle-fade' });
    expect(state.selectedId).toBe(cortex.id);
    expect(state.isolateSelected).toBe(false);
    expect(state.fadeOthers).toBe(true);
    state = reduce(state, {
      type: 'toggle-category',
      category: cortex.category,
    });
    expect(state.selectedId).toBeNull();
    expect(state.isolateSelected).toBe(false);
    expect(state.fadeOthers).toBe(false);
    expect(state.hiddenCategories.has(cortex.category)).toBe(true);
  });

  it('B2: same clear rule applies with isolate still active', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: caudate.id,
    });
    state = reduce(state, { type: 'toggle-isolate' });
    expect(state.isolateSelected).toBe(true);
    state = reduce(state, {
      type: 'toggle-category',
      category: caudate.category,
    });
    expect(state.selectedId).toBeNull();
    expect(state.isolateSelected).toBe(false);
    expect(state.fadeOthers).toBe(false);
    expect(countVisible(state)).toBeGreaterThan(0);
  });

  it('C: pre-fix repro never reaches an empty scene under isolate', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: cortex.id,
    });
    state = reduce(state, {
      type: 'toggle-category',
      category: cortex.category,
    });
    state = reduce(state, { type: 'toggle-isolate' });
    expect(state.selectedId).toBeNull();
    expect(state.isolateSelected).toBe(false);
    expect(countVisible(state)).toBeGreaterThan(0);
  });

  it('C2: adversarial hidden-selected + isolate is normalized on mode toggle', () => {
    const adversarial: BrainVisualState = {
      selectedId: cortex.id,
      hiddenCategories: new Set([cortex.category]),
      fadeOthers: false,
      isolateSelected: true,
      cortexOpacity: 0.38,
    };
    const off = reduce(adversarial, { type: 'toggle-isolate' });
    expect(off.isolateSelected).toBe(false);
    const on = reduce(off, { type: 'toggle-isolate' });
    expect(on.isolateSelected).toBe(true);
    expect(on.hiddenCategories.has(cortex.category)).toBe(false);
    expect(getBrainAppearance(cortex, on).visible).toBe(true);
    expect(countVisible(on)).toBe(1);
  });

  it('D: hidden selected structure cannot contradict fade', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: cortex.id,
    });
    state = reduce(state, {
      type: 'toggle-category',
      category: cortex.category,
    });
    state = reduce(state, { type: 'toggle-fade' });
    expect(state.selectedId).toBeNull();
    expect(state.fadeOthers).toBe(false);
    const adversarial: BrainVisualState = {
      selectedId: caudate.id,
      hiddenCategories: new Set([caudate.category]),
      fadeOthers: false,
      isolateSelected: false,
      cortexOpacity: 0.38,
    };
    const faded = reduce(adversarial, { type: 'toggle-fade' });
    expect(faded.selectedId).toBe(caudate.id);
    expect(faded.fadeOthers).toBe(true);
    expect(faded.hiddenCategories.has(caudate.category)).toBe(false);
    expect(getBrainAppearance(caudate, faded).visible).toBe(true);
    expect(countVisible(faded)).toBeGreaterThan(0);
  });

  it('A: select → fade → select(null) clears selection and disarms fade', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: cortex.id,
    });
    state = reduce(state, { type: 'toggle-fade' });
    expect(state.fadeOthers).toBe(true);
    const hiddenBefore = new Set(state.hiddenCategories);
    const opacityBefore = state.cortexOpacity;
    state = reduce(state, { type: 'select', id: null });
    expect(state.selectedId).toBeNull();
    expect(state.fadeOthers).toBe(false);
    expect(state.isolateSelected).toBe(false);
    expect(state.hiddenCategories).toEqual(hiddenBefore);
    expect(state.cortexOpacity).toBe(opacityBefore);
  });

  it('B: select → isolate → select(null) clears selection and disarms isolate', () => {
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: cortex.id,
    });
    state = reduce(state, { type: 'toggle-isolate' });
    expect(state.isolateSelected).toBe(true);
    const hiddenBefore = new Set(state.hiddenCategories);
    state = reduce(state, { type: 'select', id: null });
    expect(state.selectedId).toBeNull();
    expect(state.isolateSelected).toBe(false);
    expect(state.fadeOthers).toBe(false);
    expect(state.hiddenCategories).toEqual(hiddenBefore);
  });

  it('E: property — isolateSelected ⇒ selected visible, scene keeps exactly it, for all 437 structures', () => {
    for (const node of manifest.nodes) {
      let state = reduce(createInitialBrainVisualState(), {
        type: 'select',
        id: node.id,
      });
      expect(state.selectedId).toBe(node.id);
      expect(state.hiddenCategories.has(node.category)).toBe(false);
      state = reduce(state, { type: 'toggle-isolate' });
      expect(state.isolateSelected).toBe(true);
      expect(getBrainAppearance(node, state).visible).toBe(true);
      expect(countVisible(state)).toBe(1);
    }
  });

  it('E2: deterministic walk keeps I1-I3 after every action (incl. select(null))', () => {
    const categories = Object.keys(manifest.categories);
    let state = createInitialBrainVisualState();
    let selectNullCount = 0;
    for (let i = 0; i < 400; i += 1) {
      const pick = i % 4;
      const action: BrainVisualAction =
        pick === 0
          ? {
              // pick === 0 forces i % 4 === 0, so i % 8 can only be 0 or 4.
              // The old residue 7 was therefore unreachable and select(null)
              // never ran here. Residue 4 clears the selection on i ≡ 4
              // (mod 8) — a real select(null) on 50 of the 400 steps, tracked
              // by selectNullCount below so this hole cannot silently return.
              type: 'select',
              id: i % 8 === 4 ? null : (i * 37) % BRAIN_STRUCTURE_COUNT,
            }
          : pick === 1
            ? {
                type: 'toggle-category',
                category: categories[i % categories.length],
              }
            : pick === 2
              ? { type: 'toggle-isolate' }
              : { type: 'toggle-fade' };
      state = reduce(state, action);
      if (action.type === 'select' && action.id === null) {
        selectNullCount += 1;
        // Every executed clear-selection must disarm both modes (I2), which
        // also proves the branch was not just reached but exercised.
        expect(state.selectedId).toBeNull();
        expect(state.fadeOthers).toBe(false);
        expect(state.isolateSelected).toBe(false);
      }
      if (state.selectedId !== null) {
        const selectedNode = byId.get(state.selectedId)!;
        expect(state.hiddenCategories.has(selectedNode.category)).toBe(false);
        expect(getBrainAppearance(selectedNode, state).visible).toBe(true);
        expect(countVisible(state)).toBeGreaterThan(0);
      }
      // C: any armed mode requires a live, visible selection (I2).
      if (state.fadeOthers || state.isolateSelected) {
        expect(state.selectedId).not.toBeNull();
        const selectedNode = byId.get(state.selectedId!)!;
        expect(state.hiddenCategories.has(selectedNode.category)).toBe(false);
        expect(getBrainAppearance(selectedNode, state).visible).toBe(true);
      }
      if (state.isolateSelected) {
        const selectedNode = byId.get(state.selectedId!)!;
        expect(getBrainAppearance(selectedNode, state).visible).toBe(true);
        expect(countVisible(state)).toBe(1);
      }
    }
    // Coverage guard: the walk must have genuinely dispatched select(null)
    // (i ≡ 4 (mod 8) ⇒ exactly 50 of the 400 steps), not merely claim it.
    expect(selectNullCount).toBeGreaterThan(0);
  });

  it('clamps cortex opacity into the pickable range and reset restores defaults', () => {
    expect(
      reduce(createInitialBrainVisualState(), {
        type: 'set-cortex-opacity',
        value: 0,
      }).cortexOpacity,
    ).toBe(0.1);
    expect(
      reduce(createInitialBrainVisualState(), {
        type: 'set-cortex-opacity',
        value: 2,
      }).cortexOpacity,
    ).toBe(1);
    let state = reduce(createInitialBrainVisualState(), {
      type: 'select',
      id: caudate.id,
    });
    state = reduce(state, { type: 'toggle-isolate' });
    state = reduce(state, { type: 'set-cortex-opacity', value: 0.9 });
    expect(reduce(state, { type: 'reset' })).toEqual(
      createInitialBrainVisualState(),
    );
  });
});
