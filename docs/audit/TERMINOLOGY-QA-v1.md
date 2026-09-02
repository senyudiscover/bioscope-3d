# BioScope Terminology QA v1

> Deep Assurance #002 · Track E 产出（2026-09-03）。只读审计，**未修改任何术语词典**。
> 证据引擎：`scripts/audit-terminology-qa.ts`（只读；守门约束 + characterization 已固化进
> `tests/terminology-qa.test.ts`）。术语事实源：`lib/anatomy-terminology.ts`（D-005）。
> 生物学正确性判断一律标 NEEDS BIOLOGY REVIEW，不自动改。

---

## 0. 词典规模基线

| 表 | 规模 | 说明 |
|---|---|---|
| `systems` | 11 | 含 `regional-anatomy`；**不含 `musculoskeletal`**（见 E-1） |
| `structures`（verified by id） | 13（major=9, detail=4） | 心脏/肺/肝等高频器官 |
| `nameOverrides`（verified by normalized name） | 见文件（keys 全部规范化，0 死键） | |
| `phraseTerms` / `wordTerms` | 未导出（内部） | 只能经 getStructureTerm 行为探测 |

## 1. CONFIRMED ISSUE（可自动验证、非生物学判断）

### E-1 · `musculoskeletal` 系统筛选无中文术语

- 证据：`tests/terminology-qa.test.ts` 守门断言 `systemTermGaps === [{id:'musculoskeletal', zh:null}]`；
  `lib/anatomy-terminology.ts` 的 `systems` 表无该 id（grep 计数 0）。
- 影响：`getSystemTerm('musculoskeletal')` 回落 unavailable（zh=null），breadcrumb/面板标题
  类消费点（anatomy-workbench `displaySystem`，:80-81 的 `.zh ?? .en`）显示英文
  "Musculoskeletal"。FilterControl 按钮本身不受影响（用 systemFilterOptions.label「肌肉骨骼」）。
- 违反 D-005「中文优先」。修复成本：systems 表加 1 条
  `{ zh:'肌肉骨骼', en:'Musculoskeletal System', level:'system' }`（与 FilterControl 现有
  label 措辞一致）；属 UI 一致性而非生物学判断，建议随下一个工程任务修复，
  并把守门断言的缺口基线清空。

## 2. NEEDS BIOLOGY REVIEW（疑似错译/撞名，人工判断）

### E-2 · `corpus spongiosum of penis` → 「阴茎海绵体」（疑似错译）

- 证据：`duplicateOverrideZh` 分组 "阴茎海绵体" <- keys:
  `corpora cavernosa of penis, corpus cavernosum of penis, corpus spongiosum of penis`。
- 两个不同结构（阴茎海绵体 / 尿道海绵体）被归并到同一中文标签。
  corpus spongiosum 规范译名应为「尿道海绵体」。
- 该组内其余归并（corpora/cavernosa 单复数）无害。

### E-3 · 组合翻译产出「部分翻译」词（unverified 照常展示）

- 例：`Gluteus medius` → 「臀中」（gluteus→臀 + medius→中；规范应为「臀中肌」）。
  已固化进测试作为样例。
- 语料中大量主要肌肉完全不可译（unavailable → UI 显示「未识别结构」）：
  `Gastrocnemius`、`Islets of Langerhans` 等（完整名单运行 QA 测试可见，约 33/73 语料项）。
- 判断：单词拼接层的系统性产物（D-005 已知约束），逐条修是内容工程，建议按
  「高频器官优先人工 verified」的既定路线推进，不在本次范围内批量处理。

## 3. LIKELY ISSUE（机制性，低风险但值得知道）

### E-4 · 侧别解析对三类后缀形态失效（KNOWN BEHAVIOR，已固化）

| 输入 | cleanEnglish | sideZh |
|---|---|---|
| `Femur .l` | Femur | 左侧 ✓ |
| `Femur . L.` | Femur . L. | null（`. ` 后的 L. 不识别） |
| `Femur (Left Side)` | 原样 | null（尾部词是 Side 不是 left/right） |
| `left Femur (right)` | left Femur | 右侧 ✓（前缀 left 保留在名内） |
| `Femur left-side` | 原样 | null |
| `Femur medial` | 原样 | null（medial 不是侧别） |

- 影响：仅在 atlas 真实命名恰为这三种形态时显示缺「（左/右侧）」后缀，不产生错译。
- `normalizeAnatomyName` 的 `\b(right|left)\b → $1` 替换是恒等操作（死代码行，
  anatomy-terminology.test.ts 已固化该基线）。

## 4. ACCEPTABLE FALLBACK（健康面）

- **0 死键**：nameOverrides 全部键满足 `normalizeAnatomyName(key) === key`
  （守门测试保证未来新增键必须规范化）。
- **0 跨表 zh 冲突**：structures 与 nameOverrides 之间无同名中文标签。
- **0 structures 内部重复 zh**（13 条 verified 各不相同）。
- override 同名归并 6 组中 5 组为无害单复数/同义归并：
  附睾(epididymis/-ides)、精囊腺(seminal gland(s)/vesicle(s))、射精管(ejaculatory duct(s))、
  输精管(ductus deferens/-entes + spermatic duct)、阴茎勃起组织(penile erectile tissue(s))。

## 5. 方法学限制（如实记录）

- 语料是「真实 override 键 + 真实风格解剖名探针」，**不是运行时 atlas 的完整结构名清单**
  （那需要加载 Vanatome catalog，静态审计不可得）。因此 unavailable 统计是下界。
- phraseTerms/wordTerms 未导出，覆盖盲区（哪些单词词根可译）只能行为探测。
  若未来需要全量 QA，可给 lib 增加只读导出（不在本次范围内）。

---
*证据可复现：`npx vitest run tests/terminology-qa.test.ts`。生成：Deep Assurance #002 Track E。*
