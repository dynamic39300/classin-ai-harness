---
title: ClassIn IM 基础功能全集与当前实现差距审计
status: USER_AUDITED_ALL_7_STAGES_IMPLEMENTED_SELF_REVIEWED
version: v1.9
date: 2026-09-09
---

# ClassIn IM 基础功能全集与当前实现差距审计

## 结论

本审计把两份事实放在同一张账本里：**2026-08-30 经用户校准的真实 ClassIn PC 截图基线**，以及 **2026-09-09 当前仓库工作树中可运行的 IM Demo**。基线登记了 **2 个外部主入口、14 个内部/消息内入口、104 项线上 Feature 和 9 项明确负向事实**。

当前 104 项实现状态为：**74 项 `MATCHED`、23 项 `PARTIAL`、3 项 `ADAPTED`、2 项 `MISSING`、2 项 `CONFLICT`**。其中 74 项已按基线完整表达，3 项用已审阅的沉浸页/Focus Surface 完成等价承载；其余 **27 项仍有部分缺口、完全缺失或权限冲突**，继续作为生产接入与后续产品决策的审计池。

七个模块已经完成媒体、注意力、关系发现、公开课/官方内容、对象卡、群文件/群资料及消息生产生命周期闭环。最后阶段新增稳定提交、回执、幂等重试、断线恢复、Cursor 历史和退出/结课后的只读保留；生产消息、Push、身份、权限、文件服务、临时教室创建与师生权限冲突继续保留。引用回复、Reaction、当前会话搜索和翻译属于明确新增能力，不应被误算为线上基础能力。

## 证据边界

- 真实 ClassIn 截图基线：`/Users/eeo/Documents/ai-projects/202608-Classin-AI-IM/docs/01-research/im-feature-landscape/02-ONLINE-CLASSIN-IM-FEATURE-INVENTORY.md`。该文档第 11–33 行给出研究结论和范围，第 107–241 行登记 104 项 Feature，第 294–310 行登记 9 项负向事实。
- 旧 Demo 差距基线：`/Users/eeo/Documents/ai-projects/202608-Classin-AI-IM/docs/01-research/im-feature-landscape/03-DEMO-VS-ONLINE-IM-GAP-ANALYSIS.md`。第 25–47 行给出旧 Demo 覆盖统计，第 75–99 行核对 16 个入口，第 103–237 行完成 104 项逐项映射。
- 真实 ClassIn 基线来自 Notion 全文、60 张 PC 截图和用户直接校准；本次没有重新登录生产 ClassIn，也不外推移动端、灰度能力或未公开服务端协议。
- “当前项目”指 2026-09-09 本地工作树的可运行 Demo。`LOCAL_OPERATIONAL`、`MOCK_CLOSED_LOOP` 和 `PLACEHOLDER` 表示 Demo 成熟度，均不代表已接入生产服务。
- AI、Agent 与 TeachBuddy Sidecar 属于独立 Track，不计入这 104 项普通 IM 基础能力的完成率。

用户审阅结论已经在 [IM 基础功能用户审阅意见复核](./IM-BASELINE-USER-AUDIT-REVIEW.md) 中归一：MATCHED、ADAPTED 和未被点名的非核心 PARTIAL 维持现状；MISSING、CONFLICT 与被明确点名的 PARTIAL 继续保留事实状态，并按模块进入 Spec、Tickets 与 Implementation。事实状态和本轮实施决定是两套字段，任何阶段完成局部实现都不能静默改写其余条目。

## 审计口径与使用方法

当前状态使用五档：

| 状态 | 审计含义 |
| --- | --- |
| `MATCHED` | 当前 Demo 已表达同一用户能力和主要交互结果；仍可能使用固定数据。 |
| `PARTIAL` | 只覆盖部分角色、入口、状态或模拟闭环，仍有明确差距。 |
| `ADAPTED` | 保留同一用户目标，但按锁定决策改用不同产品承载。 |
| `MISSING` | 当前可达实现中没有该基础能力。 |
| `CONFLICT` | 当前行为与截图基线中确认的角色或权限事实相反，需先做产品决策。 |

人工审阅时，把每行第一列的 `⬜` 改为 `✅`（认可当前判断）或 `❓`（需要复核），并可直接在符号后写备注。优先核对 `MISSING`、`CONFLICT`，再核对 `PARTIAL` 的剩余差距；`INCREMENT` 另表管理，不用于冲抵基础缺口。

## 当前代码证据索引

