---
title: IM Copilot 初始面内容承载模式一手研究
status: COMPLETE_WITH_LIMITS
date: 2026-09-09
scope: Copilot 初始面内容承载模式研究；不选择最终页面
---

# IM Copilot 初始面内容承载模式一手研究

## 1. 研究问题与边界

本研究回答：当老师进入一个聊天窗口时，Copilot 初始面还能用哪些不依赖“主卡 + 副卡”的内容承载方式，让老师立即知道：

1. 此刻可以快速做什么；
2. 当前需要关注与已经闭环的教学事项分别在哪里；
3. 如何用一次点击进入 AI 对话，让后续补问、生成、修改和结果自然留在聊天中，同时保留正式交付前的教师控制。

研究范围覆盖情境建议、日程/时间轴、优先收件箱与分诊、命令面板/能力抽屉、会话内主动作、贴近业务对象的主动助手、任务进度与恢复、返回后的 Catch-up 卡栈。来源只采用产品官方帮助文档、官方开发文档和官方发布记录；网页于 2026-09-09 核验。未使用媒体转述作为交互事实，也未登录各产品进行实机对照测试。

本文清楚区分三层内容：

- **官方事实**：来源公开说明的产品行为；
- **对 ClassIn 的推导**：基于外部行为形成的设计探索，不代表外部产品能力或当前实现；
- **风险与证据边界**：资料没有证明的效果、内部机制或适用条件。

项目内的锁定输入仍以 [D-129、D-131、D-132、D-133、D-135 与 D-137](../00-project/DECISION-LEDGER.md) 为准：快捷动作一次点击提交给 AI；提醒绑定教师、班级、班级内课程及具体课次/作业；自然语言是核心协作方式；全勤、全部完成等闭环确认需要明确表达；顶部机会卡不承担 AI 运行状态；下午线框已撤回，主卡、副卡等具体视觉形式没有锁定。上午的[情境引导体验提案 v1.2](../04-specs/features/workbuddy-im-collaboration/COPILOT-CONTEXTUAL-ENTRY-EXPERIENCE-PROPOSAL.md)继续作为上游产品背景，[M2 重启设计输入基线](../04-specs/features/workbuddy-im-collaboration/COPILOT-M2-DESIGN-BRIEF.md)界定重做边界。本文只扩充可供比较的承载模式，不选择最终布局，也不把外部行为写成 ClassIn 已实现事实。

本次 Write Set 仅为本文，不修改决策、Spec、原型或应用代码。

## 2. 一手来源概览

