import { describe, expect, it } from 'vitest';
import {
  explorerPrimaryName,
  getStructureTerm,
  getSystemTerm,
  normalizeAnatomyName,
  parseModelSide,
} from '@/lib/anatomy-terminology';

// ============================================================================
// 术语层回归基线测试（audit 稳定化护栏 · 任务 2）
//
// 本文件固化 lib/anatomy-terminology.ts 的【当前】三级 fallback 行为：
//   1. structures（按 id 的人工确认表，最高优先级）
//   2. nameOverrides（按 normalize 后英文名的人工映射）
//   3. phraseTerms（短语注入）+ wordTerms（逐词组合），任一词未知 → 整句失败
//
// 这些测试是行为快照而非行为规范。词典或 fallback 顺序的任何有意变更，
// 都必须先有意识地更新这里的期望值。
// ============================================================================

// getStructureTerm 只需要 Pick<VanatomeStructure, 'id' | 'name'>，用纯对象即可。
const term = (id: string, name: string) => getStructureTerm({ id, name });

// ---------------------------------------------------------------------------
// A. 人工确认术语优先级
// ---------------------------------------------------------------------------

describe('A · 人工确认术语优先级', () => {
  it('structures id 映射命中：verified，level 取自人工表', () => {
    const result = term('heart', 'Heart');

    expect(result.zh).toBe('心脏');
    expect(result.en).toBe('Heart');
    expect(result.level).toBe('major');
    expect(result.translationStatus).toBe('verified');
    expect(result.pending).toBe(false);
  });

  it('id 映射完全忽略名称（即使名称无法翻译或另有映射）', () => {
    // 名称 'Gaster' 不在任何词典中；名称 'Lunate Bone' 本可命中 override，
    // 但 id 'skeleton' 的人工映射优先 → 骨骼。
    expect(term('stomach', 'Gaster').zh).toBe('胃');
    expect(term('stomach', 'Gaster').translationStatus).toBe('verified');

    expect(term('skeleton', 'Lunate Bone').zh).toBe('骨骼');
    expect(term('skeleton', 'Lunate Bone').en).toBe('Lunate Bone');
  });

  it('nameOverrides 优先于组合翻译（两者结果不同时）', () => {
    // 'spermatic duct' 组合翻译会得到「精索导管」（spermatic→精索 + duct→导管），
    // 人工 override 给出「输精管」→ 证明 override 层先于组合层生效。
    const result = term('x-spermatic', 'Spermatic Duct');

    expect(result.zh).toBe('输精管');
    expect(result.translationStatus).toBe('verified');
    expect(result.level).toBe('detail');
  });
});

// ---------------------------------------------------------------------------
// B. nameOverrides（经 normalize 后命中）
// ---------------------------------------------------------------------------

describe('B · nameOverrides', () => {
  it('大小写不敏感：normalize 后命中 override', () => {
    const result = term('x-cv', 'Corpus Cavernosum of Penis');

    expect(result.zh).toBe('阴茎海绵体');
    expect(result.translationStatus).toBe('verified');
  });

  it('单复数变体各有独立键', () => {
    expect(term('x-sg', 'Seminal Glands').zh).toBe('精囊腺');
    expect(term('x-sv', 'Seminal Vesicles').zh).toBe('精囊腺');
  });

  it('空格分隔的普通键直接命中', () => {
    expect(term('x-shell', 'Body Shell').zh).toBe('体表外壳');
    expect(term('x-lunate', 'Lunate Bone').zh).toBe('月骨');
  });
});

// ---------------------------------------------------------------------------
// C. phraseTerms / wordTerms fallback
// ---------------------------------------------------------------------------

