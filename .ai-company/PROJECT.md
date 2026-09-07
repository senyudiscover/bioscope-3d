# BioScope — Project Archive

> 本文档是项目的事实来源（source of truth），由 CTO/EM 维护。
> 任何 Agent（DSH / Codex / GLM / 未来的平台）接手前，先读本文件与 AGENTS.md，
> 再读 BOARD.md 看当前状态。若本文档与代码冲突，以代码为准，并回报差异。

---

## 1. BioScope 是什么

### 产品定位

**Visual Biology Explorer（可视化生命科学探索器）** —— 用三维生物模型作为视觉入口，
把碎片化的生物学知识连接成可自由探索的学习路径。

### 当前目标用户

中文母语的**本科生物学 / 生物工程初学者**。目前不做科研工作台。

### 核心体验（学习路径）

```text
看见 SEE   →  理解 UNDERSTAND   →  连接 CONNECT   →  深入 DIVE
3D 模型    →  Knowledge Card     →  Related 知识   →  进入新知识节点
```

学习模式是**自由探索**，不是章节课程。

### 当前开发阶段

v0.1 试点项目（"AI Company" 的第一个项目）。当前实际状态：

- **人体解剖模块（human-anatomy）**：stable，功能最完整。
- **光合作用模块（photosynthesis）**：experimental（BETA），结构已搭好，机制动画未实现。
- **旧植物模块（plant-workbench）**：deprecated，代码未删除，等待去留决策。

---

## 2. 当前技术栈（代码确认）

| 层 | 技术 | 版本 |
|---|---|---|
| 框架 | vinext（OpenAI sites，Vite + RSC 架构） | 1.0.0-beta.5 |
| UI 运行时 | React / React DOM | 19.2.6 |
| 语言 | TypeScript（strict） | 5.9.3 |
| 3D 引擎 | three | ^0.180.0 |
| 3D React | @react-three/fiber / drei | ^9.7.0 / ^10.7.8 |
| 人体模型 | @vixotic/vanatome-atlas / -react | ^0.1.4 / ^0.1.6 |
| UI 组件 | shadcn / @base-ui/react / tailwindcss | 4.18 / 1.7 / 4.2.1 |
| 部署 | Cloudflare Workers（wrangler） | 4.92.0 |
| 测试 | vitest（node 环境） | ^4.1.11 |
| Lint / 格式化 | oxlint / oxfmt | 1.76.0 / 0.61.0 |
| 运行时 | Node | >= 22.13.0 |

### 两条构建路径（重要）

1. **生产（PRODUCTION DEPLOYMENT NOT VERIFIED）**：`npm run build` = `vinext build`
   → Cloudflare（RSC + D1/R2 占位绑定），`npm run start` = `wrangler dev`。
   当前 CEO 定义部署状态：**本地预览已验证，生产部署未验证**（`public/models/` 为空、
   无自动部署脚本）。
2. **本地预览**：`npm run local-build` = `vite build --config vite-spa.config.ts`
   （纯 SPA，`publicDir` 指向 `local-public/`，模型文件在那里），
   `npm run local-start` = `vite preview` @ 127.0.0.1:3000。
   Windows 双击 `启动网站.cmd` 会先 build 再 preview。

---

## 3. 系统架构（本科初学者可理解版）

把整个应用想象成一栋"三层楼 + 一间仓库"：

**顶楼 —— 工作台入口（UI 层）**

- `src/main.tsx` / `app/page.tsx` 是入口，渲染 `BioScopeWorkspace`。
- `BioScopeWorkspace` 顶部有个"生命对象"切换器（AtlasSwitcher），
  在「人体」和「光合作用」两个模块之间切换。
- 每个模块是一个独立的 Workbench（工作台）：
  - `app/anatomy-workbench.tsx`（人体）
  - `app/photosynthesis-workbench.tsx`（光合作用）
  - `app/plant-workbench.tsx`（旧植物，已废弃）

**中间层 —— 交互逻辑（lib/）**

- `lib/picking-manager.ts`：当鼠标点中 3D 结构时，决定"到底选中了哪个结构"。
  它同时考虑：命中点附近的多个结构、父子关系、当前系统/显示层、是否被隔离/隐藏，
  给每个候选打分，选出最可能的一个，必要时返回"多个候选"让用户选。
- `lib/anatomy-filters.ts`：系统筛选（心血管/呼吸/消化…）和显示层筛选（表面/肌肉/器官/骨骼…）。
- `lib/anatomy-terminology.ts`：把模型内部的英文结构名翻译成中文。
  分三层：人工确认的术语（verified）→ 词组规则 → 单词拼接（unverified）。
- `lib/knowledge-graph-validator.ts`：知识图引用完整性验证器（ERROR/WARNING/INFO 分级），
  由 `npm run validate:knowledge` 与两个只读审计脚本消费。
- `lib/bioscope-core.ts`：定义"模块/场景/机制步骤"这些核心类型。
- `lib/knowledge-nodes.ts`：知识数据的统一出口（兼容再导出）。

**底层 —— 数据（data/）**

- `data/knowledge/anatomy.ts`：34 个人体知识节点（心脏、肺、肝…到 ATP、线粒体）。
- `data/knowledge/plants.ts`：12 个植物知识节点（菠菜、叶肉细胞、叶绿体、光反应…）。
- `data/knowledge/index.ts`：把上面两份合并成一个总知识表。
- `data/photosynthesis/micro-lab.ts`：光合作用的三层场景 + 6 个光反应步骤。
- `data/modules/registry.tsx`：注册哪些模块可用。

