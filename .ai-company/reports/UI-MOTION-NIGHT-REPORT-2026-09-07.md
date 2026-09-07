# BioScope — UI / Motion Improvement Pass 夜间报告（GLM）

- **Date**: 2026-09-07（无人值守夜班）
- **Branch**: `feature/glm-ui-motion-pass`（基于 master 8c5e38e，共 7 commits，未 merge）
- **Worktree**: `D:/Videos/Documents/ChatGPT/bioscope-ui-worktree`（本任务独立 worktree）
- **性质**: Frontend UI / Motion / Accessibility presentation 专项。未改动科学知识内容、未启动 BIO-013A、未改动 picking / interaction 状态逻辑、未 merge master。

---

## 0. FINAL SAFETY REPORT（并行工作保护模式结论）

```text
UI branch: feature/glm-ui-motion-pass @ e951173（7 commits，parent chain 线性于 8c5e38e）
UI commits: 3af0196 / f4008de / e262c34 / c5b53fa / 7d93efa / e951173 / <report docs commit>
UI worktree clean: YES（git status 干净，HEAD = e951173 + report commit）
Explore branch current HEAD: 2bfcc94（fix(anatomy): keep isolation and selection state consistent，parent 8c5e38e）
Explore branch accidentally contains UI commit: NO
  （误入的 ee5b605 已通过 git update-ref 精确撤销；其分支重建后从 8c5e38e 重新提交，
   ee5b605 不在其历史中，已验证 grep 计数为 0）
Shared Explore uncommitted work preserved: YES
  （lib/anatomy-interaction-state.ts 3717B + tests 10378B + anatomy 接线均完好；
   其后已自行提交为 2bfcc94，与本任务无关）
Foreign Explore changes inside UI commits: NO
  （6 个 code commit 逐一 grep：anatomy-interaction-state / plan* / createVanatomeHierarchy /
   getVanatomeDescendantIds / isolatedBranchIds / focusedId 全部 0 命中）
Unknown hunks: NONE（OWNERSHIP AUDIT 快照 11 hunks：7 MINE + 4 FOREIGN，逐一分类，无 UNKNOWN）
tsc: PASS（0 错误，clean worktree 与 UI worktree 双重验证）
tests: PASS（248/248，11 files）
lint: PASS 基线（19 errors，全部为历史遗留 components/ui/* 与 hooks/use-mobile.ts，与基线逐项一致，0 新增）
build: PASS（local-build exit 0）
```

**Git 事故与恢复（必须向 DSH 披露）**：
本任务曾在共享工作树上创建分支并完成第一个 commit，但共享 checkout 已被
Explore Interaction Agent 切换到 `feature/glm-explore-interaction-pass`，导致该 commit
（ee5b605，仅 globals.css 7 行）落到对方分支。恢复方式：`git update-ref` 将对方分支
指针精确退回 8c5e38e（reflog 证明该分支当时为 0 提交、起点即 8c5e38e，该操作恰好
只撤销我自己的误入 commit，未触碰对方任何工作）。此后所有提交均在本任务独立
worktree 中完成。

**后续事实**：Explore Agent 提交 2bfcc94 时，其 `git add app/anatomy-workbench.tsx`
把共享工作树中本任务的未提交 hunks 一并吸收进了它的 commit（fadeActive/isolateActive
等 20 处标记）。已验证：两分支的 anatomy-workbench.tsx 的差异**仅含对方的
interaction-state 内容**，本任务 hunks 在两侧逐字相同 → 未来任一分支先并入 master，
另一分支合并时这些 hunks 会作为"双方相同改动"自动收敛，不会冲突或重复。
此归属混乱由共享工作树并行模式导致，建议 DSH 在合并时知悉（见 §8/§9）。

---

## 1. 原来最明显的 UI/UX 问题（Audit 结论，按影响排序）

1. **[A11y·高] 键盘焦点不可见**：所有原生 `<button>`（结构树、筛选 chips、机制步骤、
   关键结构、follow-up chips）无任何 `:focus-visible` 指示，实测 computed outline
   `0px none`。键盘用户完全无法定位焦点位置。
2. **[State feedback·高] Fade / Isolate 模式无激活态**：保留语境（parent-context）与
   隔离（selected）激活后按钮外观不变、无 aria-pressed，用户只能从 3D 画面猜测当前
   模式；实测 3D 效果本身工作正常。
