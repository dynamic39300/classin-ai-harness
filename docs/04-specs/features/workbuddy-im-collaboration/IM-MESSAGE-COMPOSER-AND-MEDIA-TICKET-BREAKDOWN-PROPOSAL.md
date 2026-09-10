---
title: ClassIn IM 消息输入与媒体 Ticket Breakdown Proposal
status: IMPLEMENTED_ACCEPTED
version: v1.2
date: 2026-09-09
review_gate: PASSED_2026-09-09
publication_status: PUBLISHED_LOCAL_ACCEPTED
---

# ClassIn IM 消息输入与媒体 Ticket Breakdown Proposal

## 依据与范围

本拆分只消费已通过 Review 的 [ClassIn IM 消息输入与媒体 Feature Spec](./IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md)。它把 `IM-MEDIA-001—015` 拆成可独立演示、可在一个新上下文内完成的 tracer-bullet Tickets；不增加新的产品范围。

本项目没有配置外部 Issue Tracker，因此按 `to-tickets` 本地流程在 `.scratch/im-message-composer-media/issues/` 发布一票一文件的 Tickets，并以本页保留获批的依赖图和范围记录。用户已经确认 TR-01～TR-08，并在实机 Review 后验收全部 Implementation。

## 提议的依赖图

```text
IM-MEDIA-T01 图片消息基础纵向闭环
  ├─→ IM-MEDIA-T02 五类表情、收藏与自定义表情
  ├─→ IM-MEDIA-T04 浏览器截图与选区回填
  └─→ IM-MEDIA-T05 视频接收卡与基础播放

IM-MEDIA-T03 群聊 @所有人结构化提及（无逻辑前置）

T01 + T02 + T03 + T04 + T05
  └─→ IM-MEDIA-T06 跨能力、角色与入口收口
       └─→ IM-MEDIA-T07 自动化、视觉、审计与交付记录
```

T01 和 T03 都是可立即开始的 frontier。实际实施优先做 T01，再做 T03，以减少同时修改 Message Domain 和消息工作区造成的冲突；这只是执行顺序，不把代码碰撞误写成产品依赖。

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 建议状态 |
| --- | --- | --- | --- |
| `IM-MEDIA-T01` | 直接选图/粘贴 → 会话草稿 → 图文发送 → 缩略图/摘要 → 大图 Viewer | None | accepted |
| `IM-MEDIA-T02` | 五类表情 → 光标插入/收藏 → 自定义表情 → 作为媒体发送 | T01 | accepted |
| `IM-MEDIA-T03` | 班级群选择 `@所有人` → 与成员组合 → 结构化发送与阅读 | None | accepted |
| `IM-MEDIA-T04` | 屏幕选择 → 捕获 → 选区/RGB → 确认回填 → 使用 T01 发送与查看 | T01 | accepted |
| `IM-MEDIA-T05` | 固定视频卡 → 封面/时长 → 本地基础播放 → 失败恢复 | T01 | accepted |
| `IM-MEDIA-T06` | 媒体与回复/Reaction/置顶/撤回/搜索/翻译兼容，并覆盖角色和入口 | T01–T05 | accepted |
| `IM-MEDIA-T07` | 自动化、可访问性、视觉验收、覆盖矩阵与 Implementation Review | T06 | accepted |

## IM-MEDIA-T01 — 图片消息基础纵向闭环

**What to build:** 用户在普通 IM 中直接选择或粘贴图片，经过统一校验后形成当前会话的媒体草稿；用户可以逐张删除、补充文字并发送。消息时间线展示图片缩略图，会话列表展示 `[图片]` 摘要，点击后可在大图 Viewer 中查看和切换。

**Blocked by:** None — can start immediately.

**Requirements:** `IM-MEDIA-007`、`IM-MEDIA-008`、`IM-MEDIA-009`、`IM-MEDIA-010`、`IM-MEDIA-011`、`IM-MEDIA-INC-01`；覆盖 `ON-CMP-14—16`、`ON-MSG-04—05`。

