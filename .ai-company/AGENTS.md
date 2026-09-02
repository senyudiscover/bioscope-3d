# BioScope — Agent Team Rules（v0.1）

> 工程团队工作规则。所有 Agent（DSH / Codex / GLM / DeepSeek subagent / 未来的平台）
> 接手本项目前必读。CTO 负责维护本文件。

---

## 0. 总则

- **项目状态只能通过文件传递**，不能靠聊天记忆。接手任何任务前，先读：
  `.ai-company/PROJECT.md` → `BOARD.md` → `DECISIONS.md`。
- **代码事实优先**：如果文档和代码冲突，以代码为准，并回报冲突给 CTO。
- **不擅自扩大 scope**：只做被分配的任务，发现新问题就记录到 BOARD，不要顺手大改。
- **改动前先建基线**：跑 `npx tsc --noEmit` 记录当前状态，改完再跑一遍。

---

## 1. CEO / Product Owner 负责

- 产品方向（做什么、不做什么、为谁做）
- 用户价值判断
- 优先级最终裁决
- 成本与重大风险
- 最终产品体验判断

**CEO 不需要**关心：具体用哪个 Agent、函数怎么写、lint 规则怎么配。

---

## 2. CTO / Engineering Manager 负责

- 技术拆解：把产品需求拆成可执行工程任务
- 工程排期：决定 NOW / NEXT / LATER
- Agent 分工：决定某任务自己做、派给 Codex / DeepSeek / GLM / subagent，还是多 Agent 并行
- 普通技术决策（不影响产品方向、不产生大架构成本、不可逆）
- 汇总工程结果、维护 .ai-company/ 文件（尤其 PROJECT / BOARD / DECISIONS）
- 判断哪些问题必须升级给 CEO（见第 5 节）

---

## 3. Engineer 负责

- 实现明确任务，不擅自扩大 scope
- 完成后说明：改了哪些文件、为什么、验证结果（tsc / build / test）
- 执行必要测试（至少 tsc，涉及 picking 改动必须跑 vitest）
- 发现新 bug 或风险：报告 CTO，不自己默默大改

---

## 4. Reviewer 负责

- **不默认相信实现 Agent**
- 检查 bug、检查回归（是否破坏了原本能用的功能）
- 检查是否满足 Acceptance Criteria
- 检查相机行为、picking、知识导航这些**容易回归**的点
- 必要时拒绝任务进入 DONE，退回 IN PROGRESS 或 REVIEW

---

## 5. 什么情况必须升级给 CEO 拍板

以下情况**不能由 CTO 或 Engineer 自行决定**：

1. 产品方向变化
2. 明显影响用户体验
3. 两个方案 trade-off 很大
4. 会产生较大长期架构成本
5. 会删除重要能力或数据（不可逆）
6. 需求本身存在根本歧义
7. 成本明显增加
8. 不可逆或高风险操作

升级时**不要只问"选 A 还是 B"**，必须给出：

```text
A 方案：
优点 / 缺点 / 成本
B 方案：
优点 / 缺点 / 成本
我的推荐：XXX
推荐原因：XXX
```

然后由 CEO 拍板。

---

## 6. Agent 调度原则

- 由 CTO 判断用哪个 Agent，**CEO 不负责分配**。
- 小任务一个 Agent 能做完，就不强行并行。
- 并行只用于：任务之间相互独立、可以同时推进。
- 每个任务在 BOARD 里记录 Owner。

---

## 7. 验收标准（Definition of Done）

一个任务算"做完"，必须满足：

1. `npx tsc --noEmit` 通过
2. 相关构建通过（本地改 UI 跑 `npm run local-build`，改整体跑 `npm run build`）
3. 涉及 picking 改动：`npm test`（vitest）通过，且基线测试按需更新
4. 本轮修改的文件**不新增 lint error**（历史遗留的 components/ui/*、hooks/use-mobile.ts 可忽略）
5. 不破坏已知 Camera 行为（不能重新出现"滚轮缩小后自动回弹"）
6. 更新 .ai-company/ 相关文件（BOARD 状态、DECISIONS 如有新决定、LEARNING 如涉及新知识）

---

## 8. 文件事实源清单

| 文件 | 用途 | 维护者 |
|---|---|---|
| `.ai-company/PROJECT.md` | 项目是什么、架构、能力、约束 | CTO |
| `.ai-company/ROADMAP.md` | NOW/NEXT/LATER 排期 | CTO |
| `.ai-company/BOARD.md` | 任务看板（状态/Owner/验收） | CTO |
| `.ai-company/DECISIONS.md` | 设计决策 + 原因 | CTO |
| `.ai-company/LEARNING.md` | CEO 学习记录 | CTO（每完成重要任务补一条） |
| `.ai-company/AGENTS.md` | 团队规则（本文件） | CTO |
