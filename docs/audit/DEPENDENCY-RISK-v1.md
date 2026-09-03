# BioScope Dependency Risk v1

> ⚠️ SNAPSHOT（历史快照）：基准 commit 为 night-shift 验收（2026-09-03），版本/lockfile 相关结论随依赖变化而过时，不承诺持续维护。见 docs/audit/README.md。

> Deep Assurance #002 · Track M 产出（2026-09-03）。只读评估，**不建议/不执行任何自动升级**。
> lockfile 概况：package-lock.json lockfileVersion 3；773 包；774/774 resolved 带 sha512
> integrity 且**全部指向 registry.npmmirror.com**；无 git/http/file/link 依赖；根
> hasInstallScript: true（postinstall patch）。

---

## 1. 逐依赖评估

| 依赖 | 当前/范围 | 为什么存在（import 处） | 关键路径 | 被 patch | 升级风险 |
|---|---|---|---|---|---|
| @vixotic/vanatome-react | ^0.1.6 → 0.1.6 | anatomy-workbench.tsx:11-16（VanatomeViewer/useVanatomeController）；三个 lib 只用类型 | 是（3D 核心+picking 语义） | **是（全仓唯一）** | **全表最高**：caret 允许 0.1.x 流入，patch 依赖 3 个精确 token，任何上游变化 → npm install 全阻断；caret 与 patch 契约矛盾 |
| @vixotic/vanatome-atlas | ^0.1.4 → 0.1.4 | anatomy-workbench.tsx:18-21（createOfficialHumanAtlas） | 是（anatomy 数据入口） | 否 | 中：catalog URL + buildId 硬编码并严格校验；与 react 包 peer 联动 |
| react / react-dom | 19.2.6 精确 | 全部 UI | 是 | 否 | 低：精确钉版正确；上限来自 fiber peer（<19.3）与 vinext peer（^19.2.6） |
| three | ^0.180.0 → 0.180.0 | plant-viewer、photosynthesis-viewer | 是 | 否 | 中：0.x caret=0.180.x；与 vanatome-react peer 必须同步升级 |
| @react-three/fiber | ^9.7.0 → 9.7.0 | 两个手绘 viewer | 是 | 否 | 低：peer 明确（react >=19 <19.3）；有 picking 基线保护 |
| @react-three/drei | ^10.7.8 → 10.7.8 | 两个 viewer（OrbitControls/useGLTF） | 是 | 否 | 低-中：drei 面大，靠 tree-shaking |
| vinext | 1.0.0-beta.5 精确 | vite.config.ts:3,53；app/ 路由约定；tsconfig types | 是（生产框架） | 否 | 高：beta 跨版本破坏常见；peer 链（vite ^8、plugin-react、plugin-rsc）需联动；内嵌 Google Fonts 构建链（BUILD-DEPLOYMENT R5）。**精确钉版是必要且正确的** |
| wrangler | 4.92.0 精确（dev） | start 脚本；cloudflare 插件底层 | 生产验证链 | 否 | 低-中：大版本需同步 @cloudflare/vite-plugin 1.37.1 |
| vitest | ^4.1.11 → 4.1.11（dev） | test / validate:knowledge / audit:knowledge-chain | 质量护栏（知识校验被当门禁） | 否 | 低；engines `^20\|\|^22\|\|>=24` 使 node 23.x 成为项目声明范围内的黑洞 |
| @base-ui/react | 1.7.0 精确 | components/ui/* 绝大多数原语 | 是（UI 基础件） | 否 | 低-中；optional peer date-fns^4/@date-fns/tz（date-fns 出现在 dependencies 的原因） |
| @shadcn/react | 0.3.0 精确 | **仅 components/ui/message-scroller.tsx，而该组件零业务引用** | 否 | 否 | 无（未用）；存在理由存疑 |
| tailwindcss / @tailwindcss/postcss | 4.2.1 精确（dev） | 两个 vite 配置 + globals.css | 是 | 否 | 低；v4 CSS-first 主版本迁移成本高 |
| typescript | 5.9.3 精确（dev） | tsc --noEmit（DoD 流程） | 开发流程 | 否 | 低 |
| oxlint 1.76.0 + oxlint-tsgolint 7.0.2001（dev） | 精确 | lint 脚本；tsgolint 是类型感知后端（非第二个 linter） | 否 | 否 | 低（两版本需配套） |
| oxfmt 0.61.0（dev） | 精确 | format 脚本；**唯一格式化器** | 否 | 否 | 低 |

## 2. 横向问题

1. **三套 headless 原语并存**：@base-ui/react（主体系）+ @shadcn/react（仅一个零引用组件在用）
   + @radix-ui/react-dialog 全家（经 cmdk 传入，cmdk 只被零引用的 ui/command.tsx 使用）。
2. **整链死重**（60 个 ui 中 57 个休眠，见 CODE-LIFECYCLE-INVENTORY）：cmdk、
   embla-carousel-react 8.5.2、input-otp 1.4.2、recharts 3.8.0、react-day-picker 9.8.1、
   react-resizable-panels 4.5.8、@shadcn/react 全部只被未使用组件引用。date-fns 4.1.0
   **源码零引用**（仅为 @base-ui/react optional peer 存在）。运行时被 tree-shake，
   但拖累安装体积与审计面。
3. **deps/devDeps 划分**：大方向合理；两处偏差——`shadcn`（CLI 工具）应属 devDependencies；
   `@vitejs/plugin-rsc`（dev）与 `react-server-dom-webpack`（deps）是 vinext optional peer 的
   显式钉版保护，升级 vinext 时必须三者在同一批次。
4. **engines 与实际**：项目 `>=22.13.0`；vite 8/wrangler/vinext 均满足；vitest 4 使
   node 23.x 成为黑洞；npm 默认不强制 engines（无 .npmrc/engine-strict）。本机
   node v24.18.1 满足全部约束。
5. **lockfile 健康**：v3、integrity 100%、无外部 URL 依赖、postinstall 已声明。
   唯一结构性问题：全部 tarball 绑定 npmmirror（BUILD-DEPLOYMENT R4）。

## 3. 升级风险总排序（只评估）

```text
@vixotic/vanatome-react（带 patch 的 caret） > vinext（beta 框架） >
three / vanatome-atlas（peer 联锁 + 远程 catalog buildId） > @base-ui/react / @shadcn/react >
其余（react/three 精确钉版 + fiber <19.3 上限意味着 React 升级需 fiber 先行）
```

## 4. 建议（供 BACKLOG PROPOSAL，均非自动执行）

1. vanatome-react 锁精确版本（与 CAMERA-PATCH-RISK-v1 建议 1 同源，CTO 决策）。
2. 清点死重依赖（7+1 个）——但**先决条件**是先决策 57 个休眠 ui 组件的去留
   （删除组件→才能删依赖），两步都属 CTO/产品决策，非 Agent 自行清理。
3. `shadcn` CLI 移到 devDependencies（无风险的机械修正）。
4. 评估 lockfile registry 重建（海外协作/CI 稳定性时再做）。

---
*生成：Deep Assurance #002 Track M（独立探索 Agent 产出，EM 抽查收编；
与 BUILD-DEPLOYMENT-RISK-v1.md、CODE-LIFECYCLE-INVENTORY-v1.md §四 交叉一致）。*
