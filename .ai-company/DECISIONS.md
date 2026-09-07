# BioScope — Decisions Log

> 记录已经可以确认的重要设计决定。
> 凡是不确定真实原因的，写 UNKNOWN / NEED CEO CONFIRMATION，不编造历史。

---

## D-001 · 知识数据与 3D 模型彻底解耦
- **Date**：2025-08（v0.1 早期，代码 + PRD 佐证）
- **Decision**：`KnowledgeNode` 与 3D structure id 分离；知识节点可绑定 0/1/多个模型结构。
- **Reason**：ATP、氧气等概念没有 3D 模型，但不能因此阻止学习。
- **Impact**：`modelStructureIds` 可为空；点击无模型节点时中央场景保持原样，只切知识卡。
- **Revisit when**：若未来出现"知识必须绑定模型"的强需求时。

## D-002 · Model Context 与 Current Knowledge 分离
- **Date**：2025-08（Knowledge UX v0.2）
- **Decision**：引入 `modelContextId`（中央 3D 语境）与 `currentNodeId`（正在读的知识）两个独立状态。
- **Reason**：读 ATP 时中央心脏模型不应消失；Related 点击不应误触发相机对焦。
- **Impact**：知识导航与 3D 导航解耦；`KnowledgeHistory` 只改知识，不改模型。
- **Revisit when**：若需要"知识卡片强制绑定模型焦点"的新交互时。

## D-003 · 相机修复用 postinstall patch 第三方包
- **Date**：2025-08
- **Decision**：用 `scripts/patch-vanatome-camera.mjs` 在 postinstall 阶段 patch `@vixotic/vanatome-react` 编译产物。
- **Reason**：上游包没有暴露控制 focus 触发条件的 API；直接改 node_modules 是当时可行解。
- **Impact**：修复"滚轮缩小弹回原位"；但产生**版本耦合风险**（升级上游包可能让 patch 失效，脚本会 loudly throw 提醒）。
- **Revisit when**：升级 @vixotic/vanatome-react 时，或上游提供官方 focus 控制 API 时（届时应移除 patch）。
- **BIO-014 update（2026-09-07）**：同版本 0.1.6 曾出现不同 registry bundle shape，
  因此 patch 改为先验证 camera distance contract 再按 shape 应用。当前 bundle 已原生
  保持全局 `maxDistance`，仅补 focus-request guard；legacy bundle 保留原修复兼容。

## D-004 · 模块化架构（BioScopeModule）
- **Date**：2025-09-01（Codex 引入）
- **Decision**：引入 `BioScopeWorkspace` + `BioScopeModule` 注册表，人体/光合作用作为两个模块，顶部 AtlasSwitcher 切换。
- **Reason**：UNKNOWN（由 Codex 实现，未在会话中明确记录完整动机；推测是"跨生命对象"扩展的需要）。
- **Impact**：`data/modules/registry.tsx` 成为模块入口；`lib/bioscope-core.ts` 定义 VisualScene/MechanismStep 等抽象。
- **Revisit when**：新增第三个模块时验证这套抽象是否够用。

## D-005 · 中文优先的术语系统
- **Date**：2025-08（早期）
- **Decision**：展示层中文优先、英文辅助；模型内部 ID/英文名不动。术语分三层：人工 verified / 词组规则 / 单词拼接 unverified。
- **Reason**：目标用户是中文母语本科初学者。
- **Impact**：`lib/anatomy-terminology.ts`（712 行）成为术语事实源；大量结构名靠规则生成，标 unverified。
- **Revisit when**：高频器官的 unverified 术语应逐步人工补 verified。

## D-006 · 旧 Plant 模块：DEPRECATED / FROZEN
- **Date**：2025-09-01 弃用标记；2025-09（Sprint #001）CEO 正式决策为 FROZEN
- **Decision**：旧 Plant 模块（plant-workbench + plant-viewer + plant-explorer）暂不删除、暂不合并，状态为 DEPRECATED / FROZEN。
- **Reason**：允许阅读/参考/比较旧实现；禁止新功能、扩展、未经 CEO 决策删除。等 Photosynthesis 架构进一步成熟后，再判断是否迁移其中有价值的实现（CEO 决策）。
- **Impact**：plant-workbench + plant-viewer 代码保留但未注册，与 photosynthesis 的 3D 组件重复；该重复作为已知技术债接受。
- **Revisit when**：Photosynthesis 架构成熟后，由 CEO 判断是否迁移/清理。

