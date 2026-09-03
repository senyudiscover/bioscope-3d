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

## READY（待批准后开工）

### BIO-002A · Photosynthesis Mechanism Navigation MVP（P1，Stretch）
- **Owner**：Engineer（可派 subagent）+ Reviewer
- **依赖**：BIO-006/007/010 完成 + CEO 批准
- **验收标准**：利用现有 lightReactionSteps 做前后切换 + 当前步骤状态 + 知识/机制内容同步；不做完整动画；独立 Reviewer 检查；验证 MechanismStep 抽象是否够用

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
  补边方案属知识语义变更，待 CEO 决策（见 Night Shift Report 2026-09-03）。

### BIO-005 · 植物/光合作用节点补 Explore Questions
- **优先级**：中 · **Owner**：Engineer
- **验收标准**：光合作用/叶绿体/类囊体/光反应等核心植物节点补 WHY/HOW/WHAT IF（带答案 + followUps）；通过 tsc

### BIO-009 · picking "internal-structures" 可用性问题
- **优先级**：低 · **Owner**：CTO（先判断）+ Engineer
- **依赖**：产品判断该结构是否应可选中
- **验收标准**：确认心脏内部结构等应如何拾取；改 picking-manager 前先更新测试基线

---

## RESERVED（保留，当前不扩展）

### BIO-008 · Obsidian / content pipeline
- **状态**：RESERVED — DO NOT EXPAND（CEO 决策）
- **说明**：不实现、不扩展抽象、不删除预留代码（content-schema.ts + content/）；未来启动内容管线时重新设计

---

## DONE

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
