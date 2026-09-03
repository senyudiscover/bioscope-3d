# BioScope Architecture Map v1

> Deep Assurance #002 · Track A 产出（2026-09-03，branch `night-shift/2026-09-03-deep-assurance`）。
> 方法：对全部关键文件做第二轮通读（比 .ai-company/PROJECT.md 的第一轮更深），所有论断引用
> `文件:行号` 或 symbol；两轮独立探索交叉验证。阅读对象：未来接手的 AI Agent / DSH。
> 免责：行号对应本文提交时的 branch HEAD，后续演进会漂移，symbol 名是更稳的锚点。

---

## 1. 真实运行时入口（两条并行入口链，汇合于同一组件）

### 1.1 scripts 层

| script | 命令 | 说明 |
|---|---|---|
| `dev` | `vinext dev` | Vite+RSC 开发服务器 |
| `build` | `vinext build` | 生产构建 → `dist/{client,server}` |
| `start` | `wrangler dev --config dist/server/wrangler.json` | 必须先 `build`（dist 被 gitignore） |
| `local-build` | `vite build --config vite-spa.config.ts` | 纯 SPA → `dist-local/` |
| `local-start` | `vite preview` @ 127.0.0.1:3000 strictPort | 本地预览 |
| `postinstall` | `node scripts/patch-vanatome-camera.mjs` | patch 第三方查看器（见 §7） |

另有 Windows 一键链：`启动网站.cmd` → `启动网站.ps1`（local-build + local-start）。

### 1.2 路径 A：vinext/RSC（生产）

`vite.config.ts:52-59` 挂三个插件：`vinext()` + `@openai/sites-vite-plugin` 的 `sites()` +
`@cloudflare/vite-plugin` 的 `cloudflare()`（配置来自 `vite.config.ts:15-35`，读
`.openai/hosting.json`）。路由采用 Next 式 `app/` 目录：

```text
app/layout.tsx (RootLayout, lang="zh-CN", class="dark")
  └─ app/page.tsx: Home() → <BioScopeWorkspace />
       └─ app/bioscope-workspace.tsx:1 'use client'   ← 整个应用是一个客户端巨组件
```

### 1.3 路径 B：纯 SPA（本地推荐）

`index.html:13` → `src/main.tsx:6-10`（`createRoot(<StrictMode><BioScopeWorkspace/>)`）→
`app/globals.css`（coral 主题色 `--color-coral: #e57868` 定义于 `app/globals.css:101`）。

### 1.4 汇合点：workspace → module registry → workbench

- `app/bioscope-workspace.tsx:45-62`：唯一 state 是
  `moduleContext: ModuleContext = { moduleId: 'human-anatomy' }`（类型
  `lib/bioscope-core.ts:5-7`）；`activeModule = bioscopeModules[moduleContext.moduleId]`；
  `moduleSelector`（useMemo 包裹的 `AtlasSwitcher`）作为 prop 传给模块组件。
- `AtlasSwitcher`（bioscope-workspace.tsx:7-43）遍历 `bioscopeModuleList`；`status === 'experimental'`
  时渲染 BETA 角标。
- `data/modules/registry.tsx:5-30`：
  - `'human-anatomy'` → `<AnatomyWorkbench atlasSwitcher={...}/>`，`status: 'stable'`，
    `defaultKnowledgeNodeId: 'human'`
  - `'photosynthesis'` → `<PhotosynthesisWorkbench .../>`，`status: 'experimental'`，
    `defaultKnowledgeNodeId: 'photosynthesis'`
- 类型契约 `BioScopeModule` / `ModuleShellProps` / `BioScopeModuleId` 定义于
  `lib/bioscope-core.ts:42-57`。
- `data/modules/legacy.ts:5-13` `deprecatedExperimentalModules`（plant-atlas-legacy）只是
  字符串元数据，**零消费**——冻结标记，不是运行时代码。

## 2. 关键调用链：anatomy workbench（app/anatomy-workbench.tsx，1709 行）

### 2.1 模块级单例与常量

- `atlasLoader = createOfficialHumanAtlas()`（:64，`@vixotic/vanatome-atlas`）——**全应用唯一**
  的图谱加载器实例。
- `systemOrder`（:65-77）：11 个系统 id 的展示顺序。
- `displaySystem` / `displayStructure`（:80-83）：术语包装（`getSystemTerm().zh ?? .en`、
  `explorerPrimaryName`）。

