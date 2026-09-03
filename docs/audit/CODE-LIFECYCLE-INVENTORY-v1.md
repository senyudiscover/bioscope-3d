# BioScope Code Lifecycle Inventory v1

> ⚠️ SNAPSHOT（历史快照）：基准 commit 为 night-shift 验收（2026-09-03），死码/依赖清单随代码演进而过时，不承诺持续维护。见 docs/audit/README.md。

> Deep Assurance #002 · Track I 产出（2026-09-03）。
> 方法：全部源文件做全仓 grep 反向 import 追踪（排除自身与 node_modules），对照
> BOARD（BIO-003/BIO-008）与 DECISIONS（D-003/D-005/D-006/D-007/D-008）分类。
>
> **铁律：凡标 FROZEN / RESERVED / DORMANT 者，删除前必须 CEO 决策。任何 Agent 不得以
> 「零引用」为由删除。** 本清单的目的正是防止误删。

## 一、统计小结（普查范围 104 个文件）

| 分类 | 数量 | 说明 |
|---|---|---|
| ACTIVE | 39 | 被运行链路（vinext 主入口 / vite-spa 本地入口）或 npm scripts + vitest 直接/间接消费 |
| DEPRECATED-FROZEN | 4 | 旧 Plant 链（D-006 / BIO-003，CEO 冻结：不开发不删除） |
| RESERVED | 3 | content pipeline 预留（D-008 / BIO-008：不实现不扩展**不删除**） |
| DORMANT | 58 | shadcn 库存（components/ui 57 + hooks/use-mobile），零业务引用但属成套 UI 库存 |
| LIKELY DEAD（文件级） | 0 | 保守结论：无文件达到"可安全删除"标准；死代码以**符号级**形式存在（见 §五） |
| UNKNOWN | 0 | — |

## 二、app/（7 个文件）

| 文件 | 分类 | 被谁引用 | 说明 |
|---|---|---|---|
| app/page.tsx | ACTIVE | vinext 约定路由 | 渲染 BioScopeWorkspace |
| app/layout.tsx | ACTIVE | vinext 约定 | Root Layout（zh-CN, dark） |
| app/globals.css | ACTIVE | layout.tsx、src/main.tsx | 唯一样式入口，两条构建链共用 |
| app/bioscope-workspace.tsx | ACTIVE | page.tsx、src/main.tsx | 模块切换器，消费 registry |
| app/anatomy-workbench.tsx | ACTIVE | data/modules/registry.tsx | 人体工作台；picking/filters/terminology 唯一 UI 消费方 |
| app/photosynthesis-workbench.tsx | ACTIVE | data/modules/registry.tsx | 光合工作台 |
| app/plant-workbench.tsx | **DEPRECATED-FROZEN** | **无 import**；仅 data/modules/legacy.ts 字符串指针 | D-006/BIO-003 CEO 冻结：禁止删除、禁止扩展 |

## 三、components/（业务组件 3 个）

| 文件 | 分类 | 被谁引用 |
|---|---|---|
| components/photosynthesis/photosynthesis-viewer.tsx | ACTIVE | photosynthesis-workbench |
| components/micro-lab/micro-lab-workspace.tsx | ACTIVE | photosynthesis-workbench |
| components/plant/plant-viewer.tsx | **DEPRECATED-FROZEN** | 仅 app/plant-workbench.tsx + legacy.ts 字符串；与 photosynthesis-viewer 的重复是 D-006 明示接受的技术债 |

## 四、components/ui/（60 个 shadcn 文件）+ hooks/

业务代码只 import **3 个**：button、input、scroll-area（A 组 ACTIVE）。
其余 57 个一律 **DORMANT（库存）**，不得擅自清理——可由 shadcn CLI 再生成，删除属 CTO/产品决策。

- **B 组（10）**：仅被其他 ui 文件引用，链条根全是 C 组孤儿——command、dialog、input-group、
  textarea、label、separator、dropdown-menu、sheet、skeleton、tooltip、toggle。
- **C 组（46，零引用孤儿）**：accordion、alert、alert-dialog、aspect-ratio、attachment、
  avatar、badge、breadcrumb、bubble、button-group、calendar、card、carousel、chart、checkbox、
  collapsible、combobox、context-menu、direction、drawer、empty、field、hover-card、input-otp、
  item、kbd、marker、menubar、message-scroller、message、native-select、navigation-menu、
  pagination、popover、progress、radio-group、resizable、select、sidebar、slider、spinner、
  switch、table、tabs、toast、toggle-group。
- 连带依赖（date-fns、react-day-picker、embla-carousel-react、recharts、input-otp、
  react-resizable-panels、cmdk、@shadcn/react）仅被休眠文件使用——见 DEPENDENCY-RISK-v1.md。
- `hooks/use-mobile.ts`：DORMANT，唯一消费方是孤儿 sidebar.tsx。
- `lib/utils.ts`（cn）：**ACTIVE**（button/input/scroll-area 使用）。

## 五、lib/（8 个文件）+ 符号级死代码清单

| 文件 | 分类 | 说明 |
|---|---|---|
| utils.ts | ACTIVE | clsx+tailwind-merge |
| knowledge-nodes.ts | ACTIVE | 兼容再导出 shim；内含**零消费死类型别名 LifeScale** |
| bioscope-core.ts | ACTIVE | D-004 抽象；符号级死代码见下 |
| anatomy-filters.ts | ACTIVE | 回归基线已固化 |
| anatomy-terminology.ts | ACTIVE（D-005 术语事实源） | 712 行 |
| picking-manager.ts | ACTIVE（D-007 行为快照） | 改常量必须先改测试基线 |
| knowledge-graph-validator.ts | ACTIVE | |
| content-schema.ts | **RESERVED（D-008）** | 零 import；isPublishableBiologyNote 零消费；不实现不扩展**不删除** |

