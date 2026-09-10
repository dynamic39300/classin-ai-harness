---
title: IM Copilot 首次发现、情境引导与任务恢复的一手实践研究
status: RECOMMENDATION
date: 2026-09-09
scope: Part 1 整体入口与个性化提醒 UI/UX
---

# IM Copilot 情境引导研究

## 研究边界

研究问题：如何让首次进入 IM 的教师理解 Copilot、在当前教学现场快速发起任务，并在切换会话后找回工作？本记录只写公开交互证据及本项目推导，不推断外部产品的内部调度、Prompt、权限实现或效果指标。网页于 2026-09-09 核验；未登录这些产品做实机验收。

本次 Write Set 仅为本文；不修改代码、锁定决策或既有 Spec。发现完成条件为核验四类产品的一手帮助文档；记录完成条件为每项分开注明公开行为、建议和边界。

项目基线见 [D-120 / D-121 / D-123](../00-project/DECISION-LEDGER.md)、[Sidecar Spec](../04-specs/features/workbuddy-im-collaboration/DEEPSEEK-SIDECAR-FEATURE-SPEC.md) 与 [个性化服务 Spec](../04-specs/features/workbuddy-im-collaboration/PERSONALIZED-LEARNING-SERVICES-FEATURE-SPEC.md)：Sidecar 是教师私有协作区；消息 Thread 稳定绑定 Runtime Session；发送经过教师控制；进度来自真实运行事件。本研究不把建议升级为已实现事实。

## 四类可借鉴实践

### 1. Microsoft Teams：固定入口、渐进提示和从原文发起

