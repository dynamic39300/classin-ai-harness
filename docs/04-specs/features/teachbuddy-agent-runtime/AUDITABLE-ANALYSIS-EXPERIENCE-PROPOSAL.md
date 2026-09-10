---
title: TeachBuddy 可审计分析过程体验提案
status: APPROVED_FOR_IMPLEMENTATION
version: v1.0
date: 2026-09-08
owner: ClassIn AI Native Product Design
decision: D-123
---

# TeachBuddy 可审计分析过程体验提案

## 1. 目标与结论

参考用户提供的腾讯 IMA（Copilot）截图，TeachBuddy 应把当前单行的“正在处理”升级为持续更新的**分析过程**：任务提交后立即确认已接收，随后展示目标理解、上下文读取、方案组织、能力调用、结果复核等可验证步骤，并显示真实处理时长。

推荐展示的是**面向教师的可审计分析摘要**，不是模型内部原始思维草稿。教师可以看懂“用了什么信息、做了哪些判断、调用了什么能力、哪些事实不能确认”，同时避免把不稳定的中间猜测、提示词、数据库细节或隐藏推理当成产品事实。

用户于 2026-09-08 明确确认：本能力适用于**所有 TeachBuddy Agent 运行窗口**。统一覆盖：

1. ClassIn 首页导航和首页快捷入口进入的 TeachBuddy；
2. ClassIn 一级导航 `TeachBuddy → 我的任务`，即 `ideal-full`；
3. ClassIn 班级课程详情页入口进入的班级 TeachBuddy，即 `classin-mvp`；
4. ClassIn IM 右侧 TeachBuddy Sidecar，以及从 Sidecar 进入主工作台后的同一 Session；
5. 独立 TeachBuddy 产品的 Agent 工作台，即 `standalone-teacher`；
6. 后续新增的任何 TeachBuddy Agent Surface。

学生/教师使用的班级 Agent、公开群聊 `@Agent`、AgentIn 目录项和 TeacherIn 内容入口拥有其他身份，不属于 TeachBuddy Agent Surface，不能仅因同样使用 AI 而自动继承本组件。

用户于 2026-09-08 审阅通过本方案，并授权按标准工程流程实施。正式行为合同见 [Feature Spec](./AUDITABLE-ANALYSIS-FEATURE-SPEC.md)，实施拆分见 [Ticket Breakdown](./AUDITABLE-ANALYSIS-TICKET-BREAKDOWN.md)。

## 2. 用户看到什么

### 2.1 运行中

```text
TeachBuddy
正在分析 · 8s

分析过程                                      收起
│ ✓ 已理解任务
│   需要根据当前群聊整理近期教学重点，并形成作业跟进建议
│
│ ✓ 已核对上下文
│   当前教学群 · 最近消息 6 条 · 数据截至 9 月 7 日
│
│ ◌ 正在组织建议
│   区分已知任务与无法确认的提交状态、截止时间
│
│ · 等待复核结果
```

体验规则：

- 提交后立即出现“已接收请求”，不等待模型首个文本 Token；
- 当前步骤使用轻量动画，已完成步骤显示完成状态，未开始步骤只显示名称；
- 每个步骤最多两行摘要，长内容在展开详情中查看，不滚动刷屏；
- `已处理 8s` 使用 Runtime 实际时间，不模拟固定耗时；
- 用户停留在底部时过程自动跟随；用户上滚后不抢滚动位置或焦点；
- “停止”持续可见，停止后保留已完成步骤和当前停止位置。

### 2.2 完成后

完成时，分析过程自动收敛为一行：

```text
✓ 已完成分析 · 4 个步骤 · 12s                    展开
```

随后展示最终回答或 Artifact。用户展开后仍能查看步骤、证据摘要与能力调用记录。分析过程不与最终回答争夺主要阅读空间。

### 2.3 失败、停止与等待补充

