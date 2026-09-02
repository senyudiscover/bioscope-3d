# BioScope Accessibility Audit v1

> Deep Assurance #002 · Track K 产出（2026-09-03）。纯静态读码（未改任何文件）；
> 对比度为 WCAG 公式静态估算，非取色实测。3D Canvas 内的指针交互按约定不视为
> "可点击非按钮"缺陷，但**键盘替代路径是否存在**仍计入。

---

## SEVERE

### S1 · 光合作用模块：进入类囊体尺度的唯一入口是 3D 点击，键盘/读屏用户被永久卡在叶绿体层

- `canExplore`（photosynthesis-workbench.tsx:64-71）要求 selectedId === 'granum' | 'thylakoid'；
  selectedId 的**唯一设置路径**是 R3F onClick（:84-89 → viewer onSelect）——无任何按钮可设置。
- 面板级导航被禁用：MicroExplorer 场景按钮 `disabled={!reachable}`（:329-340）。
- 反差：anatomy 的 Key Structures 是可点按钮（anatomy-workbench.tsx:1441-1466），光合的
  "关键结构"是**非交互 div**（:554-564）。文案自己承认（:588-592）："请在模型中点击基粒或
  类囊体，再进入下一尺度。"
- 影响：键盘/读屏学习路径在第二层终止，PSII/电子传递/ATP 合酶全部不可达。
- 建议：把关键结构条目改为 button（照 anatomy :1441 模式，点击 selectStructure），
  局部且不改指针体验——但触及产品交互流，**先报告评审再落地**。

## MODERATE

| # | 问题 | 证据 | 建议 | 定性 |
|---|---|---|---|---|
| M1 | 光合 Canvas 的 aria-label 挂在无 role/无 tabIndex 的 div 上，读屏大概率忽略 | photosynthesis-viewer.tsx:756-772（对照 VanatomeViewer.js:692 的 role="application"+tabIndex:0） | Canvas 传 role="application" tabIndex={0} | 可直接修 |
| M2 | CandidateMenu 无弹层语义/焦点管理：无 role/aria-label、Esc 经 viewer wrapper 监听而菜单是兄弟节点（Esc 无效）、关闭 X 无名、关闭后焦点掉 body | anatomy-workbench.tsx:1123-1131、:1201-1254、:1224-1230；VanatomeViewer.js:699-701 | role="dialog"+aria-label+autofocus+Esc 原生监听+焦点归还 | 可直接修 |
| M3 | 知识面板切换无 aria-live；返回按钮 unmount 后焦点丢失 | anatomy :273-280/:1386-1402；photosynthesis :515-525 | aria-live="polite" / disabled 占位 | 可直接修 |
| M4 | 控件选中态无 ARIA 状态（FilterControl 无 aria-pressed、树 toggle 无 aria-expanded、ScaleNavigator 无 aria-current） | anatomy :1174-1195、:795-828、:653-672；正面对照 bioscope-workspace.tsx:27 有 aria-pressed | 批量补属性，零视觉变化 | 可直接修 |
| M5 | 解剖树无层级语义（button 平铺 + paddingLeft 表达层级） | anatomy :762-853、:882 | 短期补 aria-expanded/aria-level；完整 treeview 仅报告 | 半可修 |
| M6 | 图标按钮可访问名缺失（两个无名 X）或仅靠 title（EyeOff/重置等） | anatomy :733-739、:1224-1230、:639-641、:1288-1308；photosynthesis :207-214 | 补 aria-label | 可直接修 |
| M7 | atlas 为 null 时的加载/错误分支不走库内 aria-live：ModelLoading/LoadFailure/进度数字裸奔 | anatomy :1100-1102、:1047-1048、:1683-1685、:1690-1708 | role="status" / role="alert" | 可直接修 |
| M8 | 暗色主题灰阶文本对比大面积不足（bg≈#0a0a09）：zinc-600≈2.5:1、zinc-700≈1.9:1、zinc-500≈4.1:1（小字不达标）+ 正文 7-10px | globals.css:65-98；anatomy :593/:810/:1512/:1547；photosynthesis :315/:418-452/:467(text-[7px]) | 映射替换+最小字号——属全局视觉基调，**仅报告** | 仅报告 |
| M9 | hover tooltip 仅指针可达（有替代路径：树/知识面板有持久命名，降级 MODERATE） | anatomy :1104-1122；photosynthesis :178-185 | 视觉隐藏的 aria-live 状态区 | 可选 |

## MINOR（打磨项）

1. lucide 图标未 aria-hidden（lucide-react 默认属性不含）；2. onDoubleClick 聚焦无键盘等价
（有按钮替代，不动）；3. License 外链无新窗口提示；4. 光合相机动画未按 prefers-reduced-motion
关闭（VanatomeViewer 库内已处理，自研 CameraRig 没有）；5. 三个 panel 的 landmark 无可访问名；
6. 触控目标 icon-sm=28px（>AA 24px，<AAA 44px）；7. 禁用尺度说明仅 title。

## OK（做得对的）

1. **零"可点击 div/span"**——全部点击目标均为真 button；2. 零 tabIndex 干预、无键盘 trap；
3. VanatomeViewer ariaLabel 传了中文（"可交互的生命科学模型工作区"，anatomy :1094）；
4. AtlasSwitcher 有 aria-pressed+title（bioscope-workspace.tsx:27-28）；5. 两处 nav 命名；
6. details/summary 原生 disclosure 用得恰当（KnowledgeSection/EXPLORE）；7. focus-visible ring 达标；
8. html lang="zh-CN"；9. 主色 coral #e57868 对暗底 ≈6.8:1 达标。

## 可直接修 Top 3（确定、局部、无争议）

1. 补 ARIA 状态：FilterControl aria-pressed、树 toggle aria-expanded、ScaleNavigator
   aria-current（三处一行属性，零视觉变化）。
2. 两个无名 X 按钮 aria-label（搜索清除、候选菜单关闭 + 容器 role="dialog"）。
3. ModelLoading role="status"、LoadFailure role="alert"。

（本轮全部未执行——待 DSH 批准后作为独立小 commit 落地，见 BACKLOG PROPOSAL。）

---
*生成：Deep Assurance #002 Track K（独立探索 Agent 产出，EM 抽查收编；
与 ARCHITECTURE-MAP-v1.md §2.6 组件清单、PERFORMANCE-RISK-v1.md §1.6 交叉一致）。*
