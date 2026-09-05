# BIO-013A — Synapse Lab · 突触传递机制 MVP（PRD / Task 草案 v0.1）

> 状态：**DRAFT**（待 CEO 确认 §6 决策点后 Task 化）
> 作者：CTO/EM（DSH）· 2026-09-04 · 分支：未创建（Astra 实验分支待 §6 决策后创建）
> 编号说明：原「BIO-003 Synapse Lab」与旧 Plant 模块（BIO-003 FROZEN）冲突，采用 **BIO-013A**。

---

## 0. 已冻结的产品决策（CEO，2026-09-04，直接引用）

1. 产品形态：**Explore + Guided Mechanism + Experiment**。
2. MVP 只强制证明 3 个 3D 原生价值：**Spatial Inspection（空间检查）· Freeze & Dissect（冻结与解剖）· Causal Perturbation（因果扰动）**。
3. 第一版 Experiment 只做：**Block Ca²⁺ Channel**。
4. 定位：教育级 glutamatergic synapse 机制可视化，**不是 research-grade simulation**。
5. 当前不启动 Astra 正式 implementation（本草案先定 Scope，等 CEO 决策点）。

---

## 1. CTO 架构可行性判定

| 3D 原生价值 | 现有架构 | 判定 |
|---|---|---|
| Spatial Inspection | photosynthesis-viewer 已有 CameraRig + focusPoses + OrbitControls（430ms 缓出运镜）；anatomy 有完整相机链路 | ✅ **直接复用**（为突触结构补 focusPoses 即可） |
| Freeze & Dissect | Freeze：activeStepId 离散步骤导航（BIO-002A）天然即"驻留/冻结"，无自动播放 | ✅ Freeze 复用；🟡 **Dissect 需新能力** |
| Causal Perturbation | 无先例。MechanismStep 有 `visualState` 可选字段但全项目零消费 | 🔴 **需新能力**（小型实验状态层，非 simulation） |

### 复用清单（已存在，直接使用）
- `VisualScene` 场景链 + workbench 布局壳（MicroLabWorkspace 模式）
- `MechanismStep` + `getAdjacentMechanismSteps` + `activeStepId` 步骤导航（BIO-002A 刚落地）
- `emphasizedIds` 强调通道（BIO-002A 刚落地）——机制步骤高亮直接复用
- `chooseKnowledgeNode` 知识联动链 + 知识面板
- CameraRig / focusPoses 运镜
- Blender→GLB 管线（环境已装 4.5.9 LTS + smoke test 通过）
- 测试纪律：characterization 基线 / tsc / vitest / lint 豁免规则

### 新能力清单（按成本）
| # | 新能力 | 成本 | 说明 |
|---|---|---|---|
| N1 | R3F viewer 的 **hide/isolate 通道**（Dissect） | XS-S | 借鉴 anatomy `hiddenIds` 概念；photosynthesis-viewer 没有，需新增 `hiddenIds?/isolatedId?` prop |
| N2 | **实验状态层**（Causal Perturbation） | S | 一个 `experimentState`（如 `{ caChannelBlocked: boolean }`）+ 条件化步骤呈现/叙事，确定性状态机，零模拟 |
| N3 | **GLB 直接加载路径** | XS | drei `useGLTF` 首次在项目代码使用（依赖已装）；资产放 `local-public/models/` |
| N4 | **模块注册扩展** | XS | `BioScopeModuleId` 加 `'synapse-lab'`；registry 加条目；icon 类型可能加新变体 |
| N5 | 突触知识内容（新节点 + 文案） | 内容工作 | 见 §6-D1（BIOLOGY REVIEW + 是否入全局知识图） |

---

## 2. 机制步骤 P0/P1 裁剪（避免平均用力）

| 步骤 | 裁级 | 理由 |
|---|---|---|
| 1 动作电位抵达 | **P1** | 阻断实验的因果链起点是步骤 2；上下文可并入步骤 2 文案（"动作电位抵达→去极化→通道打开"） |
| 2 VGCC 打开 | **P0** | 实验直接作用点 |
| 3 Ca²⁺ 内流 | **P0** | 实验直接作用点（被阻断的直接后果） |
| 4 小泡融合/胞吐 | **P0** | 第一个下游因果结果 |
| 5 Glutamate 扩散 | **P0** | 跨裂隙空间叙事（Spatial Inspection 的天然载体） |
| 6 AMPA 结合/突触后响应 | **P0** | 因果链终端结果（实验的 payoff） |
| 7 清除/信号终止 | **P1** | 教学完整性的收尾，不承载实验因果 |

**P0 = 5 步（2/3/4/5/6）**：恰好等于 Block Ca²⁺ 实验的完整因果链——每一步都同时服务于 Guided Mechanism 与 Causal Perturbation 两个价值，无一步是"为了凑 7 步"。

---

## 3. Astra 第一轮实验的最小 Scope（Spike）

**目标**：只证明 3D 原生风险可解，不碰机制导航/知识图/正式内容。