**Write Set:** Message Domain 的 Attachment Reference；Message Media Interface、Browser Adapter 与 Memory Test Adapter；共享 Composer 的普通 IM 接线；Message Workspace Provider、时间线、Viewer；对应 Domain、契约、Integration 和浏览器测试。

**Status:** accepted

- [x] PNG、JPEG、WebP、GIF 的直接选择和 Ctrl/Cmd+V 粘贴走同一校验路径，混合粘贴不吞文字。
- [x] 4 张、8 MB/张、20 MB/条限制可观察；批量部分失败时保留有效图片和正文。
- [x] 媒体草稿按角色与 Thread 隔离，切换会话可恢复；成功发送只清空当前会话草稿。
- [x] 纯图片和图文都作为一条原子消息提交，不产生半条消息或 Agent Runtime 请求。
- [x] 时间线缩略图、`[图片]` 列表摘要、大图序号、前后切换、关闭/Escape 与焦点恢复可操作。
- [x] Browser 与 Memory Test Adapter 通过同一契约；资源在删除、撤回、Reset 和卸载路径上有明确释放策略。

## IM-MEDIA-T02 — 五类表情、收藏与自定义表情

**What to build:** 用户从“最近、Emoji、教学贴纸、常用回应、我的”五个集合选择内容；Unicode Emoji 插入当前光标而不立即发送，收藏和本地自定义表情可在“我的”中复用，贴纸/自定义表情使用 T01 的媒体链路发送。

**Blocked by:** IM-MEDIA-T01 — 自定义表情和教学贴纸依赖已完成的媒体草稿与发送链。

**Requirements:** `IM-MEDIA-001`、`IM-MEDIA-002`；覆盖 `ON-CMP-03—05`。

**Write Set:** 固定可重置的 Composer Asset Catalog；表情选择 Focus Surface；收藏/自定义状态；自定义图片到媒体草稿的 Adapter 命令；对应单元、Integration 与可访问性测试。

**Status:** accepted

- [x] 5 个集合可以切换，空的“最近/我的”有明确空态，固定 Catalog 可通过 Demo Reset 恢复。
- [x] Unicode Emoji 插入当前光标且保留已输入文字、提及和图片，不再沿用点击即发送固定 `🙂` 的行为。
- [x] 收藏与取消收藏可操作；添加有效自定义图片后可在“我的”中再次选择。
- [x] 自定义图片无效时保留收藏和消息草稿，并显示可恢复错误。
- [x] 点击外部和 Escape 关闭面板，焦点回到 Emoji 触发器或 Composer。

## IM-MEDIA-T03 — 群聊 `@所有人` 结构化提及

**What to build:** 教师和学生在可写班级群的 `@` 候选中选择“所有人”，也能继续选择具体成员；发送后消息保留人类可读文本和稳定 Mention Reference，私聊不显示该候选。

**Blocked by:** None — can start immediately.

**Requirements:** `IM-MEDIA-003`；覆盖 `ON-CMP-09`，深化 `ON-CMP-06—08` 与 `ON-MSG-03`。

**Write Set:** Message Domain 的 Mention Reference 与校验；现有 `@` Picker Catalog；Composer 光标插入；消息写入与阅读 Projection；对应 Domain、Integration 和浏览器测试。

**Status:** accepted

- [x] `@所有人` 只出现在可写班级群，私聊、系统通知、官方公告和只读会话都不可选。
- [x] 教师和学生均可选择；它可以和一个或多个具体成员出现在同一消息。
- [x] Mention Reference 不依赖正文字符串解析；回复摘要和消息气泡仍显示清楚的 `@所有人` 文本。
- [x] 切换 Thread 后候选和未发送 Mention 不串用，键盘选择与 Escape 行为不回归。

## IM-MEDIA-T04 — 浏览器截图与选区回填

**What to build:** 用户从普通 IM Composer 启动截图，由 Browser Adapter 请求选择屏幕、窗口或标签页，捕获一帧后进入选区层；用户可调整选区、查看尺寸/坐标/RGB、取消或确认，确认结果进入 T01 的当前会话媒体草稿而不自动发送。

