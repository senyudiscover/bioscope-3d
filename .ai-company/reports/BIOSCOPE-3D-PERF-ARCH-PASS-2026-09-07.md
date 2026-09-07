# BioScope 3D Performance & Architecture Audit / Hardening Pass — 最终报告

- **日期**：2026-09-07
- **执行方**：GLM-5.3-Flash（Conservative Mode，Senior 3D Web Performance Engineer + Architecture Reviewer 角色）
- **分支 / Worktree**：`chore/glm-performance-architecture-pass` @ `BioScope-glm-performance`（独立 worktree，基于 master HEAD `8c5e38e`，未 merge）
- **范围**：Audit 为主 + 最多 2~3 个低风险修复。未启动 BIO-013A、未动科学内容、未动 UI/Explore UX、未动 registry/patch architecture。

---

## 1. Executive Summary

**总体判断：BioScope 的 3D 架构方向是健康的（事件驱动 picking、React state 与模型语境分离、合理的 memo 化），但存在一个已被实测证实的、随交互频率线性放大的 3D 渲染管线缺陷，本轮已修复并验证。**

- **已证实的真实问题（已修复）**：Anatomy Workbench 每次渲染都向 VanatomeViewer 传入新 identity 的 `appearance` 对象与 `visibleLayers=[]` 内联数组。第三方 Viewer 内部以 identity 判断是否重跑全模型材质刷新（`model.traverse` × 约 984 mesh + 每材质 `needsUpdate`）。实测压力脚本下，无任何语义变化的 pointermove 以 1:1 触发全模型 traverse，交互期间渲染主线程完全饱和（rAF 零推进）。修复后同样脚本 effect/traverse 次数为 **0**，交互期间 rAF 正常推进。
- **理论风险（仅记录，未实现）**：Photosynthesis viewer 的 `meshPhysicalMaterial transmission` 会触发 three.js 每帧额外 transmission 渲染通道；构建产物为单 chunk 1.37MB（全模块静态导入）；场景切换重建整个 Canvas；anatomy 模块重入需完整重挂载。
- **架构可扩展性**：当前两 Workbench 存在成套重复模式（KnowledgeSection、相机 ownership 定时器、hover 链路、相关知识 Dock 各自实现两份）。**在第三个 Lab（BIO-013A Synapse）动工前，建议先抽取共享 Workbench 基建**，否则每 Lab 成本线性复制（详见 §9）。
- **意外发现（高优先级工程风险，交 DSH）**：**全新 clone 的 `npm install` 当前必然失败**——postinstall 相机 patch 脚本与上游 `@vixotic/vanatome-react` 0.1.6 当前 tarball 的编译产物不匹配（脚本 loudly throw，符合 D-003 预警机制）。详见 §8-F1。

## 2. Highest-Risk Findings（按风险排序）

| # | 发现 | 证据 | 状态 |
|---|---|---|---|
| F1 | **全新 clone 安装失败**：patch 脚本 step-3 的匹配 token 在当前上游 0.1.6 tarball 中已不存在；主树 node_modules 是"旧上游构建 + 已 patch"的历史遗留状态 | worktree `npm install` postinstall exit 1（`Error: Vanatome camera patch: global maxDistance handling missing after patch.`）；两处 dist diff 仅为 patch 内容；lockfile 自基线 commit 后未变 | **Deferred（交 DSH）** |
| F2 | **交互驱动全模型材质刷新**：appearance / visibleLayers identity churn → effect 1:1 重跑 → 984-mesh traverse | 见 §4 Before/After | **已修复**（本轮 2 commits） |
| F3 | Photosynthesis `transmission` 触发 three.js 每帧 transmission pass（transmissive 场景整帧重绘进 4xMSAA half-float 渲染目标 + mipmap 生成；`three.module.js:16465-16489`、`material.transmission > 0` 判定 7606/7626） | 源码机制确认；叶肉细胞与叶绿体 2/3 场景受影响（vacuole 0.02、envelope 0.08） | **Deferred**（涉及可见渲染输出变化，未实现） |
| F4 | 单 chunk 1,368KB（gzip 387.5KB）：两个 Workbench + three/R3F/drei 全部静态进入同一 chunk，随 Lab 增加线性膨胀 | `local-build` 输出 + vite >500KB 警告；registry 静态 import | **Deferred** |
| F5 | 场景/模块切换重建整个 WebGL Canvas（photosynthesis `key={scene}`；模块切换卸载/重挂载 Workbench），GLB 有缓存但重挂载+重解析成本高 | 代码 + 本轮 QA 观察（切回 anatomy 后长时间停留在装配中；受 F-环境干扰，见 §7） | **Deferred** |

