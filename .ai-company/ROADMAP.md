# BioScope — Roadmap

> 采用 NOW / NEXT / LATER / FROZEN / RESERVED / NOT NOW / WON'T DO 分档。
> 标「CEO DECISION REQUIRED」的，工程团队不得自行启动。

---

## NOW（Sprint #001 已完成；Sprint #002 未排期）

| 项 | 说明 | 状态 |
|---|---|---|
| BIO-006 git 首次提交 | 建立版本基线（commit 7dfcc07） | ✅ 完成（2026-09-03） |
| BIO-007 根目录 README | 面向 human + AI Agent 的项目入口 | ✅ 完成（commit b7fdcca） |
| BIO-010 AI Handoff Test | 陌生 Agent 仅凭 .ai-company/ 恢复上下文 | ✅ 完成（commit f367db5） |
| BIO-002A 光合作用机制导航 MVP | 6 步机制导航 + mesh 强调通道 + 知识联动已实现并收编（merge b6cc11f，2026-09-04）；CTO 独立验收 APPROVE | ✅ 完成（2026-09-04） |

## NEXT（下一个迭代）

| 项 | 说明 |
|---|---|
| 知识网络反向边 | 只读审计基线已建（`npm run audit:knowledge-chain`，核心链 7 跳 3 处单向、全图 69 对单向边）。补边方案 = **BIOLOGY REVIEW REQUIRED**，CEO 决定 Biology Review 前不批量改知识内容 |
| 植物模块 Explore Questions | 人体 6 器官已有，植物节点尚未补 WHY/HOW/WHAT IF |
| 光合作用键盘可达性（a11y S1） | CEO 已批准（下一 Sprint 给 Task ID + AC）；键盘/读屏用户可到达类囊体层 |
| 术语系统补 verified | 大量结构名靠单词拼接（unverified），高频器官需人工确认 |
| picking 可用性问题 | `internal-structures` 命名结构被整体过滤（测试已记录，需产品判断） |

## LATER（有明确价值，但排后面）

| 项 | 说明 |
|---|---|
| 测试覆盖扩展 | 已部分完成（2026-09-03 night-shift）：核心逻辑层 picking-manager / anatomy-filters / anatomy-terminology / knowledge-graph-validator 均有回归基线；UI 组件层与 workbench 交互仍无测试 |
| 更多解剖系统术语 | 补齐 verified 覆盖 |

## FROZEN（冻结，仅阅读/参考）

### 旧 Plant 模块（plant-workbench + plant-viewer + plant-explorer）
- **状态**：DEPRECATED / FROZEN（CEO 决策，Sprint #001）
- **允许**：阅读、参考、比较旧实现
- **禁止**：新功能开发、主动扩展、未经 CEO 决策删除
- **触发解冻**：等 Photosynthesis 架构进一步成熟后，由 CEO 判断是否迁移其中有价值的实现

## RESERVED（保留方向，当前不扩展）

### Obsidian / content pipeline
- **状态**：RESERVED — DO NOT EXPAND（CEO 决策，Sprint #001）
- **现阶段**：不继续实现、不扩展抽象、不删除预留代码（content-schema.ts + content/ 保留）
- **触发启动**：未来正式启动知识内容管线时重新设计

## NOT NOW（CEO 决策，近期不启动）

以下方向 **NOT NOW ≠ 永远不做**，只是当前 Sprint 和近期工程 Agent 不得自行启动：

- AI Tutor / 聊天式学习助手
- User Account System / 学习进度 / 收藏
- Protein / Molecular Viewer（蛋白质分子查看器）
- 大规模 Obsidian integration

## MAYBE（CEO DECISION REQUIRED）

这些仍是开放方向，是否做、优先级如何，由 CEO 决定：

- 是否进入细胞 / 组织更多尺度
- 是否做 Quiz / Flashcards
- 是否做科研模式（当前定位"不做科研工作台"，需 CEO 确认是否长期维持）

## WON'T DO / NOT PLANNED（当前明确不做）

- 生产云部署（当前产品事实 = LOCAL PREVIEW VALIDATED · PRODUCTION DEPLOYMENT NOT VERIFIED；无 deploy 脚本、`public/models/` 为空、D1/R2 仅占位）
- 后端数据库（当前纯前端 + 静态数据；Cloudflare D1/R2 仅部署占位，未实际使用）
- Knowledge Graph 可视化
- 多模型同屏比较
- 复杂动画 / 粒子级反应模拟（短期）
