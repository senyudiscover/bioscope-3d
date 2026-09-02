# BioScope Photosynthesis Architecture Audit v1

> Deep Assurance #002 · Track G 产出（2026-09-03）。只读审计，未改任何代码。
> 核心问题：**`MechanismStep` 抽象是否真的足够支持 BIO-002A（机制导航 MVP）？**
> 结论先行：**PARTIAL FIT** —— 内容面可直接用；呈现面是零消费占位 schema，
> 缺三件事（步骤→mesh 映射、遍历 API、步骤状态），viewer 无现成 emphasis 通道；
> 补最小清单后即可落地，不需要推翻抽象。

---

## 1. 核心抽象定义（lib/bioscope-core.ts）

| Symbol | 行号 | 字段 |
|---|---|---|
| `VisualContext<SceneId>` | :10-12 | 仅 `sceneId` —— **没有 step/selection 维度** |
| `KnowledgeContext` | :14-17 | 仅 `nodeId` |
| `VisualScene<SceneId>` | :19-29 | id / type('atlas'\|'micro-lab'\|'molecular') / scale / titleZh / titleEn / knowledgeNodeId / parentSceneId? / childSceneIds / viewerKind('vanatome'\|'r3f'\|'molstar') |
| `MechanismStep` | :31-40 | id / titleZh / titleEn / description / knowledgeNodeIds / **duration? / cameraTarget? / visualState?（三个可选呈现字段）** |
| `getParentScene` / `getPrimaryChildScene` | :59-72 | 场景级导航 helper |

关键观察：`MechanismStep` 是纯内容 schema；三个可选呈现字段**全项目零消费**（grep 证实只在
类型定义出现）。抽象层没有步骤顺序/遍历 API、`VisualScene` 无 mechanismStepIds 关联字段、
`visualState` 是无约定的自由 Record。

## 2. 数据层核对（data/photosynthesis/micro-lab.ts）

### 2.1 lightReactionSteps 逐字段核对（:22-75）

| id | titleZh | knowledgeNodeIds | duration/cameraTarget/visualState |
|---|---|---|---|
| photon-absorption | 光子吸收 | ['light-reactions','chloroplast'] | — 全部未填 |
| water-oxidation | 水参与并释放氧气 | ['oxygen','light-reactions'] | — |
| electron-transport | 电子传递 | ['electron-transport-chain','light-reactions'] | — |
| proton-gradient | 质子梯度 | ['light-reactions','atp-synthase'] | — |
| atp-synthesis | ATP形成 | ['atp-synthase','atp'] | — |
| nadph-formation | NADPH形成 | ['light-reactions','photosynthesis'] | — |

- 6 步全部**没有** duration/cameraTarget/visualState —— 呈现字段真实使用率 0%。
- 每步有中文 description（含教学纠错表述，如"氧气主要来源于水"）。
- 所有 knowledgeNodeIds 均可解析（validator ERROR 级保证）。

### 2.2 其余数据

- `photosynthesisScenes`（:77-113）：3 场景线性链（mesophyll-cell → chloroplast → thylakoid），
  **没有场景字段引用机制步骤** —— 步骤与场景图完全解耦，只在 thylakoid 场景"事实上"相关。
- `microStructureTerms`（:128-207）：19 项；**5 项缺 knowledgeNodeId**：
  outer-membrane、inner-membrane、stroma、photosystem-ii、photosystem-i（:172-174,195,201）
  —— 直接影响"步骤点击即学"（见 §7-4）。
- 死代码：`nextPhotosynthesisScene`（:121-126）零 import（workbench 用 getPrimaryChildScene）。

## 3. 工作台层（app/photosynthesis-workbench.tsx）

- State（:43-56）无 step 概念；`canExplore`（:64-67）硬编码两处下钻门禁；
  `enterScene`（:91-101）同步五个 state + 470ms 归还相机。
- `selectStructure`（:84-89）经 microStructureTerms 映射切知识，**映射缺失静默跳过**
  （:88 `if (knowledgeId)`）→ thylakoid 场景点击 PSII/PSI 只高亮 mesh，知识面板不动。
- "MECHANISM / PHASE 2 已预留 N 个步骤"占位（:384-392）是 lightReactionSteps 在 UI 的
  **唯一消费点**（`:389` 读 `lightReactionSteps.length`）。

## 4. Viewer 层（components/photosynthesis/photosynthesis-viewer.tsx，773 行）

- **高亮通道**：唯一机制是 `selectedId`/`hoveredId` 单值相等比较（每个 mesh 自算
  `active = props.selectedId === '<id>' || props.hoveredId === '<id>'`，如 :253-254/:380/:403；
  `ProteinPlaceholder` 收 `selected: boolean` :593-635）。**没有 anatomy 式数组 emphasis 通道**。
- **步骤级定位所需的稳定 mesh id 已存在**（经共享 handlers() 工厂 :67-86 挂接）：

| mesh | id | 位置 |
|---|---|---|
| ProteinPlaceholder | `photosystem-ii` | :679-686 |
| 三圆柱 group | `electron-transport` | :687-704 |
| ProteinPlaceholder | `photosystem-i` | :705-712 |
| ProteinPlaceholder | `atp-synthase` | :713-721 |
| 膜 RoundedBox | `thylakoid-membrane` | :654 |
| 腔 RoundedBox | `thylakoid-lumen` | :669 |

  → 步骤→mesh 映射在数据层可行。无 mesh 表示的对象：光子、水/O₂、NADPH、质子
  （只能借 thylakoid-lumen 示意）、Calvin 循环（完全无）。
