# BioScope — Board

> 任务看板。ID 用 BIO-XXX。Owner 记录责任方，Acceptance 写清"怎样算做完"。
> 只保留真正值得做的任务，不做几十条的空头清单。

## 状态列

- **BACKLOG**：已确认值得做，未排期
- **READY**：可立即开工
- **IN PROGRESS**：正在做
- **REVIEW**：待验收
- **BLOCKED**：被阻塞
- **FROZEN**：冻结（CEO 决策，不开发不删除）
- **DONE**：已完成

---

## IN PROGRESS

（无进行中任务）

## READY（待批准后开工）

### BIO-013A · Synapse Lab 突触传递机制 MVP（Spike 待 Astra 额度）
- **Owner**：Astra（Experimental 3D Engineer，实施）+ CTO/DSH（Review）
- **状态**：PRD READY（D1-D3 CEO 已拍板：模块局部轻量知识 / 阻断后保留全因果链 / 逐结构 hide-isolate）；**Astra Spike 任务包就绪，待 Astra 额度恢复后派发**
- **PRD/Task**：.ai-company/tasks/BIO-013A.md + .ai-company/tasks/BIO-013A-SPIKE-ASTRA.md
- **Spike Scope**：静态 synapse GLB 场景 + 3 交互（空间检查 / 逐结构 hide-isolate / Ca²⁺ 通道阻断 v0）；不碰机制导航、知识图、正式教学文案
- **红线**：正式教学文案进入 master 前必须完成 Biology Review（ChatGPT 学习/研究侧）；科学范围不含 NMDA/HH/扩散模拟

### 光合作用键盘可达性（a11y S1）· 已批准
- **Owner**：Engineer（下一 Sprint 分配 Task ID + AC）
- **状态**：CEO 已批准为正式工程/产品质量任务（2026-09-03）；本轮 merge 前不启动
- **背景**：键盘/读屏用户在叶绿体层被卡住（进入类囊体的唯一入口是 3D 点击）
- **验收标准**（下一 Sprint 细化）：关键结构条目改为 button（照 anatomy Key Structures 模式），键盘可到达类囊体层；不破坏指针体验

---

## FROZEN（CEO 决策，不开发不删除）

### BIO-003 · 旧 Plant 模块
- **状态**：DEPRECATED / FROZEN
- **Owner**：CEO（未来解冻决策）
- **说明**：允许阅读/参考/比较旧实现；禁止新功能、扩展、未经决策删除；待 Photosynthesis 架构成熟后再判断迁移价值

---

## BACKLOG（已确认，未排期）

### BIO-004 · 知识网络反向边补全
- **优先级**：中 · **Owner**：Engineer
- **验收标准**：核心链「肺→肺泡→氧气→血液→心脏→ATP→细胞呼吸→线粒体」可严格双向走通；脚本或测试验证
- **进展（2026-09-03 night-shift）**：只读审计基线已建立（`npm run audit:knowledge-chain`，
  scripts/audit-knowledge-chain.ts + characterization 测试）。当前 7 跳中 3 处单向：
  oxygen↛alveoli、atp↛heart、cellular-respiration↛mitochondrion。
  补边方案属知识语义变更，**BIOLOGY REVIEW REQUIRED**：CEO 已决定内容批次（CED-1~8）
  在 Biology Review 前不批准批量修改；工程团队保留证据与 Proposal，不修改正式知识内容。

### BIO-005 · 植物/光合作用节点补 Explore Questions
- **优先级**：中 · **Owner**：Engineer
- **验收标准**：光合作用/叶绿体/类囊体/光反应等核心植物节点补 WHY/HOW/WHAT IF（带答案 + followUps）；通过 tsc

### BIO-009 · picking "internal-structures" 可用性问题
- **优先级**：低 · **Owner**：CTO（先判断）+ Engineer
- **依赖**：产品判断该结构是否应可选中
- **验收标准**：确认心脏内部结构等应如何拾取；改 picking-manager 前先更新测试基线

