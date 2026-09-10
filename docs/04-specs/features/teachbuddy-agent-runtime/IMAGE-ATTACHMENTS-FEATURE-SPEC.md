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

图片消息发送前，BFF 读取当前 Session 的模型目录。当前模型有 `image` 输入能力时保持不变；否则在同一 DeepSeek Provider、同一 Session 中选择公开目录里的视觉模型，优先目录明确返回的 `deepseek-v4-flash-vision-exp`（兼容 rc2 目录未返回 `inputModalities` 的情形）。Harness 的 `session.selectModel` 会同步改写主机默认模型，因此目标 Session 固定视觉路由后，由不进入产品目录的内部恢复 Session 把默认值还原到切换前的文本模型；图片 Session 与后续普通文本 Session 相互隔离。Harness 在 `session.prompt` 入队前仍执行权威模态校验。不存在视觉模型或默认值未能安全恢复时 fail closed，并保留 Composer 草稿。

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