## 3. Implemented Fixes

全部修改位于 `app/anatomy-workbench.tsx`，共 2 个 semantic commit，无架构改动、无行为变化、无科学内容变化：

1. **`2d90e76` perf(anatomy): throttle pointer-driven tooltip state to animation frames**
   `onPointerMove` 不再每个事件直接 `setPointer`；坐标写入 ref，`requestAnimationFrame` 合并为每帧最多一次提交，卸载时取消挂起 rAF。悬停提示/候选菜单位置的视觉行为不变（帧率级更新）。
2. **`beda119` perf(anatomy): stabilize vanatome prop identity to stop full-model material refreshes**
   `appearance` 对象与 `visibleLayers={[]}` 提升为模块级常量（`vanatomeAppearance` / `NO_VISIBLE_LAYERS`），内容逐字节不变、仅稳定 identity。

**为何三个改动缺一不可**（实测归属，非推测）：AtlasModel 的 appearance-effect 依赖同时包含 `appearance`（对象 identity）与 `visibility.visible`（由 `visibleLayers` 派生的 Set）。
- 只修 rAF 节流（Fix 1 已应用、identity 未修）：effect 仍按帧率 1:1 重跑（每相位 ~121-124 次）——**证明 appearance 不是唯一 churn 源，`visibleLayers` 是另一独立根因**；
- identity 两项（appearance + visibleLayers）必须同时稳定：任一漂移都会独立触发重跑；
- rAF 节流是第二层优化：将 pointer 交互的 React 提交频率从输入频率压到帧率（即使 identity 已稳定，仍减少整个 VisualWorkspace 子树含 3D 子树的协调频率）。

## 4. Before / After Evidence

**方法**：worktree node_modules 内加临时计数探针（统计 AtlasModel appearance-effect 执行次数与每次 traverse 的 mesh 数；**测量后已移除，未进入任何 commit**）；页面内合成 `PointerEvent('pointermove')` 固定压力脚本（120Hz × 1500ms × 3 相位 = 540 事件：微抖动同一点 / 跨模型扫掠 / 纯背景角落扫掠），并发采样 rAF。环境：1440×900 Chromium（IAB），local preview。

**注意**：120Hz 合成事件是**压力测试**，不代表真实用户一定每秒产生 120 次事件。稳定结论是：**无语义变化的渲染会以最高事件频率触发不必要的全模型 traverse；真实用户在模型上移动鼠标时同样按输入频率触发**（浏览器输入报告率通常 60–125Hz+）。

| 指标 | Before（8c5e38e 基线代码） | After（2 commits 后） |
|---|---|---|
| 初始加载 appearance-effect 次数 | 2–3 | **1** |
| hover-same 相位（180 事件）effect 次数 | **+180（1:1）** | **0** |
| hover-sweep 相位 effect 次数 | **+180** | **0** |
| 纯背景 sweep 相位（无任何语义变化） | **+180 × 984 mesh traverse** | **0** |
| 每次 traverse 规模 | 984 mesh 全量材质刷新 | 仅语义变化时发生 |
| 交互期间 rAF | **0 帧（完全饿死）** | 正常推进（均值 ~30ms/帧，含合成压力负载） |
| hover 目标变更时 | 淹没在 churn 中 | 恰好 +1（合法材质更新，QA 实测：144 事件网格扫描 → +1） |
| 中间态（仅 rAF 节流、identity 未修） | — | 每相位 ~121-124 次（从事件率压到帧率，证明归属） |