**Blocked by:** IM-MEDIA-T01 — 截图结果复用已经完成的图片草稿、消息与 Viewer 链路。

**Requirements:** `IM-MEDIA-004`、`IM-MEDIA-005`、`IM-MEDIA-006`；覆盖 `ON-CMP-10`、`ON-CMP-12—16`，为 `ON-CMP-11` 保留 Adapter 能力但不声称完整覆盖。

**Write Set:** Message Media Adapter 的捕获能力；截图模式菜单；捕获权限和错误状态；选区 Focus Surface；Canvas 裁剪与像素信息 Projection；确定性捕获测试 Adapter、Integration 与浏览器能力冒烟。

**Status:** accepted

- [x] 普通截图调用 Browser Adapter；取消、拒绝、不支持和捕获失败都返回原 Composer 并保留全部草稿。
- [x] 选区层支持新建、移动和调整矩形选区，展示暗区、宽高、坐标与 RGB。
- [x] 取消不产生媒体；确认只回填图片草稿，不自动发送，并受 T01 的数量/大小策略约束。
- [x] “隐藏当前窗口”在 Browser Adapter 中显示为不可执行的桌面端能力；测试与覆盖账本保持 `BASELINE_GAP`。
- [x] 系统屏幕 chooser 不成为 CI Gate；确定性 Adapter 覆盖选区与回填的全部可观察行为。

## IM-MEDIA-T05 — 视频接收卡与基础播放

**What to build:** 固定、去标识、可重置的班级场景提供一条视频接收消息；时间线显示封面、播放按钮和时长，会话列表显示 `[视频]`，用户可打开固定本地视频并使用基础播放控制。

**Blocked by:** IM-MEDIA-T01 — 视频沿用 Attachment Reference、媒体解析和 Viewer 的生命周期。

**Requirements:** `IM-MEDIA-012`；覆盖 `ON-MSG-06` 的接收侧范围。

**Write Set:** 视频 Attachment Projection；固定媒体 Fixture 与本地演示资产；时间线视频卡和 Viewer；加载/失败恢复；对应 Domain、Integration 和浏览器测试。

**Status:** accepted

- [x] 视频卡展示可理解的封面、播放动作和时长，列表摘要为 `[视频]`。
- [x] 点击播放打开本地视频并提供浏览器原生基础控制；关闭/Escape 恢复卡片焦点。
- [x] 视频不可加载时保留卡片信息和重试入口，不影响其他消息阅读。
- [x] 本 Ticket 不新增视频选择、发送、转码、上传、下载或模型理解。

## IM-MEDIA-T06 — 跨能力、角色与入口收口

**What to build:** 图片、贴纸、自定义表情、Mention 和视频与现有消息行为形成一致生命周期，并在教师/学生、私聊/班级群、一级消息页/班级沉浸聊天中表现一致；系统通知和官方公告继续只读。

**Blocked by:** IM-MEDIA-T01、T02、T03、T04、T05 — 需要所有用户能力先形成可操作闭环。

**Requirements:** `IM-MEDIA-008`、`IM-MEDIA-013`、`IM-MEDIA-014`、`IM-MEDIA-015`。

**Write Set:** Message Interaction Module；Message Workspace Provider 与各入口 Projection；回复、Reaction、置顶、撤回、搜索、翻译的媒体兼容；角色与会话策略；跨入口 Integration/E2E。

**Status:** accepted

- [x] 图文消息可以回复、Reaction、教师置顶和按现有角色规则撤回；撤回后媒体不可打开。
- [x] 回复安全摘要不会暴露二进制；搜索按文字找到图文消息；翻译只处理文字且不暗示理解图片。
- [x] 私聊与班级群、教师与学生、一级消息与固定班级入口共享实现和可观察结果。
- [x] 系统通知、官方公告、只读和全体禁言状态不开放媒体命令。
- [x] Sidecar 共存、会话切换和草稿恢复没有第四栏、遮挡、串会话或不可达操作。

## IM-MEDIA-T07 — 自动化、视觉、审计与交付记录

**What to build:** 对完整消息输入与媒体模块执行自动化、可访问性和视觉验收，把真实结果映射回 104 项覆盖账本，并形成供用户审阅的 Implementation Review。

