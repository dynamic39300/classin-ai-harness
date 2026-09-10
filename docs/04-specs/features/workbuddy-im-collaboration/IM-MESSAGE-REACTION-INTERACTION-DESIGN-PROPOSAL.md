---
title: ClassIn IM 单条消息 Reaction 交互升级提案
status: USER_APPROVED
version: v0.2
date: 2026-09-10
scope: teacher-and-student-message-workspace
next_gate: TO_SPEC_COMPLETE
---

# ClassIn IM 单条消息 Reaction 交互升级提案

## 1. 结论先行

建议采用 Slack 截图所体现的两级交互，并保留 ClassIn 当前已经完成的 Reaction 状态与计数规则：

1. **一级快捷 Reaction**：鼠标悬浮或键盘聚焦单条消息时，在紧凑悬浮工具条中提供三个常用表情。
2. **二级简洁 Reaction 面板**：点击“添加表情回应”图标后，打开与当前聊天输入框一致的表情面板外观和 Emoji 网格。
3. **已添加 Reaction 常驻显示**：消息已有 Reaction 时，在消息内容下方持续显示“表情 + 人数”胶囊，不依赖悬浮才能看见。

首版快捷表情建议沿用当前已经存在的 `👍 / ❤️ / 👏`，避免既有消息、测试和用户习惯发生无必要变化。二级面板直接展示当前 Composer 已有的 Unicode Emoji 集合，不增加搜索、最近使用、收藏、分类导航或肤色设置。教学贴纸、自定义图片和“常用回应”仍属于消息 Composer，不作为消息 Reaction。

本轮只产出设计提案，不修改 Feature Spec、Tickets、Domain、页面或测试。用户 Review 通过后，再进入 `To Spec → To Tickets → Implementation`。

## 2. 从两张 Slack 截图提取的交互语法

| 截图观察 | 用户价值 | ClassIn 采用方式 |
| --- | --- | --- |
| 消息悬浮时才出现紧凑动作条 | 阅读时保持低噪，操作时靠近目标消息 | 工具条贴近当前消息，不占据消息时间线的常驻高度 |
| 动作条直接提供三个表情 | 一次点击完成最高频回应 | 沿用 `👍 / ❤️ / 👏` 作为首版固定快捷项 |
| 独立的“添加表情回应”图标 | 不让快捷项限制可表达范围 | 图标打开专用 Reaction 面板，不进入 Composer |
| Slack Picker 包含搜索、常用与分类 | 表情全集很大时可以缩短查找路径 | 本轮只借鉴面板承载方式；复用当前 Composer 的简洁 Emoji 网格，不采用这些进阶功能 |
| Picker 锚定当前消息动作条 | 用户始终知道表情将加到哪条消息 | 面板保存稳定 `threadId + messageId` 目标，切换会话时自动关闭 |

本次借鉴 Slack“高频一步完成、低频按需展开”的渐进披露方式；面板本身保持 ClassIn 已有聊天表情体验的简洁程度。

## 3. 当前实现基线与缺口

| 能力 | 当前状态 | 本次设计变化 |
| --- | --- | --- |
| 快捷表情 | 已固定支持 `👍 / ❤️ / 👏` | 保留三项，收进紧凑悬浮工具条 |
| Reaction 规则 | 已支持同一用户幂等添加/取消、多人计数、本人选中态 | 继续复用，不重建第二套状态 |
| 消息动作条 | 回复、三个 Reaction、翻译、撤回在消息下方排列；默认依赖悬浮或内部焦点显示 | 改为不挤压正文的悬浮工具条；触屏提供明确入口 |
| 扩展 Reaction 选择 | 当前不存在，Domain 只接受三个固定值 | 用简洁面板开放当前 Composer 已有的 Unicode Emoji 集合 |
| Composer 表情面板 | 已有 Emoji 网格，以及“最近、教学贴纸、常用回应、我的”等其他能力 | 复用面板外观、间距和 Emoji 网格；Reaction 场景不继承其他集合与 Composer 发送语义 |
| 已有 Reaction 展示 | 计数附着在默认隐藏的消息动作条内 | 只要计数大于零，就在消息下方常驻显示 Reaction 胶囊 |
| 触屏操作 | 没有稳定 Hover，当前动作发现性不足 | 点按消息的操作入口打开紧凑动作面；简洁表情面板使用底部承载 |

## 4. 方案比较

