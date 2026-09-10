---
title: ClassIn IM 消息输入与媒体 Implementation Review
status: USER_ACCEPTED
version: v1.2
date: 2026-09-10
spec: IM-MESSAGE-COMPOSER-AND-MEDIA-FEATURE-SPEC.md
tickets: IM-MEDIA-T01—T07
review_gate: PASSED_2026-09-09
---

# ClassIn IM 消息输入与媒体 Implementation Review

## 2026-09-10 固定视频素材修正

“高二物理 3 班”的碰撞实验消息曾错误复用 TeachBuddy 头像循环视频，导致封面与实际播放内容不一致。现已替换为独立、固定、去标识的 5 秒 H.264 实验动画：两辆等质量小车演示一维弹性碰撞，并标注碰撞前后速度与总动量。集成测试固定校验该消息只能指向 `/media/momentum-collision-experiment.mp4`，避免再次回退到品牌头像素材。

## Review 结论

已按获批的 Feature Spec 和 7 张本地 Ticket 完成普通 IM“消息输入与媒体”纵向模块。教师和学生现在可以在班级群或私聊中选择、粘贴、预览和发送图片；使用五类表情、收藏与自定义表情；在可写班级群发送结构化 `@所有人`；通过浏览器截图并裁剪回填；阅读图片缩略图、大图 Viewer 和固定视频接收卡。媒体继续属于普通 Message Domain，不会触发 TeachBuddy Agent Runtime，也不依赖视觉模型 API Key。

本轮把 104 项基线账本从 **17 MATCHED / 34 PARTIAL / 49 MISSING** 更新为 **32 MATCHED / 30 PARTIAL / 38 MISSING**，`ADAPTED=2`、`CONFLICT=2` 保持不变。`ON-CMP-11`“截图时隐藏当前窗口”仍明确保留为 `MISSING · BASELINE_GAP`。

## 用户验收记录

用户已完成实机 Review，并在 2026-09-09 对 `IR-MEDIA-01—10` 全部确认无问题。本表归一为最终验收记录。

| 审阅 | Review ID | Feature | 建议操作与应看到的结果 | 对应基线 |
| --- | --- | --- | --- | --- |
| ✅ | `IR-MEDIA-01` | 选图、粘贴与图片草稿 | 点击“图片”选择 PNG/JPEG/WebP/GIF，或复制图片后在输入框 Ctrl/Cmd+V；草稿显示缩略图和删除动作，正文不丢失。 | `ON-CMP-14—16`、`ON-MSG-04` |
| ✅ | `IR-MEDIA-02` | 校验、纯图片与图文发送 | 验证最多 4 张、8 MB/张、20 MB/条；有效图片在批量部分失败时保留；纯图片和图文均只生成一条普通 IM 消息。 | `ON-CMP-14—16` |
| ✅ | `IR-MEDIA-03` | 五类表情与“我的” | 打开“最近 / Emoji / 教学贴纸 / 常用回应 / 我的”；Emoji 插入光标，收藏可取消，自定义图片进入“我的”，贴纸作为图片草稿发送。 | `ON-CMP-03—05` |
| ✅ | `IR-MEDIA-04` | 结构化 `@所有人` | 在教师端和学生端可写班级群选择 `@所有人`，再选择具体成员；气泡保留可读文本和稳定 Mention Reference。私聊、系统、官方和只读会话不提供该候选。 | `ON-CMP-06—09`、`ON-MSG-03` |
| ✅ | `IR-MEDIA-05` | 浏览器截图与裁剪 | 附件菜单选择“截图”，从浏览器系统选择屏幕/窗口/标签页；选区可新建、移动、四角调整并显示坐标、尺寸、RGB；取消保留草稿，确认只回填不发送。 | `ON-CMP-10`、`ON-CMP-12—16` |
| ✅ | `IR-MEDIA-06` | 图片消息与大图 Viewer | 发送后时间线显示缩略图、列表显示 `[图片]`；点击可查看序号、前后切换和加载失败重试；关闭或 Esc 后焦点回到原缩略图。 | `ON-MSG-04—05` |
| ✅ | `IR-MEDIA-07` | 视频接收与本地播放 | “高二物理 3 班”固定消息显示课堂封面、文件名、播放按钮和 0:05 时长；点击打开带浏览器基础控制的媒体 Viewer。 | `ON-MSG-06` |
| ✅ | `IR-MEDIA-08` | 与现有消息能力兼容 | 图文消息可回复、Reaction、教师置顶、按现有规则撤回和按文字搜索；撤回后图片不可打开；翻译只处理文字。 | `IM-MEDIA-013` |
| ✅ | `IR-MEDIA-09` | 角色、入口、布局与隔离 | 教师/学生、私聊/班级群、一级消息/固定班级入口共享行为；系统和官方保持只读；900px Sidecar 共存，390px 固定班级页无横向溢出；普通图片不进入 Agent。 | `IM-MEDIA-014—015`、`IM-MEDIA-INC-01` |
| ✅ | `IR-MEDIA-10` | 原生能力边界 | “隐藏当前窗口”可见但不可执行，并说明需要桌面端能力；视频发送、转码、生产上传和云盘不在本模块中。 | `ON-CMP-11 BASELINE_GAP` |

## Ticket 完成情况

