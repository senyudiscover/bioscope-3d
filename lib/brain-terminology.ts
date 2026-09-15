import reviewJson from '@/data/brain/terminology-review.json';

export type BrainTerminologyStatus =
  | 'verified'
  | 'needs_review'
  | 'unavailable';

export type BrainTerminologyReviewEntry = {
  englishLabel: string;
  candidateChinese: string | null;
  status: BrainTerminologyStatus;
  source: string | null;
  note: string;
  occurrences: number;
  atlasIds: number[];
};

type BrainTermInput = {
  id: number;
  label: string;
  category: string;
  side: 'left' | 'right' | 'median';
};

export const BRAIN_CATEGORY_NAMES_ZH = {
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
} as const;

export const BRAIN_SIDE_NAMES_ZH = {
  left: '左侧',
  right: '右侧',
  median: '正中',
} as const;

export const BRAIN_HIERARCHY_NAMES_ZH: Readonly<Record<string, string>> = {
  Brain: '脑',
  Brainstem: '脑干',
  'Central nervous system': '中枢神经系统',
  Cerebellum: '小脑',
  Cerebrum: '大脑',
  Diencephalon: '间脑',
  'Frontal lobe': '额叶',
  Head: '头部',
  Insula: '岛叶',
  'Left cerebral hemisphere': '左侧大脑半球',
  'Limbic lobe': '边缘叶',
  'Main divisions': '主要分区',
  Mesencephalon: '中脑',
  'Nervous system': '神经系统',
  'Occipital lobe': '枕叶',
  'Parietal lobe': '顶叶',
  'Regions of human body': '人体区域',
  'Right cerebral hemisphere': '右侧大脑半球',
  Telencephalon: '端脑',
  'Temporal lobe': '颞叶',
  'White matter of diencephalon': '间脑白质',
} as const;

export const BRAIN_HIERARCHY_TECHNICAL_NODES = new Set([
  'Bonus collection',
  'Scene Collection',
]);

export const brainTerminologyReview =
  reviewJson as BrainTerminologyReviewEntry[];

const reviewByEnglishLabel = new Map(
  brainTerminologyReview.map((entry) => [entry.englishLabel, entry]),
);

export function getBrainCategoryNameZh(category: string): string | null {
  return (
    BRAIN_CATEGORY_NAMES_ZH[category as keyof typeof BRAIN_CATEGORY_NAMES_ZH] ??
    null
  );
}

export function getBrainSideNameZh(side: BrainTermInput['side']): string {
  return BRAIN_SIDE_NAMES_ZH[side];
}

export function getBrainRegionNameZh(region: string): string {
  return (
    BRAIN_HIERARCHY_NAMES_ZH[region] ?? getBrainCategoryNameZh(region) ?? region
  );
}

export function localizeBrainHierarchy(hierarchy: readonly string[]): string[] {
  return hierarchy
    .filter((node) => !BRAIN_HIERARCHY_TECHNICAL_NODES.has(node))
    .map((node) => BRAIN_HIERARCHY_NAMES_ZH[node] ?? node);
}

export function resolveBrainStructureTerm(node: BrainTermInput) {
  const review = reviewByEnglishLabel.get(node.label);
  const status = review?.status ?? 'unavailable';
  const chineseLabel = review?.candidateChinese ?? '中文名称待整理';

  return {
    id: node.id,
    primaryLabel: chineseLabel ?? node.label,
    chineseLabel,
    englishLabel: node.label,
    candidateChinese: review?.candidateChinese ?? null,
    status,
    categoryKey: node.category,
    categoryChinese: getBrainCategoryNameZh(node.category) ?? node.category,
    side: node.side,
    sideChinese: getBrainSideNameZh(node.side),
  } as const;
}
