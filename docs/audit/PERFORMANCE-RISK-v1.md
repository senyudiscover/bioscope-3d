# BioScope Performance Risk v1

> Deep Assurance #002 · Track J 产出（2026-09-03）。只读静态分析 + 第三方包源码核对；
> 未引入 benchmark 依赖，未修改任何文件。**所有优化建议均未执行**。
>
> 规模基线（实测，修正任务假设）：远端 catalog 声明 `curated-full-body` =
> **807 structures / 984 nodes / 31,849,556 bytes**（与本地 GLB 字节数一致，即当前实际
> 加载 N=807；全部 12 个 bundle 合计也只有 1614）。全文按 N=807（现状）与 N=4000-8000
> （压力假设）双轨标注。全仓库 app/components/hooks 中 **0 处 React.memo**。

---

## 1. 必查清单逐项结论

### 1.1 anatomy-workbench useMemo 派生链 —— 依赖数组不宽；问题在整组件重渲染

`structureMap [atlas]`(:141-144)、`enabledDisplayLayers [activeSystem,atlas]`(:173-176)、
`viewerAtlas [activeSystem,atlas,displayLayer]`(:177-198)、`structuresBySystem [atlas]`(:288-298)、
`searchResults [atlas,query]`(:299-311)、`systems [catalog,structuresBySystem]`(:312-321)。
hoveredId(:103)不在任何依赖中 → **hover 变化触发 0 个 memo 重算**。
风险：低（无需修依赖）；真正的开销见 1.6。

### 1.2 hover 热路径 —— 110ms 防抖只救了"渲染"，没救"解析"

`handleHover`（anatomy-workbench.tsx:990-997）：`resolvePick(id)` **同步全量执行，不防抖**；
防抖只包住 `setHoveredId`。第三方 onHover 并非每帧——VanatomeViewer `handlePoint` 用
pointedKeyRef 去重，仅在"命中结构 id 穿越"时回调（dist/VanatomeViewer.js:617-623）。

单次 `resolvePickCandidates`（picking-manager.ts:80-121）：重建 byId Map（O(N)，:82）+
createPickableStates（O(N)，含每结构 2 次 displayLayersFor=4 正则，:66/:73）+
hiddenIds→getDescendants（**O(hidden×N)**，:60，内部每次重建 children Map）+
isolation/selectedBranch 两次 getDescendants（:61-62/:86）+ 0.16 邻域全量 hypot（:88-91）
+ 评分排序（:92-114）。

量级：N=807 ≈ **1-3ms/穿越**（~7 遍全量扫描 + ~6500 次正则）；快速扫动 20-40 穿越/s
→ 20-100ms/s CPU。N=8000 → 单次 **10-30ms**，扫动可感卡顿；每次 hover 新建 ~N 个
PickableStructure 对象（GC 压力）。
基准方法：perf_hooks 临时基准（复用 picking 测试的 fixture，807/4000/8000 三档 ×200 次
循环取 mean/p95）；浏览器侧 Performance + 4× CPU throttle。
风险：**中**（807 尚可，数据增长后高危）。值得修（见 Top5-2）。

### 1.3 picking-manager —— 可缓存的全没缓存

byId Map（:82）、children Map（:30-45）、每结构 displayLayersFor 结果（:73 spread）、
hiddenIds 并集（:60）——这些输入在一次 hover 会话内不变，全部每次重算。
缓存后：首次 O(N) + 后续 O(seed)。**必须保持纯函数与确定性**（两套 picking 测试钉死语义）。
风险：中。

### 1.4 anatomy-filters —— 切换路径可接受；displayLayersFor 进入 hover 热路径

`createFilteredAtlas` 仅被 viewerAtlas useMemo 调用（切换时）；`availableDisplayLayers`
每次切系统 2×6×N 正则套件 ≈ 9700 次@807（<2ms），N=8000 ≈ 20-60ms（可感知）。
风险：低（切换）/ 中（热路径，随 1.3 一并缓存）。

### 1.5 anatomy-terminology —— getStructureTerm 无 memo，最易修

`getStructureTerm`（:677-703）每次 = parseModelSide（2 正则）→ 查表 → 未命中则
translateComposedName（normalize 4 replace + 33 phraseTerms 逐个 /gi replace + 分词查表，
≈40 正则）。调用密度：TreeStructure 每行 2 次（:870/:892，整树 ~400 行 → ~3.2 万正则/渲染）；
**搜索每键入对全部 N 个结构跑一遍**（searchResults :299-311，截断 60 只省渲染不省过滤；
N=8000 ≈ 10-40ms/键，打字可感）；tooltip 每次 2 次；fallbackNode 同结构连续 2 次（:156-158）。
风险：**中（现状即有感知），性价比极高**（Map 记忆化，零行为变化）。

### 1.6 React 重渲染面 —— 全场最大隐藏成本：appearance 对象身份

- 20 个 useState 集中于单组件（:89-116）；全仓 0 处 React.memo；VisualWorkspace ~33 props
  （:471-508）→ hover 提交（110ms 后）= 整棵工作台树重渲染。
