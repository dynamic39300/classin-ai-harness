---
title: ClassIn TeachBuddy 当前状态与下一阶段计划
status: COURSEWARE_V2_M1_COMPLETE_USER_AUTHORIZED
version: v0.22
date: 2026-09-06
---

# 当前状态与下一阶段计划

> D-108 已锁定当前展示品牌：正式名称为 **ClassIn TeachBuddy**，界面简称 **TeachBuddy**，中文描述为 **AI 教学搭档**。下文 `WorkBuddyRun` 等 PascalCase 名称及 `workbuddy` 路径仍表示内部工程兼容标识；阶段验收原始名称仅用于历史追踪。

> **2026-09-05 课件生成 V2 计划**：按 D-116，下一阶段以中国公立小学三年级数学正式课堂为首条内容质量切片。先完成教材与课题范围、固定任务与 V1 基线、Knowledge Pack、Instructional Rules、结构化内容、Courseware Skill 和内容评价闭环；达到可复核的 60-70 分 Gate 后，再进入 PPTAgent / Renderer 表达层 Spike，并依据瓶颈决定是否引入专业 Agent。当前只批准计划，尚未开始功能实现。详细路线见 [课件生成 V2 内容优先实施计划](../06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md)。

> **2026-09-06 课件生成 V2 M0/M1**：M0-A 至 M0-J 已全部关闭，M0 加权进度为 100%，状态为 `COMPLETE_USER_REVIEWED`。M1 已冻结 8 个 Case 与 Rubric v0.1，并使用未改动的真实 Harness V1 完成首轮运行：3/4 生成型 Case 形成 HTML，1/4 在 10 分钟停止；4/4 澄清型 Case 无 Artifact，但没有一项同时满足最少追问、事实准确和不补猜。两个生成产物含阻断数学图形错误，三个均未通过视觉 Gate，四个生成型 Case 的 Agent 试评平均内容分为 43.44。该分数不是教师/教研评价或课堂效果。用户授权 M1 过程 Review 默认确认并在交付后统一复审，M1 当前为 `COMPLETE_USER_AUTHORIZED`，M2 已解锁但尚未启动。事实见 [M0 Readiness Report](../04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md) 与 [M1 V1 Baseline Report](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md)。

## 1. 当前完成事实

> **2026-09-05 我的任务 Mock 清理**：按 D-114，“我的任务”现只展示当前 Profile 的真实 Harness Session。固定课程任务、课程工作流、旧 Run 页面及其专用 UI/测试已删除；旧 URL 只回退真实新建任务，能力动作改为预填真实 Composer。新建/关闭标签仍不删除 Session，技能、AgentIn、文件、工具连接和定时任务不受影响。工程 Gate 为 670 项单元/集成、11 项 Harness 契约、41 项 TeachBuddy 专项及 8 项 Standalone 浏览器测试通过；两 Profile 的 1440/390px 截图已人工检查。全仓 E2E 另有 10 项不经过本次任务路由的既有 Class/Message/Role Switch 断言失败，未在本票扩大修复。详细范围与证据见 [删除旧 Mock Task 产品表面](../04-specs/features/teachbuddy-navigation-migration/REMOVE-LEGACY-MOCK-TASKS.md)，待用户页面验收。NAV-04 的两类历史说明仅保留为阶段记录。

> **2026-09-05 TeachBuddy 导航增量**：按 D-113 完成终局与班级入口六项导航（我的任务、技能市场、AgentIn、我的文件、工具连接、定时任务）。一级 TeachBuddy 只展开/收起；我的任务保留现有真实 Harness 默认工作台。AgentIn 固定目录迁入，工具/定时 Demo 保留；班级来源参数、返回及存储隔离不变。规格、票据和 668 项单元/集成测试、38 项范围浏览器回归结果见 [导航迁移与验收记录](../04-specs/features/teachbuddy-navigation-migration/IMPLEMENTATION.md)。状态为 `IMPLEMENTED_PENDING_USER_REVIEW`；下文 M4.3 四入口是已封存阶段事实，不是当前菜单。

> **2026-09-05 Harness 工作区增量**：本文件主体保留 2026-08-25 的 M4.5 封版事实。分离后的 `classin-ai-harness` 已新增 TeachBuddy 文本运行入口、本机 BFF、固定 DeepSeek Harness Adapter、教学文稿工具和 Session 文件库，并完成真实 DeepSeek 文本、工具、保存、停止、重启恢复及 HTML 文件自动归档验收。最新状态以 [Harness 接入边界](../06-architecture/DEEPSEEK-HARNESS-INTEGRATION.md)、[运行时验收记录](../04-specs/features/teachbuddy-agent-runtime/ACCEPTANCE.md) 和 [Session 文件库 Spec](../04-specs/features/teachbuddy-session-files/FEATURE-SPEC.md) 为准。下面“没有模型 Runtime”只描述原封版基线，不描述新增代码。

