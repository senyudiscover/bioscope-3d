# BioScope Independent Review v1

> Deep Assurance #002 · Track O 产出（2026-09-03）。
> **方法保证**：复审员为全新上下文的独立 Agent，严格两阶段工作——第一阶段**禁止阅读**
> docs/audit/ 全部报告与夜班报告，仅凭 `.ai-company/` + 代码 + 全部测试独立形成判断
> （并亲测 `npm test` 247/247、`npm run lint`、git 拓扑）；第二阶段才读 13 份审计报告，
> 逐项对抗。以下区分【独立验证】与【采信报告】。

---

## 1. 第一轮审计漏了什么（独立发现，报告均未提及）

1. **仓库无 remote、无 CI（元风险）**【独立验证】：`git remote -v` 为空；master 停在
   f367db5，全部新资产在未合并的本地分支；`.github` 不存在。所有报告都在讲"护栏"，
   没人问"护栏存在哪里"——247 个测试完全靠人记得跑。
2. **pnpm 10 默认阻止 postinstall 构建脚本**【独立验证】：CAMERA-PATCH 只讨论了
   `--ignore-scripts`（失败 B），漏掉这一当代真实场景——patch 静默缺失，相机 bug 复活。
3. **契约测试非 hermetic**【独立验证】：camera-patch-contract.test.ts:75 在测试内
   execFileSync 运行 patch 脚本——若安装态未 patch，"幂等重跑"用例本身会在测试进程中
   改写 node_modules。
4. **悬空引用**：ARCHITECTURE-MAP-v1 尾注引用了当时尚不存在的 INDEPENDENT-REVIEW-v1.md
   （本文件写入后即消除）。
5. **口径漂移**：TEST-COVERAGE-MATRIX 头注"10 文件/242 tests"与实际 11/247 不同步
   （已在本 commit 一并修正）。
6. **DSH review 面覆盖不全**：#001 夜班报告 §11 的 checklist 只覆盖 #001 的 6 个
   commit，明早照走会漏 deep-assurance 分支的 11 个。
7. **术语状态零 UI 展示**【独立验证】：anatomy-workbench :892 与 KnowledgePanel 均不渲染
   translationStatus；explorerPrimaryName 把 unverified 的「臀中」当正常译名直出——
   "教学产品把部分错译无标记地教给学生"应上升为内容风险项，而非术语层小项。

## 2. 被夸大的风险

1. PERFORMANCE 1.6 定级"高"——事实对（appearance 内联对象独立验证），但实测 N=807
   且当前单机本地预览；P0-2 值得做，"高危"言过其实，建议降 P2。
2. BUILD R1"生产路径 GLB 404"——事实正确但当下影响≈0（零部署零用户），本质是 README 措辞。
3. CAMERA-PATCH R1"必然发生"——lockfile 钉死 774 个 tarball【独立验证计数】，
   reinstall 触发面极小；锁版值得做，概率表述夸大。
4. a11y S1 定级 SEVERE——缺陷真实（:64-89 独立读过），但当前用户即 CEO 一人；
   上线前必修，现在非 S 级。

## 3. 被低估的风险

1. **元风险**（无 remote/无 CI/17 commit 未合并）——唯一"单点即全灭"的风险，应排第一。
2. **内容正确性 = 产品生死**：verified 仅 13 条、~33/73 语料 unavailable、unverified
   无标记直出——对教学产品是系统性削弱，不只是 BIOLOGY REVIEW 清单行。
3. **characterization 基线的维护税**：逐字快照使 BIO-005 内容扩充要连改 4-6 个文件；
   "有意识更新基线"长期有退化成"改测试让它绿"的滑坡风险。
4. **getAncestors 环死循环不应 DEFER**：数据侧"树形假设"已不成立（validator 已有
   自引用 WARNING），防御只要 3 行——复审员对本 backlog D-1 的正式异议。
5. **魔法数跨文件共调族**（430/460/470/110ms、0.16、14）无单一事实源。

## 4. 价值低的新测试（点名）

1. 纯函数"确定性"断言（同输入两次比相等）约 8 处——几乎恒真；配套 5 处
   console.log(全文报告) 进测试输出是噪音。
2. filter-classifier-fuzz "organ 层 ⇔ …"：把实现逐字复述成不变量，等价重构必红。
3. picking-adversarial CF 不变量 3（候选≤5、primary=candidates[0]）：源码字面量复述。
4. terminology-qa sideParsingSamples 7 项快照：固化 QA 探针自己的输出，回归捕获≈0。
5. camera-patch-contract 手写 satisfiesCaret：40 行重造 semver，npm 自己会保证。
6. bioscope-data-invariants "registry key 与 node.id 一致"：与 validator NODE_ID_MISMATCH 重复。

公平起见（复审员认可的真资产）：picking G 组评分基线、filters F 组祖先链、
terminology G 组真实 fixture、validator 组 9b（两个 ERROR 级补测）、camera 契约 1-3 组。