| 证据键 | 当前实现证据 | 主要边界 |
| --- | --- | --- |
| `CUR-IA` | `src/domain/message/message.ts:6-188`；`src/features/message-workspace/MessageWorkspace.tsx:1033-1119,1353-1375,1618-1629`；`src/app/router/TeacherRoutes.tsx:72`；`src/app/router/StudentRoutes.tsx:53` | 四类目录、URL 恢复、全局/班级沉浸承载均为本地页面状态；没有线上浮窗窗口控制。 |
| `CUR-REL` | `src/domain/message/message-directory.ts`；`src/contracts/message/message-directory.ts`；`src/features/message-directory/MessageDirectoryDialog.tsx`；`src/mocks/scenarios/message-directory.ts` | 四类目录、关系事件、字母好友、组织树、脱敏资料和三类对象发现可操作；固定 Snapshot 与本地关系命令不代表生产通讯录。 |
| `CUR-CMP` | `src/domain/message/message.ts`；`src/domain/message/im2-basic.ts`；`src/domain/message/message-media.ts`；`src/domain/message/message-object-card.ts`；`src/features/message-workspace/MessageWorkspace.tsx`；`src/design-system/WorkspaceComposer.tsx` | 文本、表情/提及、图片/截图、固定名片及当前范围资源的选择、回显、移除和发送可用；本地/真实云盘、语音和临时教室创建仍为 Placeholder。 |
| `CUR-MSG` | `src/domain/message/im2-basic.ts`；`src/domain/message/message-media.ts`；`src/domain/message/message-object-card.ts`；`src/domain/message/message-group-profile.ts`；`src/features/message-workspace/MessageWorkspace.tsx` | 文本、引用、Reaction、媒体、对象卡和固定文件引用可渲染并共用消息生命周期；文件传输/下载仍未接入。 |
| `CUR-MEDIA` | `src/contracts/message/message-media.ts`；`src/features/message-media/message-media-adapter.ts`；`src/features/message-workspace/MessageEmojiPicker.tsx`；`src/features/message-workspace/MessageScreenCaptureDialog.tsx` | Browser/Memory Adapter 共用契约；图片、截图、贴纸和固定视频使用不透明媒体引用。浏览器版不支持原生隐藏当前窗口或生产持久上传。 |
| `CUR-BUS` | `src/domain/message/message-publication.ts`；`src/domain/message/message-group-profile.ts`；`src/mocks/adapters/message-im2-services.ts`；`src/features/message-workspace/MessageWorkspace.tsx` | 公告提醒、公开课/官方内容、临时教室接收、会话隔离群文件与基本群资料可操作；生产通知、真实教室创建和文件生命周期未接入。 |
| `CUR-ATTN` | `src/domain/message/message-attention.ts`；`src/contracts/message/message-attention.ts`；`src/features/message-attention/desktop-notification-adapter.ts`；`src/features/message-workspace/MessageWorkspaceProvider.tsx` | 注意力从稳定公告/提醒/消息引用派生；Browser/Memory 通知只证明显式权限与前台 Demo，不能证明 ClassIn PC Native、离线或跨设备 Push。 |
| `CUR-GOV` | `src/domain/message/message-lifecycle.ts`；`src/contracts/message/message-lifecycle.ts`；`src/features/message-lifecycle/memory-message-lifecycle-port.ts`；`src/features/message-workspace/MessageWorkspaceProvider.tsx`；`src/features/message-workspace/MessageWorkspace.tsx` | 稳定提交、模拟回执、失败恢复、Cursor 历史和 Port 驱动的只读访问已闭环；Memory Adapter 不代表生产消息或权限服务。 |
| `CUR-DATA` | `src/mocks/scenarios/messages.ts`；`src/mocks/adapters/message-im2-services.ts` | 含固定场景与去标识化 DW 样本；资源已绑定 Thread/Class，但翻译、资源和消息操作仍是本地/模拟实现。 |
| `CUR-TEST` | `src/domain/message/message-lifecycle.test.ts`；`src/features/message-lifecycle/memory-message-lifecycle-port.test.ts`；`tests/integration/message-lifecycle.test.tsx`；`tests/e2e/im-message-lifecycle.spec.ts` | 覆盖成功/重复、离线/冲突恢复、历史分页、系统事件、只读保留、响应式和 Axe；不证明生产消息、身份或权限服务已接通。 |

## 从旧 Demo 到当前项目的状态变化

| ID | 2026-08-30 旧 Demo | 2026-09-09 当前项目 | 判断 |
| --- | --- | --- | --- |
| `ON-CMP-20` 云盘文件搜索与元数据 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 已有按名称/类型检索和来源、大小、更新时间投影；仍无三类真实云盘、权限与生产文件服务。 |
| `ON-MSG-07` 文件卡片 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 消息可保存并显示稳定资源 Reference；仍无上传、传输、下载、失效和权限生命周期。 |
| `ON-MSG-08` 多种教学文件格式 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 模拟数据覆盖 PDF/PPTX/DOCX 与资源类型；仍无线上 PPT/EDB/edoc 等真实卡片与预览链。 |
| `ON-IA-02`、`ON-IA-18` | `DIFFERENT_MODEL` | `ADAPTED · LOCAL_OPERATIONAL` | 术语归一；固定班级沉浸页继续替代浮窗及其窗口控制，不是新增浮窗能力。 |
| `ON-E-09` / `ON-BUS-16` 群文件 | `PARTIAL · PLACEHOLDER` | `MATCHED · MOCK_CLOSED_LOOP` | 已确认的 Focus Surface 按 Thread/Class 隔离资源，支持检索、元数据、最多 10 项引用和发送；生产上传/下载/ACL 仍是 Gate。 |
| `ON-E-11` / `ON-BUS-15` 群资料 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 会话菜单打开同屏临时覆盖面板，展示班级号、班主任、身份、人数、成员、公告和班级入口。 |
| `ON-IA-12` 班级群多 Tab | `PARTIAL` | `ADAPTED · LOCAL_OPERATIONAL` | 经 PC-06/07 审阅，以群文件/群资料 Focus Surface 和班级返回路径承载同一目标，不恢复三 Tab。 |
| `ON-CMP-21` 资源多选与上限 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 固定资源支持去重、多选和 10 项上限；三类真实云盘与生产权限仍未接入。 |
| `ON-CMP-03—06` 表情与提及入口 | `PARTIAL / NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 五类集合、收藏、自定义表情和普通 IM 分组提及已形成可操作闭环。 |
| `ON-CMP-09—10`、`ON-CMP-12—16` 所有人/截图/媒体草稿 | `PARTIAL / NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 师生结构化 `@所有人`、浏览器截图选区及多图文回填已完成；`ON-CMP-11` 原生隐藏窗口仍缺失。 |
| `ON-MSG-03—06` 提及/图片/视频阅读 | `PARTIAL / NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL / MOCK_CLOSED_LOOP` | 结构化组合提及、图片缩略图/Viewer 和固定视频接收卡已完成。 |
| `ON-IA-13—15` 公告、提醒与阅读边界 | `MISSING / PARTIAL` | `MATCHED · LOCAL_OPERATIONAL / MOCK_CLOSED_LOOP` | Class 公告、群级重要提醒和普通群聊新消息分隔已形成独立可操作投影。 |
| `ON-BUS-01—03` 业务触达 | `NOT_IMPLEMENTED` | `MATCHED / PARTIAL · LOCAL_CAPABILITY` | 群公告与 `@我的` 已闭环；桌面通知具备本地 Adapter 和降级，但生产 Push/Native 仍未完成。 |
| `ON-REL-01—18` 通讯录与发现 | `5 PARTIAL / 13 NOT_IMPLEMENTED` | `13 MATCHED / 5 PARTIAL · LOCAL_OPERATIONAL / MOCK_CLOSED_LOOP` | 四类目录、关系事件、好友分组、组织树、最小资料和三类发现已闭环；扩展资料、生产关系、好友设置细项和真实身份分享保留 Gate。 |
| `ON-CMP-22—23` / `ON-MSG-09—10` 联系人名片 | `PARTIAL / NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定选人、回显、移除、发送、脱敏资料和已有私聊链闭环。 |
| `ON-MSG-11—13/15` / `ON-BUS-18` 临时教室接收卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定进行中/结束卡、定向成员、局部动作与进入回执闭环；创建和权限冲突保留。 |
| `ON-GOV-08—11` 生命周期与只读保留 | `1 NOT_IMPLEMENTED / 3 PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 好友通过、成员加入、班级改名事件，以及退出/结课群的只读历史、群资料和群文件均可验证；生产关系与权限服务保留。 |

