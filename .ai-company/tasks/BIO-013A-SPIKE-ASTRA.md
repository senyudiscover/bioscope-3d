# BIO-013A Spike — Astra 第一轮实验任务包

> 发给：Astra（Experimental 3D Engineer）
> 委派：CTO/EM（DSH）· 2026-09-04
> 状态：**READY FOR ASTRA**（等待 Astra 额度恢复后派发）
> 依据：`.ai-company/tasks/BIO-013A.md`（PRD v0.2，D1-D3 CEO 已拍板）
> 分支：`feature/bio-013a-astra-spike`（从派发时刻的 master HEAD 切出）

---

## 0. 接手前必读（按顺序）

1. `.ai-company/AGENTS.md` — 团队规则、Definition of Done
2. `.ai-company/PROJECT.md` — 项目是什么、架构
3. `.ai-company/BOARD.md` — 看板（BIO-013A 状态）
4. `.ai-company/DECISIONS.md` — D-001（知识/模型解耦）、D-002（知识/模型语境分离）
5. `.ai-company/tasks/BIO-013A.md` — **本任务的产品/架构依据（PRD v0.2）**
6. `.ai-company/tasks/BIO-002A.md` — 上一个 Milestone 的任务模式参考
7. `components/photosynthesis/photosynthesis-viewer.tsx` — 你要复用的 R3F viewer 模式（CameraRig / focusPoses / selectedId+hoveredId+emphasizedIds 三通道并存）

**一切以磁盘代码为准**；历史行号可能因 merge 偏移。

---

## 1. 目标（一句话）

在**独立实验分支**上用 Blender 资产 + R3F 做出一个**静态 glutamatergic synapse 场景**，并在这个静态场景上证明 3 个 3D 原生交互可用。**不做机制导航、不做知识面板、不写正式教学文案。**

---

## 2. 环境事实（已由 CTO 准备，直接使用）

