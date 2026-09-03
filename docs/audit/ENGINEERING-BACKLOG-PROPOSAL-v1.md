# BioScope Engineering Backlog Proposal v1

> Deep Assurance #002 收口产出（2026-09-03）。合并 A~N 全部 Track 的发现，同类合并。
> **这是提案，不是承诺**：不直接更新正式 ROADMAP/BOARD（留给 DSH）。
> 每项含 Evidence / Impact / Cost / Risk / Owner / Acceptance Criteria。
> Cost 口径：XS=≤30min、S=≤2h、M=半天、L=1-2 天。

---

## P0（下一个工程会话就做；高价值 × 低风险 × 不改产品体验）

| # | 项 | Evidence | Impact | Cost | Risk | Owner | AC |
|---|---|---|---|---|---|---|---|
| P0-1 | `.gitignore` 补 `/public/models/` | BUILD-DEPLOYMENT R8（.gitignore:44 只有 local-public） | 防止 30MB GLB 误入 git 历史（修 R1 时必然发生） | XS | 零 | Engineer | 新 ignore 行生效；`git status` 不再显示 public/models |
| P0-2 | `appearance` 对象身份稳定（提 useMemo([])）——**rAF 合并 setPointer 已按 Track O 复审移除**（tooltip 依赖同步 setPointer，合帧产生可感滞后） | PERFORMANCE 1.6/Top5-1（anatomy-workbench :1072-1081 每渲染新对象字面量 → 第三方每次鼠标移动全场景材质刷写）；Track O 修正 | 消除最大隐藏热路径；N 增大时防掉帧 | XS | 低（视觉数值零变化） | Engineer | Profiler 显示 pointer move 不再触发材质 effect；全部测试绿；肉眼无视觉差异 |
| P0-3 | `getStructureTerm` 记忆化 | PERFORMANCE 1.5/Top5-3（树 ~3.2 万正则/渲染；搜索每键入 O(N×40 正则)） | 搜索/树/tooltip 重复计算消失 | XS-S | 低（纯缓存零行为变化） | Engineer | 现有术语测试**不改一字**全绿；打字卡顿消失（807→8000 均适用） |
| P0-4 | a11y Top3 安全修复 | ACCESSIBILITY 可直接修 Top 3（M4 的 aria-pressed/expanded/current、M6 的两个无名 X、M7 的 role=status/alert） | 键盘/读屏基本语义；零视觉变化 | S | 低 | Engineer | 属性补齐；tsc+测试绿；视觉 diff 为零 |

## P1（需要一个小决策或一次有意识的行为变更确认）

| # | 项 | Evidence | Impact | Cost | Risk | Owner | AC |
|---|---|---|---|---|---|---|---|
| P1-1 | 补 `musculoskeletal` 中文系统术语 | TERMINOLOGY-QA E-1（CONFIRMED；systems 表缺条目，breadcrumb 回落英文）；D-005 中文优先 | UI 一致性 bug 修复 | XS | 低（zh 字符串「肌肉骨骼」已在 systemFilterOptions 使用，措辞无新造） | Engineer | getSystemTerm('musculoskeletal').zh 非空；terminology-qa 守门基线更新为 [] |
| P1-2 | vanatome-react 锁精确版本 | CAMERA-PATCH R1 / DEPENDENCY 排序第一（caret 与 patch 契约矛盾） | 消除"npm install 突然全阻断"的必然风险 | XS（改 package.json） | 低（升级变显式决策） | CTO 拍板 → Engineer | package.json `0.1.6` 精确；camera 契约测试绿 |
| P1-3 | M2 CandidateMenu 弹层语义 | ACCESSIBILITY M2（无 role、Esc 实际无效、焦点丢失） | 键盘可用性 | S | 中（焦点行为微变，需手测） | Engineer + 手测 | role/aria-label/Esc/焦点归还四项落实 |
| P1-4 | a11y 中项（按 Track O 收窄：**只做 M1** Canvas role/tabIndex；M3/M9 收益存疑或自标可选） | ACCESSIBILITY M1/M3/M9；INDEPENDENT-REVIEW §6-2 | Canvas 可感知 | S | 低 | Engineer | M1 落地 |
| P1-5 | 神经系统接入 + 其余 CEO 批准的补边 | KNOWLEDGE-GRAPH-AUDIT-v2 F-1/F-2/F-3 + CED-1~8 | BIO-004 验收达成 | S（数据+更新 characterization 基线） | 低（测试有意变红→更新） | CEO 批准 → Engineer | audit 测试基线更新后全绿；核心链双向走通 |