**bioscope-core.ts 符号级死代码**：`VisualScene.type:'molecular'`、`viewerKind:'molstar'`
（为 NOT NOW 的 Protein/Molecular Viewer 预留的类型臂）；`MechanismStep.duration /
cameraTarget / visualState`（零生产者零读取者，见 PHOTOSYNTHESIS-ARCHITECTURE-v1）。

**data/knowledge 符号级**：
- `sharedKnowledgeNodeIds`：UI 零消费，但被审计脚本消费且是跨模块桥接语义数据（测试保护）。
- `modelNodeMap`：UI 零消费（UI 用 primaryModelStructureId）；validator 注释自认
  "死导出，仅验证不清理"；tests/knowledge-graph.test.ts 显式固化"死导出仍验证"。
  **它是 knowledge↔model 双向一致性审计的数据锚，删除会红测试并丢失审计能力。**
- `getRelationReason`：**双份定义（anatomy.ts:140、index.ts:22），全仓零消费**。
  两份语义不同（合并前 vs 合并后）——清理属知识层变更，需 CTO/CEO 决策，不得顺手删。

**data/photosynthesis/micro-lab.ts 符号级**：`nextPhotosynthesisScene` 零消费死导出
（处置留待 BIO-002A 设计时裁决）；`lightReactionSteps` UI 仅显示 `.length`，
**但 BOARD BIO-002A（READY）以它为数据基座，不得因"弱消费"清理**。

## 六、data/（7 个文件）

| 文件 | 分类 | 说明 |
|---|---|---|
| modules/registry.tsx | ACTIVE | 唯一模块注册表 |
| modules/legacy.ts | **FROZEN 关联** | 零 import；是冻结模块的**唯一登记指针**（字符串指向 plant 两文件）——删除即抹掉 D-006 的代码内指针 |
| photosynthesis/micro-lab.ts | ACTIVE | 场景/步骤/映射数据 |
| plant/plant-explorer.ts | **DEPRECATED-FROZEN** | 仅被 plant 两文件引用 |
| knowledge/anatomy.ts | ACTIVE | 人体知识图事实源 |
| knowledge/plants.ts | ACTIVE | 植物知识图 |
| knowledge/index.ts | ACTIVE | 合并入口 + sharedKnowledgeNodeIds 唯一定义处 |

## 七、hooks/ 与 src/

| 文件 | 分类 | 说明 |
|---|---|---|
| hooks/use-mobile.ts | DORMANT | 随 sidebar.tsx 休眠 |
| src/main.tsx | **ACTIVE（勿删）** | 本地 SPA 构建链入口（index.html → vite-spa.config.ts → local-*）。看似脚手架残留，实为第二条官方构建路径 |

## 八、content/（D-008 RESERVED）

| 文件 | 分类 |
|---|---|
| content/README.md | RESERVED（接口约定文档） |
| content/respiratory/example-lung.md | RESERVED（publish:false 示例） |

## 九、scripts/（5 个，全部 ACTIVE）与 tests/（10 个，全部 ACTIVE）

scripts 均经 vitest 执行（数据层 `@/` 别名所致）——**"没有被 node 直接调用"不构成删除理由**：
patch-vanatome-camera.mjs（D-003，postinstall + 契约测试守门）、validate-knowledge-graph.ts、
audit-knowledge-chain.ts、audit-knowledge-graph-deep.ts（Track F）、audit-terminology-qa.ts（Track E）。

tests/：anatomy-filters / anatomy-terminology / camera-patch-contract / filter-classifier-fuzz /
knowledge-chain-audit / knowledge-graph-deep-audit / knowledge-graph / picking-adversarial /
picking-manager / terminology-qa（全部 `npm test` 全量运行）。

## 十、最容易被未来 Agent 误删的 Top 5（附防护理由）

1. **app/plant-workbench.tsx + components/plant/plant-viewer.tsx + data/plant/plant-explorer.ts**
   —— 陷阱：全链零 import，任何"删死代码"扫描都命中。防护：D-006/BIO-003 **CEO 正式冻结**；
   唯一登记在 data/modules/legacy.ts 且是指针字符串，静态工具天然看不见。
2. **data/modules/legacy.ts** —— 陷阱：文件名自带 legacy 且零消费。防护：冻结模块的唯一登记表，
   删除即让冻结资产变成无主孤儿。
3. **lib/content-schema.ts + content/ 整目录** —— 陷阱：零消费。防护：D-008/BIO-008
   RESERVED — DO NOT EXPAND，原文明确"不删除预留代码"。
4. **modelNodeMap / 双份 getRelationReason / bioscope-core 的 molecular·molstar·duration·
   cameraTarget·visualState** —— 陷阱：validator 自注释承认"死导出"。防护：测试显式固化
   "死导出仍验证"；类型预留臂对应 CEO NOT NOW 方向；清理任何一项=知识/抽象层变更，须先过决策。
5. **scripts/patch-vanatome-camera.mjs 与 src/main.tsx** —— 陷阱：前者是"改 node_modules 的
   hack"，后者像 CRA 残渣。防护：前者是 D-003 正式决策、postinstall 必需、契约测试守门；
   后者删除即砍断本地离线运行能力。

---
*生成：Deep Assurance #002 Track I（独立探索 Agent 产出，EM 抽查收编；
与 ARCHITECTURE-MAP-v1.md §8-11、DECISIONS D-003/D-006/D-008 交叉一致）。*
