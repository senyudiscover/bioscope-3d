# BioScope Camera Patch Risk v1

> Deep Assurance #002 · Track H 产出（2026-09-03）。只读分析 + 契约测试（无相机行为修改）。
> 对象：`scripts/patch-vanatome-camera.mjs`（89 行）、
> `node_modules/@vixotic/vanatome-react@0.1.6/dist/VanatomeViewer.js`（实际 patched 产物）、
> 决策依据 DECISIONS.md D-003。

---

## 1. Patch 机制现状

postinstall 阶段对第三方编译产物做 **5 步 sentinel 幂等替换**（`apply()`，:26-32）：

1. CameraController 声明 `previousFocusKey` ref + `distanceLimits` state（:37-43）；
2. focus effect 加守卫——**只有 focusRequestKey 变化才允许自动构图**（:46-52）；
3. 恢复全局 `maxDistance`，删除 `max: Math.min(maxDistance, Math.max(distance*12, sphere.radius*9))`
   收缩逻辑（:58-61，"滚轮缩小后弹回"根因）；
4. OrbitControls 改用 `distanceLimits.min/max`（:64-70）；
5. 终检不变量，失败 loudly throw（:74-82）。

**当前安装态（已验证）**：4 个 sentinel 全部 PRESENT、收缩 token GONE；
`tests/camera-patch-contract.test.ts`（6 tests）自动验证存在性/语义顺序/幂等重跑/版本契约。

## 2. 脆弱性评估

| 检查项 | 评估 | 证据 |
|---|---|---|
| anchor 是否过于脆弱 | **是——by design**。锚是具体编译产物的精确字符串 token，与 0.1.6 的 bundle 逐字符绑定 | patch :20/:40/:49/:58/:67 |
| 第三方升级后会发生什么 | `^0.1.6` caret 范围内任何 0.1.x 更新 → token 失配 → `apply()` throw → **整个 npm install 非零退出**（失败 A）；降级安装 `--ignore-scripts` 会静默跳过 patch（失败 B），"缩放弹回"复活且只在跑测试时被发现 | DEPENDENCY-RISK-v1.md：caret 语义与 patch 契约互相矛盾 |
| postinstall failure mode | loud-throw 是**有意特性**（防止坏 patch 静默进入）；但后果是安装全阻断，发生在"平常的重新安装"时最致命 | :29/:75/:78/:81 |
| 如何检测 patch 未生效 | ✅ 已建立：`npm test` 中的 camera-patch-contract 契约测试（安装态存在性 + 幂等）；未生效时 6 条测试红 | tests/camera-patch-contract.test.ts |
| previousFocusKey 等关键行为能否自动验证 | 部分。静态可验证：标记存在、守卫先于 selectedId 判断、幂等重跑字节不变。**运行时行为**（自动对焦只随 focusRequestKey 触发）无法在 node 环境验证（需要 WebGL/R3F），当前靠 anatomy 手测 | 契约测试的边界声明 |

## 3. 风险矩阵

| # | 风险 | 等级 | 缓解 |
|---|---|---|---|
| R1 | 上游 0.1.x 更新 → npm install 全阻断 | **高**（必然发生，只是时间问题） | 见建议 1 |
| R2 | `--ignore-scripts` / CI 缓存跳过 postinstall → patch 静默缺失 | 中 | 已被契约测试兜底（测试会红）✅ |
| R3 | patch 与 anatomy-workbench `cameraOwnership` 460ms 归还逻辑是共调隐形协议，单边改动可能复现"误聚焦/弹回" | 中 | 文档化（本文件 + ARCHITECTURE-MAP §12-1）；改任一侧前必须跑 picking/camera 基线测试 + 手测相机 |
| R4 | patch 脚本相对 CWD 解析 node_modules（手工复跑必须在项目根） | 低 | 脚本仅由 postinstall（恒在包根）与契约测试（cwd=repoRoot）调用 ✅ |

## 4. 建议（不自动执行）

1. **评估把 `@vixotic/vanatome-react` 从 `^0.1.6` 改为精确 `0.1.6`**（锁版与 patch 契约绑定）。
   优点：消除 R1 的"静默流入新版本"路径，升级变成显式决策。缺点：错过上游修复，升级需手动。
   属依赖策略变更 → CTO 决策（已入 BACKLOG PROPOSAL）。
2. 保持现状的 loud-throw 设计不变——它是正确的失败模式；不要把 patch 失败降级为 warning。
3. 若上游未来提供官方 focus 控制 API（D-003 的 revisit 条款），移除 patch 时同步删除
   camera-patch-contract 测试，避免反向假绿。
4. 运行时相机行为的自动验证（headless WebGL smoke）成本高收益低，不建议投入；
   以契约测试 + 手测清单为准。

## 5. 契约测试清单（本轮新增资产）

`tests/camera-patch-contract.test.ts`（6 tests）：
1. 4 个 sentinel 标记存在；
2. 收缩 maxDistance token 不存在；
3. focus guard 位于 selectedId 判断之前（顺序错=行为反转）；
4. 幂等重跑：对已 patch 安装再执行脚本 → exit 0 且 bundle sha256 不变；
5. 安装版本满足根 package.json caret 范围（手写 satisfiesCaret，不引 semver 依赖）；
6. postinstall 脚本接线完整。

---
*生成：Deep Assurance #002 Track H。与 BUILD-DEPLOYMENT-RISK-v1.md（失败模式 A/B）、
DEPENDENCY-RISK-v1.md（vanatome-react 升级风险全表最高）交叉一致。*