## 入口与页面模型对比（16 项）

群文件和群资料已按确认的 Focus Surface 模型完成模拟闭环。入口统计为 **12 `MATCHED` / 2 `PARTIAL` / 2 `ADAPTED` / 0 `MISSING`**。

| 审阅 | Online ID / 真实截图入口 | 2026-08-30 旧 Demo | 2026-09-09 当前项目 | 当前证据与剩余差距 |
| --- | --- | --- | --- | --- |
| ⬜✅ | `ON-E-01` 全局一级“消息” | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 师生全局消息页可达；固定 Scenario，见 `CUR-IA`。 |
| ⬜✅ | `ON-E-02` 班级详情“聊天” | `DIFFERENT_MODEL` | `ADAPTED · LOCAL_OPERATIONAL` | 固定班级沉浸路由完成同一任务；没有线上浮窗，见 `CUR-IA`。 |
| ⬜❓需要与真实截图对齐 | `ON-E-03` 通讯录 | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 四类关系目录、最小资料与返回链已经可操作，使用固定可重置 Snapshot，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐 | `ON-E-04` 顶部 `+` | `PARTIAL` | `PARTIAL · LOCAL_OPERATIONAL` | 统一加入页及联系人/班级/公开课发现动作已连通；真实扫码/生产加入限制仍未接入，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐 | `ON-E-05` 全网搜索 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 通讯录内提供联系人、班级、公开课三类发现，并支持稳定业务标识，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐 | `ON-E-06` 搜联系人到私聊 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 联系人发现可打开同一最小资料并进入已有私聊，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐 | `ON-E-07` 搜班级到进入 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 班级名/班级号可命中；成员进入详情/群聊，非成员进入加入页，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐，但这类对象对应的消息分类，我们需要讨论（放在哪个tab下） | `ON-E-08` 搜公开课到上课 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 公开课名/ID 可命中并进入现有公开课详情；通知归类由下一阶段承接，见 `CUR-REL`。 |
| ⬜❓需要与真实截图对齐，具体设计需要商议下。  | `ON-E-09` 群“文件” | `PARTIAL · PLACEHOLDER` | `MATCHED · MOCK_CLOSED_LOOP` | Focus Surface 按 Thread/Class 隔离资源，支持检索、元数据、最多 10 项引用和发送；上传/下载/ACL 保留生产 Gate，见 `CUR-BUS`。 |
| ⬜✅ | `ON-E-10` 群“进入班级” | `DIFFERENT_MODEL` | `ADAPTED · LOCAL_OPERATIONAL` | 班级与沉浸消息页可往返；承载不同于线上 Tab，见 `CUR-IA`。 |
| ⬜❓ 需要与真实截图对齐，具体设计方式需商议，确认下 | `ON-E-11` 群头部 `…` | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | “群资料”在同屏临时覆盖面板展示基本班级资料、成员和班级入口，见 `CUR-BUS`。 |
| ⬜✅占位即可        | `ON-E-12` 联系人资料发消息 | `PARTIAL` | `PARTIAL · LOCAL_OPERATIONAL + PLACEHOLDER` | 发起私聊可用；资料页仍是占位，见 `CUR-REL`。 |
| ⬜✅ | `ON-E-13` 名片消息 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定联系人完成选人、回显、移除、发送、资料和已有私聊链（`CUR-CMP`、`CUR-MSG`）。 |
| ⬜✅ | `ON-E-14` 临时教室卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定接收卡覆盖进行中、进入回执、定向参与对象和已结束状态；创建仍为 Placeholder（`CUR-MSG`）。 |
| ⬜❓ 需要与真实截图对齐 | `ON-E-15` 公开课上课 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 系统通知公开课卡可进入详情、课前检查或课后入口，并返回原通知（`CUR-BUS`）。 |
| ⬜❓需要与真实截图对齐，具体类型，放到哪个类型tab下需商议 | `ON-E-16` ClassIn 助手卡片 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | ClassIn 助手官方身份和入门/更新/帮助三类连续内容在官方公告可达（`CUR-BUS`）。 |

## 六域总览

| 基线域 | MATCHED | PARTIAL | ADAPTED | MISSING | CONFLICT | 合计 | 首要缺口 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 会话与信息架构 `ON-IA` | 15 | 1 | 3 | 0 | 0 | 19 | 真实文件等生产对象摘要 |
| 身份关系与对象发现 `ON-REL` | 13 | 5 | 0 | 0 | 0 | 18 | 生产目录、扩展资料、关系写回、已证实设置项和真实身份分享 |
| 消息创建与 Composer `ON-CMP` | 17 | 5 | 0 | 2 | 0 | 24 | 原生截图隐藏、真实文件/云盘和临时教室创建 |
| 消息格式与阅读 `ON-MSG` | 12 | 2 | 0 | 0 | 0 | 14 | 真实文件卡的生产传输与预览链 |
| 通知公告与业务动作 `ON-BUS` | 11 | 7 | 0 | 0 | 0 | 18 | 临时教室创建和生产通知/文件服务 |
| 角色、权限与生命周期 `ON-GOV` | 6 | 3 | 0 | 0 | 2 | 11 | 管理/学生临时教室权限冲突与生产治理细则 |
| **合计** | **74** | **23** | **3** | **2** | **2** | **104** | **27 项待生产接入或决策** |

## 104 项逐项核对

“基础 Feature”来自真实 ClassIn PC 截图基线；“旧 Demo”是 2026-08-30 的历史代码审计；“当前项目”是本次对 2026-09-09 工作树的代码、可达 UI 与测试复核。每行的证据键指向上方“当前代码证据索引”。

