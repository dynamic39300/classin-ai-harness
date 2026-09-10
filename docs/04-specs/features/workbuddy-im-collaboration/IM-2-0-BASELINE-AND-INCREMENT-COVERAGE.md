---
title: ClassIn IM 2.0 基线继承与增量覆盖账本
status: ALL_7_STAGES_IMPLEMENTED_SELF_REVIEWED
version: v2.0
date: 2026-09-09
---

# ClassIn IM 2.0 基线继承与增量覆盖账本

## 目的

本账本防止两类问题：升级 IM 时遗漏线上已经存在的基础能力；把已有能力重新包装成新增 Feature。它是产品设计覆盖层，不把全部基线一次性扩大为当前开发 Write Set。

逐项证据、当前实现状态和人工审阅框见 [ClassIn IM 基础功能全集与当前实现差距审计](../../../01-research/IM-BASELINE-FEATURE-INVENTORY-AUDIT.md)。该审计继承 2026-08-30 已经用户校准的 PC 资料基线：2 个外部主入口、14 个内部/消息内入口、104 项线上 Feature 和 9 项明确负向事实。

## 统一状态

| 状态 | 含义 |
| --- | --- |
| `BASELINE` | 线上已存在的用户能力，IM 2.0 必须保留能力目标；允许更换页面承载。 |
| `ADAPTED_BASELINE` | 线上能力目标被保留，但当前设计使用不同入口或交互模型。 |
| `BASELINE_GAP` | 已确认线上存在，当前设计或 Demo 尚未完整表达；必须留在后续 Spec/Ticket 账本。 |
| `BASELINE_CONFLICT` | 当前行为与线上已确认的角色或权限相反；必须先做产品决策。 |
| `INCREMENT` | 线上基线没有，且已由本轮产品要求明确新增。 |
| `NEGATIVE_BASELINE` | 线上明确不支持；不是待继承 Feature。若当前设计新增，必须有显式增量记录。 |

## 基础全集继承范围

| 基线域 | Feature 数 | 2026-08-30 Demo 历史覆盖 | 2026-09-09 当前覆盖 | 当前主要缺口 |
| --- | ---: | --- | --- | --- |
| 会话与信息架构 `ON-IA` | 19 | 8 matched / 6 partial / 2 different / 3 missing | 15 matched / 1 partial / 3 adapted / 0 missing | 真实文件等生产对象的完整最近摘要 |
| 身份关系与对象发现 `ON-REL` | 18 | 0 matched / 5 partial / 13 missing | 13 matched / 5 partial / 0 missing | 生产目录、扩展资料、关系写回、设置细项与真实身份分享 |
| 消息创建与 Composer `ON-CMP` | 24 | 4 matched / 7 partial / 13 missing | 17 matched / 5 partial / 2 missing | 原生截图隐藏、真实文件/云盘与临时教室创建器 |
| 消息格式与阅读 `ON-MSG` | 14 | 2 matched / 1 partial / 11 missing | 12 matched / 2 partial / 0 missing | 真实文件卡的生产传输与预览链 |
| 通知公告与业务动作 `ON-BUS` | 18 | 2 matched / 5 partial / 11 missing | 11 matched / 7 partial / 0 missing | 临时教室创建与生产 Push/Native/文件服务 |
| 角色、权限与生命周期 `ON-GOV` | 11 | 1 matched / 7 partial / 1 missing / 2 conflicts | 6 matched / 3 partial / 0 missing / 2 conflicts | 管理角色与学生的临时教室权限冲突及生产治理细则 |
| **合计** | **104** | **17 matched / 31 partial / 2 different / 52 missing / 2 conflicts** | **74 matched / 23 partial / 3 adapted / 2 missing / 2 conflicts** | **27 项仍有部分缺口、缺失或冲突** |

历史覆盖数字只描述 2026-08-30 的旧 Demo。七个阶段已经补齐消息媒体、公告提醒、通讯录与对象发现、公开课/官方内容、联系人名片/临时教室接收卡、按 Thread/Class 隔离的群文件/群资料，以及稳定提交、回执、失败恢复、Cursor 历史和只读保留。`ON-CMP-11` 原生截图隐藏、生产 Push/Native、真实关系/目录与身份分享仍是 `BASELINE_GAP`；真实文件服务、临时教室创建/权限和生产消息服务继续由对应 Adapter Gate 管理。

## 本轮 7 项增量

| 当前 Requirement | Feature | 与线上 104 项基线的关系 | 分类 | 当前状态 |
| --- | --- | --- | --- | --- |
| `IM2-P2-001` | 私聊/班级/系统/官方四类会话分类 | 深化异构消息列表和注意力组织，不替代公开课或官方内容对象 | `INCREMENT` | Demo implemented |
| `IM2-P2-002` | 沉浸消息布局 | 替代线上班级浮窗及窗口控制的承载模型，保留班级内快速沟通目标 | `ADAPTED_BASELINE + INCREMENT` | Demo implemented |
| `IM2-P2-003` | 引用回复 | 线上 `ON-NEG-02` 明确不支持，本轮显式新增 | `INCREMENT` | Demo implemented |
| `IM2-P2-004` | 消息 Reaction | 线上 `ON-NEG-04/05` 明确无 Reaction/点赞，本轮显式新增 | `INCREMENT` | Demo implemented |
| `IM2-P2-005` | 当前会话聊天记录搜索 | 不等于线上联系人/班级/公开课三类全网搜索，是会话内信息检索新增能力 | `INCREMENT` | Demo implemented |
| `IM2-P2-006` | 当前聊天 + 班级共享资源检索复用 | 深化 `ON-CMP-17—21` 和 `ON-BUS-16`；不能替代真实上传、云盘权限和群文件生命周期 | `BASELINE_DEEPENING + INCREMENT` | Simulated Adapter implemented |
| `IM2-P2-007` | 原文/译文对照 | 不在 104 项 PC 基线中，本轮显式新增 | `INCREMENT` | Simulated Adapter implemented |

