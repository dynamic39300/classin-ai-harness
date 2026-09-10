---
title: TeachBuddy IM Sidecar 与 DeepSeek Agent 同源接入设计
status: IMPLEMENTED
version: v0.2
date: 2026-09-08
owner: ClassIn AI Native Product Design
---

# TeachBuddy IM Sidecar 与 DeepSeek Agent 同源接入设计

## 1. 设计结论

IM 右侧应继续是教师私密的 **TeachBuddy Sidecar**，并与 ClassIn 教师主导航下“TeachBuddy → 我的任务”复用同一个 `teachbuddy` Agent Preset、同一套 DeepSeek Harness、`AgentRuntimeAdapter` 和 `ConversationRunEvent` 语义。

Sidecar 不新建第二个 AI 身份，也不把 AgentIn 目录中的班级 Agent 冒充为 TeachBuddy。它只改变同一个 TeachBuddy 的启动现场：主工作台从空白教学目标开始，IM Sidecar 从当前消息线程和当前教师意图开始。

首个接入纵向切片应完成真实文本对话、真实运行状态、线程级恢复和消息草稿生成。任何进入班级群或 1v1 消息框的内容仍经过教师审阅；DeepSeek 的文本完成不能直接等价为 ClassIn 消息写回成功。

## 2. 现有页面与入口扫描

### 2.1 教师私密 TeachBuddy 入口

| 页面 / Route | 入口或提示 | 当前行为 | 当前运行来源 |
| --- | --- | --- | --- |
| 教师一级消息 `/teacher/messages` | 进入沉浸消息工作区后，右侧 TeachBuddy 自动常驻 | 班级群与教师 1v1 均建立当前 Thread Target；切换会话时 Sidecar 跟随切换 | `WorkBuddyImProvider` 确定性 Demo |
| 班级群聊 `/teacher/classes/:classId/chat` | 固定班级消息右侧 TeachBuddy 自动常驻 | 锁定当前班级，最多“群聊 + Sidecar”两栏 | `WorkBuddyImProvider` 确定性 Demo |
| 消息标准态 Conversation Header | `TeachBuddy` 按钮 | 打开 Sidecar 并进入沉浸模式 | `WorkBuddyImProvider` 确定性 Demo |
| 班级群 Sidecar Ready | “直接告诉我你想在当前班级完成什么” | 提供作业催交、课前准备、单题讲解三个固定任务 | 本地 Domain + Mock Adapter |
| 教师 1v1 Sidecar Ready | “告诉我你想如何回复当前私聊” | 提供回复辅助与单题讲解；结果只插入教师回复框 | 本地 Domain + Mock Adapter |

Sidecar 当前通过 `MessageWorkspace` 生成 `WorkBuddyImTarget`，包含 `kind / classId / classLabel / threadId / memberCount / recentMessages`。它已经具备接入真实 Agent 所需的最小启动上下文，但尚未通过 `AgentRuntimeAdapter` 发送给 DeepSeek。

### 2.2 TeachBuddy 主工作台入口

| 页面 / Route | 入口 | 当前行为 | 当前运行来源 |
| --- | --- | --- | --- |
| ClassIn 教师主导航 | `TeachBuddy` 展开项 → `我的任务` | 新建或继续教师的通用教学任务 | 真实本机 DeepSeek Harness |
| 终局工作台 `/teacher/ai-agent/new` | Goal Composer | 使用 `ideal-full` scope 创建和恢复 Session | `AgentRuntimeSurface` + `AgentRuntimeAdapter` |
| 班级启动页 `/teacher/classes/:classId/workbuddy/new` | 班级详情右栏“我的教学伴侣 / TeachBuddy” | 进入独立 TeachBuddy Shell，并携带课程 Launch Context | 同一 Harness，`classin-mvp` scope |
| 独立产品 `/teachbuddy/app/new` | 独立教师工作台 | 独立账号与数据空间 | 同一 Harness，`standalone-teacher` scope |

这里的“同一个 DeepSeek Agent”具体指：相同的 `teachbuddy` Agent Preset、同一 Harness 进程、同一 Runtime Interface 和同一事件投影。它不等于让不同 Product Profile 共享私有数据。

### 2.3 班级 Agent 入口

| 页面 / Route | 入口 | 身份与可见性 | 当前运行来源 |
| --- | --- | --- | --- |
| 班级群 Composer | `@Agent` 与直接输入 `@` | 班级 Agent 公开回复，全群可见 | `ClassAgentConversationProvider` + Mock Adapter |
| 教师/学生消息中心私聊目录 | “班级 Agent”筛选、搜索、新建私聊 | 同一 Agent Definition，不同 Actor 的 Thread 隔离 | `ClassAgentConversationProvider` + Mock Adapter |
| TeachBuddy 二级导航 `/teacher/ai-agent/agentin` | AgentIn 目录 | 浏览和搜索固定智能体目录；不代表安装或运行 | 固定目录 Demo |

