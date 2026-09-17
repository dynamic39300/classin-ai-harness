# WorkBuddy IM 人机协作交付索引

本目录按 `PRD → Feature Spec → Tickets → Implementation → Acceptance` 管理 IM 协作能力，避免产品判断、工程规则和实现结果混写。

本轮 Part 1 的整体推进以[IM Copilot 总里程碑计划](./COPILOT-MILESTONE-PLAN.md)为入口，统一维护阶段顺序、当前进度、交付物和验收条件；Part 2 继续使用其独立规格与记录。

2026-09-16，V2 默认 IM 按 D-157 恢复的模拟基线及源项目最新代码对齐已完成用户验收；后续开发继续在当前 V2 仓库推进，当前主线是真实 API 映射审阅。对齐材料为[盘点](./IM-COPILOT-SOURCE-PARITY-AUDIT-2026-09-15.md)、[PRD](./IM-COPILOT-SOURCE-PARITY-PRD.md)、[Feature Spec](./IM-COPILOT-SOURCE-PARITY-FEATURE-SPEC.md)、[Tickets](./IM-COPILOT-SOURCE-PARITY-TICKETS.md)和[实施验收](./IM-COPILOT-SOURCE-PARITY-IMPLEMENTATION-REVIEW-2026-09-15.md)。

2026-09-15 内容范围已审阅确认：[通用提问内容与交互设计清单 v0.6](./COPILOT-GENERAL-QUESTION-GUIDANCE-CONTENT-DRAFT.md)。原五组25条中18条保留或收窄、6条退出首批、1条待核查；聚焦业务事实查询、已有内容整理、报告与消息转写。教师笔记仅作可用辅助，学生错因诊断、进步评价与个性化指导暂不纳入。已保存[原始批注快照](./COPILOT-GENERAL-QUESTION-GUIDANCE-USER-REVIEW-v0.2.md)；业务确认、既有探查证据和实际接口/回答验证分别记录。首次轻量开场方向已确认，具体入口样式及接入仍待细化，尚未修改现有UI。

2026-09-15 通用提问进入实施：[详细交互设计](./COPILOT-GENERAL-QUESTION-GUIDANCE-DETAILED-DESIGN.md)与[21条回答及连续对话样例](./COPILOT-GENERAL-QUESTION-ANSWER-EXAMPLES.md)。首次开场最多3个问题；输入框上方常驻“可以问什么”，展开后以紧凑分类架单次展示一组问题，避免六组连续列表形成大面板。已有文字/图片、生成中、消息编辑及历史隐藏均沿用既定保护行为；两个班级IM入口复用同一Surface。

2026-09-15 新增范围已确认：对群聊的内容提问 F1总结最近群聊、F2根据群消息定位题目并生成解析、F3针对群提问起草回复；当前为六组21条。已同步到上述详细设计第6.4节和回答样例F1–F3。老师主动发问时读取最新可用消息，不包含持续监听或自动回复；新三条尚未纳入旧18条数据核查，引用交互及生成正确性待验证。

2026-09-15 已完成[18 条问题的接口与真实 DW 数据逐条核查](../../../01-research/COPILOT-18-QUESTIONS-VERIFICATION-MATRIX-2026-09-15.md)：测试 API 共209次只读业务成功，班内两门课程、54项活动详情与名单及14份PDF正文已读取；另有独立业务数仓样本。逐条记录具体接口、表字段、实际返回、可答范围和缺口。课堂逐字稿、真实逐题判分样本、周报窗口及统计冲突仍待补齐；尚未进行产品接入和模型回答验收。

需要确定“有什么业务数据、字段是什么意思、如何关联、能够支撑哪些问题”时，阅读[ClassIn教学数据地图](../../../01-research/CLASSIN-TEACHING-DATA-MAP-2026-09-15.md)，再按领域进入三个字段分册。该研究核验78个表/视图的结构，区分元数据、实际内容覆盖与产品已接入能力；它不替代既有用户行为深度统计或正式接口合同。