**公开行为。** 聊天右上角打开 Copilot；侧栏提供建议提示及“更多”；教师类用户也可自行输入。回答可以查看来源并定位原聊天消息。另一个入口允许选中消息文字后调用 Ask Copilot，自动打开侧栏并使用所选文字发起请求。[聊天与频道 Copilot](https://support.microsoft.com/en-us/teams/copilot/how-to-use-microsoft-365-copilot-in-teams-chats-and-channels)、[Ask Copilot](https://support.microsoft.com/en-us/teams/copilot/ask-copilot-microsoft-teams)。

**适用于 ClassIn 的推导。** 班级窗口和消息聚合页在聊天标题区使用同一个带文字的入口；默认只展示少数建议，“更多教学协作”承接完整能力。未来可在作业消息、课次卡、学生求助原文上提供“用 TeachBuddy 处理”，直接携带对象。

**边界。** 这些来源没有证明 Teams 会按教学进度主动推荐提醒，也没有证明其侧栏任务如何跨聊天保留。不能据此声称现成竞品具备我们的完整闭环。

### 2. Intercom Copilot：贴近当前问题的建议，先入回复框再发送

**公开行为。** Copilot 可从会话侧栏或选中文字打开；根据客户最后的问题推荐 Macro，用户可用 Tab 插入、Esc 拒绝，开始自己输入时建议消失。回答带可预览来源，能添加到 Composer 后继续编辑；使用内部来源时有标识，并在添加到回复框前提醒。[How to use Copilot](https://www.intercom.com/help/en/articles/8587194-how-to-use-copilot)。

**适用于 ClassIn 的推导。** 最有价值的入口文案是具体机会，如“开课 10 分钟，仍有 3 人未进入课堂”，动作写“为 3 人准备提醒”。建议应展示依据与更新时间；内容生成后进入老师可核对对象的草稿，保留修改和发送动作。老师正在打字时不要用建议替换草稿或夺取焦点。

**边界。** 客服知识回答不能直接类比学生学情判断；课堂出勤和作业状态必须来自 ClassIn 业务事实。“内部来源提醒”也不能替代本项目的个体学情交付边界。

### 3. Slack AI：可配置汇总、离开后完成通知

**公开行为。** Recaps 首次设置推荐一些频道，由用户选择纳入；每天汇总，支持调整频道和静音设置、查看来源和手动刷新。长会话摘要生成时可以离开做其他工作，完成后再通知；移动端完成状态可用入口徽标表达。[Guide to AI features in Slack](https://hub.slack.com/help/articles/25076892548883-Guide-to-AI-features-in-Slack)。

**适用于 ClassIn 的推导。** “回到班级时提示值得处理的新事项”优于把每次状态变更都变成弹窗。当前会话显示一个最高相关建议，其他机会收在列表；老师可以忽略本次、稍后处理或关闭此类引导。生成完成给入口状态标识和可回到任务的通知。

**边界。** 每日汇总适合低紧迫信息，不能直接用于正在上课的缺勤提醒。Slack 来源没有给出适合教师的具体控频分钟数、课堂阈值或建议排序算法。

### 4. GitHub Copilot：运行任务有独立身份，可跨页面追踪

**公开行为。** 全局 agents panel 可从任意 GitHub 页面查看 Session；进入任务可看进度并追加指令、停止或归档。Copilot Chat 发起任务后会反映运行状态，任务完成后还可继续询问结果与验证内容。[Managing agent sessions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents)。

**适用于 ClassIn 的推导。** 当前聊天和后台任务分别表达：切到 B 群时展示 B 群上下文；A 群任务保留来源、标题、状态和“继续查看”。入口可显示“进行中 1 · 待确认 2”，展开轻量任务列表；点击任务回到来源会话及原 Session，不把 A 群产物注入 B 群。

**边界。** GitHub 面向长代码任务，教师侧不必展示 Token、工具日志等工程细节；其云端 Session 默认共享的模式不适用于教师私有学情工作。只有运行时实际支持离开后继续执行，产品才能显示“仍在生成”。

## 公开与私有的补充证据

Teams 将可加入群聊的 Copilot 作为另一种明确的群成员体验：加入时出现在成员列表并发欢迎消息，群成员通过 @ 与之互动。相关文档将其标记为 public preview；当回答依据并非所有群成员都可访问的资料时，先给提问者预览再决定是否公开。[Copilot in Teams group chats](https://support.microsoft.com/en-us/teams/chat-channels/how-to-use-microsoft-365-copilot-in-teams-group-chats)。

**本项目推导：** 用界面身份区分教师私有 Sidecar 与未来群内公开 Agent。前者标题下常驻“仅你可见 · 当前班级/学生”；公开内容仍通过明确发送目的地交付。不要把未来公开 Agent 的欢迎气泡塞进当前班级聊天来介绍私有 Copilot。Teams 的个人批准机制不等于本项目可以批准公开任何学生信息。

## 收敛为本项目的设计建议

以下全部为 `RECOMMENDATION`，不是竞品行为或已锁定规则。

| 层次 | 建议体验 | 为什么适合当前问题 |
| --- | --- | --- |
| 首次发现 | 聊天标题固定 TeachBuddy 文字入口；首次用一条可关闭说明指向入口 | 教师无需认识抽象 AI 图标；两种 IM 入口保持一致 |
| 情境首屏 | 首位放“此刻值得处理”的一张建议，下方保留其他能力与自由输入 | 让“能做什么”与当前教学任务直接联系 |
| 快速发起 | 对象、事项齐全的按钮明确写“生成提醒”；参数缺失则打开紧凑补全；泛化能力入口先预填可编辑意图 | 一键完成与教师控制兼容；避免每次都要理解长 Prompt |
| 可感知协作 | 点击后马上显示已选事项/对象，读取与生成展示真实状态，失败保留输入 | 反馈来自工作本身，不能靠假进度条营造智能 |
| 后台恢复 | 跨会话任务摘要条＋来源名＋状态＋返回操作 | 既知道任务还在，又不混淆当前聊天和发送对象 |
| 结果交付 | 明示“待你确认”，展示对象、渠道、正文；生成完成与消息发送分开 | 点击快捷建议只授权生成，未授权向学生发送 |

具体首屏例子：

- 课前：“今天 19:00 上课，距开课 20 分钟” → “准备开课提醒”。
- 课中：“开课 10 分钟，3 人尚未进入课堂” → “为 3 人准备提醒”。已请假等排除条件必须可核对；“尚未进入”不直接等同“旷课”。
- 刚下课：“本讲作业已发布，明晚截止” → “准备全班作业提醒”。没有可信作业发布记录时不能生成确定性文案。
- 之后返回：“距截止 3 小时，仍有 4 人未提交” → “为未提交学生准备提醒”。对象在点击和发送前重新核对，已经提交者退出待提醒范围。
- 没有可靠现场：“选择一堂课或一份作业开始”；只提供可用能力，不编造人数或紧迫事项。

## 主动引导的控制与待验证项

Microsoft HAX 指南要求 AI 根据用户当前任务和注意力选择行动时机，并让用户容易忽略或关闭不想要的服务。这是设计原则证据，不是任何特定产品的默认实现。[G3：Time services based on context](https://www.microsoft.com/en-us/haxtoolkit/guideline/time-services-based-on-context/)、[G8：Support efficient dismissal](https://www.microsoft.com/en-us/haxtoolkit/guideline/support-efficient-dismissal/)。

据此建议：同一业务事项未发生有意义变化时不重复吸引注意；已关闭的建议不能因离开再回来立即重现；正在编辑或生成时，新机会进入列表，不覆盖工作；课堂中的提示使用安静的状态更新。具体“课前多少分钟”“课中等待多久”“一天最多几次”必须在产品讨论与教师验证中确定。

下一步需要验证的 UI 问题：首次是否只高亮入口还是同时展开侧栏；窄班级窗口的面板宽度与收起行为；当前建议一键生成与先查看对象两种路径的接受程度；教师是否能够清楚复述“私有协作、发送目的地、任务保存位置”。

工程前置待核验：课堂出勤/作业提交的时效与权限；离开 Sidecar 后 Runtime 是否继续；任务摘要是否可跨页面观察；刷新恢复是否覆盖未发送的草稿。本文未检查这些实现，也不把稳定 Thread–Session 绑定等同于已完成后台任务 UI。

这些研究结论继续作为新 M2 的输入，但其中的项目推导不自动成为页面答案。上午形成的项目推导保存在[情境引导体验提案 v1.2](../04-specs/features/workbuddy-im-collaboration/COPILOT-CONTEXTUAL-ENTRY-EXPERIENCE-PROPOSAL.md)；下午线框的撤回范围见[M2 重启设计输入基线](../04-specs/features/workbuddy-im-collaboration/COPILOT-M2-DESIGN-BRIEF.md)，总体推进见[总里程碑计划](../04-specs/features/workbuddy-im-collaboration/COPILOT-MILESTONE-PLAN.md)。
