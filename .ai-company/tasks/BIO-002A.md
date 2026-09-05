# BIO-002A — Photosynthesis Mechanism Navigation MVP

> Task / Handoff 文件。Owner：Codex（Senior Engineer）· 委派：CTO/EM（DSH）
> 状态：READY FOR IMPLEMENTATION（2026-09-03，CEO 已批准为下一阶段唯一核心 Milestone）
> 分支：`feature/bio-002a-mechanism-nav`（从当前 master `4dda7d2` 切出）

---

## 0. 你接手前必读（按顺序）

1. `.ai-company/AGENTS.md` — 团队规则、Definition of Done、升级协议
2. `.ai-company/PROJECT.md` — 项目是什么、架构
3. `.ai-company/BOARD.md` — 当前看板（BIO-002A 状态）
4. `.ai-company/DECISIONS.md` — 尤其 D-001（知识/模型解耦）、D-002（知识/模型语境分离）
5. `docs/audit/PHOTOSYNTHESIS-ARCHITECTURE-v1.md` — **本任务的技术细节来源**（8 项最小清单 + 精确行号 + mesh id 表）
6. 必要代码：`app/photosynthesis-workbench.tsx`、`components/photosynthesis/photosynthesis-viewer.tsx`、`data/photosynthesis/micro-lab.ts`、`lib/bioscope-core.ts`

不要只看本文件。PHOTOSYNTHESIS-ARCHITECTURE-v1.md 里有你需要的行号和 mesh id 清单，
以磁盘代码为准（审计文档行号若因 merge 有 ±2 偏移，以实际代码为准）。

---

## 1. 目标（CEO 原话）

> 让用户能够在类囊体层沿着 6 个光反应步骤进行连续学习，并让知识内容、
> 步骤状态与 3D 结构产生明确联动。

一句话验收：用户在 thylakoid（类囊体）场景下，能**连续地、可感知地**遍历 6 个光反应步骤，
每一步都能看到「当前是第几步 + 这一步讲什么 + 对应 3D 结构被高亮 + 相关知识同步」。

---

## 2. Scope 边界（CEO 明确约束，违反 = 返工）

本 Milestone 只做 BIO-002A。以下**全部禁止**：

- ❌ 不改知识图数据（`data/knowledge/*` 零改动；不补边、不改术语）
- ❌ 不做术语治理（`lib/anatomy-terminology.ts` 零改动）
- ❌ 不做性能优化（不碰 `lib/picking-manager.ts`、`lib/anatomy-filters.ts`、useMemo 边界）
- ❌ 不做死代码清理（唯一例外见 T4，仅限明确列出的两项）
- ❌ 不因任何 audit Finding 顺手扩任务（PHOTOSYNTHESIS-ARCHITECTURE 里的 bug 记录如无必要不修）
- ❌ 不并入现有其他 a11y 技术债（只保证 BIO-002A 新增交互本身键盘可操作）
- ❌ 不碰旧 Plant 模块（FROZEN）、不碰 Obsidian/content（RESERVED）

**唯一允许的跨模块改动**：`lib/bioscope-core.ts`（加步骤遍历 helper，见 T1）。

---

## 3. 任务拆解（4 个 Task，按依赖顺序）

### T1 — 数据层：步骤→mesh 映射 + 遍历 helper + alias 收敛

**文件**：`data/photosynthesis/micro-lab.ts`、`lib/bioscope-core.ts`

**内容**：
1. 给 `lightReactionSteps` 每个步骤加 `meshIds: string[]` 字段，指向 viewer 中真实存在的 mesh id。
   建议映射（可微调，但 id 必须与 viewer 实际 mesh id 一致）：
   - `photon-absorption` → `['photosystem-ii']`
   - `water-oxidation` → `['thylakoid-lumen']`（水/O₂ 无专属 mesh，借腔体示意）
   - `electron-transport` → `['electron-transport']`
   - `proton-gradient` → `['thylakoid-lumen']`
   - `atp-synthesis` → `['atp-synthase']`
   - `nadph-formation` → `['photosystem-i']`
2. 加 `getAdjacentMechanismSteps(steps, id)` helper（返回 `{ prev?, next? }`），放在 `lib/bioscope-core.ts`。
3. 收敛 `relatedKnowledgeNodeIds` 别名：要么删除该字段并让 UI 改用 `knowledgeNodeIds`，
   要么在数据层派生 `relatedKnowledgeNodeIds: [...knowledgeNodeIds]`。二选一，不要双写两份字面量。

**AC**：每个步骤都有非空 `meshIds`；helper 对首/末步骤返回正确的单边；
`npm run validate:knowledge` 的 STEP_ALIAS_DIVERGENCE 警告消失（若保留 alias 则无警告）。

### T2 — Viewer 层：`emphasizedIds` 高亮通道

**文件**：`components/photosynthesis/photosynthesis-viewer.tsx`

**内容**：
1. 给 `PhotosynthesisViewerProps` 加 `emphasizedIds?: string[]`。
2. 把该数组穿透到需要高亮的 mesh；高亮逻辑与现有 `selectedId`/`hoveredId` 的 `active` 判断**并存不互斥**。
   （步骤强调与用户选中是两个视觉语义，可用不同颜色/强度区分。）
3. 保持现有 `selectedId`/`hoveredId` 行为**完全不变**（这是回归红线）。

**AC**：传入 `emphasizedIds=['atp-synthase']` 时，ATP合酶 mesh 有可感知的强调；
不传时与当前渲染完全一致。

### T3 — Workbench 层：步骤状态 + 导航 UI + 知识联动 + 键盘

