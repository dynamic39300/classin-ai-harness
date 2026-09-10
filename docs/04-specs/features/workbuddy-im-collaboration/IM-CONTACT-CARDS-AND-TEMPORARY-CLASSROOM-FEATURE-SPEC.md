---
title: ClassIn IM 联系人名片与临时教室接收卡 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
parent: IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md
baseline_ids: ON-E-13—14, ON-IA-09, ON-CMP-22—24, ON-MSG-09—13/15, ON-BUS-17—18, ON-GOV-02/07
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 联系人名片与临时教室接收卡 Feature Spec

## Problem Statement

当前附件面中的“名片”和“临时教室”都是文字 Placeholder。用户已通过 PC-03 确认：名片要用固定联系人完成选择、回显、移除、发送和基础资料展开；通过 PC-02 确认：临时教室本阶段只验收收到卡后的进行中、进入和结束体验，创建器及管理角色/学生权限冲突延后。

## Solution

建立普通 IM 的 `MessageObjectCard` 深模块：联系人名片保存最小脱敏 Snapshot 和稳定 `personId/threadId`；临时教室卡保存教室引用、接收时状态、主办人、15 分钟/1V6 等可读参数及定向参与人摘要。联系人选择复用 `MessageDirectoryAdapter` 的角色可见 Snapshot；临时教室进入经 `TemporaryClassroomAdapter` 返回可审计的本地回执。

- 附件面“名片”打开 Focus Dialog，可在最近、好友、组织三个范围搜索并选择固定联系人。
- 已选择名片在 Composer 上方回显，可移除；纯名片或名片加文本都能原子写入当前 Thread。
- 收到的名片卡可展开基础资料，并在目标私聊可见时进入已有私聊。
- 固定 Scenario 提供一张进行中卡和一张已结束卡；进行中显示剩余时间、容量、主办人和参与对象，进入动作得到成功回执；结束卡明确禁用进入。
- 卡片局部“…”只提供已证实的本地信息动作，不补造生产菜单。
- “临时教室”创建入口继续反馈 Placeholder；不得借接收卡静默解决 `ON-GOV-02/07`。

## Requirements

| ID | Feature | 可观察验收结果 |
| --- | --- | --- |
| `IM-OBJ-001` | 固定选人器 | 名片入口打开最近/好友/组织三范围选人器，只展示当前角色可见联系人。 |
| `IM-OBJ-002` | 搜索与多选 | 姓名、关系或组织可搜索；最多 5 人，多选状态明确，可取消。 |
| `IM-OBJ-003` | 回显与移除 | 确认后名片在 Composer 上方回显，单项可移除，切换 Thread 不串草稿。 |
| `IM-OBJ-004` | 名片发送 | 纯名片和图文+名片均可发送；列表摘要显示名片数量。 |
| `IM-OBJ-005` | 名片阅读 | 卡片显示姓名、身份、关系和组织；基础资料展示脱敏 ClassIn 号/手机/邮箱。 |
| `IM-OBJ-006` | 私聊后续 | 资料中的“发消息”只在稳定目标私聊存在且角色可见时可用。 |
| `IM-OBJ-007` | 进行中教室卡 | 显示名称、主办人、15 分钟、1V6、参与人、剩余时间和进入动作。 |
| `IM-OBJ-008` | 已结束教室卡 | 显示结束时间与已结束状态，进入动作禁用且不会伪造成功。 |
| `IM-OBJ-009` | 定向提醒 | 接收卡明确显示本次邀请对象摘要，避免把群内可见误解为全员获邀。 |
| `IM-OBJ-010` | 进入回执 | 进行中卡通过 Adapter 返回成功/已结束/无权限结果，UI 显示对应反馈。 |
| `IM-OBJ-011` | 局部卡片动作 | 卡片“…”提供可解释动作或边界反馈，键盘和 Escape 可达。 |
| `IM-OBJ-012` | 生命周期兼容 | 对象卡支持回复、Reaction、置顶、撤回和最近摘要；撤回后清除卡片内容。 |
| `IM-OBJ-013` | 响应式与空态 | 1440/900/390 可用；选人无结果、目标失效与 Adapter 失败有明确恢复提示。 |

## Interface / Seam

```ts
type MessageObjectCard = MessageContactCard | TemporaryClassroomCard;

interface TemporaryClassroomAdapter {
  enter(role: AppRole, classroomId: string): TemporaryClassroomCommandResult;
  reset(): void;
}
```

`MessageObjectCard` 只保存消息发送时的最小 Snapshot；联系人完整关系和组织事实仍由 Directory Domain 拥有。生产教室实时状态、权限、上课客户端唤起和参与记录由 Adapter 提供，页面不能根据角色字符串自行推断。

## Testing Decisions

- Domain 覆盖预览、联系人 Snapshot、教室状态、撤回和卡片动作规则。
- Integration 覆盖选人→回显→移除→纯卡发送→资料→私聊，以及进行中进入/结束禁用。
- E2E/Axe 覆盖教师名片链与学生接收临时教室链。
- 视觉覆盖 1440×900、900×720、390×844。

## Out of Scope

- 临时教室创建器、命名、成员选择和发布；`ON-CMP-24/ON-BUS-17` 继续 `PARTIAL`。
- `ON-GOV-02/07` 的管理角色/学生创建权限决定。
- 真实联系人目录、完整资料、服务端名片对象、教室实时同步、客户端上课或参与审计。

## Stage Review Record

本规格严格继承 PC-02/PC-03：名片做固定完整闭环，临时教室只做接收体验，创建和权限冲突不进入 Write Set。经连续实施授权自审后，可进入 To Tickets 和 Implementation。

## Implementation Acceptance Record

| Requirement | 结果 |
| --- | --- |
| `IM-OBJ-001—006` | `PASS`：最近/好友/组织选人、搜索、多选、回显、移除、纯卡发送、资料和既有私聊闭环通过。 |
| `IM-OBJ-007—010` | `PASS_WITH_SIMULATED_ADAPTER`：进行中/已结束/定向参与人/进入回执通过。 |
| `IM-OBJ-011/012` | `PASS`：卡片局部动作、回复、Reaction、置顶、撤回和列表摘要共用消息生命周期。 |
| `IM-OBJ-013` | `PASS_WITH_PRODUCTION_GATE`：失效反馈、Axe 和三视口通过；生产目录/教室服务未接入。 |
