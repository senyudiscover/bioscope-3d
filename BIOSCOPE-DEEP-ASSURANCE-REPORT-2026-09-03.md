# BioScope Deep Assurance Report — 2026-09-03

> 执行环境：ZCode / GLM-5.3-Flash（Night Shift #002 — Deep Assurance Marathon）
> 依据：CEO 指令"在额度失效前，把尽可能多的计算资源转化成 BioScope 可长期复用的工程资产"
> 报告时间：2026-09-03 03:55 +08:00 · 前序：BIOSCOPE-ZCODE-NIGHT-SHIFT-REPORT-2026-09-03.md（#001）
> 状态：**15 个 Track（A~O）全部完成；停在 `night-shift/2026-09-03-deep-assurance` branch；未 merge master**

---

## 1. Branch

`night-shift/2026-09-03-deep-assurance`（自 #001 HEAD `cccea33` 分出）。
两个夜班 branch 并存，DSH 可分别审查：`night-shift/2026-09-03`（#001，7 commits）与本 branch（#002，11 commits）。

## 2. Total Commits（#002 部分，共 11 个）

```text
01ac222 docs(audit): add independent adversarial review + backlog amendments
3b13d51 chore(lint): drop unused type alias from picking adversarial suite
f7a5660 docs(audit): add engineering backlog proposal consolidating all findings
ea28b4f docs(audit): .ai-company truth audit + 3 factual staleness fixes
246f36b test(data) + docs(audit): behavior coverage matrix and a11y audit
21e45df docs(audit): add deep assurance audit wave 1 (9 reports)
0695923 test(terminology): add corpus QA audit with structural constraints
4471ae3 feat(guardrails): add knowledge graph deep-connectivity audit
773cc8b test(camera): add postinstall patch presence and idempotency contract
3e5f7c4 test(filters): add classifier collision matrix and deterministic fuzz
6a50fec test(picking): add adversarial and property characterization suite
```

`master...deep-assurance` 全量 diff：**34 files changed, +5379 / −14**（含 #001 的 17 个 commit 累计）。

## 3. Final Tests Count

| 阶段 | tests | 文件数 |
|---|---|---|
| #001 之前（旧 GLM 落盘） | 145 | 4 |
| #001 结束 | 158 | 5 |
| **#002 结束** | **247 / 247 passed** | **11** |

