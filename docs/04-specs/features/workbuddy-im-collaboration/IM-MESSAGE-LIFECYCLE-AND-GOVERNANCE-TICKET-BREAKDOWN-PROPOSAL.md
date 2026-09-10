---
title: ClassIn IM 消息生产生命周期与治理收口 Ticket Breakdown Proposal
status: IM_LIFE_01_06_IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL
---

# ClassIn IM 消息生产生命周期与治理收口 Ticket Breakdown Proposal

## 依赖图

```text
IM-LIFE-T01 Delivery / Access / History Domain + Port
  ├─→ IM-LIFE-T02 Memory Adapter states and receipts
  └─→ IM-LIFE-T03 Provider submit/retry/sync/history orchestration
T02 + T03 → IM-LIFE-T04 Timeline, connection and read-only UI
T04 → IM-LIFE-T05 system events + cross-capability regression
T05 → IM-LIFE-T06 verification, coverage and final review
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-LIFE-T01` | Delivery 联合状态、Submit/Receipt、Access、Connection、Cursor Port | None | completed |
| `IM-LIFE-T02` | Memory Adapter 成功/重复/离线/暂时失败/冲突/只读/历史页 | T01 | completed |
| `IM-LIFE-T03` | Provider optimistic submit、retry、sync、reconnect 和 Cursor 编排 | T01–T02 | completed |
| `IM-LIFE-T04` | Timeline 状态、恢复动作、离线 Banner 和只读历史群 | T03 | completed |
| `IM-LIFE-T05` | 好友/成员/改名事件与文本/媒体/资源/名片/Agent 回归 | T04 | completed |
| `IM-LIFE-T06` | Unit/Integration/E2E/Axe/Visual、104 项账本和总 Review | T05 | completed |

## 完成条件

### IM-LIFE-T01
- [x] 联合状态不能表达同时成功和失败；失败动作由纯函数决定。
- [x] Request/Receipt 含稳定幂等键、Thread Version 与真值标签。
- [x] Access/Connection/History Cursor 使用窄 Port，不依赖 React/DOM。

### IM-LIFE-T02
- [x] 成功与重复请求返回同一 Receipt，不产生重复服务端引用。
- [x] 离线、暂时失败、版本冲突和权限/只读结果可确定注入。
- [x] Cursor 页有稳定顺序、nextCursor、去重输入和耗尽状态。

### IM-LIFE-T03
- [x] Provider 先追加 sending，再按结果更新同一 Message。
- [x] retry 复用原请求；conflict 先 sync；reconnect 不自动 retry。
- [x] 历史加载状态按 Thread 保存，错误可恢复。

### IM-LIFE-T04
- [x] 自己的消息显示有证据的 sending/sent/delivered/read/failed。
- [x] 离线 Banner 与恢复按钮可用，失败消息内容不丢。
- [x] 已退出历史群关闭写操作但保留历史、群文件/资料和班级入口。

### IM-LIFE-T05
- [x] 好友通过、成员加入和班级改名系统事件可读。
- [x] 文本/Emoji/媒体/资源/回复/Mention/名片提交 Snapshot 不回退。
- [x] Agent 授权、处理中和失败状态继续独立。

### IM-LIFE-T06
- [x] Lint、TypeScript、Build、目标 Vitest/Playwright/Axe 通过。
- [x] 1440/900/390 视觉无溢出、遮挡和不可达恢复动作。
- [x] Spec/Tickets/审计/覆盖/决策/README/最终 Implementation Review 回写。