### 会话与信息架构（19 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ⬜✅ | `ON-IA-01` | 跨对象消息工作区 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 师生均有列表 + 当前详情，教师增加 TeacherIn 辅助面（`CUR-IA`） | 线上 L113；差异 L109 |
| ⬜✅ | `ON-IA-02` | 班级上下文聊天浮窗 | `DIFFERENT_MODEL` | `ADAPTED · LOCAL_OPERATIONAL` | 固定班级沉浸页完成同一任务；没有线上聊天浮窗。（`CUR-IA`） | 线上 L114；差异 L110 |
| ⬜✅（对于公开课对象以及小组的分工，我们要融合到已有的几个类型之下。具体的融合方法，我们可以在讨论一下？） | `ON-IA-03` | 异构消息列表 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 私聊、班级、系统、官方四类目录同时承载公开课业务通知和官方内容对象。（`CUR-IA`、`CUR-BUS`） | 线上 L115；差异 L111 |
| ⬜✅ | `ON-IA-04` | 班级群会话对象 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 师生均有固定班级顺序消息流（`CUR-IA`） | 线上 L116；差异 L112 |
| ⬜✅ | `ON-IA-05` | 个人 1:1 会话对象 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 普通联系人私聊可用，但数据来自固定 Scenario（`CUR-IA`） | 线上 L117；差异 L113 |
| ⬜❓（公开课的业务通知对象也要融合到我们四类消息中的一类，也需要呈现，需要补齐） | `ON-IA-06` | 公开课业务通知对象 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 公开课待开始、直播中、已结束对象进入系统通知并连接既有公开课路由（`CUR-BUS`） | 线上 L118；差异 L114 |
| ⬜❓（官方内容通知对象也要融合到我们四类消息中的一类，也需要呈现，需要补齐） | `ON-IA-07` | 官方内容流对象 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | ClassIn 助手身份下形成入门、更新、帮助三类连续官方内容 Thread（`CUR-BUS`） | 线上 L119；差异 L115 |
| ⬜✅ | `ON-IA-08` | 会话头像与名称 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 列表和 Header 均投影稳定身份（`CUR-IA`） | 线上 L120；差异 L116 |
| ⬜？对标线上补齐 | `ON-IA-09` | 最近消息摘要 | `PARTIAL` | `PARTIAL · LOCAL_OPERATIONAL` | 文本、图片、名片、文件和通知摘要已覆盖；发送中/失败/已读状态尚未完整聚合到会话列表（`CUR-IA`、`CUR-GOV`） | 线上 L121；差异 L117 |
| ⬜ | `ON-IA-10` | 时间/状态摘要 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 列表时间、未读和公开课待开始/直播中/已结束状态摘要均可见（`CUR-BUS`） | 线上 L122；差异 L118 |
| ⬜✅ | `ON-IA-11` | 当前选择与详情切换 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 分类/线程选择可切换并写入 URL（`CUR-IA`） | 线上 L123；差异 L119 |
| ⬜ | `ON-IA-12` | 班级群多 Tab | `PARTIAL` | `ADAPTED · LOCAL_OPERATIONAL` | 经 PC-06/07 审阅改用群文件/群资料 Focus Surface 与班级返回路径，不恢复常驻三 Tab（`CUR-IA`、`CUR-BUS`） | 线上 L124；差异 L120 |
| ✅ | `ON-IA-13` | 班级公告固定条 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 班级群顶部从 Class Domain 投影当前公告，且与普通置顶独立（`CUR-ATTN`） | 线上 L125；差异 L121 |
| ✅ | `ON-IA-14` | 群级重要提醒条 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定提醒展示发布者、@所有人、正文、来源与按 Actor 关闭，并与公告/置顶分离（`CUR-ATTN`） | 线上 L126；差异 L122 |
| ✅ | `ON-IA-15` | 新消息分隔 | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 普通班级群按进入前稳定 Message Reference 显示“以下为新消息”（`CUR-ATTN`） | 线上 L127；差异 L123 |
| ⬜✅ | `ON-IA-16` | 系统事件 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 已有居中系统事件投影（`CUR-IA`） | 线上 L128；差异 L124 |
| ⬜ | `ON-IA-17` | 日期与时间轴 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 列表与 Timeline 均有日期/时刻（`CUR-IA`） | 线上 L129；差异 L125 |
| ⬜ | `ON-IA-18` | 浮窗窗口控制 | `DIFFERENT_MODEL` | `ADAPTED · LOCAL_OPERATIONAL` | 页级进入/退出已闭环；没有线上浮窗的最小化、最大化和关闭控制。（`CUR-IA`） | 线上 L130；差异 L126 |
| ⬜✅ | `ON-IA-19` | 会话未读提示/计数 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 当前项目进一步提供分类汇总、数字/点和 `99+` 封顶（`CUR-IA`） | 线上 L131；差异 L127 |

### 身份关系、通讯录与对象发现（18 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ⬜ | `ON-REL-01` | 通讯录四类关系 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 新好友、班级、好友、组织架构四类目录可切换（`CUR-REL`） | 线上 L137；差异 L133 |
| ⬜❓（需和线上对齐） | `ON-REL-02` | 新好友按时间/状态组织 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 好友事件按日期与待处理/已同意组织，可本地接受或忽略（`CUR-REL`） | 线上 L138；差异 L134 |
| ⬜❓（需和线上对齐） | `ON-REL-03` | 好友字母分组 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定好友按字母分组并按角色过滤（`CUR-REL`） | 线上 L139；差异 L135 |
| ⬜❓（需和线上对齐） | `ON-REL-04` | 字母快捷索引 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 字母索引可定位对应好友分组（`CUR-REL`） | 线上 L140；差异 L136 |
| ⬜ | `ON-REL-05` | 好友数量 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 好友 Tab 显示当前角色可见好友总数（`CUR-REL`） | 线上 L141；差异 L137 |
| ⬜❓（需和线上对齐） | `ON-REL-06` | 多级组织树 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 组织节点可逐级浏览并区分人员/部门（`CUR-REL`） | 线上 L142；差异 L138 |
| ⬜❓（需和线上对齐） | `ON-REL-07` | 组织面包屑 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 组织路径使用面包屑返回任一上级（`CUR-REL`） | 线上 L143；差异 L139 |
| ⬜ | `ON-REL-08` | 联系人资料 | `PARTIAL` | `PARTIAL · MOCK_CLOSED_LOOP` | 最小资料含身份、组织、关系与脱敏联系方式；缺生产目录和扩展资料（`CUR-REL`） | 线上 L144；差异 L140 |
| ⬜❓（需和线上对齐） | `ON-REL-09` | 好友备注 | `NOT_IMPLEMENTED` | `PARTIAL · LOCAL_OPERATIONAL` | 备注可在可重置 Adapter 中保存；缺生产持久写回（`CUR-REL`） | 线上 L145；差异 L141 |
| ⬜❓（需和线上对齐） | `ON-REL-10` | 推荐好友 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定推荐好友显示推荐原因并进入同一资料/申请链（`CUR-REL`） | 线上 L146；差异 L142 |
| ⬜❓（需和线上对齐） | `ON-REL-11` | 好友设置 | `NOT_IMPLEMENTED` | `PARTIAL · PLACEHOLDER` | 已保留好友设置入口；线上未证明的具体设置项不补造（`CUR-REL`） | 线上 L147；差异 L143 |
| ⬜❓（需和线上对齐） | `ON-REL-12` | 从组织添加好友 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 可从组织人员资料发起本地好友申请；缺生产关系与风控（`CUR-REL`） | 线上 L148；差异 L144 |
| ⬜ | `ON-REL-13` | 从资料发起私聊 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 已有 Thread 的联系人可从资料直接进入私聊（`CUR-REL`） | 线上 L149；差异 L145 |
| ⬜❓（需和线上对齐） | `ON-REL-14` | 三类全网搜索 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 统一搜索可筛选联系人、班级与公开课（`CUR-REL`） | 线上 L150；差异 L146 |
| ⬜❓（需和线上对齐） | `ON-REL-15` | 联系人手机号/邮箱搜索 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 姓名、ClassIn 号、手机号与邮箱可命中固定联系人（`CUR-REL`） | 线上 L151；差异 L147 |
| ⬜❓（需和线上对齐） | `ON-REL-16` | 二维码与 In 口令分享身份 | `NOT_IMPLEMENTED` | `PARTIAL · LOCAL_OPERATIONAL` | 固定 Demo QR 表达和 In 口令 Clipboard 反馈可用；缺真实生成/解析和分享渠道（`CUR-REL`） | 线上 L152；差异 L148 |
| ⬜ | `ON-REL-17` | 班级号搜索与详情 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 班级名/班级号命中后进入详情、群聊或既有加入页（`CUR-REL`） | 线上 L153；差异 L149 |
| ⬜❓（需和线上对齐） | `ON-REL-18` | 公开课 ID 搜索与详情 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 公开课名、学科、教师或 ID 命中并进入现有详情（`CUR-REL`） | 线上 L154；差异 L150 |