## D-008 · Obsidian/content pipeline 与四方向：RESERVED / NOT NOW
- **Date**：2025-09（Sprint #001，CEO 决策）
- **Decision**：
  - Obsidian / content pipeline 保留方向，状态 RESERVED — DO NOT EXPAND（不实现、不扩展、不删除预留代码）。
  - 以下四方向 NOT NOW：AI Tutor、User Account System、Protein/Molecular Viewer、大规模 Obsidian integration。
- **Reason**：NOT NOW ≠ 永远不做；只是当前 Sprint 和近期工程 Agent 不得自行启动这些方向。
- **Impact**：content-schema.ts + content/ 预留代码保留为死代码；工程 Agent 不得在这些方向自行开工。
- **Revisit when**：未来正式启动知识内容管线、或 CEO 决定推进四方向之一时。

## D-009 · 第三方模型资产不纳入 git
- **Date**：2025-09（Sprint #001）
- **Decision**：`local-public/models/*.glb`（30MB，Z-Anatomy 1.4.0 第三方资产）加入 .gitignore，不纳入 git 历史。
- **Reason**：模型是 @vixotic/vanatome-atlas 的第三方 immutable 资产，应 self-host 而非 vendor 进源码历史；30MB 二进制 diff 无意义，会永久膨胀 repo。
- **Impact**：clone 后需从上游（github.com/vixotic/Vanatome / Z-Anatomy 1.4.0）获取模型并放置到 `local-public/models/` 才能本地运行。
- **Revisit when**：若 CEO 决定"clone 即用优先于 repo 体积"，可改回纳入 git 或改用 Git LFS。
- **状态**：CTO 默认决策，CEO 可推翻。

## D-007 · picking 评分用"行为快照"测试固化
- **Date**：2025-09（audit 阶段）
- **Decision**：`tests/picking-manager.test.ts` 把 picking 的所有魔法常量（0.16 邻域、14 歧义阈值、各权重）固化为回归基线。
- **Reason**：这些常量是反复调出来的启发式，没有明确规范；固化是为了防止无意回归。
- **Impact**：改评分算法或常量前，必须先有意识地更新测试期望值。
- **Revisit when**：每次触碰 picking-manager.ts 时。

## D-010 · 知识守护层正式化
- **Date**：2026-09-03（Night Shift 验收并入 master）
- **Decision**：`lib/knowledge-graph-validator.ts` + `validate:knowledge` + 两个只读审计脚本 + characterization 基线，作为项目正式守护层资产。
- **Reason**：把知识图引用完整性、核心链双向可达性从"人工记得检查"变成"可脚本验证"。
- **Impact**：改 `data/knowledge/*` 前必须先有意识地更新 characterization 基线（红 = 更新基线，非测试坏了）。
- **Revisit when**：若未来拆 CI 步骤、或需要 `--json` 输出模式时。

## D-013 · 3-5-1 Rule 的 related ≤ 5 维持不放宽
- **Date**：2026-09-03（CEO 决策）
- **Decision**：每个知识节点 related ≤ 5 维持硬约束，暂不放宽。
- **Reason**："human 已达 5/5"只证明容量满，不证明体验需要更多关系；守住"信息克制"产品原则。
- **Impact**：CED-5（human → nervous-system）需改用 exploreQuestions/followUp 等替代入口形态，而非突破约束。
- **Revisit when**：未来学习体验确实需要更多关系时，由 CEO 重新评估。