## 9 项线上负向事实的处理

| 线上负向事实 | 当前设计处理 |
| --- | --- |
| 无通用单条消息操作菜单 | Part 2 为回复、Reaction、翻译等提供低噪单条消息动作，属于显式升级。 |
| 无回复/引用回复 | `IM2-P2-003` 显式升级。 |
| 无 Thread 子会话 | 当前仍不实现，不得与引用回复混写。 |
| 无 Reaction | `IM2-P2-004` 显式升级。 |
| 无点赞 | 👍 作为 Reaction 选项进入 `IM2-P2-004`。 |
| 无投票 | 当前未进入范围，继续保留为负向基线。 |
| 无 Slack 式 Channel | 当前未进入范围，班级 Thread 不改写为 Channel。 |
| 无会话置顶/免打扰 | 当前 Demo 的消息置顶与私聊免打扰属于既有升级候选，不能称为线上继承。 |
| 当前版本无消息撤回 | 当前 Demo 的撤回属于既有升级能力，保留权限和生产规则 Gate。 |

## 无遗漏 Gate

每个后续 IM Spec/Ticket 必须：

1. 引用一个或多个稳定的 `ON-IA/REL/CMP/MSG/BUS/GOV` ID，或明确标记 `INCREMENT`；
2. 写清角色、渠道、入口、消息对象、权限和完整生命周期；
3. 区分功能目标保留、承载模型调整、局部覆盖、缺失和冲突；
4. 不用 Placeholder、Mock 或资源 Reference 冒充真实设备、云盘、权限、传输和持久化闭环；
5. 把通知公告型消息与会话型 IM 同时纳入设计，但不把公开课、课堂或作业内部功能并入 Message Domain；
6. 验收时同时更新 104 项基线矩阵和增量表，不只检查本轮新增按钮。

## 分阶段实施路线图

104 项基线按 **7 个功能模块**分批关闭；七个阶段现已全部完成，其中“消息输入与媒体”已通过用户验收，其余阶段按整体授权完成自审。因此从当前时点计算还剩 **0 个功能阶段**。每个阶段均保留 To Spec → To Tickets → Implementation 三个 Gate 的可检查记录。

| 功能阶段 | 范围 | 当前状态 |
| --- | --- | --- |
| 1. 消息输入与媒体 | 表情、`@所有人`、图片/粘贴、截图、Viewer、视频接收 | `IMPLEMENTED_ACCEPTED` |
| 2. 班级公告、重要提醒与 `@我的` | 群内固定公告、重要提醒条、个人提及聚合、新消息边界、桌面通知能力边界 | `IMPLEMENTED_SELF_REVIEWED` |
| 3. 通讯录与对象发现 | 新好友、班级、好友、组织目录，最小资料、三类搜索与进入动作 | `IMPLEMENTED_SELF_REVIEWED` |
| 4. 公开课通知与官方内容 | 公开课通知归入系统通知，官方内容归入官方公告，不增加第五类 Tab | `IMPLEMENTED_SELF_REVIEWED` |
| 5. 名片与临时教室 | 固定联系人选人/名片卡；临时教室接收卡、进入与结束态，创建权限另设 Gate | `IMPLEMENTED_SELF_REVIEWED` |
| 6. 群文件与群资料 | 按会话隔离的群资源、文件卡/来源/权限边界、临时基本资料面板 | `IMPLEMENTED_SELF_REVIEWED` |
| 7. 消息生产生命周期 | 稳定提交、送达/已读、历史 Cursor、离线重连、幂等、冲突恢复与被移出群后的只读保留 | `IMPLEMENTED_SELF_REVIEWED` |

本顺序继承用户审计中的点名范围：先完成影响班级重要信息可靠触达的公告与提醒，再推进关系目录及对象型消息，最后收口文件和生产生命周期。各 Stage 均只消费获批的上游 Spec，没有把整个剩余审计池一次性扩大为 Write Set。

## 用户审阅后的阶段 Gate

用户已确认 [IM 基础功能用户审阅意见复核](../../../01-research/IM-BASELINE-USER-AUDIT-REVIEW.md) 中 PC-01～PC-07 的全部范围决定，并授权余下六个模块按同一标准连续实施。每个阶段继续保留以下 Gate 和可检查记录，但无需逐阶段等待用户确认：

1. **To Spec**：只锁定一个模块的用户场景、完整状态、Interface/Seam、证据边界和 Out of Scope；按既定原则完成自审并记录决定。
2. **To Tickets**：把已审阅 Spec 拆成有顺序、Write Set、依赖和完成条件的 Ticket；完成阶段性自审后实施。
3. **Implementation**：按 Ticket 完成纵向闭环和验证，更新本账本对应稳定 ID，并提供独立的 Implementation Review；全部阶段完成后统一交由用户最终 Review。

七个模块均已完成各自的 Spec、Tickets、Implementation 与验收记录。账本继续保留 27 项生产接入、非核心局部能力或独立权限决策；这些条目不属于本轮七阶段未完成工作，也不能被模拟闭环改写为生产就绪。