#002 新增 89 个测试（6 个文件）。`npx tsc --noEmit` 通过；`npm run validate:knowledge`
errors: 0（35 tests）；`npm run audit:knowledge-chain` 8 tests；lint **0 新增**
（19 个历史 error 全在豁免的 components/ui/* 与 hooks/use-mobile.ts，本轮一度引入 1 个
未使用变量，已修复并回落基线）。

## 4. Build Status

- `npm run local-build`：**通过**（890ms；chunk >500kB 警告为既有 informational，非新增）。
- `npm test`：247/247（#002 独立复审员亲测复核：684ms 全绿）。
- 未执行 `npm run build`（vinext）/部署——已知其模型 404 问题（见 finding #1），属文档叙事修复范畴。

## 5. 新增测试 / 工具（可长期复用资产）

**测试（6 文件 / 89 tests）**
1. `tests/picking-adversarial.test.ts`（14）：畸形输入（重复 id/NaN/幽灵 hidden·isolation）、
   selectable=false（真实标志、此前零覆盖）、候选 5 上限、organ 歧义例外边界、选中分支空间救援、
   createPickableStates 环图终止性、mulberry32 确定性 fuzz（60 场景不变量）。
2. `tests/filter-classifier-fuzz.test.ts`（36）：29 行分类器碰撞矩阵（COLLISION/POLLUTION/
   MISS/OK 逐行带理由）+ 性质不变量网格 + 40 场景 seeded fuzz。
3. `tests/camera-patch-contract.test.ts`（6）：postinstall patch 存在性/语义顺序/幂等重跑
   （sha256 不变）/版本契约——**patch 此前唯一检测手段是"装完人肉看行为"**。
4. `tests/knowledge-graph-deep-audit.test.ts`（16）：连通分量/入口可达/单向边全景/
   followUp 断联/model 双向绑定/桥接——真实图形态 characterization。
5. `tests/terminology-qa.test.ts`（6）：守门约束（系统术语覆盖、override 死键、输出确定性）
   + 真实词典基线。
6. `tests/bioscope-data-invariants.test.ts`（11）：3-5-1 Rule 静态部分（related≤5、
   coreFunctions≤3——文档宣称、此前零测试）+ lightReactionSteps 健全性（BIO-002A 数据基座）
   + bioscope-core 导航纯函数。

**工具（2 个只读审计脚本）**：`scripts/audit-knowledge-graph-deep.ts`（图深审引擎）、
`scripts/audit-terminology-qa.ts`（术语 QA 引擎）——均经 vitest 执行、输出逐字节确定。

## 6. Audit Artifacts（docs/audit/ 共 14 份）

ARCHITECTURE-MAP-v1 · TEST-COVERAGE-MATRIX-v1 · KNOWLEDGE-GRAPH-AUDIT-v2 ·
TERMINOLOGY-QA-v1 · PHOTOSYNTHESIS-ARCHITECTURE-v1（**MechanismStep=PARTIAL FIT** + MVP
最小补充清单 8 项）· CODE-LIFECYCLE-INVENTORY-v1（0 文件级死码；Top5 误删陷阱）·
CAMERA-PATCH-RISK-v1 · BUILD-DEPLOYMENT-RISK-v1（clone→运行可重复性矩阵）·
DEPENDENCY-RISK-v1（逐依赖风险表）· PERFORMANCE-RISK-v1（实测 N=807；3 条随 N 放大的
浪费路径）· ACCESSIBILITY-AUDIT-v1（1 SEVERE + 9 MODERATE）· AI-COMPANY-STATE-AUDIT-v1 ·
**INDEPENDENT-REVIEW-v1（Track O 陌生复审，8/10，含对本审计的对抗修正）** ·
ENGINEERING-BACKLOG-PROPOSAL-v1（P0×4 / P1×5 / P2×7 / P3 / DEFER / CEO / BIOLOGY / WONT-FIX）。

## 7. Top 10 Confirmed Findings（已验证事实）

1. **元风险：仓库无 git remote、无 CI**——全部护栏资产只存在于单机未合并分支（Track O 独立发现）。
2. **vinext 生产路径 `public/models/` 为空**→ anatomy GLB 404；且无 deploy 脚本，README 部署叙事
   与仓库能力不符（README 已加 caveat）。
3. **神经系统链（brain/nervous-system/neuron/neural-signal）从学习入口 Related 不可达**；
   `{light-reactions, thylakoid}` 为有向死端 2-环；5 个植物结构全孤岛。
4. **全图 69 对单向边**（BIO-004 的图级量化，#001 只测了核心链 3 处）。
5. **`musculoskeletal` 系统筛选无中文术语**（CONFIRMED，breadcrumb 回落英文，违 D-005）。
6. **picking `getAncestors` 对 cyclic parentId 无环保护→挂死**（生产 atlas 是树，实际风险低，
   已按复审异议列入 P2 修复）。
7. **camera patch 结构性矛盾**：`^0.1.6` caret × 逐字符 token 锚；叠加 pnpm 10 默认阻止
   postinstall、`--ignore-scripts` 静默路径、契约测试非 hermetic（Track O 补充）。
8. **`appearance` 每渲染新对象**→ 每次鼠标移动触发第三方全场景 traverse + 材质 needsUpdate
   （实测 N=807；单机预览下为"最划算修复"而非"高危"——复审校准）。
9. **分类器子串碰撞**：`Ulnar nerve`/`Fibular artery` 命中 skeleton 层（'ulna'/'fibula' 子串）；
   `Vena cava`/`Aortic valve`/`Gluteus maximus` 等词表 MISS，依赖 atlas 元数据兜底。
10. ** anatomically 重要**：`corpus spongiosum of penis` 与 `corpus cavernosum` 同被译为
    「阴茎海绵体」（疑错译，BIOLOGY REVIEW）；`human` related 已 5/5 满配（补边约束）。

## 8. Top 10 Suspected Findings（需人工/产品/生物判断）

1. 教学内容正确性系统性风险：verified 术语仅 13 条、unverified 无标记直出 UI（复审升级）。
2. a11y S1：光合模块进入类囊体层唯一入口是 3D 点击（缺陷真实；定级 SEVERE vs 上线前必修有争议）。
3. photosynthesis `enterScene` 的 setTimeout 未清理 → 快速连续触发时 cameraOwnership 竞态。
4. 魔法数共调族（430/460/470/110ms、0.16、14）无单一事实源。
5. characterization 基线维护税：内容迭代需连改 4-6 个测试文件，长期有"改测试让它绿"滑坡。
6. MechanismStep 呈现字段（duration/cameraTarget/visualState）零消费 → "看似支持机制"的迷惑源。
7. 远端 catalog（atlas.vanatome.vixotic.in + buildId 严格校验）是运行时隐性单点。
8. lockfile 100% 绑定 npmmirror（海外/CI 安装风险）。
9. `enterScene` 门禁 mesh id（granum/thylakoid）与 viewer 硬编码 id 三处重复，易漂移。
10. CameraRig 首帧 controlsRef 为 null 时 fromTarget 退化为原点（当前时序掩盖）。

## 9. 原本认为是问题、后来证明不是

1. **3-5-1 数据约束违规**——实测 46 节点全部满足（现已固化为守门测试）。
2. **modelNodeMap 双向失配**——0 失配，knowledge↔model 两向完全一致。
3. **sharedKnowledgeNodeIds 桥接失效**——巨分量已自然跨 anatomy+plants 连通，桥接健康。
4. **nameOverrides 死键**——0 个；**structures 内部同名 zh**——0 个。
5. **atlas 规模 4000-8000 的性能恐慌**——实测 807；当前无感知卡顿（性能项按性价比重排）。
6. **NaN 坐标会破坏 picking 确定性**——实测 NaN 分数回退 id 字典序，行为仍确定（KNOWN BEHAVIOR）。
7. **知识图跨模块断裂**——41 节点巨分量已含两模块，无需担心"植物/人体两张图"。
8. **`.ai-company` 文档虚构能力**——Track N 逐项对照：无一处"文档说有、代码没有"。

## 10. CEO DECISION REQUIRED

1. **CED-1~8（知识补边/内容小修）**：核心链 3 反向边、stomach 自引用、heart.keyStructures
   自绑定、chloroplast 重复绑定、human→nervous-system（**注意 human related 5/5 满配**，
   需同时决策 3-5-1 Rule 的 related≤5 是否放宽）、chloroplast→thylakoid 回边、植物孤岛挂接、
   followUps 跨域跳转设计化。复审建议：**与 BIO-005 打包成一次内容版本**，避免碎片化改基线。
2. **S1 键盘路径**：光合模块键盘/读屏用户到达类囊体层的替代通道（关键结构条目改按钮模式）。
3. **D-011**：MechanismStep 呈现字段（duration/cameraTarget/visualState）保留/立约定/删除
   ——BIO-002A 批准时一并拍板（抽象判定 PARTIAL FIT，见 PHOTOSYNTHESIS-ARCHITECTURE）。
4. **D-010**：知识守护层（validator + 3 审计 + characterization 模式）补录为正式决策。
5. **R9**：部署叙事——补 deploy 脚本或 README/ROADMAP 降级为 NOT NOW。
6. **M8 对比度**：全局视觉基调属 CEO，工程侧不擅自替换。

## 11. BIOLOGY REVIEW REQUIRED

1. `corpus spongiosum of penis` →「阴茎海绵体」疑似错译（应为「尿道海绵体」）。
2. 部分翻译语料批量复核（如 臀中 → 臀中肌）；unverified 是否该在 UI 标记（联动 CEO #10-1）。
3. 分类器 MISS 名单的词表补充（Gluteus/Biceps/Sternocleidomastoid/Vena cava/Aortic valve 等）
   ——需先取真实 atlas 的 system 元数据样本再定。

## 12. Regression Risks

- **低**：本轮 0 行生产行为改动（app/components/lib 既有文件、data/ 全部未触碰）；
  Camera/picking/filters/terminology 行为全部由 characterization 套件锁定——**改了测试没改生产**，
  DSH 只需确认测试基线符合预期。
- **中低**：characterization 基线（knowledge-graph 组 10、deep-audit 组 2、chain-audit 组 2、
  filters 碰撞矩阵）意味着未来任何数据/词表变更会**有意**红测试——复审提醒的"维护税滑坡"
  需要团队纪律对冲（建议：改基线的 commit 必须在 message 里引用决策编号）。
- **中低**：camera-patch-contract 幂等用例会在测试内运行 patch 脚本（非 hermetic）；
  若未来有人在未安装/半安装状态跑测试，行为需重新评估（已记录，未改）。
- `npm test` 从 145→247 用时仍 <1s；`validate:knowledge`/`audit:knowledge-chain` 输出确定性，
  可直接进 CI。

## 13. Recommendations for DSH CTO（按优先级；复审员建议 + EM 补充）

1. **先拍三件元事项**（复审员原文）：① 加 git remote/备份并合并两个夜班 branch（我无权 merge）；
   ② 锁 vanatome-react 精确版本（P1-2，XS）；③ 建最小 CI（一条 `npm test` + tsc workflow）。
2. Review 顺序建议：先读本报告 → `git log cccea33..night-shift/2026-09-03-deep-assurance`
   → 抽读 INDEPENDENT-REVIEW-v1.md（对抗视角）与 ENGINEERING-BACKLOG-PROPOSAL-v1.md（决策清单）
   → 其余 13 份按需。
3. 批准 P0×4（gitignore、appearance useMemo、术语记忆化、a11y Top3）——全部 XS/S、零行为争议。
4. 对 Backlog 的 D-1 升级（getAncestors 环防御）与 CED 打包策略表态。
5. 把 docs/audit/ 纳入 onboarding 必读（AGENTS.md §8 增补一行——已留待 DSH，未擅自改团队规则）。

## 14. 最值得保留的工作

1. **6 个新测试文件（89 tests）**——尤其 validator 组 9b、camera 契约 1-3 组、picking 畸形输入/
   selectable、碰撞矩阵行（复审点名认可的真资产）。
2. **docs/audit/ 14 份报告**——证据密度（行号级引用 + 可复现命令）使未来 Agent 可直接执行,
   无需重新调查。
3. **2 个只读审计脚本**——数据/词表演进时的常备体检工具。
4. **ENGINEERING-BACKLOG-PROPOSAL-v1**——DSH 的决策底稿（含 WONT-FIX 清单防止未来 Agent
   反复报告同一"问题"）。
5. **`.ai-company` 3 处事实修正**（ROADMAP Sprint 状态、PROJECT lib 清单、README caveat）。

## 15. 不建议合并（或需 DSH 明示接受后才合并）的内容

1. **无**。本轮无生产代码改动，全部为测试/审计/文档——没有需要从 branch 剔除的实现在。
2. 但按复审意见，以下内容**合并前值得 DSH 扫一眼**：
   - `tests/camera-patch-contract.test.ts` 的非 hermetic 幂等用例（接受/重写二选一）；
   - 约 8 处"确定性"断言与若干逐字快照（复审判为低价值但无害；删除属审美决策）；
   - `docs/audit/` 的行为快照数字（46/149/69/10 等）——合并后任何数据演进都会使其过时，
     文档头部已声明口径基准 commit。
3. `BIOSCOPE-DEEP-ASSURANCE-REPORT-2026-09-03.md`（本文件）与任务包文件
   `ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md`（仍 untracked，由 DSH 决定是否入库）。

## 16. 当前 git status

```text
On branch night-shift/2026-09-03-deep-assurance（工作区干净，除 untracked 任务包与本报告 commit）
11 commits ahead of cccea33（#001 HEAD）；master 未动；无 remote；无 push。
```

---

## Deep Assurance Result: **PASS**

理由：15 个 Track 全部执行并产出；最终验证全绿（tsc / 247 tests / validate errors:0 /
audit / local-build / lint 零新增）；工作方式符合授权（多 Pass、独立 Reviewer、零生产行为
改动、Evidence First、未 merge/未 deploy/未动冻结资产）。独立复审判定 8/10，其全部有效
修正已被采纳进 backlog 与报告。扣分项（元风险 remote/CI、部分恒真断言）均属 DSH 权限或
审美决策，已如实记录而非掩盖。

**按指示停止。**