**仓库 —— 3D 模型资产**

- 人体：来自第三方包 `@vixotic/vanatome-atlas`，运行时加载 `z-anatomy-1.4.0-full-body.glb`。
- 植物/细胞：没有外部模型，是项目里用 React Three Fiber **手绘的**（球、椭球、膜片拼出来的示意图）。

### 一个关键架构原则

**Knowledge Node（知识节点）≠ 3D Mesh（网格）**。

知识节点可以绑定 0 个、1 个或多个 3D 结构。ATP、氧气、线粒体这些没有 3D 模型的节点，
照样能被学习——点击后中央 3D 场景保持原样，只切换右侧知识卡。
代码里 `KnowledgeNode.modelStructureIds` 可以为空数组，这就是这条原则的实现。

---

## 4. 当前已经确认存在的能力（代码验证）

### 人体解剖模块

- 完整人体模型加载（系统筛选 + 显示层筛选）
- Hover / Select / Focus / Fade Context / Isolate / Reset
- Camera 自动聚焦 + 手动缩放/旋转/平移
- Picking：语义父子关系 + 空间邻域 + 加权打分 + 多候选菜单
- 中文术语展示（心脏 Heart、左心房 Left atrium…）
- 知识卡：01 它是什么 / 02 在哪 / 03 做什么 / 04 怎么工作 / 05 关键结构 / 06 为什么重要
- Related 知识（带关系类型徽标 + 一句话原因）
- Explore Questions（WHY / HOW / WHAT IF，带答案和继续探索入口）
- Knowledge History（← 返回）
- Model Context 与当前知识节点分离（读 ATP 时中央心脏模型不消失）

### 光合作用模块（BETA）

- 三层场景：叶肉细胞 → 叶绿体 → 类囊体膜
- 每层可点选细胞器（叶绿体、线粒体、液泡、细胞核…），右侧知识卡联动
- 6 个光反应步骤已定义（光子吸收→水氧化→电子传递→质子梯度→ATP→NADPH）
- **机制动画（Phase 2）未实现**，当前只显示"已预留 N 个步骤"占位

### 测试

- `tests/picking-manager.test.ts`（484 行）：picking 行为回归基线，覆盖 hidden/isolation/
  system/display layer/空间邻域/评分回归。这些测试是"行为快照"，不是规范。
- `tests/anatomy-filters.test.ts` / `tests/anatomy-terminology.test.ts`：两个 lib 的
  行为回归基线（含已知分类"污染"现状的 characterization）。
- `tests/knowledge-graph.test.ts` + `scripts/validate-knowledge-graph.ts`：知识图引用
  完整性验证器（ERROR/WARNING/INFO 分级，纯函数）。`npm run validate:knowledge`
  对真实数据运行，errors 必须为 0；WARNING/INFO 现状已在测试中固化。
- `tests/knowledge-chain-audit.test.ts` + `scripts/audit-knowledge-chain.ts`：核心学习链
  双向可达性只读审计（BIO-004 前置基线，`npm run audit:knowledge-chain`）。

### Camera 修复（重要历史）

`scripts/patch-vanatome-camera.mjs` 在 `postinstall` 阶段直接 patch 第三方包
`@vixotic/vanatome-react` 的编译产物，修复了两个问题：
1. 相机自动对焦只允许在"新的显式 focus 请求"到来时执行（否则 hover/筛选/知识卡更新会误触对焦）。
2. `maxDistance` 不再因小器官聚焦而被压缩（这就是"滚轮缩小后弹回原位"的根源）。

BIO-014 后脚本不再仅凭版本和单一旧文本判断：它先识别 registry 当前 0.1.6
与 legacy 0.1.6 的 camera bundle shape。当前 bundle 已原生保持全局
`minDistance/maxDistance`，只补 focus guard；legacy bundle 继续修复动态缩小的
`maxDistance`。所有路径均执行唯一锚点检查、patch 后契约校验并保持幂等。

---

## 5. 当前约束

**代码可证明的约束（技术事实）：**

- 中文优先、英文辅助（terminology 系统 + 全中文 UI + `nameEn` 保留）。
- 3D 与知识数据解耦（`modelStructureIds` 可为空）。
- 每个知识节点最多 3 个核心功能、最多 5 个关联（数据注释 + 数据实际内容）。

**来自产品决策的约束（非代码事实，来源：CEO/PRD）：**

- 面向本科生物学初学者，不做科研工作台。
- 信息克制，不做百科式堆砌（"3–5–1 Rule"）。
- 黑色背景 + 红色 accent 的视觉语言。
- 模型负责看见、右侧负责理解、左侧负责定位、底部负责连接。

---

## 6. 已知问题 / 技术债（详见 BOARD.md）

- 旧 plant-workbench 与 photosynthesis 模块的 3D 组件大量重复（两套手绘细胞器）。
- `content/` 内容管线（`content-schema.ts`）定义但零引用，未接通。
- `isPublishableBiologyNote`、`deprecatedExperimentalModules`、`sharedKnowledgeNodeIds`
  等符号目前是"定义了但没被业务消费"的死代码/预留位。
- picking 有大量魔法常量（0.16 邻域、14 歧义阈值等），已用测试固化，改动需先改测试。
