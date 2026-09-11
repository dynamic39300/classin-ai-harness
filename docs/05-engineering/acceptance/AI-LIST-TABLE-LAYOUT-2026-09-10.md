# AI 提醒列表与表格排版修复

原文证据：用户截图“学生最容易踩的坑”是两条 Markdown 无序列表，不是表格。`.agentEvents li { display:flex }` 命中了正文嵌套 li，将加粗内容、文字与公式分成独立 flex item，产生伪列布局与公式挤压。

Write Set：WorkBuddyImSidecar.module.css、AgentRichResponse.module.css、本文。将消息外层 li 规则收窄为直接子元素；正文恢复原生 list-item 自然换行。真实 GFM 表格在已有外边框、表头背景、行分隔线基础上补列分隔线。不改生成内容、公式数据或业务状态。

浏览器验证使用真实 AgentRichResponse、Sidecar CSS 与 Tokens，在540px容器内复现原文：两条提醒连续排版；computed display 均为 list-item，表格列线为 solid。已目视确认截图无拆列、遮挡，数学符号完整。类型检查、Lint与已有富文本测试通过。
