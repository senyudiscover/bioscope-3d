# BioScope .ai-company Truth Audit v1

> Deep Assurance #002 · Track N 产出（2026-09-03）。
> 把 PROJECT / ROADMAP / BOARD / DECISIONS / AGENTS / LEARNING 与真实代码逐项对照
> （对照依据：本轮 Track A/I/J/L/M 的代码级证据 + #001 的整合）。
> 处理原则：明确事实滞后 → 已修（本 commit 内）；产品判断 → CEO DECISION REQUIRED。

---

## 1. 逐文件判定

### PROJECT.md — 总体健康（本轮修 2 处滞后）

| 声明 | 对照结果 |
|---|---|
| 模块状态（anatomy stable / photosynthesis BETA / plant FROZEN） | ✅ 与 registry.tsx + BOARD 一致 |
| 技术栈表（vinext beta.5 / react 19.2.6 / three 0.180 / vitest 4.1.11 / Node>=22.13） | ✅ 与 package.json/lockfile 一致（Track M 逐项核对） |
| 双构建路径描述 | ✅ 一致；但"生产"叙事见 README 项（下） |
| 知识节点 34+12=46 | ✅（#001 纠正 13→12 后与 validator nodeCount 一致） |
| "每个知识节点最多 3 个核心功能、最多 5 个关联" | ✅ 声明为真——且 #002 已把静态部分固化为测试（bioscope-data-invariants） |
| 技术债 4 条（plant 重复 / content 管线零引用 / 死符号 / picking 魔法常量） | ✅ 全部被 Track I/J 独立复核确认 |
| ~~§3 中间层 lib 清单缺 knowledge-graph-validator~~ | **STALE → 已修**（本 commit 补入） |
| §4 测试小节 | ✅（#001 已更新；#002 再扩 6 个测试文件，见 README 项） |

### ROADMAP.md — 发现 1 处 STALE（已修）

| 项 | 判定 |
|---|---|
| NOW 表：BIO-006/007/010 标"Sprint 进行中" | **STALE/CONFLICT**：BOARD 中三者均为 DONE。→ 已修（本 commit 标注完成 + commit 号） |
| NEXT 四项 vs BOARD BACKLOG（BIO-004/005/009 + 术语 verified） | ✅ 一致；NEXT 未用 BIO id（AMBIGUOUS-轻微，建议 BOARD 增补 id 交叉引用，未动） |
| BIO-002A"待批准" | ✅ 与 BOARD READY(待 CEO) 一致；本轮补充了 PARTIAL FIT 判定链接 |
| LATER/RESERVED/NOT NOW/WON'T DO/FROZEN | ✅ 与 DECISIONS D-006/D-008 及代码现状一致 |
| ~~LATER"测试覆盖扩展：目前只有 picking-manager 有测试"~~ | （#001 已修为"部分完成"）✅ |

### BOARD.md — 健康

- DONE/READY/BACKLOG/FROZEN/RESERVED 与代码和决策一致；BIO-001（defaultKnowledgeNodeId
  'human'）经 #002 架构复查确认无回归（registry.tsx:29 defaultKnowledgeNodeId: 'human'）。
- BIO-009（picking internal-structures）与 picking 基线测试的"已知行为"注释一致。
- 缺口（MINOR）：#002 新增的审计/契约资产未登记为 BOARD 条目——建议 DSH 决定是否开
  BIO-011「产品/内容修正批次」（汇总 CED-1~8）与 BIO-012「性能 XS 批次」（PERFORMANCE Top5-1/3），
  或维持"审计报告即 backlog"的现状。**未擅自开卡。**

### DECISIONS.md — 健康，但缺 3 条已形成事实的决策记录（MISSING DECISION）

| 缺口 | 事实 | 建议 |
|---|---|---|
| D-010 候选：知识守护层 | validator + validate:knowledge + 2 个只读审计 + characterization 基线（"改数据先改测试"模式）已成既成事实（#001/#002），但无决策条目 | DSH 补录 |
| D-011 候选：MechanismStep 呈现字段 | duration/cameraTarget/visualState 零消费（Track G：PARTIAL FIT 主因）——保留/立约定/删除未决 | 与 BIO-002A 批准一起拍板 |
| D-012 候选：vanatome-react 锁版策略 | patch 契约 vs `^0.1.6` caret 矛盾（CAMERA-PATCH/DEPENDENCY 两报告） | CTO 决策 |

- 既有 D-001~D-009 逐条与代码对照：全部成立（D-002 modelContext 分离、D-003 patch、
  D-006 冻结、D-008 RESERVED、D-009 模型不入库均有直接代码证据）。

### AGENTS.md — 健康

- 职责/DoD/升级协议与两个夜班的实际执行一致；§8 文件事实源清单完整。
- MINOR：DoD #2 说"本地改 UI 跑 npm run local-build"——#002 全程未改 UI，未验证此路径
  （最终验证将补跑 local-build）；DoD 未提 `validate:knowledge`/`audit:knowledge-chain`
  这两个新增门禁，建议 DSH 考虑纳入（未擅自改团队规则）。

### LEARNING.md — 健康

- 三条学习记录均为方法论性质，无代码事实声明需要核对。

### README.md — 2 处滞后（本轮修 1 处，1 处保留）

| 项 | 判定 |
|---|---|
| "生产构建 npm run build / npm run start" | **OVERPROMISE**：vinext 链路人体模型 404（public/models 空）且无部署脚本（BUILD-DEPLOYMENT R1/R9）。→ 已修：加 caveat 指向审计文档 |
| tests/ 目录描述 | **STALE（轻微）**：#001 只列了 5 个测试文件，现在 11 个。→ 保留为"示例式列举"可接受，README 定位是入口不是清单；未改 |

## 2. 汇总

| 类别 | 数量 | 明细 |
|---|---|---|
| STALE（已修） | 3 | ROADMAP NOW 表、PROJECT lib 清单、README 生产构建 caveat |
| STALE（保留并说明） | 1 | README tests/ 列举不完整（入口文档定位） |
| CONFLICT | 1 | ROADMAP vs BOARD（Sprint 状态）——已随 STALE 修复消除 |
| MISSING DECISION | 3 | D-010/D-011/D-012 候选 |
| UNVERIFIED→已验证 | 6+ | 技术栈表、节点数、3-5-1 Rule、技术债 4 条、D-001~009、BIO-001 无回归 |
| AMBIGUOUS（记录未动） | 2 | ROADMAP NEXT 无 BIO id、BOARD 无审计资产条目 |

**总体结论**：.ai-company 体系经受住了逐项对照——没有发现"文档说有但代码没有"的虚构能力；
滞后集中在 Sprint 状态同步与 #001/#002 新资产的登记，均已识别并可低成本修复。

---
*生成：Deep Assurance #002 Track N。文档修正（ROADMAP/PROJECT/README）随本 commit 提交。*
