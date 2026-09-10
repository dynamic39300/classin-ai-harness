---
title: ClassIn IM 公开课通知与官方内容 Ticket Breakdown Proposal
status: IM_PUB_01_05_SELF_REVIEWED
version: v1.1
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL
---

# ClassIn IM 公开课通知与官方内容 Ticket Breakdown Proposal

## 依赖图

```text
IM-PUB-T01 Publication Domain / Interface / fixed Adapter
  ├─→ IM-PUB-T02 公开课系统通知与业务往返
  └─→ IM-PUB-T03 ClassIn 助手官方内容卡
T02 + T03 → IM-PUB-T04 邀请渠道边界与响应式
T04 → IM-PUB-T05 自动化、账本与 Implementation Review
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-PUB-T01` | 官方内容 Snapshot、公开课投影、动作与可替换 Adapter | None | implemented |
| `IM-PUB-T02` | 系统通知状态卡 → 公开课详情/课前检查 → 原通知 | T01 | implemented |
| `IM-PUB-T03` | 官方公告列表 → ClassIn 助手图文详情 | T01 | implemented |
| `IM-PUB-T04` | 分享/邀请边界、空态、搜索、已读和三视口 | T02–T03 | implemented |
| `IM-PUB-T05` | 单元/Integration/E2E/Axe、账本与 Review | T04 | implemented-self-reviewed |

## 完成条件

### IM-PUB-T01
- [x] Domain 纯函数按角色与状态生成系统/官方 Thread。
- [x] Adapter 提供固定、去标识、可重置内容 Snapshot。
- [x] 三类状态、动作和官方来源单元测试通过。

### IM-PUB-T02
- [x] 待开始、直播中、已结束通知可区分。
- [x] 详情/课前检查复用已有路由，返回原系统通知。
- [x] 不可见公开课不产生通知。

### IM-PUB-T03
- [x] ClassIn 助手官方身份稳定可识别。
- [x] 入门/更新/帮助卡有一致列表摘要和详情内容。
- [x] 不增加第五类 Tab 或未获批二级导航。

### IM-PUB-T04
- [x] 教师可从公开课详情进入 QR/In 口令/邮件邀请入口，均有 Demo 边界。
- [x] 分类搜索、单项已读、空态和 1440/900/390 可用。
- [x] 焦点与关闭/返回路径可恢复。

### IM-PUB-T05
- [x] Lint、TypeScript、Build、目标 Vitest/Playwright/Axe 通过。
- [x] 覆盖账本、决策账本、README 和 Implementation Review 回写。
- [x] 生产 CMS/通知/已读/外部分享 Gate 明确。
