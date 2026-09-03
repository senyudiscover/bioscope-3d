# BioScope ZCode Night Shift Report — 2026-09-03

> 执行环境：ZCode / GLM-5.3-Flash（夜班 Engineer + 独立 Review）
> 依据：`ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md`（DSH 生成于 2026-09-03 02:03 +08:00）
> 报告时间：2026-09-03 02:38 +08:00
> 状态：**已完成全部授权任务，停在 night-shift branch，未 merge master**

---

## 1. 开始状态（Phase 1 — State Reconciliation，02:12–02:24）

按 Task Packet §4 逐项执行，结果与 Packet §2 快照**完全一致**：

| 检查项 | 结果 |
|---|---|
| `git status --short --branch` | `master`，M `package.json` + 5 个 untracked 文件 + untracked Task Packet（与 §2.2 一致） |
| `git log --oneline -10` | `f367db5` / `b7fdcca` / `7dfcc07`（与 §2.1 一致） |
| `npx tsc --noEmit` | **通过**（exit 0） |
| `npm test` | **145 / 145 passed，4 test files**（picking 23 + filters 42 + terminology 50 + knowledge-graph 30） |
| `npm run validate:knowledge` | 30 tests passed；确定性输出 `nodes: 46 / relations: 149 / errors: 0 / warnings: 3 / infos: 52 / model reference checks: skipped`（与 §2.4 一致） |
| `.ai-company/BOARD.md` vs Packet §2.6 | **一致**，无差异需要记录 |

结论：磁盘上的旧 GLM Guardrails 工作全部健康，无来源不明修改，可安全纳入。

---

## 2. Branch 与 Commit 列表

- Branch：**`night-shift/2026-09-03`**（自 `master`@`f367db5` 创建；不存在重名，未用 `-b` 后缀）
- 后续所有 commit 只发生在该 branch；未 merge、未 push、未 reset、未 force push。

```text
115cee7 docs: sync test coverage and knowledge-graph guardrail facts          (NS-4)
81638b4 feat(guardrails): add read-only knowledge chain bidirectionality audit (NS-2)
23e1767 test(guardrails): cover 5 previously untested validator branches       (NS-1)
41e8297 test(guardrails): add anatomy-terminology regression suite             (Phase 3 · C)
9499bc1 test(guardrails): add anatomy-filters regression suite                 (Phase 3 · B)
5892449 feat(guardrails): add knowledge graph integrity validator              (Phase 3 · A)
```

## 3. 修改文件清单（相对 master）

```text
 .ai-company/BOARD.md                |   4 +
 .ai-company/PROJECT.md              |   9 +-
 .ai-company/ROADMAP.md              |   4 +-
 README.md                           |  14 +-
 lib/knowledge-graph-validator.ts    | 385 ++++++++++++++++++++++++   ← 旧 GLM 工作（Commit A）
 package.json                        |   2 +                            ← Commit A + NS-2 各加 1 个 script
 scripts/audit-knowledge-chain.ts    | 131 +++++++++                    ← 新增（NS-2）
 scripts/validate-knowledge-graph.ts |  69 +++++                        ← 旧 GLM 工作（Commit A）
 tests/anatomy-filters.test.ts       | 490 +++++++++++++++++++++++++   ← 旧 GLM 工作（Commit B）
 tests/anatomy-terminology.test.ts   | 325 ++++++++++++++++++++        ← 旧 GLM 工作（Commit C）
 tests/knowledge-chain-audit.test.ts | 138 +++++++++                    ← 新增（NS-2）
 tests/knowledge-graph.test.ts       | 581 +++++++++++++++++++++++++++ （513 旧 GLM + 68 NS-1）
 12 files changed, 2143 insertions(+), 9 deletions(-)
```

- 旧 GLM Guardrails 工作（validator + 3 个测试文件 + package.json script）**原样提交，未改动、未重实现、未删除**。
- `data/knowledge/*` **零改动**（3 个 WARNING 未顺手修，见 §6）。
- untracked `ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md` 保持未提交（DSH 的外部任务包，是否入库由 DSH 决定）。

## 4. 完成任务（对照 Task Packet）

### Phase 3 — 旧 GLM Guardrails 整合（P0）✅

- 在 night-shift branch 上复跑 `npx tsc --noEmit` + `npm test`（145 passed）后，按 Packet 分三个 commit 提交（A: validator+接线+script；B: filters 套件；C: terminology 套件）。
- 每个 commit 后跑 `npx tsc --noEmit`；Commit A 后跑全量 `npm test`。
- 完成标准全部满足：3 commit 在 branch 上、tsc 通过、145 passed、`validate:knowledge` errors: 0。