- **每次鼠标移动**：`<section onPointerMove>` :1002-1008 `setPointer({x,y})` →
  VisualWorkspace 重渲染 → :1072-1081 `appearance={{...}}` **每次都是新对象字面量** →
  第三方材质 effect 依赖含 appearance（VanatomeViewer.js:267-277 deps）→ **每次鼠标移动
  全场景 traverse（~千级对象）+ 每材质 needsUpdate**。N=8000 时 10-30ms/帧级，移动即掉帧。
- photosynthesis 侧：8 个 state、onHover 无防抖直连（:173），但场景仅几十 mesh，量级小。
- 风险：**高**（appearance 身份是全局最划算修复点，Top5-1）。

### 1.7 R3F —— photosynthesis 空闲安全；anatomy 是第三方黑盒

CameraRig useFrame 空闲早退（photosynthesis-viewer.tsx:126-140）；`dpr={[1,1.75]}` 已封顶
（:765）✓。meshPhysicalMaterial transmission（:395/:541）小场景低风险。
anatomy 侧 VanatomeViewer **Canvas 无 dpr prop**（HiDPI 2× 渲染，黑盒）；材质 effect 见 1.6。
风险：photosynthesis 低 / anatomy 中（修复点在应用侧）。

### 1.8 知识查找 —— 无问题

RelatedKnowledgeDock 内联 map/filter/slice(:1610-1668) 成本微不足道；MicroRelatedKnowledge
已 useMemo。`getRelationReason`（双份定义）**0 调用点**（死代码，见 CODE-LIFECYCLE-INVENTORY）。

### 1.9 模块切换 —— 单例避免网络重拉，但整树重建

`atlasLoader` 模块级单例（:64）✓；loader 内部缓存 catalog/metadata（vanatome-atlas
dist/loader.js）→ 切回**不重新 fetch 元数据** ✓。但整树卸载重建：WebGL 上下文销毁/新建、
31.8MB GLB 重新请求（HTTP 缓存视服务器头）、O(N) 索引重算一次。风险：中（切换期一次性；
修复方向 keep-mounted 属产品决策，非性能微调）。

### 1.10 大数组 —— 截断良好

searchResults 截断 60（省渲染不省过滤，见 1.5）；structuresBySystem 单次 O(N) 分组 ✓；
hiddenIds flatMap getDescendants（O(hidden×N)/hover，并入 1.3）；ExplorerPanel filter ≤60 项 ✓。

## 2. Top 5 优化机会（性价比排序；均未执行，供 BACKLOG PROPOSAL）

| # | 优化 | 位置 | 收益 | 工作量 | 风险 |
|---|---|---|---|---|---|
| 1 | 稳定 `appearance` 身份（提模块级常量/useMemo([])，数值原样）+ rAF 合并 setPointer | anatomy-workbench :1072-1081、:1002-1008 | 消除"每次鼠标移动→全场景材质刷写"最大热路径 | XS | 低（视觉零变化） |
| 2 | pick 解析移入防抖 + picking 索引缓存（byId/children/displayLayersFor WeakMap，按 structures identity） | :990-997、picking-manager | hover 穿越 O(N)×7 → 亚毫秒（N 大时） | S-M | 中：必须保持纯函数确定性（测试钉死） |
| 3 | getStructureTerm 记忆化（Map keyed id\0name） | anatomy-terminology | 树/搜索/tooltip ~40 正则/次消失；打字 10-40ms → <2ms | XS-S | 低（零行为变化） |
| 4 | hoveredId 状态下沉 / 面板 React.memo | anatomy-workbench | hover 提交重渲染面从整页 → 仅 3D 区 | M | 中（注意 setHoveredId(null) 通道） |
| 5 | 搜索索引前置（加载时预生成小写索引） | searchResults | 打字成本 O(N×正则) → O(N×includes) | S | 低 |

## 3. "不要动"清单（stable 资产 / 行为固化）

1. patch 脚本 + postinstall 链 + camera 契约测试（行为契约）。
2. picking 评分语义（0.16/权重/internal-structures/同分字母序/重复 id 后者胜出/NaN 确定性
   ——两套测试钉死）；任何缓存化不得改变同输入输出。
3. appearance 数值本身（只许稳定身份，不许改值）。
4. 110ms hover 防抖阈值与 tooltip 手感。
5. GLB/modelUrl/远程 catalog 链路（BUILD-DEPLOYMENT R3）。
6. 知识数据与校验链。
7. vanatome-react 内部实现（黑盒，只能经补丁通道，默认不动）。

---
*核心结论：N=807 时一切尚可，但存在三条随 N 线性放大、今天已在扫动/打字时可感的浪费路径
（appearance 身份 / 无缓存 pick 解析 / 无 memo 术语），修复均为 XS-M 且不触碰固化行为。
生成：Deep Assurance #002 Track J（独立探索 Agent 产出，EM 抽查收编）。*
