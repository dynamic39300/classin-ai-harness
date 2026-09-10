---
title: ClassIn IM 单条消息 Reaction 交互升级 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.0
date: 2026-09-10
source_proposal: IM-MESSAGE-REACTION-INTERACTION-DESIGN-PROPOSAL.md
---

# ClassIn IM 单条消息 Reaction 交互升级 Feature Spec

## Problem Statement

当前消息 Reaction 已支持 `👍 / ❤️ / 👏` 三个固定选项、幂等切换和聚合人数，但操作按钮位于消息正文下方并占用布局高度，已有 Reaction 也只在消息操作条显现。用户无法选择当前聊天 Emoji 集合里的其他表情，触屏和键盘场景也缺少稳定的扩展入口。

## Solution

在共用 `MessageWorkspace` 内提供两级 Reaction：消息悬浮或聚焦时显示紧凑浮动工具条，一级保留 `👍 / ❤️ / 👏`；点击“添加表情回应”打开复用当前聊天表情视觉与 Unicode Emoji 网格的简洁面板。已添加的 Reaction 以常驻胶囊显示在消息内容下方。

Reaction 面板只执行 `toggleReaction(target, emoji)`。它不插入 Composer 草稿，也不显示搜索、最近使用、收藏、分类导航、肤色设置、教学贴纸、自定义图片或文本回应。

## Scope

适用于教师端与学生端共用的普通消息时间线，包括一级消息入口与班级/课程详情进入的固定班级群聊。普通文字、Emoji、图片、视频、资源和对象卡消息使用同一 Reaction 行为；系统消息、撤回消息、系统通知详情、官方公告详情和只读会话不提供新增入口。

### Write Set

- `src/domain/message/`：共享 Unicode Emoji 目录与 Reaction Key 类型。
- `src/features/message-workspace/`：Composer 目录复用、Reaction 面板、浮动工具条、常驻胶囊和焦点恢复。
- `tests/integration/`、`tests/e2e/`：扩展 Emoji、关闭、计数、撤回、跨入口和可访问性回归。
- 本 Feature Spec、Tickets、Implementation Review、README 与 Traceability。

### Explicitly Unchanged

- Composer 的“最近、Emoji、教学贴纸、常用回应、我的”、收藏和自定义上传行为。
- TeachBuddy Sidecar、Agent Runtime、消息发送协议和媒体 Adapter。
- 生产 Reaction API、跨设备同步、成员名单提示和乐观失败回滚服务。

## Requirements

| ID | Requirement | 可观察验收结果 |
| --- | --- | --- |
| `IM-RXN-001` | 三个快捷 Reaction | 可写普通消息悬浮或聚焦时显示 `👍 / ❤️ / 👏`，一次点击添加或取消。 |
| `IM-RXN-002` | 添加表情入口 | 快捷项之后有名称为“添加表情回应”的独立按钮，点击后只针对当前 `threadId + messageId` 打开面板。 |
| `IM-RXN-003` | 简洁 Emoji 面板 | 面板复用 Composer 的 Surface 与 Unicode Emoji 网格；不出现搜索、最近、收藏、分类、肤色、贴纸、自定义图片和文本回应。 |
| `IM-RXN-004` | 扩展 Reaction | 当前 Composer Unicode Emoji 集合中的任一 Emoji 均可作为稳定 Reaction Key；选择后立即切换并关闭面板。 |
| `IM-RXN-005` | 常驻聚合胶囊 | 计数大于零的 Reaction 在消息内容下方持续显示 Emoji、人数和本人选择态；点击胶囊切换本人状态。 |
| `IM-RXN-006` | 消息动作布局 | 工具条不参与消息正文高度计算、不换行挤压正文，并在窗口边缘向消息内部对齐。 |
| `IM-RXN-007` | 生命周期约束 | 撤回、系统和只读消息隐藏新增入口；切换 Thread 或目标消息卸载时关闭面板，不得写入其他消息。 |
| `IM-RXN-008` | 键盘与触屏 | 触发器、快捷项和胶囊具有可读名称与选中状态；Escape 关闭并恢复触发器焦点；紧凑/无 Hover 视口提供可见操作入口，面板使用底部承载。 |
| `IM-RXN-009` | 入口一致性 | 教师、学生、一级消息和固定班级入口复用相同 Module 与交互。 |

## Module and Interface

`MessageEmojiCatalog` 是内部共享 Module，拥有固定、脱敏、可重置的 Unicode Emoji 集合。Composer 可以消费完整的媒体集合；Reaction 面板只消费 `unicodeEmoji`。只有未来出现第二个真实目录来源时才建立 Adapter Seam。

`MessageInteractionModule` 继续拥有 Reaction 校验、幂等切换、聚合状态和撤回约束。页面只调用现有小命令：

```ts
toggleReaction(threadId, messageId, actorId, reactionKey)
```

面板的 `threadId + messageId` 是一次打开期间的稳定目标。页面状态不复制消息事实；Reaction 结果继续写回 `MessageEntry.reactions`。

## State and Recovery

- 面板：`closed → open(target) → selected | dismissed`。
- Escape、外部点击、Thread 切换和目标消息卸载都进入 `dismissed`，并在仍可用时恢复触发器焦点。
- 选择 Emoji 后先执行当前同步 Demo 命令，再关闭面板。未来异步 Adapter 接入时，由 Interaction Module 增加局部等待、回滚和重试 Projection，页面结构不改变。
- 同一用户对同一消息可添加多个不同 Emoji；同一 Emoji 至多一条选择，重复点击即取消。

## Testing Decisions

- Domain 测试证明共享目录可供 Composer 与 Reaction 复用，三个快捷项和非快捷 Emoji 均可切换；系统和撤回消息仍拒绝改变。
- Integration 测试覆盖快捷 Reaction、打开简洁面板、无复杂控件、扩展 Emoji、常驻胶囊、Escape 与焦点恢复。
- E2E 覆盖教师班级群的完整两级路径，并回归教师/学生、一级消息/固定班级入口与撤回消息。
- 验证 TypeScript、Lint、相关 Vitest、消息 Playwright、生产构建和桌面/紧凑视口视觉。

## Completion Definition

- `IM-RXN-001`—`IM-RXN-009` 均有实现和自动化证据。
- 现有 Composer 表情、回复、翻译、撤回、媒体消息和 Sidecar 几何没有回归。
- 消息正文无新增空白、工具条无横向溢出、面板不被 Sidecar 或视口裁切。
- 文档记录最终实现、验证结果和仍属于生产 Adapter 的边界。

## User Review Record

用户已确认设计提案 v0.2，并明确要求直接进入标准实施流程。本规格把该共识转换为可验收要求，不增加未经确认的 Emoji 搜索、最近使用、收藏或分类能力。
