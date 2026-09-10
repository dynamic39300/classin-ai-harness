---
title: ClassIn IM 群文件与群资料 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
parent: IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md
baseline_ids: ON-E-09/11, ON-IA-09/12, ON-CMP-17/20—21, ON-MSG-07—08, ON-BUS-15—16, ON-GOV-03/05—06
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 群文件与群资料 Feature Spec

## Problem Statement

现有“群文件”入口已经能打开资源面板并引用固定资源，但 Repository 忽略 `threadId/classId`，导致不同班级看到同一份文件；“成员”入口仍只返回 Placeholder。用户通过 PC-06/PC-07 确认：保留当前资源 Focus Surface 和班级返回路径，资源按当前会话/班级隔离；补同屏基本群资料，用临时覆盖面板承载，不增加常驻第四栏。上传、下载及完整管理本轮可继续占位。

## Solution

将现有资源检索 Seam 收紧为会话作用域 Repository，并建立纯 `MessageGroupProfile` 投影：

- 固定资源记录显式绑定 `threadId` 或 `classId`；Repository 先做可见范围过滤，再执行名称/类型搜索。
- “群文件”及头部资源入口复用同一个 Focus Surface，标题明确当前群；结果展示来源、格式、大小、更新时间和 `SIMULATED` 真值标签。
- 已引用资源保留按 Thread 的 Composer 草稿，允许移除、纯资源发送和消息文件卡阅读；同一资源不会重复加入，最多引用 10 项。
- “群资料”从会话菜单打开右侧临时覆盖面板，展示群名、班级号、班主任/当前身份、成员总数、可见成员、公告摘要、免打扰/禁言状态与“进入班级”。
- 教师和学生只看到 Class Domain 对当前角色可见的班级事实；成员管理、改群名、群文件上传/删除、真实下载均保留明确边界。
- 关闭按钮和 Escape 可关闭 Focus Surface 并把焦点归还触发器；窄屏覆盖当前会话正文，不制造文档横向滚动。

## Requirements

| ID | Feature | 可观察验收结果 |
| --- | --- | --- |
| `IM-GRP-001` | 资源范围隔离 | 不同 Thread/Class 搜索只返回绑定到该会话或班级的固定资源。 |
| `IM-GRP-002` | 群文件入口 | 班级菜单“群文件”和头部资源按钮打开同一个 Focus Surface，并显示当前群名。 |
| `IM-GRP-003` | 检索与元数据 | 可按名称、文档/图片/课件/链接过滤，结果显示来源、扩展名、大小和更新时间。 |
| `IM-GRP-004` | 引用草稿 | 资源可加入当前 Thread 草稿、去重、移除；最多 10 项，切换 Thread 不串草稿。 |
| `IM-GRP-005` | 发送与阅读 | 纯资源或文本加资源可发送，消息卡和最近摘要可读；真实下载不伪造。 |
| `IM-GRP-006` | 群资料入口 | 班级会话菜单提供“群资料”，打开临时覆盖面板，不新增常驻第四栏。 |
| `IM-GRP-007` | 基础资料 | 面板展示群名、班级号、班主任、当前身份、人数及可见成员角色。 |
| `IM-GRP-008` | 班级状态 | 公告摘要、通知/禁言状态和最近更新时间可读；状态来自既有 Class/Message Domain。 |
| `IM-GRP-009` | 班级连接 | “进入班级”进入当前角色的既有班级详情，保持群聊与班级双向连接。 |
| `IM-GRP-010` | 角色边界 | 学生可查看资料和引用已有资源；上传、删除、成员管理和生产权限均明确为未接入。 |
| `IM-GRP-011` | 空/加载/错误 | 无资源、加载中、检索失败和班级事实失效均有稳定可恢复表达。 |
| `IM-GRP-012` | 键盘与响应式 | Escape/关闭恢复焦点，1440×900、900×720、390×844 无溢出或不可达动作。 |

## Interface / Seam

```ts
interface ConversationResourceRepository {
  search(request: {
    threadId: string;
    classId?: string;
    query: string;
    kind: MessageResourceKind | 'all';
  }): Promise<readonly MessageResourceRef[]>;
}

type MessageGroupProfile = Readonly<{
  threadId: string;
  classId: string;
  className: string;
  classCode: string;
  memberCount: number;
  members: readonly MessageGroupMember[];
  truthLabel: 'SIMULATED';
}>;
```

Resource Repository 决定资源可见范围，页面不能先拿到全集再自行过滤。`MessageGroupProfile` 只投影现有 Class/Directory Snapshot，不复制班级管理规则；生产成员目录、文件 ACL、存储、传输和审计通过后续 Adapter 替换。

## Testing Decisions

- Domain/Adapter：资源范围、去重、查询、格式投影和群资料可见性。
- Integration：两个班级资源不串、最多 10 项、群资料展示与班级跳转。
- E2E/Axe：教师群文件链、学生群资料链、Escape/focus 和三视口。
- Visual：1440×900 群文件、900×720 群资料、390×844 学生群资料。

## Out of Scope

- 本地文件选择、三类真实云盘、上传、下载、预览、删除、移动、版本、过期、ACL 和审计。
- 修改群名、成员邀请/移除、角色调整、二维码、群设置和生产消息免打扰。
- 恢复线上“聊天/文件/进入班级”三 Tab；当前产品继续使用已确认的 Focus Surface 与班级返回路径。

## Stage Review Record

本规格只实现 PC-06/PC-07 已确认的“会话隔离资源 + 基础群资料覆盖面板”。上传、下载和完整管理显式保留为生产 Gate。经连续实施授权自审后进入 To Tickets 和 Implementation。

## Implementation Acceptance Record

| Requirement | 结果 |
| --- | --- |
| `IM-GRP-001—005` | `PASS_WITH_SIMULATED_REPOSITORY`：Thread/Class 隔离、检索元数据、最多 10 项引用、纯文件发送和文件卡阅读通过。 |
| `IM-GRP-006—009` | `PASS`：群资料覆盖面板、基本资料、成员/公告/状态和班级跳转通过。 |
| `IM-GRP-010—011` | `PASS_WITH_PRODUCTION_GATE`：教师/学生边界和空错态通过；上传、下载、管理与生产权限未接入。 |
| `IM-GRP-012` | `PASS`：Escape/focus、Axe、1440/900/390 和文档无横向溢出通过。 |
