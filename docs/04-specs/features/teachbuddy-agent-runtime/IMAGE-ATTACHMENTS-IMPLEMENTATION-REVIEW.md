# TeachBuddy 图片附件实施验收记录

日期：2026-09-08
状态：`IMPLEMENTED / PRODUCT FLOW VERIFIED / LIVE VISION CREDENTIAL GATE`

## 已完成

- 共享 `WorkspaceComposer` 增加图片选择按钮、剪贴板图片捕获、横向缩略图、文件名、移除与内联错误；混合粘贴不会吞掉文字。
- 主 TeachBuddy Runtime Surface 的三个 Product Scope 和 IM Sidecar 都使用同一附件能力。
- 浏览器侧图片策略集中在 `runtime-image-attachments`，支持 PNG/JPEG/WebP/GIF，执行 4 张、8 MB/张、20 MB/次限制并释放 Object URL。
- `AgentRuntimeAdapter.send`、HTTP Adapter、Runtime Hook 与 BFF 支持图片输入；消息上传超时独立放宽到 60 秒。
- BFF 复核规范 Base64、字节数、MIME 与文件头，清理叶文件名，图片摘要参与命令幂等；Base64 不写入 BFF Session JSON。
- Harness Prompt 使用正式图片内容块；同一 Session 优先切换到目录返回的 DeepSeek Vision 路由，并通过内部恢复 Session 还原 Harness 全局默认文本模型，避免污染后续纯文本会话。历史投影只显示图片数量与安全名称，不返回附件 ID 或图片字节。
- 新 Session 尚未受理请求时不会误清空图片；成功完成后释放，网络、停止、模型权限或生成失败时保留。主工作台失败态提供“使用保留图片重试”。
- DeepSeek 视觉权限拒绝被翻译为安全的产品提示，原始密钥、供应商错误和模型内部信息不进入页面。
- 视觉权限拒绝同时投影稳定错误码；刷新或移除图片后再提交纯文本，主工作台和 IM Sidecar 会自动创建并绑定干净的文本 Session。旧图片失败会话保留在历史中，不再阻塞纯文本工作。

## 验证证据

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run build`：通过；仅保留既有大 Chunk 警告。
- Runtime / Projection Vitest：2 files、53 tests 通过。
- HTTP Adapter Vitest（Node 环境）：5 tests 通过。
- Harness 本地检查：11/11 通过。
- Playwright 主工作台完整回归：11/11 通过，覆盖 1440×900、390×844、三 Scope、恢复/停止/错误、图片选择+粘贴和视觉权限后的纯文本恢复。
- Playwright Sidecar 回归：6/6 通过；图片粘贴与业务 Context 同请求发送，视觉权限后的纯文本恢复成功，900×720 紧凑布局无页面横向溢出。
- 视觉权限恢复专项 Playwright：2/2 通过；主工作台和 IM Sidecar 均从失败图片 Session 自动切换到新文本 Session，请求不携带图片。
- 1440×900 人工视觉检查：主工作台和 Sidecar 缩略图轨道无遮挡，Document `scrollWidth` 等于 Viewport；证据为 `prototype/exports/teachbuddy-image-attachment-main-1440.png` 与 `teachbuddy-image-attachment-sidecar-1440.png`。
- 真实 Harness 冒烟：仓库内 JPG 已被持久化并投影为“已附 1 张图片”；当前 DeepSeek Key 随后返回 403，只允许 `deepseek-v4-flash` / `deepseek-v4-pro`，未开通 `deepseek-v4-flash-vision-exp`。页面显示可恢复提示并保留图片，证据为 `prototype/exports/teachbuddy-image-attachment-vision-permission-1440.png`。

React/jsdom Vitest 在当前机器仍停在 worker 启动阶段，没有产生测试结果；同样的 Composer/Surface 行为已由真实 Chromium Playwright 覆盖。该基础设施问题不影响 TypeScript、ESLint、Node 契约测试、生产构建或浏览器验收。

## 外部 Gate

代码、UI、BFF、Harness 附件与视觉路由链路均已完成。当前凭据没有 DeepSeek Vision 模型调用权限，因此“模型实际理解图片并返回答案”无法在这台机器上通过。开通当前 Key 对 `deepseek-v4-flash-vision-exp` 的访问后无需改代码；保留图片可直接重试。