班级 Agent 与教师私密 TeachBuddy 是两套产品身份。前者代表已授权给班级成员使用的公开/私聊 Agent；后者代表教师自己的统一教学搭档。Sidecar 接入 DeepSeek 时不能合并这两种身份。

### 2.4 TeacherIn 入口

TeacherIn 当前位于内容资源与作品草稿链路，例如 `/teacher/space/teacherin`。它拥有内容格式、作品草稿和发布生命周期，不是 IM Sidecar 的 Agent 身份，也不是 Agent Runtime 入口。后续 Sidecar 生成内容型 Artifact 时，可以经 `ProposedAction → Approval → ExecutionReceipt` 创建 TeacherIn 草稿，但不能把“TeacherIn”作为 Sidecar Agent 名称。

## 3. 当前体验问题

1. 主工作台已经是真实 DeepSeek 对话，IM Sidecar 仍按关键词把任意输入路由到三个固定任务，教师会感知为两个不同的 TeachBuddy。
2. Sidecar 的运行步骤是人工计时的确定性投影，无法表达真实模型的接受、处理、停止、失败和恢复。
3. 当前 IM 上下文只由本地固定 Module 使用，没有形成可审计的 `ContextSnapshot` 后交给真实 Runtime。
4. 固定任务拥有可靠的审阅和写回 Gate；直接替换成自由文本 Agent 会丢失 `ArtifactDraft / ProposedAction / Approval / Receipt` 链。
5. AgentIn、班级 Agent、TeacherIn 和 TeachBuddy 在页面上都出现“Agent/AI”概念，如果不明确身份与渠道，用户会误以为它们共享会话、权限或发送身份。

## 4. 用户场景

### 4.1 班级群旁的教师私密协作

教师正在查看班级群，希望：

- 总结最近讨论并给出下一步；
- 根据当前班级事实生成作业催交或课前通知；
- 把群里的学生问题整理成讲解内容；
- 调整语气、长度、对象范围后形成一条待发送草稿。

TeachBuddy 读取经授权的当前 Thread Context Snapshot，在 Sidecar 内完成真实多轮对话。普通回答停留在私密 Timeline；消息型结果进入待审阅成果面；只有教师明确确认后才以教师身份写回群聊。

### 4.2 教师 1v1 回复辅助

教师正在与学生或家长私聊，希望：

- 理解对方诉求并拟写专业回复；
- 结合当前对话给出追问建议；
- 解释一道题或生成可打开的讲解内容；
- 继续追问和修改，最后把选定版本插入回复框。

TeachBuddy 只读取当前 1v1 的最小必要消息片段。模型输出不能自动发送；“插入回复框”只更新当前教师 Composer。

### 4.3 从 Sidecar 继续到主工作台

当任务需要更大空间审阅长文、多个 Artifact 或复杂工具过程时，教师可以“在 TeachBuddy 中继续”。系统打开同一个 Runtime Session 的主工作台视图，而不是复制一份聊天。返回 IM 后仍恢复相同 Thread Target、草稿与滚动位置。

## 5. 推荐体验

### 5.1 Sidecar 四区保持不变

```text
Header：TeachBuddy 身份、真实连接状态、当前 Thread
Context：本次已附加的班级/私聊上下文，可查看来源与范围
Body：真实 Conversation Run、回答、Artifact 与待审阅成果
Composer：持续可用的教师输入、停止和发送命令
```

Sidecar 不复制主工作台的左侧历史栏。当前 Thread 自身就是会话入口；历史通过 Thread 与 Runtime Session 的稳定绑定恢复。

### 5.2 Ready 状态

- 主提示随渠道变化：班级群使用“基于当前班级和群聊，你想完成什么”；1v1 使用“基于当前对话，你想如何回复或继续处理”。
- 展示三类建议：理解当前对话、生成待发送消息、创建教学内容。建议只预填 Composer，不自动调用模型或写回。
- Context 行显示“当前班级 / 当前会话 / 最近消息 N 条”，允许展开查看来源摘要，但默认不展示学生原文全集。
- 连接状态来自真实 `health()`；未配置或离线时禁用提交并提供重连，不回退固定假回复。

### 5.3 运行与结果

- 教师提交后立即出现自己的原始要求。
- Sidecar 投影真实 `ConversationRunEvent`：accepted、running、工具调用、Artifact、failed、stopped、completed；不显示模型隐藏思维链。
- 文本回答可以继续追问；消息草稿和内容 Artifact 使用独立成果面。
- 运行中允许补充要求时，复用 Runtime 的排队/下一轮语义；不自行模拟一个“补充成功”事件。
- 复杂 Artifact 可在 Overlay 中审阅，避免出现第四个持久栏。