### Phase 4 — Knowledge Graph Validator 完成度确认 ✅

1. **可重复 / 确定**：测试组 10 断言两次运行结果逐字段一致 + 格式化全文逐字节一致；实测输出与 Packet §2.4 逐字一致。
2. **覆盖面**：通读 `lib/knowledge-graph-validator.ts`（385 行），10 大检查全部在位——merge collision、node id mismatch、missing related/followUp target、keyStructures 绑定（missing/self/duplicate）、modelRef 漂移、sharedKnowledgeNodeIds、modelNodeMap、microLab（terms/scenes/steps + alias 漂移）、图形态 INFO（orphan/leaf/reciprocal）。错误码为稳定字符串字面量（28 个），severity 分级（ERROR=必然坏引用 / WARNING=可疑 / INFO=图形态）清晰，适合 CI 比对。
3. **model reference checks 保持 `skipped`**：未传 `knownStructureIds`，零网络依赖，未改动。
- 未做可选扩展（`--json` 模式）：Packet 允许做但非必须；当前确定性文本输出已可 grep 比对，留待 DSH 决定是否需要（见 §8）。

### Phase 5（完成 3 个：NS-1、NS-2、NS-4）

#### NS-1 · 旧 GLM 测试与验证器独立 Review ✅（commit `23e1767`）

Review 结论（正面）：
- 三套测试断言的是**行为与语义**（错误码、消息要点、边界输入→输出），不是纯快照；仅有两组 characterization 基线（knowledge-graph 组 10、anatomy-filters D 组「污染现状」），且均在文件头/组内注释中**明示意图**（"修改数据前必须先更新此处"），符合本项目 picking 基线的既定模式。
- 错误码/消息确定性：无时间、随机、并发因素；Map 遍历按插入序，输出稳定。
- 硬编码 46 nodes / 149 relations / 40 reciprocal 的脆弱性是**有意的 characterization 设计**，有注释背书，不视为缺陷。

发现并修复的真实缺口：
- 验证器 28 个 issue code 中有 **5 个此前零测试断言**，其中 2 个是 **ERROR 级**：`MISSING_FOLLOWUP_TARGET`、`MISSING_KEY_STRUCTURE_NODE`（ERROR）；`EMPTY_MODEL_REFERENCE`、`MISSING_SCENE_PARENT`、`MISSING_SCENE_CHILD`（WARNING）。若重构破坏这些检测，**CI 不会失败**。
- 修复：新增测试组 `9b · 未覆盖分支补全`（5 个 fixture 测试），只改测试，未动验证器与数据。测试 145 → 150。

#### NS-2 · 知识图反向边现状审计（只读）✅（commit `81638b4`）

- 新增 `scripts/audit-knowledge-chain.ts`（纯只读分析：逐跳 forward/reverse 检查 + 节点出/入度 + 确定性输出）+ `tests/knowledge-chain-audit.test.ts`（8 tests：4 类跳语义 fixture + 真实数据 characterization）+ `npm run audit:knowledge-chain`。
- **核心链实测结果**（`lungs → alveoli → oxygen → blood → heart → atp → cellular-respiration → mitochondrion`，7 跳）：
  - 双向可走 4 跳：lungs↔alveoli、oxygen↔blood、blood↔heart、atp↔cellular-respiration
  - **单向断点 3 处**：
    1. `alveoli → oxygen`（transports）有，`oxygen → alveoli` 缺
    2. `heart → atp`（requires）有，`atp → heart` 缺（atp 只指向 cardiomyocyte，即心脏的下游细胞）
    3. `cellular-respiration → mitochondrion` 缺，反向 `mitochondrion → cellular-respiration`（related_to）有
- **未补任何数据边**（Packet 禁止）；补边方案见 §6 CEO Decision Required。

#### NS-4 · 文档一致性 ✅（commit `115cee7`）

- `README.md`：测试段落「当前覆盖 lib/picking-manager」已过时 → 更新为 5 套件 + `validate:knowledge` / `audit:knowledge-chain` 入口；目录结构补 knowledge-graph-validator、guardrail 脚本、新测试文件。
- `.ai-company/PROJECT.md`：测试章节补齐 guardrail 层；**纠正植物节点数 13 → 12**（实测 anatomy 34 + plants 12 = 46，与验证器 nodeCount 一致，原"13"与代码不符）。
- `.ai-company/ROADMAP.md`：LATER「测试覆盖扩展（目前只有 picking-manager 有测试）」→ 标注已部分完成；NEXT「知识网络反向边」挂上只读审计基线指引。
- `.ai-company/BOARD.md`：BIO-004 增补 night-shift 审计进展（3 处单向断点 + 待 CEO 决策）。
- 只改文档；未复制 `.ai-company` 大段内容，保持 README 作为入口的分工（遵循 AGENTS.md §8）。

