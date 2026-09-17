---
title: TeachBuddy IM 对话运行体验 Ticket Breakdown
status: COMPLETE
version: v1.2
date: 2026-09-10
decision: D-151, D-152, D-153
---

# 纵向 Tickets

| Ticket | 纵向结果 | Write Set | 完成定义 |
| --- | --- | --- | --- |
| IM-CRUX-01 | 一次运行成为连续对话回合 | `AnalysisProcess*`、`analysis-process.ts`、Sidecar 事件投影及测试 | 教师气泡、业务进展、可选处理过程和结果连续呈现；compact 不显示步骤计数；full 不回归 |
| IM-CRUX-02 | 结果原位进入审阅和发送 | Sidecar 草稿/交付编排、局部样式及测试 | 最后一条 Agent 结果与编辑正文不重复；发送/插入结束本轮；失败可恢复；不显示成功状态卡 |
| IM-CRUX-03 | 生成中输入与视觉验收 | Composer 调用、E2E、截图、Implementation Review | 生成中可输入且不可重复提交，停止可达；1440×900 无卡片堆叠、溢出或 Composer 遮挡；范围检查通过 |
| IM-CRUX-04 | 按意图区分回答与消息交付 | 消息交付意图 Projection、Sidecar 审阅/转换/取消编排及测试 | 普通查询无审阅入口；沟通建议提供轻量转换；明确消息任务可审阅；取消不发送并恢复原回答 |
| IM-CRUX-05 | 审阅区只接收消息原文 | Message Draft 正文边界合同、兼容提取、Sidecar 与 E2E | 新生成结果精确提取标记正文；旧回答剔除首尾说明；纯正文保持原样；内部标记不对教师显示 |

# 依赖顺序

IM-CRUX-01 建立对话层级；IM-CRUX-02 在相同回合内完成交付闭环；IM-CRUX-03 做跨状态和视觉收口。每张 Ticket 都以老师可演示的结果验收，不拆成单独的 CSS 或字段任务。

五张 Ticket 已于 2026-09-10 完成，证据见 [Implementation Review](./COPILOT-CONVERSATION-RUN-UX-IMPLEMENTATION-REVIEW.md)。

## 2026-09-15 增量

| Ticket | 结果 | Write Set | 验收 |
| --- | --- | --- | --- |
| IM-CRUX-06 | 结构化消息预览与发送正文一致 | im-message-draft及测试、Sidecar | 列表逐项展示；无AI寒暄混入消息；普通文字与代码不误拆 |
| IM-CRUX-07 | 修改与直接发送分开 | Sidecar、局部CSS、组件/E2E | 两入口一致；明确目标；编辑不发送；直接发送不打开编辑器；失败重试、连击去重与上下文复核 |

验收记录见 [本次交付检查](./COPILOT-DRAFT-DELIVERY-REVIEW-2026-09-15.md)。

IM-CRUX-08：在 `AgentRichResponse` 增加按调用方提供名称启用的提及样式，由共享 Sidecar 注入当前上下文名称；复用信息蓝语义 Token。验证全体、多人、嵌套列表/加粗、邮箱/代码/未知姓名不误标，两个 IM 入口一致，发送正文不含展示标签。

IM-CRUX-09：在正文生成合同与 Sidecar 草稿样式中收紧分段规则、段落和列表间距，保留字号、@标签和逐项日程。Write Set 为 im-message-draft、共享Sidecar局部样式和现有浏览器验收；核对两入口列表可读、发送原文不变及无溢出。