| 方案 | 说明 | 优点 | 问题 | 建议 |
| --- | --- | --- | --- | --- |
| A. 两级 Reaction 工具条 | 三个快捷项 + 添加图标 + 专用简洁表情面板 | 高频最快；当前 Emoji 集合可达；与现有聊天体验统一 | 需要扩展 Reaction 类型并增加 Focus Surface | **推荐** |
| B. 在当前消息下方追加“更多” | 保持现有动作条位置，只在三个表情后加图标 | 改动较小 | 继续挤占消息高度；动作条易换行；触屏发现性仍弱 | 不推荐 |
| C. 连行为一起复用 Composer 表情面板 | 点击消息图标后打开现有五类面板 | 表面改动较少 | 会带入“最近、贴纸、常用回应、我的”和插入草稿等无关行为 | 不采用；只复用视觉结构与 Emoji 网格 |

## 5. 推荐桌面版框

### 5.1 悬浮消息与快捷 Reaction

```text
┌ · · · · · · · · · · · · · · 当前消息可操作区域 · · · · · · · · · · · · · · · · ┐
│  李明 · 14:08                         ┌──────────────────────────────────────┐ │
│                                      │ 👍 │ ❤️ │ 👏 │ ☺＋ │ 回复 │ 翻译 │ ⋯ │ │
│  ┌───────────────────────────────┐   └──────────────────────────────────────┘ │
│  │ 练习单已经准备好了。          │                                            │
│  └───────────────────────────────┘                                            │
│  [ 👍 3 ] [ ❤️ 1 ]                                                         │
└ · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ┘
```

- 工具条锚定当前消息上沿，使用现有 Surface、边界、阴影和圆角 Token，不复制 Slack 颜色。
- 默认靠消息气泡的右上方；靠近窗口、Sidecar 或窄栏时向内翻转，不能遮挡消息正文或产生横向滚动。
- 三个快捷表情始终排在“添加表情回应”图标之前；现有回复、翻译、撤回继续保留。
- `⋯` 只在后续确有更多既有动作时使用；首版不为了模仿截图补造转发、收藏或举报。
- 已有 Reaction 胶囊独立于工具条持续显示。点击胶囊切换本人的同一 Reaction；本人已选择时显示选中态。

### 5.2 简洁 Reaction 表情面板

```text
                         ┌ · · · · 添加表情回应 · · · · ┐
                         │ 😀  😊  😂  🥰  😎  🤔      │
                         │ 👏  👍  💪  🎉  ✨  🔥      │
                         │ ✅  📚  ✏️  💡  🧪  🚀      │
                         └ · · · · · · · · · · · · · ·┘
```

- 复用当前聊天输入框表情面板的 Surface、圆角、阴影、间距、Emoji 单元尺寸和关闭方式，让两个入口看起来属于同一套产品。
- 打开后直接展示当前 Composer 已有的 Unicode Emoji 网格，不再增加第二层信息架构。
- 不提供搜索、最近使用、收藏、分类导航或肤色设置。
- 选择一个 Emoji 后立即对目标消息执行 Reaction，并关闭面板；再次选择本人已经添加的同一 Emoji 时取消。
- 面板不显示教学贴纸、自定义图片或文本“常用回应”，避免把图片消息或草稿动作当成 Reaction。
- 后续如果统一 Emoji 集合发生变化，Reaction 网格跟随同一目录更新，不改变这套交互结构。

## 6. 触屏与紧凑视口

Hover 不能成为唯一入口：

- 在触屏设备点按消息的“消息操作”按钮后，显示快捷 Reaction 与现有消息动作。
- 三个快捷 Reaction 放在操作面的第一行；“更多表情”打开底部面板，避免小屏锚点 Popover 被裁切。
- 底部面板只展示与桌面版相同的简洁 Emoji 网格；选择后关闭并返回原消息阅读位置。
- 长按可以作为效率入口，但不能作为唯一入口；图片、链接、引用和媒体点击继续执行原行为。
- 键盘进入消息操作后，可用 Tab 移动到快捷项和表情面板触发器；Escape 关闭并把焦点还给原触发器。

## 7. 状态与权限规则

| 状态 | 行为 |
| --- | --- |
| 可写普通消息 | 可添加/取消快捷项或面板内的 Emoji Reaction |
| 已有 Reaction | 胶囊常驻显示 Emoji、人数和本人选中态 |
| 提交中 | 目标 Reaction 局部显示等待状态，不冻结整条消息 |
| 可恢复失败 | 回滚乐观状态并在当前消息附近提供重试反馈 |
| 消息已撤回或系统消息 | 不显示添加入口，也不允许新增 Reaction |
| 只读历史会话 | 保留已有 Reaction 的只读展示，隐藏添加入口 |
| 系统通知与官方公告 | 继续不获得逐条 Reaction |
| 切换 Thread 或消息被卸载 | 关闭表情面板，清除 UI 目标，不把 Reaction 加到新 Thread |