| ID | 官方来源 | 可核验行为 | 使用边界 |
| --- | --- | --- | --- |
| MS-AGENT-UX | [Microsoft 365 Copilot：Custom engine agent UX](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/ux-custom-engine-agent) | Prompt starters；按对话上下文、用户画像和组织偏好生成的 suggested prompts；流式响应；引用、AI 标识和反馈控件；异步任务、状态跟进和完成通知 | 是微软面向 Agent 开发者的交互规范，不证明其建议排序适合教学现场，也不证明所有能力已在当前 ClassIn Runtime 中存在 |
| MS-ORG-PROMPTS | [Microsoft Copilot：Organizational prompts](https://learn.microsoft.com/en-us/microsoft-365/copilot/organizational-prompts) | 首页 Suggested 入口、最多四条置顶 prompt、可搜索/筛选的 Prompt Lab、输入框 autosuggest；选中后先进入输入框而不自动提交 | 证明渐进发现和能力目录，不证明一次点击直接执行任务 |
| MS-TEAMS | [Microsoft Teams：Copilot in chats and channels](https://support.microsoft.com/en-us/teams/copilot/how-to-use-microsoft-365-copilot-in-teams-chats-and-channels) | Copilot 绑定当前聊天/频道；输入框下提供少量建议与更多入口；来源可定位回原消息 | 证明当前会话锚定和来源回看，不证明跨班级教学事项排序 |
| MS-FACILITATOR | [Microsoft Teams：Facilitator in meetings](https://support.microsoft.com/en-us/teams/copilot/facilitator-in-microsoft-teams-meetings) | 将带时间分配的议程放到会议舞台；勾选表示议题已开始讨论；自动捕捉的后续任务需 `Accept to sync` 才同步 Planner；会后可在 Recap 审阅和编辑 AI 笔记 | 勾选不表示议题完成；部分任务能力仍处于 Public Preview；用户直接要求创建的任务会自动同步，不能概括为所有路径都有同一确认 Gate |
| NOTION-HOME | [Notion：Navigate with the sidebar](https://www.notion.com/help/navigate-with-the-sidebar) | Home 按 Upcoming events、Recents、Agents 等区段组织；My Tasks 持续可达；区段可显示、隐藏和调整顺序 | 证明分区式个人首页，不证明这些区段由 AI 自动排优先级 |
| NOTION-CALENDAR | [Notion Calendar settings](https://www.notion.com/help/notion-calendar-settings) | 紧凑入口展示即将到来的事件，并支持加入会议、联系参与者等快速操作 | 是日历场景，不等同于复杂教学任务执行 |
| NOTION-AGENT | [Notion：Get started with Notion Agent](https://www.notion.com/help/notion-agent) | 根据当前页面提供动作；默认使用当前页面上下文；固定会话和搜索历史；部分外部写动作（如发送邮件）会在执行前要求确认 | 确认机制只适用于官方明确列出的动作，不能外推为所有 Notion Agent 写动作都需确认 |
| LINEAR-INBOX | [Linear Inbox](https://linear.app/docs/inbox) | Priority 与 Other 分层；通知可筛选、稍后处理、标记已读，并可从列表进入对象 | 优先规则和软件研发对象不能直接复制为教学口径 |
| LINEAR-TRIAGE | [Linear Triage](https://linear.app/docs/triage) | 进入队列的事项先审阅、更新和排优先级；可接受、拒绝、标重或 snooze | 适合例外处置，不适合承载全部常规能力 |
| LINEAR-AI | [Linear Triage Intelligence](https://linear.app/docs/triage-intelligence) | AI 主动建议属性和关系；用户可查看原因、接受、忽略或跳转检查；也可从命令菜单按需运行建议 | 官方说明高质量分析可能需要 1–4 分钟，不能假设实时建议总能立即返回 |
| SLACK-WORKFLOW | [Slack：Workflows tab in channels and DMs](https://slack.com/help/articles/32393999092883-Manage-the-Workflows-tab-in-channels-and-DMs) | 常用 workflow 可固定在具体会话；Featured workflow 可把消息区主位变成一个启动按钮，并保留切回普通发消息 | 证明单一强动作的一键发起，不证明 AI 生成后的审批和写回状态 |
| SLACK-AGENTS | [Slack：Work with AI agents](https://slack.com/help/articles/33076000248851-Work-with-AI-agents-in-Slack) | Agents & tools 集中发现可用 Agent、恢复会话和查看多人 AI 会话状态 | ClassIn 已锁定统一主 Agent，不能照搬多 Agent 选择器作为教师首页 |
| SLACK-CONTEXT | [Slack updates and changes](https://slack.com/help/articles/115004846068-Slack-updates-and-changes) | 2026 年官方更新说明 Slackbot 在用户正查看 channel、canvas 或 record 时使用当前对象上下文；Activity 集中重要通知与动作 | 更新记录描述公开行为，不提供建议命中率和控频数据 |
| SLACK-CATCHUP | [Slack：View all unread messages](https://slack.com/help/articles/226410907-View-all-your-unread-messages) | Catch up 用总数和逐条预览处理未读内容；支持已读、跳过、稍后动作和撤销 | 移动端逐条卡栈不宜直接等同于 PC 教师主界面 |
| GITHUB-SESSIONS | [GitHub：Managing agent sessions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents) | 全局面板列出 Session；可看实时进度、日志、时长，追加指令、停止、归档，并从 Chat 延续任务 | 工程日志、Token 和代码环境信息不适合直接呈现给老师 |
| GITHUB-MISSION | [GitHub Copilot mission control，2025-10-28](https://github.blog/changelog/2025-10-28-a-mission-control-to-assign-steer-and-track-copilot-coding-agent-tasks/) | 集中视图显示任务状态，任务需要输入时可跳入处理，并提供关联结果的快捷入口 | 证明状态与恢复模式，不证明教师任务需要相同的信息密度 |
| GITHUB-OUTPUT | [GitHub：Get started with Copilot agents on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/overview) | 编码任务完成后生成 Pull Request 并把发起人加入 Reviewer；用户检查输出后再要求修改、批准或合并 | Pull Request 是软件研发领域的交付容器，只证明“可审阅结果 + 人工交付 Gate”，不能直接移植其术语或工程流程 |
| ANT-WAIC | [蚂蚁集团 WAIC 2025 官方发布](https://www.antgroup.com/news-media/press-releases/1753516800000) | 官方确认“蚂小财”在蚂蚁财富 App 内提供“哪里不会按哪里”的交互、AI 健康管家可一键进入深度问询、AI 出行助手可用一句话定制行程 | 只证明能力与直达服务，未公开初始面布局、排序、任务状态和恢复机制 |

## 3. 八种内容承载模式

### 3.1 情境建议条：输入框附近的动态下一步

**官方事实。** Microsoft 将 suggested prompts 定义为根据对话上下文、用户画像和组织偏好给出的 next best actions，并允许它们出现在 Agent 回复中。Teams 在当前聊天或频道的 Copilot 输入框下展示少量建议，并用“更多”承接其他 prompts；生成结果可以通过来源链接定位回原聊天消息。[MS-AGENT-UX][MS-TEAMS]

**对 ClassIn 的推导。** 初始面可以不放完整卡片网格，而在输入框上方保留一行 2–4 个短动作。它们随当前班级、班级内课程和教学阶段变化，例如 `同步 3 门课计划`、`提醒进课堂`、`准备课后回顾`。建议点击后按 D-129 直接提交一条可读的自然语言要求；“更多教学协作”再展开其他能力。

**适用条件。** 当前聊天、课程和事项已经唯一匹配；教师能从短文案理解动作对象和结果；建议数量少且变化有业务依据。

**风险与边界。** 建议持续重排会破坏位置记忆，也可能把低置信推荐伪装成确定待办。每个动态动作至少要带班级/课程或时间锚点；需要教师处理的硬状态不能只藏在会变化的建议条里。微软资料没有给出教学提醒阈值，也没有证明动态建议优于固定入口。

### 3.2 日程 / 阶段时间轴：按教学进程组织紧凑行

**官方事实。** Notion Home 把 Upcoming events、Recents、Agents 等组织成区段，并保持 My Tasks 可达；区段可以调整显示数量和顺序。Notion Calendar 的紧凑入口既展示即将到来的事件，也提供加入会议等直接动作。[NOTION-HOME][NOTION-CALENDAR]

**对 ClassIn 的推导。** 可将老师的一天按 `现在`、`今天稍后`、`课后待处理`、`周期总结`组织；也可用 `课前`、`课中`、`课后`、`总结`作为阶段标签。每行只显示班级/课程、具体课次或作业、时间、状态和一个动作，详细内容在发起后进入对话，而不是让每个事项占据一张大卡。

**适用条件。** 大多数候选事项确实能映射到时间或教学阶段；跨班级数据的时间口径可靠；当前阶段能自动定位但仍允许查看前后阶段。

**风险与边界。** 单纯按时间排序会埋掉另一门课的逾期或高风险事项；阶段名称也不能替代具体业务状态。若采用该模式，仍需独立表达跨阶段异常和任务状态。Notion 的官方资料没有证明其 Home 区段由 AI 自动确定优先级。

### 3.3 优先收件箱 / 分诊队列：只呈现需要老师判断的例外

**官方事实。** Linear Inbox 将需注意通知与普通更新分开，支持筛选、snooze 和直接进入工作对象。Linear Triage 把外来事项置于正式流程之前，可接受、拒绝、标记重复或暂缓。Triage Intelligence 会主动建议属性和关联，用户可以查看原因后接受、忽略或跳转核对。[LINEAR-INBOX][LINEAR-TRIAGE][LINEAR-AI]

**对 ClassIn 的推导。** 初始面可以突出 `需你处理`，只收录需要老师判断或行动的业务例外，例如课中尚未进入、临近截止仍未提交和教师待批改。AI 生成内容待确认、发送部分失败等留在对应对话或产物，不进入这组顶部事项。全勤、学生全部提交等有证据的闭环确认仍应在低打扰区域明确保留，让老师知道系统已核对且当前无需处理；可选回顾等内容进入 `其他进展`，避免把所有能力都包装成待办。

**适用条件。** “需要处理”的业务口径能够解释；每项有明确下一步；老师可以暂缓、忽略或查看来源；被暂缓事项有可靠的重新出现条件。

**风险与边界。** 错误优先级会造成真正事项漏办，过多提醒会把教学助手变成告警台。界面应显示总数、筛选范围和“查看全部”，AI 不应静默隐藏低置信项。Linear 面向研发工作流，其 accept/decline 语义不能直接复制为教师文案。

### 3.4 能力抽屉 / 命令面板：完整能力按需搜索和筛选

**官方事实。** Microsoft Copilot 首页只用 Suggested 入口展示少量置顶 prompts；完整 Prompt Lab 支持关键词、任务类型和部门筛选，输入时还会出现 autosuggest。选中 prompt 后先进入输入框，允许修改，并不会直接提交。Slack 的 Agents & tools 则集中能力发现、历史会话和状态恢复。[MS-ORG-PROMPTS][SLACK-AGENTS]

**对 ClassIn 的推导。** 全面能力清单可放入 `更多可做` 或命令面板，按 `备课`、`上课`、`作业`、`讲评`、`总结`搜索/筛选。初始面只展示当前事项和少量常用动作；老师也可直接输入自己的要求，输入过程中匹配能力建议。能力目录不承担 AI 对话状态。

**适用条件。** 能力名称使用教师任务语言；搜索能识别课程、作业和动作词；抽屉只承担能力发现。

**风险与边界。** 若按 Agent、Skill、MCP 等内部结构分类，会违反统一主 Agent 产品不变量；层级过深也会让老师先学工具再做事。Microsoft 的选中后预填行为与 D-129 的“一次点击直接提交”不同，只能借鉴其渐进发现和检索结构，不能照抄提交语义。

### 3.5 会话内单一主动作：Feature 一个当前 workflow

**官方事实。** Slack 允许把常用 workflow 固定在具体 channel 或 DM。Featured workflow 会把消息输入区主位变成一个启动按钮，用户点击即可开始，也可切回普通发送消息。[SLACK-WORKFLOW]

**对 ClassIn 的推导。** 当当前教学现场只有一个高置信、强时效动作时，可以让它成为输入框旁或输入框上方的单一主动作，例如 `为 3 位尚未进入的同学生成提醒`。点击后立即把可读要求提交进 TeachBuddy 对话；自由输入始终保留清晰入口，按钮本身不变成任务状态。

**适用条件。** 主动作确实唯一且对象完整；发起本身可逆；按钮文字包含动作和对象；当前场景变化后能及时撤下或更新。

**风险与边界。** 过强的按钮会遮蔽老师自主提问，错误识别时还可能诱导误操作。它只适合高置信场景，不能成为每个班级永久占据输入区的广告位。Slack 资料只证明 workflow 启动，不包含本项目的 Artifact 审阅、对象复核和消息写回 Gate。

### 3.6 贴近业务对象的 Inline Proactive Assistant

**官方事实。** Teams Copilot 明确工作在当前 chat/channel 旁，来源可以跳回具体原消息。Slack 官方更新说明，用户在查看 channel、canvas 或 Salesforce record 时打开 Slackbot，它会使用当前对象作为上下文。Microsoft 的 Agent UX 文档还支持异步任务完成后的跟进消息，以及由预设触发器发起的提醒和告警。[MS-TEAMS][SLACK-CONTEXT][MS-AGENT-UX]

**对 ClassIn 的推导。** 主动建议应贴在它所属的聊天、课程、课次、作业或消息旁，而不是汇入一个失去来源的通用推荐流。Sidecar 顶部持续表达 `仅你可见 · 当前班级 · 当前课程`；系统发现有意义变化时，可以在同一私有协作区增加一条安静的新事项，并显示触发对象和下一步。

**适用条件。** 上下文边界可靠；触发器来自可核验的 ClassIn 事实；同一事项去重；老师能够忽略、暂缓或关闭同类提示；主动消息不会覆盖正在编辑的内容。

**风险与边界。** 最大风险是跨班级上下文串用、通知疲劳和把 AI 推断写成学生事实。主动消息必须带稳定对象引用，不能因为打开了另一个聊天就改变旧任务的发送对象。官方资料没有给出教师场景的控频阈值，也不能证明所有异步能力已经存在于当前 Runtime。

### 3.7 任务状态带 / Progress & Resume

**官方事实。** GitHub 的 agents panel 从任意页面集中列出 Session，进入后可以看实时进度、时长和日志，并追加指令、停止或归档。2025 年 mission control 更新强调在一个任务视图里快速查看状态，并在任务需要用户输入时跳入处理；从 Copilot Chat 发起的 Session 也会把运行状态反映回聊天。Slack 的 Agents & tools 同样支持恢复会话和查看会话状态。[GITHUB-SESSIONS][GITHUB-MISSION][SLACK-AGENTS]

**对 ClassIn 的推导。** 这一模式只证明真正的长时异步工作需要可返回和可审阅，不代表 TeachBuddy 初始面需要独立状态带。当前范围采用更轻的方式：`生成中`、`需要补充`、`待确认`、`部分成功`和`失败可重试`贴着原 AI 消息、产物或回执表达；老师回到来源聊天和原对话继续，不单独计算“已开始任务数”。

**适用条件。** 任务具有稳定身份；页面切换或刷新后能够真实恢复；状态来自 Runtime 事件而非假进度；任务需要老师时有明确动作。

**风险与边界。** 工具调用、Token、模型日志会增加教师认知负担，状态带应使用教学结果语言。若 Runtime 离开页面后不会继续运行，就不能显示“后台处理中”；若任务无法恢复，也不能提供空的继续入口。GitHub 的工程审计密度只适合作为状态模型证据。

### 3.8 Catch-up 卡栈：返回后逐件清理积压事项

**官方事实。** Slack Catch up 在移动端显示未读总数和单条预览，用户可向右标记已读、向左跳过，长按进入更多动作；误操作可撤销。桌面端也提供未读列表、折叠、提醒和消息动作。[SLACK-CATCHUP]

**对 ClassIn 的推导。** 老师隔一段时间返回、多个班级积累较多异常时，可以临时进入逐件处理模式：一次聚焦一个事项，提供 `开始处理`、`稍后`、`忽略本次`，同时显示剩余数量和 `查看全部`。这可以降低一次性展示十几项的压力，但不必成为日常空白页。

**适用条件。** 事项可独立判断；总数和顺序可信；跳过/稍后不会被误解释成完成；桌面端仍能切换到完整列表。

**风险与边界。** 串行卡栈会隐藏全局结构，老师可能不知道后面还有更紧急事项。它更适合“回来后清理”，不适合正在上课时监控，也不适合唯一的任务导航。Slack 官方行为主要是未读消息管理，并非 AI 待办效果验证。

## 4. 模式比较：它们分别解决什么

| 模式 | 主要回答的问题 | 适合放在初始面的内容 | 不应由它单独承担 |
| --- | --- | --- | --- |
| 情境建议条 | 我现在可以让 AI 做什么 | 当前会话的 2–4 个高相关动作 | 必须处理事项的唯一提醒、完整任务状态 |
| 日程/阶段时间轴 | 事情发生在什么时候、处于哪个教学阶段 | 跨班级的课前、课中、课后和总结事项 | 跨阶段高优先异常、运行中任务恢复 |
| 优先 Inbox/Triage | 哪些业务事情需要我判断 | 缺勤、未交、待批改等例外 | AI 补问、产物审阅与失败回执 |
| 能力抽屉/命令面板 | 这个助手总体还能做什么 | 完整能力目录、搜索、筛选、autosuggest | 当前业务事项和对话状态 |
| 会话内单一主动作 | 当前唯一明确的下一步是什么 | 一个对象完整、强时效的动作 | 多事项比较、长期能力发现 |
| Inline Proactive Assistant | 这条建议属于哪个业务现场、为何现在出现 | 贴着聊天/课程/作业的新事项 | 无来源的跨班级推荐流 |
| Progress & Resume | 长时异步工作怎样被找回 | 作为底层连续性与恢复证据；本轮不单设顶部状态带 | 尚未发起的能力机会和普通短对话 |
| Catch-up 卡栈 | 我回来后怎样逐件清理积压 | 有限数量的待处理例外 | 日常首页、全局优先级总览 |

这些模式不是互斥页面方案：建议条可以与时间轴或优先分诊层组合，能力抽屉则可以为任何初始面提供长尾能力。D-137 已明确当前 TeachBuddy 不采用独立顶部任务状态带；外部证据只说明这些承载方式在其他产品中存在并可工作，不说明哪一种组合适合 ClassIn，也没有提供它们之间的效果比较。

## 5. 经典案例的可迁移界面语法

本节不复刻竞品页面，也不把来源中没有公开的排序算法或内部 Harness 当作事实。这里的“语法”是从官方可见行为中抽出的组合关系：**业务范围锚点 → 当前信号 → 主动作 → 展开证据 → 状态回路 → 人工交付 Gate**。这是本文的跨案例归纳，不是这些厂商共同使用的官方术语。

### 5.1 五个案例的界面公式

| 经典案例 | 官方可见的界面公式 | 可迁移的语法 | 不能照搬的部分 |
| --- | --- | --- | --- |
| Microsoft Copilot / Teams | 当前 chat 或 channel 的侧边 Copilot + 输入框附近少量建议 + `Show more` + 回答中的 Sources；开发规范还包含 AI 标识、反馈控件和异步任务完成通知。[MS-TEAMS][MS-AGENT-UX] | `明确当前范围 → 给 2–4 个下一步 → 更多入口承接长尾 → 结果可回到原始证据 → 长任务完成后回到用户` | Teams 的建议通常还要进入输入框再发送，不能用来否定 D-129 的“一次点击提交”；微软没有公开教学事项的排序和提醒阈值 |
| Slack | channel / DM 头部的 Workflows tab + 消息区唯一 Featured workflow 按钮 + `Send a message` 返回普通输入；Agents & tools 侧栏聚合会话，其 Code channels 区段显示 Agent 正在工作还是需要用户关注。[SLACK-WORKFLOW][SLACK-AGENTS] | `会话范围 → 一个高置信主动作 → 明确退回自由输入 → 跨会话状态索引` | 多 Agent 选择器与 TeachBuddy 的统一主 Agent 决策冲突；Featured workflow 只证明启动方式，不证明生成后的审阅和正式写回 |
| Linear | Inbox 用 Priority / Other 分层；Triage 逐项接受、拒绝、标重或稍后处理；Triage Intelligence 把 AI 建议放在事项旁，允许查看理由、接受、忽略或跳到关联对象。[LINEAR-INBOX][LINEAR-TRIAGE][LINEAR-AI] | `例外总览 → 优先队列 → 单事项详情 → 建议理由 → 处理 / 暂缓 / 忽略 → 返回队列` | Inbox 的 Priority 是默认筛出的需关注通知且可由用户修改 filter，不是 AI 价值排序；软件研发的规则和 accept/decline 语义不能直接成为教学规则，AI 建议也不能写成已确认学生事实 |
| Notion / Notion Calendar | Home 用 Upcoming events、Recents、Agents 等稳定区段组织，My Tasks 持续可达；菜单栏以“即将发生的事件 + 加入会议”等紧凑动作表达时间；Agent 根据当前页面给出动作，并支持固定或搜索历史会话，部分外部写动作执行前要求确认。[NOTION-HOME][NOTION-CALENDAR][NOTION-AGENT] | `稳定区段 → 当前 / 即将发生 → 每行一个就地动作 → 历史会话恢复 → 对外写动作确认` | Home 区段不是 AI 优先级证明；Notion 只明确部分外部写动作的确认行为，不能概括为所有写入都使用同一 Gate |
| GitHub Copilot | 全局 agents panel / task view + 状态与“需要输入”提示 + Session 详情和日志 + 运行中追加指令；完成后交付 Pull Request 并把人放进 Reviewer 角色，Agent 产生的提交带签名和 Session 追溯链接。[GITHUB-SESSIONS][GITHUB-MISSION][GITHUB-OUTPUT] | `全局任务索引 → 当前状态 / 需介入 → 原任务恢复与继续协作 → 可追溯结果 → 人工审阅后正式交付` | Token、工具日志、提交和 Pull Request 是工程语义；教师界面只需要与教学结果有关的状态、来源和回执 |

### 5.2 按设计问题拆开的迁移规则

| 设计问题 | 一手案例给出的可迁移规则 | 对 ClassIn 仍需验证的部分 |
| --- | --- | --- |
| **初始建议** | Microsoft / Teams 和 Notion Agent 都把可读动作贴近当前对话或页面；Microsoft 还用少量 Suggested 入口、`Show more`、搜索和 autosuggest 分开首屏建议与完整 prompt 集。[MS-TEAMS][MS-AGENT-UX][MS-ORG-PROMPTS][NOTION-AGENT] | 哪些课堂信号足以触发建议、默认展示几条、多久更新一次，以及老师已有输入草稿时如何避免抢焦点 |
| **优先队列** | Linear 先把“需要注意”和“其他更新”分层，再在单项内提供处理、暂缓、忽略与理由；Slack Catch up 也保留总数、逐项处理和撤销。[LINEAR-INBOX][LINEAR-TRIAGE][LINEAR-AI][SLACK-CATCHUP] | 教学优先级口径、跨班级比较规则、暂缓后的重现时机，以及低置信事项是否进入队列 |
| **阶段 / 日程** | Notion 将即将发生的事件放进稳定区段和紧凑入口，并让“加入会议”贴着时间对象出现；Teams Facilitator 则把带时间分配的议程放在会议舞台，并明确其勾选只表示议题开始讨论。[NOTION-HOME][NOTION-CALENDAR][MS-FACILITATOR] | `课前 / 课中 / 课后 / 总结`与真实课次、截止时间和异常优先级如何共同排序；“阶段已进入”“AI 已生成”“教师已确认”“教学事项已完成”需要不同状态语义 |
| **会话内主动作** | Slack 只在当前 conversation 有一个明确 workflow 时替换输入框主位，同时保留回到普通消息的可见路径。[SLACK-WORKFLOW] | 主动作达到什么置信度才可占据主位、场景变化后何时撤下，以及点击后 D-129 的直接提交如何被清楚表达 |
| **任务恢复** | GitHub 用全局 Session 索引、状态和详情恢复异步任务；Slack 与 Notion 分别用会话侧栏、固定会话和历史搜索保持连续性。[GITHUB-SESSIONS][GITHUB-MISSION][SLACK-AGENTS][NOTION-AGENT] | 当前 Runtime 是否真的支持离页运行、刷新恢复和稳定 Session 身份；若不支持，不得出现“后台处理中”或空的“继续”入口 |
| **完成 / 安全反馈** | Microsoft 用 AI 标识、引用和反馈控件区分生成内容并提供来源，Teams Facilitator 让自动捕捉的任务先 `Accept to sync`；GitHub 把“已完成”落为可审阅的结果容器和人工 Reviewer Gate，并用签名与 Session 链接保留追溯；Notion 对官方明确的部分外部写动作要求确认；Linear 允许用户先看建议理由再接受或忽略。[MS-AGENT-UX][MS-FACILITATOR][GITHUB-SESSIONS][GITHUB-OUTPUT][NOTION-AGENT][LINEAR-AI] | 这些机制提高可审查性，不构成结果正确保证；Facilitator 中由用户直接要求创建的任务也可能自动同步。TeachBuddy 的完成回执最少要显示哪些对象、渠道、成功/失败明细和撤销窗口，以及哪些动作必须逐次审批，仍由本项目的策略与领域规则决定 |

### 5.3 可用于下一轮对比稿的最小句法

以上案例反复出现的不是某一种卡片样式，而是以下信息顺序：

1. **先说明范围。** 让老师先知道当前是哪个班级、课程、课次或作业，再展示建议。
2. **一屏只突出一个教学判断层。** “现在可做什么”“哪些例外需处理”“哪些环节已核对”使用不同层级，不把 AI 运行状态混进推荐流。
3. **行内动作只推进一步。** 一条紧凑行表达 `对象 + 时间/阶段 + 状态 + 一个动作`；理由、证据、其他动作再展开。
4. **对话始终是返回路径。** 快捷动作可以更快，但页面持续保留自然语言入口和可理解的已提交要求。
5. **协作必须能回到原对话。** 底层用稳定身份保留来源和结果；界面让补问、生成、审阅和回执贴着原对话继续。只有未来出现真正的长时异步工作时，才重新评估独立任务索引。
6. **完成不是绿色勾号。** 生成完成、教师确认、业务写回成功、部分失败与可撤销分别表达；正式写回应落到可审阅对象和执行回执。

这组句法可以跨卡片、列表、时间轴、侧栏和抽屉复用，但不决定哪一种容器组合成为 ClassIn 最终方案。

## 6. 对 ClassIn 的共同推导

以下为跨模式都成立的设计输入，不是最终页面结构：

1. **当前工作与完整能力分层。** 初始面先解释当前班级/课程里可行动的事项；完整能力通过“更多可做”、搜索或自然语言发现，不把内部能力拓扑铺给老师。
2. **机会卡与对话状态分开。** “还有 3 项可处理”只表示当前业务信号及可发起机会。老师点击后，要求、补问、生成、审阅和回执都进入原对话；机会卡不改写成“生成中”“待确认”或“已完成”，也不承担 AI 任务状态计数。
3. **闭环确认是独立信息。** `本节全员已到`、`函数作业 32/32 已提交`不是空状态，也不是待办；它们在数据完整且及时的前提下，给老师“系统已核对、当前无需处理”的安全感。它们不计入机会、工作或未读数字，也不能因数据缺失而被推断出来。
4. **每个动作带稳定业务锚点。** 至少绑定教师、班级、班级内课程和课次/作业；跨聊天恢复后仍回到原对象，不能只靠当前窗口猜测。
5. **一键发起与正式交付分开。** 对象完整时，一次点击可以直接提交给 TeachBuddy 并进入真实处理状态；向学生或班群发送仍需展示产物、对象、渠道并由老师确认。
6. **自由输入持续可见。** 快捷入口帮助老师说出要求，不能迫使老师先学会分类或选择 Skill；老师已有草稿时，新建议不覆盖、不抢焦点。
7. **运行状态贴着对话表达。** `正在生成课堂回顾`出现在对应 AI 消息上，`需要选择一份作业`成为对话末尾的问题，`3 份提醒待确认`成为可审阅产物；这些表达不进入顶部机会卡，也不暴露 Tool、Agent、Token 或内部步骤。
8. **主动建议安静、会自然到期。** 同一事项没有有意义变化时不重复吸引注意；业务窗口结束、事实变化或同义请求已在有效窗口发起后，机会更新或直接消失。若新事实已经闭环，可另出现一条低强调确认；历史对话和产物不随机会卡消失。

这些推导可作为下一轮文字设计的检查项，但不规定顶部、侧栏、卡片、列表、抽屉或时间轴的具体组合。

## 7. 支付宝 AI：可核验能力与页面证据缺口

蚂蚁集团 2025 年官方发布可以核验三类交互方向：AI 健康管家支持一键进入深度问询并连接后续服务；AI 理财助理描述为“哪里不会按哪里”；AI 出行助手允许用户用一句话定制全行程。[ANT-WAIC]

这些资料只支持“贴着对象发起”“自然语言直达服务”“生成后继续进入业务流程”的能力层判断。本轮没有找到支付宝或蚂蚁官方、可稳定引用且足够具体的资料来说明：

- AI 初始页采用什么信息架构；
- 是否存在主卡、副卡、时间轴或收件箱；
- 建议如何排序、按什么范围计数；
- 运行中、待确认、失败和完成任务显示在哪里；
- 跨页面或跨会话如何恢复。

因此，本文不使用媒体截图或二手介绍推断支付宝 AI 的页面结构，也不把其“一句话办事”扩写成一键自动执行或完整任务管理。支付宝案例只保留为能力方向证据，不参与布局优劣判断。

## 8. 完成状态与限制

本研究状态为 `COMPLETE_WITH_LIMITS`：八类内容承载模式均已找到仍可核验的官方一手资料，并分别记录了官方事实、对 ClassIn 的推导和风险；Microsoft / Teams、Slack、Linear、Notion 与 GitHub Copilot 的经典案例已进一步拆成可迁移界面语法；支付宝的能力证据与页面证据缺口已明确记录。

限制包括：未登录竞品做实机验收；官方资料未提供模式之间的对照指标；没有教师可用性测试、ClassIn PC 窗口尺寸验证或真实提醒阈值；部分官方帮助页会持续更新。本文不选择最终页面，也不替代下一轮基于教学数据、状态模型和教师评审形成的 M2 文字设计。