### 2.2 State 全量清单（AnatomyWorkbench，:85-116）

| symbol | 行 | 语义 |
|---|---|---|
| `viewer = useVanatomeController([])` | :88 | 第三方控制器（selectedId/isolation/focusRequestKey/resetViewKey/select/focus/isolate/reset） |
| `atlas` / `catalog` / `provenance` / `loadError` / `progress` | :89-93 | 图谱加载四件套 + 进度 |
| `query` / `expandedSystems` | :94-97 | 左栏搜索/树展开（初始 `['cardiovascular']`） |
| `activeSystem` / `displayLayer` | :98-99 | 筛选（初始 `'all'` / `'mixed'`） |
| `hiddenIds` | :100 | EyeOff 隐藏的结构 id |
| `sceneReady` / `reloadKey` | :101-102 | viewer onReady / 重试（reloadKey 兼作 VanatomeViewer 的 key） |
| `hoveredId` | :103 | 经 picking 消歧后的 hover 目标 |
| `currentNodeId` / `modelContextId` / `knowledgeHistory` | :106-108 | 知识三件套（D-002：知识与模型语境分离） |
| `focusedId` / `cameraLevel` / `cameraOwnership` | :109-115 | 相机三件套（ownership 初始 `'manual'`） |
| `candidateIds` | :116 | picking 歧义候选菜单 |
| `selectAtlasStructure = viewer.select` | :117 | 控制器 select 别名 |

子组件局部：`VisualWorkspace.hoverTimer`（:982，110ms hover 防抖）与 `pointer`（:983，
tooltip/候选菜单坐标）。

### 2.3 关键 effect 与写入点

- **图谱加载**（:119-139）：`atlasLoader.loadProfile('full-body')` 后**强行覆盖**
  `modelUrl: '/models/z-anatomy-1.4.0-full-body.glb'`（:124-127）→ 见 §12 风险 5。
- **URL 深链**（:200-215）：读 `?anatomy=<id>`，`setCameraOwnership('auto')` +
  `selectAtlasStructure`；`heart` / `heart-*` 特判映射到知识节点 `heart`（:208）。
- **selectStructure**（:217-242）：核心写入点——`selectAtlasStructure(id)`、URL
  `history.replaceState` 同步（:221-239）、`setCameraLevel`、`setCurrentNodeId` +
  `setModelContextId`（heart 特判）、展开所属系统；`id=null` 全部回落 `'human'`。
- **cameraOwnership 自动→手动**（:244-248）：viewer.selectedId/focusRequestKey 变化 460ms 后。
- **chooseKnowledgeNode**（:250-271）：push knowledgeHistory → setCurrentNodeId；**仅当**
  `primaryModelStructureId(node)` 存在于 structureMap 时才 setModelContextId +
  selectAtlasStructure（:258-270）——知识导航不触发相机对焦（D-002 的实现处）。
- 其余：`goBackKnowledge`（:273-280）、`changeSystem`（:341-374，musculoskeletal→
  muscular+skeletal 展开特判 ：345-351）、`changeDisplayLayer`（:375-385）、
  `focusSelected`（:323-334）、`hideSelected`（:335-340）、`resetAll`（:421-437）、
  `retryAtlas`（:438-443）。

### 2.4 派生数据（useMemo）

`structureMap`（:141）、`selectedStructure`（:145）、`hoveredStructure`（:148）、
`fallbackNode`（:150-169，`model:<id>` 伪知识节点）、`currentNode`（:170）、
`enabledDisplayLayers`（:173）、**`viewerAtlas`**（:177-198：mixed+系统筛选时把非本系统结构
`selectable:false` 配合 ghost 显示，其余走 `createFilteredAtlas`）、`modelContextNode`（:282）、
`structuresBySystem`（:288）、`searchResults`（:299，截断 60 条）、`systems`（:312）。

### 2.5 hover / select / focus / isolate 链路（lib 消费点）

