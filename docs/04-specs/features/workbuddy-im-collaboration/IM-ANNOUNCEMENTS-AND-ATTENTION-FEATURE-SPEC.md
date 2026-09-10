---
title: ClassIn IM 班级公告与消息提醒 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.2
date: 2026-09-09
parent: IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md
baseline_ids: ON-IA-13, ON-IA-14, ON-IA-15, ON-BUS-01, ON-BUS-02, ON-BUS-03, ON-GOV-01, ON-GOV-06
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 班级公告与消息提醒 Feature Spec

## Problem Statement

普通 IM 已有会话未读数、结构化成员提及、`@所有人` 和独立班级公告页面，但这些状态还没有形成群内可靠触达：班级群顶部没有固定公告，重要提醒缺少独立业务投影，`@我的` 没有跨班级聚合入口，普通群聊也没有真实阅读边界。桌面通知能力完全缺失，教师或学生离开当前会话后只能依赖列表未读数判断是否有新信息。

这会造成两个直接问题：教师发布的重要班级信息无法在群聊入口持续可见；学生和教师无法快速找到真正提到自己的消息。旧 Demo 的 `pinnedMessageId` 只表示一条普通消息的本地置顶，既不属于线上基线，也不能表达公告或重要提醒；该能力已按 `D-148` 完整移除。

## Solution

在现有四类消息导航和三栏沉浸结构内增加一条“业务公告 → 群内固定展示 → 个人提醒聚合 → 定位原消息 → 阅读边界与桌面触达”的纵向闭环。

- 班级公告继续由 Class Domain 拥有，IM 只读取稳定公告引用和允许展示的快照；点击固定条进入现有公告详情，不复制第二套公告数据。
- 群级重要提醒是独立的 Attention Projection，展示发布者、`@所有人`、内容和关闭动作；它与公告、普通消息使用不同业务状态。
- `@我的` 放在“班级消息”分类内，以临时 Focus Surface 聚合当前角色收到的具体成员提及和 `@所有人`，不增加第五类消息 Tab，也不形成常驻第四栏。
- 普通班级群按“进入会话前最后已读位置”显示“以下为新消息”分隔；打开会话后更新未读状态，但本次进入期间保留可见边界。
- 桌面通知经显式启用后才请求浏览器/桌面能力；不支持或拒绝时保留站内提醒，不把浏览器 Demo 宣称为 ClassIn PC 原生通知。

## Coverage Position

| Baseline ID | 本规格承接 | 目标状态 |
| --- | --- | --- |
| `ON-IA-13`、`ON-BUS-01` | 班级群顶部固定公告条，并连接现有公告详情 | `MATCHED · LOCAL_OPERATIONAL` |
| `ON-IA-14` | 独立的重要提醒条，包含发布者、`@所有人`、正文和关闭 | `MATCHED · MOCK_CLOSED_LOOP` |
| `ON-IA-15` | 普通班级群的“以下为新消息”阅读边界 | `MATCHED · LOCAL_OPERATIONAL` |
| `ON-BUS-02` | 当前角色的提及聚合、未读状态和原消息定位 | `MATCHED · LOCAL_OPERATIONAL` |
| `ON-BUS-03` | 显式授权、能力状态和站内降级；Browser/Memory Adapter 可替换 | `PARTIAL · LOCAL_CAPABILITY` |
| `ON-GOV-01` | 管理角色从 IM 进入既有公告管理/发布路径 | `PARTIAL · LOCAL_OPERATIONAL` |
| `ON-GOV-06` | 学生查看公告和提醒，但不获得管理动作 | `PARTIAL · LOCAL_OPERATIONAL` |

`ON-BUS-03` 在浏览器 Demo 中只达到 `PARTIAL`：它能证明授权、发送和失败降级的 Interface，但不能证明应用在后台/退出后仍由 ClassIn PC 或系统 Push 可靠触达。其生产完成条件留给消息生产生命周期阶段。

## Scope

### Included

- 教师端和学生端的班级群、一级消息入口和班级详情沉浸聊天入口。
- 固定公告条、公告详情跳转、公告空态/失效态和管理角色入口。
- 固定场景的重要提醒条、当前角色关闭状态和 Reset 恢复。
- “班级消息”内的 `@我的` 聚合、计数、已读/未读、直接提及/全体提及区分、定位原消息和空态。
- 普通班级群新消息分隔、定位最新消息、撤回/历史加载后的边界修正。
- 桌面通知支持度、权限、启用、测试通知、拒绝和失败降级。
- 与未读数、会话免打扰、只读群、被移出群状态、媒体消息和 Sidecar 布局的兼容。

### Excluded