## P2（有明确价值，排后；或需要新基建）

| # | 项 | Evidence | Impact | Cost | Risk | Owner | AC |
|---|---|---|---|---|---|---|---|
| P2-0 | **建 CI（哪怕一条 `npm test` + tsc 的 workflow）+ 加 git remote/备份** | INDEPENDENT-REVIEW Q1-1/Q1-2（元风险：无 remote、无 CI，护栏均为单机纸面资产） | 一切护栏的前提 | S | 零（不碰代码） | DSH（权限项） | remote 存在且推送；CI 在 PR/推送时跑绿 |
| P2-1 | picking 解析缓存化（byId/children/displayLayersFor）+ 解析移入防抖 | PERFORMANCE 1.2/1.3/Top5-2 | N 增大后 hover 不退化 | S-M | 中（必须保持纯函数确定性，测试钉死） | Engineer | 两套 picking 测试不改一字全绿；基准脚本对比数据 |
| P2-2 | hover 状态下沉 / 面板 memo 边界 | PERFORMANCE Top5-4 | hover 提交重渲染面整页→3D 区 | M | 中 | Engineer | React Profiler 验证；手测无回归 |
| P2-3 | 搜索索引前置 | PERFORMANCE Top5-5 | 打字 O(N×正则)→O(N×includes) | S | 低 | Engineer | searchResults 行为不变 |
| P2-4 | **picking getAncestors 环防御（~3 行，Track O 异议后从 DEFER 升入）** | Track C POSSIBLE BUG + INDEPENDENT-REVIEW Q3-4 | 消除唯一已知的挂死路径 | XS | 低（需过 picking 全套基线） | Engineer | 构造环 fixture 的测试转正并绿 |
| P2-5 | 组件测试基建（jsdom/R3F mock）——**前置条件：P2-0 CI 先落地**（Track O：否则 90% 时间不运行） | TEST-COVERAGE-MATRIX ⏸ 行 | workbench 层零测试的缺口开始收敛 | L | 中（基建决策） | CTO 排期 → Engineer | 基建落地并覆盖 2 个契约测试 |
| P2-6 | a11y M5 树语义 | ACCESSIBILITY | 读屏结构感 | M | 低 | Engineer | aria-level/expanded 落地 |

## P3（打磨 / 文档 / 卫生）

| # | 项 | Evidence | Cost |
|---|---|---|---|
| P3-1 | README tests/ 列举刷新（现 11 个文件） | AI-COMPANY-STATE STALE-保留项 | XS |
| P3-2 | ROADMAP NEXT 补 BIO id 交叉引用；BOARD 考虑开 BIO-011（内容修正批次）/BIO-012（性能 XS 批次） | AI-COMPANY-STATE AMBIGUOUS 2 项 | XS |
| P3-3 | lucide 图标统一 aria-hidden；landmark aria-label；License 外链提示；按钮文案「Focus」→「聚焦」 | ACCESSIBILITY MINOR 1/3/5 | S |
| P3-4 | `shadcn` CLI 移到 devDependencies | DEPENDENCY §2-3 | XS |

## DEFER（记录在案，触发条件出现再做）