### 消息创建与 Composer（24 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ⬜✅ | `ON-CMP-01` | 文本输入 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 支持文本、IME、换行和线程草稿（`CUR-CMP`） | 线上 L160；差异 L156 |
| ⬜✅ | `ON-CMP-02` | 独立发送动作 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 可通过 Composer 发送，结果进入本地线程（`CUR-CMP`） | 线上 L161；差异 L157 |
| ⬜❓需和线上补齐 | `ON-CMP-03` | 表情选择器 | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 面板支持分类、键盘关闭和 Emoji 光标插入（`CUR-CMP`、`CUR-TEST`） | 线上 L162；差异 L158 |
| ⬜❓（需和线上对齐） | `ON-CMP-04` | 五类表情集合 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 已提供最近、Emoji、教学贴纸、常用回应和我的五类集合（`CUR-CMP`） | 线上 L163；差异 L159 |
| ⬜❓（需和线上对齐） | `ON-CMP-05` | 收藏/添加自定义表情 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 固定表情可收藏/取消，自定义图片进入“我的”并复用媒体草稿（`CUR-CMP`、`CUR-MEDIA`） | 线上 L164；差异 L160 |
| ⬜ | `ON-CMP-06` | 点击 @ 按钮唤起候选 | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 普通 IM 可打开 Agent/成员/所有人分组候选并键盘选择（`CUR-CMP`） | 线上 L165；差异 L161 |
| ⬜✅ | `ON-CMP-07` | 键盘输入 @ 唤起候选 | `MATCHED` | `MATCHED · MOCK_CLOSED_LOOP` | 输入 `@` 可打开 Agent/成员分组候选（`CUR-CMP`） | 线上 L166；差异 L162 |
| ⬜✅ | `ON-CMP-08` | @具体成员 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 可选择成员形成提及；Agent 另使用稳定结构化 Target（`CUR-CMP`） | 线上 L167；差异 L163 |
| ⬜❓（需和线上对齐） | `ON-CMP-09` | @所有人 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 师生可写班级群支持结构化 `@所有人`，可与具体成员组合；私聊和只读会话不提供（`CUR-CMP`、`CUR-TEST`） | 线上 L168；差异 L164 |
| ⬜❓（需和线上对齐） | `ON-CMP-10` | 普通截图 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 浏览器 Adapter 可选择屏幕、窗口或标签页并捕获一帧（`CUR-MEDIA`） | 线上 L169；差异 L165 |
| ⬜❓（需和线上对齐） | `ON-CMP-11` | 截图时隐藏当前窗口 | `NOT_IMPLEMENTED` | `MISSING · BASELINE_GAP` | 菜单明确显示为不可用的桌面端能力；需未来 ClassIn PC Native Adapter（`CUR-MEDIA`） | 线上 L170；差异 L166 |
| ⬜❓（需和线上对齐） | `ON-CMP-12` | 截图像素/选区辅助 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 选区支持新建、移动、四角调整，并显示坐标、宽高和 RGB（`CUR-MEDIA`） | 线上 L171；差异 L167 |
| ⬜❓（需和线上对齐） | `ON-CMP-13` | 截图取消/确认 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | Esc/取消保留草稿，确认裁剪并回填；焦点返回触发器（`CUR-MEDIA`、`CUR-TEST`） | 线上 L172；差异 L168 |
| ⬜ | `ON-CMP-14` | 截图回填 Composer | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 截图确认后形成当前会话待发送缩略图且不自动发送（`CUR-MEDIA`） | 线上 L173；差异 L169 |
| ⬜❓（需和线上对齐） | `ON-CMP-15` | 多张截图组合 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 可连续回填并组合最多 4 张图片，统一受媒体策略约束（`CUR-MEDIA`） | 线上 L174；差异 L170 |
| ⬜❓（需和线上对齐） | `ON-CMP-16` | 截图后追加文字 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 图片草稿与正文、Mention、回复引用原子发送（`CUR-CMP`、`CUR-MEDIA`） | 线上 L175；差异 L171 |
| ⬜ | `ON-CMP-17` | 本地/云盘双文件入口 | `PARTIAL` | `PARTIAL · PLACEHOLDER` | 可引用既有模拟资源，但普通附件仍只有通用文件 Placeholder；没有本地/云盘双入口。（`CUR-CMP`） | 线上 L176；差异 L172 |
| ⬜ | `ON-CMP-18` | 本地系统文件选择 | `PARTIAL` | `PARTIAL · PLACEHOLDER` | 入口不调用系统文件选择器（`CUR-CMP`） | 线上 L177；差异 L173 |
| ⬜❓（需和线上对齐） | `ON-CMP-19` | 云盘三类来源 | `NOT_IMPLEMENTED` | `MISSING` | 当前只有 `conversation / class-space` 两种 Reference 来源；没有“我的云盘/组织云盘/我的资源”三类来源及权限，因此仍为缺失。（`CUR-CMP`） | 线上 L178；差异 L174 |
| ⬜ | `ON-CMP-20` | 云盘文件搜索与元数据 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 已有模拟资源按名称/类型搜索及来源、大小、更新时间投影；没有真实云盘、权限或生产文件服务。（`CUR-CMP`） | 线上 L179；差异 L175 |
| ⬜❓（需和线上对齐） | `ON-CMP-21` | 云盘多选与 10 项上限 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 当前范围固定资源支持去重、多选与 10 项上限；没有三类真实云盘及生产权限（`CUR-CMP`） | 线上 L180；差异 L176 |
| ⬜ | `ON-CMP-22` | 名片选人器 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 最近/好友/组织三个固定范围支持搜索和最多 5 人选择（`CUR-CMP`） | 线上 L181；差异 L177 |
| ⬜❓（需和线上对齐） | `ON-CMP-23` | 名片选择回显与移除 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 名片按 Thread 回显并可逐项移除，纯卡可发送（`CUR-CMP`） | 线上 L182；差异 L178 |
| ⬜ | `ON-CMP-24` | 临时教室创建器 | `PARTIAL` | `PARTIAL · PLACEHOLDER` | 有入口表达，无命名、参与对象和创建闭环（`CUR-CMP`） | 线上 L183；差异 L179 |