- 公开课通知和官方内容流；它们在后续独立阶段进入“系统通知”和“官方公告”。
- 好友申请、组织关系和联系人发现产生的通知。
- 移动 Push、APNs/FCM、Service Worker 后台 Push、离线队列、跨设备通知同步和 ClassIn PC Native 通知中心。
- 公告附件、富文本编辑、定时发布、置顶排序、撤回、历史版本、回执统计和生产审核流。
- 重要提醒的创建器。线上证据只确认提醒条的阅读与关闭，本阶段不推断未展示的创建规则。
- Agent、TeachBuddy Sidecar、AI 主动消息和 Agent 运行状态提醒。

## User Scenarios

1. 作为班级成员，我进入群聊时希望在消息流上方持续看到当前公告，以免被后续聊天淹没。
2. 作为班级成员，我希望点击公告条打开完整公告详情，并能返回原群聊和原滚动位置。
3. 作为教师或其他管理角色，我希望从公告条进入现有公告管理路径；作为学生，我只能查看和确认，不看到发布或管理动作。
4. 作为班级成员，我希望看到一条与公告和普通消息明确区分的重要提醒，包含发布者、`@所有人` 和主要内容。
5. 作为班级成员，我希望关闭当前重要提醒而不删除原消息、不影响其他成员，也不把公告标成已读。
6. 作为教师或学生，我希望从“班级消息”快速打开 `@我的`，查看所有班级中直接提到我或提到所有人的未读消息。
7. 作为用户，我希望 `@我的` 明确区分“提到你”和“@所有人”，并显示班级、发送者、时间和安全摘要。
8. 作为用户，我希望点击一条提醒就进入正确班级并定位到原消息；原消息已撤回或不可访问时得到明确结果，而不是跳到错误会话。
9. 作为用户，我希望消息被撤回后相应提醒不再保留可打开的正文；图片和文件提醒只显示安全类型摘要。
10. 作为离开过群聊的用户，我希望再次进入时看到“以下为新消息”分隔，理解未读从哪里开始；本次进入并清零列表角标后，分隔仍保留到离开会话。
11. 作为已开启会话免打扰的用户，我希望仍能在站内看到 `@我的`，但不会收到普通桌面通知；直接提及是否穿透免打扰由本规格明确。
12. 作为首次启用桌面通知的用户，我希望系统只在我主动操作后申请权限，并清楚显示已启用、已拒绝、不支持或发送失败。
13. 作为拒绝桌面通知的用户，我希望站内未读、`@我的` 和公告仍正常工作，也能看到如何从浏览器/客户端设置恢复权限。
14. 作为 Demo 评审者，我希望固定公告/提醒、浏览器桌面通知和未来生产 Push 在内部证据中有不同真值，不把前台演示写成生产触达已完成。

## Requirements

| ID | Feature | 可观察验收结果 |
| --- | --- | --- |
| `IM-ATTN-001` | 公告固定条 | 可访问班级群在 Header 与消息时间线之间显示当前有效公告；包括标题、正文摘要、发布者/时间和未读状态。没有公告时不占空白高度。 |
| `IM-ATTN-002` | 公告详情与返回 | 点击公告进入现有 Class Announcement Surface；返回恢复原 Thread、分类、Sidecar 状态和滚动位置。公告失效时显示可恢复边界并可回到群聊。 |
| `IM-ATTN-003` | 公告角色权限 | 教师/管理角色看到“管理公告”并进入现有发布路径；学生只可查看/确认。Demo 未建模的班主任、助教以 Capability 表达，不用前端角色字符串猜测。 |
| `IM-ATTN-004` | 重要提醒条 | 当前班级存在有效提醒时显示发布者、`@所有人`、正文和关闭按钮；样式与公告和普通消息均有可读标签，不只靠颜色区分。 |
| `IM-ATTN-005` | 提醒关闭 | 关闭只记录当前 Actor 对该提醒的 dismissal；不撤回来源消息、不改变公告或其他参与者状态。切换会话后保持，Demo Reset 后恢复固定场景。 |
| `IM-ATTN-006` | `@我的` 入口与聚合 | “班级消息”区域提供带未读数的 `@我的` 入口；Focus Surface 按时间聚合当前 Actor 的直接提及和 `@所有人`，不新增消息分类。 |
| `IM-ATTN-007` | 提及语义 | 直接提及显示“提到你”，`everyone` 显示“@所有人”；Agent Mention 不进入普通用户 `@我的`。同一消息同时直接提及和 everyone 时只生成一项，并优先标为“提到你”。 |
| `IM-ATTN-008` | 定位与生命周期 | 点击提醒打开稳定 Thread 并定位/高亮原消息；撤回后显示“消息已撤回”，无权限/已移出/消息不可用时保留列表项的最小元数据并给出对应边界。 |
| `IM-ATTN-009` | 阅读状态 | 打开定位后的消息才把该提醒标为已读；打开 `@我的` 面板本身不批量清空。每项可单独标记已读，已读项仍可在“全部”中查看。 |
| `IM-ATTN-010` | 新消息分隔 | 进入普通班级群时，用进入前的最后已读 Message Reference 投影“以下为新消息”；本次会话期间稳定，历史分页/撤回后按最近可达消息修正，不使用 DOM 下标持久化。 |
| `IM-ATTN-011` | 桌面通知设置 | 用户从消息设置显式启用后才请求权限；界面投影 `unsupported / prompt / granted / denied / failed`，并在 granted 状态提供一次“发送测试通知”。 |
| `IM-ATTN-012` | 桌面路由策略 | 仅当应用非前台或目标 Thread 非当前活动会话时通知新到普通消息；当前会话不重复打扰。免打扰抑制普通消息；直接提及和 `@所有人` 默认仍通知，并在通知文案中标明来源班级。 |
| `IM-ATTN-013` | 降级与真值 | 设备通知不可用、拒绝或失败时，站内公告、提醒、未读和 `@我的` 不受影响；Browser/Memory Adapter 与未来 PC Native/Push Adapter 使用同一稳定契约。 |
| `IM-ATTN-014` | 入口与布局一致性 | 一级消息和固定班级入口、教师/学生、1440/900/390 三类视口共享状态；Focus Surface 不形成第四栏，不遮挡 Composer 和 Sidecar 的恢复入口。 |