| 范围 | 工程状态 | 用户 Review Gate |
| --- | --- | --- |
| ClassIn PC 教师/学生产品基座 | 已迁入根 `src/` 单应用并持续可运行 | 已通过既有阶段验收 |
| M4 课程生产与 M4.1 ConversationRun | Goal → Context → Plan → Artifact → Action → Approval → Receipt → Evaluation 已实现 | M4.1 与阶段收尾已确认通过 |
| Evaluation Module | 单课件、方案包对象和 WorkBuddy IM 每次执行均保留关联完整证据链的模拟 EvaluationEvent；失败/重试历史可恢复 | 随阶段一至四收尾通过技术验收 |
| 能力管理页面 | Skills、Tools、Files、Schedules、Settings 已实现；Content 按 D-051 Dormant | 2026-08-24 用户确认五个可见页面验收完成 |
| TeachBuddy IM | 作业催交、课前准备通知、沉浸消息工作台和显式审批发送已实现 | 2026-08-24 用户确认 v0.19 验收完成 |
| 班级多 Agent 渠道 | 公开结构化 `@Agent`、教师/学生隔离私聊、授权重验、目标撤销与可恢复失败已实现 | 随 IM v0.19 验收通过 |
| M4.2 IM AI 入口地图与 Case 矩阵 | M4.2-01～16 已完成：五个 P0 Case、最终发送话术、真实题号 Context、Agent 私聊发现/历史/响应、共享消息编辑与 WorkBuddy 统一体验均已闭环 | 2026-08-24 用户验收通过 |
| 一级 WorkBuddy 测验活动草稿（纳入 M4.2 扩展交付） | PRD、Spec、Tickets 与纵向闭环已完成：连续生成并审阅试卷、确认后交互填写参数、draft-only 写回、课程详情逐题编辑、独立发布及学生可见性 | 2026-08-24 用户验收通过 |
| M4.3 ClassIn 内嵌 MVP 入口 | D-098～D-101 已实施：Demo 双入口共存，终局/MVP 独立 Product Module、Shell/导航、配置、Route 与 Data Space；MVP 左栏将原新建任务入口改名为“我的任务”，页面流程不变，并保留 Skills/Tools/Files、隐藏 Schedules/Settings；Launch Context、返回链路与跨 Experience 隔离均通过工程 Gate | 2026-08-25 用户完成页面验收，`COMPLETE_USER_ACCEPTED` |
| M4.4 独立教师 ClassIn TeachBuddy Web 产品 | 第三套独立 Product Module 已完成：独立官网、教师个人账号、完整任务/能力工作台、AI 点数预占/结算/释放、模拟会员订单、无 ClassIn Context 执行及 ClassIn 价值转化；不挂载 ClassIn 业务 Provider，不共享终局/MVP 私有数据；内容资源统一采用 TeacherIn 兼容格式，为未来受治理接入内部内容生态保留零格式转换路径 | 2026-08-25 用户完成方案与页面 Review，`COMPLETE_USER_ACCEPTED` |
| M4.5 全局 Demo 体验收口 | IA、UI、交互、引导和 Demo Release Gate；不改变 M4.2～M4.4 已验收的底层功能和业务逻辑 | 2026-08-25 用户确认阶段体验验收完成，`COMPLETE_USER_ACCEPTED` |
| TeachBuddy Session 文件库增量 | `SessionFileLibrary`、本地 `.runtime/files` Adapter、MD/HTML/TXT/JSON、按 Session 分组、安全预览、下载及回到来源对话已实现；生成后自动留存与 Approval/正式发布分离 | 工程 Gate 与真实模型验收通过，`IMPLEMENTED_PENDING_USER_REVIEW` |
| M5–M10 | M5 规格已就绪；后续生产交付路线保留 | `PARKED`，待 M4.5 后独立恢复 |

既有 ClassIn 业务对象仍为固定、脱敏、可重置的 Demo 数据；TeachBuddy 文本 Runtime 与 Session 文件库已接入真实 DeepSeek 和本机持久化，但仍没有真实 ClassIn API、生产授权、跨设备存储或长期记忆。

## 2. 周一阶段一到阶段四收尾

1. 阶段一——实现审计与稳定化：硬性 Standards/Spec 缺口已修复；终局双轴复审均 all-clear；静态、单元/集成、关键 E2E 和范围视觉复验已完成。
2. 阶段二——能力页与 IM v0.19 Review Gate：五个可见能力页面及 IM v0.19 已于 2026-08-24 完成用户验收。
3. 阶段三——事实源与 Evaluation 收口：旧 workspace 决策已标为被 D-023 替代；单课件、方案包和 IM 已接入 EvaluationEvent；完整证据链失败关闭，失败/重试历史不被覆盖，也不把执行成功解释为教学效果。
4. 阶段四——三渠道 Case Library 与下一阶段：Case 已分渠道盘点并给出优先级；后续路线经用户修订为先进入 M4.2–M4.5 Demo 完善阶段，M5–M10 暂停。

## 3. 已封存基线

### 3.1 已完成的技术 Gate