### 消息格式、展示与阅读（14 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ⬜✅ | `ON-MSG-01` | 双向消息布局 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 自己/他人消息及连续作者分组可用（`CUR-MSG`） | 线上 L189；差异 L185 |
| ⬜✅ | `ON-MSG-02` | 文本气泡 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 文本发送后进入气泡并更新预览（`CUR-MSG`） | 线上 L190；差异 L186 |
| ⬜ | `ON-MSG-03` | @消息气泡 | `PARTIAL` | `MATCHED · LOCAL_OPERATIONAL` | 成员、Agent 与 `@所有人` 使用结构化引用，师生组合提及气泡已验证（`CUR-MSG`、`CUR-TEST`） | 线上 L191；差异 L187 |
| ⬜❓（需和线上对齐） | `ON-MSG-04` | 图片缩略图 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 纯图片/图文消息展示缩略图，列表和回复使用安全摘要（`CUR-MSG`） | 线上 L192；差异 L188 |
| ⬜❓（需和线上对齐） | `ON-MSG-05` | 图片大图查看 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | Viewer 支持序号、前后切换、Escape/关闭、加载重试和焦点恢复（`CUR-MSG`、`CUR-TEST`） | 线上 L193；差异 L189 |
| ⬜❓（需和线上对齐） | `ON-MSG-06` | 视频播放卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定去标识场景提供封面、时长、播放入口和本地基础控制；视频发送仍不在范围（`CUR-MSG`） | 线上 L194；差异 L190 |
| ⬜ | `ON-MSG-07` | 文件卡片 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 消息已能显示含文件名、大小和 `SIMULATED` 的稳定资源 Reference；没有真实传输、下载、失效和权限生命周期。（`CUR-MSG`） | 线上 L195；差异 L191 |
| ⬜ | `ON-MSG-08` | 多种教学文件格式 | `NOT_IMPLEMENTED` | `PARTIAL · MOCK_CLOSED_LOOP` | 模拟资源覆盖 PDF/PPTX/DOCX 与文档/课件类型；没有 PPT/EDB/edoc 等真实卡片和预览链。（`CUR-MSG`） | 线上 L196；差异 L192 |
| ⬜❓（需和线上对齐） | `ON-MSG-09` | 联系人名片卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 名片卡显示姓名、身份、关系、组织和真值标签（`CUR-MSG`） | 线上 L197；差异 L193 |
| ⬜❓（需和线上对齐） | `ON-MSG-10` | 名片资料展开 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 卡片可展开脱敏基础资料并进入已有可见私聊（`CUR-MSG`） | 线上 L198；差异 L194 |
| ⬜❓（需和线上对齐） | `ON-MSG-11` | 进行中临时教室卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 固定卡显示剩余时间、容量、参数和进入动作（`CUR-MSG`） | 线上 L199；差异 L195 |
| ⬜❓（需和线上对齐） | `ON-MSG-12` | 已结束临时教室卡 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 已结束卡显示时间并禁用进入，不伪造成功（`CUR-MSG`） | 线上 L200；差异 L196 |
| ⬜❓（需和线上对齐） | `ON-MSG-13` | 临时教室定向提醒消息 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 接收卡明确展示本次邀请的成员摘要（`CUR-MSG`） | 线上 L201；差异 L197 |
| ⬜❓（需和线上对齐） | `ON-MSG-15` | 卡片局部 `…` | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 名片和临时教室卡均有局部信息动作和明确生产边界反馈（`CUR-MSG`） | 线上 L202；差异 L198 |