## Product Decisions

- 四类消息导航保持“私聊 / 班级消息 / 系统通知 / 官方公告”。`@我的` 是班级消息内的注意力视图，不是第五类消息对象。
- 班级公告是 Class Domain 的正式业务对象；消息工作区只持有稳定 `classId + announcementId` 和 Projection，不复制公告正文为普通 Message Entry。
- 重要提醒是独立投影。它可以引用一条来源消息，但其展示、dismissal 和有效窗口由 Attention Domain 管理；普通消息不再携带置顶字段或置顶命令。
- 本阶段使用固定、去标识、可重置的重要提醒样本验证接收侧。创建重要提醒需要产品规则和管理权限证据，后续另行进入 Spec。
- `@我的` 同时包含直接成员提及和 `@所有人`；同一消息只形成一个 Attention Item。普通 Agent Target/Agent Mention 不算对当前教师或学生的成员提及。
- `@我的` Focus Surface 覆盖当前消息区，保留左侧分类/会话上下文与右侧 TeachBuddy Sidecar；紧凑视口按既有覆盖层规则显示。
- 打开 Thread 会清零会话列表未读数，但不应立即丢失“这次从哪里开始”的阅读语义。因此最后已读引用在进入前冻结为本次 View Boundary，离开后再成为新的持久位置。
- 桌面通知必须由用户手势启用，不在页面加载时弹权限。浏览器拒绝不可由页面重置，只提供设置指引和站内降级。
- 默认免打扰策略为：普通消息不触发桌面通知，直接提及和 `@所有人` 穿透；站内 `@我的` 永远保留。该策略是当前产品决定，需要用户在本 Spec Review 中明确确认。

## Module, Interface and Seam

`MessageAttentionModule` 是本阶段的 Deep Module。它统一计算公告、重要提醒、个人提及、阅读边界和桌面通知路由，页面只消费 `MessageAttentionProjection` 并发送用户命令。

```text
MessageWorkspace
  -> MessageAttentionModule
       -> ClassAnnouncementInterface
       -> MessageAttentionAdapter
       -> DesktopNotificationAdapter
       -> Message Domain references
```

- `ClassAnnouncementInterface` 把 Class Domain 已有公告投影为 IM 可读快照，并承接查看、确认和进入管理路径；它不改变公告事实所有者。
- `MessageAttentionAdapter` 读取固定/未来生产 Attention Snapshot，并保存当前 Actor 的 reminder dismissal、mention read reference 和 last-read reference。首版提供可重置 Memory Adapter。
- `DesktopNotificationAdapter` 隔离浏览器 `Notification`、前台状态和未来 ClassIn PC Native/Push 实现。Domain、页面和测试不直接访问设备 API。
- 所有引用使用稳定 Actor/Class/Thread/Message/Announcement ID；正文只作为受治理 Projection，不进入 URL 或浏览器通知的持久键。
- 页面不分别维护未读数、`@我的` 数量和新消息分隔的第二份布尔状态；三者从同一 Snapshot 与 Read Reference 派生。

## State and Recovery

- 公告：`absent | loading | active(read/unread) | unavailable | forbidden | failed`。失败保留群聊，可重试公告读取。
- 重要提醒：`absent | active | dismissed`。来源失效后转为 unavailable，不显示陈旧正文。
- `@我的`：`loading | ready(unread/read) | empty | partial | failed`。某个 Thread 无权访问时不阻塞其他结果。
- 定位：`idle → opening-thread → locating → highlighted | retracted | unavailable | forbidden | failed`；失败保留原 Attention Surface 和重试动作。
- 阅读边界：`none | frozen(messageRef) | corrected(messageRef)`；历史加载和撤回只通过稳定引用修正。
- 桌面通知：`unsupported | prompt → requesting → granted | denied | failed`；发送单次失败不自动撤销 granted，也不影响站内状态。
- 会话切换、Sidecar 开合和路由往返不得清空 dismissal、mention read 和本次阅读边界；Demo Reset 恢复固定状态。