### 未启动（按 Packet 约束）

- BIO-002A / BIO-005 / BIO-009、Brain、Muscle Explorer、Protein Viewer、AI Tutor、User System、UI redesign、Plant 删除——全部未触碰。
- NS-3（anatomy 测试加固）与 NS-5/NS-6（a11y / 性能审计）未做：NS-1/NS-2/NS-4 已满足"选做 1–3 个"；NS-3 复审两套 anatomy 测试后判断覆盖已很密（filters 含祖先链/元数据保真/边界，terminology 含三级 fallback 全路径），再补边角属于凑数，故按 Packet「不追求数量」原则主动收敛。NS-5/NS-6 可作下次任务包候选（见 §8）。

## 5. 新增测试及数量

| 文件 | 测试数 | 来源 |
|---|---|---|
| `tests/knowledge-graph.test.ts` | 30 → **35**（+5，组 9b） | 旧 GLM + NS-1 |
| `tests/anatomy-filters.test.ts` | 42 | 旧 GLM（Commit B） |
| `tests/anatomy-terminology.test.ts` | 50 | 旧 GLM（Commit C） |
| `tests/knowledge-chain-audit.test.ts` | **8** | 新增（NS-2） |
| `tests/picking-manager.test.ts` | 23 | 既有基线，未动 |
| **合计** | **158 / 158 passed（5 files）** | 夜班前 145 |

## 6. 最终验证结果（02:36，branch HEAD = 115cee7）

| 命令 | 结果 |
|---|---|
| `npx tsc --noEmit` | **通过**（exit 0） |
| `npm test` | **158 / 158 passed（5 files）** |
| `npm run validate:knowledge` | 35 tests passed；`nodes: 46 / relations: 149 / errors: 0 / warnings: 3 / infos: 52 / model reference checks: skipped` |
| `npm run audit:knowledge-chain` | 8 tests passed；核心链 7 跳 = 4 双向 + 3 单向（输出见 §4 NS-2） |
| `npm run lint`（oxlint） | 19 errors，**全部位于 `components/ui/*` 与 `hooks/use-mobile.ts`**（AGENTS.md DoD 明示豁免的历史遗留）；本轮新增/修改文件 **0 lint error** |
| Camera 行为 | 未触碰任何渲染/相机/picking 代码，`scripts/patch-vanatome-camera.mjs` 未动 |

## 7. 未解决问题

1. `validate:knowledge` 经由 vitest 执行（因数据层 `@/` 别名 + 无扩展名导入无法被 Node type-stripping 解析，接线层注释已说明）。功能正确，但意味着该命令隐式依赖测试基建；若未来拆 CI 步骤，可考虑 `--json` 输出模式（Phase 4 可选扩展，未做，见 §8）。
2. anatomy-filters 的已知分类"污染"（tendon/ligament 计入肌肉层、Spinalis 落入 neurovascular）已由旧 GLM 测试锁定为基线——是**记录现状**而非认可，医学正确性修正属知识/产品判断，未处理。
3. NS-5 accessibility 审计、NS-6 性能调查、验证器 `--json` CI 模式：本次未做（时间与优先级内主动收敛），建议进入下次任务包。

## 8. CEO Decision Required

以下 4 项均超出工程授权（涉及知识语义 / 产品 / 排期），已记录、未擅改：

### CED-1 · 补核心链反向边（BIO-004，需 CEO 批准后由 Engineer 执行）

| 拟补边 | 建议关系类型 | 一句话理由 |
|---|---|---|
| `oxygen → alveoli` | `participates_in` | 氧气正是在肺泡处扩散入血，肺泡是氧的交换位点 |
| `atp → heart` | `supports` | ATP 供心脏持续搏动；现有 atp→cardiomyocyte 只到细胞层 |
| `cellular-respiration → mitochondrion` | `related_to` | 细胞呼吸的氧化磷酸化发生在线粒体；现只有反向边 |

优点：核心学习链严格双向可走通（BIO-004 验收标准达成），Related 徽标/原因文案已有现成模式。缺点/成本：每条边占该节点 related 配额（约束：每节点最多 5 关联——oxygen 当前 3、atp 当前 3、cellular-respiration 当前 3，均有余量）；补边后需同步更新 `tests/knowledge-chain-audit.test.ts` 的 characterization 基线（有意设计，改数据必须先改测试）。**推荐：批准 3 条全部补上**，一次性满足 BIO-004。

### CED-2 · `stomach.exploreQuestions.why.followUps` 含自身（`anatomy.ts:420`）