### 通知公告与业务动作（18 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `ON-BUS-01` | 班级公告展示 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 群聊固定条展示现有 Class 公告并连接管理/查看路径（`CUR-ATTN`） | 线上 L208；差异 L204 |
| ✅ | `ON-BUS-02` | @我的提醒 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 班级消息内聚合直接提及和 @所有人，支持逐项已读与原消息定位（`CUR-ATTN`） | 线上 L209；差异 L205 |
| ✅ | `ON-BUS-03` | 桌面通知 | `NOT_IMPLEMENTED` | `PARTIAL · LOCAL_CAPABILITY` | 已有显式授权、Browser/Memory Adapter、测试通知和站内降级；缺 ClassIn PC Native、后台/离线与跨设备 Push（`CUR-ATTN`） | 线上 L210；差异 L206 |
| ⬜❓需要与线上截图对齐 | `ON-BUS-04` | ClassIn 助手官方身份 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 当前项目的官方公告展示发布方与官方语义，但对象模型不是同一官方账号流（`CUR-BUS`） | 线上 L211；差异 L207 |
| ⬜ | `ON-BUS-05` | 官方图文内容卡 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 官方 Thread 展示主题、来源、封面语义、正文和发布时间（`CUR-BUS`） | 线上 L212；差异 L208 |
| ⬜ | `ON-BUS-06` | 官方内容分类 | `PARTIAL` | `PARTIAL · LOCAL_OPERATIONAL` | 有“官方公告”一级分类，无入门/更新/帮助三类内容导航（`CUR-BUS`） | 线上 L213；差异 L209 |
| ⬜❓（需和线上对齐） | `ON-BUS-07` | 公开课进行中条目 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 直播中公开课以系统通知状态卡呈现（`CUR-BUS`） | 线上 L214；差异 L210 |
| ⬜❓（需和线上对齐） | `ON-BUS-08` | 公开课详情 | `NOT_IMPLEMENTED` | `MATCHED · LOCAL_OPERATIONAL` | 通知卡和既有详情显示时间、席位、教师、位置与描述（`CUR-BUS`） | 线上 L215；差异 L211 |
| ⬜❓（需和线上对齐） | `ON-BUS-09` | 公开课上课动作 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 直播中通知进入现有课前检查并可继续教室演示链路（`CUR-BUS`） | 线上 L216；差异 L212 |
| ⬜❓（需和线上对齐） | `ON-BUS-10` | 课后评价入口 | `NOT_IMPLEMENTED` | `PARTIAL · LOCAL_OPERATIONAL` | 已结束通知进入含评价入口的公开课详情；评价提交本体仍是既有演示（`CUR-BUS`） | 线上 L217；差异 L213 |
| ⬜❓（需和线上对齐） | `ON-BUS-11` | 扫码分享公开课 | `NOT_IMPLEMENTED` | `PARTIAL · PLACEHOLDER` | 教师邀请面有明确 Demo QR 表达；没有真实生成和扫码解析（`CUR-BUS`） | 线上 L218；差异 L214 |
| ⬜❓（需和线上对齐） | `ON-BUS-12` | In 口令分享公开课 | `NOT_IMPLEMENTED` | `PARTIAL · PLACEHOLDER` | 教师邀请面提供固定 In 口令和复制反馈；没有生产口令服务（`CUR-BUS`） | 线上 L219；差异 L215 |
| ⬜❓（需和线上对齐） | `ON-BUS-13` | 邮件邀请公开课 | `NOT_IMPLEMENTED` | `PARTIAL · PLACEHOLDER` | 教师邀请面提供邮件渠道及 Demo 反馈；没有真实发送（`CUR-BUS`） | 线上 L220；差异 L216 |
| ⬜✅ | `ON-BUS-14` | 群聊与班级详情双向连接 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 班级 → 群聊 → 原班级返回闭环稳定；方向组织与线上不同（`CUR-BUS`） | 线上 L221；差异 L217 |
| ⬜❓需要和线上补齐 | `ON-BUS-15` | 班级资料侧栏 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 同屏临时覆盖面板展示群名、班级号、班主任、身份、人数、可见成员、公告与班级入口（`CUR-BUS`） | 线上 L222；差异 L218 |
| ⬜ | `ON-BUS-16` | 群文件聚合入口 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 群文件 Focus Surface 按 Thread/Class 隔离，支持检索、来源/格式/大小/更新时间、最多 10 项引用和消息阅读；生产文件生命周期保留 Gate（`CUR-BUS`） | 线上 L223；差异 L219 |
| ⬜ | `ON-BUS-17` | 临时教室参数与参与对象 | `PARTIAL` | `PARTIAL · PLACEHOLDER` | 无 15 分钟/1V6、名称、成员选择和发布（`CUR-BUS`） | 线上 L224；差异 L220 |
| ⬜❓（需和线上对齐） | `ON-BUS-18` | 临时教室进入与状态回写 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 进行中进入经 Adapter 返回回执，已结束卡禁用进入（`CUR-BUS`） | 线上 L225；差异 L221 |

### 角色、权限与生命周期（11 项）

| 审阅 | Online ID | 基础 Feature（真实截图） | 2026-08-30 旧 Demo | 2026-09-09 当前项目 / 成熟度 | 当前证据与剩余差距 | 线上源证据 |
| --- | --- | --- | --- | --- | --- | --- |
| ⬜ | `ON-GOV-01` | 管理角色操作公告 | `PARTIAL` | `PARTIAL · LOCAL_OPERATIONAL` | 教师可从 IM 固定公告条进入既有管理路径；班主任/助教的生产 Capability 仍未建模（`CUR-ATTN`） | 线上 L231；差异 L227 |
| ⬜❓（保持盖里角色创建临时教室规则） | `ON-GOV-02` | 管理角色创建临时教室 | `CONFLICT` | `CONFLICT · PLACEHOLDER` | 入口仅占位且第一阶段登记为师生可见，不符合线上仅管理角色可发起（`CUR-GOV`） | 线上 L232；差异 L228 |
| ⬜ | `ON-GOV-03` | 管理角色管理群文件 | `PARTIAL` | `PARTIAL · PLACEHOLDER + POLICY_ONLY` | 教师可打开模拟群资源，但没有真实文件管理、权限和审计链。（`CUR-GOV`） | 线上 L233；差异 L229 |
| ⬜✅ | `ON-GOV-04` | 学生基础发言 | `MATCHED` | `MATCHED · LOCAL_OPERATIONAL` | 学生可发送文本和固定 Emoji（`CUR-GOV`） | 线上 L234；差异 L230 |
| ⬜ | `ON-GOV-05` | 学生发送普通文件 | `PARTIAL` | `PARTIAL · PLACEHOLDER` | 学生附件文件入口仍是 Placeholder；复用既有模拟资源不等于发送普通文件。（`CUR-GOV`） | 线上 L235；差异 L231 |
| ⬜ | `ON-GOV-06` | 学生查看但不管理公告/群文件 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 学生可查看群内公告、群资料和当前范围资源，界面不提供上传、删除、成员或文件管理动作（`CUR-ATTN`、`CUR-BUS`） | 线上 L236；差异 L232 |
| ⬜✅（保持demo设计现状） | `ON-GOV-07` | 学生不能创建临时教室 | `CONFLICT` | `CONFLICT · PLACEHOLDER` | 当前学生附件菜单仍登记临时教室入口，应在实现前校准权限表达（`CUR-GOV`） | 线上 L237；差异 L233 |
| ⬜❓（需和线上对齐） | `ON-GOV-08` | 好友通过系统提示 | `NOT_IMPLEMENTED` | `MATCHED · MOCK_CLOSED_LOOP` | 私聊系统流包含固定“已通过好友申请”事件；生产关系服务仍待接入（`CUR-GOV`） | 线上 L238；差异 L234 |
| ⬜ | `ON-GOV-09` | 班级成员加入/班级改名事件 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 固定班级消息流覆盖成员加入和班级改名，均使用系统消息身份（`CUR-GOV`） | 线上 L239；差异 L235 |
| ⬜ | `ON-GOV-10` | 班级结束/禁止自主加入限制 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 固定结课群由访问 Port 返回只读状态，既有不可用目标/加入页保留禁止加入表达（`CUR-GOV`） | 线上 L240；差异 L236 |
| ⬜ | `ON-GOV-11` | 被移出群后的只读保留 | `PARTIAL` | `MATCHED · MOCK_CLOSED_LOOP` | 学生退出群后以只读状态保留历史消息、群资料和群文件，发送及消息修改动作关闭（`CUR-GOV`） | 线上 L241；差异 L237 |

