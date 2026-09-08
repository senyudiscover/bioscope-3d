# Brain Workbench Asset SPA-Fallback Risk (P0 hotfix, v1)

> 状态：**FIXED（2026-09-08，master `c008d6b` 起）** · 属于 BIO-015 POST-ACCEPTANCE HOTFIX
> 责任人：CTO/DSH（复现 + 修复 + 回归契约）

---

## 1. 现象（用户真实体验）

Brain Workbench（`?module=brain-atlas`）打开后 console 报：

```
Could not load /models/brain/brain.glb:
Unexpected token '<', "<!doctype "... is not valid JSON
```

runtime stats 显示 `0/437`、`0 meshes`、`0 draws`。

## 2. Root Cause

1. `BRAIN_ASSET`（lib/brain-atlas.ts）请求 `/models/brain/brain.glb`，
   DRACOLoader decoder 路径 `/vendor/draco/`。
2. vite-spa.config.ts `publicDir = local-public`，即 dist 里的模型来自
   `local-public/` 的逐字拷贝。
3. 按 BIO-015 冻结资产策略，`.gitignore` 排除
   `/local-public/models/**/*.glb` 与 `/local-public/vendor/draco/`，
   二进制只存在于本机 `local-public/`，**不进 git**。
4. BIO-015 的 QA 全部在 feature worktree 内完成，该 worktree 的
   `local-public/models/brain/brain.glb` 在磁盘上存在，因此
   `local-build` 产物正常、模块可加载。
5. merge 到 master 后，master 主树 **没有** brain.glb（git worktree 各自独立，
   未跟踪二进制不会跨 worktree 迁移），`local-public/vendor/draco/` 也从没生成过。
6. `local-build` 对缺失的 public 资产**不报错**（只拷贝存在的文件）；
   acceptance 复验只跑了 unit tests / tsc / lint / build exit code，
   并只确认了 lazy JS chunk，没有对 `/models/brain/brain.glb` 做过真实 GET
   或浏览器会话 —— 所以漏掉。
7. Vite preview 对缺失路径回退 **SPA index.html，HTTP 200 / text/html**，
   GLTFLoader 拿到 HTML 后按 JSON 解析失败 —— “HTML 200 被误认为 asset 200”。

## 3. 复现证据（修复前，master `ecd8311` + local-start）

| 请求 | HTTP | Content-Type | 前几个字节 |
|---|---|---|---|
| `/models/brain/brain.glb` | 200 | text/html | `<!doctype ht` |
| `/vendor/draco/draco_decoder.wasm` | 200 | text/html | `<!doctype ht` |
| `/models/brain/NOTICE.md` | 200 | text/markdown | `# BioScope B`（正常，证明拷贝管线本身 OK） |

## 4. Fix（master `c008d6b`，只动脚本/契约，无 production UI 逻辑变更）

1. 恢复机器本地资产到 **主树** `local-public/models/brain/brain.glb`
   （与 pinned 完全一致：4,650,816 B，magic `glTF`，
   sha256 `76a49ea4…5453`，同 feature QA 用文件）。
2. `node scripts/prepare-brain-runtime.mjs` → 生成
   `local-public/vendor/draco/{draco_decoder.wasm,draco_wasm_wrapper.js}`
   （从 `node_modules/three/.../draco` 拷贝并 size-verify）。
3. `scripts/prepare-brain-runtime.mjs` 增加 **source GLB guard**：
   缺文件 / 尺寸错 / magic 错 / sha256 错 → 安装期即 loudly fail，
   不再“静默缺资产 → 运行时 HTML fallback”。
4. 新增 `scripts/verify-brain-assets.mjs`（`npm run verify:brain-assets`）：
   post-build 确定性契约，检查 source + `dist-local` 的 GLB 契约
   （magic `glTF` + 精确尺寸 + sha256）与 Draco 文件；可选
   `--url <base>` 时对 `/models/brain/brain.glb` 做 HTTP 探测，
   **拒绝任何 text/html 响应**（即拒绝 HTML 200 伪装 asset 200）。

## 5. 修复后 endpoint 证据

- `GET /models/brain/brain.glb` → **HTTP 200，Content-Type
  `model/gltf-binary`，4,650,816 B，magic `glTF`**
- `GET /vendor/draco/draco_decoder.wasm` → HTTP 200，`application/wasm`，285,747 B
- `GET /vendor/draco/draco_wasm_wrapper.js` → HTTP 200，`text/javascript`，58,763 B

## 6. 未来机器 / fresh checkout 的 reseed 配方（无 git remote、本地优先）

```powershell
# 1) 把 pinned 版本 brain.glb（见 §4 校验值）放到 local-public/models/brain/brain.glb
# 2) 生成 Draco runtime 并校验 source（缺资产会 loud fail）
npm run postinstall          # 或: node scripts/prepare-brain-runtime.mjs
# 3) 构建 + 静态契约 + (可选) HTTP 契约
npm run local-build
npm run verify:brain-assets
npm run verify:brain-assets --url http://127.0.0.1:3000   # 本地预览运行中
```

## 7. 防回归结论

- “HTML 200 被当作 asset 200”已被静态（magic/size/sha）+ HTTP（Content-Type + bytes）
  双重契约拦截。
- 437 结构名单/尺寸/sha 以 `lib/brain-atlas.ts BRAIN_ASSET` 为唯一事实源，
  `scripts/brain-asset-contract.mjs` 与其保持同步（注释互指）。