- **相机**：`sceneCameraPose`(:29-42) 与 `focusPoses`(:44-65, 键 `${scene}:${selectedId}`，
  仅 5 条，thylakoid 场景只有 `thylakoid:atp-synthase`) 硬编码；`CameraRig`(:88-156)
  useFrame 430ms 三次缓出 lerp，`onStart` 取消。**仅改 selectedId 不 bump focusRequestKey
  相机不动**（:108-124，有意设计）→ "步骤切换自动运镜"必须显式 bump 或扩展 pose 表。

## 5. 判定：**PARTIAL FIT**（对照 BIO-002A 验收标准）

| MVP 诉求 | 现状 | 判定 |
|---|---|---|
| ① 前后切换步骤 | 数组下标可用；无 lib 级遍历 helper | ⚠️ 半满足 |
| ② 当前步骤状态 | VisualContext 无 step 维度；workbench 无 step state | ❌ 缺失 |
| ③ 知识/机制内容同步 | knowledgeNodeIds 完备且不悬空；chooseKnowledgeNode 链路现成 | ✅ 数据就绪 |
| 步骤视觉高亮 | 无 meshIds 映射；viewer 无 emphasis 通道；但 mesh id 稳定存在 | ❌ 缺映射 |
| 不做完整动画 | 与 MVP 定位一致 | ✅ |

**内容面评估**：6 步构成完整光反应叙事弧，与 `light-reactions` 节点 mechanism 文案一致。
缺口：PSI 光吸收未单独叙事（可接受）；无 Calvin 循环步骤（nadph-formation 已埋"为碳固定
提供还原力"钩子，建议 MVP 最后一步加知识跳转收尾）；**知识库无独立 `nadph` 节点**（第 6 步
退而引用 `photosynthesis` 宽节点，知识卡会比 ATP 步泛化——已知体验弱点）；
`proton-gradient` 无专属蛋白 mesh（只能高亮腔体）。

**双字段 alias 影响**：`relatedKnowledgeNodeIds` 是 `knowledgeNodeIds` 手工镜像（当前 6 步
逐字相等），validator 以 STEP_ALIAS_DIVERGENCE WARNING 看门。对 MVP 是双写维护负担；
建议 MVP 顺带收敛（删除 alias 或数据层派生 `relatedKnowledgeNodeIds: [...knowledgeNodeIds]`）。

## 6. MVP 最小补充清单（BIO-002A 批准后执行）

| # | 项 | 类型 | 位置 |
|---|---|---|---|
| 1 | 每步 `meshIds`（photon-absorption→[photosystem-ii]、proton-gradient→[thylakoid-lumen]、atp-synthesis→[atp-synthase]、nadph-formation→[photosystem-i] 等） | **纯数据** | micro-lab.ts |
| 2 | `getAdjacentMechanismSteps(steps, id)` 遍历 helper | 纯 lib | bioscope-core.ts 或 micro-lab.ts |
| 3 | `activeStepId` state + prev/next handler（bump focusRequestKey 运镜） | **UI 改动** | photosynthesis-workbench.tsx |
| 4 | Viewer 新 props `emphasizedIds` 并穿透 mesh 高亮 | **UI 改动** | photosynthesis-viewer.tsx(:14-22,:593-635,:637-724) |
| 5 | 步骤导航 UI（升级 :384-392 占位；与 SceneGuide 芯片 :455-470 布局合并） | **UI 改动** | photosynthesis-workbench.tsx |
| 6 | 步骤级相机 pose（可复用 `thylakoid:atp-synthase` 起步） | 数据+少量 UI | viewer focusPoses(:44-65) |
| 7 | alias 收敛（派生或删除） | 纯数据 | micro-lab.ts:16-20 |
| 8 | 过期文案清理（"本阶段不播放…动画" :389-391,:549,:595） | 纯数据 | photosynthesis-workbench.tsx |

## 7. Bug 风险与死代码记录

1. **死导出** `nextPhotosynthesisScene`（micro-lab.ts:121-126）。
2. **相机魔法数双写且不同值**：viewer 430ms（:130）vs workbench 3 处 470ms（:100,:107,:119）；
   且 `setTimeout` 未在 unmount/重复触发时清理——快速连续 enterScene 时先到的 timer 会提前
   翻回 'manual'，打断后一次动画。
3. **零消费 schema 字段** duration/cameraTarget/visualState —— "看起来支持机制而实际不支持"
   的最大迷惑源，PARTIAL FIT 主因。
4. **知识映射静默缺失**：PSII/PSI/stroma/outer-membrane/inner-membrane 无 knowledgeNodeId，
   selectStructure 静默跳过；validator 也未覆盖"term 缺 knowledgeNodeId"（只校验已有值）。
5. **数据 bug（已记录于 #001 报告 CED-4）**：plants.ts thylakoid keyStructures 两条目共用
   `id:'thylakoid'`；workbench React key 用 nameZh-nameEn 掩盖了冲突。
6. **Canvas remount 相机冗余**：场景切换经 `<div key={scene}>`（workbench:165）强制 remount，
   初始 pose + CameraRig effect 立即再跑一条同 pose 动画（无害但冗余）。
7. **CameraRig 首帧 fromTarget 兜底退化原点**（viewer:113-123 controlsRef 可能为 null）。
8. **内容三处硬编码重复**：4 个蛋白名同时存在于 viewer mesh id、microStructureTerms、
   SceneGuide 芯片——MVP 落地时应收敛单一数据源。
9. **granum/thylakoid 高亮耦合**（viewer:568-570，为 canExplore 双入口服务）需与步骤强调不串色。
10. **提示文案会过期**（同 §6 清单 #8）。

---
*生成：Deep Assurance #002 Track G（独立探索 Agent 产出，EM 抽查关键行号后收编；
与 ARCHITECTURE-MAP-v1.md §3 交叉一致）。*