| 状态 | 分析过程表现 | 用户动作 |
| --- | --- | --- |
| 需要补充 | 当前步骤标记“需要信息”，列出缺少的业务对象或教师输入 | 补充后继续同一 Run |
| 可恢复失败 | 保留已完成步骤，失败步骤显示教师可理解的原因 | 重试当前步骤 / 修改要求 |
| 权限不足 | 显示未读取的数据范围，不展示未授权内容 | 调整对象 / 返回 |
| 教师停止 | 当前步骤标记“已停止”，不伪装为完成 | 继续 / 新建任务 |
| 上下文变化 | 标记旧证据已过期，并说明需重新核对 | 刷新上下文后继续 |

## 3. 展示内容分层

### 3.1 一级：步骤标题

一级内容用于填补等待感，始终可见：

- 正在理解您的任务；
- 正在核对当前班级与最近消息；
- 正在整理教学重点；
- 正在生成可审阅内容；
- 正在复核对象、事实与表达范围。

### 3.2 二级：可验证摘要

二级内容解释“为什么走到这一步”，但只使用稳定业务语言：

- “从最近 6 条消息中识别到作文习作、现代文阅读两类任务”；
- “群聊没有结构化提交状态，因此不生成未交名单”；
- “个人内容将转入对应学生私聊，当前群聊只生成共同提醒”；
- “已生成 Markdown 文稿，等待教师审阅”。

### 3.3 三级：证据与能力详情

用户主动展开时展示：

- Context 来源名称、时间窗口、版本和已使用条数；
- Skill / Tool / Adapter 的产品名称与用途；
- 输入摘要、输出摘要、耗时和 Artifact 引用；
- 被排除的敏感信息数量和证据边界。

不展示：系统 Prompt、密钥、数据库/表/SQL、模型内部 Token、未经验证的中间猜测、完整隐藏推理链、其他学生或 Thread 的信息。

## 4. 各 TeachBuddy Agent Surface 的一致性与差异

| 维度 | 主工作台（`ideal-full` / `classin-mvp` / `standalone-teacher`） | IM Sidecar |
| --- | --- | --- |
| 默认展开 | 运行时展开，完成后折叠 | 运行时只展开当前步骤和最近两个已完成步骤 |
| 过程宽度 | 与对话正文共用内容列 | 占满 Sidecar 可用正文宽度 |
| 详情 | 可查看完整步骤、证据与能力详情 | 只看摘要；“查看完整过程”进入同一 Session 主工作台 |
| 长过程 | 本地滚动，步骤可逐项展开 | 固定最大高度，内部滚动，不推走 Composer |
| 完成后 | `已完成分析 · N 步 · Ns` | `已完成 · Ns`，保留展开入口 |
| 数据边界 | 按各 Product Scope 的 Context 权限显示 | 按当前消息 Thread 的 Context 权限显示 |

所有窗口使用同一 `AnalysisProcessProjection`、状态语义、步骤顺序和视觉组件。Surface 只允许因可用宽度改变信息密度，不得按入口复制或生成互相矛盾的“思考文案”。

## 5. 信息架构与视觉

推荐名称为 **“分析过程”**。它比“深度思考”更符合教师产品语境，也不会暗示正在逐字披露模型私有思维。

- 容器不使用重卡片和大边框，只用浅色背景、左侧细线和步骤节点；
- 当前步骤使用 TeachBuddy 品牌绿色 Spinner，完成节点使用 Check；
- 正文使用次级文字色，步骤标题使用主文字色；
- 展开/收起位于标题行右侧，整个标题行可点击并提供明确焦点态；
- 处理时间和真值标签属于低权重元数据；
- 过程流最大高度建议：主工作台 `18rem`，Sidecar `12rem`；超出后容器内部滚动；
- `prefers-reduced-motion` 下取消旋转和渐变动画，只保留静态状态变化。

## 6. 事件与接口方案

现有 `ConversationRunEvent` 已覆盖：

- `goal_understood`；
- `context_confirmed`；
- `plan` / `process`；
- `capability_call`；
- `artifact`；
- `proposed_action` / `approval` / `receipt`；
- `error` / `system`。

新增的是 Presentation Projection，不新增第二套 Run 状态：

