---
title: 公司网关模型发现与文本/识图路由核查
date: 2026-09-10
status: RESEARCHED
---

# 公司网关模型发现与文本/识图路由核查

## 范围与结论

本次只核查接口与现有实现，Write Set 仅本文；未修改模型配置、运行代码或凭据。`GET /models`（当前 Base URL 带 `/v1`，实际为 `/v1/models`）可以读取当前 Key 可见的模型目录，但目录可见、支持识图、支持 Agent 工具调用、实际推理成功是不同事实。路由应由服务端按场景选择，保持统一教师入口，不要求教师挑选内部模型。

## 2026-09-10 实测证据

主任务通过本机已有凭据访问公司原有网关，凭据未写入本文：

- `GET /v1/models`：HTTP 200，返回以下 5 个 ID。
- `GET /v1/model/info`：HTTP 200，提供部分能力元数据。
- `GET /v2/model/info`：HTTP 403，当前 Key 无权读取；不得据此判断模型不可用。

| 模型 ID | `/v1/model/info` 能力证据 | 场景判断 |
| --- | --- | --- |
| `deepseek-v4-flash` | mode=chat；vision=false；function calling=true | 文本候选 |
| `deepseek-v4-pro` | mode/vision 未提供 | 能力待核实 |
| `tokenhub/gemini-3.5-flash` | mode/vision 未提供 | 能力待核实，不按名称猜测 |
| `gemini-2.5-pro` | mode=chat；vision=true；function calling=true | 图片理解已通过最小真实调用 |
| `foundry/gpt-image-2` | mode=image_generation；vision=true | 图片生成接口模型，不能据此当作聊天/识图 Agent 模型 |

最小识图实测：向配置中的 `/v1/chat/completions` 提交 `gemini-2.5-pro`，输入本地生成的 32×32 纯红 PNG data URL，要求只回答主色；HTTP 200，回答 `Red`。测试未发送用户附件或业务数据。这证明该 Key、网关及模型的基本图像输入链路可用。

一手来源：当前公司网关 `GET /v1/models`、`GET /v1/model/info`、`GET /v2/model/info` 的本次认证响应（由主任务核查，仅保留脱敏字段）。这份目录没有 GPT 聊天模型；不能把图片生成模型当作 ChatGPT 聊天模型。

本机 `session.models` 实测只返回 `deepseek-official` 一组：`deepseek-v4-flash`、`deepseek-v4-pro`、`deepseek-v4-flash-vision-exp`；当前选择为 flash，reasoning=high。其 vision-exp 不在公司网关上述目录中，且模型条目没有 `inputModalities`。

## 源码证据与原因

