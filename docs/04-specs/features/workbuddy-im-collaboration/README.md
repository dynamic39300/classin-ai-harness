# WorkBuddy IM 人机协作交付索引

本目录按 `PRD → Feature Spec → Tickets → Implementation → Acceptance` 管理 IM 协作能力，避免产品判断、工程规则和实现结果混写。

本轮 Part 1 的整体推进以[IM Copilot 总里程碑计划](./COPILOT-MILESTONE-PLAN.md)为入口，统一维护阶段顺序、当前进度、交付物和验收条件；Part 2 继续使用其独立规格与记录。

| 阶段 | 唯一交付物 | 回答的问题 | 当前状态 |
| --- | --- | --- | --- |
| Product Requirements | [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) | 为谁解决什么问题、MVP 做什么、怎样算有价值 | `TEACHING_DYNAMICS_V23_LOCKED` |
| Feature / Technical Spec | [FEATURE-SPEC.md](./FEATURE-SPEC.md) | 领域不变量、状态机、Interface、Seam 和验收契约是什么 | `TEACHING_DYNAMICS_V23_IMPLEMENTED` |
| Tickets | [TICKET-BREAKDOWN-PROPOSAL.md](./TICKET-BREAKDOWN-PROPOSAL.md) | 以什么顺序、哪些 Write Set、何时完成 | `IM_031_035_COMPLETED` |
| Traceability | [IMPLEMENTATION-TRACEABILITY.md](./IMPLEMENTATION-TRACEABILITY.md) | 每条需求落在哪个规格、代码和测试证据中 | `TEACHING_DYNAMICS_V21_PASS` |
| Acceptance | [IMPLEMENTATION-REVIEW.md](./IMPLEMENTATION-REVIEW.md) | 实机、自动化、视觉和风险是否通过 | `V18_PENDING_USER_REVIEW` |
| Immersive Interaction | [IMMERSIVE-MESSAGE-WORKSPACE-INTERACTION-DESIGN.md](./IMMERSIVE-MESSAGE-WORKSPACE-INTERACTION-DESIGN.md) | 如何从一级消息入口进入全屏三栏、原位退出并恢复全部状态 | `IMPLEMENTED_PENDING_USER_REVIEW` |
| Multi-Agent Discovery Design | [MULTI-AGENT-DISCOVERY-INTERACTION-DESIGN.md](./MULTI-AGENT-DISCOVERY-INTERACTION-DESIGN.md) | 教师/学生如何在公共群聊和 Agent 单聊入口发现、搜索、选择多个已授权 Agent | `IMPLEMENTED_PENDING_USER_REVIEW` |
| DeepSeek Sidecar Design | [DEEPSEEK-SIDECAR-EXPERIENCE-DESIGN.md](./DEEPSEEK-SIDECAR-EXPERIENCE-DESIGN.md) | IM 右侧入口、TeachBuddy/班级 Agent/AgentIn/TeacherIn 边界，以及如何复用同一 DeepSeek Agent | `IMPLEMENTED` |
| DeepSeek Sidecar Spec | [DEEPSEEK-SIDECAR-FEATURE-SPEC.md](./DEEPSEEK-SIDECAR-FEATURE-SPEC.md) | 同源 Runtime、Thread Session、业务上下文 Interface、消息 Gate 与验收范围 | `IMPLEMENTED_PENDING_AUTOMATED_REGRESSION` |
| DeepSeek Sidecar Tickets | [DEEPSEEK-SIDECAR-TICKET-BREAKDOWN-PROPOSAL.md](./DEEPSEEK-SIDECAR-TICKET-BREAKDOWN-PROPOSAL.md) | 按纵向闭环拆分实施票及阻塞关系 | `01_03_IMPLEMENTED_04_PARTIAL` |
| DeepSeek Sidecar Acceptance | [DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md](./DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md) | 代码、真实 DeepSeek、消息 Gate、构建与剩余自动化 Gate 是否闭环 | `CORE_PATH_PASS_REGRESSION_PENDING` |
| Personalized Services Research | [IM-PERSONALIZED-TEACHING-COMMUNICATION-RESEARCH.md](../../../01-research/IM-PERSONALIZED-TEACHING-COMMUNICATION-RESEARCH.md) | Notion 需求、真实 IM 行级样本、数仓约束和生产 Gate | `COMPLETE_WITH_DW_DERIVED_SAMPLE` |
| Personalized Services Design | [PERSONALIZED-LEARNING-SERVICES-EXPERIENCE-DESIGN.md](./PERSONALIZED-LEARNING-SERVICES-EXPERIENCE-DESIGN.md) | 四项能力在群聊与 1v1 的用户路径、信息架构和交付规则 | `IMPLEMENTED` |
| Personalized Services Spec | [PERSONALIZED-LEARNING-SERVICES-FEATURE-SPEC.md](./PERSONALIZED-LEARNING-SERVICES-FEATURE-SPEC.md) | Learning Context Interface、Artifact、隐私策略、状态与验收 | `IMPLEMENTED_WITH_DW_DERIVED_SAMPLE` |
| Personalized Services Tickets | [PERSONALIZED-LEARNING-SERVICES-TICKET-BREAKDOWN-PROPOSAL.md](./PERSONALIZED-LEARNING-SERVICES-TICKET-BREAKDOWN-PROPOSAL.md) | 六条可演示纵向切片、Write Set、依赖和完成定义 | `01_06_IMPLEMENTED` |
| Personalized Services Acceptance | [PERSONALIZED-LEARNING-SERVICES-IMPLEMENTATION-REVIEW.md](./PERSONALIZED-LEARNING-SERVICES-IMPLEMENTATION-REVIEW.md) | 代码、真实 DeepSeek、DW 派生群/私聊、群转私聊、审批发送和生产数据 Gate | `PASS_WITH_DW_DERIVED_SAMPLE` |
| Copilot Contextual Experience Proposal | [COPILOT-CONTEXTUAL-ENTRY-EXPERIENCE-PROPOSAL.md](./COPILOT-CONTEXTUAL-ENTRY-EXPERIENCE-PROPOSAL.md) | 上午形成的首次发现、情境引导、快捷发起、跨聊天恢复与反馈设计推理 | `RETAINED_MORNING_BASELINE_V1_2` |
| Copilot Scenario Data Plan | [COPILOT-DW-SCENARIO-DATA-PLAN.md](./COPILOT-DW-SCENARIO-DATA-PLAN.md) | 真实底稿采集、独立映射与场景时钟的范围和就绪条件 | `M1_V2_READY_WITH_SOURCE_GAPS` |
| Copilot Source Collection | [IM-COPILOT-DW-SOURCE-COLLECTION-REPORT.md](../../../01-research/IM-COPILOT-DW-SOURCE-COLLECTION-REPORT.md) | 活跃教师选择、真实采集数量、完整性核对、冻结与数据缺口 | `SOURCE_V1_COLLECTED_WITH_GAPS` |
| Copilot Milestone Framework | [COPILOT-MILESTONE-PLAN.md](./COPILOT-MILESTONE-PLAN.md) | 从入口与提醒闭环，到三项能力复用、后续 Agent 体验的里程碑、具体任务、依赖及验收 | `V2_7_M6_USER_REVIEW` |
| Copilot M2 Reset Scope | [COPILOT-M2-DESIGN-BRIEF.md](./COPILOT-M2-DESIGN-BRIEF.md) | 界定下午线框撤回范围，并说明如何使用上午体验提案与数据事实 | `INPUT_BASELINE` |
| Copilot Initial Surface Content Model | [COPILOT-INITIAL-SURFACE-CONTENT-MODEL.md](./COPILOT-INITIAL-SURFACE-CONTENT-MODEL.md) | 初始面应表达的教学信号、可行动机会、教师业务待办、闭环确认、协作工作、能力入口及其状态和计数语义 | `APPROVED_CONTENT_BASELINE` |
| Copilot Initial Surface Layout Options | [COPILOT-INITIAL-SURFACE-LAYOUT-OPTIONS.md](./COPILOT-INITIAL-SURFACE-LAYOUT-OPTIONS.md) | 五种文字版页面承载结构、共同交互语法、案例映射及已选的“方案 E + 业务阶段二级列表” | `DIRECTION_SELECTED` |
| Copilot Initial Surface Detailed Design | [COPILOT-INITIAL-SURFACE-DETAILED-DESIGN.md](./COPILOT-INITIAL-SURFACE-DETAILED-DESIGN.md) | 统一教学动态的展开与紧凑、当前阶段强调行、其他阶段摘要、元素职责、一键对话、业务生命周期、恢复、文案、数据映射和验收 | `IMPLEMENTED_PENDING_USER_REVIEW` |
| Copilot Initial Surface Implementation Review | [COPILOT-INITIAL-SURFACE-IMPLEMENTATION-REVIEW.md](./COPILOT-INITIAL-SURFACE-IMPLEMENTATION-REVIEW.md) | PRD、Spec、Tickets、代码、自动化、视觉自审和生产数据边界是否闭环 | `AUTOMATION_PASS_PENDING_USER_REVIEW` |
| Copilot Initial Surface Pattern Research | [IM-COPILOT-INITIAL-SURFACE-PATTERNS-RESEARCH.md](../../../01-research/IM-COPILOT-INITIAL-SURFACE-PATTERNS-RESEARCH.md) | 情境建议、阶段日程、优先分诊、能力抽屉、单一主动作、任务恢复等外部承载模式的一手证据 | `COMPLETE_WITH_LIMITS` |
| Copilot Scenario Pack | [COPILOT-SCENARIO-PACK.md](./COPILOT-SCENARIO-PACK.md) | 两班多课程、S1–S9、来源、投影及数据契约证据 | `M1_V2_READY` |
| Copilot Class / Course Mapping | [班级与课程结构核验](../../../01-research/IM-COPILOT-CLASS-COURSE-MODEL-RESEARCH.md) | 产品层级与 DW 引用对应、实际取得范围和课程目录缺口 | `VERIFIED_STRUCTURE_WITH_SOURCE_GAPS` |
| IM 2.0 Part 2 Spec | [IM-2-0-BASIC-FEATURE-SPEC.md](./IM-2-0-BASIC-FEATURE-SPEC.md) | 会话分类、沉浸布局、引用回复、Reaction、记录搜索、资源检索和双语翻译的独立范围与契约 | `IMPLEMENTED_V1` |
| IM 2.0 Part 2 Tickets | [IM-2-0-BASIC-TICKET-BREAKDOWN.md](./IM-2-0-BASIC-TICKET-BREAKDOWN.md) | 七项 P0 的纵向切片、阻塞关系与验收条件 | `IM2_01_07_COMPLETED` |
| IM 2.0 Part 2 Acceptance | [IM-2-0-BASIC-IMPLEMENTATION-REVIEW.md](./IM-2-0-BASIC-IMPLEMENTATION-REVIEW.md) | 七项 P0 的代码、自动化、视觉、真值与生产 Adapter Gate 是否闭环 | `PASS_WITH_SIMULATED_ADAPTERS` |
| IM 2.0 Baseline + Increment Coverage | [IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md](./IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md) | 104 项线上基线如何继承，7 项本轮 Feature 如何单列，以及当前缺口如何持续可见 | `ALL_7_STAGES_IMPLEMENTED_SELF_REVIEWED` |
| IM Message Composer + Media Spec | [IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md) | 表情、`@所有人`、截图、图片消息、Viewer 与视频接收卡的首个基线补齐模块 | `IMPLEMENTED_ACCEPTED` |
| IM Message Composer + Media Tickets | [IM-MESSAGE-COMPOSER-AND-MEDIA-TICKET-BREAKDOWN-PROPOSAL.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-TICKET-BREAKDOWN-PROPOSAL.md) | 7 条 tracer-bullet Tickets、阻塞边、Write Set 与本地发布记录 | `IM_MEDIA_01_07_ACCEPTED` |
| IM Message Composer + Media Acceptance | [IM-MESSAGE-COMPOSER-AND-MEDIA-IMPLEMENTATION-REVIEW.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-IMPLEMENTATION-REVIEW.md) | 图片/粘贴、表情、提及、截图、媒体阅读、跨能力兼容和生产 Adapter 边界是否闭环 | `USER_ACCEPTED` |
| IM Announcements + Attention Spec | [IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md) | 班级公告、重要提醒、`@我的`、新消息边界和桌面通知如何形成可靠触达闭环 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Announcements + Attention Tickets | [IM-ANNOUNCEMENTS-AND-ATTENTION-TICKET-BREAKDOWN-PROPOSAL.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-TICKET-BREAKDOWN-PROPOSAL.md) | 5 条纵向票、Write Set、依赖和自审记录 | `IM_ATTN_01_05_SELF_REVIEWED` |
| IM Announcements + Attention Acceptance | [IM-ANNOUNCEMENTS-AND-ATTENTION-IMPLEMENTATION-REVIEW.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-IMPLEMENTATION-REVIEW.md) | 公告/提醒/@我的/阅读边界/通知的实现、自动化、视觉与生产边界 | `SELF_REVIEWED` |
| IM Contacts + Object Discovery Spec | [IM-CONTACTS-AND-OBJECT-DISCOVERY-FEATURE-SPEC.md](./IM-CONTACTS-AND-OBJECT-DISCOVERY-FEATURE-SPEC.md) | 四类关系目录、最小资料、三类对象发现、进入动作和生产目录边界 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Contacts + Object Discovery Tickets | [IM-CONTACTS-AND-OBJECT-DISCOVERY-TICKET-BREAKDOWN-PROPOSAL.md](./IM-CONTACTS-AND-OBJECT-DISCOVERY-TICKET-BREAKDOWN-PROPOSAL.md) | 目录 Domain/Adapter、关系浏览、对象发现、本地关系动作和验证记录 | `IM_DIR_01_05_SELF_REVIEWED` |
| IM Contacts + Object Discovery Acceptance | [IM-CONTACTS-AND-OBJECT-DISCOVERY-IMPLEMENTATION-REVIEW.md](./IM-CONTACTS-AND-OBJECT-DISCOVERY-IMPLEMENTATION-REVIEW.md) | 通讯录功能、自动化、三视口视觉、覆盖变化和 Production Gate | `SELF_REVIEWED` |
| IM Publications + Official Content Spec | [IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-FEATURE-SPEC.md](./IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-FEATURE-SPEC.md) | 公开课状态通知、业务往返、ClassIn 助手官方内容与四类归属 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Publications + Official Content Tickets | [IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-TICKET-BREAKDOWN-PROPOSAL.md](./IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-TICKET-BREAKDOWN-PROPOSAL.md) | Publication Module、公开课链路、官方内容、邀请边界和验证记录 | `IM_PUB_01_05_SELF_REVIEWED` |
| IM Publications + Official Content Acceptance | [IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-IMPLEMENTATION-REVIEW.md](./IM-PUBLICATIONS-AND-OFFICIAL-CONTENT-IMPLEMENTATION-REVIEW.md) | 四类归属、自动化、三视口视觉、覆盖变化和 Production Gate | `SELF_REVIEWED` |
| IM Contact Cards + Temporary Classroom Spec | [IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-FEATURE-SPEC.md](./IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-FEATURE-SPEC.md) | 固定名片发送阅读闭环与临时教室接收状态，创建权限另设 Gate | `IMPLEMENTED_SELF_REVIEWED` |
| IM Contact Cards + Temporary Classroom Tickets | [IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-TICKET-BREAKDOWN-PROPOSAL.md](./IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-TICKET-BREAKDOWN-PROPOSAL.md) | 对象卡 Domain、选人草稿、卡片动作、生命周期和验证记录 | `IM_OBJ_01_05_SELF_REVIEWED` |
| IM Contact Cards + Temporary Classroom Acceptance | [IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-IMPLEMENTATION-REVIEW.md](./IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-IMPLEMENTATION-REVIEW.md) | 名片/教室接收卡的自动化、视觉、覆盖变化和权限边界 | `SELF_REVIEWED` |
| IM Group Files + Profile Spec | [IM-GROUP-FILES-AND-PROFILE-FEATURE-SPEC.md](./IM-GROUP-FILES-AND-PROFILE-FEATURE-SPEC.md) | 按 Thread/Class 隔离的群资源与同屏基本群资料 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Group Files + Profile Tickets | [IM-GROUP-FILES-AND-PROFILE-TICKET-BREAKDOWN-PROPOSAL.md](./IM-GROUP-FILES-AND-PROFILE-TICKET-BREAKDOWN-PROPOSAL.md) | 资源作用域、群文件、群资料、角色/响应式和验证记录 | `IM_GRP_01_05_IMPLEMENTED_SELF_REVIEWED` |
| IM Group Files + Profile Acceptance | [IM-GROUP-FILES-AND-PROFILE-IMPLEMENTATION-REVIEW.md](./IM-GROUP-FILES-AND-PROFILE-IMPLEMENTATION-REVIEW.md) | 群文件/资料的自动化、三视口视觉、覆盖变化和生产 Gate | `SELF_REVIEWED` |
| IM Message Lifecycle + Governance Spec | [IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-FEATURE-SPEC.md](./IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-FEATURE-SPEC.md) | 稳定提交、回执、幂等恢复、Cursor 历史和会话访问状态 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Message Lifecycle + Governance Tickets | [IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-TICKET-BREAKDOWN-PROPOSAL.md](./IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-TICKET-BREAKDOWN-PROPOSAL.md) | Delivery/Access/History Domain、Memory Adapter、Provider、UI、事件和验证 | `IM_LIFE_01_06_IMPLEMENTED_SELF_REVIEWED` |
| IM Message Lifecycle + Governance Acceptance | [IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-IMPLEMENTATION-REVIEW.md](./IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-IMPLEMENTATION-REVIEW.md) | 生命周期状态、恢复、只读保留、自动化、视觉、覆盖变化和 Production Gate | `SELF_REVIEWED` |

