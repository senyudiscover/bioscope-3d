import type { VanatomeStructure } from '@vixotic/vanatome-react';
import {
  anatomyTerminology,
  getStructureTerm,
  getSystemTerm,
  normalizeAnatomyName,
  parseModelSide,
} from '@/lib/anatomy-terminology';
import { systemFilterOptions } from '@/lib/anatomy-filters';

/**
 * Terminology 语料 QA（Deep Assurance #002 · Track E，只读）。
 *
 * lib/anatomy-terminology.ts 是术语事实源（D-005）。本审计只测量，不修
 * 词典——生物学术语正确性属 BIOLOGY REVIEW，算法行为只固化进测试。
 *
 * 检查维度：
 *   1. systems 覆盖 —— anatomy-filters 的每个系统筛选 id 都必须有中文术语
 *      （FilterControl 直接渲染 getSystemTerm(id)）。
 *   2. 死键 —— nameOverrides 的键只有与 normalizeAnatomyName(key) 完全一致
 *      时才可能命中（查找方先 normalize 输入再查表）。任何"非规范化键"是
 *      永远打不中的死数据。
 *   3. 同名 zh 碰撞 —— 不同 id / 不同 override 键 / 跨表产出同一个中文标签。
 *      可能是故意的单复数归并，也可能是语义不同的结构撞名 → 人工复核清单。
 *   4. 行为语料 —— 一批真实风格的解剖名过 getStructureTerm，按
 *      verified / unverified / unavailable 分类输出，供 TERMINOLOGY-QA 文档
 *      做生物学复核（unavailable = UI 显示"未识别结构"）。
 *
 * 执行：vitest run tests/terminology-qa.test.ts
 */

export type TerminologyQaReport = {
  systemTermGaps: Array<{ id: string; zh: string | null }>;
  deadOverrideKeys: string[];
  duplicateStructureZh: Array<{ zh: string; ids: string[] }>;
  duplicateOverrideZh: Array<{ zh: string; keys: string[] }>;
  crossTableZhCollisions: Array<{ zh: string; ids: string[]; keys: string[] }>;
  levelHistogram: Record<string, number>;
  corpus: Array<{ name: string; zh: string | null; status: string }>;
  sideParsingSamples: Array<{ input: string; cleanEnglish: string; sideZh: string | null }>;
};

const PROBE_CORPUS = [
  // 呼吸
  'Trachea', 'Bronchus', 'Bronchiole', 'Alveolar sac', 'Pleura', 'Larynx', 'Pharynx',
  // 心血管
  'Atrium', 'Ventricle', 'Aortic valve', 'Mitral valve', 'Coronary sinus',
  'Superior vena cava', 'Femoral artery', 'Subclavian vein', 'Sinus node',
  'Atrioventricular node', 'Bundle of His', 'Purkinje fiber', 'Pericardium',
  // 消化 / 代谢
  'Esophagus', 'Duodenum', 'Ileum', 'Cecum', 'Appendix', 'Spleen', 'Pancreas',
  'Gallbladder', 'Rectum', 'Peritoneum', 'Omentum',
  // 神经
  'Thalamus', 'Hypothalamus', 'Pituitary gland', 'Vagus nerve', 'Sciatic nerve',
  'Brachial plexus', 'Cauda equina', 'Dura mater', 'Synapse',
  // 肌骨
  'Gastrocnemius', 'Soleus', 'Biceps brachii', 'Triceps brachii', 'Gluteus medius',
  'Sternocleidomastoid', 'Trapezius', 'Latissimus dorsi', 'Meniscus',
  'Intervertebral disc', 'Symphysis pubis', 'Xiphoid process', 'Malleolus',
  // 泌尿生殖 / 内分泌
  'Glomerulus', 'Ureter', 'Urethra', 'Bladder', 'Adrenal gland', 'Thyroid gland',
  'Islets of Langerhans', 'Prostate', 'Uterus', 'Ovary', 'Testis',
  // 侧别/复合形态
  'Femur .l', 'Femur . L.', 'Femur (Left Side)', 'left Femur (right)',
  'Left Atrium.l', 'Femur left-side', 'Femur medial',
];

const probe = (name: string) =>
  getStructureTerm({ id: `__probe__-${name.replace(/[^a-z0-9]+/gi, '-')}`, name });