| 项 | 事实 |
|---|---|
| Blender | `D:\BioScope-tools\blender-4.5.9-windows-x64\blender.exe`（**不在 PATH**，用绝对路径或临时 `$env:PATH` 追加）；自带 Python 3.11.11 |
| GLB 管线 | 已 smoke 通过：headless `--background --python <script.py>` → `export_scene.gltf(export_format='GLB')`。示例：`D:\BioScope-scratch\synapse-smoke\smoke_export.py` |
| scratch 区 | `D:\BioScope-scratch\synapse-lab-spike\`（.blend、中间产物放这里，**不进 git**） |
| 项目 | Node v24.18.1；three 0.180 / fiber 9.7 / drei 10.7.8；本地预览 `npm run local-build` + `npm run local-start`（127.0.0.1:3000） |
| WebGL2 | 已实测可用（Intel Iris Xe 硬件加速） |

---

## 3. Scope

### In（必须完成）
1. **Blender 资产**：低模 schematic synapse，包含命名清晰的层级结构：
   - `presynaptic-terminal`（突触前末梢膜主体）
   - `vesicle-01..03`（2-3 个突触小泡，其中一个处于"对接/融合"位）
   - `vgcc-01..03`（膜上的电压门控 Ca²⁺ 通道示意体）
   - `cleft`（突触裂隙示意）
   - `postsynaptic-membrane`（突触后膜）
   - `ampa-01..02`（AMPA 受体示意体）
   - 材质简单即可；导出 GLB 到 `local-public/models/synapse-spike.glb`（该目录已 gitignore）。**导出脚本 commit**（放 `scripts/` 或 spike 组件旁），.blend 留在 scratch 区。
2. **GLB 加载**：新 R3F 场景组件（`components/synapse/`，全新目录）用 drei `useGLTF` 加载（这是项目代码首次直接使用 useGLTF；**不得改动** photosynthesis/anatomy 的任何文件）。
3. **交互 1 — Spatial Inspection**：OrbitControls 旋转/缩放/平移（复用 photosynthesis-viewer 的 CameraRig 模式）；3 个 focusPoses：VGCC 簇、对接小泡、AMPA 受体。
4. **交互 2 — Freeze & Dissect**：`hiddenIds` 通道 + 按结构分组的 hide/isolate 开关（Hide 某组 / Isolate 某组 / Reset）。词汇对齐 anatomy（Hide/Isolate/Reset），实现对齐 photosynthesis-viewer 的 prop 穿透模式。
5. **交互 3 — Causal Perturbation v0**：一个 `caChannelBlocked: boolean` toggle。阻断开 → VGCC mesh 呈阻断视觉态（如红色 ✕ 覆盖物/材质切换）；对接小泡在"融合/未融合"两个静态姿态间切换。**纯状态机，零动画、零模拟。**

### Out（明确禁止）
- ❌ 机制步骤导航 UI、`MechanismStep` 数据、知识面板联动
- ❌ `data/knowledge/*`、`lib/bioscope-core.ts`、registry.tsx、AtlasSwitcher 任何改动
- ❌ photosynthesis / anatomy / plant 任何文件改动
- ❌ 正式中文教学文案（spike 用英文 id/占位标签即可；教学文案有独立的 Biology Review 流程）
- ❌ 任何连续动画、粒子、扩散、数值模拟
- ❌ merge master / 动其他分支 / push（无 remote）

### 临时挂载方式
spike 分支内用**最小 dev 入口**查看场景（如 `src/main.tsx` 按 `location.hash === '#synapse-spike'` 临时渲染 spike 组件；或独立 dev 页面）。此临时入口**只存在于 spike 分支**，不进正式集成（正式接入走第二轮模块注册）。

---

## 4. Git 规则

- 分支：`feature/bio-013a-astra-spike`（从派发时刻 master HEAD 切出）
- 语义化小 commit（如 `feat(spike): add synapse GLB scene` / `feat(spike): hide-isolate channel` / `feat(spike): ca-channel block toggle`）
- 不 `git add .` 一把梭；不提交 .blend/GLB 二进制（GLB 落在 gitignore 的 local-public；导出脚本必须提交）
- 每 commit 后跑 `npx tsc --noEmit`；完成前跑全量 `npm test`

---

## 5. Definition of Done（Spike）

1. `npx tsc --noEmit` exit 0
2. `npm test`：**既有 248 测试全部保持绿色**（不新增恒真断言；如为 spike 交互加纯函数测试，需有意义）
3. `npm run local-build` exit 0
4. 浏览器手测（或 headless 截图自证）：旋转/缩放 + 3 focusPoses + 逐结构 hide/isolate + Ca²⁺ 阻断 toggle 的视觉差
5. 本轮修改不新增 lint error（`components/ui/*`、`hooks/use-mobile.ts` 历史豁免可忽略）
6. spike 报告写入 `.ai-company/tasks/` 或随 commit message 附注（见 §6）

---

## 6. 完成后报告（写给 CTO，CTO 据此 Review）

1. 改动文件清单 + 每个 commit 一句话说明
2. GLB 生成步骤（blend 位置、导出脚本路径、GLB 大小）
3. 3 个交互的实现方式与实测结果（手测/截图）
4. 已知限制（如材质观感、性能、命名问题）
5. 是否触碰了 Scope 外的东西（若触碰，必须列明）
6. 建议第二轮要解决的问题清单（不实现，只记录）

---

## 7. 停止条件

出现以下任一情况，停止并写报告：
- `tsc` / `npm test` 不能快速恢复绿色
- Blender / GLB 加载被环境阻塞（先查 §2 环境事实与 scratch 示例）
- 发现本包未覆盖的大任务 / 科学内容疑问（**不要自行认定生物学事实**，记录并上报）

---

*本任务包由 CTO 生成，是 DSH 与 Astra 的正式交接渠道。Astra 从磁盘读取本文件与 .ai-company/。*
*Spike 通过后：CTO Review → 第二轮（机制导航 + 知识联动 + 模块注册）→ 正式教学文案 Biology Review（ChatGPT 学习/研究侧）后进 master。*