### 5.4 消息写回 Gate

DeepSeek 不能直接调用“发送消息”。首期只允许它产生结构化 `MessageDraftArtifact`：

```text
DeepSeek Agent Runtime
  → MessageDraftArtifact
  → 教师编辑
  → SendMessageProposedAction
  → Teacher Approval
  → ClassIn Message Adapter
  → ExecutionReceipt
```

班级群主动作明确显示“确认并发送至 {班级}”；1v1 主动作显示“插入回复框”。模型完成、Artifact 生成和消息发送是三个不同状态。

## 6. Module、Interface、Seam 与 Adapter

### 6.1 `ImSidecarAgentModule`

这是本次新增的 Deep Module。页面只需学习一个 Interface：

```ts
type ImSidecarAgentInterface = {
  open(target: ImAgentTarget): Promise<ImSidecarProjection>;
  submit(command: ImAgentCommand): Promise<void>;
  stop(): Promise<void>;
  subscribe(listener: (projection: ImSidecarProjection) => void): () => void;
};
```

Implementation 隐藏以下复杂度：

- Thread 与 Runtime Session 的稳定绑定和恢复；
- Context Snapshot 的最小化、版本与过期判断；
- 教师可见输入与发送给 Agent 的 Context Envelope 分离；
- Runtime 事件到 Sidecar Projection 的映射；
- 普通回答、消息草稿和内容 Artifact 的分类；
- 切换 Thread 时停止观察旧 Session，避免把结果投到新目标；
- 离线、未知发送结果、停止和重连。

### 6.2 Context Read Seam

`ImContextSnapshotAdapter` 只返回当前任务必要的稳定快照：

```ts
type ImContextSnapshot = Readonly<{
  id: string;
  version: string;
  channel: 'class' | 'direct';
  threadRef: string;
  classRef?: string;
  viewerRef: string;
  memberCount?: number;
  recentMessages: readonly ImContextMessage[];
  excludedSensitiveCount: number;
  capturedAt: string;
}>;
```

当前 Adapter 从固定、脱敏的 Message Scenario 生成快照；未来真实 ClassIn Adapter 在同一 Seam 完成授权、脱敏、长度限制和审计。页面不拼装 Prompt，也不直接读取整个消息库。

### 6.3 Runtime Seam

继续复用现有 `AgentRuntimeAdapter`，使用同一个 `teachbuddy` Agent Preset。IM 属于 ClassIn 集成版 TeachBuddy，推荐使用 `ideal-full` Product Scope，并在 Session Metadata 中增加：

- `source: 'im-sidecar'`；
- `threadRef`；
- `contextSnapshotRef`；
- `launchLabel`。

Product Scope 决定私有数据空间，Thread Binding 决定启动现场。不要为每个班级发明新的 Runtime Scope，也不要把 IM Session 放入 `classin-mvp` 或独立 C 端空间。

### 6.4 Write Seam

既有 `ClassInHomeworkReminderAdapter`、`GuidedExplanationAdapter` 和消息写回规则继续拥有业务事实与副作用。首期真实 Agent 只生成文本或 Artifact；业务 Module 校验后才创建 Action。这样同一个 DeepSeek 可以服务多个场景，而 ClassIn 仍拥有正式消息事实。

## 7. Session 与上下文规则

1. 绑定键为 `teacherRef + threadRef + productScope`，同一教师返回同一 Thread 时恢复原 Session。
2. 切换班级或私聊对象时切换 Session，不把 A 会话的上下文带入 B。
3. Sidecar Session 出现在 TeachBuddy“我的任务”历史中，并显示来源标签“来自消息 · {会话名称}”；主工作台打开后继续同一 Session。
4. 每次新任务捕获新的 Context Snapshot；后续追问默认引用当前 Snapshot，教师可主动刷新上下文。
5. 最近消息使用固定条数与字符预算，过滤系统通知、撤回内容和无权消息；被排除数量进入 evidence，不进入默认 UI。
6. Context Envelope 由 Module 构造，页面只显示教师原始输入。主工作台和 Sidecar 都不得把内部 Envelope 当成教师说过的话。
7. 模型输出不写回 MessageThread；只有 Receipt 成功后，Message Store 才追加正式消息。

## 8. 状态模型

```text
closed
  → connecting
  → ready
  → creating_session
  → running
  → completed

running → stopping → stopped
running → recoverable_failure
completed → draft_review → approving → sent / inserted
draft_review → stale_context / permission_denied / recoverable_failure
```