Bundle：基线 1,368.07KB (gzip 387.51) → 修复后 1,368.29KB (gzip 387.58)，Δ+0.22KB（注释与常量声明）。

## 5. Commits

```
beda119 perf(anatomy): stabilize vanatome prop identity to stop full-model material refreshes
2d90e76 perf(anatomy): throttle pointer-driven tooltip state to animation frames
```
（基于 `8c5e38e`；未 merge master；无 node_modules/探针内容进入提交）

## 6. Validation

| 项 | 结果 |
|---|---|
| `npx tsc --noEmit` | **0 错误**（基线与最终均通过） |
| `npm test`（vitest） | **248/248 通过**（与基线一致；含 picking/anatomy-filters/terminology/knowledge-graph/camera-patch 契约） |
| `npm run lint` | 19 errors，**与基线完全相同**，全部位于历史遗留区（`components/ui/*`、`hooks/use-mobile.ts`，AGENTS.md §7 明确可忽略）；app/lib/3D 组件 **0 新增** |
| `npm run local-build` | exit 0，1,368.29KB（基线 1,368.07KB） |
| 回归测试新增 | 未新增——修改为渲染层 identity/节流，现有 vitest（node 环境）无法覆盖 R3F 运行时行为；行为回归由 Browser QA 覆盖（见 §7） |

无 Existing Baseline Failure 掩盖行为：基线测试在本 worktree 全绿（在恢复已验收 patch 态之后，见 §8-F1）。

## 7. Browser QA（真实浏览器操作验证）

环境：Chromium（ZCode IAB）1440×900，worktree local build，GLB 本地服务（31,849,556B，下载 183–335ms）。

| 项 | 结果 |
|---|---|
| 首页 / workbench 渲染 | ✓（布局、Explorer 树、知识卡、Related Dock、尺度导航） |
| 模型加载 | ✓ 全量 984 mesh 装配完成；加载期 UI 正常 |
| 3D hover | ✓ 悬停提示中文+英文正常（附肢骨骼）；**每次目标变更恰好 1 次材质刷新**（修复前为事件频率） |
| 3D 点击选择 | ✓ 命中 → 面包屑 `人体/骨骼系统/附肢骨骼`、知识卡联动、URL `?anatomy=appendicular-skeleton`；点空 → 正确取消选择（onPointerMissed） |
| Explorer 树选择 | ✓ 心脏：面包屑/知识卡/URL 全对 |
| Focus（聚焦） | ✓ 相机动画正常，无回弹（camera patch 行为保持） |
| Fade（保留语境）/ Isolate（隔离） | ✓ 截图确认：隔离后仅心脏渲染，高亮/透明度语义正确；各触发恰好 1 次合法材质刷新 |
| 隐藏 / 恢复隐藏 / 重置 | ✓ |
| 模块切换 → 光合作用 | ✓ Canvas/Explorer/叶绿体层进入正常，console 无错误 |
| 模块切换 → 切回人体 | ⚠ 停留装配中未完成——判定为**环境问题而非回归**：同样的"浏览器→本地服务器大文件传输停滞"在**未修改的基线 bundle（3100 端口、改动前）上也复现过**（curl 63ms 拉完 31MB 而浏览器 evaluate 超时/请求不推进；换端口后基线 bundle 亦恢复正常）。已按预案停止扩大 Browser 测量，未反复换端口。 |
| console 新增 error | 0（整轮 QA 捕获期无 error/warn） |
| 多次交互后稳定性 | 压力脚本前后页面响应正常，无报错、无行为漂移 |

## 8. Deferred Findings（未实现，附理由）

