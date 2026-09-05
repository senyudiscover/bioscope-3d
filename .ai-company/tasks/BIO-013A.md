# BIO-013A — Synapse Lab · 突触传递机制 MVP（PRD / Task v0.2）

> 状态：**READY**（D1-D3 CEO 已拍板，2026-09-04）
> 作者：CTO/EM（DSH）· 分支：未创建（Astra Spike 分支待派发时从届时 master HEAD 切出）
> 编号说明：原「BIO-003 Synapse Lab」与旧 Plant 模块（BIO-003 FROZEN）冲突，采用 **BIO-013A**。
> Spike 任务包：`.ai-company/tasks/BIO-013A-SPIKE-ASTRA.md`

---

## 0. 已冻结的产品决策（CEO）

1. 产品形态：**Explore + Guided Mechanism + Experiment**。
2. MVP 只强制证明 3 个 3D 原生价值：**Spatial Inspection · Freeze & Dissect · Causal Perturbation**。
3. 第一版 Experiment 只做：**Block Ca²⁺ Channel**。
4. 定位：教育级 glutamatergic synapse 机制可视化，**不是 research-grade simulation**。
5. 当前不启动 Astra 正式 implementation（先跑 Spike）。

### CEO 已确认的决策点（2026-09-04）
- **D1 = A**：MVP 知识内容保持**模块局部轻量**，不立即扩全局知识图。Biology Review 由 ChatGPT「学习与研究/总控」侧独立执行；Engineer / DSH 不得自行认定科学内容正确。审校时点 = 正式教学文案进入 master 前；**Astra Spike 不因教学文案审校而阻塞**。
- **D2 = A**：Block Ca²⁺ 后**保留完整因果链展示**——Step 2 显示阻断态，Step 3–6 灰化并标注"不会发生"。
- **D3 = A**：第一版 Dissect 用**逐结构 hide/isolate**，不做真实 clip plane；截面后置。

---

## 1. CTO 架构可行性判定

| 3D 原生价值 | 判定 |
|---|---|
| Spatial Inspection | ✅ 直接复用（CameraRig + focusPoses；为突触结构补 pose 即可） |
| Freeze & Dissect | ✅ Freeze 复用（离散步骤导航天然驻留）；🟡 Dissect 新能力（R3F hide/isolate 通道，XS-S） |
| Causal Perturbation | 🔴 新能力（确定性实验状态层，S；零模拟） |

### 复用清单
`VisualScene` / workbench 壳 · `MechanismStep` + `getAdjacentMechanismSteps` + `activeStepId`（BIO-002A）· `emphasizedIds` 强调通道（BIO-002A）· `chooseKnowledgeNode` 知识联动链 · CameraRig/focusPoses · Blender→GLB 管线（4.5.9 LTS 已装 + smoke 通过）· 测试纪律（tsc/vitest/lint 豁免规则）

### 新能力清单
| # | 新能力 | 成本 |
|---|---|---|
| N1 | R3F viewer hide/isolate 通道（Dissect） | XS-S |
| N2 | 实验状态层（`caChannelBlocked` → 条件化呈现/叙事） | S |
| N3 | GLB 直载路径（drei `useGLTF` 首次使用） | XS |
| N4 | 模块注册扩展（`BioScopeModuleId` + registry + icon） | XS |
| N5 | 突触知识内容（模块局部轻量，D1=A；正式文案 Biology Review 后进 master） | 内容工作 |

---

## 2. 机制步骤 P0/P1 裁剪

| 步骤 | 裁级 | 理由 |
|---|---|---|
| 1 动作电位抵达 | P1 | 因果链起点是步骤 2；上下文并入步骤 2 文案 |
| 2 VGCC 打开 | **P0** | 实验直接作用点 |
| 3 Ca²⁺ 内流 | **P0** | 实验直接作用点 |
| 4 小泡融合/胞吐 | **P0** | 第一个下游因果结果 |
| 5 Glutamate 扩散 | **P0** | 跨裂隙空间叙事（Spatial Inspection 载体） |
| 6 AMPA 结合/突触后响应 | **P0** | 因果链终端（实验 payoff） |
| 7 清除/信号终止 | P1 | 收尾，不承载实验因果 |

**P0 = 2/3/4/5/6（5 步）**：恰为 Block Ca²⁺ 实验的完整因果链。

---

## 3. Astra 第一轮实验（Spike）Scope

详见 `.ai-company/tasks/BIO-013A-SPIKE-ASTRA.md`。摘要：
- **In**：Blender 低模 schematic synapse → GLB；新 R3F scene 用 `useGLTF` 加载；静态场景上证明 3 交互（空间检查 3 个 focusPoses / 逐结构 hide-isolate / Ca²⁺ 通道 toggle → 阻断视觉态 + 小泡未融合态）。
- **Out**：机制导航 UI、知识面板联动、模块注册、正式文案、任何动画/模拟。
- **完成标准**：local-build + tsc + 既有 248 测试不破坏 + 3 交互浏览器可手测。

---

## 4. CTO 技术设计默认（已定，Task 化写入）

1. 实验状态层：数据层轻量 experiment spec，workbench 持 `experimentState`；`MechanismStep` 本身不改；纯 UI 状态机，零数值模拟。
2. Dissect 通道：viewer 加 `hiddenIds?: string[]`（+可选 isolate），复用 anatomy 交互词汇（Hide/Isolate/Reset）。
3. 阻断视觉语言（D2=A）：步骤 2 阻断态（统一符号，如红色 ✕）；步骤 3-6 灰化 + "不会发生"标注；与 selectedId/hoveredId/emphasizedIds 并存不互斥。
4. 动画：MVP 全部为离散步骤 + 静态状态差；canned 微动画为后续 stretch。
5. 分支纪律：Astra 独立实验分支；语义化 commit；不 merge 不回推；spike 不触碰 BIO-002A/解剖/旧 Plant。

---

## 5. 显式不做（科学范围红线）

NMDA / 受体谱系扩展 · Hodgkin–Huxley / 电生理数值模型 · 真实扩散 PDE / 粒子模拟 · NEURON/Brian2/CFD/FEM · 突触可塑性（LTP/LTD）· 网络级模拟 · 抑制性/其它递质系统 · 真实 clip plane（后置）。

---

## 6. 执行序列

1. ✅ CEO 确认 D1-D3（2026-09-04）
2. ✅ 本文件 DRAFT → READY；Spike 任务包就绪（`BIO-013A-SPIKE-ASTRA.md`）
3. ⏸ Astra 额度恢复 → 创建实验分支（基线 = 届时 master HEAD）→ Spike
4. ⏸ Spike → CTO Review → 决定第二轮（机制导航 + 知识联动 + 模块注册）
5. 每轮按 BIO-002A 模式：语义化 commit → tsc/test/local-build → CTO 独立验收 → 报告

---

*Audit Finding ≠ Task；Proposal ≠ Approved Task。*
*Astra Spike 不因教学文案审校阻塞（D1）；正式教学文案进入 master 前必须完成 Biology Review（ChatGPT 学习/研究侧）。*