```text
VanatomeViewer onHover
  → resolveModelPick(:386-405) → lib/picking-manager.resolvePickCandidates
  → VisualWorkspace.handleHover(:990-997) 消歧取 primary → 110ms 防抖 → setHoveredId
  → emphasisId = hoveredStructure?.id ?? systemRootId(:980-981) 回传 viewer

VanatomeViewer onSelect
  → handleViewerSelect(:406-420) → resolvePick
     ├─ resolution.ambiguous → setCandidateIds → CandidateMenu(:1201-1254)
     └─ else selectStructure(resolution.primary.id)

focusSelected(:323) → viewer.focus() → focusRequestKey → VanatomeViewer
  （focus 行为依赖 postinstall patch 的第三方契约，见 §7/§12）

ViewerControls(:1255-1311)「保留语境」→ viewer.isolate(id,'parent-context')(:1137-1140)
                            「隔离」→ viewer.isolate(id,'selected')(:1141-1144)
```

`lib/anatomy-filters` 消费点：viewerAtlas(:184/:192)、搜索(:750)、availableDisplayLayers(:174/:353)、
matchesDisplayLayer(:383)、选项表(:1032/:1039)。
`lib/anatomy-terminology` 消费点：getSystemTerm(:81/:782)、getStructureTerm（TreeStructure :870、
tooltip :1118、CandidateMenu :1235、KnowledgePanel :156）、explorerPrimaryName(:83)。

### 2.6 内部子组件（同文件内联，非独立文件）

`TopNavigation`(:537)、`ScaleNavigator`(:647)、`ExplorerPanel`(:692)、`TreeStructure`(:859)、
`VisualWorkspace`(:939，props 类型 :904-938 有 30+ 字段)、`FilterControl`(:1154)、
`CandidateMenu`(:1201)、`ViewerControls`(:1255)、`KnowledgePanel`(:1313)、`KnowledgeSection`(:1557)、
`LicenseNote`(:1587)、`RelatedKnowledgeDock`(:1610)、`ModelLoading`(:1671)、`LoadFailure`(:1690)。

## 3. 关键调用链：photosynthesis workbench（BETA）

- State（app/photosynthesis-workbench.tsx:43-56）：`visualContext`（仅 sceneId）、`selectedId`、
  `hoveredId`、`knowledgeContext`、`modelContextId`、`knowledgeHistory`、`focusRequestKey`、
  `cameraOwnership`。**没有任何 step 相关 state**。
- 方向相反的知识联动：anatomy 是「知识选择→可选模型」，photosynthesis 的
  `selectStructure`（:84-89）是「mesh 点击→microStructureTerms[id].knowledgeNodeId→自动切知识」，
  映射缺失时静默跳过（`if (knowledgeId)`，:88）。
- 下钻门禁 `canExplore`（:64-67）硬编码：mesophyll-cell+chloroplast 或
  chloroplast+(granum|thylakoid)；`enterScene`（:91-101）一次性同步五个 state +
  470ms 后归还相机。
- Viewer：components/photosynthesis/photosynthesis-viewer.tsx（773 行，'use client'）。
  `PhotosynthesisViewer`(:756-773) = R3F `<Canvas>`（fov 37, dpr [1,1.75]）；
  `sceneCameraPose`(:29-42) / `focusPoses`(:44-65, 键 `${scene}:${selectedId}`) 硬编码；
  `CameraRig`(:88-156) useFrame 430ms 三次缓出 lerp；场景组件 MesophyllCellScene(:431)、
  ChloroplastScene(:522)、ThylakoidScene(:637)（PSII/电子传递/PSI/ATP合酶是 ProteinPlaceholder）。
- 数据：data/photosynthesis/micro-lab.ts —— `lightReactionSteps`（:22-75，6 步，当前 UI 唯一
  消费点是 MicroExplorer 的"已预留 N 个步骤"占位 ：384-392）、`photosynthesisScenes`（:77-113，
  线性场景链）、`microStructureTerms`（:128-207，19 项 mesh→知识映射）、
  `nextPhotosynthesisScene`（:121-126，**死导出**）。
- 详见 docs/audit/PHOTOSYNTHESIS-ARCHITECTURE-v1.md。

## 4. 知识流与数据流

- 类型：`data/knowledge/anatomy.ts:56-110` `KnowledgeNode`（summary / coreFunctions≤3 /
  mechanism / keyStructures{id?→知识节点, modelRef?→3D结构} / whyItMatters / related≤5 /
  exploreQuestions{why,how,whatIf} / modelStructureIds / modelRef）。