## D-014 · 部署状态：本地预览已验证，生产部署未验证
- **Date**：2026-09-03（CEO 决策）
- **Decision**：当前产品事实 = **LOCAL DEVELOPMENT / LOCAL PREVIEW VALIDATED · PRODUCTION DEPLOYMENT NOT VERIFIED**。不推进生产云部署。
- **Reason**：`public/models/` 为空（GLB 404）、无 deploy 脚本、D1/R2 仅占位。
- **Impact**：文档不得暗示"生产部署已可用/验证"；不创建云资源、不部署 Cloudflare、不要求 credentials。
- **Revisit when**：CEO 决定推进生产部署时。

## D-015 · 无 remote / 无 CI = KNOWN RISK，本地优先
- **Date**：2026-09-03（CEO 决策）
- **Decision**：项目继续保持本地（无 git remote、无 CI），此状态为 **KNOWN RISK**。
- **Reason**：CEO 当前希望本地优先；远程仓库/CI 属 Future Infrastructure Decision。
- **Impact**：不得自行创建 GitHub repo、push remote、配置云 CI；护栏资产的价值依赖本地 git 历史 + 本次 merge/tag。
- **Revisit when**：CEO 决定启用远程仓库时。

## D-016 · Brain Atlas 产品形态：独立 lazy-loaded Brain Workbench + Anatomy deep-link
- **Date**：2026-09-07（CEO 决策，基于 CTO spike `spike/brain-atlas-cto`）
- **Decision**：采用独立 lazy-loaded **Brain Workbench** 模块；由现有 Anatomy 提供 deep-link 进入；**不作为** Anatomy 默认深层直接嵌入。
- **Reason**：brain.glb 是 437 结构扁平场景，与 anatomy 的 vanatome 父子语义/`picking-manager` 假设冲突；独立模块可隔离 license、性能与加载成本。
- **Impact**：BIO-015 注册为第三个正式模块；anatomy / vanatome / `picking-manager` 不动；进入模块时才加载 brain.glb。
- **Revisit when**：BIO-015 验收后如需"尺度连续性"体验再评估入口扩展（Hybrid 第二阶段）。

## D-017 · Brain 资产 License / Attribution 策略（CEO 已批准）
- **Date**：2026-09-07（CEO 决策）
- **Decision**：
  1. 模块内保留可见 attribution；明确标注 3D 资产为 **CC BY-SA 4.0**。
  2. 禁止混入 NC / ND 资产。
  3. 对修改后的 Brain 衍生资产遵守相应 **ShareAlike** 义务（衍生 GLB 保持 CC BY-SA 4.0 + 署名）。
  4. **正式公开发布前，单独确认 SA 分发策略**。
- **Reason**：brain.glb 来源链为 Z-Anatomy / BodyParts3D / DBCLS（CC BY-SA 4.0）+ 注册 atlas（CC BY / CC BY-SA）；义务清晰且可履行，但公开发布涉及 SA 策略需 CEO 最终确认。
- **Impact**：BIO-015 必须包含 About/Credits + 资产旁 NOTICE + README 文档署名；新增 atlas 资产前必须先过 license gate；每次上游资产更新重新核验。
- **Revisit when**：正式公开发布决策时，或引入新 Brain 数据源时。

## D-018 · BIO-014 / BIO-015 执行顺序与 Owner 约束
- **Date**：2026-09-07（CEO 决策）
- **Decision**：执行顺序固定为 **BIO-014 → Codex implementation → DSH Review → APPROVE → BIO-015 → Codex implementation → DSH Review**。当前不启动 BIO-015 implementation。**Astra 暂不用于 Brain Workbench，保留给 BIO-013A Synapse 3D Spike**。
- **Reason**：BIO-014 阻塞 fresh clone/CI/Astra 环境，必须先修；BIO-015 决策已冻结但排队；避免 Astra 资源与 BIO-013A 计划冲突。
- **Impact**：BOARD 与 Task 均标记 BIO-015 NOT STARTED（BIO-014 APPROVE 前不得开工）；BIO-013A 继续等待 Astra 额度。
- **Revisit when**：BIO-014 APPROVE 后进入 BIO-015；或 BIO-014 出现新的 Scope / Architecture / License 冲突时上报 CEO。

