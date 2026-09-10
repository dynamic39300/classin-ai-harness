---
title: TeachBuddy IM Sidecar LUI 开源方案调研
status: ACCEPTED
date: 2026-09-08
decision: D-122
---

# TeachBuddy IM Sidecar LUI 开源方案调研

## 1. 研究问题

当前 Sidecar 把 DeepSeek 返回的 Markdown 当作 `white-space: pre-wrap` 文本展示，教师会直接看到 `###`、`>`、`**` 和表格竖线。目标是在不替换现有 DeepSeek Harness、Session、Context Snapshot、Artifact 和 Approval 状态模型的前提下，引入成熟的 LUI 响应渲染能力。

本研究只使用项目官方 GitHub 仓库作为实现和活跃度证据。Star 数为 2026-09-08 的页面观测值，会随时间变化。

## 2. 候选方案

| 方案 | GitHub 观测 | 适配性 | 结论 |
| --- | ---: | --- | --- |
| [assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui) | 约 10.3k stars | 提供完整 AI Chat Runtime、线程和组合式 UI；能力完整，但会与项目已有 Runtime/Session/Artifact 状态重叠。 | 保留为未来完整聊天工作台参考，本轮不迁移 Runtime。 |
| [vercel/ai-elements](https://github.com/vercel/ai-elements) | 约 2k stars | `MessageResponse` 体现“消息外壳 + Markdown/GFM + 可替换组件”的 LUI 组合方式；官方前置为 Next.js、shadcn/ui 和 Tailwind。 | 采用组件构成思路，不引入其前端栈。 |
| [remarkjs/react-markdown](https://github.com/remarkjs/react-markdown) | 约 15.7k stars | 将 Markdown 转为 React 元素，支持自定义组件，默认不执行原始 HTML，能嵌入现有 Vite/React/CSS Modules。 | 选为渲染内核。 |
| [remarkjs/remark-gfm](https://github.com/remarkjs/remark-gfm) | remark 官方生态 | 补齐表格、任务列表、删除线和自动链接等 GFM 语法。 | 与 `react-markdown` 配套使用。 |

## 3. 选型

Sidecar 新增项目级 `AgentRichResponse` Design System 组件，以 `react-markdown + remark-gfm` 为安全渲染内核，并采用 AI Elements 的 MessageResponse 组合方式：消息事件继续由项目 Runtime 提供，富文本组件只负责响应内容的语义投影。

组件覆盖标题、段落、列表、任务列表、引用、表格、链接、分隔线、行内代码与代码块。表格在 Sidecar 内横向局部滚动；引用用品牌色提示块；模型提供的原始 HTML 不执行。教师消息、Tool/Skill 记录和可编辑最终话术仍使用各自已有的视觉和交互契约。

## 4. 对当前架构的影响

- `AgentRichResponse` 属于 Design System，不读取 Runtime、业务 Context 或消息状态。
- `ImSidecarAgentSurface` 只在 `actor=agent` 时使用富文本渲染；会话恢复、停止、失败、Artifact 与审批行为不变。
- 不引入第二套 Tailwind/shadcn Token，不让外部框架接管现有 Thread Session。
- 安全边界依赖 `react-markdown` 的 React AST 投影并显式 `skipHtml`；链接在新窗口打开且设置 `rel=noreferrer`。

## 5. 数据展示说明

真实群名与聊天正文属于本机受控演示数据，不进入本研究文档。仓库只记录数据接口、校验和真值规则；具体值由 `.runtime/private/im-demo-context.json` 提供，该目录已被 Git 忽略。
