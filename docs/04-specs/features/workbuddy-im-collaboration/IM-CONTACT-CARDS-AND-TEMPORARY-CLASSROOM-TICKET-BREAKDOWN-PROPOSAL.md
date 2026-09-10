---
title: ClassIn IM 联系人名片与临时教室接收卡 Ticket Breakdown Proposal
status: IM_OBJ_01_05_SELF_REVIEWED
version: v1.1
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL
---

# ClassIn IM 联系人名片与临时教室接收卡 Ticket Breakdown Proposal

## 依赖图

```text
IM-OBJ-T01 Object Card Domain / classroom Adapter
  ├─→ IM-OBJ-T02 联系人选择、草稿与发送
  └─→ IM-OBJ-T03 名片/临时教室阅读与动作
T02 + T03 → IM-OBJ-T04 生命周期、响应式与边界
T04 → IM-OBJ-T05 自动化、账本与 Implementation Review
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-OBJ-T01` | Object Card 类型、预览、最小 Snapshot 与教室进入 Adapter | None | implemented |
| `IM-OBJ-T02` | 最近/好友/组织选人 → Composer 回显/移除 → 发送 | T01 | implemented |
| `IM-OBJ-T03` | 名片资料/私聊，进行中/已结束教室卡与进入回执 | T01 | implemented |
| `IM-OBJ-T04` | 回复/Reaction/置顶/撤回、失效、键盘和三视口 | T02–T03 | implemented |
| `IM-OBJ-T05` | 单元/Integration/E2E/Axe、账本与 Review | T04 | implemented-self-reviewed |

## 完成条件

### IM-OBJ-T01
- [x] Domain 只保存最小联系人/教室 Snapshot，并为最近摘要提供纯函数。
- [x] 教室进入 Adapter 区分成功、结束、不可见和不存在。
- [x] 固定 Scenario 去标识、可重置且不伪装实时状态。

### IM-OBJ-T02
- [x] 名片入口打开最近/好友/组织 Focus Dialog，支持搜索和最多 5 人选择。
- [x] Composer 按 Thread 保存名片草稿，支持移除和纯名片提交。
- [x] 发送后生成稳定卡片，清理当前 Thread 草稿且不影响其它 Thread。

### IM-OBJ-T03
- [x] 名片可展开脱敏基础资料并进入已有可见私聊。
- [x] 进行中卡显示 15 分钟/1V6/参与对象/剩余时间并可获得进入回执。
- [x] 已结束卡禁用进入；局部动作和边界反馈可达。

### IM-OBJ-T04
- [x] 对象卡兼容回复、Reaction、置顶、撤回和列表摘要。
- [x] 无结果、目标失效、Adapter 失败和创建 Placeholder 明确。
- [x] 1440/900/390、键盘、焦点恢复和滚动可用。

### IM-OBJ-T05
- [x] Lint、TypeScript、Build、目标 Vitest/Playwright/Axe 通过。
- [x] Spec/Tickets/覆盖账本/决策账本/README/Review 回写。
- [x] 临时教室创建与 `ON-GOV-02/07` 保持未解决 Gate。
