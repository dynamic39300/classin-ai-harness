---
title: ClassIn IM 2.0 Part 2 基础能力 Feature Spec
status: IMPLEMENTED_V1
version: v1.0
date: 2026-09-09
---

# ClassIn IM 2.0 Part 2 基础能力 Feature Spec

## Problem Statement

当前 `MessageWorkspace` 已能完成会话分类、沉浸式消息布局、发送消息、置顶、撤回和部分会话管理，但高频消息协作仍缺少逐条回复、消息反馈、历史定位、资源复用和双语阅读能力。用户会被迫手工复制上下文、反复翻找消息和文件，跨语言沟通也会丢失原文参照。

本规格依据用户指定的 [6.10-IM 2.0 features 功能详细](https://app.notion.com/p/3d6a5c3b026b804b9ab9c1996a09c4a6?pvs=204) 与其父级 [6.10版本 IM升级：基于学情的个性化师生教学沟通](https://app.notion.com/p/3d4a5c3b026b8012b602edd0efc07fe0?pvs=204)，只覆盖 Part 2 的 IM 基础能力。Part 1 AI 能力、Agent 能力和 TeachBuddy Sidecar 智能设计由另一个 Session 负责。

## Solution

在教师端和学生端共用的 `MessageWorkspace` 内完善七项 P0：保持现有会话分类和沉浸式布局作为回归基线；新增引用回复、消息 Reaction、聊天记录搜索、会话资源检索复用、原文与译文对照。所有新行为通过 Message Domain 的稳定 Interface 表达，页面只负责组合视图。固定、脱敏、可重置的 Mock Adapter 提供 Demo 数据，未来 ClassIn 服务通过相同 Interface 替换。

## Coverage Position

本规格是 **7 项 Part 2 增量切片**，不是 ClassIn IM 基础功能全集。完整产品设计同时受 [IM 2.0 基线继承与增量覆盖账本](./IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md) 约束：旧项目经用户校准的 104 项线上 PC Feature 必须逐项保留 `BASELINE / ADAPTED_BASELINE / GAP / CONFLICT` 状态；本规格的 7 项只记为 `INCREMENT` 或既有基线的明确深化。完成本规格不能自动把未进入本轮 Write Set 的通讯录、媒体消息、临时教室、公开课、群公告、权限与生命周期能力标记为已完成。

## User Stories

1. 作为教师或学生，我希望按私聊、班级消息、系统通知和官方公告浏览会话，以便快速缩小信息范围。
2. 作为教师或学生，我希望沉浸阅读当前会话，同时保留清晰的会话导航和输入区，以便持续沟通。
3. 作为消息发送者，我希望回复某一条具体消息，并在发送前看到被引用内容，以便接收者理解上下文。
4. 作为消息接收者，我希望点击引用摘要即可定位原消息，以便核对完整语境。
5. 作为参与者，我希望用常用 Reaction 快速反馈，并看到各 Reaction 的总数和我是否已选择，以便减少低价值回复。
6. 作为教师或学生，我希望按关键词、发送人和时间范围搜索当前会话记录，以便找回决定、作业要求或资料。
7. 作为搜索者，我希望从结果跳转并高亮具体消息，以便立即回到上下文。
8. 作为群聊成员，我希望搜索当前会话与班级共享资源，并预览资源来源、类型和时间，以便复用已发送的材料。
9. 作为发送者，我希望把已有资源以稳定引用插入当前消息，而无需重复上传。
10. 作为跨语言沟通者，我希望在单条消息下查看目标语言译文，同时持续看到原文，以便核对语义。
11. 作为用户，我希望翻译失败后可以原位重试，且原消息始终可读，以便故障不阻断消息使用。
12. 作为键盘和辅助技术用户，我希望搜索面板、资源面板、引用、Reaction 和翻译操作均可聚焦、命名和关闭。
13. 作为 Demo 评审者，我希望真实能力、固定模拟能力和占位能力有明确真值标签，以免误认为已连接生产服务。

## Requirements

| ID | 需求 | 验收摘要 |
| --- | --- | --- |
| IM2-P2-001 | 会话分类 | 保持四类会话、未读数、空状态、URL 可恢复和当前分类搜索；不得回归。 |
| IM2-P2-002 | 沉浸消息布局 | 保持通信主 Surface、响应式降级、滚动/焦点/草稿恢复；现有 Sidecar 只作为几何兼容对象。 |
| IM2-P2-003 | 引用回复 | 可选择普通消息、取消引用、随新消息保存引用快照、点击引用定位；原消息撤回或暂未加载时仍显示安全摘要。 |
| IM2-P2-004 | 消息 Reaction | 每个用户对同一消息和 Reaction 至多一条选择；重复操作取消；显示聚合计数和本人状态；撤回消息不可新增。 |
| IM2-P2-005 | 聊天记录搜索 | 限定当前会话，支持关键词、发送人、起止日期组合；显示结果数、空/加载/错误态并可定位消息。 |
| IM2-P2-006 | 资源检索复用 | 汇总当前会话资源与班级共享资源；支持关键词和类型过滤、来源标识、预览元数据及插入稳定引用。 |
| IM2-P2-007 | 双语对照翻译 | 单消息按目标语言请求翻译；原文与译文同时可见；支持加载、完成、可恢复失败、重试和收起。 |

## Implementation Decisions

- `MessageEntry` 是消息事实根，新增 `replyTo`、`reactions` 与 `resources` 的可选投影；引用保存发送时的安全快照，同时保留稳定 `messageId` 用于定位。
- `MessageInteractionModule` 隐藏引用创建、Reaction 幂等切换和撤回约束；Provider 暴露小命令，页面不直接改写 Entry。
- `MessageHistorySearch` 是只读 Interface，输入当前 Thread、关键词、发送人、日期和 Cursor，输出稳定 Message Reference。Mock Adapter 可同步检索已加载和 `olderEntries`；未来 Adapter 可分页查询服务端。
- `ConversationResourceRepository` 是只读 Interface，统一当前会话资源与班级共享资源；发送时只写入 `MessageResourceRef`，不复制文件所有权或二进制内容。
- `MessageTranslationService` 是可替换 Interface；翻译结果按 `messageId + source body + target locale` 缓存。Demo Adapter 返回固定、可复现译文，并明确 `SIMULATED`。
- 搜索与资源检索使用覆盖当前消息区的 Focus Surface，不形成沉浸布局第四栏；打开时保留当前会话和 Composer 草稿，关闭后焦点返回触发器。
- 现有 TeachBuddy/Agent 代码不在本规格 Write Set；本规格只保证新 Overlay、Header 操作和 Timeline 不破坏其布局边界。
- 系统通知和官方公告继续使用文档详情模型，不获得逐条引用、Reaction 或翻译行为。
- “稍后处理”在父文档附录标记为 P0，但未列入 Part 2 主表。本轮记录为范围差异，不静默实现；待产品范围明确后单独进入 Spec/Ticket。

## State and Recovery

- 引用：`idle → selected → sent | cancelled`；切换会话后各会话草稿与引用独立保留。
- Reaction：`idle → applying → applied | recoverable-failure`；Mock 首版即时完成，Interface 保留失败回滚语义。
- 搜索：`closed → editing → loading → results | empty | recoverable-failure`。
- 资源：`closed → loading → results | empty | recoverable-failure → selected`。
- 翻译：每条消息独立为 `idle → loading → ready | recoverable-failure`；重新请求不得隐藏原文。

## Testing Decisions

- Domain 单元测试覆盖引用快照、Reaction 幂等、撤回限制、组合搜索和资源去重，只断言可观察行为。
- Adapter 契约测试覆盖固定 Mock 的搜索分页、资源来源、翻译成功/失败/重试契约。
- Integration 测试复用现有 `MessageWorkspaceProvider + MemoryRouter` Seam，覆盖引用发送、Reaction 切换、搜索定位、资源插入和双语展开。
- E2E 覆盖教师班级群完整路径，并回归学生视角、固定班级入口、沉浸布局、键盘焦点、紧凑宽度与 Sidecar 共存。
- Verification 至少运行 TypeScript、Lint、相关 Vitest、消息 E2E 和构建。

## Out of Scope

- Part 1 的 AI 总结、智能问答、个性化回复、沟通计划、风险识别、AI 过程展示和上下文注入。
- TeachBuddy Agent、班级 Agent、Sidecar Runtime 或模型能力修改。
- 生产 IM API、真实文件上传下载、生产翻译服务、云端索引、群治理和正式写回。
- 撤回、Thread 消息列、语音、草稿恢复、失败重试、独立群管理、视频通话等附录 P1/P2 能力。
- 附录中的“稍后处理”，直到产品范围差异被单独确认并记录。

## Completion Definition

- 七项 Part 2 P0 均有实现或明确的既有回归证据。
- 核心、空、加载、错误和恢复状态在适用范围内可操作。
- 教师、学生、消息中心和固定班级入口共享同一行为，权限差异明确。
- 沉浸、紧凑宽度和 Sidecar 共存无溢出、遮挡或不可达操作。
- Mock 真值明确，不宣称生产服务已经接入。
