# BIO-012 · 3D Explore Interaction Pass — Fix 1 交付报告

> 日期：2026-09-07 · Owner：GLM（Senior 3D Interaction Engineer）· 分支：`feature/glm-explore-interaction-pass`
> 基线：master `8c5e38e`。本报告只覆盖本轮已完成的 Fix 1；未实施 Findings 全部留给 DSH Review 拍板，未擅自开工。

---

## 1. 实际发现的 3D Explore 问题（Browser QA 实证）

| # | 严重度 | 问题 |
|---|---|---|
| F1 | **P0** | **隔离死局**：选中结构 → 保留语境/隔离 → Escape（或空白点击/隐藏选中/筛选退选）只清除 selection，isolation 残留；全部结构操作按钮因无选中而禁用，唯一出路是全量重置（连带丢失系统筛选、显示层、隐藏列表、知识导航、相机位置）。 |
| F2 | P1 | **相机指示器谎报**：上述退选路径把 `cameraLevel` 硬设为 `'whole'`，显示 "WHOLE BODY / 全身观察"，但相机实际仍停留在结构特写。深链（`?anatomy=`）加载时反向谎报（相机已对焦但显示 WHOLE BODY）。 |
| F3 | P1 | **隔离分支外选择陷阱**：隔离期间从 Explorer 树点击分支外结构或切换系统过滤器 → 新选中结构不可见、相机拒绝构图（structure-has-no-visible-geometry），同样是半死状态。 |
| F4 | P2 | **知识连接缺口**：3D 点选肺/肝/胃/肾/脑等器官时，右侧知识卡显示 fallback"该节点的本科知识内容尚未整理"，但策展知识节点（`lungs`/`liver`/`stomach`/`kidneys`/`brain`）实际存在。`selectStructure` 只对 `heart`/`heart-*` 做了特判映射。 |
| F5 | P2 | 聚焦内部器官（如肺）时，目标被 0.72 不透明度体壳遮挡，用户"选到了但看不见"；"保留语境"可以解决但没有主动引导。 |
| F6 | P3 | `focusedId` 死状态（set 但无 reader）——状态污染源，已在 Fix 1 顺带移除。 |

状态归属结论（修复依据）：`selectedId` / `isolation` / `focusRequestKey` 由 vanatome controller 持有；`cameraLevel` 是 workbench 侧指示器；按钮 disabled 由 `!!selectedStructure` 派生。缺陷本质是 workbench 从未维护"**isolation 依赖选中锚点**"与"**指示器只能反映真实相机移动**"两条不变式。

## 2. 本轮选择修复的问题与原因

**只修了 F1+F2+F3+F6（= Fix 1，一个 commit）**。理由：高频（每次探索都会碰到退出路径）× 直接阻断 3D 学习（死局）× 低工程风险（纯 workbench 协调层 + 纯函数决策层，不动第三方包、不动相机算法、不动知识数据）。

实现：
- `lib/anatomy-interaction-state.ts`（新增）：纯决策层 `planDeselect` / `planStructureSelect` / `planIsolationToggle` / `planCameraReset` / `isolationOrphaned`，两条不变式有注释和测试钉死。
- `selectStructure(null)` 单一咽喉点统一走 `planDeselect`：解除选择时一并退出 isolation；**不再**设置 `cameraLevel='whole'`。
- `selectStructure(id)` 走 `planStructureSelect`：分支外选择先退出 isolation 再 selection+focus；分支内下钻保留语境。
- 保留语境/隔离按钮改为显式 toggle（重复同一模式=退出），带 `aria-pressed` + 激活态反馈；移除死状态 `focusedId`；深链加载同步 cameraLevel。

## 3. 用户行为差异（修复前 → 修复后）

| 场景 | 修复前 | 修复后 |
|---|---|---|
| 隔离后按 Escape | 选择清除、隔离残留、按钮全禁用、只能全量重置 | 隔离安全退出，回到可浏览状态 |
| 隔离后点空白/隐藏选中 | 同上死局 | 同上安全退出（同一咽喉点） |
| 隔离中切换系统/显示层 | 同上死局 | 隔离自动退出 → 新语境正常选中+对焦 |
| 隔离中 Explorer 点分支外结构 | 新结构不可见、相机拒绝对焦 | 先退隔离再选中，相机正常对焦 |
| 再次点击"保留语境" | 重复施加同一隔离（无出口） | 退出该隔离（显式 toggle） |
| 退选后相机指示 | 谎报 WHOLE BODY | 保持真实层级（如 STRUCTURE FOCUS） |

## 4. Commits

