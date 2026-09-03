# BioScope Night Shift Acceptance Report v1

> 作者：DSH — BioScope CTO / Engineering Manager
> 日期：2026-09-03
> 对象：ZCode / GLM 夜班 #001（ZCode Night Shift）与 #002（Deep Assurance）两轮成果的独立审查与收编建议。
> 依据：当前磁盘文件 + Git 拓扑 + 独立复跑验证（不依赖 GLM 报告）。

---

## 1. 当前真实 Git 状态（独立核实）

| 项 | 事实 |
|---|---|
| 当前 HEAD | `15f205a`，位于 `night-shift/2026-09-03-deep-assurance` |
| `master` HEAD | `f367db5`（与夜班开始前 Task Packet §2.1 完全一致，**master 未动**） |
| `night-shift/2026-09-03` HEAD | `cccea33`（#001 收尾） |
| git remote | **无**（`git remote -v` 为空） |
| CI | **无**（`.github` 目录不存在） |
| 工作区 | 干净，除 `?? ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md`（DSH 任务包，仍未入库） |

## 2. Branch 关系（独立核实）

```text
master (f367db5)
  └─ night-shift/2026-09-03 (cccea33)          ← #001，7 commits（6 任务 + 1 报告）
       └─ night-shift/2026-09-03-deep-assurance (15f205a)  ← #002，12 commits（11 任务 + 1 报告）
```

- 线性继承关系成立：`cccea33..deep-assurance` = 12 commits；`master..night-shift/2026-09-03` = 7 commits。
- **确认**：Deep Assurance 确从 #001 HEAD `cccea33` 继续分支，非独立分叉。
- **小修正**：Deep Assurance 报告 §16 写"11 commits ahead of cccea33"，实际为 12（报告 commit `15f205a` 本身是第 12 个）。非实质差异。

## 3. 独立 test / build 验证（本次 CTO 复跑）

| 命令 | 结果 | 与 GLM 声称 |
|---|---|---|
| `npx tsc --noEmit` | exit 0 ✅ | 一致 |
| `npm test` | **247 / 247 passed，11 files，677ms** ✅ | 一致 |
| `npm run validate:knowledge` | 35 tests；`errors: 0`；warnings 3 / infos 52 ✅ | 一致 |
| `npm run audit:knowledge-chain` | 8 tests；核心链 7 跳 = 4 双向 + 3 单向 ✅ | 一致 |
| `npm run local-build` | exit 0，813ms（chunk >500kB 为既有 informational 警告）✅ | 一致 |
| `npm run lint` | 19 errors，**全部位于 `components/ui/*`**（历史豁免），0 新增 ✅ | 一致 |

所有脚本均真实存在于 `package.json`，无需追查缺失 script。

## 4. GLM claims：confirmed / corrected / rejected

### Confirmed（全部关键声称成立）

1. master 未动 ✅
2. 两轮夜班 branch 拓扑与"#002 自 #001 继续" ✅
3. 测试数量 145 → 158 → 247 ✅
4. tsc / test / validate:knowledge / audit:knowledge-chain / local-build / lint 全绿且 0 新增 ✅
5. `data/knowledge/*` 零改动 ✅（diff 无 data/ 变更）
6. Camera / picking / rendering 生产文件未触碰 ✅
7. "无 git remote、无 CI" 元风险真实存在 ✅（独立核实）
8. `.gitignore` 只忽略 `/local-public/models/`，未忽略 `/public/models/`（P0-1）✅（独立核实 .gitignore:44）

### Corrected（轻微口径）

- #002 实际 12 commits（报告写 11，漏计报告 commit 自身）。无实质影响。

### Rejected（无）

- 未发现需要推翻的实质声称。

## 5. 生产代码是否真的零改动

对 `master...deep-assurance` 全量 36 个文件逐项分类：