```ts
type AnalysisProcessProjection = Readonly<{
  runRef: string;
  status: 'running' | 'needs_information' | 'stopped' | 'failed' | 'completed';
  startedAt: string;
  elapsedMs: number;
  defaultExpanded: boolean;
  steps: readonly Readonly<{
    id: string;
    sourceEventRefs: readonly string[];
    label: string;
    summary: string;
    state: 'queued' | 'running' | 'completed' | 'failed' | 'stopped';
    evidenceLabels: readonly string[];
    elapsedMs?: number;
  }>[];
}>;
```

`AnalysisProcessProjection` 只从真实 Runtime Event、Context Snapshot 和能力回执派生。没有事件时只显示“请求已接收，等待开始分析”，不得用前端计时器伪造“正在读取”“正在调用”等步骤。

## 7. 过程内容的生成规则

1. **确定性事件优先**：Context 捕获、Tool 调用、Artifact 产生、Approval 和 Receipt 直接由系统事件生成文案。
2. **模型摘要独立**：若需要解释目标理解或判断依据，由模型输出单独的短 `reasoning_summary` 结构化字段；它不是原始推理 Token，必须满足字数、敏感信息和业务事实校验。
3. **事实与推断分开**：事实写“群聊显示……”，推断写“据此建议……”，未知写“当前无法确认……”。
4. **完成后不可改写历史**：步骤完成后只允许由新事件标记为“已更新/已替代”，不能静默改成另一段理由。
5. **不为等待而造假**：模型或 Tool 已完成就立即进入结果，不人为延长步骤动画。

## 8. 推荐实施顺序

### M1：真实事件过程条

- 主工作台把当前“正在处理”替换为分析过程容器；
- 使用已有 Goal、Context、Process、Capability、Artifact 事件；
- 支持真实耗时、停止、失败、完成折叠和刷新恢复；
- 同步提供 Sidecar 紧凑投影。

### M2：证据和能力详情

- 展开步骤可见 Context 来源、时间范围、输入/输出摘要；
- Tool/Skill 事件关联 Artifact；
- 增加过期、权限、排除敏感信息和证据不足表达。

### M3：分析摘要质量

- 在 Runtime 协议支持结构化摘要时，加入目标理解和判断依据摘要；
- 建立事实性、简洁度、隐私和跨 Thread 隔离评测；
- 只有通过评测后才在生产 Profile 默认开放。

## 9. 验收标准

- 请求被接受后 300ms 内显示可感知状态；首个真实阶段事件到达后替换占位状态；
- 运行中至少能区分已完成、当前和等待步骤；完成后自动折叠且可恢复展开；
- 处理时间来自实际时间戳，刷新后保持一致；
- 主工作台和 Sidecar 对同一 Session 的步骤、状态和顺序一致；
- `ideal-full`、`classin-mvp` 与 `standalone-teacher` 使用同一组件和事件协议，同时保持各自 Context 与 Session 空间隔离；
- 失败、停止、需要补充、权限拒绝和上下文过期均保留过程证据与恢复动作；
- 不显示隐藏推理、Prompt、数据库细节、凭据或未经授权的数据；
- 桌面与窄屏无横向溢出，过程容器不会遮挡或推走 Composer；
- 屏幕阅读器能获知当前步骤变化，但历史步骤不会重复播报；
- 自动化测试证明 UI 步骤来自 Runtime Event，前端不能自行伪造已完成步骤。

## 10. 已确认的实施项

| 评审项 | 推荐默认值 |
| --- | --- |
| 产品名称 | “分析过程” |
| 运行中 | 默认展开 |
| 完成后 | 自动折叠为一行，可再次展开 |
| Sidecar | 当前步骤 + 最近两步，完整过程进入主工作台 |
| 内容深度 | 步骤标题 + 两行摘要；证据详情按需展开 |
| 信息来源 | 真实 Runtime Event + Context/Tool/Artifact 回执 |
| 模型说明 | 只允许结构化可审计摘要，不展示原始隐藏推理 |
| 首次开发范围 | M1 + M2；M3 在摘要质量评测后开启 |
