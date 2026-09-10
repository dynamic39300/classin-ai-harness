---
title: TeachBuddy DeepSeek Harness 交互运行时
status: LIVE_MODEL_ACCEPTED
date: 2026-09-04
---

# 目标与授权

用户明确要求今夜把现有 TeachBuddy Demo 接到 DeepSeek Harness，完成稳定的文本交互与任务执行，持续推进直至可验收。该授权启动原接入边界文档中的 Runtime Adapter 切片，并取代 D-027 对本切片的仅确定性运行范围限制；其他业务所有权和产品隔离决策继续适用。

# Write Set

新增 agent-runtime 契约、HTTP Adapter、运行时 Surface、本机 BFF、专用 Harness 配置及教学工具；修改现有工作台装配、启动脚本和匹配测试。该切片验收时保留的确定性课程工作流产品表面已于 2026-09-05 按 D-114 删除。ClassIn 生产 API、支付、学生 Agent 与长期记忆不属于本次接入。

# Interface

- 教师在 TeachBuddy 工作台直接发起文字、图片或图文教学任务，三个教师 Product Profile 使用独立 scope。图片附件规则见 [Feature Spec](./IMAGE-ATTACHMENTS-FEATURE-SPEC.md)。
- AgentRuntimeAdapter 提供 health/list/create/read/send/cancel/approve；页面不解释供应商原始事件。
- 官方固定版本 Harness Web HTTP 接口由本机 BFF 调用。会话与模型事件映射为现有 ConversationRunEvent；所有 TeachBuddy Agent Surface 以共享 `AnalysisProcessProjection` 展示可审计的业务分析过程，不显示模型原始隐藏推理。
- 每条提交包含 commandId；重复请求不重复向模型发送。未知发送结果保留为不确定错误，不盲目重复写回。
- 会话快照与产物保存到 gitignored 本机目录；刷新重新读取服务端事实，断线后重连。取消请求实际调用 Harness cancel，不能只停动画。
- 恢复按官方 inbox 事件区分排队、领取未入步、已送达、取消和结果未知；取消同时移除本产品拥有的待执行消息。完整分页历史用于对账；明确拒绝保留原输入与错误。同一 commandId 永不重新执行。
- 后台按持久化未完成命令和执行期限维护，浏览器关闭和 BFF 重启不能使任务失去超时控制；连续执行 10 分钟请求停止。完全没有接收证据的请求在核对窗口结束后仍保持未知，不凭等待时间推断成功或安全重发。
- 持续生成与工具调用可观察；失败、无凭据、离线、超时、停止及重新发送有明确状态。没有模型凭据不能静默切到模拟回复。

# 教学任务

运行时允许生成教学文稿，例如教案、练习、测验和课程方案。专用工具创建带来源会话、版本与内容的 ArtifactDraft；教师审阅并明确保存才产生 Approval 和本地 ExecutionReceipt。结果可下载。该保存只进入本机个人产物存储，不代表 ClassIn 正式发布。工具无生产业务写回权限，也不允许任意本机命令或文件读写。

# 数据与边界

密钥只从服务端环境或未提交的 .env 读取。HTTP 服务仅绑定 loopback，校验写请求来源和内容类型；浏览器不能指定任意 Harness 方法、文件路径或工作目录。scope 与 session 的关联由 BFF 持久化并校验。模型只接收教师主动输入的文字/图片和明确受治理的 Context，不自动下发整个模拟学生库。图片字节由 Harness 持久附件服务拥有，不进入 BFF Session JSON、ClassIn 业务写回或“我的文件”。三个 profile 的历史和产物相互隔离。当前 Demo 身份不作为生产身份认证。

# 验收

1. npm run dev 可启动完整本机链路，工作台入口可发现。
2. 实际模型进行两轮中文对话并保留上下文。
3. 模型实际调用教学工具生成内容，页面可审阅、保存、下载；重复保存幂等。
4. 刷新恢复；停止生成实际取消；运行时离线和缺凭据有可恢复提示。
5. 契约和 BFF 测试覆盖事件映射、隔离、重复提交、失败、取消、审批版本和写回。
6. 类型检查、Lint、相关 Vitest、构建和浏览器验收；1440x900 与窄屏检查无重叠/溢出。

真实模型验收需要可用 DEEPSEEK_API_KEY。协议替身测试只验证工程链路，不计为真实模型验收；2026-09-05 已另行完成真实 DeepSeek 文本、工具、保存、停止和重启恢复验收。

已取得证据、复现命令与剩余 Gate 统一记录在 [验收记录](./ACCEPTANCE.md)。

所有 TeachBuddy Agent 窗口的可审计分析过程遵循 [Feature Spec](./AUDITABLE-ANALYSIS-FEATURE-SPEC.md)，本轮实现与验证见 [实施验收记录](./AUDITABLE-ANALYSIS-IMPLEMENTATION-REVIEW.md)。

主工作台与 IM Sidecar 的图片选择、剪贴板粘贴和 Runtime 链路遵循 [图片附件 Feature Spec](./IMAGE-ATTACHMENTS-FEATURE-SPEC.md)，实现证据和当前视觉模型权限 Gate 见 [图片附件实施验收记录](./IMAGE-ATTACHMENTS-IMPLEMENTATION-REVIEW.md)。
