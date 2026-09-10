---
title: ClassIn IM 单条消息 Reaction 交互升级 Tickets
status: IM_RXN_01_05_COMPLETED
version: v1.1
date: 2026-09-10
---

# ClassIn IM 单条消息 Reaction 交互升级 Tickets

## 执行顺序

```text
IM-RXN-01 Spec 与共享目录
  └─→ IM-RXN-02 Reaction 纵向闭环
        └─→ IM-RXN-03 焦点、触屏与响应式
              └─→ IM-RXN-04 回归、视觉与记录
                    └─→ IM-RXN-05 Hover 可达性修正
```

## IM-RXN-01 — Spec 与共享 Emoji 目录

**Status:** completed

- [x] 用户已批准 v0.2 设计提案。
- [x] `IM-RXN-001`—`IM-RXN-009`、Write Set 与不变范围已固化。
- [x] Composer 与 Reaction 使用同一 Unicode Emoji 目录，三个快捷项继续属于稳定 Reaction Key。

## IM-RXN-02 — Reaction 纵向闭环

**Blocked by:** IM-RXN-01

**Status:** completed

- [x] 消息工具条提供三个快捷项和“添加表情回应”入口。
- [x] 简洁面板可选择任一当前 Unicode Emoji，并立即添加或取消。
- [x] 已有 Reaction 以常驻胶囊显示，工具条不再承载聚合计数。
- [x] 撤回、系统和只读规则保持有效。

## IM-RXN-03 — 焦点、触屏与响应式

**Blocked by:** IM-RXN-02

**Status:** completed

- [x] Escape、关闭与选择后恢复合理焦点；Thread 切换清理目标。
- [x] 工具条不挤压正文，左右消息和 Sidecar 共存时不溢出。
- [x] 无 Hover/紧凑视口可发现操作入口，Emoji 网格使用底部承载。

## IM-RXN-04 — 回归、视觉与记录

**Blocked by:** IM-RXN-03

**Status:** completed

- [x] Domain、Integration、Reaction 范围 E2E、TypeScript、Lint 与 Build 通过。
- [x] 桌面与紧凑视口完成视觉验收。
- [x] Implementation Review、README 与 Traceability 记录最终证据和生产边界。

## IM-RXN-05 — Hover 可达性修正

**Blocked by:** IM-RXN-04

**Status:** completed

- [x] 用真实鼠标轨迹复现消息与浮动工具条视觉间距导致的 Hover 丢失。
- [x] 使用透明命中区域连接消息与工具条，保持既有布局和视觉间距。
- [x] 本人消息、他人消息及打开完整 Emoji 面板的 Chromium 回归通过。
