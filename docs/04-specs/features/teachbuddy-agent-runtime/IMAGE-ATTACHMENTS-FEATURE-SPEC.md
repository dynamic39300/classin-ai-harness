# TeachBuddy 图片附件 Feature Spec

状态：`APPROVED / IMPLEMENTED`

## 1. 问题与结果

TeachBuddy 主工作台和 IM Sidecar 当前只能提交文字，教师无法把板书、题目截图、学生作品或课件页面直接交给同一个 Agent。本次让两个入口共享一条图片附件闭环：教师可从系统文件选择器添加图片，也可复制图片后在输入框按 `Ctrl+V` / `Cmd+V` 粘贴；发送后图片随当前文字、业务 Context 和稳定命令 ID 进入同一 Runtime Session。

## 2. 范围与 Write Set

范围内：

- `ideal-full`、`classin-mvp`、`standalone-teacher` 使用的主 Agent Runtime Surface；
- 教师 IM 右侧 `ImSidecarAgentSurface`；
- 共享 `WorkspaceComposer` 的图片选择、粘贴、缩略图、移除与错误状态；
- `AgentRuntimeAdapter`、HTTP BFF 和 Harness Prompt 的图片契约；
- 图片单独发送、文字加图片、失败保留与相同命令重试。

范围外：

- 普通 ClassIn IM 消息输入框、学生端、任意文档/PDF 上传；
- 图片写入 ClassIn MessageThread、Space、TeacherIn 或“我的文件”；
- OCR 结果的独立长期存储；
- 绕过教师审批的业务写回。

## 3. 用户体验

1. Composer 底部展示“图片”按钮，打开只接受图片且允许多选的系统选择器。
2. 输入框接收剪贴板 `file` 项；混合粘贴时不拦截文字的浏览器默认插入。
3. 图片在发送前以横向缩略图显示，带文件名与可读的移除按钮。
4. 只有图片时发送按钮也可用；最多 4 张，单张 8 MB，合计 20 MB。
5. 类型、数量、大小或读取失败在 Composer 内显示，已通过校验的图片仍可保留。
6. 请求受理后清空文字；图片在模型完成后清空并释放预览 URL。网络不确定、模型/凭据拒绝、生成失败、停止或 Context 失败时保持原图片草稿，允许以同一命令重试或修改。
7. 历史教师消息至少显示图片数量与安全文件名，不返回图片 Base64 或 Harness 附件 ID。
8. 视觉模型权限失败后，失败 Session 保留图片与错误供追溯；若教师随后在没有图片草稿时提交纯文本，Surface 自动创建干净的文本 Session、更新当前位置或 IM 绑定，并在新 Session 继续处理。教师无需手工新建会话。再次携带图片时仍留在原会话重试。

## 4. Interface 与信任边界

```ts
type RuntimeImageInput = {
  name: string
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
  byteSize: number
  data: string // canonical base64
}

AgentRuntimeAdapter.send(scope, sessionId, text, commandId, images?)
```

浏览器的校验用于及时反馈，不作为安全边界。BFF 独立执行数量、单张/合计大小、规范 Base64、声明 MIME 与文件头一致性、叶文件名和命令图片摘要校验。BFF 不把 Base64 写入自身 Session JSON，只保存摘要和展示名；Harness 将通过验证的内容提升为自己的持久附件引用。

图片消息发送前，BFF 从 rc2 的模型目录确认已配置的 `company-gateway/gemini-2.5-pro` 存在，再在同一 Session 选择该模型。rc2 公共目录不返回模态，禁止依赖 `inputModalities` 或 DeepSeek 视觉实验模型名称猜测。公司网关 Adapter 使用 OpenAI-compatible chat 协议，服务端凭据复用当前本机环境，显式声明 text/image。默认容量预算 32768/4096 是保守部署限制，不代表供应商上限。

Harness 的模型选择同时修改主机默认值；选择 Gemini 后通过内部恢复 Session 还原原默认文本模型。图片会话后续文字追问保留 Gemini 以读取历史图片，新建纯文本会话继续使用 DeepSeek。目录缺少指定模型或恢复失败时 fail closed，保留草稿，不静默丢图或改用其他供应商。

