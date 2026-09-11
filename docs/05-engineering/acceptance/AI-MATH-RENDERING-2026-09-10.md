# AI 消息公式排版修复

用户截图中 `$420 \\times 16$` 等公式被当作文字显示。共享 AgentRichResponse 原先只有 GFM，没有数学语法解析与排版。

Write Set：AgentRichResponse 组件、样式与测试，package.json / package-lock.json 及本文。添加 remark-math、rehype-katex 与本地 KaTeX 字体样式。覆盖 $ 行内、$$ 公式块与同一行连续 $$、分数、上下标及中文单位；原回答不改写，不重新调用模型。禁用可信 HTML/公式命令；代码片段保持字面量，非法或流式未闭合公式不导致整条回复崩溃。块公式在窄容器内可横向滚动。

验收：4 项组件测试通过，TypeScript、ESLint 通过；浏览器使用真实组件渲染截图中的算式，乘号、分数、上下标及单位正常显示，无原始 LaTeX 标记。没有修改页面结构或模型调用。

边界：本次作用于使用 AgentRichResponse 的 AI 消息助手回答；纯文本编辑器、导出原文及其他尚未使用富文本组件的页面仍保留源格式。非标准或不完整 LaTeX 仍可能显示可读错误/原文，未承诺任意 TeX 宏包支持。
