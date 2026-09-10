---
title: TeachBuddy IM 对话运行体验 Implementation Review
status: IMPLEMENTED_PENDING_USER_REVIEW
version: v1.2
date: 2026-09-10
decision: D-151, D-152, D-153
---

# 实施结果

IM Sidecar 已把一次 TeachBuddy 执行收敛为连续对话回合：教师消息不再显示“您”标题；compact 过程条只显示 TeachBuddy、业务动作和真实耗时；最终回复移除外框、标题分隔和阴影；审阅动作紧邻结果；进入审阅后当前结果原位替换为可编辑消息；发送或插入成功后关闭审阅区，不显示“业务已完成”或“已发送”状态卡。

消息交付入口现已按本轮意图投影：顶部教学任务和明确消息写作要求提供审阅，沟通方法咨询提供低强调的“整理成群消息/回复”，普通查询与分析只显示回答。编辑态增加“取消”，退出后恢复原回答和审阅入口，不调用发送 Adapter，也不显示取消状态。

消息生成现在使用不可见正文边界，审阅区优先读取边界内唯一可发送原文。对既有未带边界的回答，兼容提取会删除顶部寒暄和生成背景，以及末尾的写法说明、要点和调整建议；这些解释仍可留在 TeachBuddy 对话中供老师理解。

主 TeachBuddy 工作台继续使用 D-123 的 full 可审计过程，步骤计数和完整证据合同未改变。Domain 的 Runtime Event、MessageDraft、ProposedAction、Approval 和 ExecutionReceipt 也未改变。

# 关键行为

- 无真实事件时，等待文案从工程化的“正在等待运行事件”改为“正在理解你的要求”；
- Sidecar 完成摘要为“已整理好”，处理过程按需展开并限制为 `9rem` 内部滚动；
- 教师和 Agent 每轮只显示一次身份，Tool/Skill 事件仍只进入可审计过程；
- 进入消息审阅时不重复显示同一 Agent 正文；
- 课程查询等信息请求不显示审阅动作；明确消息要求和顶部任务保留审阅闭环；
- “怎么提醒/如何回复”等建议型请求只提供转换动作，点击后另起消息生成回合；
- 编辑态可取消，未发送修改被丢弃，原回答与审阅入口恢复；
- 审阅区只保留消息原文，Agent 对老师的首尾说明与内部正文标记均不进入草稿；
- 群聊确认发送后自动定位实际 IM 消息，私聊插入后由目标 Composer 提供反馈；
- Runtime 运行期间 Textarea 保持可编辑，发送按钮禁用，停止动作可达；停止后下一轮草稿保留；
- 连接、Context 校验、发送失败和停止失败继续使用既有恢复路径。

# 视觉验收

1440×900 的生成结果与消息审阅状态均已实际渲染检查：

- [生成结果](../../../../prototype/exports/copilot-conversation-run-ux/desktop-result-1440x900.png)
- [原位审阅](../../../../prototype/exports/copilot-conversation-run-ux/desktop-review-1440x900.png)

结果状态中，教师输入使用右对齐、宽度随内容变化的圆角消息气泡，Agent 回复使用自然正文；审阅状态只保留消息正文这一处必要内容容器。Sidecar 无横向溢出，Composer 固定在底部且保持可达。

# 自动化证据

- `npm run typecheck`：PASS；
- 全量 ESLint：PASS；
- 消息正文、交付意图与 IM Sidecar 聚焦 Vitest：24/24 PASS；
- 全量 Vitest：132 个测试文件、833 项 PASS；
- `teachbuddy-im-personalized-services.spec.ts` Chromium：10/10 PASS，包含取消审阅后恢复原回答；
- `npm run build`：PASS，仅保留仓库既有 bundle size warning；实机已核对到课提醒审阅框只含可发送原文；
- 覆盖 compact/full 差异、处理过程展开、消息标题去重、意图分流、原位审阅、取消审阅、无成功状态卡、停止后草稿保留、连续 Session 恢复、富文本、a11y 和窄 Sidecar 溢出。

# 已知边界

当前 Runtime Adapter 以稳定完成响应返回整段最终内容；页面已按事件持续投影业务进展，但逐 Token 流式正文仍取决于未来 Runtime 流协议。已采纳事件的防重复标记是当前 Sidecar 的 UI 临时状态；刷新后的正式采纳事实仍以 IM 消息和内部 Receipt 为准，不新增第二套业务状态。