- `primaryModelStructureId(node) = modelStructureIds?.[0] ?? modelRef`（anatomy.ts:113-117）。
- 合并：`data/knowledge/index.ts:8-11` `{...anatomy, ...plants}`（碰撞时 plants 静默胜出，
  防线是 validator 的 MERGE_COLLISION）；`sharedKnowledgeNodeIds`（:13-20）。
- `lib/knowledge-nodes.ts` 是兼容再导出 shim（两个 workbench 均从这里 import）。
- **KnowledgeCard 组件并不存在**：知识卡是两个各自内联的同构面板——anatomy `KnowledgePanel`
  （anatomy-workbench.tsx:1313-1556，六段式 + keyStructures 双通道跳转 ：1434-1466 +
  exploreQuestions 渲染 ：1485-1538）与 photosynthesis `MicroKnowledgePanel`
  （photosynthesis-workbench.tsx:475-601，keyStructures 纯展示）。
- Related 渲染：`RelatedKnowledgeDock` / `MicroRelatedKnowledge` 对悬空 targetId
  **静默丢弃**（validator 注释点名此行为）。
- 守护设施：`lib/knowledge-graph-validator.ts`（ERROR/WARNING/INFO 分级）+ 两个只读审计
  （validate:knowledge / audit:knowledge-chain / knowledge-graph-deep-audit）。

## 5. 状态所有权（摘要表；无任何全局 store，无 context/zustand/redux）

| 状态 | 所有者 | 写入者 | 备注 |
|---|---|---|---|
| moduleId | BioScopeWorkspace | AtlasSwitcher | 切换=整树卸载重建 |
| currentNodeId / modelContextId / knowledgeHistory | AnatomyWorkbench | selectStructure/chooseKnowledgeNode/goBackKnowledge/resetAll/URL effect | D-002 |
| activeSystem / displayLayer / hiddenIds / hoveredId / candidateIds | AnatomyWorkbench | 对应 handler | |
| 3D selectedId / isolation | **第三方控制器** viewer | viewer.select/isolate | selectStructure 间接写 |
| cameraLevel / cameraOwnership / focusedId | AnatomyWorkbench | focusSelected/changeSystem/460ms effect | |
| URL `?anatomy=` | window.location（隐式第三通道） | selectStructure/resetAll/深链 effect | 仅 anatomy 参与 |
| photo 侧 8 个 state | PhotosynthesisWorkbench | chooseKnowledgeNode/selectStructure/enterScene/resetLab | 与 anatomy 同名概念互不相通 |
| 相机动画/selectedIdRef | CameraRig 内部 ref | useFrame/useEffect | |

**结论**：两个 workbench 的同名 state（currentNodeId/knowledgeHistory/…）互不相通；
`sharedKnowledgeNodeIds` 目前只是数据层概念，没有运行时共享状态。跨模块学习连续性不存在。

## 6. 双构建路径与 wrangler（详见 BUILD-DEPLOYMENT-RISK-v1.md）

| 维度 | vite.config.ts（vinext） | vite-spa.config.ts（SPA） |
|---|---|---|
| 插件 | vinext + sites + cloudflare | 仅 @vitejs/plugin-react |
| publicDir | `public/`（**models/ 为空**） | `local-public/`（GLB 在位） |
| alias `@` | vinext 自行解析 tsconfig paths | 显式（:14）；vitest.config 只镜像这一条 |
| 产物 | dist/client + dist/server | dist-local/ |

D1/R2 绑定是**纯占位**（`.openai/hosting.json` = `{"d1":null,"r2":null}` → 空
d1_databases/r2_buckets；业务代码零消费）。`dist/server/wrangler.json` 由
@cloudflare/vite-plugin 在 build 时生成。**生产路径当前缺人体 GLB**（见 §12 风险 5）。

## 7. 第三方 Vanatome 边界

- import 面（共 4 个业务文件 + 2 个测试 + 1 个 patch 脚本）：anatomy-workbench.tsx:11-21
  是**唯一**使用第三方运行时的文件（VanatomeViewer、useVanatomeController +
  createOfficialHumanAtlas）；lib/{picking-manager,anatomy-filters,anatomy-terminology}.ts
  只 import 类型。
- `@vixotic/vanatome-react@0.1.6` 的包面很大（composeVanatomeAtlases、createVanatomeHierarchy、
  getVanatomeDescendantIds、resolveStructureVisibility 等），项目**只用 2 个值导出 + 3 个类型**；
  层级/可见性工具被 lib/ 自研实现替代。