3. **[Responsive·高] 1024–1279px 宽度下右侧知识面板被裁切**：两模块网格的最小列宽
   （photo 250+500+350=1100px / anatomy 270+460+350=1080px）超过视口，`overflow-hidden`
   导致知识面板不可达。实测 1080px：mainScrollW 1100 vs clientWidth 1080。
4. **[Motion·中] 状态变化全是瞬时硬切**：模块切换、知识节点切换（related / 关键结构 /
   机制步骤联动）无任何过渡线索，3D 状态变化与 UI 反馈脱节。
5. **[A11y·低] zh/en accessible name 直接拼接**：如解剖树按钮 accessible name 实测为
   "心脏Heart"（视觉有换行、读屏无空格）。

## 2. 实际修改了什么（IMPLEMENTED）

| # | Commit | 内容 | 文件 |
|---|---|---|---|
| 1 | 3af0196 | 全局 `:focus-visible` coral 焦点环（2px + offset 2px，非 layer 规则） | app/globals.css |
| 2 | f4008de | micro-lab 网格 lg 下限 500→300px，xl 恢复 500px | components/micro-lab/micro-lab-workspace.tsx |
| 3 | e262c34 | 模块切换 300ms 淡入；知识面板标题/内容按 node.id 重挂载淡入+上移（内容滚动自动归顶）；Related 行淡入；活跃步骤 `aria-current="step"` | app/bioscope-workspace.tsx, app/photosynthesis-workbench.tsx |
| 4 | c5b53fa | ViewerControls 保留语境/隔离按钮读取现有 `viewer.isolation?.mode`，补 `aria-pressed` + coral 激活态（只读状态，未动 interaction 逻辑） | app/anatomy-workbench.tsx（curated hunks） |
| 5 | 7d93efa | anatomy 网格 lg 下限 460→300px，xl 恢复 460px | app/anatomy-workbench.tsx（curated hunks） |
| 6 | e951173 | anatomy 知识面板标题/内容 keyed 淡入过渡 | app/anatomy-workbench.tsx（curated hunks） |
| 7 | 本报告 | docs 报告 | .ai-company/reports/ |

所有动效均使用仓库已有的 tw-animate-css 工具类 + `motion-safe:` 前缀
（prefers-reduced-motion 下自动禁用），未引入任何动画库。

## 3. 修改前后为什么更好

- **焦点环**：改前键盘用户不可见焦点（0px none）；改后 :focus-visible 时渲染
  2px coral 描边（实测强制匹配态 computed = `2px solid rgb(229,120,104)` + offset 2px）。
  鼠标点击不触发（标准 :focus-visible 语义），不覆盖 Button 组件自带 ring。
- **激活态**：改前 3D 已处于 fade/isolate 但按钮无标记；改后当前模式按钮 coral 底色 +
  ring + `aria-pressed`，读屏与视觉一致。状态来源为只读 `viewer.isolation`，与
  Explore Agent 的状态逻辑无耦合。
- **响应式**：改前 1080px 知识面板被裁 20px 且不可滚动；改后 1920/1280/1080/1024
  四档 overflow 均为 0、面板完全可见，3D 视口正常。
- **过渡动效**：改后知识切换有 300ms 淡入+轻微上移、模块切换整屏淡入——帮助用户
  感知"内容已因我的操作而变化"，且新知识自然从顶部开始阅读；全部 motion-safe。

## 4. Commits

见 §0/§2。全部在 `feature/glm-ui-motion-pass`，semantic commit，**未 merge master**。

## 5. Tests / Build 状态

- `npx tsc --noEmit`：0 错误（改动前基线亦 0）
- `npm test`：248/248（picking / filters / terminology / knowledge 图 / chain audit 全绿）
- `npm run lint`：19 errors，与改动前基线完全一致（历史遗留文件），**0 新增**
- `npm run local-build`：exit 0
- 以上在"HEAD + 仅本任务改动"的 clean validation worktree 与 UI worktree 各验证一次。

## 6. 浏览器 QA 结果（真实浏览器，含截图证据）

- Anatomy：心脏 selection/focus/camera 联动 ✓；Fade context 效果 ✓；Isolate 效果 ✓；
  **Fade 激活态按钮高亮 + aria-pressed=true**（截图确认）✓
