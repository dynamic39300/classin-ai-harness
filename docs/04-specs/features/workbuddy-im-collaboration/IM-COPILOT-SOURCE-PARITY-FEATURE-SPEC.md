---
title: IM Copilot 模拟基线恢复与源项目对齐 Feature Spec
status: IMPLEMENTED
version: v1.0
date: 2026-09-15
decision: D-157
---

# 组合与 Interface

默认 `ClassInProductComposition` 只装配固定 `BusinessContextAdapter`、`TeachingDynamicsAdapter`、Mock `MessageDraftAdapter` 与 Memory `MessageLifecyclePort`。`MessageWorkspaceProvider` 不接收 ClassIn Test extension，`WorkBuddyImProvider` 不解析真实测试 Thread 服务。真实测试 Module 保留为未装配实现。

`TeachingDynamics Module` 固定拥有顶部身份、引导文案、淡蓝灰 Surface、四阶段 Tab 和整栏折叠；Adapter 不能覆盖引导。`BusinessContextAdapter` 可选返回 `questionGuidance`、`mentionLabels` 和受控 IM Chat Context。`ImSidecarAgentSurface` 编排这些 Interface，不持有具体模拟问题、学生或业务时间。

# 对话与交付

页面恢复时记录既有 Session 回合和产物 ID，只隐藏其投影；新事件继续显示。恢复历史不修改 Session、Binding 或 Context。引用消息携带稳定消息 ID，发送前重读当前 Thread；引用内容被撤回、改变或出现后续讨论时阻止旧回复。

交付意图仍分为 `none / suggest / draft`。`draft` 的当前正文原位显示，并明确目标；直接发送对当前正文形成 Approval，编辑后发送产生新草稿版本。同步互斥覆盖上下文重读和 Adapter 执行。图片产物按其 `createdAt` 分配到相应回合并与事件时间排序，不能退回会话底部统一渲染。

# 真值与失败

默认数据来源为 `fixed-demo`，消息回执为 `SIMULATED`。加载、Runtime、引用、上下文和发送失败各自在受影响位置恢复，不切换到真实测试数据。真实 ClassIn 代码不得向默认 Thread 注入测试会话、教师身份、时间、来源横幅或状态文案。

# 验证

契约测试覆盖 21 问题白名单、问题点击保护、聊天读取范围、引用过期、身份显示、正文提取、提及和历史边界。组件测试覆盖整栏折叠、直接发送、失败重试和图片回合顺序。浏览器测试覆盖两个 IM 入口的首屏、帮助、引用、历史、草稿与响应式；最后执行全仓类型、Lint、Vitest、构建和适用 Playwright。