## 5. 过度测试实现细节的具体断言

- picking-manager.test.ts:462-481 parent-context 组：为 dead flag（context 标志在评分
  路径无法生效，注释自认）建期望。
- knowledge-graph.test.ts:554-558,571-579：WARNING/孤儿消息**逐字英文文案**断言——
  code+计数足矣。
- anatomy-filters.test.ts:216-237：锁选项常量数组字面顺序（展示顺序偏好）。
- filter-classifier-fuzz.test.ts:103-107："矩阵自检"——为测试数据写测试。
- （不计为问题）picking G 组对 14 分歧义/organ 例外的锁定：D-007 明示决策。

## 6. 不值得做的建议（对本 backlog 的否决/修正）

1. P0-2 的 rAF 合并 setPointer **半步**：tooltip 坐标依赖同步 setPointer（:1002-1008），
   合帧会让 tooltip 跟手可感滞后，与"视觉零变化"矛盾。只做 appearance useMemo([])，
   且整项降 P2。
2. P1-4 整包做 M1/M3/M9：只做 M1（M9 自标可选，M3 在 details/summary 下收益存疑）。
3. P2-4 组件测试基建：无 CI 现状下 90% 时间不会运行——**先 CI 后基建**。
4. P3-2/P3-3 文档卫生批量项：纯 churn，违反"不擅自扩大 scope"。
5. CED-6/7/8 逐边补：应与 BIO-005 打包成一次内容版本，避免碎片化触发 4-6 个测试文件
   的基线同步。
6. M8 对比度全局替换：维持"仅报告"（全局视觉基调是 CEO 决策）。
7. **异议（升级而非否决）**：D-1 getAncestors 环防御应从 DEFER 升为 P2——3 行修复。

## 7. 最该保护的 5 个资产（排序）

1. **git 历史本身**——无 remote、未合并分支，是其他一切资产的存在前提。
2. data/knowledge/*.ts + lib/anatomy-terminology.ts——手写中文教学内容，产品本体。
3. scripts/patch-vanatome-camera.mjs + 契约测试——D-002"知识导航不触发相机"隐式依赖
   patch 后的 focus guard。
4. lib/picking-manager.ts + 两套 characterization——0.16/14/权重基线即事实规格（D-007）。
5. .ai-company/ 六文件 + docs/audit 报告——AI 协作过程记忆；data/modules/legacy.ts
   这类零 import 指针是 FROZEN 决策的代码锚。

## 8. 最危险的 5 个工程风险（排序）

1. **资产单点**（无 remote + 未合并 + 无 CI + 单机）——低概率×不可逆全损。
2. **postinstall patch 断裂面**（caret×逐字符锚 + pnpm10/--ignore-scripts 静默路径 +
   检测手段只在手动 npm test 时运行）。
3. **教学内容正确性**（verified 13 条/unverified 无标记直出/疑似错译）。
4. **characterization 基线的规模效应**（护栏磨成仪式的组织风险）。
5. **生产/部署叙事断裂**（一旦真上线将一次性引爆，现被"本地预览可用"掩盖）。

---

## 总评（复审员原文）

> 这套资产的证据密度罕见：论断带行号、可复现（247/247 全绿我亲测）、有 WONT FIX
> 清单防重复报告，对 DSH 明早 review 是高杠杆底稿。三个盲点：无 remote/无 CI 的元风险
> 全场无人提，characterization 维护税被过度正当化，内容正确性被降格为术语小项。
> 建议 DSH 只先拍三件事：**加 remote 并合并、锁 vanatome-react 版本、加一条跑
> npm test 的 CI**。**8/10**。

## EM 对复审意见的处置（透明记录）

- 采纳并已修：矩阵头注口径漂移（本 commit）；悬空引用（本文件落盘即消除）。
- 采纳并改写 backlog：P0-2 拆分降级（appearance useMemo 保留 P0，rAF 半步移除）、
  P1-4 收窄为仅 M1、P2-4 加"先 CI"前置、D-1 升 P2、CED-6/7/8 建议打包进内容版本。
- 采纳进最终报告：元风险列为 DSH Top 建议第一条（remote/备份/合并、CI——均为 DSH 权限，
  夜班不擅自执行 merge/建 remote）。
- 不采纳：对 camera 契约组 4-6"价值低"的判定部分保留（幂等与版本契约是安装态唯一
  自动检测，但在其建议上补注 hermetic 性限制——已记入 CAMERA-PATCH-RISK 的复审注记）。
  satisfiesCaret 手写判定保留（无 semver 依赖约束下最简实现，替换收益 XS）。

---
*生成：Deep Assurance #002 Track O（独立复审 Agent 原文 + EM 处置记录）。
INDEPENDENT-REVIEW 对 backlog 的修正以本文件 §6 为准，与 ENGINEERING-BACKLOG-PROPOSAL-v1.md
并用。*