describe('C · 短语与单词组合 fallback', () => {
  it('短语优先：spinal cord 只能靠短语翻译（cord 无单词映射）', () => {
    const result = term('x-sc', 'Spinal Cord');

    expect(result.zh).toBe('脊髓');
    expect(result.translationStatus).toBe('unverified');
    expect(result.pending).toBe(false);
  });

  it('短语优先：small intestine 只能靠短语翻译（small 无单词映射）', () => {
    expect(term('x-si', 'Small Intestine').zh).toBe('小肠');
    expect(term('x-si', 'Small Intestine').translationStatus).toBe('unverified');
  });

  it('单词组合：多词逐个映射后拼接', () => {
    // left→左 + atrium→心房（无短语命中）。
    const result = term('x-la', 'Left Atrium');

    expect(result.zh).toBe('左心房');
    expect(result.translationStatus).toBe('unverified');
  });

  it('短语注入的中文片段绕过词表检查后继续组合', () => {
    // coronary arteries? → 冠状动脉（短语），整句仅剩该片段。
    expect(term('x-ca', 'Coronary Artery').zh).toBe('冠状动脉');
  });

  it('未知词导致整句失败（all-or-nothing），不输出部分翻译', () => {
    // heart→心脏 可译，但 splanchnotome 未知 → 整句返回 null。
    const result = term('x-mixed', 'Heart Splanchnotome');

    expect(result.zh).toBeNull();
    expect(result.translationStatus).toBe('unavailable');
    expect(result.pending).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D. 左右侧解析
// ---------------------------------------------------------------------------

describe('D · 左右侧解析', () => {
  it.each([
    ['Femur.l', '左侧'],
    ['Femur.r', '右侧'],
    ['Femur-l', '左侧'],
    ['Femur_l', '左侧'],
    ['Femur.L', '左侧'],
    ['Femur left', '左侧'],
    ['Femur right', '右侧'],
    ['Femur (left)', '左侧'],
    ['Femur (right)', '右侧'],
  ] as const)('结尾侧别 %j → %s', (name, side) => {
    const result = term('x-femur', name);

    expect(result.zh).toBe(`股骨（${side}）`);
    expect(result.en).toBe('Femur');
    expect(result.translationStatus).toBe('unverified');
  });

  it('前缀 left/right 不视为侧别，按普通单词组合进名称', () => {
    const result = term('x-lf', 'Left Femur');

    // 基线：无（左侧）后缀；left→左 与 femur→股骨 组合为「左股骨」。
    expect(result.zh).toBe('左股骨');
    expect(result.en).toBe('Left Femur');
    expect(result.translationStatus).toBe('unverified');
  });

  it('侧别后缀可与 id 人工映射叠加', () => {
    const result = term('heart', 'Heart.left');

    expect(result.zh).toBe('心脏（左侧）');
    expect(result.translationStatus).toBe('verified');
    // 基线（已知毛边，仅记录）：wordMatch 形式的侧别解析不吞并分隔符，
    // cleanEnglish 会残留尾部点号 → en 为 'Heart.'；suffix 形式（Femur.l）
    // 因分隔符本身是切分边界，无此残留。
    expect(result.en).toBe('Heart.');
  });

  it('parseModelSide 直接返回 cleanEnglish 与 sideZh', () => {
    expect(parseModelSide('Femur.l')).toEqual({ cleanEnglish: 'Femur', sideZh: '左侧' });
    expect(parseModelSide('Femur right')).toEqual({ cleanEnglish: 'Femur', sideZh: '右侧' });
    expect(parseModelSide('Femur')).toEqual({ cleanEnglish: 'Femur', sideZh: null });
    expect(parseModelSide('Left Femur')).toEqual({ cleanEnglish: 'Left Femur', sideZh: null });
  });
});

// ---------------------------------------------------------------------------
// E. verified / unverified / unavailable 三态基线
// ---------------------------------------------------------------------------

describe('E · translationStatus 三态', () => {
  it('verified：id 人工映射路径', () => {
    const result = term('liver', 'Liver');

    expect(result.translationStatus).toBe('verified');
    expect(result.pending).toBe(false);
    expect(result.level).toBe('major');
  });

  it('verified：nameOverride 路径（level 固定 detail）', () => {
    const result = term('x-lunate', 'Lunate Bone');

    expect(result.translationStatus).toBe('verified');
    expect(result.pending).toBe(false);
    expect(result.level).toBe('detail');
  });

  it('unverified：组合翻译成功路径', () => {
    const result = term('x-la', 'Left Atrium');

    expect(result.translationStatus).toBe('unverified');
    expect(result.pending).toBe(false);
    expect(result.level).toBe('detail');
    expect(result.zh).not.toBeNull();
  });

  it('unavailable：组合翻译失败路径（zh 为 null，pending 为 true）', () => {
    const result = term('x-unk', 'Totally Unknown Thing');

    expect(result.zh).toBeNull();
    expect(result.translationStatus).toBe('unavailable');
    expect(result.pending).toBe(true);
    expect(result.level).toBe('detail');
    expect(result.en).toBe('Totally Unknown Thing');
  });

  it('getSystemTerm：已知系统无 translationStatus 字段；未知系统回退为 unavailable', () => {
    const known = getSystemTerm('cardiovascular');
    expect(known.zh).toBe('心血管系统');
    expect(known.level).toBe('system');
    expect(known.translationStatus).toBeUndefined();

    const unknown = getSystemTerm('made-up-system');
    expect(unknown.zh).toBeNull();
    expect(unknown.en).toBe('made up system');
    expect(unknown.translationStatus).toBe('unavailable');
    expect(unknown.level).toBe('system');
  });
});

// ---------------------------------------------------------------------------
// F. normalizeAnatomyName
// ---------------------------------------------------------------------------

describe('F · normalizeAnatomyName', () => {
  it('统一小写', () => {
    expect(normalizeAnatomyName('Femur')).toBe('femur');
    expect(normalizeAnatomyName('Corpus Cavernosum')).toBe('corpus cavernosum');
  });

  it('连字符、点、下划线、逗号、斜杠、反斜杠均替换为空格', () => {
    expect(normalizeAnatomyName('a-b.c_d,e/f\\g')).toBe('a b c d e f g');
  });

  it('圆括号、方括号、花括号、星号、下划线均替换为空格', () => {
    expect(normalizeAnatomyName('(heart)')).toBe('heart');
    expect(normalizeAnatomyName('[x]{y}*z')).toBe('x y z');
  });

  it('连续空白合并并 trim', () => {
    expect(normalizeAnatomyName('  left    atrium  ')).toBe('left atrium');
  });

  it('基线：left/right 的正则替换是恒等操作（保留原词）', () => {
    expect(normalizeAnatomyName('left femur right')).toBe('left femur right');
  });

  it('基线：normalize 不移除侧别后缀（后缀解析在 parseModelSide 中）', () => {
    expect(normalizeAnatomyName('Femur.l')).toBe('femur l');
  });
});

// ---------------------------------------------------------------------------
// G. 真实结构回归 fixture（来自当前项目术语数据）
// ---------------------------------------------------------------------------

describe('G · 真实结构回归 fixture', () => {
  // 每行注释标注该翻译当前经由的层级，防止未来层级顺序变更被忽略。
  const fixtures: Array<{
    title: string;
    id: string;
    name: string;
    zh: string;
    status: 'verified' | 'unverified';
  }> = [
    { title: '心脏', id: 'heart', name: 'Heart', zh: '心脏', status: 'verified' },
    { title: '左心房', id: 'heart-left-atrium', name: 'Left atrium', zh: '左心房', status: 'verified' },
    { title: '肺', id: 'lungs', name: 'Lungs', zh: '肺', status: 'verified' },
    { title: '肝脏', id: 'liver', name: 'Liver', zh: '肝脏', status: 'verified' },
    { title: '胃', id: 'stomach', name: 'Stomach', zh: '胃', status: 'verified' },
    { title: '肾脏', id: 'kidneys', name: 'Kidneys', zh: '肾脏', status: 'verified' },
    // 脑在 atlas 中无独立 'brain' 结构，只有 cerebrum/cerebellum/brainstem，
    // 全部走组合翻译（unverified）。
    { title: '大脑（经组合）', id: 'cerebrum', name: 'Cerebrum', zh: '大脑', status: 'unverified' },
    { title: '骨骼（人工映射）', id: 'skeleton', name: 'Skeleton', zh: '骨骼', status: 'verified' },
    { title: '股骨（组合）', id: 'f-femur', name: 'Femur', zh: '股骨', status: 'unverified' },
    { title: '冠状动脉（短语）', id: 'a-coronary', name: 'Coronary Artery', zh: '冠状动脉', status: 'unverified' },
    { title: '肺静脉（短语）', id: 'v-pulmonary', name: 'Pulmonary Vein', zh: '肺静脉', status: 'unverified' },
    { title: '视神经（组合）', id: 'n-optic', name: 'Optic Nerve', zh: '视神经', status: 'unverified' },
    { title: '三角肌（组合）', id: 'm-deltoid', name: 'Deltoid', zh: '三角肌', status: 'unverified' },
  ];

  it.each(fixtures)('$title（$name → $zh）', ({ id, name, zh, status }) => {
    const result = term(id, name);

    expect(result.zh).toBe(zh);
    expect(result.translationStatus).toBe(status);
    expect(result.pending).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// H. 未知结构
// ---------------------------------------------------------------------------

describe('H · 未知结构', () => {
  it('完全未知名称：zh 为 null，en 原样保留，unavailable + pending', () => {
    const result = term('zzz-unknown', 'Totally Unknown Thing');

    expect(result.zh).toBeNull();
    expect(result.en).toBe('Totally Unknown Thing');
    expect(result.translationStatus).toBe('unavailable');
    expect(result.pending).toBe(true);
    expect(result.level).toBe('detail');
  });

  it('explorerPrimaryName 对未知结构回退为「未识别结构」', () => {
    expect(explorerPrimaryName({ id: 'zzz-unknown', name: 'Totally Unknown Thing' })).toBe(
      '未识别结构',
    );
  });

  it('explorerPrimaryName 对可翻译结构返回中文（unverified 也直接展示）', () => {
    expect(explorerPrimaryName({ id: 'x-la', name: 'Left Atrium' })).toBe('左心房');
  });
});
