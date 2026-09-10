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