| Ticket | 完成结果 | 主要证据 |
| --- | --- | --- |
| `IM-MEDIA-T01` | 完成 | `MessageMediaAdapter`、会话媒体草稿、文件/粘贴、策略校验、原子消息、缩略图与 Viewer。 |
| `IM-MEDIA-T02` | 完成 | 五类 Catalog、最近记录、收藏/取消收藏、自定义表情和教学贴纸。 |
| `IM-MEDIA-T03` | 完成 | `MessageMentionRef`、师生 `@所有人`、成员组合、会话与权限隔离。 |
| `IM-MEDIA-T04` | 完成且保留一项 Native Gate | Browser `getDisplayMedia`、Canvas 选区/RGB/裁剪、Memory 确定性捕获；隐藏当前窗口保留 Gap。 |
| `IM-MEDIA-T05` | 完成 | 固定去标识视频卡、课堂封面、时长、本地 Viewer 控制和失败重试。 |
| `IM-MEDIA-T06` | 完成 | 回复、Reaction、置顶、撤回、搜索、文本翻译、角色/入口/只读和 Sidecar 共存。 |
| `IM-MEDIA-T07` | 完成待用户验收 | 自动化、Axe、三视口视觉、覆盖账本、Decision 和本 Review 已落库。 |

## 架构与实现证据

- Domain：`src/domain/message/message-media.ts` 定义媒体、提及、列表/回复摘要；`src/domain/message/message.ts` 负责附件与 Mention 的原子消息生命周期。
- Interface：`src/contracts/message/message-media.ts` 是无 React、DOM 和浏览器依赖的 `MessageMediaAdapter` 契约。
- Adapter：`src/features/message-media/message-media-adapter.ts` 提供 Browser Adapter 与 Memory Test Adapter，隐藏文件读取、运行期媒体引用、屏幕捕获、Canvas 裁剪和引用释放。
- UI：`MessageEmojiPicker.tsx`、`MessageScreenCaptureDialog.tsx`、`MessageMediaViewer.tsx` 作为 Focus Surface；`MessageWorkspace.tsx` 只编排状态和用户意图。
- 隔离：普通 IM 只调用 Message Workspace Store；未复用 TeachBuddy 的视觉模型路由、Agent Session、BFF 图片编码或错误恢复状态。
- 响应式：沉浸消息模式在窄视口解除全局 800px 最小宽度，Conversation Grid 和 Composer 使用可收缩列；其他 ClassIn 页面保留原有桌面约束。

## 自动化与视觉证据

| Gate | 结果 | 证据 |
| --- | --- | --- |
| ESLint | `PASS` | `npm run lint` |
| TypeScript | `PASS` | `npm run typecheck` |
| Domain / Adapter / Composer / Integration | `PASS` | 5 个文件、43 项 Vitest；覆盖限制、纯媒体、粘贴、师生组合 Mention、确定性截图、视频及消息兼容。 |
| 媒体关键浏览器链路 | `PASS` | Playwright `teacher sends and manages a class message @a11y`；真实文件输入、浏览器 Paste Event、发送、Viewer、焦点恢复、隐藏窗口禁用和范围内 Axe 均通过。 |
| Production build | `PASS_WITH_WARNING` | `npm run build`；2399 modules，只有已有的 Vite chunk-size warning。 |
| 1440 × 900 | `PASS` | 无页面横向/纵向溢出；五类表情 Focus Surface 与 Sidecar 并存。截图：[desktop-emoji](../../../../prototype/exports/im-message-media/desktop-emoji.png)。 |
| 900 × 720 | `PASS` | 无页面横向/纵向溢出；Sidecar 使用覆盖层，附件菜单和 Composer 可达。截图：[sidecar-compact](../../../../prototype/exports/im-message-media/sidecar-compact.png)。 |
| 390 × 844 | `PASS` | 学生固定班级入口无页面横向/纵向溢出；视频卡、消息和 Composer/发送按钮完整可达。截图：[narrow-student](../../../../prototype/exports/im-message-media/narrow-student.png)。 |
| Overlay 键盘 | `PASS` | 表情面板 Esc/焦点恢复；截图和 Viewer 初始焦点、Tab 焦点约束、Esc 与返回触发器已实现并测试。 |

## 全量回归现状

`tests/e2e/message-workspace.spec.ts` 全文件当前结果为 **18 passed / 14 failed**。本次新增的媒体关键用例通过；14 项失败保留为既有消息/Sidecar 回归债务，主要原因是：

1. 多个旧用例仍把“高二物理 3 班”假设为默认会话，但当前业务数据首项已改为“语文大课堂-马老师”；
2. Sidecar 旧用例仍查找已被新版同源 Agent 体验替换的欢迎文案和“生成消息草稿”按钮；
3. 少量旧窄屏/导航断言使用已经不唯一的 `TeachBuddy` Locator，或假设旧默认消息高度足以发生滚动；
4. E2E 启动器尝试重复占用已运行的 DeepSeek Harness `127.0.0.1:3080`，产生 `EADDRINUSE` 日志，但媒体关键浏览器用例仍成功完成。

这些失败没有被改写成通过，也没有扩大本模块去重写正在并行演进的 Sidecar 或真实数据场景。后续应单独做 Message E2E 基线重置：显式导航稳定 Thread、按当前 Sidecar Intent 更新断言，并让测试 Harness 复用或隔离端口。

## 明确保留的生产 Gate

- `ON-CMP-11`：浏览器没有能力在系统截图前自动隐藏 ClassIn 当前窗口，需 ClassIn PC Native Adapter。
- 当前 Browser Adapter 使用本地对象 URL，刷新或 Demo Reset 后释放；生产消息需要正式上传、持久引用、鉴权、下载和失效策略。
- 固定视频只验证接收、展示和基础播放；视频选择、发送、转码、上传、下载和模型理解不在范围。
- 系统级屏幕选择器由浏览器/OS 控制，不作为 CI Gate；CI 使用相同 Interface 的确定性 Memory Adapter 验证选区和回填。

## Review Gate

本模块状态为 `USER_ACCEPTED`。`IR-MEDIA-01—10` 已全部通过用户实机 Review；Feature Spec、Tickets 与本 Review 同步归档，下一组进入“班级公告、重要提醒与 @我的” To Spec。
