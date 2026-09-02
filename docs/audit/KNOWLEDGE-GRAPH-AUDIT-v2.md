# BioScope Knowledge Graph Audit v2

> Deep Assurance #002 · Track F 产出（2026-09-03）。
> 在 #001 的 validator（ID 存在性）与 core-chain audit 之上，回答更难的问题：
> **这张图在学习体验上是否走得通？**
> 证据引擎：`scripts/audit-knowledge-graph-deep.ts`（只读，characterization 已固化进
> `tests/knowledge-graph-deep-audit.test.ts`）。语义内容未做任何修改。

---

## 1. 总览

| 指标 | 值 | 来源 |
|---|---|---|
| 节点 | 46（anatomy 34 + plants 12） | validator |
| related 有向边 | 149 | validator / deep audit |
| 无向连通分量 | **6**：1 个 41 节点巨分量 + 5 个孤岛 | deep audit |
| 从学习入口（human/spinach）有向不可达 | **11 节点** | deep audit |
| 单向边（A→B 无 B→A） | **69 对** | deep audit |
| followUp 芯片无 related 直连支撑 | **10 个** | deep audit |
| modelNodeMap ↔ modelStructureIds 双向失配 | **0** | deep audit |
| 关系类型直方图 | related_to=46, participates_in=29, contains=23, produces=19, requires=15, transports=12, supports=5 | deep audit |

## 2. 重大发现（按学习体验影响排序）

### F-1 · 神经系统链从入口完全不可达（CONFIRMED，影响大）

`human` 的 related 只指向 5 个器官（heart/kidneys/liver/lungs/stomach，one-way）。
`nervous-system → neuron → neural-signal → atp` 是单向出走链，**没有任何边把神经系统接进
主体图**。结果：从「人体」入口沿 Related 导航**永远到不了 brain / nervous-system / neuron /
neural-signal**；这 4 个节点只能靠搜索或 human 的 followUp 芯片（how→nervous-system）触达。
BIO-004 的"反向边补全"应把「human →(contains)→ nervous-system」列为最高优先补边。

### F-2 · {light-reactions, thylakoid} 是有向死端 2-环（CONFIRMED，影响中）

两节点互指（RECIPROCAL），且 thylakoid 有 3 条单向出边（→atp-synthase / →chloroplast /
→electron-transport-chain），但**无任何外部节点指向它们**。无向意义它们在巨分量里；
有向意义从 human/spinach 出发永远走不到。当前 UI 靠 micro-lab 的 mesh 点击/keyStructures
兜底，Related dock 不会出现它们。候选修复：`chloroplast →(contains)→ thylakoid`
（与既有 `thylakoid → chloroplast` 恰为互指）。

### F-3 · 5 个植物结构全孤岛（CONFIRMED，影响中）

`cell-wall`、`cell-membrane`、`cytoplasm`、`nucleus`、`vacuole` 既无入边也无出边
（validator 的 ORPHAN+LEAF 双重名单），只被 photosynthesis 场景的 mesh 点击触达
（microStructureTerms 绑定）。它们的知识卡 Related 区域恒为空。补边方案（全部为
`leaf →(contains)→ 结构` 一类）属知识语义，见 CEO DECISION REQUIRED。

### F-4 · 全图 69 对单向边（CONFIRMED，量化 BIO-004）

#001 只审计了核心链 3 处断点；全图口径是 **69 对单向关系**。分布示例如：
`human→{heart,kidneys,liver,lungs,stomach}`、`lungs→blood`、`brain→atp/oxygen`、
`chloroplast→oxygen`、`mesophyll-cell→{chloroplast,mitochondrion,photosynthesis}` 等。
完整清单可复现：`vitest run tests/knowledge-graph-deep-audit.test.ts`（输出逐字节确定）。
注：单向 ≠ 错误——`requires`/`produces` 类边语义上常为单向；但「结构包含」类
（contains）缺回边会直接损害自由探索体验。

### F-5 · 10 个 followUp 芯片没有 related 直连支撑（ACCEPTABLE / NEEDS REVIEW）

清单：human→{blood(why), homeostasis(why/how), nervous-system(how), circulation(whatIf),
blood(whatIf)}、heart→{neural-signal(how), mitochondrion(whatIf)}、
lungs→homeostasis(whatIf)、brain→circulation(whatIf)。
这些"继续探索"芯片本身合法（validator 只查存在性），但目标节点与当前节点无任何
related 关系 → 用户跳转后 Related dock 无法"走回来"。属设计选择，建议明确为
「followUps 允许跨域跳转」并写入 DECISIONS，或补 related 边使图一致。

### F-6 · 桥接状态良好（GOOD NEWS）

6 个 sharedKnowledgeNodeIds 中 5 个被 photosynthesis 绑定引用（cellular-respiration 除外），
且**全部落在跨 anatomy+plants 的 41 节点巨分量中**——两模块知识图经 related 边实际连通，
不依赖 shared 概念兜底。跨模块学习路径（如 光合作用→ATP→细胞呼吸→线粒体）数据层可行。

### F-7 · modelNodeMap 双向一致（GOOD NEWS）

9 条 structureId→nodeId 映射全部被节点侧 modelStructureIds/modelRef 回指，0 失配。
knowledge→model 与 model→knowledge 两个方向当前无漂移。

## 3. 结论与建议

- 引用完整性（v1 validator 口径）：**健康**（errors: 0）。
- 学习体验连通性（v2 口径）：**局部断裂**——神经系统链、{light-reactions,thylakoid}、
  5 个植物孤岛三类死点，全部源于「缺少量回边/接入边」，不需要结构重构。
- 可自动化约束已固化：deep-audit 测试锁定当前连通形态，未来任何补边（CEO 批准后）
  会有意识地红测试并更新基线。
- 未新增 validator ERROR 级约束（followUp 断联、方向可达性属语义判断，保持 WARNING/INFO
  或只读审计口径，避免误报阻断 CI）。

## 4. CEO DECISION REQUIRED（补边提案，沿用 #001 报告编号续排）

| # | 拟补边 | 关系类型 | 理由 |
|---|---|---|---|
| CED-5 | `human →(contains)→ nervous-system` | contains | 修复 F-1：神经系统接入主体图（human 已 contains 5 器官，同模式） |
| CED-6 | `chloroplast →(contains)→ thylakoid` | contains | 修复 F-2：与现有反向边构成互指，解除死端 |
| CED-7 | `leaf →(contains)→ {cell-wall, cell-membrane, cytoplasm, vacuole, nucleus}` | contains | 修复 F-3：植物细胞结构挂到叶片/细胞容器（具体容器归属需 biology review：nucleus/vacuole 挂 mesophyll-cell 还是 cell 层级，需CEO/生物学判断） |
| CED-8 | followUps 跨域跳转是否为正式设计 | 决策 | 若是 → 写入 DECISIONS；若否 → 随 CED-1~7 一并补 related |

配额核查：补边目标节点的 related 数量约束（≤5）——human 5/5（已满，需放宽约束或改挂
circulation）、leaf 3/5、chloroplast 3/5。**human 已满配**是 CED-5 的一个真实约束，
需决策（放宽 3-5-1 Rule 的 related≤5，或改用 followUps/入口列表解决）。

---
*证据可复现：`npx vitest run tests/knowledge-graph-deep-audit.test.ts`（console 输出全文
确定性）。生成：Deep Assurance #002 Track F。*