**F1 · Fresh-install reproducibility / dependency drift（建议 DSH 优先处理）**
- 现象：本 worktree 全新 `npm install`，postinstall 相机 patch 脚本抛错退出（`global maxDistance handling missing after patch`），3 个 camera-patch 契约测试初始 245/248 红。
- 根因：patch 脚本 step-3 匹配的编译产物 token `max: Math.min(maxDistance, Math.max(distance * 12, sphere.radius * 9)),` 在当前上游 0.1.6 tarball 中已不存在（上游重构了 `calculateFocusDistance` 路径）；但**上游新产物仍缺少 focusRequestKey guard**（逐行确认），patch 的保护仍是必要的。
- 主树为何绿：主树 node_modules 是历史安装（旧上游构建）+ 成功 patch 的产物，脚本对其走幂等跳过路径。
- 本轮处置：将主树已验收的 patched 文件复制到 worktree node_modules（等价于"postinstall 成功"的状态，仅 node_modules、不涉 git），脚本幂等 exit 0，测试恢复 248/248。**未修改 patch 架构/脚本/契约测试**。
- 建议方向（CTO 任务）：锁定当前可用 tarball（vendor/integrity 更新）或升级 patch 脚本适配新编译产物，并重跑相机行为验收（D-003 的 Revisit 条件已触发）。

**F2 · Photosynthesis transmission 每帧额外渲染通道**
- three.js 对 `material.transmission > 0` 的场景每帧执行 `renderTransmissionPass`（全视口 4xMSAA half-float 渲染目标 + mipmap 生成，`transmissionResolutionScale` 默认 1）。叶肉细胞（vacuole 0.02）与叶绿体（envelope 0.08）两场景受影响；0.02/0.08 的折射混合视觉上接近不可见。
- 未实现原因：会改变渲染输出（即使轻微）；且本轮浏览器环境存在大文件传输停滞，GPU 侧帧率对比无法在目标级设备上可靠测量。**若未来在 Iris Xe 级设备确认掉帧，这是收益/成本比最高的单点改动（移除 2 个 material 参数）**。

**F3 · Bundle 单 chunk（1.37MB）**
- 两个 Workbench + three/R3F/drei + lucide 全部静态进入同一 chunk。每新增一个 Lab 都会追加进主 chunk。
- 建议方向：registry 改 `lazy()` + `Suspense`（模块级代码分割），属 registry 架构改动，本轮不做。

**F4 · 场景/模块切换重建 Canvas**
- photosynthesis `key={scene}` 导致三次尺度切换各重建 WebGL 上下文 + shader 重编译；模块切换整树卸载重挂载。修复需要 scene-lifecycle 设计（单 Canvas + 内容切换），与 Explore/教学交互设计交叉，本轮不做。

**F5 · Anatomy 模块重入成本**
- 模块重入 = 完整重挂载（atlas bundle 有 loader 级缓存、GLB 走 HTTP 缓存 ~150-335ms，但 984 mesh 的解析/装配在主线程同步进行）。本轮 QA 机器上从进入页面到 ready 达分钟级（受 §7 环境停滞干扰，精确数字不可靠；方向性结论：重入成本显著）。低配设备会更差。与 F4 同属 scene-lifecycle 主题。

**F6 · picking-manager 每次 hover 目标变更 O(N) 全量建 Map/Set**
- 事件驱动（已确认去重），当前 N≈结构数可接受。模型规模增大时需关注。测试基线固化（D-007），改动需先改测试，本轮不动。

## 9. Future 3D Lab Scalability（Architecture Audit）

当前 `BioScopeWorkspace + registry + 独立 Workbench` 模式（D-004）在两个模块下运转良好，但加入第三个 Lab（BIO-013A Synapse，随后更多 Mechanism Labs）时，以下**重复模式将线性复制**（均有代码证据）：

