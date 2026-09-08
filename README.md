# BioScope

**Visual Biology Explorer** — 面向中文本科生物学初学者的跨生命对象三维学习工作台。

通过三维生物模型作为视觉入口，把碎片化的生物学知识连接成可自由探索的学习路径：

> 看见（3D 模型）→ 理解（知识卡）→ 连接（关联知识）→ 深入（新知识节点）

---

## 当前模块

| 模块                       | 状态   | 说明                                           |
| -------------------------- | ------ | ---------------------------------------------- |
| 人体解剖（human-anatomy）  | stable | 完整人体模型，系统/显示层筛选，picking，知识卡 |
| 脑图谱（brain-atlas）      | BETA   | 独立 lazy-loaded Brain Workbench，437 结构交互 |
| 光合作用（photosynthesis） | BETA   | 叶肉细胞→叶绿体→类囊体膜，机制动画未实现       |
| 旧植物（plant-workbench）  | FROZEN | 已冻结，仅阅读参考，不开发不删除               |

---

## 技术栈

- **框架**：vinext 1.0（OpenAI sites，Vite + RSC）+ React 19 + TypeScript 5.9（strict）
- **3D**：three + @react-three/fiber + @react-three/drei
- **人体模型**：@vixotic/vanatome-atlas（Z-Anatomy 1.4.0）
- **UI**：shadcn + tailwindcss 4
- **部署**：Cloudflare Workers（wrangler）
- **测试**：vitest · **Lint/格式**：oxlint / oxfmt

---

## 安装

要求 Node >= 22.13.0。

    npm install

> npm install 会自动 patch 第三方人体查看器包的相机逻辑（修复「滚轮缩小后弹回原位」），
> 并从锁定安装的 Three.js 包复制、校验 Brain GLB 所需的 Draco runtime。

### 模型资产（本地运行必需）

人体 3D 模型是第三方 Z-Anatomy 1.4.0 资产（约 30MB），不纳入 git（见 .ai-company/DECISIONS.md D-009）。

本地运行前，需将 z-anatomy-1.4.0-full-body.glb 放置到：

    local-public/models/z-anatomy-1.4.0-full-body.glb

模型来源：@vixotic/vanatome-atlas 包（github.com/vixotic/Vanatome）。

Brain Workbench 另需 `brain.glb`（4,650,816 bytes，SHA-256
`76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453`），
放置到：

    local-public/models/brain/brain.glb

该资产来自 `itayinbarr/brainproject`，使用 CC BY-SA 4.0；完整来源与
ShareAlike 边界见同目录 `NOTICE.md`。GLB 及其衍生版本必须保留 attribution，
且不得混入 NC/ND 资产。上述 ShareAlike 要求针对 Brain 资产及其衍生物，
不代表无关的 BioScope application code 必须采用同一许可证。

---

## 运行

### 本地预览（推荐）

    npm run local-build   # 构建纯 SPA
    npm run local-start   # http://127.0.0.1:3000

Windows 可双击 启动网站.cmd（自动 build + preview）。

### 生产构建（PRODUCTION DEPLOYMENT NOT VERIFIED）

    npm run build   # vinext build（Cloudflare + RSC）
    npm run start   # wrangler dev

> **部署状态（2026-09-03 CEO 决策）**：当前产品事实为 **LOCAL DEVELOPMENT /
> LOCAL PREVIEW VALIDATED · PRODUCTION DEPLOYMENT NOT VERIFIED**。生产路径
> `public/models/` 为空（人体模型 404）、仓库暂无自动部署脚本、Cloudflare D1/R2
> 仅为占位配置。完整体验目前只有本地预览可复现（local-build + 手动放置 GLB）。
> 详见 docs/audit/BUILD-DEPLOYMENT-RISK-v1.md。

---

## 测试

    npm test                    # vitest(picking / anatomy-filters / anatomy-terminology / 知识图)
    npm run validate:knowledge  # 知识图引用完整性校验（errors 必须为 0）
    npm run audit:knowledge-chain  # 核心学习链双向可达性审计（只读基线）
    npx tsc --noEmit            # 类型检查
    npm run lint                # oxlint

---

## 目录结构

    app/           工作台与页面（anatomy / brain / photosynthesis / plant，workspace）
    components/    业务组件（brain-viewer、photosynthesis-viewer、micro-lab、plant-viewer）+ shadcn ui/
    data/          数据层（brain manifest、knowledge、photosynthesis、modules 注册表）
    lib/           核心库（picking-manager、anatomy-filters、anatomy-terminology、knowledge-graph-validator、bioscope-core、knowledge-nodes）
    scripts/       构建/守护脚本（patch-vanatome-camera.mjs、validate-knowledge-graph.ts、audit-knowledge-chain.ts）
    tests/         回归基线（picking-manager、anatomy-filters、anatomy-terminology、knowledge-graph、knowledge-chain-audit）
    local-public/  本地静态资产（GLB 忽略；NOTICE 跟踪）
    .ai-company/   项目运行状态与团队规则（见下）

---

## 当前项目成熟度

v0.1 试点（AI Company 第一个项目）。

- 人体解剖模块功能完整、稳定，有回归测试覆盖 picking。
- Brain Workbench 为独立 BETA 模块；模型按需加载，不作为人体默认深层嵌入。
- 光合作用模块为 BETA，机制动画未实现。
- 已知技术债与下一步见 .ai-company/ROADMAP.md 与 .ai-company/BOARD.md。

---

## AI Agent Onboarding

**Before modifying BioScope, read（按顺序）：**

1. .ai-company/AGENTS.md — 团队规则、职责、升级拍板协议、Definition of Done
2. .ai-company/PROJECT.md — 项目是什么、架构、已验证能力、约束、技术债
3. .ai-company/BOARD.md — 当前任务看板（状态/Owner/验收标准）
4. .ai-company/DECISIONS.md — 已确认的设计决策及原因

项目状态的事实来源是 .ai-company/ + 代码本身，不是本 README。本 README 只是入口，不复制 .ai-company/ 的全部内容。

关键规则（详见 AGENTS.md）：

- 改动前先跑 npx tsc --noEmit 建基线，改完再跑。
- 不擅自扩大 scope，发现新问题记录到 BOARD。
- 涉及 picking 改动必须跑 npm test 并更新基线测试。
- 不破坏 Camera 行为（不能重新出现「滚轮缩小后自动回弹」）。
- 大方向（AI Tutor / 用户系统 / 蛋白质查看器 / 大规模 Obsidian）当前 NOT NOW，需 CEO 决策。