- `npm run check`：TypeScript、ESLint、72 个 Vitest 文件 / 490 项测试全部通过；
- `npm run build`：生产构建通过；保留已知的约 1.23 MB 主 JS chunk 提醒；
- 关键浏览器回归：消息工作台与 M4.1 共 41 项 Chromium E2E 全部通过；
- 能力页与 IM 范围视觉：39 项通过、3 项 Dormant Module 按设计跳过；更新并稳定复跑本轮受影响的 2 张 IM 发送证据快照；
- Standards/Spec 双轴终局复审：均无剩余硬 finding；文本、代码与样式 diff whitespace 校验通过。

全仓旧视觉基线仍有独立维护债务：此前全量结果为 51 通过、3 跳过、90 失败，绝大部分是约 1% 的既有像素漂移；M4.1 视觉套件也在首帧出现约 2% 的既有漂移。未静默批量更新这些与本阶段无关的基线，仅更新并复验了本轮直接受影响的范围快照。

### 3.2 产品 Gate 结论

封存所需产品 Gate 已完成：

- 五个可见能力页面完成用户 Review Gate；Content 继续按 D-051 保持 Dormant；
- WorkBuddy IM 与班级多 Agent 渠道 v0.19 完成用户 Review Gate。

已在 `codex/workbuddy-m3-shell` 分支以提交 `4c43c49` 封存并推送能力页面、IM v0.19、Evaluation 和阶段收尾基线。

## 4. 当前路线：M4.2–M4.5

正式顺序：

1. **M4.2 — IM AI 入口地图与业务 Case 矩阵**：以角色、渠道、入口、AI 身份和 L1/L2/L3 能力层次补齐 Demo 场景表达；
2. **M4.3 — ClassIn 内嵌 MVP 入口与角色引导**：先理顺 ClassIn 内部的 WorkBuddy、班级 Agent、权限、入口和 MVP 能力范围；
3. **M4.4 — 独立 To-Teacher / To-C 产品入口**：再从内部已验证能力抽取外部获客与独立价值闭环；
4. **M4.5 — 全局 IA、UI、交互与 Demo Release Gate**：在结构稳定后统一收口体验和发布质量。

M4.3 先于 M4.4，避免外部产品入口在内部能力和角色体系未稳定时形成第二套模型。完整范围、依赖和 Gate 见 [M4.2–M4.5 Demo 完善路线](../04-specs/features/workbuddy-m4-demo-completion/README.md)。

M5–M10 保持 `PARKED`，已有文档和实现基础不删除；只有在 M4.5 完成后，经用户独立确认才恢复。

M4.2 最终工程证据：`npm run check` 84 个测试文件 / 555 项测试全通过；production build 通过；讲题最终话术、发送前预览、批准后链接、文件库、PA-01/DA-01、Agent 私聊授权目录/隔离历史/两阶段响应与新消息锚点，以及测验生成→试卷审阅→活动参数→草稿写回→课程详情编辑/发布的关键 E2E/a11y 均通过；受影响范围视觉基线通过并经人工复核。用户已于 2026-08-24 完成 M4.2 页面验收并授权版本封存。

M4.3 工程证据：`npm run check` 85 个测试文件 / 561 项测试与 production build 通过；131 项 Chromium E2E 均有绿色证据（最新并发全量 121 项通过，10 项拥塞失败随后逐项单 worker 复跑全部通过）；班级详情 1440×900、MVP WorkBuddy 1440×900/1024×640 及终局 WorkBuddy 精确视觉回归通过。用户已于 2026-08-25 完成页面验收并授权继续进入 M4.4。

M4.4 最终工程证据：PRD、Feature Spec、14 项 Tickets、实现追踪和双轴 Review 已闭环；全量 TypeScript/ESLint、92 个 Vitest 文件 / 585 项测试与 production build 通过；139 项 Chromium E2E/a11y 均有绿色证据（本轮并发全量 138 项通过，唯一既有消息转场时序用例在并发下读到首帧 `0s`，随后单 worker 精确复跑 1/1 通过）；Standalone 官网、注册、独立工作台、手动 Context、任务扣点、刷新恢复、零余额阻断、模拟会员到账、ClassIn 连接价值、账号级 Workspace 隔离、内容/文件资源独立闭环、独立测验保存和未登录 Guard 均有浏览器证据；1440×900 七个产品状态与 1024×640 工作台共 8 张基线稳定复跑通过。用户已于 2026-08-25 完成 M4.4 方案与页面 Review 并确认无问题；M4.4 可封存，M4.5 已具备正式启动条件。

M4.4 的内容生态关系已按 D-107 锁定：Standalone 与 ClassIn 在产品运行、账号和数据层继续隔离，但内容资源从生产起即遵循 TeacherIn 内容契约。未来连接动作只需要建立身份、权限、对象映射与受控写入，不需要再次转换内容格式；当前 Demo 仍不代表真实 TeacherIn API 已接通。项目总结统一引用 [TeacherIn 内容兼容与独立产品边界](../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。