## 9 项明确负向事实

这些条目在 2026-08-30 真实截图基线中被明确确认“不支持”，因此不计入 104 项必须继承的基础 Feature。当前项目若新增，必须标为升级，避免把“新增能力”误写成“还原线上”。

| 审阅 | Online ID | 真实截图负向事实 | 2026-09-09 当前项目处理 |
| --- | --- | --- | --- |
| ⬜ | `ON-NEG-01` | 无通用单条消息操作菜单 | 已新增低噪内联动作条（回复、Reaction、翻译、置顶、撤回），属于显式升级，见 `CUR-MSG`。 |
| ⬜ | `ON-NEG-02` | 无回复/引用回复 | `IM2-P2-003` 已显式新增。 |
| ⬜ | `ON-NEG-03` | 无 Thread 子会话 | 仍未进入范围；引用回复不等于 Thread。 |
| ⬜ | `ON-NEG-04` | 无 Reaction | `IM2-P2-004` 已显式新增。 |
| ⬜ | `ON-NEG-05` | 无点赞 | 👍 已作为 Reaction 选项显式新增。 |
| ⬜ | `ON-NEG-06` | 无投票 | 当前仍未实现。 |
| ⬜ | `ON-NEG-07` | 无 Slack 式 Channel | 当前仍未实现；班级群继续作为 Thread。 |
| ⬜ | `ON-NEG-08` | 无会话置顶/免打扰 | 当前有消息置顶和私聊免打扰，是旧 Demo 已有升级资产；要继续区分“消息置顶”和“会话置顶”。 |
| ⬜ | `ON-NEG-10` | 当前版本无消息撤回 | 当前有本地撤回，是旧 Demo 已有升级资产；生产时限和角色规则仍待接入。 |

## 7 项当前增量

| 审阅 | Requirement | Feature | 相对基础全集的分类 |
| --- | --- | --- | --- |
| ⬜ | `IM2-P2-001` | 四类会话分类 | `INCREMENT`；深化异构列表，不替代公开课/官方对象。 |
| ⬜ | `IM2-P2-002` | 沉浸消息布局 | `ADAPTED_BASELINE + INCREMENT`；替代浮窗承载。 |
| ⬜ | `IM2-P2-003` | 引用回复 | `INCREMENT`；显式改变 `ON-NEG-02`。 |
| ⬜ | `IM2-P2-004` | Reaction | `INCREMENT`；显式改变 `ON-NEG-04/05`。 |
| ⬜ | `IM2-P2-005` | 当前会话记录搜索 | `INCREMENT`；不等于三类全网对象搜索。 |
| ⬜ | `IM2-P2-006` | 当前聊天与班级共享资源检索复用 | `BASELINE_DEEPENING + INCREMENT`；真实文件/云盘 Gate 保留。 |
| ⬜ | `IM2-P2-007` | 原文与译文对照 | `INCREMENT`；不在 104 项基线中。 |

## 已执行的分模块路线与剩余 Gate

| 顺序 | 模块 | 当前审计池 | 阶段结果与剩余 Gate |
| ---: | --- | --- | --- |
| 1 | 身份关系与对象发现 `ON-REL` | 5 partial | 本地目录与发现已闭环；生产目录、扩展资料、关系写回和真实身份分享保留 Gate。 |
| 2 | 消息创建与媒体 `ON-CMP` + `ON-MSG` | 7 partial / 2 missing | 图片、截图、媒体、对象卡和资源引用已闭环；真实文件传输、云盘、原生隐藏窗口和临时教室创建保留 Gate。 |
| 3 | 班级群业务 `ON-IA` + `ON-BUS` | 8 partial | 公告、提醒、公开课、官方内容、群文件和群资料已闭环；生产 Push/Native、文件服务和列表聚合保留 Gate。 |
| 4 | 临时教室与公开课 | 分散于 CMP/MSG/BUS | 公开课与临时教室接收卡已闭环；创建、生产权限和真实客户端回执保留 Gate。 |
| 5 | 角色治理 `ON-GOV` | 3 partial / 2 conflicts | 消息生命周期已形成 Port/Adapter 闭环；临时教室创建权限与生产治理细则继续单独决策。 |

## 核对后的设计约束

1. 后续 IM Spec 和 Ticket 必须引用稳定 Online Feature ID，或明确标记为 `INCREMENT`。
2. 104 项中的 `MISSING`、`PARTIAL` 和 `CONFLICT` 不能从产品设计中消失；分期只改变实施状态。
3. 两个 `ADAPTED` 项保留用户目标，以沉浸路由替代浮窗及窗口控制。
4. 两个临时教室权限 `CONFLICT` 按用户审计结论维持当前 Demo 事实，后续进入独立产品决策时再收敛。
5. 群资源 Reference、附件入口 Placeholder 和真实文件/云盘生命周期必须分别表述。
6. 会话型 IM 与通知公告型消息共同组成全集；公开课、课堂和作业只登记与消息的入口、引用、动作和状态回写。
7. AI、Agent 与 TeachBuddy Sidecar 属于独立 Track，不纳入本次普通 IM 完整度计算。
8. 每完成一个模块，必须同时更新本表的当前状态、成熟度、证据和人工审阅结果；不能只在聊天中宣布完成。
