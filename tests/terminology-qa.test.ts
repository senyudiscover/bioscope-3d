import { describe, expect, it } from 'vitest';
import {
  auditTerminologyQa,
  formatTerminologyQa,
} from '@/scripts/audit-terminology-qa';

// ============================================================================
// Terminology 语料 QA（Deep Assurance #002 · Track E）
//
// 第 1 组是【可自动化的结构约束】（守门测试，未来词典改动破坏约束会红）；
// 第 2 组是真实词典现状的 characterization（重复 zh / 语料分类的基线，
// 词典扩充或修复时须有意识更新）。
// ============================================================================

describe('1 · 术语表结构约束（守门）', () => {
  const report = auditTerminologyQa();

  it('约束：anatomy-filters 的每个系统筛选 id 都有中文术语（FilterControl 直接渲染）', () => {
    // 已知缺口基线：'musculoskeletal' 在 systems 词典缺条目，breadcrumb/面板
    // 标题回落英文 "Musculoskeletal"（CONFIRMED ISSUE，修复时把此数组清空）。
    // 该约束保证未来给 systemFilterOptions 新增系统时术语必须同步。
    expect(report.systemTermGaps).toEqual([{ id: 'musculoskeletal', zh: null }]);
  });

  it('约束：nameOverrides 无死键（键必须已规范化，否则永远无法命中）', () => {
    expect(report.deadOverrideKeys).toEqual([]);
  });

  it('约束：语料 QA 输出确定性（同词典两次运行逐字节一致）', () => {
    expect(formatTerminologyQa(auditTerminologyQa())).toBe(formatTerminologyQa(report));
  });
});

describe('2 · 真实词典现状（characterization baseline）', () => {
  const report = auditTerminologyQa();

  it('override 同名 zh 归并基线（单复数/同义词 → 同一中文标签）', () => {
    // 6 组归并中 5 组是无害的单复数/同义归并；其中
    // "corpus spongiosum of penis" →「阴茎海绵体」是疑似错译
    // （应为「尿道海绵体」），记录于 TERMINOLOGY-QA-v1.md，NEEDS BIOLOGY REVIEW。
    expect(report.duplicateOverrideZh.map((item) => item.zh)).toEqual([
      '附睾',
      '精囊腺',
      '射精管',
      '输精管',
      '阴茎勃起组织',
      '阴茎海绵体',
    ]);
    expect(report.duplicateStructureZh).toEqual([]);
    expect(report.crossTableZhCollisions).toEqual([]);
    expect(report.levelHistogram).toEqual({ major: 9, detail: 4 });
  });

  it('侧别解析边角基线', () => {
    expect(report.sideParsingSamples).toEqual([
      { input: 'Femur .l', cleanEnglish: 'Femur', sideZh: '左侧' },
      { input: 'Femur . L.', cleanEnglish: 'Femur . L.', sideZh: null },
      { input: 'Femur (Left Side)', cleanEnglish: 'Femur (Left Side)', sideZh: null },
      { input: 'left Femur (right)', cleanEnglish: 'left Femur', sideZh: '右侧' },
      { input: 'Left Atrium.l', cleanEnglish: 'Left Atrium', sideZh: '左侧' },
      { input: 'Femur left-side', cleanEnglish: 'Femur left-side', sideZh: null },
      { input: 'Femur medial', cleanEnglish: 'Femur medial', sideZh: null },
    ]);
  });

  it('行为语料基线：unavailable 名单锁定（UI 将显示「未识别结构」）', () => {
    console.log(formatTerminologyQa(report));
    const unavailable = report.corpus
      .filter((item) => item.status === 'unavailable')
      .map((item) => item.name);
    expect(unavailable).toContain('Gastrocnemius');
    expect(unavailable).toContain('Islets of Langerhans');
    // 部分翻译样例：gluteus→臀 + medius→中 组合出「臀中」（规范应为「臀中肌」），
    // unverified 照常展示 —— 记录于 TERMINOLOGY-QA-v1.md。
    const gluteus = report.corpus.find((item) => item.name === 'Gluteus medius');
    expect(gluteus).toEqual({ name: 'Gluteus medius', zh: '臀中', status: 'unverified' });
  });
});