**文件**：`app/photosynthesis-workbench.tsx`

**内容**（这是本 Milestone 的核心）：
1. 加 `activeStepId` state（初始为 null 或第一步），以及 prev/next 切换 handler。
2. 把当前占位「MECHANISM / PHASE 2 …已预留 N 个步骤」升级为**真正的步骤导航 UI**：
   - 显示 6 步列表（步骤标题 + 一句话描述）
   - 当前步骤有明确视觉状态（高亮）
   - 「上一步 / 下一步」按钮（键盘可聚焦、可用 Enter/Space 触发）
   - 若可行，支持方向键切换（bonus，非硬性）
3. **知识联动**：当前步骤的 `knowledgeNodeIds` 同步到知识面板（调用现有 `chooseKnowledgeNode` 链路）。
4. **3D 联动**：当前步骤的 `meshIds` 作为 `emphasizedIds` 传给 viewer。
5. 步骤导航 UI 仅在 `scene === 'thylakoid'` 时可见（这是 CEO 指定的「类囊体层」场景）。
6. 步骤切换时的相机：最低要求是**不破坏现有相机行为**；可选加分项是复用现有 `focusPoses`
   做轻量运镜（但不得引入新回归）。

**AC**：
- 用户在 thylakoid 层能看到 6 步导航，能鼠标 + 键盘前后切换
- 当前步骤有明确状态，且对应 mesh 有强调
- 当前步骤的知识内容同步到右侧知识面板（可点击进入对应知识节点）
- 键盘用户能用 Tab 到达「上一步/下一步」按钮并用 Enter 触发

### T4 — 文案清理 + 死代码处置

**文件**：`app/photosynthesis-workbench.tsx`、`data/photosynthesis/micro-lab.ts`

**内容**（仅限这两项，不扩大）：
1. 删除「本阶段不播放粒子或反应动画」这类过期文案（被 T3 的导航 UI 取代）。
2. 处置 `nextPhotosynthesisScene` 死导出（`micro-lab.ts`）：随 T3 一并裁决，删除或保留需明确理由。

**AC**：无「本阶段不播放…」残留；`nextPhotosynthesisScene` 有明确处置结论。

---

## 4. 测试标准

**现有测试（回归红线）**：
- `npm test`：247 个测试**必须全绿**（尤其 `knowledge-graph*.test.ts`、`knowledge-chain-audit.test.ts`，
  若 T1 改动 micro-lab 数据触发它们变红，先判断是「真实破坏」还是「基线需更新」，再处理；
  不得为了让测试变绿而无脑改期望值）。
- `npx tsc --noEmit`：0 错误。
- `npm run local-build`：exit 0。

**新增测试（要求）**：
- 为 `getAdjacentMechanismSteps` 加单测（首/中/末步骤的 prev/next 正确）。
- 为步骤数据加完整性测试：每个 `meshIds` 非空，且指向 viewer 中真实存在的 mesh id
  （用一个集中维护的「合法 mesh id 集合」断言，避免 mesh id 漂移）。

---

## 5. 分支与提交约定

1. 从 master（当前 `4dda7d2`，含本 task 文件与 BOARD/ROADMAP 更新）切出分支：`git checkout -b feature/bio-002a-mechanism-nav`。
2. 按 T1→T4 顺序实现，每完成一个 Task 做一次**语义化 commit**（如 `feat(data): add step→mesh mapping`）。
3. 不要 squash 成一个巨型 commit；不要 `git add .` 一把梭（分文件、分阶段暂存）。
4. 不要 merge 回 master，不要 push（无 remote），不要动其他分支。

---

## 6. 完成后报告（写给 CTO，CTO 会据此 Review）

在分支上完成后，输出一份报告，包含：
1. 每个 Task（T1-T4）的实际改动文件清单 + 一句话说明
2. `npm test` / `tsc` / `local-build` 的实测结果
3. 新增测试的文件与数量
4. 步骤→mesh 的最终映射表（若与建议不同，说明原因）
5. 任何 Scope 内但未完成、或有意的取舍（诚实说明）
6. 是否触碰了 Scope 边界外的东西（若触碰，必须列明并解释）

---

## 7. CTO 验收清单（2026-09-04 独立验收结果：APPROVE）

- [x] diff 只涉及 4 个文件的预期范围，无 scope 漂移（4 源码文件 + 1 测试文件，无 data/knowledge）
- [x] `data/knowledge/*` 零改动
- [x] 247 个既有测试全绿，新增测试有意义（meshIds 合法性对集中合法集合断言；首/中/末遍历）
- [x] tsc / local-build 通过
- [x] 现有 selectedId/hoveredId 高亮行为无回归（emphasizedIds 缺省时全部表达式回落原值）
- [x] thylakoid 层 6 步导航真正闭环：步骤切换 → 状态高亮 → mesh 强调 → 知识同步
- [x] 键盘可操作（Tab 可达 + Enter 触发；6 步列表与上一步/下一步均为真 button）
- [x] 无「本阶段不播放动画」残留文案

验收小注（不阻塞）：`1504bc3` 为空 commit（无 diff）；步骤描述双重展示（列表项 + 摘要行）；
活跃步骤无 aria-current（超出 AC，并入 a11y S1）。收编：merge `b6cc11f`（--no-ff，2026-09-04）。

---

*本文件由 CTO 生成，是 DSH 与 Codex 的正式交接渠道。Codex 从磁盘读取本文件与 .ai-company/，
不需要 CTO 在对话里重复粘贴 prompt。*