| # | 项 | 触发条件 | 依据 |
|---|---|---|---|
| D-1 | ~~picking getAncestors 环防御~~ **已升级为 P2-4（Track O 异议采纳）** | — | INDEPENDENT-REVIEW Q3-4 |
| D-2 | 离线自托管 Google Fonts / Vanatome catalog | 出现离线/受控网络 CI 需求 | BUILD R3/R5 |
| D-3 | lockfile 换官方 registry | 出现海外协作/CI | BUILD R4 |
| D-4 | engines 收紧或 engine-strict | 团队统一 Node 版本时 | BUILD R7 |
| D-5 | 模块切换 keep-mounted | 产品决定优化切换体验 | PERFORMANCE 1.9 |
| D-6 | CameraRig prefers-reduced-motion | a11y 批次排期 | ACCESSIBILITY MINOR 4 |
| D-7 | `nextPhotosynthesisScene` 死导出处置 | BIO-002A 设计时一并裁决 | CODE-LIFECYCLE §五 |
| D-8 | 休眠 ui 组件（57 个）+ 7 个死依赖清理 | CTO/产品决定收缩 UI 库存（两步走） | CODE-LIFECYCLE §四 / DEPENDENCY §2 |

## NEEDS CEO（拍板后进入对应优先级；详见 #001 报告 CED-1~4 与 KNOWLEDGE-GRAPH-AUDIT-v2 CED-5~8）

1. CED-1~3：核心链反向边 3 条 + stomach 自引用 followUp + heart.keyStructures 自绑定。
2. CED-4：chloroplast.keyStructures 重复绑定 thylakoid。
3. CED-5：`human→nervous-system`（**注意：human related 已 5/5 满配**——需同时决策放宽
   related≤5 约束或改用其它入口形态）。
4. CED-6/7：chloroplast→thylakoid 回边、植物 5 孤岛挂接容器。
5. CED-8：followUps 跨域跳转是否为正式设计。
6. S1：光合模块键盘到达类囊体层的替代通道（涉及产品交互流）。
7. D-010/D-011/D-012 决策补录（守护层、MechanismStep 呈现字段、vanatome 锁版——后者即 P1-2）。
8. R9：部署叙事（README 宣称 vs 无 deploy 脚本）——补脚本或降级表述。

## NEEDS BIOLOGY REVIEW

1. `corpus spongiosum of penis` →「阴茎海绵体」疑似错译（应为「尿道海绵体」）——TERMINOLOGY E-2。
2. 部分翻译语料批量复核（臀中/臀中肌 类）——TERMINOLOGY E-3。
3. 肌层/神经血管层词表缺口是否补词（Gluteus/Biceps/Sternocleidomastoid/Vena cava/Aortic valve 等，
   matrix 中标 MISS 的行）——需先确认真实 atlas 元数据 system 字段的实际值再定（FILTER-D 矩阵）。

## WONT FIX CANDIDATE（明确不修，防止未来 Agent 反复发现反复报告）

| 项 | 理由 |
|---|---|
| `normalizeAnatomyName` 的 left/right 恒等替换（死代码行） | 无行为影响；有测试固化基线；删除属无意义 churn |
| tendon/ligament→muscle、Spinalis→neurovascular 分类"污染" | 有意 characterization 的现状基线；修正属医学判断且会改既有显示行为（anatomy-filters D 组） |
| picking 0.16/14/各评分权重 | D-007 行为快照资产；改动=先改测试的有意识决策，非 backlog 项 |
| node 23.x engines 黑洞 | 文档已标注；真实用户路径是 22.13+/24 |
| getRelationReason 双份定义的"重复" | 两份语义不同（合并前/后）；零消费；清理属知识层变更且无收益 |
| RelatedKnowledgeDock 内联 map/filter | N≈25，微不足道（PERFORMANCE 1.8） |

---
*合并自：TRACK A/I/J/L/M/K/F/E/B/C/D/H 的全部 finding；与各审计文档的编号对应关系已内联标注。
生成：Deep Assurance #002。*