`completed` 只说明 Agent 本轮结束；`sent` 或 `inserted` 才说明内容进入 ClassIn 消息流程。Sidecar 的连接、Runtime、Artifact 与写回状态应分别建模，再组合成单一 Projection，避免多个互相矛盾的布尔值。

## 9. 分阶段实施

### M1：真实 Sidecar 对话

- 复用现有 DeepSeek Runtime 和 `ideal-full` scope；
- 建立 Thread ↔ Session Binding；
- 将最小 IM Context Snapshot 作为受控 Context Envelope 提交；
- Sidecar 投影真实对话、停止、失败、重连和恢复；
- 普通回复仍只留在私密 Sidecar。

### M2：消息草稿 Artifact

- 为 Harness 增加唯一受控 `create_message_draft` Tool；
- 生成 `MessageDraftArtifact`，支持教师编辑和版本更新；
- 班级群复用审批/发送链；1v1 复用“插入回复框”；
- 旧的三个固定任务改为 Prompt Template，不再使用人工计时伪装 Runtime。

### M3：生产 ClassIn Context 与写回

- 用真实 `ImContextSnapshotAdapter` 替换固定数据；
- 接入生产权限、内容过滤、审计与消息写回 Adapter；
- 完成未成年人数据、保留策略、撤权、过期和跨端恢复 Gate。

## 10. 首条验收路径

1. 教师进入 `/teacher/messages`，选择“高二物理 3 班”，右侧 Sidecar 显示 DeepSeek 已连接与当前上下文。
2. 教师输入“总结最近讨论，并拟一条提醒大家明天带实验报告的群消息”。
3. Network 只创建/写入一个 `ideal-full` Runtime Session，实际通过 `AgentRuntimeAdapter` 调用同一 Harness。
4. Sidecar 显示真实教师输入、运行事件和 Agent 回答，不出现确定性假步骤或隐藏思维链。
5. Agent 生成 `MessageDraftArtifact` 后进入待审阅状态；群聊中仍没有新增消息。
6. 教师修改正文并确认，Action 绑定当前 Artifact 与 Context Snapshot；Receipt 成功后群聊只新增一条王老师消息。
7. 刷新后恢复相同 Sidecar Session、Artifact 和 Receipt；从 TeachBuddy“我的任务”打开可继续同一 Session。
8. 切换到李明私聊后使用新的 Thread Session；原班级上下文和草稿不会出现在李明会话。
9. DeepSeek 离线、无凭据、停止、未知提交结果和 Context 过期均有独立恢复路径，不回退 Mock 回复。

## 11. 建议 Write Set

- `docs/04-specs/features/workbuddy-im-collaboration/PRODUCT-REQUIREMENTS.md`：增加真实 Sidecar Runtime 需求并替代“本期不接真实模型”的旧边界；
- `docs/04-specs/features/workbuddy-im-collaboration/FEATURE-SPEC.md`：增加 `ImSidecarAgentModule`、Context Snapshot、Thread Binding 和状态契约；
- `src/contracts/workbuddy/`：增加 IM Runtime Context 与 Session Metadata 契约；
- `src/domain/workbuddy/`：增加 Context Snapshot 和 MessageDraftArtifact 纯模型；
- `src/features/workbuddy-im-assistance/`：把 Sidecar 从确定性 Provider 切到同源 Runtime Projection；
- `runtime/harness/`：M2 增加受控消息草稿 Tool；
- `server/`：持久化 Session Source/Thread/Context Metadata，继续校验 scope 与 session 归属；
- `tests/integration/`、`tests/e2e/`、`tests/visual/`：覆盖同源 Runtime、线程隔离、审批 Gate、恢复、宽度和可访问性。

## 12. 本设计不锁定的事项

- 真实 ClassIn 消息、作业、成员和提交 API 的字段与权限协议；
- 模型是否长期使用当前供应商或模型版本；
- Sidecar Session 在“我的任务”中的长期筛选、归档与删除规则；
- 机构级 Context 保留期限和生产审计后台；
- 班级 Agent 何时从 Mock Adapter 切到真实 Runtime。

## 13. 用户确认与新增约束

用户于 2026-09-08 确认采用本设计，并补充锁定后续数据接入方向：完成 Sidecar Runtime 迁移后，将使用 DW Hunter 以只读方式获取 ClassIn 业务上下文，用于构造 Agent 对话和产物验证。

因此实现必须预留一个与数据来源无关的业务上下文 Interface。当前固定 Demo、后续 DW Hunter 查询和未来正式 ClassIn API Adapter 都只能向上返回受治理的 `ContextSnapshot`；页面、Agent Prompt 和业务 Module 不得依赖数据库实例、库表、SQL、凭据或 DW Hunter 私有知识。DW Hunter Adapter 负责知识检索、只读查询、权限、脱敏、最小化和来源映射，不负责业务写回。