- Photosynthesis：叶肉细胞→叶绿体→类囊体膜全流程 ✓；机制步骤切换与 mesh 强调 ✓；
  **步骤 aria-current="step" 跟随** ✓；知识面板 keyed 过渡类在 DOM 确认 ✓
- 响应式：1920/1280/1080/1024 四档 × 两模块，网格溢出 0、知识面板可见 ✓
- Console：加载 + 模块往返切换 + 步骤/场景导航交互扫描，**0 error / 0 unhandled rejection** ✓
- 键盘焦点：规则已在构建产物中验证（存在、未分层、匹配元素、级联获胜、coral 颜色、
  offset 正确）；IAB 测试环境无法注入真实 Tab 键（CUA 键盘事件不达页面），
  :focus-visible 匹配本身属 Chromium 标准键盘行为——此为 QA 环境限制，非代码风险。

## 7. 未修改但值得未来考虑的 Findings（DEFERRED / FUTURE）

**DEFERRED DUE TO PARALLEL CONFLICT**（本轮主动不改，避免与 Explore Agent 抢共享文件）：
- Anatomy 树按钮 zh/en accessible name 拼接（"心脏Heart"）——修复点在
  `TreeStructure`（anatomy-workbench.tsx），建议在 Explore Agent 分支合并后补
  `{' '}` 或 aria-label；属 a11y S1 可一并处理。
- 共享树中的重复工作归属（见 §0 后续事实）——由 CTO/DSH 在合并时裁决顺序即可，
  内容层面无冲突。

**FUTURE（产品/交互层，需相应 Owner 立项）**：
- Photosynthesis Explorer 中"叶绿体/类囊体膜"入口 disabled 且无解释文案，键盘/指针
  用户进入下一尺度唯一途径是 3D 点击——即 BOARD 已批准的 a11y S1 任务，本任务未代做。
- Hover tooltip 行为不一致：anatomy 跟随指针、photosynthesis 固定位置（left-5 top-24）
  且点击后仍驻留。建议统一为跟随式，需交互设计确认。
- 隔离/保留语境的"退出"路径隐藏较深（需重置全部状态）；selection/isolate 退出语义归
  Explore Agent 的 interaction-state 逻辑。
- loading→ready 的画布出现瞬间较硬（progress→canvas 直接替换），可考虑 ready 后淡入。
- 文档标题不随模块切换（两个工作台共用固定 title），影响浏览器历史辨识。
- 步骤描述在步骤按钮与下方摘要重复展示（BIO-002A 验收小注，内容层面）。
- 解剖树术语噪音（如"前半月瓣叶肺瓣"）属 terminology 数据层，不在 UI 范围。

## 8. 是否存在需要 CEO 决策的问题

**无新增 CEO 决策项。** 本轮全部改动在既有产品方向内（UI 完成度/可及性），未触及
NOT NOW / RESERVED 方向。两点请 CTO 知悉（非 CEO 级）：
1. 共享工作树并行模式导致本任务部分 anatomy hunks 同时存在于两个分支（内容一致），
   建议后续任务改用独立 worktree（本任务已率先采用）。
2. a11y S1（光合键盘可达性）与 DEFERRED 的树按钮命名修复建议同 Sprint 打包。

## 9. DSH Review 应重点检查什么

1. **Ownership**：抽查 6 个 code commit 是否只含本任务内容（可用 §0 的 grep 命令复核：
   `git show <c> | grep -E "planStructureSelect|createVanatomeHierarchy"` 应为 0）。
2. **c5b53fa 与 Explore 分支的接口**：本任务只读 `viewer.isolation?.mode` 渲染按钮
   激活态；2bfcc94 重构了 isolation 的写入路径（applyIsolationPlan）但状态源不变。
   合并后请确认 fade/isolate 按钮激活态在他们的新状态逻辑下仍正确点亮/熄灭。
3. **响应式**：1024px 宽度下 3D 视口变窄（~404px）属预期取舍，请确认产品可接受；
   xl 及以上布局与改前完全一致。
4. **动效 taste**：知识面板 keyed 重挂载会重置 `<details>` 开合状态与滚动位置（新
   节点从顶部开始），请确认符合"信息克制"原则下的阅读预期。
5. **回归点**：相机行为（滚轮缩放不回弹）、picking 行为、知识图校验——本任务未触碰
   这些逻辑，测试全绿；请按惯例复查。

---

*报告由 GLM（Senior Frontend / Interaction Engineer）生成 · 2026-09-07*