export function auditTerminologyQa(): TerminologyQaReport {
  const { systems, structures, nameOverrides } = anatomyTerminology;

  // 1. systems 覆盖（UI 一致性）
  const systemTermGaps = systemFilterOptions
    .filter((option) => option.id !== 'all')
    .map((option) => ({ id: option.id, zh: systems[option.id]?.zh ?? getSystemTerm(option.id).zh }))
    .filter((item) => !item.zh);

  // 2. 死键：normalizeAnatomyName(key) !== key 的 override 键永远无法命中。
  const deadOverrideKeys = Object.keys(nameOverrides).filter(
    (key) => normalizeAnatomyName(key) !== key,
  );

  // 3. 同名 zh 碰撞分组
  const byStructureZh = new Map<string, string[]>();
  for (const [id, term] of Object.entries(structures)) {
    if (!term.zh) continue;
    byStructureZh.set(term.zh, [...(byStructureZh.get(term.zh) ?? []), id]);
  }
  const duplicateStructureZh = [...byStructureZh.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([zh, ids]) => ({ zh, ids: ids.sort() }))
    .sort((a, b) => a.zh.localeCompare(b.zh, 'zh'));

  const byOverrideZh = new Map<string, string[]>();
  for (const [key, zh] of Object.entries(nameOverrides)) {
    byOverrideZh.set(zh, [...(byOverrideZh.get(zh) ?? []), key]);
  }
  const duplicateOverrideZh = [...byOverrideZh.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([zh, keys]) => ({ zh, keys: keys.sort() }))
    .sort((a, b) => a.zh.localeCompare(b.zh, 'zh'));

  const crossTableZhCollisions: TerminologyQaReport['crossTableZhCollisions'] = [];
  for (const [zh, ids] of byStructureZh.entries()) {
    const keys = byOverrideZh.get(zh);
    if (keys) crossTableZhCollisions.push({ zh, ids, keys });
  }
  crossTableZhCollisions.sort((a, b) => a.zh.localeCompare(b.zh, 'zh'));

  // level 分布
  const levelHistogram: Record<string, number> = {};
  for (const term of Object.values(structures)) {
    const level = term.level ?? '(none)';
    levelHistogram[level] = (levelHistogram[level] ?? 0) + 1;
  }

  // 4. 行为语料
  const corpus = PROBE_CORPUS.map((name) => {
    const term = probe(name);
    return { name, zh: term.zh, status: term.translationStatus ?? '(none)' };
  });

  const sideParsingSamples = [
    'Femur .l', 'Femur . L.', 'Femur (Left Side)', 'left Femur (right)',
    'Left Atrium.l', 'Femur left-side', 'Femur medial',
  ].map((input) => {
    const parsed = parseModelSide(input);
    return { input, cleanEnglish: parsed.cleanEnglish, sideZh: parsed.sideZh };
  });

  return {
    systemTermGaps,
    deadOverrideKeys,
    duplicateStructureZh,
    duplicateOverrideZh,
    crossTableZhCollisions,
    levelHistogram,
    corpus,
    sideParsingSamples,
  };
}

/** 确定性文本输出（供 TERMINOLOGY-QA-v1.md 引用）。 */
export function formatTerminologyQa(report: TerminologyQaReport): string {
  const lines: string[] = [];
  lines.push(`system term gaps (${report.systemTermGaps.length}): ${report.systemTermGaps.map((item) => item.id).join(', ') || '(none)'}`);
  lines.push(`dead override keys (${report.deadOverrideKeys.length}): ${report.deadOverrideKeys.join(', ') || '(none)'}`);
  lines.push(`duplicate structure zh (${report.duplicateStructureZh.length}):`);
  for (const item of report.duplicateStructureZh) {
    lines.push(`  "${item.zh}" <- ids: ${item.ids.join(', ')}`);
  }
  lines.push(`duplicate override zh (${report.duplicateOverrideZh.length}):`);
  for (const item of report.duplicateOverrideZh) {
    lines.push(`  "${item.zh}" <- keys: ${item.keys.join(', ')}`);
  }
  lines.push(`cross-table zh collisions (${report.crossTableZhCollisions.length}):`);
  for (const item of report.crossTableZhCollisions) {
    lines.push(`  "${item.zh}" <- ids: ${item.ids.join(', ')} | keys: ${item.keys.join(', ')}`);
  }
  lines.push(`verified level histogram: ${Object.entries(report.levelHistogram).map(([level, count]) => `${level}=${count}`).join(', ')}`);
  lines.push(`corpus (${report.corpus.length}):`);
  for (const item of report.corpus) {
    lines.push(`  [${item.status}] ${item.name} -> ${item.zh ?? '(null)'}`);
  }
  lines.push('side parsing samples:');
  for (const item of report.sideParsingSamples) {
    lines.push(`  ${JSON.stringify(item.input)} -> clean=${JSON.stringify(item.cleanEnglish)} side=${item.sideZh}`);
  }
  return lines.join('\n');
}

/** 语料 probe 的结构对象（导出仅为类型完整）。 */
export type ProbeStructure = Pick<VanatomeStructure, 'id' | 'name'>;
