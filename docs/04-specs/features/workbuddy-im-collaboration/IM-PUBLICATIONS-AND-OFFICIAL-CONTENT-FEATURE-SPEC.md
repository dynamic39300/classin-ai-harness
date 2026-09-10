---
title: ClassIn IM 公开课通知与官方内容 Feature Spec
status: IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
parent: IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md
baseline_ids: ON-E-15—16, ON-IA-03/06/07/09/10, ON-BUS-04—13
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 公开课通知与官方内容 Feature Spec

## Problem Statement

当前四类消息中，“系统通知”只有作业、课堂报告和班级邀请，“官方公告”只有两条通用 Notice。公开课 Domain、列表、详情、邀请和课前检查已经存在，但与消息没有归类、状态卡、跳转和返回链；官方内容也缺来源可识别的图文卡片。用户已通过 PC-05 锁定：公开课业务通知进入“系统通知”，ClassIn 官方内容进入“官方公告”，不新增第五类 Tab；先补来源、卡片、详情和已有业务入口，三类子导航可暂缓。

## Solution

建立 `MessagePublicationModule`，把已有 `OpenCourseRecord` 和固定官方内容 Snapshot 投影为只读消息 Thread：

- 公开课按待开始、直播中、已结束生成系统通知卡，展示教师、时间、席位、课堂位置和明确状态；主动作分别进入详情、课前检查或带课后评价入口的详情。
- 从公开课页返回时保留 `source=notification` 和稳定通知 ID，回到原系统通知，而不是丢到公开课列表。
- ClassIn 助手官方内容在“官方公告”显示来源身份、内容主题、摘要、图文封面语义、发布时间与详情；不增加第五类 Tab，也不把营销内容混入系统业务通知。
- 公开课二维码、In 口令和邮件邀请复用现有邀请面，明确 Demo/外部服务边界。
- 固定数据通过 `MessagePublicationAdapter` 替换；生产通知读取、官方内容发布与已读同步不进入页面规则。

## Requirements

| ID | Feature | 可观察验收结果 |
| --- | --- | --- |
| `IM-PUB-001` | 四类归类 | 公开课只出现在系统通知，官方内容只出现在官方公告；分类仍为四类。 |
| `IM-PUB-002` | 公开课状态卡 | 待开始、直播中、已结束卡显示课程、教师、时间、席位、位置和状态。 |
| `IM-PUB-003` | 公开课业务动作 | 待开始进入详情，直播中进入课前检查，结束进入含课后评价入口的详情。 |
| `IM-PUB-004` | 返回原通知 | 公开课详情/课前检查返回时恢复系统通知和原 Thread。 |
| `IM-PUB-005` | 分享入口 | 教师公开课详情可进入邀请面，看到 Demo QR、In 口令和邮件渠道；不声称真实发送。 |
| `IM-PUB-006` | 官方身份 | 官方内容统一标记“ClassIn 助手 · 官方”，与普通系统业务来源区分。 |
| `IM-PUB-007` | 官方图文卡 | 详情展示主题、封面语义、摘要、正文、发布方和发布时间，列表摘要与内容类型一致。 |
| `IM-PUB-008` | 官方内容集合 | 至少覆盖入门、产品更新和帮助三种固定内容；本阶段不增加二级导航。 |
| `IM-PUB-009` | 已读与检索 | 点击 Thread 只清除该通知未读；当前分类搜索可按课程、教师、官方主题或正文命中。 |
| `IM-PUB-010` | 真值与恢复 | 固定内容有 Demo 标签；角色不可见课程不生成通知；无数据时保留明确空态。 |

## Implementation Decisions

- `MessagePublicationModule` 是 Deep Module，负责角色过滤、状态文案、卡片元数据、动作和分类，不让 `MessageWorkspace` 复制公开课业务规则。
- `MessagePublicationAdapter` 是未来公开课通知与官方内容服务的 Seam；当前固定 Adapter 只返回去标识内容和可重置已读前的初始 Snapshot。
- `OpenCourseRecord` 仍由 Class Domain 拥有。消息只投影稳定 `courseId`、显示 Snapshot 和导航意图。
- 公开课通知与官方内容共用现有只读 Notice Detail，但通过 `presentation` 形成两种清晰卡片语义。
- 三类官方内容本阶段作为三条连续可扫描 Thread 表达；不增加“入门/更新/帮助”二级导航。

## Testing Decisions

- Domain 覆盖角色过滤、四类归类、三种公开课状态、动作与搜索摘要。
- Adapter 覆盖固定内容不可变、重置和缺失数据。
- Integration 覆盖系统通知→公开课→原通知、官方卡片与单项已读。
- E2E 覆盖直播中通知进入课前检查、返回原通知、官方内容卡和 Axe。
- 视觉覆盖 1440×900、900×720、390×844，卡片无溢出且主动作可达。

## Out of Scope

- 公开课多人讨论、第五类消息 Tab、官方内容三类二级导航。
- 真实通知订阅、服务端已读、推送、CMS、富媒体下载或外部链接追踪。
- 真实邮件/二维码/口令发送与扫码解析；当前只展示现有 Demo 入口。
- 课后评价业务本体；本阶段只把结束通知连接到已有详情入口。

## Stage Review Record

PC-05 已由用户确认，余下阶段已获连续实施授权。本规格按四类归类、现有公开课能力复用、官方内容卡与生产 Adapter Gate 完成自审，可进入 To Tickets 和 Implementation。

## Implementation Acceptance Record

| Requirement | 结果 | 实现证据 |
| --- | --- | --- |
| `IM-PUB-001/002` | `PASS` | 三类公开课状态投影到系统通知，官方内容投影到官方公告，四类 Tab 保持不变。 |
| `IM-PUB-003/004` | `PASS` | 公开课详情、课前检查、课后详情动作可达，并携带稳定通知引用返回原 Thread。 |
| `IM-PUB-005` | `PASS_WITH_DEMO_GATE` | 教师邀请面提供 QR、In 口令和邮件三个演示渠道，未声明真实发送。 |
| `IM-PUB-006—008` | `PASS` | 官方身份、三类固定内容、图文封面语义与完整详情可见。 |
| `IM-PUB-009/010` | `PASS_WITH_PRODUCTION_GATE` | 分类搜索、单项已读、角色过滤、空态和三视口通过；生产 CMS、通知与服务端已读保持 Adapter Gate。 |