教学活动的细节进一步整理为[教学活动业务下钻](../../../01-research/CLASSIN-TEACHING-ACTIVITY-BUSINESS-DEEP-DIVE-2026-09-15.md)：覆盖 15 类活动的参数、老师操作、学生参与和反馈，并补充时间、对象、内容、评分与版本规则；复杂评测另见[作业、测验与答题卡规则分册](../../../01-research/CLASSIN-TEACHING-ACTIVITY-ASSESSMENT-RULES-2026-09-15.md)。文中操作流程是基于字段的业务推演，尚不作为已验收的产品操作合同。

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
| Class-scoped Conversation Rail Proposal | [CLASS-SCOPED-CONVERSATION-RAIL-DESIGN-PROPOSAL.md](./CLASS-SCOPED-CONVERSATION-RAIL-DESIGN-PROPOSAL.md) | 班级详情 IM 中整班群聊、成员搜索、1v1 切换与 TeachBuddy 上下文跟随的虚线版框和评审项；因班级成员与好友关系边界待确认而暂停 | `ON_HOLD_PENDING_RELATIONSHIP_RULE` |
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
| Copilot Initial Surface Detailed Design | [COPILOT-INITIAL-SURFACE-DETAILED-DESIGN.md](./COPILOT-INITIAL-SURFACE-DETAILED-DESIGN.md) | 统一教学动态的展开与紧凑、当前阶段强调行、其他阶段摘要、元素职责、一键对话、业务生命周期、恢复、文案、数据映射和验收 | `USER_ACCEPTED_VIA_FINAL_PARITY_REVIEW` |
| Copilot Initial Surface Implementation Review | [COPILOT-INITIAL-SURFACE-IMPLEMENTATION-REVIEW.md](./COPILOT-INITIAL-SURFACE-IMPLEMENTATION-REVIEW.md) | PRD、Spec、Tickets、代码、自动化、视觉自审和生产数据边界是否闭环 | `USER_ACCEPTED_VIA_FINAL_PARITY_REVIEW` |
| Copilot Conversation Run UX | [PRD](./COPILOT-CONVERSATION-RUN-UX-PRD.md) · [Feature Spec](./COPILOT-CONVERSATION-RUN-UX-FEATURE-SPEC.md) · [Tickets](./COPILOT-CONVERSATION-RUN-UX-TICKET-BREAKDOWN.md) · [Implementation Review](./COPILOT-CONVERSATION-RUN-UX-IMPLEMENTATION-REVIEW.md) | 如何把多张运行卡收敛为教师消息、单行业务进展、按需处理过程、结果和原位审阅 | `USER_ACCEPTED_VIA_FINAL_PARITY_REVIEW` |
| Copilot Initial Surface Pattern Research | [IM-COPILOT-INITIAL-SURFACE-PATTERNS-RESEARCH.md](../../../01-research/IM-COPILOT-INITIAL-SURFACE-PATTERNS-RESEARCH.md) | 情境建议、阶段日程、优先分诊、能力抽屉、单一主动作、任务恢复等外部承载模式的一手证据 | `COMPLETE_WITH_LIMITS` |
| Copilot Scenario Pack | [COPILOT-SCENARIO-PACK.md](./COPILOT-SCENARIO-PACK.md) | 两班多课程、S1–S9、来源、投影及数据契约证据 | `M1_V2_READY` |
| Copilot Class / Course Mapping | [班级与课程结构核验](../../../01-research/IM-COPILOT-CLASS-COURSE-MODEL-RESEARCH.md) | 产品层级与 DW 引用对应、实际取得范围和课程目录缺口 | `VERIFIED_STRUCTURE_WITH_SOURCE_GAPS` |
| IM 2.0 Part 2 Spec | [IM-2-0-BASIC-FEATURE-SPEC.md](./IM-2-0-BASIC-FEATURE-SPEC.md) | 会话分类、沉浸布局、引用回复、Reaction、记录搜索、资源检索和双语翻译的独立范围与契约 | `IMPLEMENTED_V1` |
| IM Reaction Interaction | [Proposal](./IM-MESSAGE-REACTION-INTERACTION-DESIGN-PROPOSAL.md) · [Feature Spec](./IM-MESSAGE-REACTION-INTERACTION-FEATURE-SPEC.md) · [Tickets](./IM-MESSAGE-REACTION-INTERACTION-TICKET-BREAKDOWN.md) · [Implementation Review](./IM-MESSAGE-REACTION-INTERACTION-IMPLEMENTATION-REVIEW.md) | 单条消息三个快捷 Reaction、复用现有表情网格的简洁面板、常驻计数胶囊及触屏/键盘行为 | `IMPLEMENTED_SELF_REVIEWED` |
| IM 2.0 Part 2 Tickets | [IM-2-0-BASIC-TICKET-BREAKDOWN.md](./IM-2-0-BASIC-TICKET-BREAKDOWN.md) | 七项 P0 的纵向切片、阻塞关系与验收条件 | `IM2_01_07_COMPLETED` |
| IM 2.0 Part 2 Acceptance | [IM-2-0-BASIC-IMPLEMENTATION-REVIEW.md](./IM-2-0-BASIC-IMPLEMENTATION-REVIEW.md) | 七项 P0 的代码、自动化、视觉、真值与生产 Adapter Gate 是否闭环 | `PASS_WITH_SIMULATED_ADAPTERS` |
| IM 2.0 Baseline + Increment Coverage | [IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md](./IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md) | 104 项线上基线如何继承，7 项本轮 Feature 如何单列，以及当前缺口如何持续可见 | `ALL_7_STAGES_IMPLEMENTED_SELF_REVIEWED` |
| IM Message Composer + Media Spec | [IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md) | 表情、`@所有人`、截图、图片消息、Viewer 与视频接收卡的首个基线补齐模块 | `IMPLEMENTED_ACCEPTED` |
| IM Message Composer + Media Tickets | [IM-MESSAGE-COMPOSER-AND-MEDIA-TICKET-BREAKDOWN-PROPOSAL.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-TICKET-BREAKDOWN-PROPOSAL.md) | 7 条 tracer-bullet Tickets、阻塞边、Write Set 与本地发布记录 | `IM_MEDIA_01_07_ACCEPTED` |
| IM Message Composer + Media Acceptance | [IM-MESSAGE-COMPOSER-AND-MEDIA-IMPLEMENTATION-REVIEW.md](./IM-MESSAGE-COMPOSER-AND-MEDIA-IMPLEMENTATION-REVIEW.md) | 图片/粘贴、表情、提及、截图、媒体阅读、跨能力兼容和生产 Adapter 边界是否闭环 | `USER_ACCEPTED` |
| IM Announcements + Attention Spec | [IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md) | 班级公告、重要提醒、`@我的`、新消息边界和桌面通知如何形成可靠触达闭环 | `IMPLEMENTED_SELF_REVIEWED` |
| IM Announcements + Attention Tickets | [IM-ANNOUNCEMENTS-AND-ATTENTION-TICKET-BREAKDOWN-PROPOSAL.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-TICKET-BREAKDOWN-PROPOSAL.md) | 5 条纵向票、Write Set、依赖和自审记录 | `IM_ATTN_01_05_SELF_REVIEWED` |
| IM Announcements + Attention Acceptance | [IM-ANNOUNCEMENTS-AND-ATTENTION-IMPLEMENTATION-REVIEW.md](./IM-ANNOUNCEMENTS-AND-ATTENTION-IMPLEMENTATION-REVIEW.md) | 公告/提醒/@我的/阅读边界/通知的实现、自动化、视觉与生产边界 | `SELF_REVIEWED` |
| IM Single-message Pin Removal | [IM-SINGLE-MESSAGE-PIN-REMOVAL-IMPLEMENTATION-REVIEW.md](./IM-SINGLE-MESSAGE-PIN-REMOVAL-IMPLEMENTATION-REVIEW.md) | 普通消息置顶在 Domain、Store、UI、Mock、测试与文档中的完整移除审计 | `IMPLEMENTED_SELF_REVIEWED` |
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

2026-09-15 用户确认六组21条通用提问整体设计，F组名称为“对群聊的内容提问”。已进入[PRD / Tech Spec / Tickets 与实施验收](./COPILOT-GENERAL-QUESTION-GUIDANCE-IMPLEMENTATION.md)：共享首次引导、原位帮助、草稿保护、最新本地群消息和引用已落地；真实业务API与未具备正文/完整记录的问题保持独立接入项。
