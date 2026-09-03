# BioScope Build & Deployment Risk v1

> Deep Assurance #002 · Track L 产出（2026-09-03）。只读审计；未部署、未要求任何 secret。
> 核心问题：**一个陌生 Agent 从 clone 到运行，哪些步骤真实可重复？**

---

## 1. 两条构建路径对照

| | `npm run build`（vinext 生产） | `npm run local-build`（vite SPA 本地） |
|---|---|---|
| 配置 | vite.config.ts（vinext + sites + cloudflare 插件） | vite-spa.config.ts（仅 @vitejs/plugin-react） |
| publicDir | `public/`（**models/ 为空目录**） | `local-public/`（GLB 在位，30,849,556 字节） |
| 入口 | app/（layout.tsx+page.tsx，RSC/SSR + next/font/google） | index.html → src/main.tsx（纯客户端） |
| 输出 | dist/client + dist/server（含 wrangler.json、BUILD_ID） | dist-local/（assets/ + models/*.glb） |
| 服务 | `npm run start` = wrangler dev（引用 dist/server/wrangler.json） | `npm run local-start` = vite preview @127.0.0.1:3000 strictPort |
| 网络 | 构建期拉 Google Fonts（R5） | 完全离线可构建 |

**关键资产归属**：人体 GLB 路径 `/models/z-anatomy-1.4.0-full-body.glb` 由 publicDir 提供
（app/anatomy-workbench.tsx:124-127 硬编码覆盖 modelUrl）。SPA 路径 publicDir=local-public
（GLB 在位）→ 能加载；vinext 路径 publicDir=public（**空**）→ **dev/build/start 全链路
人体模型 404**。

## 2. Cloudflare / wrangler 真实状态

- D1/R2 是**纯占位**：`.openai/hosting.json` = `{"d1":null,"r2":null}` →
  vite.config.ts:15-35 生成空的 d1_databases/r2_buckets；产物 wrangler.json 同样为 `[]`；
  业务代码零 `env.DB`/`env.R2` 消费。绑定机制是"接好线但没插电"。
- `dist/server/wrangler.json` 由 @cloudflare/vite-plugin 在 build 时生成（源头是
  vite.config.ts 内联 localBindingConfig，**不是** repo 根的 wrangler 文件——根目录没有）。
- **没有 deploy 脚本**：README 宣称"部署 Cloudflare Workers"，但 package.json 无 deploy，
  部署路径实际未落地/未验证。

## 3. Vanatome 模型资产链

1. GLB **不在 npm 包内**（@vixotic/vanatome-atlas 的 files 只有 dist/README/ASSET-LICENSE），
   **不在 repo 内**（.gitignore:44；决策 D-009）；当前磁盘上的 GLB 是手工放置的。
2. 运行时加载链：`createOfficialHumanAtlas()` → **fetch 远程 catalog**
   `https://atlas.vanatome.vixotic.in/releases/1.4.0/catalog.json`（buildId 严格校验）→
   fetch metadata → app 用本地路径覆盖 GLB 的 modelUrl → useGLTF 从同源 /models/ 取。
3. 即使 GLB 在本地，**anatomy 元数据仍需外网**（catalog/metadata）；
   离线时 anatomy 报"无法加载人体图谱"，photosynthesis/plant 不受影响。
   README 只字未提这一运行时网络依赖。

## 4. 陌生 Agent：clone → 运行 可重复性清单

| 步骤 | 结果 | 断点 |
|---|---|---|
| git clone | 必然成功 | 无 GLB、无 dist/、无 local-public/models/ 目录、无 .vinext 字体缓存 |
| Node 版本 | 有条件 | engines `>=22.13.0` 仅告警；**node 23.x 会被 vitest 4 拒绝**（`^20\|\|^22\|\|>=24`） |
| npm install | 依赖网络 | ① 774/774 tarball 指向 registry.npmmirror.com（integrity 齐全）；② postinstall patch 单点（失败模式见 CAMERA-PATCH-RISK-v1.md） |
| npm run local-build | **必然成功**（install 后） | 无字体/网络依赖；GLB 缺失不影响构建 |
| npm run local-start | 有条件 | strictPort 3000 占用即失败；运行时需本地 GLB + 远程 catalog |
| npm run build | 依赖网络 | 构建期经 next/font/google 拉 Google Fonts；离线/受控网络 CI 必失败或卡顿 |
| npm run start | 依赖 build | dist/ 被 gitignore，clone 后直接 start 报错；且 assets 的 models/ 为空 → GLB 404 |

## 5. 风险列表

| # | 现象 | 证据 | 影响 | 缓解建议 |
|---|---|---|---|---|
| R1 | 生产路径 GLB 404 | anatomy-workbench.tsx:126；public/models/ 空 | vinext 链路 anatomy 不可用；README"生产构建"表述与事实不符 | vinext 构建复制 local-public→public 或共享模型常量；先补 .gitignore 忽略 /public/models/ |
| R2 | postinstall 精确 token 匹配 × caret 版本 | patch :26-32；package.json `^0.1.6` | 上游 0.1.x 更新 → npm install 全阻断 | 评估锁精确版本（CAMERA-PATCH-RISK 建议 1） |
| R3 | 运行时强依赖 atlas.vanatome.vixotic.in | vanatome-atlas dist/human.js | 外部服务单点；上游换 build → 元数据全挂 | createOfficialHumanAtlas 支持覆盖 catalogUrl，可自托管 |
| R4 | lockfile 100% 绑定 npmmirror | 774 条 resolved | 海外/CI 安装慢或不稳 | 人工决策是否用官方 registry 重建 |
| R5 | 构建期拉 Google Fonts | app/layout.tsx:7-13 | 离线 CI 上 npm run build 失败 | 自托管 Geist 字体 |
| R6 | start 依赖被 gitignore 的 dist/server/wrangler.json | package.json:11 | clone 后直接 start 报错 | prestart 检查/文档标注 |
| R7 | engines 宽于实际工具链 | engines vs vitest engines | node 23.x 黑洞 | 收紧 engines 或 engine-strict（决策项） |
| R8 | /public/models/ 未被 gitignore | .gitignore:44 只有 local-public | 修复 R1 时 30MB GLB 有误提交风险 | 预先补 ignore |
| R9 | 部署叙事与仓库能力不符 | README:27 vs 无 deploy 脚本 | "部署 Cloudflare" 不可重复 | README/.ai-company 标注 NOT NOW 或补脚本 |
| R10 | 双产物心智负担 | dist/（无模型 RSC）vs dist-local/（有模型 SPA） | 排障易混淆 | 本文件 §1 对照表即答案 |

## 6. 结论

- **真实可重复**：clone → npm install（有网）→ local-build → local-start（再补 GLB + 外网 catalog）。
- **不可重复/有断点**：npm run build（字体网络）、npm run start（顺序约定 + GLB 缺失）、
  任何生产部署叙事。
- 与 README 的落差集中在：生产构建宣称 vs 模型 404 现实、部署宣称 vs 无 deploy 脚本、
  运行时远程 catalog 依赖未提及（N 项已进 BACKLOG PROPOSAL 与 .ai-company 真实性审计）。

---
*生成：Deep Assurance #002 Track L（独立探索 Agent 产出，EM 抽查关键论断——public/models/
为空、hosting.json 占位、GLB 体积——后收编）。*
