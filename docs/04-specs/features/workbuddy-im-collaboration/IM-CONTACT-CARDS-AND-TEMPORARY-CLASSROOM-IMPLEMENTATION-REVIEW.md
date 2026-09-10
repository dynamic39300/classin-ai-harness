---
title: ClassIn IM 联系人名片与临时教室接收卡 Implementation Review
status: SELF_REVIEWED
version: v1.0
date: 2026-09-09
spec: IM-CONTACT-CARDS-AND-TEMPORARY-CLASSROOM-FEATURE-SPEC.md
tickets: IM-OBJ-T01—T05
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 联系人名片与临时教室接收卡 Implementation Review

## Review 结论

联系人名片已完成“固定目录选人 → 多选回显/移除 → 纯卡发送 → 卡片阅读 → 脱敏资料 → 既有私聊”的闭环。临时教室以固定接收卡表达进行中、定向参与对象、15 分钟/1V6、进入回执和已结束禁用态；创建入口继续是明确 Placeholder，`ON-GOV-02/07` 权限冲突没有被接收卡实现掩盖。

104 项账本更新为 **67 MATCHED / 29 PARTIAL / 2 ADAPTED / 4 MISSING / 2 CONFLICT**，仍有 37 项部分缺口、缺失或冲突。

## 功能自审记录

| Review ID | Feature | 结果 |
| --- | --- | --- |
| `IR-OBJ-01` | 选人范围 | 最近、好友、组织三范围和联系人搜索可用，只显示角色可见固定对象。 |
| `IR-OBJ-02` | 名片草稿 | 最多 5 人，多选明确；按 Thread 回显、移除和清理。 |
| `IR-OBJ-03` | 名片发送 | 纯名片和文本加名片原子进入 Timeline，最近摘要可读。 |
| `IR-OBJ-04` | 名片资料 | 展示身份、关系、组织和脱敏 ClassIn 号/手机/邮箱，可进入已有可见私聊。 |
| `IR-OBJ-05` | 进行中教室 | 状态、剩余时间、容量、主办人和定向参与人可见，进入返回本地回执。 |
| `IR-OBJ-06` | 已结束教室 | 结束态可读且进入按钮禁用，不伪造成功。 |
| `IR-OBJ-07` | 消息生命周期 | 对象卡可回复、Reaction、置顶、撤回；撤回清除卡片内容。 |
| `IR-OBJ-08` | 角色与 Agent 隔离 | 卡片只在普通 IM 发送；班级 Agent 目标不接收名片。 |
| `IR-OBJ-09` | 响应式 | 教师/学生全局消息均进入同一沉浸承载；三个视口无文档溢出。 |

## 架构证据

- `src/domain/message/message-object-card.ts`：最小 Snapshot、类型联合、预览和私聊可达规则。
- `src/contracts/message/temporary-classroom.ts`：教室进入 Seam。
- `src/features/message-object-card/temporary-classroom-adapter.ts`：成功、结束、无权限、失效的可重置 Memory Adapter。
- `src/features/message-object-card/ContactCardDialogs.tsx`：固定目录选择和资料 Focus Dialog。
- `src/mocks/scenarios/message-object-cards.ts`：进行中/已结束固定卡与权限记录。

## 自动化与视觉证据

| Gate | 结果 |
| --- | --- |
| Domain / Adapter / Integration | `PASS`，4 个目标文件、45 项 Vitest。 |
| E2E / Axe | `PASS`，名片完整链和临时教室接收卡；同时复核上一阶段公开课链。 |
| Visual | `PASS`，`prototype/exports/im-contact-cards-and-temporary-classroom/` 保存 1440×900、900×720、390×844 截图。 |
| Overflow | `PASS`，三视口 `scrollWidth === innerWidth`。 |

## 保留 Gate

- 临时教室创建器、命名、成员选择和发布继续为 Placeholder。
- 管理角色可创建、学生不可创建的线上权限事实仍与当前入口表达冲突，留待独立决策。
- 联系人和教室均为固定 Snapshot；生产目录、实时课堂状态、客户端唤起和参与审计未接入。

## 阶段结果

本阶段状态为 `SELF_REVIEWED`。下一阶段直接进入“群文件与群资料”的 To Spec；全部阶段完成后由用户统一 Review。