- `2bfcc94` fix(anatomy): keep isolation and selection state consistent
  - `lib/anatomy-interaction-state.ts`（+95）、`tests/anatomy-interaction-state.test.ts`（+289）、`app/anatomy-workbench.tsx`（+120/−25）
  - 提交纯净性已验证：不含任何 UI/Motion Agent 的 motion wrapper / 响应式栅格 / globals.css 内容。

## 5. tests / tsc / lint / build

- `npx tsc --noEmit`：0 错误（提交前 Fix-1-only 树 + 恢复后混合树均验证）。
- `npm test`：264/264 通过（其中新增回归测试 16 个）。
- `npm run lint`：19 errors 全部为历史遗留 `components/ui/*`、`hooks/use-mobile.ts`（项目 DoD 豁免）；本任务文件 0 错误（修复过程中引入过 3 个 oxlint exhaustive-deps 错误，已改为 `[viewer]` 依赖后归零；workbench 基线为 0 → 现 0）。
- `npm run local-build`：exit 0。

## 6. Browser QA（独立 server，`?v=fix1-qa` 防缓存）

环境备注：QA 用 `:4174` 独立 preview server + `:3000` 全新标签页（同一份新构建的 dist-local）。IAB 窗口被遮挡时 rAF 节流会让模型装配"看起来卡住"（GLB 实际在 t≈111s 才发请求），属环境现象非代码回归——QA 时需保持窗口可见。

已验证路径：
1. 选中肺 → 保留语境（肺可见、按钮激活态亮起）✓
2. 再次点击保留语境 → toggle-off，隔离退出、全身恢复 ✓
3. **隔离 → Escape**：隔离退出、选择清除、相机不动、指示器诚实（STRUCTURE FOCUS · AUTO FIT）、无死局 ✓
4. **隔离 → Explorer 点分支外（心脏→肺动脉）**：先退隔离再选中+对焦 ✓
5. **隔离 → 切换系统过滤器（心血管）**：隔离退出 → SYSTEM FRAME 正确 ✓
6. 混合探索长链路（select→fade→下钻→toggle→deselect→跨分支→reset→system→deselect）单元测试逐步断言不变式 ✓
- 覆盖注记：空白点击/隐藏选中与 Escape 汇入同一 `selectStructure(null)` 咽喉点，行为等价（3/4 与 1 为同一终态路径）。

## 7. 未实施 Findings（交 DSH Review 决定是否立项）

- **F4 知识连接缺口（建议下一个高价值任务）**：方案已调研——用 `knowledgeNodes[*].modelStructureIds` 反向建 map + 沿 `parentId` 祖先链上溯（covering lungs/liver/stomach/kidneys/brain 及其子结构），不修改知识数据本身，与 D-002 不冲突（model→knowledge 方向补全 heart 特判既有模式）。属"交互状态管理 + 相关 helpers"范围。
- **F5 聚焦遮挡**：可能方向是"选中内部结构时自动 ghost 体壳"或"聚焦后自动施加 parent-context"，涉及产品体验决策，需拍板。
- **picking-manager parent-context 语境不可点**：隔离语境下兄弟结构可见（0.12 透明度）但不可点击（设计如此），修复 F1 后有明确出口，暂不动。
- 小结构 picking / 0.16 邻域 / 14 歧义阈值等 picking 常量：D-007 测试固化，本轮未触碰。

## 8. 是否存在需要 CEO 决策的问题

无必须 CEO 拍板事项。F5（聚焦遮挡的自动消隐策略）如推进，建议升级 CEO 确认交互语义。

## 9. DSH Review 应重点检查的风险

1. **Toggle 语义**：保留语境/隔离按钮现在是"重复点击=退出"。这是交互契约变化（此前重复点击是无效操作）。按钮激活态样式（coral ring）源自 UI Agent 在共享工作树中的在途改动，因其与 toggle 契约在功能上不可分割而被并入本 commit（commit message 有注明）。若 UI Agent 分支后续合入同区域，预期产生**良性冲突**（相同改动）——请 CTO 仲裁。
2. **deselect 不再重置知识节点/相机指示**：Escape 后 breadcrumb 仍回"人体"（既有行为），但指示器保持原层级——语义上"相机没动所以不撒谎"，请确认这是期望的产品语义（用户给的 A/B 选项中选择了更接近 A 的"Escape=安全整体退出，但相机不动、指示器诚实"）。
3. **共享工作树并发风险**：QA/提交期间另一 Agent 持续修改同树文件（bioscope/photosynthesis/micro-lab/globals.css，且曾 stage globals.css）。本 commit 用显式 pathspec 隔离，已验证纯净；后续 commit 建议沿用。
4. **并发改动已完整恢复**：anatomy-workbench.tsx 中 UI Agent 的 3 处在途 hunk（响应式栅格 + 2 处 motion wrapper）已原样放回工作树并保持未提交。
