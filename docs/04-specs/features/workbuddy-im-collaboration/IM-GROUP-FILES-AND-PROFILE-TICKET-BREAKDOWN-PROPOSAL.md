---
title: ClassIn IM 群文件与群资料 Ticket Breakdown Proposal
status: IM_GRP_01_05_IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL
---

# ClassIn IM 群文件与群资料 Ticket Breakdown Proposal

## 依赖图

```text
IM-GRP-T01 Resource scope + Group Profile Domain
  ├─→ IM-GRP-T02 群文件 Focus Surface
  └─→ IM-GRP-T03 群资料临时覆盖面板
T02 + T03 → IM-GRP-T04 角色、键盘与响应式
T04 → IM-GRP-T05 自动化、账本与 Implementation Review
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-GRP-T01` | 资源作用域记录、Repository 过滤和群资料纯投影 | None | implemented |
| `IM-GRP-T02` | 群文件入口 → 检索/筛选 → 最多 10 项引用 → 发送/阅读 | T01 | implemented |
| `IM-GRP-T03` | 群资料入口 → 基本资料/成员/状态 → 进入班级 | T01 | implemented |
| `IM-GRP-T04` | 教师/学生边界、空错态、Escape/focus 和三视口 | T02–T03 | implemented |
| `IM-GRP-T05` | Unit/Integration/E2E/Axe、覆盖账本和 Review | T04 | implemented-self-reviewed |

## 完成条件

### IM-GRP-T01
- [x] 固定资源记录绑定 Thread/Class，Repository 在过滤后返回只读引用。
- [x] 群资料由 Class/Directory Snapshot 纯投影，不在页面重建权限事实。
- [x] 失效 Thread/Class 返回空/不可用状态，不泄漏其它班级数据。

### IM-GRP-T02
- [x] 两个资源入口复用同一个 Focus Surface，显示当前群名和模拟标签。
- [x] 名称/类型、来源、格式、大小、更新时间和空错态可用。
- [x] 引用去重、最多 10 项、按 Thread 保存，发送后进入可读文件卡。

### IM-GRP-T03
- [x] “群资料”打开临时覆盖面板，显示班级号、班主任、身份、人数和成员。
- [x] 公告摘要、通知/禁言状态与更新时间来自既有 Domain。
- [x] “进入班级”导航到当前角色的既有班级详情。

### IM-GRP-T04
- [x] 学生只能查看既有资料/资源；管理、上传、删除和下载不伪造。
- [x] Escape/关闭恢复入口焦点，不依赖 Hover。
- [x] 1440/900/390 无文档溢出、遮挡或不可达操作。

### IM-GRP-T05
- [x] Lint、TypeScript、Build、目标 Vitest/Playwright/Axe 通过。
- [x] Spec/Tickets/覆盖账本/决策账本/README/Review 回写。
- [x] 文件生产生命周期和完整群管理保留 Gate，进入最后治理阶段。