**In**：
1. Blender 手工低模 schematic synapse（突触前末梢 + 2-3 小泡 + 膜上 VGCC + 突触裂隙 + 突触后膜 AMPA 受体），导出 GLB（独立实验分支 + scratch 流程，不污染正式 assets）
2. 新 R3F scene 用 `useGLTF` 加载该 GLB
3. 在**静态场景**上证明 3 个交互：
   - Spatial Inspection：旋转/缩放 + 3 个 focusPoses（通道、小泡、受体）
   - Freeze & Dissect：逐结构 hide/isolate 开关（N1）
   - Causal Perturbation v0：Ca²⁺ 通道 toggle → 通道 mesh 呈"阻断"视觉态；小泡融合步骤呈"未融合"态（N2 最小版）
4. 交付：spike 分支 + 3 交互可用的静态场景 + 少量冒烟测试

**Out（明确不做）**：
- 机制步骤导航 UI / 知识面板联动 / 模块注册进 AtlasSwitcher / 正式知识文案 / 任何动画 / 任何模拟
- （这些在 Spike 通过后的第二轮才做，且全部基于 BIO-002A 已验证模式）

**Spike 完成标准**：local-build 通过 + tsc 0 错 + 3 个交互在浏览器可手测 + 不破坏既有 248 测试。

---

## 4. CTO 技术设计默认（不待 CEO 决策，Task 化时写入）

1. **实验状态层**：数据层加轻量 experiment spec（`{ id, targetStepId, effect }` 列表），workbench 持 `experimentState`；`MechanismStep` 本身**不改**。条件渲染 = 纯 UI 状态机，零数值模拟。
2. **Dissect 通道**：viewer 加 `hiddenIds?: string[]`（+可选 isolate），复用 anatomy 交互词汇（Hide/Isolate/Reset）。
3. **被阻断的视觉语言**：阻断态用统一符号（如通道红色 ✕ / 下游灰化），与 selectedId/hoveredId/emphasizedIds 三通道并列、不互斥（沿用 BIO-002A 的并存原则）。
4. **动画**：MVP 全部为离散步骤 + 静态状态差（不做连续动画、不做粒子）；canned 微动画为后续 stretch。
5. **分支与纪律**：Astra 独立实验分支（从届时 master HEAD 切出），语义化 commit，不 merge 不回推；每 commit 跑 tsc；spike 不触碰 BIO-002A/解剖/旧 Plant。

---

## 5. 显式不做（科学范围红线）

NMDA / AMPA 之外的受体谱系扩展 · Hodgkin–Huxley / 电生理数值模型 · 真实扩散 PDE / 粒子模拟 · NEURON/Brian2/CFD/FEM · 突触可塑性（LTP/LTD）· 网络级模拟 · 抑制性/其它递质系统。

---

## 6. CEO 决策点（最多 3 个，确认后即可 Task 化）

### D1 — 知识内容策略 + BIOLOGY REVIEW 通道
- **A（推荐）**：MVP 阶段 Synapse 知识保持**模块局部**（不入全局知识图），轻量知识卡先行（名称+一句话）；正式教学文案（步骤描述/术语/实验解释）在 BIOLOGY REVIEW 后补齐。
- **B**：一步到位入全局知识图（46→~52 节点）+ 完整 3-5-1 内容，接受 validator/characterization 基线更新 + 审校前置成本。
- **必须附带回答**：BIOLOGY REVIEW 由谁执行、何时执行（新模块的全部生物内容均属 BIOLOGY REVIEW REQUIRED，工程 Agent 不得自行定生物事实）。

### D2 — "被阻断"的因果呈现语义
- **A（推荐）**：全链呈现 + 阻断分支——阻断开启时步骤 2 呈"已阻断"态，下游步骤 3-6 灰化并标注"不会发生"。
- **B**：阻断即驻留——开启后停在步骤 2 阻断态，不展示下游。
- 推荐 A：完整展示因果链的"断裂"，是 Causal Perturbation 教学价值的最大 payoff。

### D3 — Dissect 形态
- **A（推荐）**：逐结构 hide/isolate 开关（成本 XS-S，复用 anatomy 交互词汇）。
- **B**：加真实截面（clip plane，"切开"感；成本 M，需平面裁剪）。
- 推荐 A 先做，B 作为后续增强。若 CEO 认为"解剖感"必须=切开，需同步调整 Astra spike 范围。

---

## 7. Task 化后的执行序列（预览，暂不启动）

1. CEO 确认 D1-D3 → 本文件由 DRAFT 转 READY，写入 Task ID/AC/Owner
2. 创建 Astra 实验分支（基线 = 届时 master HEAD）
3. Spike（§3）→ CTO Review → 决定第二轮（机制导航+知识联动+模块注册）
4. 每轮按 BIO-002A 模式：语义化 commit → tsc/test/local-build → CTO 独立验收 → 报告

---

*本文件是 PRD/Task 草案。Audit Finding ≠ Task；Proposal ≠ Approved Task。*
*等待 CEO 对 §6 三个决策点的确认。*