同一用户可以给同一消息添加多个不同 Emoji；同一用户对同一 Emoji 只有一条选择，重复操作即取消。首版继续展示聚合人数；如果 Adapter 能提供允许展示的成员名称，可在胶囊悬浮或聚焦说明中显示简短名单。

## 8. Module、Interface 与 Seam

建议让 `MessageReactionModule` 保持一个小 Interface，页面只发送目标和 Reaction Key：

```ts
type MessageReactionTarget = Readonly<{
  threadId: string;
  messageId: string;
}>;

interface MessageReactionModule {
  getView(target: MessageReactionTarget, actorId: string): MessageReactionView;
  toggle(target: MessageReactionTarget, actorId: string, reactionKey: string): Promise<MessageReactionResult>;
}
```

Module 内部隐藏以下 Implementation：

- Reaction Key 校验、Unicode 序列规范化、幂等切换和撤回/只读限制。
- 快捷项、聚合计数、本人状态和失败回滚的投影。
- 未来生产 Message Adapter 的提交与 Receipt 映射。

表情集合由共享的 `MessageEmojiCatalog` Module 维护，Composer 与 Reaction 面板都消费同一份 Unicode Emoji，但发出不同命令：

```text
MessageEmojiCatalog
        ├── Composer：完整集合与媒体能力 → insertIntoDraft / addMediaDraft
        └── Reaction 面板：unicodeEmoji → toggleReaction(target, reactionKey)
```

这让当前 Unicode Emoji 集合和网格视觉只维护一次，同时避免两个 Surface 互相读取私有状态。Reaction 面板只消费 `unicodeEmoji`，不感知 Composer 的最近记录、收藏、贴纸、自定义图片或文本回应。当前先使用一个固定目录；只有未来出现真实的第二数据源时，才为它建立 Adapter Seam。

## 9. 产品范围

本升级适用于共用 `MessageWorkspace` 的三类入口：

1. 教师端一级“消息”入口；
2. 学生端一级“消息”入口；
3. 班级/课程详情进入的固定班级群聊。

适用于普通文字、Emoji、图片、视频、资源和对象卡消息。系统消息、已撤回消息、系统通知详情和官方公告详情不提供新增 Reaction。TeachBuddy Sidecar、DeepSeek Runtime、Composer 贴纸与自定义表情上传不在本次改变范围内。

## 10. 用户 Review 清单

| Review ID | 待确认项 | 当前推荐 |
| --- | --- | --- |
| `RR-01` | 快捷表情 | 首版固定沿用 `👍 / ❤️ / 👏`；后续有使用数据再考虑个性化 |
| `RR-02` | 桌面承载 | 消息悬浮/聚焦时出现紧凑浮动工具条，不再在正文下铺开全部动作 |
| `RR-03` | 简洁表情面板 | 复用当前 Composer 表情面板的视觉和 Emoji 网格；不增加搜索、最近使用、收藏、分类导航或肤色设置 |
| `RR-04` | Reaction 范围 | 面板只提供当前 Unicode Emoji 集合；贴纸、自定义图片、文本回应留在 Composer |
| `RR-05` | 选择行为 | 选择后立即添加/取消并关闭 Picker，不先进入消息草稿 |
| `RR-06` | 已有回应 | “Emoji + 人数”胶囊常驻显示，点击切换本人状态 |
| `RR-07` | 触屏 | 点按消息操作入口显示快捷项；简洁 Emoji 网格使用底部面板，长按只作补充 |
| `RR-08` | 应用范围 | 教师、学生、一级消息和固定班级群共用；系统/官方内容继续排除 |
| `RR-09` | 后续流程 | Review 通过后再更新 Feature Spec、拆 Tickets 并实施 |

## 11. Review 记录

用户于 2026-09-10 确认采用本提案，并补充收敛要求：Reaction 表情面板复用当前聊天 Composer 的视觉效果与 Unicode Emoji 网格，不增加搜索、最近使用、收藏或其他复杂功能。`RR-01`—`RR-09` 全部通过，进入 `To Spec → To Tickets → Implementation`。