`followUps: ['gastric-acid', 'stomach']` —— "继续探索"芯片会指回当前节点本身，疑似编辑失误。建议：删除 `'stomach'`（保留 gastric-acid）。代价：why 问题下从 2 个后续入口变 1 个。涉及知识内容呈现，未修。

### CED-3 · `heart.keyStructures[0]` 绑定节点自身（`anatomy.ts:221`）

条目 `{ id: 'heart', nameZh: '心房', modelRef: 'heart-right-atrium' }` —— 按 schema（"id 指向知识节点"）该条目把"心房"这个结构绑到了 heart 知识节点自身。建议：删除 `id: 'heart'`、保留 `modelRef`（3D 绑定不受影响）；是否让"心房"另绑某知识节点（注册表中无 atrium 节点）属知识建模判断。未修。

### CED-4 · `chloroplast.keyStructures` 重复绑定 `thylakoid`（`plants.ts:241-242`）

「类囊体」与「基粒」两条 keyStructures 的 `id` 都指向 `thylakoid` 节点。基粒=类囊体堆叠，语义上可辩护，但 UI 会渲染两张指向同一知识节点的卡。建议：二选一（删一条，或第二条去掉 `id` 只留名称/模型）。涉及知识内容判断，未修。

## 9. Regression Risk（DSH Review 关注点）

- **低**：旧 GLM 三个 commit 为原样落盘提交，且夜班前已 145/145 通过；本轮仅新增测试与只读脚本，未改任何业务代码（`app/`、`components/`、`lib/` 既有文件、`data/` 全部零改动）。Camera/picking 行为不可能受影响（相关文件未触碰）。
- **中低（唯一值得盯的点）**：knowledge-graph 组 10 与 knowledge-chain-audit 组 2 是 characterization 基线——**未来任何 `data/knowledge/*` 增删（包括批准 CED-1～4）都会先红测试**，这是有意设计；DSH Review 时请确认团队理解"红=有意识更新基线"而非"测试坏了"。
- `package.json` 仅 +2 个 script，无依赖变化，`postinstall` patch 未动。

## 10. 当前 git status（报告写入时）

```text
## night-shift/2026-09-03
?? ZCODE-NIGHT-SHIFT-TASK-PACKET-v0.1.md
```

工作区干净（除 DSH 的任务包文件保持 untracked；本报告文件 commit 后也会出现在此处——见 §12 步骤 0）。

## 11. DSH 明早 Review 建议

```bash
# 0. 本报告与任务包本身不在 diff 里，先确认它们的存在与内容
cat BIOSCOPE-ZCODE-NIGHT-SHIFT-REPORT-2026-09-03.md

# 1. commit 列表（6 个，全部应只落在 night-shift branch）
git log --oneline master..night-shift/2026-09-03

# 2. 体量与文件面（重点：不应出现 app/ components/ data/ lib/既有文件）
git diff master...night-shift/2026-09-03 --stat

# 3. 旧 GLM 工作是否被"原样"收编（diff 应为空 = 与落盘时逐字一致难以直接验，
#    可改为抽查三个 commit 各自只含预期文件）
git show --stat 5892449 9499bc1 41e8297

# 4. 夜班自己的两个工程 commit（NS-1 / NS-2）
git show 23e1767        # 5 个未测验证器分支的补测
git show 81638b4        # 只读链审计 + characterization 基线
git show 115cee7        # 文档一致性（含植物节点数 13→12 纠错）

# 5. 独立复跑验证
git checkout night-shift/2026-09-03
npx tsc --noEmit
npm test                          # 期望 158/158
npm run validate:knowledge        # 期望 errors: 0
npm run audit:knowledge-chain     # 期望 3 处 ONE-WAY 与报告 §4 一致
```

重点看什么：
1. NS-1 的 5 个补测是否同意收编（尤其 `MISSING_KEY_STRUCTURE_NODE` / `MISSING_FOLLOWUP_TARGET` 这两个 ERROR 级的断言方式）；
2. NS-2 的 characterization 基线模式是否符合团队对"行为快照"的既定用法；
3. §8 的 4 项 CEO Decision（CED-1 补边 / CED-2、3、4 三个数据小修）如何拍板；
4. 植物节点数纠错（13→12）与 BOARD/ROADMAP 措辞是否认可。

## 12. 夜班结束状态

- 06 个 commit 全部在 `night-shift/2026-09-03`；master 未动。
- 全部 Definition of Done 项满足（tsc / test / lint 无新增 / Camera 未触碰 / `.ai-company` 按需更新 / 本报告）。
- 本报告写入仓库根目录并作为收尾 commit 提交到 night-shift branch。

**Night Shift 完毕，按指示停止。**
