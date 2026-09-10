---
title: TeachBuddy 可审计分析过程 Feature Spec
status: APPROVED
version: v1.0
date: 2026-09-08
decision: D-123
---

# 问题与结果

TeachBuddy 当前只显示“正在处理”，教师无法判断请求是否被接收、上下文是否被读取、能力是否正常执行，也不能在完成后追溯依据。所有 TeachBuddy Agent 窗口必须用同一份运行事实投影一个可展开的“分析过程”，在等待期间连续反馈状态，在完成、停止或失败后保留可审计记录。

该功能展示产品级执行摘要，不公开模型原始思维链。最终回答和 Artifact 仍是主要结果，分析过程只解释系统做了什么、使用了哪些经授权的上下文、产生了什么回执和哪些事实尚不能确认。

# 范围

覆盖 `ideal-full`、`classin-mvp`、`standalone-teacher` 三个 Runtime Scope 的所有 TeachBuddy 主工作台，以及 IM 右侧 TeachBuddy Sidecar 和从 Sidecar 打开的同一 Session。以后新增 TeachBuddy Agent Surface 必须消费相同投影。

班级 Agent、公开群聊 `@Agent`、AgentIn 目录和 TeacherIn 不在本功能范围。M3 的模型结构化 `reasoning_summary` 在本轮不开放；本轮只消费已有运行事件、上下文快照和回执。

# 用户故事

1. 作为教师，我提交请求后立即看到“已接收请求”和真实计时，因此知道系统已经开始工作。
2. 作为教师，我在运行中看到当前步骤、已完成步骤和真实能力调用，因此能区分正常执行与卡住。
3. 作为教师，我能展开 Context、Tool、Artifact、Approval 和 Receipt 的来源摘要，同时看不到其他 Thread、未授权学生或技术密钥。
4. 作为教师，我停止或遇到失败后仍能看到执行到了哪里，并使用原有恢复动作继续。
5. 作为从 IM 发起任务的教师，我在 Sidecar 和主工作台看到同一 Session 的同一步骤、顺序和状态。
6. 作为窄屏用户，我能读取当前步骤和最近记录，过程区不会横向溢出、抢焦点或遮挡 Composer。

# 行为合同

## 投影

`AnalysisProcessProjection` 是无 React/DOM 依赖的只读 Domain Projection。输入为 Session ID、Session 状态、`ConversationRunEvent[]`、当前时间和可选的受治理 Context 摘要。输出包含开始时间、实际耗时、统一状态、默认展开规则和有稳定来源引用的步骤。

- `teacher_message` 产生“已接收要求”；
- `goal_understood`、`context_confirmed`、`plan`、`process` 映射为相应业务阶段；
- `capability_call` 和 Tool/Skill Actor 显示能力名、用途、输入/输出摘要、耗时及对象引用；
- `artifact`、`proposed_action`、`approval`、`receipt`、`evaluation` 显示对应业务结果；
- `error` 或失败状态保留已完成步骤并标出失败点；
- 只有 Context Snapshot 实际存在时才生成 Context 步骤；没有事件时不得声称正在读取或调用。

运行中 `elapsedMs = now - startedAt`；稳定结束后由最后事件时间冻结。异常时间戳归零处理，不产生负数。前端每秒只刷新耗时显示，不改变步骤或伪造进度。

## 呈现

主工作台使用 `full`：运行时默认展开全部步骤，完成后折叠为“已完成分析 · N 个步骤 · Ns”，教师可重新展开。Sidecar 使用 `compact`：展开后优先保留当前步骤和最近两个已完成步骤，并提供进入同一 Session 主工作台的既有路径。

共享组件提供明确标题按钮、`aria-expanded`、可见焦点态和当前步骤 `role=status`。动画只用于当前运行节点，`prefers-reduced-motion` 时停用。用户上滚时现有对话尾随规则继续生效，组件更新不主动移动焦点。

最终 Agent 回答继续使用原消息视图；Tool/Skill 技术事件由分析过程承载，不再作为同级聊天气泡重复显示。

# 状态

| Runtime / Event | 投影状态 | UI |
| --- | --- | --- |
| running | running | 默认展开，当前节点动画，真实计时 |
| idle 且已有事件 | completed | 自动折叠，可展开审计 |
| stopped | stopped | 保留步骤，标出已停止 |
| failed / error | failed | 保留步骤，失败节点和既有重试操作 |
| requires_teacher_input | needs_information | 展开缺失信息，等待教师补充 |

# 数据与隐私

步骤摘要只读取已授权投影字段。禁止显示系统 Prompt、隐藏推理 Token、数据库表/SQL、密钥、完整原始 Context、跨教师/Thread 数据和未经验证的中间猜测。`sourceEventRefs` 和 `objectRefs` 必须保留，以支持后续证据面板和评测。

# 验收标准

1. 请求接受后在已有 Session 首个 UI 更新内出现分析过程；首个真实阶段事件到达后替换等待描述。
2. 运行、完成、停止、失败和需要补充均有确定性投影，刷新后步骤顺序一致。
3. 完成耗时冻结；运行耗时真实增长；无负数和固定伪计时。
4. 三个 Runtime Scope 共用主工作台实现，IM Sidecar 共用同一 Projection/Component。
5. 同一 Session 在 Sidecar 和主工作台具有相同步骤来源、状态与顺序。
6. Tool/Skill 不再重复渲染成聊天消息；最终回答和 Artifact 行为不变。
7. 1440×900、900×720 和 390×844 无横向溢出、Composer 遮挡与不可达操作。
8. 自动化覆盖投影来源、状态、真实耗时、折叠、紧凑裁剪、停止/失败和无原始推理展示。

# Write Set

- `src/domain/workbuddy/analysis-process.ts` 及测试；
- `src/features/agent-runtime/AnalysisProcess.tsx`、样式、导出和主 Runtime Surface；
- `src/features/workbuddy-im-assistance/ImSidecarAgentSurface.tsx` 与局部布局样式；
- 对应 Runtime/Sidecar E2E；
- 本规格、D-123、Ticket 与实施验收记录。

不修改 Harness 原始 reasoning 过滤、模型供应商、Session 数据空间、业务写回 Gate、真实数据库 Adapter 或其他 Agent 产品。
