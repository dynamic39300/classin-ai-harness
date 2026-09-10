---
title: TeachBuddy 教学阶段导航方案（二）实施验收
status: AUTOMATION_PASS_PENDING_USER_REVIEW
version: v0.4
branch: codex/copilot-stage-nav-v2
updated: 2026-09-10
---

# TeachBuddy 教学阶段导航方案（二）实施验收

## 实施结果

方案二已把原来分离的身份 Header 与`教学动态`模块合并为一个顶部协作面。IM 内统一显示`AI 消息助手 · N 项建议`，并用一行说明“选环节，点一条建议，AI写消息草稿，您确认后发送”。老师随后直接使用`课前 / 课中 / 课后 / 总结`四阶段 Tab 和当前消息建议。Sidecar 与左侧聊天工作台等高，不再叠加灰色底板、外边框和阴影；导航与建议区域使用统一浅灰色底，与下方白色消息对话区形成分区。

点击建议会一次提交卡片上对应的自然语言 Prompt，并把这段原文精确显示为老师消息。能力、业务对象、输出格式和必要证据等结构化要求只进入内部 Context Envelope，不用工程话术替换老师刚刚点击的要求。正式发到群聊或私聊前仍由老师审阅确认，因此引导文案没有承诺自动发送。

右上角新建 Session、读取失败态中的新建 Session，以及`在 TeachBuddy 中继续`入口均已移除。当前 IM 对象只呈现一条连续的逻辑对话；内部 Runtime Session 因恢复发生轮换时，Binding Trail 会聚合各实例事件，老师仍通过向上滚动查看一条连续历史。已保存的 Binding 指向不存在的 Runtime Session 并返回 404 时，Sidecar 会透明创建替代实例并更新绑定，不出现新建入口。生成中可使用输入框旁的`停止生成`；停止成功后输入框恢复并继续沿用同一逻辑对话，停止失败则继续锁定输入并保留重试停止。

阶段自动轮播与播放/暂停按钮保持取消。四个放大的圆形入口同时显示阶段名与`N条`短数量，老师通过鼠标或键盘手动切换。建议卡片不再重复当前班级名称，但完整班级上下文仍提交给 AI。

## 收起与滚动

- 首次进入默认展开，老师通过右上角箭头图标手动收起或展开；图标按钮不显示`展开 / 收起`文字，但保留完整点击范围和无障碍名称；
- 滚动对话区域或输入框不改变导航展开状态；
- 内容保留在 DOM 中，以 320ms 高度、透明度和轻微位移完成过渡，Reduced Motion 下关闭动画；
- 手动收起时，若键盘焦点仍在阶段或建议中，会先移到箭头按钮；收起内容同步进入`inert`并从辅助技术树隐藏；
- 紧凑态常驻 AI 消息助手身份、准确建议摘要和同一行引导文案，点击箭头在原位恢复；
- Runtime 更新只在老师原本位于底部时跟随新消息，向上查看历史时不会被自动拉回。
- AI 消息助手顶栏和可展开建议区位于对话滚动容器之外。聊天记录只在下方区域滚动，不会从顶栏上下或两侧露出；顶栏本身不再使用卡片边框和阴影，通过浅灰色底与消息对话区区分。

## 代码边界

- `TeachingDynamics.tsx`负责合并后的身份、引导、阶段 Tab、事项和展开/紧凑投影；
- `TeachingDynamics.module.css`使用既有 ClassIn Token，负责统一外框、紧凑态和过渡；
- `ImSidecarAgentSurface.tsx`编排当前聊天的手动呈现偏好、Runtime、Business Context、停止和发送 Gate；
- `im-agent-session-binding.ts`维护当前 Runtime Session 与有界 Binding Trail，供 Sidecar 聚合内部轮换前后的事件，并在 stale 404 时透明替换失效绑定；
- `runtime-context-envelope.ts`与`runtime-context-format.ts`分离老师可见的自然语言 Prompt 和只供 Agent 使用的结构化任务上下文；
- `TeachingDynamicsAdapter`继续提供可重置的多课程、多阶段模拟数据；
- `useAgentRuntime`允许停止命令中断尚未返回的生成请求，并以操作版本阻止迟到响应覆盖停止后的新内容；停止失败不会解锁新的发送请求，老师可重试停止；
- AI 生成、审阅与消息发送继续复用既有 Runtime、Artifact 与消息发送 Gate。

## 自动化与视觉验收

- TypeScript：PASS；
- scoped ESLint：PASS；
- Teaching Dynamics / Adapter / Runtime / Sidecar focused tests：PASS，6 个测试文件共 30 项；
- Chromium personalized-services flows：PASS，10 项；收起动效并发重复 10 次均通过；
- `npm run build`：PASS，仅有仓库既有 bundle size warning；
- 一击 Prompt 回归验证一次点击只提交一次精确要求，老师时间线保留卡片自然语言原文，结构化能力/对象/格式要求只进入内部 Context Envelope；
- 连续历史回归验证内部 Runtime Session 轮换后，Binding Trail 仍按顺序投影轮换前后的事件；stale 404 Binding 会透明建立替代 Session，页面不出现 Session 管理控件；
- 停止回归验证即使生成请求仍未返回也可停止；停止失败时输入仍保持锁定并可重试停止，迟到响应不会覆盖新一轮内容；
- 浏览器实机检查：Sidecar 与左侧聊天工作台上下边界对齐，顶栏与 Sidecar 等宽，外层边框、阴影和外边距均为 0；展开与紧凑状态无文字穿透、横向溢出或不可达操作，页面不再出现新建 Session 入口。

## 已知边界

当前业务上下文仍以固定、脱敏、可重置的模拟投影为主；Binding Trail、404 恢复和跨内部实例的连续时间线已经完成，但生产实时 ClassIn 数据、生产权限和跨设备同步仍需后续 Adapter 与平台能力支持。
