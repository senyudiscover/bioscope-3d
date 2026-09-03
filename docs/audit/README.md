# docs/audit — 审计资产索引

> 本目录是 BioScope 两轮夜班（ZCode Night Shift #001 + Deep Assurance #002）产出的
> 审计资产。**CTO 收敛原则（CEO 批准，2026-09-03）**：
>
> - **ENGINEERING-BACKLOG-PROPOSAL-v1.md 是当前工程审计结果的主要活跃入口**——
>   后续新增/去重/排期都以它为单一事实源。
> - 其余文档**保留作为证据/专题参考**，不要求全部持续同步维护。
> - 标 SNAPSHOT 的文档是历史快照，随代码/数据演进而自然过时，不假装永久最新。

## 分类（A/B/C/D，CTO 验收判定）

| 文件 | 分类 | 维护策略 |
|---|---|---|
| ENGINEERING-BACKLOG-PROPOSAL-v1.md | **A（长期活跃入口）** | 持续维护，唯一 consolidated backlog |
| ARCHITECTURE-MAP-v1.md | **A（长期资产）** | 架构变更时更新 |
| INDEPENDENT-REVIEW-v1.md | B | 修正吸收进 backlog/DECISIONS 后可归档 |
| AI-COMPANY-STATE-AUDIT-v1.md | B | 修正已落地；D-010/011/012 决策后转 C |
| PHOTOSYNTHESIS-ARCHITECTURE-v1.md | B | BIO-002A 落地前有效 |
| CAMERA-PATCH-RISK-v1.md | B | patch 移除前有效 |
| BUILD-DEPLOYMENT-RISK-v1.md | B | deploy 叙事解决前有效 |
| PERFORMANCE-RISK-v1.md | B | P0-2/P0-3 落地前有效 |
| ACCESSIBILITY-AUDIT-v1.md | B | a11y 批次落地前有效 |
| KNOWLEDGE-GRAPH-AUDIT-v2.md | B | CED-1~8 决策前有效 |
| TERMINOLOGY-QA-v1.md | B | E-2/E-3 生物学复核前有效 |
| TEST-COVERAGE-MATRIX-v1.md | **SNAPSHOT（C）** | 数字随测试增长漂移，不持续维护 |
| CODE-LIFECYCLE-INVENTORY-v1.md | **SNAPSHOT（C）** | 死码清单是快照，会过时 |
| DEPENDENCY-RISK-v1.md | **SNAPSHOT（C）** | 版本相关快照 |

## 历史记录（仓库根目录，非本目录）

- `BIOSCOPE-ZCODE-NIGHT-SHIFT-REPORT-2026-09-03.md` — #001 历史记录（C）
- `BIOSCOPE-DEEP-ASSURANCE-REPORT-2026-09-03.md` — #002 历史记录（C）

## 快速入口

- 想按优先级看要做的事 → **ENGINEERING-BACKLOG-PROPOSAL-v1.md**
- 想理解架构 → ARCHITECTURE-MAP-v1.md
- 想看独立对抗视角 → INDEPENDENT-REVIEW-v1.md
- 想核对 .ai-company 是否与代码一致 → AI-COMPANY-STATE-AUDIT-v1.md