| 分类 | 数量 | 明细 |
|---|---|---|
| TEST（新增测试） | 10 | tests/*（11 个测试文件中 10 个新增，picking-manager.test.ts 为既有基线未动） |
| TOOLING（只读审计脚本） | 4 | scripts/validate-knowledge-graph.ts · audit-knowledge-chain.ts · audit-knowledge-graph-deep.ts · audit-terminology-qa.ts |
| CONFIG | 1 | package.json（仅 +2 个 npm script，无依赖变化） |
| AUDIT DOC | 16 | docs/audit/* ×14 + 两份夜班报告 |
| PROJECT DOC | 4 | .ai-company/BOARD·PROJECT·ROADMAP + README.md |
| **PRODUCTION CODE** | **1（新增）** | **lib/knowledge-graph-validator.ts（385 行）** |
| DATA | 0 | — |

**结论：零生产行为改动 = CONFIRMED（有精确限定）。**

- `app/`、`components/`、`data/`、`src/` 及既有 `lib/` 文件 **零修改**。
- 唯一进入生产目录的是**新增**的 `lib/knowledge-graph-validator.ts`——纯函数验证器，**未被运行时接线**（grep 证实仅被 tests/ 与 scripts/ import，不进入 app/components 渲染路径）。
- 因此：**不是"没有明显 UI 改动"的含糊说法，而是真正意义上运行时行为零变化**；唯一的 caveat 是新增了一个生产目录下的纯函数模块（属 guardrail 基建，非行为改动）。

## 6. 新测试质量评价

**总体：ACCEPT WITH CHANGES**（质量高于平均，含少量需处理的低价值项）。

### 真资产（认可）
- validator 组 9b：补齐 5 个此前零断言分支，其中 2 个 ERROR 级（`MISSING_FOLLOWUP_TARGET`、`MISSING_KEY_STRUCTURE_NODE`）——若重构破坏将导致 CI 红。
- camera-patch-contract 1-3 组：首次为最脆弱资产（postinstall patch）建立自动化检测。
- filters 碰撞矩阵、picking G 组评分基线、terminology G 组真实 fixture。
- 测试普遍调用真实生产代码（非 fixture 自证），deterministic fuzz 用 seeded mulberry32，characterization 均带注释背书。

### 需处理（不改不阻塞，但应记录）
1. **camera-patch-contract 幂等用例非 hermetic**：测试内 `execFileSync` 直接运行 patch 脚本（:75）。在"半安装/未 patch"状态下跑测试会**现场改写 node_modules 从而掩盖缺失**。这是独立复审点名的真实缺陷，我已亲自读源码确认。
2. 约 8 处"同输入两次比相等"的恒真确定性断言 + 5 处 console.log 全文报告进测试输出（噪音）。
3. 部分过度锁定实现细节：filters 选项数组字面顺序、candidates≤5 字面复述、satisfiesCaret 手写 40 行重造 semver。
4. bioscope-data-invariants 的"registry key == node.id"与 validator `NODE_ID_MISMATCH` 重复。

**处置建议**：合并前至少对第 1 项做出显式决定（接受并文档标注局限，或重构为不运行 patch 脚本）；第 2–4 项为审美/低价值，可后续清理，不阻塞合并。

## 7. 建议接受的 commits

全部 19 个 commit（7 + 12）均为 TEST / TOOLING / AUDIT DOC / PROJECT DOC，无生产行为改动，建议**整体接受**。

## 8. 建议拒绝或修改的 commits

无需要拒绝的 commit。需"合并前明示接受"的仅一处测试（见 §6-1 非 hermetic 用例）。

## 9. docs/audit/ A/B/C/D 分类

> 目标：避免 BioScope 从"没有工程文档"变成"拥有大量没人维护的 AI 文档"。

| 文件 | 分类 | 理由 |
|---|---|---|
| ENGINEERING-BACKLOG-PROPOSAL-v1.md | **A** | 唯一 consolidated backlog，应成为长期维护的单一事实源 |
| ARCHITECTURE-MAP-v1.md | **A** | 架构参考图，长期资产 |
| INDEPENDENT-REVIEW-v1.md | **B** | 对抗视角价值高；其修正应吸收进 backlog/DECISIONS 后即可归档 |
| AI-COMPANY-STATE-AUDIT-v1.md | **B** | 修正已落地；D-010/011/012 候选仍需决策，决策后转 C |
| PHOTOSYNTHESIS-ARCHITECTURE-v1.md | **B** | PARTIAL FIT 判定在 BIO-002A 落地前有效；落地后转 C |
| CAMERA-PATCH-RISK-v1.md | **B** | patch 移除前有效 |
| BUILD-DEPLOYMENT-RISK-v1.md | **B** | deploy 叙事解决前有效 |
| PERFORMANCE-RISK-v1.md | **B** | P0-2/P0-3 落地前有效 |
| ACCESSIBILITY-AUDIT-v1.md | **B** | a11y 批次落地前有效 |
| KNOWLEDGE-GRAPH-AUDIT-v2.md | **B** | CED-1~8 决策前有效 |
| TERMINOLOGY-QA-v1.md | **B** | E-2/E-3 生物学复核前有效 |
| TEST-COVERAGE-MATRIX-v1.md | **B/C** | 数字随测试增长漂移，建议后续由"活清单"取代 |
| CODE-LIFECYCLE-INVENTORY-v1.md | **C** | 死码清单是快照，会过时 |
| DEPENDENCY-RISK-v1.md | **C** | 版本相关快照 |
| BIOSCOPE-ZCODE-NIGHT-SHIFT-REPORT-2026-09-03.md | **C** | 历史记录 |
| BIOSCOPE-DEEP-ASSURANCE-REPORT-2026-09-03.md | **C** | 历史记录 |

无 D（纯噪音）级。**核心建议**：以 backlog proposal 为单一活源，其余 B 类文档允许按"baseline as of commit X"自然过期，不承诺长期逐份维护。

## 10. 当前 Top 5 confirmed engineering risks

1. **资产单点全灭**：无 git remote、无 CI、19 commits 全部在未合并的本地分支，master 停在夜班前。低概率 × 不可逆全损——这是唯一"单点即全灭"的元风险。
2. **camera patch 断裂面**：`^0.1.6` caret × 逐字符 token 锚；pnpm10 默认阻止 postinstall + `--ignore-scripts` 静默路径；契约测试非 hermetic 可能掩盖缺失。
3. **教学内容正确性 = 产品生死**：verified 术语仅 13 条，unverified 无标记直出 UI；`corpus spongiosum of penis` 疑似错译（见 §12）。
4. **characterization 基线维护税**：46/149/69/10 等数字被锁进 4–6 个测试文件，未来任何内容增删有意红测试，长期有"改测试让它绿"的滑坡风险。
5. **生产/部署叙事断裂**：vinext 路径 `public/models/` 为空（GLB 404）且无 deploy 脚本，README 过度承诺；当前被"本地预览可用 + 零部署零用户"掩盖，一旦上线会一次性引爆。

## 11. CEO Decision Required（压缩至 5 项）

### Decision 1 — 知识内容修正批次（CED-1~8 + BIO-005 打包）
- **Why now**：BIO-004 核心链 3 处单向断点 + 3 个数据自引用/重复绑定小修，均属知识语义变更，工程无权擅改。
- **Option A（推荐）**：批准 CED-1~4（核心链 3 反向边 + stomach 自引用 + heart 自绑定 + chloroplast 重复绑定）+ CED-5~8 中无争议项，与 BIO-005 打包为**一次内容版本**，一次性改 4–6 个 characterization 基线。
  - 优点：一次性达成 BIO-004 验收，避免碎片化改基线；成本 S。
  - 缺点：一次变更面稍大；需生物学复核关系类型（§12）。
- **Option B**：只批核心链 3 反向边（CED-1），其余继续挂起。
  - 优点：变更最小。缺点：核心链双向走通但仍遗留已知数据瑕疵，需二次审批。
- **CTO Recommendation**：Option A（打包一次内容版本）。

### Decision 2 — 3-5-1 Rule 的 `related ≤ 5` 是否放宽
- **Why now**：`human` 节点 related 已 5/5 满配，CED-5 要把 `human → nervous-system` 接入会被约束卡住，需先定约束。
- **Option A**：放宽为"相关≤5 非硬性，教学必要性可豁免"，用 validator 守门而非硬测试。
- **Option B（推荐）**：维持 ≤5 硬约束，神经系统改用其它入口形态（如 exploreQuestions/followUp 挂接），不动数据约束。
  - 优点：守住"信息克制"的产品原则（3-5-1 Rule）。缺点：需设计替代入口。
- **CTO Recommendation**：Option B（守住约束，改入口形态）。理由：3-5-1 Rule 是产品级克制原则，不应为一个节点破例。

### Decision 3 — 光合模块键盘可达路径（a11y S1）
- **Why now**：键盘/读屏用户在叶绿体层被永久卡住（进入类囊体的唯一入口是 3D 点击），涉及产品交互流。
- **Option A（推荐）**：把"关键结构"条目改为 button（照 anatomy Key Structures 模式），局部、不动指针体验。
  - 优点：XS/S 成本，零视觉变化，解锁键盘路径。缺点：微小交互流变更。
- **Option B**：仅报告，随 a11y 大批次统一做。
  - 优点：集中。缺点：缺陷持续存在。
- **CTO Recommendation**：Option A（纳入 P1，独立小 commit）。

### Decision 4 — 部署叙事（R9）
- **Why now**：README 宣称生产构建/部署，但仓库无 deploy 脚本且 vinext 路径模型 404，属"文档说能、仓库不能"。
- **Option A（推荐）**：短期把 README/ROADMAP 降级为"本地预览为当前真实能力，部署 NOT NOW"，保留 caveat。
  - 优点：XS 成本，消除过度承诺。缺点：暂无部署能力（当前本就不存在）。
- **Option B**：补齐 deploy 脚本 + 生产模型 asset 管道。
  - 优点：真可部署。缺点：M/L 成本，新增 infra，当前零用户 ROI 低。
- **CTO Recommendation**：Option A（诚实降级），部署作为未来独立决策。

### Decision 5 — Merge Strategy 批准（见 §13）
批准后方可执行 merge。

## 12. Biology Review Required

1. `corpus spongiosum of penis` → 「阴茎海绵体」疑似错译（应为「尿道海绵体」）。
2. 翻译语料批量复核（如「臀中」→「臀中肌」类）；unverified 是否应在 UI 标注。
3. 分类器 MISS 词表补充（Gluteus/Biceps/Sternocleidomastoid/Vena cava/Aortic valve 等）——需先取真实 atlas 的 system 元数据样本。
4. Decision 1 中补边的**关系类型**（oxygen `participates_in` alveoli / atp `supports` heart / cellular-respiration `related_to` mitochondrion）需生物学侧确认语义，而非工程侧自行定。

## 13. 推荐 Merge Strategy

**Option B（推荐）：收编 #001 + #002 全部。**

- **收什么**：`night-shift/2026-09-03-deep-assurance` 整支（已线性包含 #001 的 7 commits）——共 19 commits。
- **不收什么**：无。无生产行为改动需要剔除。
- **为什么**：#002 是 #001 的线性超集，全量验证绿，零生产行为改动，无 cherry-pick 必要（Option C 无意义）。
- **风险**：合并后 characterization 基线成为"活护栏"，未来数据增删会**有意红测试**（团队需理解"红=更新基线"而非"测试坏了"）。
- **rollback**：无 remote 的本地 repo，`git reset --hard f367db5` 即可完全回退；建议 merge 用 `--no-ff` 保留 branch 出处，并打 tag `night-shift-2026-09-03-accepted`。
- **合并前必须决定**：§6-1 非 hermetic camera 测试的处置（接受并标注 vs 重构）。

> 按指示，**未执行 merge**，等待 CEO 批准。

## 14. `.ai-company` 推荐同步（仅确认事实/正式决策/真实状态）

- **BOARD**：BIO-004 进展更新为"69 对单向边"的图级量化（deep audit 结果）；待 CEO 批准后开 BIO-011（内容修正批次）与 BIO-012（性能 XS 批次）。
- **DECISIONS**：补 D-010（知识守护层正式化，待 ratify）、D-012（vanatome-react 锁精确版本，CTO 建议）、D-011（MechanismStep 字段处置，随 BIO-002A 拍板）。
- **ROADMAP**：反映夜班已确认成果（测试/审计资产），不把 finding 当承诺。
- **PROJECT**：已更新（validator 入 lib 清单、46 节点）；可补新审计脚本/测试文件说明。
- **LEARNING**：补 L-004「多 Agent 夜班马拉松的教训」（characterization 基线纪律、remote/CI 缺口、文档收敛）。
- **明确不做**：Audit Finding ≠ Roadmap Item；Proposal ≠ Approved Task。任何 backlog 项在 CEO 批准前不进 NOW/NEXT 承诺。

## 15. 对 ZCode + GLM 夜班实验本身的评价

**正面**：证据密度罕见（论断带行号、可复现、WONT-FIX 清单防重复报告）；Track O 独立陌生复审是正确的方法论；零生产行为改动严格遵守授权边界；产出可长期复用（6 测试文件、2 只读审计脚本、consolidated backlog）。

**风险/教训**：
1. 元风险自爆——19 commits 全在无 remote 的本地分支，价值直到 merge + 备份后才算落袋。
2. 文档面膨胀——14+2 份文档需收敛为"单一 backlog 活源 + 允许过期的支持证据"，否则会变成无人维护的 AI 文档堆。
3. 约 89 个新测试中混入少量恒真/低价值断言，需后续 pruning 纪律。
4. GLM 已停止（无继续调用计划），本次成果的维护责任落在 CTO + 后续 Agent。

## 16. 当前 git status（报告写入时）

```text
On branch night-shift/2026-09-03-deep-assurance (HEAD 15f205a)
?? ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md
?? BIOSCOPE-NIGHT-SHIFT-ACCEPTANCE-REPORT-v1.md   ← 本文件（未提交，待 CEO Review）
```

master 停在 `f367db5`，未做任何 merge / push / reset。

---

## Acceptance Result: **ACCEPT WITH CHANGES**

**理由**：GLM 全部关键声称经独立复跑确认；零生产行为改动属实（唯一新增 `lib/knowledge-graph-validator.ts` 为未接线的纯函数 guardrail）；测试质量高于平均、覆盖真实生产代码与最脆弱资产。

**"WITH CHANGES" 的三处保留**（均不阻塞，但合并前需明示处理）：
1. camera-patch-contract 幂等用例非 hermetic——合并前接受并文档标注，或重构。
2. 约 8 处恒真确定性断言 + console.log 噪音——后续 pruning（审美，非阻塞）。
3. 文档面收敛——以 backlog proposal 为单一活源，其余 B 类允许过期。

**下一步（停止，等 CEO Review）**：不 merge、不修 backlog、不启动 BIO-002A、不排新 Sprint、不调 Agent 继续开发。