2026-09-10 用户授权 Gemini 3.5 Flash 为识图模型。Write Set：本 Spec、`runtime/harness/cordis.patch.yml`、`server/teachbuddy-runtime.ts` 及对应测试、验收记录。页面、审批与正式消息发送合同不变。

Runtime Projection 只把已识别的视觉权限错误投影为稳定 `failureCode: 'vision-permission'`，不向浏览器暴露 Provider 原始错误、模型名或凭据。共享 Recovery Policy 根据该状态和当前附件数量决定是否新建文本 Session。不能把失败 Session 原地切回文本模型，因为其 Harness 历史仍包含图片，继续复用会让文本模型再次接收不支持的历史模态。

## 5. Harness 一手依据

- `vendor/deepseek-harness/packages/host/apiproxy/src/api/sessions.ts`：`PromptContentPart` 原生定义 `{ type: 'image', mediaType, data, name? }`。
- `vendor/deepseek-harness/packages/host/apiproxy/src/api-proxy.ts`：`session.prompt` 在入队前核对模型图片能力并把浏览器字节提升为持久引用。
- `vendor/deepseek-harness/packages/llm/llm-deepseek/src/index.ts`：模型目录公开 `deepseek-v4-flash-vision-exp` 及 `text/image` 输入模态。
- `vendor/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx`：上游输入条以 Clipboard `file` 项实现图片粘贴，并保留混合粘贴中的文字。

## 6. 验收

- 两个入口都可通过“图片”按钮添加图片并可删除；
- 两个入口都可在输入框粘贴剪贴板图片；
- 图片单独发送可用，文字与图片按原顺序组成 Harness Prompt；
- 超限或伪造 MIME 的输入不会进入 Harness；
- 同一 `commandId` 改变图片会被拒绝，原请求重试不会重复入队；
- 模型不支持图片且无可用视觉模型时有明确可恢复错误；
- 视觉权限失败后，刷新页面并发送纯文本会自动改绑到新文本 Session，旧失败会话仍可追溯；
- 1440×900 下主工作台与最窄 Sidecar 无遮挡、横向撑破或不可达移除按钮；
- TypeScript、ESLint、契约测试与 Playwright 关键流程通过。

## 2026-09-10 Gemini 工具回放修复

用户实际题目解析触发 create_teaching_draft 后，第二轮被网关以缺少 thought_signature 拒绝。新增仅本机 Harness 使用的协议 Adapter：将网关 tool_calls.extra_content.google.thought_signature 无损映射为 pi-ai 支持的 reasoning_details，出站按 tool call ID 还原，签名始终为不透明值，不解释、不伪造、不展示。不修改第三方安装缓存。Adapter 仅绑定 loopback 临时端口、验证凭据、固定上游及模型，不接收浏览器来源请求；关闭 Harness 时一并关闭。保留流式传输、状态码和取消；旧的已丢签名失败历史不能伪造修复，应重新发起图片解析。

Write Set 增加 runtime/harness/gateway-compat.mjs 与测试、scripts/start-harness.mjs、运行 patch 和验收记录。验收必须覆盖真实图文→工具结果→最终回答，而非仅单轮颜色识别。

旧历史缺签名投影为 `model-history-invalid`，不泄露原始网关错误。沿用两入口共享恢复策略，在下一次提交（含重新添加的图片）前创建新运行 Session，保留旧记录，不删除历史，不静默补造签名。Write Set 相应包括 RuntimeSession 合同、HTTP 校验、错误投影与共享恢复策略及测试。

## 2026-09-14 长耗时识图与容量切换

`session.prompt` 的 HTTP 响应可能在完整模型回合结束后才返回。BFF 发送接口只负责完成图片校验、模型选择和请求发起，随后立即返回 `running`；命令入队、执行、工具产物和结束状态由持久历史轮询核对。模型执行不再占用 Session 互斥锁，也不再由浏览器 60 秒请求窗口决定成功或失败。请求回执丢失时仍按稳定 `commandId` 对账，禁止自动重放。

2026-09-14 实测 `tokenhub/gemini-3.5-flash` 连续返回网关容量限制；同一凭据下 `gemini-2.5-pro` 图文请求返回正确题目答案，因此当前图片会话切换到显式配置的 `company-gateway/gemini-2.5-pro`。两条路由继续经过同一签名兼容 Adapter，浏览器不接触凭据或模型选择。相同内容的解析图工具重试按内容哈希归并为一个产物。
