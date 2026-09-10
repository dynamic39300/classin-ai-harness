---
title: ClassIn IM 单条消息 Reaction 交互升级 Implementation Review
status: PASS_WITH_UNRELATED_E2E_BASELINE_FAILURES
version: v1.1
date: 2026-09-10
---

# ClassIn IM 单条消息 Reaction 交互升级 Implementation Review

## Outcome

用户批准的两级 Reaction 已完成：桌面端在单条消息悬浮或聚焦时显示紧凑浮动工具条，保留 `👍 / ❤️ / 👏` 三个快捷项；“添加表情回应”打开与 Composer 同视觉的简洁 Unicode Emoji 网格。已添加的 Reaction 以常驻胶囊显示 Emoji、人数和本人选中态。

面板没有搜索、最近使用、收藏、分类、肤色、教学贴纸、自定义图片或文本回应。选择 Emoji 会立即切换当前消息 Reaction 并关闭面板，不进入 Composer 草稿。

桌面工具条与消息之间的视觉间距现由透明命中区域连接。光标从本人或他人的消息移入工具条时，工具条保持可见并可点击；该修正不改变工具条位置、间距或外观。

## Requirement Evidence

| Requirement | Implementation | Verification | Status |
| --- | --- | --- | --- |
| `IM-RXN-001`—`002` | `MessageWorkspace` 浮动工具条、三个快捷项与 `SmilePlus` 触发器 | Integration + Chromium | PASS |
| `IM-RXN-003`—`004` | `MessageReactionPicker`、共享 `MESSAGE_UNICODE_EMOJI` | Domain + Integration + Chromium | PASS |
| `IM-RXN-005` | `reactionSummary / reactionChip` 常驻投影 | Integration + Chromium | PASS |
| `IM-RXN-006` | 绝对定位、单行 Surface、左右消息内向对齐、视觉间距连续命中 | 1440×900 实机视觉 + Chromium 鼠标轨迹 | PASS |
| `IM-RXN-007` | Domain 拒绝系统/撤回消息；目标随 Thread 和消息生命周期清理 | Domain + Integration | PASS |
| `IM-RXN-008` | Dialog 命名、`aria-pressed`、Escape 焦点恢复、触屏省略号入口与底部面板 | Integration + 390×844 Chromium | PASS |
| `IM-RXN-009` | 共用 `MessageWorkspace`，未建立教师/学生分叉 | Integration + existing entry coverage | PASS |

## Module and Locality

- `src/domain/message/message-emoji.ts` 维护当前固定 Unicode Emoji 目录；Composer 和 Reaction 面板共用同一事实。
- `src/domain/message/im2-basic.ts` 将 Reaction Key 扩展到当前 Unicode Emoji，同时保留既有红心快捷项和幂等切换规则。
- `MessageReactionPicker.tsx` 隐藏定位、Portal、外部关闭、Escape 和焦点逻辑；页面只传入目标状态与 `onSelect` 命令。
- `MessageWorkspace.tsx` 只保存一次打开期间的 `threadId + messageId + returnFocusTarget`，消息事实继续由 Provider 和 Domain 拥有。
- `MessageMediaSurfaces.module.css` 复用 Composer 面板的 Surface 与 Emoji 单元；`MessageWorkspace.module.css` 只拥有消息工具条与 Reaction 胶囊布局。

## Interaction Review

桌面 1440×900 自查确认浮动工具条不增加消息高度，也不遮挡当前正文；面板锚定消息工具条并保持在视口内。触屏 390×844 自查后，将最初的“全部工具条常显”收敛为每条消息一个省略号入口，只有当前消息展开动作；Emoji 面板固定在底部安全边距内。

视觉证据：

- `prototype/exports/im-message-reaction-interaction/desktop-toolbar-1440x900.png`
- `prototype/exports/im-message-reaction-interaction/desktop-picker-1440x900.png`
- `prototype/exports/im-message-reaction-interaction/compact-picker-390x844.png`

## Verification

| Check | Result |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS |
| Production build | PASS |
| Full Vitest at 2 workers | 133 files / 836 tests PASS |
| Focused Reaction Domain + Integration | 2 files / 40 tests PASS |
| Focused Chromium: quick/expanded Reaction, touch, affected recall | 3 tests PASS |
| Hover reachability regression: own/incoming message → visual gap → toolbar → picker | 1 test PASS |
| `git diff --check` | PASS |

一次默认高并发的完整消息 E2E 运行中，37 项通过 28 项；其中与本改动直接相关的“撤回按钮需先悬浮”用例已适配并与两个 Reaction 用例一起串行复跑通过。其余失败集中在当前工作区同时修改中的 TeachBuddy Sidecar 文案、教学动态入口、沉浸时序和 Direct Chat 状态，均不在本次 Write Set，本次没有覆盖这些已有修改或放宽断言。

## Production Boundary

当前 Reaction 写入仍是现有本地同步 Store，不代表 ClassIn 生产 Reaction API、跨设备同步或服务端失败恢复已经接入。未来异步 Adapter 需要补充局部提交中、回滚和重试 Projection，但不需要改变本次 Surface 与命令边界。