| 重复模式 | 现状证据 | 风险 |
|---|---|---|
| KnowledgeSection 组件逐字复制两份 | `anatomy-workbench.tsx` 与 `photosynthesis-workbench.tsx` 各有一份（样式略异） | 每 Lab 第 3、4 份拷贝 |
| 相机 ownership 模式（auto/manual + 470ms 定时回切） | 两 Workbench 各自实现 `setTimeout(...470)` / `useEffect` 460ms 版本 | 定时器卸载清理不一致（photosynthesis `enterScene` 的裸 setTimeout 未清理——本轮仅记录未修，属行为中性） |
| hover 链路（3D hover → 去重 → 状态提升 → tooltip） | 两套实现，anatomy 侧另有 resolvePick 管线 | 状态放 Workbench 根层，hover 变更重渲染整个 Workbench（当前规模可接受，mesh 增多后退化） |
| 相关知识 Dock、加载/错误 fallback、resetAll 模式 | 两套近似实现 | 每 Lab 重复成本 |
| Viewer 层约定不统一 | anatomy 用第三方 controller（isolate/focus/hover 内建），photosynthesis 手写 R3F viewer（自实现 camera rig/pose/emphasis） | Synapse 若再写第三套 viewer，交互行为（focus/isolate/emphasis 语义）大概率与现有两套不一致 |

**Recommended Direction（建议，非本轮实施）**：
1. **在 Synapse spike 开工前**（或作为其第一个子任务）先做一次小规模"Workbench 基建抽取"：共享 `KnowledgeSection`、`RelatedDock`、`useCameraOwnership`（含卸载清理）、hover/tooltip 原语。范围可控（纯 UI 层组件下沉 `components/workbench/`），不触碰 picking/知识数据/科学内容。
2. 为"机制类 Lab"定义一份**viewer 契约**（select/hover/emphasis/isolate/focus 的 props 语义），让 Synapse viewer 实现该契约而非再造一套；anatomy（第三方）与 photosynthesis 保留各自实现。
3. registry 迁移 lazy import（配合 F3），保证"每加一个 Lab 不增加其余 Lab 的初始加载成本"。
4. 本轮 Fix A/C 的教训应沉淀为约定：**凡是进入 identity-sensitive 第三方/R3F memo 链的 props（对象/数组字面量），一律模块常量或 useMemo**——建议写入 AGENTS.md 工程约定（本轮未改动该文件，避免与并行 Agent 冲突）。

## 10. CEO Decision Required?

**No。** 本轮全部发现与修复均在普通工程/技术决策范围内（CTO/DSH 可裁决），不涉及产品方向、Scope、不可逆操作或重大成本。

## 11. DSH Review Focus

1. **F1（fresh-install 断裂）**：请优先复现 `rm -rf node_modules && npm install`，确认诊断；决策"锁定 tarball vs 升级 patch 脚本"。在处理前，任何新环境/新 Agent 的安装都会失败，且**主树的 node_modules 不可轻易删除重装**（当前是唯一可用的已 patch 安装态）。
2. **两个 perf commit**：重点回归 anatomy 的 hover/选择/Fade/Isolate/Focus 行为与相机（patch 行为未触碰，但 appearance/visibleLayers 传入路径已改）；确认悬停提示位置更新在帧率级是否可接受（理论上是纯改善）。
3. **归属结论复核**：After 数据由"rAF-only"中间态与"A+C 完整态"两次测量支撑；如需单独拆分 A 与 C 的贡献，需增加"仅 C"测量组（本轮因测量窗口/环境稳定性限制未做，未编造数据）。
4. **F2 transmission / F3 bundle / F4/F5 lifecycle**：确认是否立项及优先级；F2 与低端 GPU 基线（Iris Xe）QA 建议同场做。
5. **§9 架构建议**：在 BIO-013A spike 派发前决定是否插入"Workbench 基建抽取"子任务。

---

*测量产物（临时探针、压力脚本）均为一次性注入，已全部移除；node_modules 已恢复至已验收 patch 态并经幂等校验。本报告仅存在于本任务分支，未修改 BOARD/DECISIONS/AGENTS（避免与并行 Agent 冲突，交由 CTO 整合）。*
