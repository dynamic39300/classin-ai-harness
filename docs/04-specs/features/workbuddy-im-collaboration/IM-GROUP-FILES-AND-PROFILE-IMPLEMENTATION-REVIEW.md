---
title: ClassIn IM 群文件与群资料 Implementation Review
status: SELF_REVIEWED
version: v1.0
date: 2026-09-09
spec: IM-GROUP-FILES-AND-PROFILE-FEATURE-SPEC.md
tickets: IM-GRP-T01—T05
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 群文件与群资料 Implementation Review

## Review 结论

群文件已形成“当前范围加载 → 名称/类型筛选 → 最多 10 项去重引用 → Composer 移除 → 纯文件/图文发送 → 文件卡阅读”的固定闭环，且不同 Thread/Class 不再共享同一资源全集。群资料通过临时覆盖面板展示基本班级事实、可见成员、公告与消息状态，并连接既有班级详情；没有新增常驻第四栏或伪造管理能力。

104 项账本更新为 **70 MATCHED / 26 PARTIAL / 3 ADAPTED / 3 MISSING / 2 CONFLICT**，仍有 31 项部分缺口、缺失或冲突。

## 功能自审记录

| Review ID | Feature | 结果 |
| --- | --- | --- |
| `IR-GRP-01` | 资源隔离 | Physics 3、Physics 1、English 2 和 Direct 使用独立 Thread/Class 绑定；未知范围返回空。 |
| `IR-GRP-02` | Focus Surface | 头部入口、附件“文件”和群菜单复用；当前群、模拟标签、来源/格式/大小/更新时间可读。 |
| `IR-GRP-03` | 资源草稿 | 按 Thread 保存、去重、最多 10 项、可移除，纯资源可提交。 |
| `IR-GRP-04` | 文件阅读 | 消息卡和最近摘要可读；真实下载、上传和 ACL 未伪造。 |
| `IR-GRP-05` | 群资料 | 群名、班级号、班主任、身份、人数、成员、公告、消息状态和更新时间可读。 |
| `IR-GRP-06` | 角色边界 | 教师/学生均只读取可见 Class Snapshot；学生没有群文件或成员管理动作。 |
| `IR-GRP-07` | 班级连接 | “进入班级”按角色进入既有详情；群聊和班级往返保持。 |
| `IR-GRP-08` | 响应式 | 900 宽时 TeachBuddy 覆盖层为消息头部与下拉菜单让位；390 学生群资料无文档溢出。 |

## 架构证据

- `src/domain/message/im2-basic.ts`：资源草稿去重、10 项上限和格式投影。
- `src/domain/message/message-group-profile.ts`：Class/Directory Snapshot 的群资料纯投影。
- `src/mocks/adapters/message-im2-services.ts`：按 Thread/Class 绑定的固定资源 Repository。
- `src/features/message-workspace/MessageWorkspace.tsx`：群文件与群资料 Focus Surface 编排。
- `src/features/message-workspace/MessageWorkspaceResizableLayout.module.css`：紧凑宽度下头部动作可达。

## 自动化与视觉证据

| Gate | 结果 |
| --- | --- |
| Domain / Adapter / Integration | `PASS`，4 个目标文件、44 项 Vitest。 |
| E2E / Axe | `PASS`，教师群文件/资料、学生窄屏及 900 宽可达性。 |
| TypeScript / Lint / Build | `PASS`；Build 只有既有 chunk size 警告。 |
| Visual | `PASS`，`prototype/exports/im-group-files-and-profile/` 保存 1440×900、900×720、390×844 截图。 |

## 保留 Gate

- 本地文件选择、三类真实云盘、上传/下载/删除/版本/失效/ACL 和审计未接入。
- 修改群名、成员邀请/移除、角色调整与完整群设置未接入。
- 当前 Fixed Repository 与 Snapshot 只验证产品状态；生产服务由消息生命周期阶段已锁定的 Port/Adapter Seam 替换。

## 阶段结果

本阶段状态为 `SELF_REVIEWED`。后续“消息生产生命周期”阶段也已完成，七阶段现已统一收口。