源码证据固定于迁移源仓库的 vendor checkout，commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`。当前 v2 的 vendor 目录为空，实际启动脚本固定安装 `@deepseek-ai/dsh@0.1.1-rc.2`；以下源码用于解释行为，本次响应用于验证运行态。

1. DeepSeek Adapter 的 `listModels()` 只是映射配置中的 `models`，没有访问 Base URL 的 `/models`；未知模型保守标为文本。因此只修改 Base URL 不会自动发现 Gemini/GPT。来源：[DeepSeek Adapter](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-deepseek/src/adapter.ts)，`listModels`、`modelInfoFor`。
2. 通用 `@deepseek-ai/dsh-llm-pi-ai` 支持自定义 provider，配置 `api: openai-completions`、`baseURL`、`apiKeyEnv`、`models`；模型配置字段为 `input: [text, image]`，Adapter 内部投影为 `inputModalities`。来源：[插件配置示例](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-pi-ai/src/index.ts)、[配置 Schema](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-pi-ai/src/config.ts)、[Adapter](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-pi-ai/src/adapter.ts)。
3. 通用 Adapter 的 `discoverModels` 对自定义 provider 才请求 `${baseURL}/models`，仅支持 `openai-completions` 和 `openai-responses` 的 Bearer 认证目录接口。若 provider 命中内置目录则直接返回本地目录，甚至不会请求自定义 Base URL。因此公司网关应使用独立 provider ID。发现结果只是候选，不自动保存；返回解析仅提取 ID、名称和部分容量信息，不推断图像能力。来源：[discovery.ts](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-pi-ai/src/discovery.ts)。
4. **rc2 的 `session.models` 公共合同不包含 `inputModalities`。** `ModelCatalogModel` 只有 ID、名称、描述、reasoning；`api-proxy` 投影也丢弃输入模态。因此内部 Adapter 声明视觉能力不等于服务端能从该 RPC 返回值发现它。来源：[sessions.ts](../../../../classin-ai-harness/vendor/deepseek-harness/packages/host/apiproxy/src/api/sessions.ts)、[api-proxy.ts](../../../../classin-ai-harness/vendor/deepseek-harness/packages/host/apiproxy/src/api-proxy.ts) 的模型目录投影。
5. 当前项目 `selectImageModel()` 仅搜索当前 provider，优先硬编码 vision-exp，其次检查上述实际不会返回的 `inputModalities`。测试 fixture 却添加了该字段，所以测试不能证明真实跨供应商识图选择可用。来源：[项目 Runtime](../../server/teachbuddy-runtime.ts)、[Runtime 测试](../../server/teachbuddy-runtime.test.ts)。

## 建议与未验证项

RECOMMENDATION：以服务端模型目录/能力配置为唯一场景路由依据。保留 DeepSeek 文本路由，增加公司网关的 OpenAI-compatible provider 承载已核实的 Gemini 聊天模型；通过 `session.selectModel` 选择显式 provider/model。不要把所有供应商模型塞入 DeepSeek 专用协议 Adapter，也不要依赖 `session.models.inputModalities`。

后续实现应先确认网关实际支持的 chat-completions 图文格式、流式事件、工具调用、上下文和输出容量，再配置模型的 `input` 与容量。文字请求可用 flash，图片请求可优先接入已通过最小识图验证的 gemini-2.5-pro。需要同时处理同一 Session 历史中已持久化图片的后续文字追问，不能仅凭本轮是否有新图就切回纯文本模型。候选模型不可用时应保留输入并返回可恢复错误。

本次已证明目录、能力元数据与 Gemini 最小识图调用成功；尚未验证应用 Harness 内的 Gemini 接入、跨模型历史重放、完整 Agent 工具闭环或 GPT 图片生成。具体实现需先更新目标 Feature Spec；本文不提升任何决策为 LOCKED。

## 后续集成核查：Gemini 工具回合签名

主任务后续实测：Gemini 3.5 图像请求能够发起 `create_teaching_draft`，但工具结果后的第二次模型请求返回 HTTP 400，错误指向缺失 `thought_signature`。这与纯图片识别成功不矛盾：失败出现在工具回合的历史重放协议。

本机安装的 `@earendil-works/pi-ai@0.82.1` 的 [openai-completions.js](/Users/eeo/Library/pnpm/store/v11/links/@earendil-works/pi-ai/0.82.1/ac7fbd8fbd70507c3eb197379582b5326ca4bd21115c3a232d33d59c2d14a08b/node_modules/@earendil-works/pi-ai/dist/api/openai-completions.js) 给出明确证据：

- 入站仅读取 `choice.delta.reasoning_details` 中的 `{type: 'reasoning.encrypted', id: <tool-call ID>, data: <nonempty string>}`，以完整 JSON 字符串保存到工具块的 `thoughtSignature`。签名早于工具 ID 到达时内部使用 pending map。
- 出站把工具块 `thoughtSignature` 解析回 JSON，组成 assistant 消息级 `reasoning_details`；没有读取或恢复 Google 的工具级 `extra_content.google.thought_signature`。
- Harness [replay.ts](../../../../classin-ai-harness/vendor/deepseek-harness/packages/llm/llm-pi-ai/src/replay.ts) 能保存并恢复工具 `thoughtSignature`，因此可以使用已有不透明重放通道，不需要把签名混入教师可见内容。

RECOMMENDATION：网关兼容 Adapter 入站将工具级 Google 签名按对应工具 ID 映射为上述 encrypted detail，并加内部格式标记；出站仅把该标记的 detail 按 ID 还原到对应工具的 `extra_content.google.thought_signature`。签名字节保持不变，不解码、不伪造、不删减；已有其他供应商 reasoning detail 不应被误转换或覆盖。流式处理必须按 choice/tool index 关联跨事件出现的 ID 和签名；并行调用只给实际带签名的工具还原，多步骤调用保留每个历史步骤。只能保证工具调用签名的往返，不能宣称已保留所有非工具内容的扩展字段。

Google 官方规定签名应原样回传到原来的内容部分；Gemini 3 工具调用缺签名会导致 400，调低 thinking 也不能规避；并行调用通常只有首个工具带签名，顺序调用必须保留各步签名。来源：[Google Thought signatures — OpenAI compatibility](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures#signatures-for-openai-compatibility)。

验证应覆盖签名与 ID 分事件、多个并行工具、连续两步工具、会话恢复及现有 reasoning detail 共存。本文仅提供证据与映射约束，兼容桥的实现与最终实测由主任务记录。
