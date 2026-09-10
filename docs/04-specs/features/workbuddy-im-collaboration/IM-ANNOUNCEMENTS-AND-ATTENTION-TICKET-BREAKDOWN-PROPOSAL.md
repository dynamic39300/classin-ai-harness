---
title: ClassIn IM 班级公告与消息提醒 Ticket Breakdown Proposal
status: IMPLEMENTED_SELF_REVIEWED
version: v1.0
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL_SELF_REVIEWED
---

# ClassIn IM 班级公告与消息提醒 Ticket Breakdown Proposal

## 依据与范围

本拆分只消费已完成阶段自审的 [班级公告与消息提醒 Feature Spec](./IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md)，把 `IM-ATTN-001—014` 拆成五张可独立验证的本地 Ticket。用户已授权余下模块按既定设计原则连续实施，因此本阶段不再等待逐项确认；每张票仍保留可检查的完成条件和生产边界。

## 依赖图

```text
IM-ATTN-T01 注意力领域模型与设备通知契约
  ├─→ IM-ATTN-T02 公告与重要提醒
  ├─→ IM-ATTN-T03 @我的与阅读边界
  └─→ IM-ATTN-T04 桌面通知设置与路由

T02 + T03 + T04
  └─→ IM-ATTN-T05 跨入口验证、账本与交付记录
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-ATTN-T01` | 公告/提醒/提及/阅读边界 Projection 与 Desktop Notification Interface | None | implemented-self-reviewed |
| `IM-ATTN-T02` | Class 公告固定条与独立重要提醒，连接既有公告详情 | T01 | implemented-self-reviewed |
| `IM-ATTN-T03` | 班级消息内 `@我的` 聚合、逐项已读、原消息定位和稳定新消息边界 | T01 | implemented-self-reviewed |
| `IM-ATTN-T04` | 显式设备通知授权、测试通知、失败降级与免打扰路由 | T01 | implemented-self-reviewed |
| `IM-ATTN-T05` | 教师/学生与入口收口、自动化、覆盖账本和 Implementation Review | T02–T04 | implemented-self-reviewed |

## IM-ATTN-T01 — 注意力领域模型与设备通知契约

**Requirements:** `IM-ATTN-001—013` 的共享领域语义。

**Write Set:** `src/domain/message/message-attention.ts`、`src/contracts/message/message-attention.ts`、Browser/Memory Notification Adapter 和单元测试。

- [x] 公告、重要提醒、具体成员提及、`@所有人` 和普通置顶具有独立类型与投影规则。
- [x] Mention 去重、优先级、未读数、稳定阅读边界和通知路由均由纯 Domain 函数计算。
- [x] 浏览器设备能力与未来 PC Native/Push 通过同一 Adapter 契约隔离。

## IM-ATTN-T02 — 公告与重要提醒

**Requirements:** `IM-ATTN-001—005`；覆盖 `ON-IA-13—14`、`ON-BUS-01`、深化 `ON-GOV-01/06`。

**Write Set:** Class Domain 到 Message Workspace 的公告桥接、固定提醒 Fixture、Provider 状态、时间线上方注意力 UI。

- [x] 当前有效 Class 公告显示为独立固定条，教师可进入既有公告管理，学生只读查看。
- [x] 重要提醒显示发布者、`@所有人`、正文、来源和关闭动作，并与公告、普通置顶明确区分。
- [x] 关闭提醒只记录当前 Actor 的 dismissal，不改变原消息或其他用户状态。

## IM-ATTN-T03 — `@我的` 与阅读边界

**Requirements:** `IM-ATTN-006—010`；覆盖 `ON-IA-15`、`ON-BUS-02`。

**Write Set:** Message Workspace Store、班级消息入口、Attention Focus Surface、原消息定位和时间线分隔。

- [x] 班级消息内聚合当前角色的直接提及和 `@所有人`，同一消息只生成一项。
- [x] 打开面板不批量清空；定位到原消息后才逐项已读，并可在“全部”中继续查看。
- [x] 普通班级群按稳定 Message Reference 显示“以下为新消息”，不持久化 DOM 位置。

## IM-ATTN-T04 — 桌面通知设置与路由

**Requirements:** `IM-ATTN-011—013`；覆盖 `ON-BUS-03` 的本地能力部分。

**Write Set:** Desktop Notification Adapter、消息设置 Focus Surface、权限与反馈状态。

- [x] 只有用户主动操作才请求授权；界面表达不支持、待授权、已启用、已拒绝和失败。
- [x] 已启用状态可发送测试通知；设备失败不影响站内未读、公告和 `@我的`。
- [x] 当前 Thread 抑制重复提醒；免打扰抑制普通消息，直接提及和 `@所有人` 按当前策略穿透。

## IM-ATTN-T05 — 收口、验证与记录

**Requirements:** `IM-ATTN-014` 及全模块回归。

**Write Set:** Integration/E2E、覆盖矩阵、Decision、Spec/Tickets/Implementation Review。

- [x] 一级消息与固定班级入口共用 Provider 状态；Class 公告通过稳定桥接读取同一事实源。
- [x] 教师和学生权限、关闭提醒、提及定位、新消息分隔及通知设置有自动化证据。
- [x] 生产 Push/Native 通知继续记为 `PARTIAL`，未因 Browser/Memory Adapter 而夸大完成度。

## Implementation Record

`IM-ATTN-T01—T05` 已实现并完成阶段性自审。证据、测试结果、覆盖变化和保留 Gate 见 [Implementation Review](./IM-ANNOUNCEMENTS-AND-ATTENTION-IMPLEMENTATION-REVIEW.md)。
