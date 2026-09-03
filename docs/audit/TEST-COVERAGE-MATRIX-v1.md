# BioScope Test Coverage Matrix v1

> ⚠️ SNAPSHOT（历史快照）：基准 commit 为 night-shift 验收（2026-09-03），测试文件数与覆盖数字随测试增长漂移，不承诺持续维护。见 docs/audit/README.md。

> Deep Assurance #002 · Track B 产出（2026-09-03）。
> 不是传统行覆盖率，而是「关键行为 × 测试」矩阵。判定基于对全部 10 个测试文件
> 与被测模块的通读（含 #001 NS-1 review 与本轮 Track C/D/E/F/H 的新增）。
> 本轮按矩阵新增的高价值测试：`tests/bioscope-data-invariants.test.ts`（见 §尾）。

**当前基线：11 个测试文件 / 247 tests（含本轮新增，#002 独立复审复核通过），`npm test` 全绿；tsc 通过；
lint 0 新增（历史 19 个 error 全在豁免的 components/ui 与 use-mobile）。**

---

## 1. 矩阵

### picking-manager（stable 资产，D-007）

| Critical behavior | Existing tests | Missing behavior | Risk | Best test type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 评分/歧义/空间救援/隔离/hidden 语义 | picking-manager 23（评分快照） | — | 低 | characterization | ✅已足 | 0.16/14/权重全部钉死 |
| 畸形输入（重复 id/NaN/幽灵 id/空数组） | picking-adversarial 14 | — | 中 | adversarial + fuzz | ✅已足 | #002 补齐；含 mulberry32 不变量 fuzz |
| selectable=false 路径（真实被 workbench 设置） | picking-adversarial CB 组 | — | 中 | fixture | ✅已足 | 之前零覆盖，#002 补 |
| **parentId 成环 → resolvePickCandidates 死循环** | **无（不可测：会挂死套件）** | 环防御 | 中 | — | 记录不测 | getAncestors 无 visited；生产 atlas 是树，实际风险低；修复=改 stable 代码，需证据驱动决策 |
| 与 VanatomeViewer 的真实 raycast 集成 | 无 | — | 低 | 手测清单 | ❌ | 浏览器/WebGL 边界，成本>收益 |

### anatomy-filters（stable）

| Critical behavior | Existing tests | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| system/display 过滤、祖先保留、元数据保真、已知污染 | anatomy-filters 42 | — | 低 | characterization | ✅已足 | 含多级树与 body-shell 边界 |
| 词表碰撞矩阵（ulna⊂ulnar 等）/ 语料不变量 / seeded fuzz | filter-classifier-fuzz 36 | — | 中 | matrix + fuzz | ✅已足 | #002 补齐；regex 零改动 |
| 与真实 atlas 元数据（system 字段）的覆盖率 | 无（静态不可得） | — | 低 | 运行时脚本 | ❌ | 需要远端 catalog；分类风险已在矩阵行内标注 |

### anatomy-terminology（stable，D-005）

| Critical behavior | Existing tests | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 三级 fallback / 侧别 / 三态 / 真实 fixture | anatomy-terminology 50 | — | 低 | characterization | ✅已足 | |
| 死键/系统覆盖/撞名分组/语料分类 | terminology-qa 6 | — | 中 | 守门 + QA | ✅已足 | #002 补；musculoskeletal 缺口锁定为基线 |
| 真实 atlas 全量结构名的覆盖率 | 无 | 全量 QA | 中 | 运行时脚本 | ⏸ | 需远端 catalog；TERMINOLOGY-QA §5 已声明下界口径 |

### knowledge graph validator / chain audit / deep audit

| Critical behavior | Existing tests | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 28 个错误码语义 | knowledge-graph 35（含 #001 补的 5 个） | — | 高（缺失=CI 盲区） | fixture | ✅已足 | ERROR 级全覆盖 |
| 真实数据形态（46/149/warnings/INFO） | 组 10 characterization | — | 低 | characterization | ✅ | 有意基线 |
| 核心链 7 跳双向 | knowledge-chain-audit 8 | — | 中 | fixture+真实 | ✅ | BIO-004 基线 |
| 全图连通性/可达性/单向边/model 双向绑定 | knowledge-graph-deep-audit 16 | — | 中 | 只读审计 | ✅ | #002 补 |

### knowledge node registry（data/knowledge）——本轮补齐