## 变更流程

1. 产品意图或范围变化先更新 PRD，并为需求分配稳定 ID。
2. 领域行为、权限、状态或 Interface 变化更新 Feature Spec，并引用对应需求 ID。
3. Tickets 只拆解已经进入本阶段范围的需求；每张 Ticket 明确 Write Set、依赖和 Definition of Done。
4. Implementation 只实现已进入 Ticket 的内容；临时发现不得静默扩大范围。
5. 自动化与实机证据写回 Traceability；未通过项保留为风险或后续 Ticket。
6. 场景二、三的渠道骨架已经进入 PRD/Spec/Ticket/验收；完整业务 Case Library 仍需另行立项，不能由当前确定性示例推导为已完成。

## 真值说明

当前教师 IM Sidecar 使用真实 DeepSeek Runtime，并同时提供固定、脱敏场景与一次 DW Hunter 行级查询派生的去标识冻结投影；消息写回仍是可重置 Mock Adapter。产品 Surface 可以验证真实模型和真实数据模式驱动的纵向链路，但不宣称已接入在线 ClassIn 作业/IM API、生产身份权限或正式消息写回。

IM Copilot 下午产出的两轮 M2 线框、独立 DEV query、由线框派生的详细交互说明和验收记录已按用户决定清除。上午的[情境引导体验提案 v1.2](./COPILOT-CONTEXTUAL-ENTRY-EXPERIENCE-PROPOSAL.md)与[数据准备方案 v1.8](./COPILOT-DW-SCENARIO-DATA-PLAN.md)保留。M0/M1 的 DW 底稿、去标识场景和研究仍是设计输入，但有源数据缺口，不能被解释为开发数据 Gate 已满足。M2 的内容全集与状态语义已经用户确认，承载方向已选择“方案 E + 可展开与紧凑的统一教学动态”：`课前 / 课中 / 课后 / 总结`组成一个模块，首次进入且尚未沟通时默认展开，当前阶段内强调最重要事项，其他阶段显示一行摘要和`另外 N 项`；进入对话后可收成一行并原位恢复展开。展开或紧凑不改变事项、业务或 AI 状态；紧凑时业务更新只刷新摘要和必要提示，不强制展开。全勤、全部提交等闭环确认只在数据完整、及时且范围明确时成立；所有 AI 补问、生成、修改、审阅、发送与回执留在原对话中。两个 IM 入口都以已选中的默认聊天为范围。修订后的详细设计已进入用户评审；前端页面、样式、真实交互和可点击验收留到数据 Gate 满足后的开发阶段。