## Testing Decisions

- Domain 单元测试覆盖公告/提醒的独立语义、Mention 去重和优先级、read reference、新消息边界修正、撤回/无权访问和免打扰通知路由。
- Adapter 契约测试覆盖 Snapshot 部分失败、Actor 隔离、dismiss/read 持久、Reset、设备不支持、权限拒绝和测试通知失败。
- Integration 使用现有 `MessageWorkspaceProvider + MemoryRouter` 高层 Seam，覆盖教师/学生公告权限、重要提醒关闭、`@我的` 聚合定位、列表未读与阅读边界一致性。
- 浏览器 E2E 覆盖公告条到详情再返回、`@我的` 定位、普通群聊新消息分隔、桌面通知 denied/granted 的可观察 UI；CI 不依赖真实 OS 通知横幅出现。
- 可访问性覆盖公告/提醒语义名称、Focus Surface 焦点约束、关闭后焦点恢复、计数的可读名称和非颜色区分。
- 视觉验收覆盖 1440×900、900×720 Sidecar 共存和 390×844 固定班级入口，确认固定条不会压缩到遮挡消息或 Composer。
- 完成时更新 104 项矩阵；`ON-BUS-03` 只按实际能力记为 `PARTIAL`，不因 Browser Adapter 存在而标为生产 `MATCHED`。

## User Review Checklist

用户已授权在余下六个模块中由实施方按既定设计原则完成阶段性自审，不再逐阶段等待确认。`AR-01—14` 已按该授权全部复核通过；生产能力边界与保留项仍按表中决定执行。

| 审阅 | Review ID | 需要确认的决定 | 当前建议 |
| --- | --- | --- | --- |
| ✅ | `AR-01` | 本阶段范围 | 只处理班级公告、重要提醒、`@我的`、新消息边界和桌面通知能力；公开课/官方内容留到阶段 4。 |
| ✅ | `AR-02` | 公告事实所有者 | 复用 Class Domain 和既有公告详情；IM 只投影固定条，不复制第二份公告对象。 |
| ✅ | `AR-03` | 公告权限 | 教师/管理 Capability 可进入管理路径；学生只查看/确认，不显示发布和管理。 |
| ✅ | `AR-04` | 重要提醒范围 | 先实现固定样本的展示与按 Actor 关闭；不在证据不足时推断创建器。 |
| ✅ | `AR-05` | `@我的` 入口 | 放在“班级消息”内并打开临时 Focus Surface，不增加第五类 Tab 或常驻第四栏。 |
| ✅ | `AR-06` | `@我的` 语义 | 直接提及与 `@所有人` 都进入；同一消息只出现一次，直接提及优先。 |
| ✅ | `AR-07` | 已读规则 | 打开 `@我的` 不批量清空；定位到原消息才已读，并允许在“全部”中继续查看。 |
| ✅ | `AR-08` | 新消息边界 | 用稳定最后已读 Message Reference 显示“以下为新消息”，不依赖固定条数或 DOM 位置。 |
| ✅ | `AR-09` | 桌面通知授权 | 只在用户显式启用后申请；提供 granted/denied/unsupported/failed 和测试通知。 |
| ✅ | `AR-10` | 免打扰策略 | 普通消息被抑制；直接提及和 `@所有人` 默认穿透；站内 `@我的` 始终保留。 |
| ✅ | `AR-11` | 桌面能力完成度 | Browser/Memory Adapter 验证闭环，但 `ON-BUS-03` 保持 PARTIAL，生产 Push/Native 留到阶段 7。 |
| ✅ | `AR-12` | 架构 Seam | 由 `MessageAttentionModule` 统一派生注意力状态，公告、设备通知和未来生产事件各自通过 Interface 接入。 |
| ✅ | `AR-13` | 角色与异常状态 | 教师/学生、只读/被移出、撤回/无权访问和数据部分失败都保留明确可恢复结果。 |
| ✅ | `AR-14` | 验收范围 | Unit/Contract/Integration/E2E/Axe + 1440/900/390 三视口；真实 OS 横幅不作为 CI 成功条件。 |

## To Spec Completion Gate

本规格已完成问题、范围、稳定 Requirement、业务状态、Interface/Seam、真值边界和测试策略。用户已授权余下模块按既定原则自主实施，`AR-01—14` 已完成阶段性自审；对应 Tickets、实现与 Implementation Review 均已落库。