- `@vixotic/vanatome-atlas@0.1.4`：只用 `createOfficialHumanAtlas`；GLB 不在 npm 包内，
  catalog 从 `https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json` 拉取（buildId
  严格校验），GLB 路径被 app 强写为本地 `/models/`。
- postinstall patch：scripts/patch-vanatome-camera.mjs 对
  `node_modules/@vixotic/vanatome-react/dist/VanatomeViewer.js` 做 5 步 sentinel 幂等替换
  （focus 守卫 + maxDistance 不收缩）；契约由 tests/camera-patch-contract.test.ts 自动验证。
  详见 docs/audit/CAMERA-PATCH-RISK-v1.md。

## 8-11. 生命周期分类（详见 CODE-LIFECYCLE-INVENTORY-v1.md，此处为架构视角摘要）

- **stable**：app/{layout,page,bioscope-workspace,anatomy-workbench}.tsx、src/main.tsx、
  data/modules/registry.tsx、data/knowledge/{anatomy,index}.ts、lib/knowledge-nodes.ts、
  lib/{picking-manager,anatomy-filters,anatomy-terminology}.ts、
  components/ui/{button,input,scroll-area}.tsx、scripts/patch-vanatome-camera.mjs、全部 tests/。
- **experimental**：app/photosynthesis-workbench.tsx、components/photosynthesis/、
  components/micro-lab/、data/photosynthesis/micro-lab.ts、data/knowledge/plants.ts、
  lib/bioscope-core.ts（抽象目前仅被 BETA 模块消费）。
- **deprecated / FROZEN（CEO 决策 D-006，禁止删除）**：app/plant-workbench.tsx、
  components/plant/plant-viewer.tsx、data/plant/plant-explorer.ts、data/modules/legacy.ts。
- **dormant / reserved（D-008 等，禁止扩展与删除）**：lib/content-schema.ts + content/、
  isPublishableBiologyNote、`molecular`/`molstar`、MechanismStep.duration/cameraTarget/visualState、
  nextPhotosynthesisScene（死导出）、modelNodeMap、sharedKnowledgeNodeIds、getRelationReason
  （双份定义）、~67 个未使用 shadcn ui 组件、next.config.ts/.next（Next 时代残留）。

## 12. 当前架构最危险的耦合点 Top 5

1. **postinstall patch 产物耦合**（风险最高）：patch 脚本与 `@vixotic/vanatome-react@0.1.6`
   的编译输出逐字符绑定（`^0.1.6` caret 范围与"patch 固化第三方源码"矛盾）；上游任何
   0.1.x 变化 → `npm install` 整体失败。anatomy-workbench 的 cameraOwnership 460ms 归还
   （:244-248）与 patch 后行为是共调的隐形协议。
2. **1709 行巨型组件 + 30+ prop 钻孔**：anatomy-workbench 一个客户端组件持有 20 个 state +
   14 个内联子组件 + URL 副作用 + 图谱加载；workbench 层零测试，任何状态联动重排只能手测。
3. **双份手绘细胞器/相机代码**：photosynthesis-viewer（430ms）vs 冻结的 plant-viewer
   （460ms）vs workbench 归还计时（470/460ms）三处魔法数平行演化；D-006 冻结导致无法合并。
4. **知识注册表 object-spread 合并 + 双份符号**：index.ts spread 静默覆盖 + getRelationReason
   双实现（anatomy.ts:140 / index.ts:22）+ LightReactionStep 双字段 alias——三类漂移均已
   有 validator 检测（MERGE_COLLISION/STEP_ALIAS_DIVERGENCE），但只在 npm 脚本时运行。
5. **硬编码模型路径 × publicDir 分叉 × URL 侧信道**：`/models/z-anatomy-1.4.0-full-body.glb`
   硬编码（:126）而资产只在 local-public（D-009）→ vinext 生产链路静默 404；
   `?anatomy=` URL 通道与 React state、viewer controller 并列，RSC/SPA 环境行为不对称。

---
*生成：Deep Assurance #002（ZCode/GLM-5.3-Flash），Track A + Track G + Track L 三路独立
探索交叉验证；Track O 独立复审意见见 INDEPENDENT-REVIEW-v1.md。*
