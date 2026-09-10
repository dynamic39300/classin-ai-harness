---
title: ClassIn IM 消息生产生命周期与治理收口 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
parent: IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md
baseline_ids: ON-IA-09, ON-MSG-01—15, ON-BUS-03, ON-GOV-01—11, INCREMENT_MESSAGE_DELIVERY
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 消息生产生命周期与治理收口 Feature Spec

## Problem Statement

当前页面在点击发送后直接调用 `appendLocalMessage` 并提示“已发送”，本地数组追加被误当作交付成功；历史分页直接切割 `olderEntries`，没有 Cursor、错误或幂等语义；只读状态主要由页面 Prop/禁言布尔值决定。这样的 Demo 能验证布局，不能验证生产消息接口必须处理的提交、送达、失败恢复、版本冲突、断线和会话访问变化。

## Solution

建立 `MessageLifecyclePort` 深模块，把生产会变化的传输、分页、连接和访问事实放到可替换 Adapter 后：

- 发送先创建带稳定 `clientRequestId` 的本地 `sending` Message，再由 Port 返回 `MessageDeliveryReceipt` 或结构化失败。
- 同一 `clientRequestId` 重试保持幂等；成功回执记录服务端消息引用、Thread Version、接受时间与 `sent/delivered/read` 证据。
- `offline/transient` 提供原消息就地重试；`version-conflict` 先同步最新 Thread Version 再用同一请求重试；`permission-denied/thread-read-only` 不提供无效重试。
- 连接中断显示会话内 Banner；重新连接只恢复链路，不自动重复发送失败消息，由用户显式重试。
- 历史通过不透明 Cursor 分页；加载、错误、重试、耗尽和去重显式，prepend 保持阅读锚点。
- Port 返回每个角色/Thread 的 `write/read-only/unavailable` 访问状态。被移出或班级结束后保留已授权历史与群文件阅读，Composer 和修改动作关闭。
- 固定 Scenario 增加好友通过、成员加入、班级改名事件和一个只读历史群，用于验证治理投影。
- 默认 Memory Adapter 只证明完整状态机和替换 Seam，所有回执标为 `SIMULATED`；不宣称已连接生产消息、Push、身份、权限或存储服务。

## Requirements

| ID | Feature | 可观察验收结果 |
| --- | --- | --- |
| `IM-LIFE-001` | 稳定提交请求 | 每次用户提交生成一个稳定 `clientRequestId`、目标 Thread、期望版本和完整消息 Snapshot。 |
| `IM-LIFE-002` | Optimistic Message | 提交后立即显示 `正在发送`，并保留文字、媒体、资源、回复、提及和对象卡。 |
| `IM-LIFE-003` | 交付回执 | 成功后显示 `已发送/已送达/已读` 中有证据的状态，并保存服务端引用与 Thread Version。 |
| `IM-LIFE-004` | 幂等重试 | 同一失败消息重试复用原 `clientRequestId`；重复成功请求返回同一 Receipt，不产生第二条消息。 |
| `IM-LIFE-005` | 可恢复失败 | 离线/暂时失败显示原因和“重新发送”；消息内容留在原位。 |
| `IM-LIFE-006` | 版本冲突 | 冲突显示“同步并重试”，先读取最新版本再提交；不同步不能伪造成功。 |
| `IM-LIFE-007` | 不可恢复失败 | 权限拒绝/只读状态显示原因且不显示无效重试。 |
| `IM-LIFE-008` | 离线与重连 | 离线 Banner、重新连接中、恢复结果可见；重连不自动重复发送。 |
| `IM-LIFE-009` | Cursor 历史 | 更早消息经不透明 Cursor 加载，支持 loading/error/retry/exhausted 和 ID 去重。 |
| `IM-LIFE-010` | 阅读锚点 | prepend 历史后保持当前阅读位置；正在看历史时新消息不抢滚动。 |
| `IM-LIFE-011` | 会话访问 | UI 使用 Port 的 `write/read-only/unavailable`，不能只根据角色字符串推断。 |
| `IM-LIFE-012` | 被移出后保留 | 固定历史群以“已退出班级”只读显示，历史、群资料和群文件仍可查看，发送/回复/Reaction/置顶/撤回关闭。 |
| `IM-LIFE-013` | 治理系统事件 | 好友通过、成员加入和班级改名用系统消息表达，不占用教师/学生消息身份。 |
| `IM-LIFE-014` | 跨消息类型 | 文本、表情、图片、资源、回复、Mention、名片在同一提交流程中保持原子 Snapshot。 |
| `IM-LIFE-015` | Agent 隔离 | 班级/私聊 Agent 的授权和回复状态继续由 Agent Module 拥有；用户消息交付状态不吞掉 Agent 失败。 |
| `IM-LIFE-016` | 响应式与可访问性 | 1440/900/390 状态可读，恢复按钮键盘可达，Axe 无 serious/critical 违规。 |

## Interface / Seam

```ts
interface MessageLifecyclePort {
  getConnection(): MessageConnectionSnapshot;
  reconnect(): Promise<MessageConnectionSnapshot>;
  getThreadAccess(role: AppRole, threadId: string): MessageThreadAccess;
  getCurrentThreadVersion(threadId: string): number;
  submit(request: MessageSubmitRequest): Promise<MessageSubmitResult>;
  syncThread(threadId: string): Promise<MessageThreadSyncResult>;
  getInitialHistoryCursor(threadId: string): string | null;
  loadHistory(request: {
    role: AppRole;
    threadId: string;
    cursor: string;
    limit: number;
  }): Promise<MessageHistoryPage>;
}
```

`MessageLifecyclePort` 是 Message Domain 对传输/存储/权限系统的窄接口。页面只投影稳定联合状态；HTTP/WebSocket、鉴权 Token、数据库结构、服务端事件和供应商错误不能越过 Adapter 进入组件。Message Content Snapshot 使用现有 Domain 类型，不复制图片、资源、名片或 Mention 规则。

## State Model

```text
draft → sending → sent → delivered → read
             ├→ failed.offline/transient → sending (same idempotency key)
             ├→ failed.version-conflict → sync → sending (same key)
             └→ failed.permission/read-only (terminal)

connected → offline → reconnecting → connected | offline
history.idle → loading → ready(hasMore|exhausted) | error → loading
access.write → read-only | unavailable
```

## Testing Decisions

- Domain：合法状态投影、失败动作、幂等 ID、Receipt 更新、历史去重。
- Adapter：成功/重复、offline→reconnect、transient retry、conflict sync、read-only、Cursor。
- Integration：新消息状态、失败重试、冲突恢复、历史分页、已退出群只读保留、系统事件。
- E2E/Axe/Visual：默认交付、固定失败恢复、只读历史群和三视口。

## Out of Scope

- 真实 ClassIn Message API、WebSocket、Push、身份 Token、服务端数据库、文件上传和跨设备同步。
- 在线成员已读明细、精确群消息送达人数、撤回时限及管理员权限矩阵；只有 Receipt 提供的证据才展示。
- 解决 `ON-GOV-02/07` 临时教室创建权限冲突；该项仍需单独产品决定。
- 把本地 Memory Adapter 的成功回执写成生产完成。

## Stage Review Record

本规格把最后阶段限定为“生产语义状态机 + 可替换 Port + 固定可恢复场景”，不接通未提供的线上服务，也不静默解决临时教室权限冲突。实现已按 `IM-LIFE-T01—T06` 完成并通过自审；自动化、视觉、覆盖和生产 Gate 见 `IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-IMPLEMENTATION-REVIEW.md`。
