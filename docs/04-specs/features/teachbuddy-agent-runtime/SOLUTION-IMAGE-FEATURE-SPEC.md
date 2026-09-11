# 解题过程图片：16:9 本机排版导出

状态：用户授权实施（2026-09-10）。

## 范围与完成条件

自然语言要求“生成解题过程图片/16:9幻灯片图”时，Agent 调用 create_solution_image，提交标题、2–4步说明、公式及结论。结构化 JSON 草稿通过既有 ArtifactDraft 持久化，服务器将其确定性排为1600×900 PNG。IM 对话和主工作台均显示预览、打开大图和下载PNG；无需新Key，未正式发送到ClassIn。

Write Set：runtime/harness 工具、排版合同/模板与测试，服务端 PNG 渲染与HTTP路由，两个 Runtime Surface 的共享图片预览，persona，错误投影，适用测试与验收记录。沿用既有JSON文件格式作为可编辑源，PNG是该草稿的派生导出；不将JSON文件谎称PNG，不改变正式审批和消息发送规则。

## Interface 与边界

create_solution_image({title, steps:[{title, explanation, formula?}], conclusion})。title≤60字；每步title≤24字、说明≤140字、公式≤160字符；2–4步；结论≤140字。模型必须依据已有题干/解析，缺失条件应补问，不猜测。第一版不支持任意绘画、函数绘图或多页拼图；需精确函数图时不得伪称已绘制。

模板只接受结构化文字，转义HTML，KaTeX trust=false，禁止未知公式命令。Chrome 无JavaScript、阻断网络，只加载模板内嵌字体，检查页面是否溢出；无法放下明确报错不截断。对话接收PNG字节，结构化源仍由已有scope/session/artifact校验；跨scope拒绝。每次新请求生成独立草稿，重试按工具callId幂等。

状态：生成中沿用Run；完成显示图片预览；预览失败可重试；下载失败给明确提示；源持久保存，刷新后可重新渲染；长度限制单独提示，不能伪装用户停止。

## 验收

工具合同校验、HTML转义、公式安全、幂等、scope路由、PNG实际1600×900、图片预览和下载、无溢出；真实Gemini工具→草稿→最终回答→PNG完整调用。明确测试替身与真实模型证据。