---

## CONFIRMED TECH DEBT（P2，夜班验收确认，未排期）

- **P2 · camera patch contract 测试 hermetic 化**：当前幂等用例在测试内 `execFileSync`
  运行 patch 脚本，非 hermetic——已接受为已知技术债，不阻塞本次 merge，**暂不修**。
  详见 docs/audit/CAMERA-PATCH-RISK-v1.md。
- **P2 · 测试清理**：约 8 处恒真确定性断言 + 5 处 console.log 全文输出噪音。
  不阻塞 merge，**暂不清理**（避免为"美观"扩大夜班工作）。

---

## KNOWN RISKS（CEO 决策：本地优先）

- **无 git remote / 无 CI**：已确认为真实工程风险；CEO 决定项目继续保持本地。
  状态 = **KNOWN RISK**，记入 Engineering Backlog 为 **Future Infrastructure Decision**，
  等 CEO 日后决定启用远程仓库时再处理。当前不得自行建 repo / push / 配置云 CI。

---

## RESERVED（保留，当前不扩展）

### BIO-008 · Obsidian / content pipeline
- **状态**：RESERVED — DO NOT EXPAND（CEO 决策）
- **说明**：不实现、不扩展抽象、不删除预留代码（content-schema.ts + content/）；未来启动内容管线时重新设计

---

## DONE

### BIO-002A · Photosynthesis Mechanism Navigation MVP（P1）
- **Owner**：Codex（实施）+ CTO/DSH（独立验收）
- **分支**：feature/bio-002a-mechanism-nav（基于 master 4dda7d2 切出，6 commits；Task 文件 .ai-company/tasks/BIO-002A.md）
- **收编**：--no-ff merge 至 master，merge commit `b6cc11f`（2026-09-04）；pre tag `bioscope-pre-bio-002a-2026-09-04`；accepted tag `bioscope-bio-002a-accepted-2026-09-04`
- **验收结论**：**APPROVE** —— T1~T4 AC 全部达成；tsc 0 错；248/248 tests；validate errors:0；local-build exit 0；lint 0 新增；selectedId/hoveredId/emphasizedIds 无回归；6 步导航闭环（切换→状态高亮→mesh 强调→知识同步）；步骤/上下步均为真 button（Tab+Enter 可操作）；无「本阶段不播放」残留文案；data/knowledge 零改动、无 scope 漂移
- **验收小注**：commit `1504bc3` 为空 commit（无 diff，仅 message）；步骤描述在列表项与下方摘要重复展示；活跃步骤无 aria-current（超出 AC，可并入 a11y S1）

### BIO-001 · 修复 defaultKnowledgeNodeId 值不一致
- **Owner**：CTO
- **完成**：data/modules/registry.tsx 中 'human-body' → 'human'
- **验收**：tsc 通过；全项目无 'human-body' 残留

### BIO-006 · Establish Git Baseline（P0）
- **Owner**：CTO
- **完成**：commit 7dfcc07（112 文件，27791 行）；.gitignore 排除 node_modules/dist/.next/.wrangler/.vinext/.env/tsbuildinfo + 模型资产
- **验收**：build 通过（vinext build exit 0）；测试 23/23 通过；无敏感信息进入仓库

### BIO-007 · Root README（P0）
- **Owner**：CTO
- **完成**：commit b7fdcca；README.md 117 行，含定位/模块/技术栈/安装/运行/测试/目录结构/成熟度/AI onboarding
- **验收**：单独 commit；不复制 .ai-company 全文；指向 .ai-company 作为事实来源

### BIO-010 · AI Handoff Test（P0）
- **Owner**：独立 subagent + CTO Review
- **完成**：陌生 subagent 仅凭 README + .ai-company/ 回答 8 问；CTO 输出 Handoff Report（结论见 Midpoint Report）
- **验收**：8 问全部回答准确；暴露 4 处文档滞后，已修复