**Blocked by:** IM-MEDIA-T06 — 只在全部功能和兼容路径收口后执行最终 Gate。

**Requirements:** `IM-MEDIA-001`、`IM-MEDIA-002`、`IM-MEDIA-003`、`IM-MEDIA-004`、`IM-MEDIA-005`、`IM-MEDIA-006`、`IM-MEDIA-007`、`IM-MEDIA-008`、`IM-MEDIA-009`、`IM-MEDIA-010`、`IM-MEDIA-011`、`IM-MEDIA-012`、`IM-MEDIA-013`、`IM-MEDIA-014`、`IM-MEDIA-015`、`IM-MEDIA-INC-01`。

**Write Set:** 范围内 Domain/Adapter/Integration/E2E/可访问性/视觉验证；覆盖账本；Decision/Traceability；Implementation Review 与必要验收快照。

**Status:** accepted

- [x] 类型检查、Lint、范围内 Unit/Contract/Integration、消息 E2E 和生产构建通过，或准确记录与本范围无关的既有失败。
- [x] 1440×900、900×720 Sidecar 共存和 390×844 视口无横向溢出、遮挡或不可达操作。
- [x] Overlay 名称、Tab 顺序、Escape、焦点恢复和 Axe 严重/关键问题通过。
- [x] 真实文件选择/粘贴至少有一次浏览器证据；系统截图 chooser 按 Spec 的非 CI Gate 处理。
- [x] 104 项矩阵只更新已被证据证明的条目；`ON-CMP-11` 继续保留 `BASELINE_GAP`。
- [x] 形成逐项 Implementation Review，列明完成、部分完成、风险与后续 Native/Production Adapter Gate。

## Tickets Review Record

用户在对话中确认全部拆票决定并授权继续开发，TR-01～TR-08 因此全部归一为已确认。

| Review ID | 需要审核的拆票决定 | 当前提案 | 你的审阅 |
| --- | --- | --- | --- |
| `TR-01` | T01 粒度 | 用一票完成直接选图/粘贴到图片消息和 Viewer 的第一条完整纵向链。 | ✅ 已确认 |
| `TR-02` | T02 粒度与依赖 | 表情、收藏、自定义表情合并一票；因贴纸/自定义复用媒体链，所以依赖 T01。 | ✅ 已确认 |
| `TR-03` | T03 独立性 | `@所有人` 不依赖媒体，可独立开始；实施时排在 T01 后只是为了减少文件冲突。 | ✅ 已确认 |
| `TR-04` | T04 粒度与边界 | 浏览器截图、选区、错误和回填一票；原生隐藏窗口保持后续 Gate。 | ✅ 已确认 |
| `TR-05` | T05 视频范围 | 视频接收卡和本地基础播放一票，不混入视频发送与文件传输。 | ✅ 已确认 |
| `TR-06` | T06 收口票 | 用独立一票验证现有消息能力、角色、入口和 Sidecar 共存，不把兼容性分散遗漏。 | ✅ 已确认 |
| `TR-07` | T07 最终 Gate | 自动化、视觉、可访问性、覆盖矩阵和 Implementation Review 在最终一票完成。 | ✅ 已确认 |
| `TR-08` | 整体图与发布方式 | 采用 7 票依赖图；审核通过后发布到本地一票一文件 tracker，再按 frontier 实施。 | ✅ 已确认 |

## 本阶段完成条件

- 用户已确认 7 票粒度、T01/T03 双 frontier 和其余阻塞边。
- `TR-01—08` 已全部形成明确结论。
- 本地 Tickets 已发布、实现并通过用户验收。

## Implementation Record

`IM-MEDIA-T01—T07` 已全部实现并通过用户验收。范围内代码、自动化、三视口视觉和 104 项覆盖账本证据见 [IM 消息输入与媒体 Implementation Review](./IM-MESSAGE-COMPOSER-AND-MEDIA-IMPLEMENTATION-REVIEW.md)。`ON-CMP-11` 按获批边界继续保持 `BASELINE_GAP`。
