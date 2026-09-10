---
title: ClassIn IM 消息生产生命周期与治理收口 Implementation Review
status: SELF_REVIEWED
version: v1.0
date: 2026-09-09
spec: IM-MESSAGE-LIFECYCLE-AND-GOVERNANCE-FEATURE-SPEC.md
tickets: IM-LIFE-T01—T06
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 消息生产生命周期与治理收口 Implementation Review

## Review 结论

普通 IM 已从“本地数组追加即成功”升级为可替换的消息生命周期纵向闭环：用户消息先以稳定 `clientRequestId` 乐观进入 `sending`，再由 `MessageLifecyclePort` 返回模拟回执或结构化失败；离线/暂时失败可就地重试，版本冲突先同步再复用原请求，权限/只读失败不提供无效动作。历史使用不透明 Cursor 分页并去重，退出或结课群保留历史、群文件和群资料阅读，同时关闭 Composer 与消息修改动作。

104 项账本更新为 **74 MATCHED / 23 PARTIAL / 3 ADAPTED / 2 MISSING / 2 CONFLICT**。七个功能阶段全部完成；剩余 27 项属于生产 Adapter、非核心局部能力或独立权限决策，不是本轮未完成的模拟闭环。

## 功能自审记录

| Review ID | Feature | 结果 |
| --- | --- | --- |
| `IR-LIFE-01` | 稳定提交与回执 | `sending → sent/delivered/read` 只按 Receipt 证据投影，保存服务端引用、Thread Version 和 `SIMULATED` 真值。 |
| `IR-LIFE-02` | 幂等与恢复 | 同一失败消息复用原 `clientRequestId`；offline/transient 就地重试，conflict 先同步，重复成功不生成第二条消息。 |
| `IR-LIFE-03` | 连接状态 | 离线、重连中和恢复结果在会话内可见；重连不会自动重复发送失败消息。 |
| `IR-LIFE-04` | Cursor 历史 | loading/error/retry/exhausted 可观察，prepend 按 ID 去重并保持阅读锚点。 |
| `IR-LIFE-05` | 只读保留 | 教师结课群与学生已退出群均保留历史、群资料和群文件；发送、回复、Reaction、置顶和撤回关闭。 |
| `IR-LIFE-06` | 治理事件 | 好友通过、成员加入和班级改名使用系统消息身份。 |
| `IR-LIFE-07` | 跨消息类型 | 文本、Emoji、媒体、资源、回复、Mention 和名片继续使用同一原子 Snapshot。 |
| `IR-LIFE-08` | Agent 隔离 | 普通消息交付只由 Message Module 拥有，班级 Agent 与 TeachBuddy 的授权、运行和失败状态未并入本 Port。 |

## 架构证据

- `src/domain/message/message-lifecycle.ts`：Delivery/Failure/Receipt/Connection/Access 联合类型和恢复动作纯函数。
- `src/contracts/message/message-lifecycle.ts`：提交、同步、Cursor 历史与访问状态的窄 Port。
- `src/features/message-lifecycle/memory-message-lifecycle-port.ts`：可确定注入的幂等回执、断线、冲突、只读和历史页 Adapter。
- `src/features/message-workspace/MessageWorkspaceProvider.tsx`：optimistic submit、retry、sync、reconnect 和历史状态编排。
- `src/features/message-workspace/MessageWorkspace.tsx`：Timeline 状态、恢复动作、离线 Banner、只读群和阅读锚点投影。
- `src/mocks/scenarios/messages.ts`：失败消息、好友/成员/改名事件和只读历史群。

## 自动化与视觉证据

| Gate | 结果 |
| --- | --- |
| TypeScript / Lint | `PASS`。 |
| 全量 Vitest | `PASS`，130 个文件、807 项测试。 |
| Lifecycle Integration | `PASS`，5 项提交、失败恢复、冲突、Cursor 和只读保留测试。 |
| Stage E2E / Axe | `PASS`，媒体/公告/目录/公开课/对象卡/IM 2.0 代表链路 6 项 + Lifecycle 2 项 + 群文件/资料 3 项，共 11 项；serious/critical 为 0。 |
| Build | `PASS`；只有既有大 Chunk 警告。 |
| Visual | `PASS`；`prototype/exports/im-message-lifecycle/` 保存 1440、900、390 视口及只读资料状态。 |

仓库中的完整 `message-workspace.spec.ts` 仍混合 TeachBuddy Sidecar 另一条产品 Track 的历史文案、按钮和默认固定班级假设；当前 Sidecar 已采用教学动态界面，教师默认会话也已切换为授权 DW 真实群聊。本次已从该文件独立执行 6 条普通 IM 代表链路并全部通过，未把 Sidecar 历史断言计入本阶段失败判据。

## 保留 Gate

- 真实 ClassIn Message API、WebSocket、Push、身份 Token、服务端存储和跨设备同步未接入。
- 已读明细、精确送达人数、撤回时限、管理员权限矩阵只能由未来生产 Receipt/Policy 提供。
- `ON-GOV-02/07` 临时教室创建权限冲突按用户审计结论维持当前 Demo，等待独立产品决定。
- Memory Adapter 只证明状态机、错误恢复和替换 Seam，不代表生产 SLA 或数据持久化。

## 阶段结果

本阶段状态为 `SELF_REVIEWED`。IM 基础能力补齐路线图的七个阶段已经全部完成，后续功能阶段数量为 **0**。
