# Gemini 3.5 Flash 识图接入（2026-09-10）

用户授权 `tokenhub/gemini-3.5-flash` 作为识图模型。范围：公司网关 Adapter 配置、BFF 模型选择、对应测试与图片附件 Spec；未改页面或正式消息发送。

实现：`company-gateway` 使用 OpenAI-compatible chat Adapter，复用服务端 `.env` 的 Base URL 与 Key，模型显式声明 text/image。BFF 根据明确 provider/model 选择，不依赖 rc2 缺失的模态字段。新会话明确选择 DeepSeek Flash，避免继承主机被其他会话改写的默认值；图片会话继续保留 Gemini 处理历史图片。内部默认恢复 Session 的 ID 加工作目录摘要，避免迁移后与旧目录同名 Session 冲突。

真实验收：
- 直接网关图文调用 Gemini 3.5 Flash 返回 HTTP 200。
- 经产品 BFF、Harness、公司网关完整链路发送本地生成的 32×32 红色 PNG，回答“红色”，状态 idle。
- 图片会话后续纯文本追问回答“红色”。
- session.models 确认图片会话使用 company-gateway/tokenhub/gemini-3.5-flash，新建文本会话使用 deepseek-official/deepseek-v4-flash。
- 图片上传和粘贴 Playwright 回归通过。

容量 32768 输入/4096 输出是本地保守预算，不是对网关上限的声明。未测试所有图片格式、长图或长上下文，也未专门验收该模型的 Agent 工具调用；简单识图与追问的真实证据不等于完整模型能力认证。凭据与测试图片均未提交。

最终检查：TypeScript 与 ESLint 通过；Runtime 26 项测试通过（含无模态字段的跨 Provider 选择、缺少指定模型拒绝入队、新文本会话固定路由）；1440×900 浏览器创建/轮询/恢复/审阅保存下载流程通过，截图检查无新增布局问题。UI 测试使用协议替身，真实模型证据单独见上文。

## 用户实际失败后的补充修复

此前单轮识图验收不足：用户原图解析已完成 create_teaching_draft，但第二轮因缺少 thought_signature 被网关拒绝（400）。根因为网关使用 tool_calls.extra_content.google，而 pi-ai 0.82.1 使用 reasoning_details。新增 gateway-compat 本机 Adapter 无损转译工具签名，通过现有 Harness replay 持久保存；不修改包缓存、不伪造签名。新 Adapter 使用随机 loopback 端口、固定模型与上游、认证与浏览器请求拒绝，并随 Harness 关闭。

新增验收：3 项签名/分片/HTTP 回放测试及全部 14 项 Harness 测试通过；真实 Gemini 图文→create_teaching_draft→工具结果→最终回答完成，生成 1 个草稿。用用户同一原图及原问题在新会话重跑，状态 idle、无错误、生成 1 个《动量守恒定律碰后速度正负号专题解析》草稿。原图仅包含学生提问截图而非完整第5题，生成的是专题讲解草稿，不能当作原题精确答案。未执行正式发布。

旧丢失签名的历史不能原地补造；model-history-invalid 错误引导重新添加图片，共享恢复策略为下一次提交创建新的 Session，保留原失败记录。
