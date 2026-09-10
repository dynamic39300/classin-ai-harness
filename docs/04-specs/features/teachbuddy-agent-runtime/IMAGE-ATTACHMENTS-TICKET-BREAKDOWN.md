# TeachBuddy 图片附件 Ticket Breakdown

状态：`IMPLEMENTED`

## TB-IMG-01 · Composer 图片草稿

Write Set：`src/design-system/WorkspaceComposer.*`、`src/features/agent-runtime/runtime-image-attachments.ts`

完成条件：文件选择与剪贴板图片走同一回调；缩略图、文件名、移除、上限错误和图片单独发送可操作；对象 URL 有释放路径。

## TB-IMG-02 · Runtime 与 Harness 纵向链路

Write Set：`src/contracts/workbuddy/agent-runtime.ts`、HTTP Adapter、Runtime Hook、`server/teachbuddy-runtime.ts`、Harness Projection。

完成条件：图片进入 `session.prompt`；BFF 完成独立内容校验；图片参与命令幂等；同一 Session 可选择 DeepSeek 视觉模型；历史消息不泄漏字节或附件 ID。

## TB-IMG-03 · 两个 Surface 与验收

Write Set：`AgentRuntimeSurface.tsx`、`ImSidecarAgentSurface.tsx`、对应测试与本规格。

完成条件：主工作台所有 Scope 和 Sidecar 接入共享能力；失败保留、成功清空；完成静态、契约、E2E、可访问性和视觉验收并记录证据。

## TB-IMG-04 · 视觉权限失败后的纯文本恢复

Write Set：Runtime Session/Projection 契约、共享 Recovery Policy、主 Runtime Surface、IM Sidecar、对应契约与 Playwright 测试。

完成条件：视觉权限错误具有不泄露 Provider 细节的稳定机器码；无图片的后续文本请求自动创建并绑定干净 Session；旧失败 Session 不覆盖、不删除；两个入口均有浏览器回归。
