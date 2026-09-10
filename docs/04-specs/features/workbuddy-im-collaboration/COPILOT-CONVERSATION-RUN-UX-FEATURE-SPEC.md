---
title: TeachBuddy IM 对话运行体验 Feature Spec
status: APPROVED
version: v1.2
date: 2026-09-10
decision: D-151, D-152, D-153
---

# 行为合同

`AnalysisProcessProjection` 继续作为 Runtime Event 到可审计过程的唯一 Domain Projection。Sidecar 不建立第二套 Run 状态，只通过 `AnalysisProcess` 的 `compact` 模式压缩呈现；主工作台 `full` 模式保持原合同。

## Compact 分析投影

Compact 摘要的 Interface 为：

- 身份：固定显示 `TeachBuddy`；
- 当前动作：从当前真实步骤的产品文案投影；没有可验证步骤时显示“正在理解你的要求”；
- 耗时：来自 Projection 的真实 `elapsedMs`；
- 结束语义：完成为“已整理好”，失败、停止和等待补充使用对应可恢复文案；
- 展开入口：统一命名“处理过程”；运行和完成默认折叠，失败或需要补充默认展开。

Compact 模式不得在主摘要中显示步骤数量、Tool/Skill 技术名、内部等待事件或“已完成分析”。展开区最多显示当前步骤与最近两个相关步骤，使用固定最大高度和内部滚动。

## 对话回合投影

Sidecar 仍按 `splitAnalysisProcessTurns()` 将持久事件归入教师回合。每轮按以下顺序投影：

1. 教师消息气泡；
2. Compact 分析摘要；
3. Agent 最终回答；
4. 仅在该轮具有消息交付意图时，与最终回答相邻显示审阅或转换动作。

教师和 Agent 的事件标题不再另行显示。错误事件继续保留可见标题和恢复信息。Tool/Skill 事件只进入分析投影，不作为聊天气泡重复出现。

## 草稿与交付

点击审阅动作后，当前轮最后一条 Agent 回答由可编辑消息正文原位替换。`MessageDraftArtifact`、`ProposedAction`、`Approval` 和 `ExecutionReceipt` 的领域合同不变。

`projectImMessageDeliveryIntent()` 将教师可见要求保守投影为三种 Sidecar affordance：

- `none`：查询、分析、事实总结和普通咨询，只显示回答；
- `suggest`：询问如何提醒、回复或沟通，显示低强调转换动作；
- `draft`：顶部教学任务或明确的写消息、通知、提醒、回复要求，显示审阅动作。

该 Projection 是当前 Runtime 尚未返回结构化消息产物类型时的 Deep Module。页面只消费结果，不自行拼接关键词规则；未来 Runtime 提供稳定 Artifact Kind 后可在该 Interface 内替换。

消息生成请求由 `buildMessageDraftRuntimeRequest()` 附加不可见的正文边界合同，教师气泡仍只显示教师原始要求。`extractMessageDraftBody()` 按以下顺序形成编辑器正文：

1. 优先读取 `TEACHBUDDY_MESSAGE_BODY_START/END` 边界内的唯一消息原文；
2. 对未遵循边界合同的旧回答，兼容清除开场说明、独立分隔线、消息标题、要点解释和结尾调整建议；
3. 已经是纯正文的 Artifact 保持原样。

正文提取失败时保留非空原始结果，不能生成空草稿。边界标记和内部生成要求不得出现在教师气泡或最终 IM 消息中。

- 群聊：按钮明确发送目标，发送前重新捕获 Context 并校验；
- 私聊：插入目标输入框，仍由老师在 IM 中发送；
- 发送或插入成功：记录内部 Receipt/采纳事实，关闭审阅区，不渲染成功状态卡；
- 失败：保留修改后的正文和错误，允许重试；
- 取消：关闭编辑区、丢弃本次未发送修改并恢复原回答；不产生 Receipt 或状态卡；
- 已采纳的 Agent Event ID 仅作为当前 Sidecar 的 UI 临时状态，防止当前轮重复出现审阅按钮；它不是新的业务状态。

## Composer

Runtime 运行或发送请求等待期间只禁止提交，不禁止编辑 Composer。图片和文字作为下一轮草稿保留。停止命令与当前 Session 绑定并保持可达；停止成功后继续同一逻辑对话。

# Module 与 Write Set

- `AnalysisProcess` Module：保持共享 Interface，通过 `mode='compact'` 提供 Sidecar 投影密度；
- `ImSidecarAgentSurface` Module：编排对话回合、审阅替换、交付结束和 Composer 命令；
- `WorkspaceComposer` Module：本轮不扩展公开 Interface；调用方分开控制 `disabled` 与 `canSubmit`；
- Domain 的分析、草稿、审批和回执 Interface 不变；新增消息交付意图 Projection，隔离当前文字判定与页面。

Write Set：

- `src/domain/workbuddy/analysis-process.ts` 中仅允许修正面向用户的空等待文案；
- `src/domain/workbuddy/im-message-delivery-intent.ts` 及测试；
- `src/domain/workbuddy/im-message-draft.ts` 的正文生成合同、提取 Projection 及测试；
- `src/features/agent-runtime/AnalysisProcess.tsx` 与样式；
- `src/features/workbuddy-im-assistance/ImSidecarAgentSurface.tsx` 与 Sidecar 局部样式；
- 对应 Domain、Runtime、Sidecar 测试和视觉验收；
- 本 PRD、Spec、Tickets、Implementation Review、D-151 与追踪索引。

# 兼容和失败

- 刷新后仍由稳定 Session ID 恢复历史事件；
- UI 临时采纳标记刷新后不恢复，但已发送消息仍以 IM 事实存在；当前 Demo 不新增持久化采纳索引；
- 连接、权限、上下文校验和发送失败继续使用既有恢复命令；
- 主工作台的 full 分析模式不因 Sidecar 样式调整而改变。

# 自动化合同

- compact 摘要没有步骤数量和“已完成分析”；
- full 摘要仍保留完整状态和步骤计数；
- Sidecar 每轮教师消息、处理过程、最终结果顺序稳定；
- 进入审阅后最后结果不重复；
- 发送成功后审阅区和成功状态卡均消失，消息 Adapter 只执行一次；
- 普通查询没有审阅动作，沟通建议只有转换动作，明确消息要求和顶部任务具有审阅动作；
- 取消审阅不调用消息 Adapter，恢复原回答和审阅入口；
- 审阅正文不包含 Agent 开场、背景说明、分隔线、写法解释和结尾建议；纯正文 Artifact 不被改写；
- 运行期间 Textarea 可编辑、发送不可用、停止可用；
- 展开处理过程具备无障碍名称、受控高度和无横向溢出。