| Critical behavior | Existing tests（前） | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 引用完整性/图形态 | validator + 两审计 | — | — | — | ✅ | 见上 |
| **数据形状约束（related≤5、coreFunctions≤3、nameZh 非空）** | **无** | UI 配额约束 | 中 | 数据不变量 | ✅已补 | PROJECT.md 宣称的 3-5-1 Rule 之前无任何测试兜底 |
| **lightReactionSteps 数据健全性（id 唯一、每步有知识锚点）** | 仅存在性 | 唯一性/非空 | 中 | 纯数据 | ✅已补 | BIO-002A 的数据基座 |

### bioscope-core 导航纯函数——本轮补齐

| Critical behavior | Existing（前） | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| getParentScene / getPrimaryChildScene | **无** | photosynthesis canExplore 的底层原语 | 低-中 | 纯函数 fixture | ✅已补 | 纯函数、零依赖、5 分钟测试 |

### module registry / model context / related dock / workbench 交互

| Critical behavior | Existing | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| registry 声明（status/defaultKnowledgeNodeId） | 无 | id 与 default 节点一致性（BIO-001 曾出 bug） | 低-中 | 组件/数据测试 | ❌（暂） | 测试需 import workbench→拖入 vanatome/react 三方链，成本>收益；BIO-001 类 bug 由 tsc+深审兜底 |
| modelContext 与 currentNode 分离（D-002） | 无 | chooseKnowledgeNode 不动相机 | **中** | 组件测试（rendering） | ⏸ | 需要 jsdom+R3F mock 测试基建（仓内无）；建议列为未来基建任务而非临时拼装 |
| Related dock 静默丢弃悬空 target | validator 间接保证 | 组件层断言 | 低 | — | ❌ | validator 已把悬空引用压到 0 |
| CandidateMenu/键盘交互等 UI 行为 | 无 | 全部 | 中 | 组件测试基建 | ⏸ | 同上；见 ACCESSIBILITY-AUDIT 的键盘路径 |

### mechanism step 抽象 / micro-lab 数据 / photosynthesis viewer

| Critical behavior | Existing | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 步骤数据健全性 | 无 → ✅已补 | — | 中 | 纯数据 | ✅ | |
| mesh id ↔ microStructureTerms ↔ canExplore 门禁一致性 | 无 | viewer 硬编码 id 的静态抽取 | 低-中 | ❌（暂） | ❌ | viewer id 在 JSX 内，静态抽取脆弱；Track G 文档已给映射表人工核对 |
| R3F 相机/高亮行为 | 无 | — | 低 | 手测 | ❌ | WebGL 边界 |

### camera patch contract

| Critical behavior | Existing | Missing | Risk | Best type | Worth? | Reason |
|---|---|---|---|---|---|---|
| 安装态存在性/顺序/幂等/版本 | camera-patch-contract 6 | — | 高→已兜底 | 契约 | ✅已足 | #002 新增 |
| 运行时相机行为 | 无 | 自动对焦只随 focusRequestKey | 中 | 手测清单 | ❌ | WebGL 边界；CAMERA-PATCH-RISK §2 已声明 |

## 2. 「看起来有测试，其实关键分支没断言」盘点结论

1. validator 5 个错误码（#001 NS-1 已修复）——本轮无新增同类问题。
2. 知识数据 3-5-1 约束**从无测试**（文档宣称 + 数据碰巧满足）——本轮补上。
3. bioscope-core 导航纯函数**从无测试**——本轮补上。
4. picking 的 selectable=false 与畸形输入——#002 Track C 补上。
5. 剩余真实缺口全部属于「需要测试基建」（组件渲染）或「需要运行时数据」（远端 catalog），
   不适合在本轮拼装——已在矩阵中标注 ⏸/❌ 及理由。

## 3. 本轮新增测试文件

`tests/bioscope-data-invariants.test.ts`：
- 知识数据不变量：全 46 节点 related≤5、coreFunctions≤3、nameZh 非空、id 与 key 一致；
- lightReactionSteps：id 唯一、titleZh 非空、每步至少 1 个 knowledgeNodeIds；
- getParentScene / getPrimaryChildScene：fixture 语义（含缺失父/空子场景）。

---
*生成：Deep Assurance #002 Track B。证据：全部 tests/*.ts + 被测模块通读。*
