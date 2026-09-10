---
title: TeachBuddy IM Sidecar 同源 Runtime 实施与验收记录
status: CORE_PATH_PASS_REGRESSION_PENDING
version: v1.0
date: 2026-09-08
decision: D-120
tracker: TAPD-1145976096001080801
---

# TeachBuddy IM Sidecar 同源 Runtime 实施与验收记录

## 1. 结论

IM 右侧 TeachBuddy 已从产品装配中的确定性 Demo Runtime 迁移到“TeachBuddy → 我的任务”使用的同一 `AgentRuntimeAdapter`、DeepSeek Harness、`teachbuddy` Preset 和 `ideal-full` Product Scope。班级群与 1v1 Thread 分别稳定绑定 Runtime Session，可在 IM 与主工作台间恢复同一会话。

业务上下文已建立独立 `BusinessContextAdapter` Seam。固定、脱敏场景和 DW Hunter 只读查询派生投影都返回业务语义字段、来源、权限范围、捕获时间、时效、版本与真值证据；正式 ClassIn API Adapter 仍须实现同一契约。经用户授权的本机预览会把一个无数据库标识的精确群聊快照加载到页面与 Context Snapshot，并送入同一 DeepSeek Session；它位于 Git 忽略的 `.runtime/private`，不进入仓库事实源。

核心路径通过；完整自动化回归尚未关闭。当前机器上的 Vitest 与 ESLint 均在运行器启动阶段无输出挂起，未执行断言或产生 lint 诊断。生产构建、TypeScript、Harness 原生测试与真实 DeepSeek 浏览器验收均已通过。

## 2. 交付映射

| Ticket | 结果 | 代码与行为证据 |
| --- | --- | --- |
| 01 同源私密对话 | `IMPLEMENTED` | `ImSidecarAgentSurface` 复用 `AgentRuntimeAdapter`；Session Binding 使用 Actor、Tenant、Thread、Scope 复合键；主工作台按同一 Session URL 恢复。 |
| 02 班级消息审批写回 | `IMPLEMENTED_CORE` | Agent 完成只产生私密结果；教师显式转为版本化 Message Draft，写回前重新捕获并校验最新 Context Source 版本，再形成 Action、Approval 与幂等 Receipt。 |
| 03 1v1 Composer Gate | `IMPLEMENTED` | 教师可编辑 Agent 回复草稿；“插入回复框”只更新当前 Composer，消息时间线不变，仍需教师执行原发送命令。 |
| 04 收口与验收 | `PARTIAL` | 产品装配已使用真实 Runtime，三个固定建议只预填 Prompt；构建、Harness 原生测试与桌面实机通过。Vitest、ESLint、完整 axe 与紧凑视觉自动化仍待恢复。 |

## 3. 需求追踪

| 需求 | 结果 | 证据 |
| --- | --- | --- |
| IM-PRD-114 | `PASS` | IM 与主工作台共用 HTTP Runtime、DeepSeek Harness、Agent Preset 与事件投影。 |
| IM-PRD-115 | `PASS_SCOPED` | Session Binding 复合键与刷新恢复实机通过；隔离单元测试已编写，待 Vitest Runner 恢复。 |
| IM-PRD-116 | `PASS` | 从 IM 的“在 TeachBuddy 中继续”打开相同 Session，真实请求与回复一致；返回 IM 后恢复。 |
| IM-PRD-117 | `PASS_CORE` | 实机显示真实连接、教师输入、运行与完成；停止和失败状态由真实 Runtime 状态投影，自动回归待执行。 |
| IM-PRD-118 | `PASS` | 页面只消费 `ImSidecarAgentServices`，Runtime 与 Business Context 均位于 Adapter Interface 后。 |
| IM-PRD-119 | `PASS_WITH_DW_DERIVED_SAMPLE` | 固定场景与 DW 派生冻结投影均输出来源、权限、时效、版本、敏感级别和真值；在线 DW / ClassIn Adapter 属于后续接入。 |
| IM-PRD-120 | `PASS_CONTRACT` | Contract 只允许业务语义 Snapshot；仓库未保存 DW 查询、连接信息、SQL 或 KB 原文。 |
| IM-PRD-121 | `PASS` | Context Envelope 由共享解析器剥离；IM 与主工作台只显示教师原文。 |
| IM-PRD-122 | `PASS` | 群消息经 Artifact → Action → Approval → Receipt；1v1 只进入 Composer。两条路径均完成实机验收。 |
| IM-PRD-123 | `PARTIAL` | 离线、未配置、Context 失败、过期与写回失败有独立状态；幂等 Adapter 已实现。完整失败注入自动化待 Runner 恢复。 |

## 4. 实机验收证据

验收环境：`http://127.0.0.1:4174/teacher/messages`，教师角色，真实本机 BFF 与 DeepSeek Harness。

1. 班级群请求“总结最近讨论，并拟一条提醒大家明天带实验报告的群消息”返回真实 DeepSeek 结果；Sidecar 只显示教师原文，没有显示 `TEACHBUDDY_CONTEXT_V1` 内部 Envelope。
2. 教师把结果转成群消息草稿并确认，写回前成功重新捕获当前 Context；时间线只新增一条以王老师身份发送的消息，Receipt 后按钮变为“在群聊中查看”。
3. 切换到李明 1v1，Agent 基于当前 Thread 生成回复。教师修改正文后点击“插入回复框”，Composer 获得修改后的文本，时间线仍保持原三条消息且未自动发送。
4. 同一 1v1 Session `tb-e8a9e664-b130-4191-8770-3bd8667ff0b1` 在 `/teacher/ai-agent/new?session=...` 恢复相同教师请求和 Agent 回复；返回 IM 后再次恢复相同会话。
5. 整页刷新后恢复班级 Session 时，草稿审阅会按需重新捕获当前 Thread Context，不再依赖刷新前的内存 Snapshot。

## 5. 自动化与构建

| 检查 | 结果 |
| --- | --- |
| `npm run build` | `PASS`；`tsc -b` 与 Vite production build 完成，2134 modules transformed。仅保留仓库既有的大 chunk 警告。 |
| `npm run test:harness` | `PASS`；11/11 Node 原生 Harness 测试通过。 |
| `git diff --check` | `PASS`。 |
| 范围内 Vitest | `BLOCKED_BY_RUNNER`；Vitest 显示 `RUN v4.1.10` 后超过 60 秒无 worker、transform 或断言输出，人工中止。 |
| 范围内 ESLint | `BLOCKED_BY_RUNNER`；超过 60 秒无诊断或结束信号，人工中止。 |
| 浏览器桌面核心路径 | `PASS`；班级生成与审批写回、1v1 编辑与 Composer Gate、跨 Surface Session 恢复均通过。 |
| axe / 紧凑视觉 / 完整 Playwright | `PENDING`；不能用本轮人工桌面证据替代。 |

已新增的自动化覆盖文件包括 Context Envelope、Message Draft 版本和 Context 校验、Session Binding、固定 Business Context Adapter，以及 Sidecar Runtime/审批集成。上述 Vitest 文件已通过 TypeScript 编译，但在当前 Runner 问题解除前不记为测试通过。

## 6. 生产 Gate

- 在线 DW Hunter Adapter 仍是后续工作：本轮已用只读查询验证真实消息模式并注入去标识冻结投影；生产接入仍须补齐稳定的群成员/机构/课程/角色关系、行级权限、超时恢复和持续来源映射。

## 6. v1.1 — LUI 与本机真实上下文验收

- 开源调研比较了 assistant-ui、AI Elements、react-markdown 与 remark-gfm；采用 `react-markdown + remark-gfm` 作为 `AgentRichResponse` 内核，理由与一手链接见 [`IM-SIDECAR-LUI-RESEARCH.md`](../../../01-research/IM-SIDECAR-LUI-RESEARCH.md)。
- Agent 回答已把标题、列表、引用、表格、任务列表和代码渲染为语义化 UI；原始 HTML 被跳过。教师消息、Tool/Skill 记录、Artifact 和可编辑草稿保持原有交互。
- `.runtime/private/im-demo-context.json` 经窄契约校验后，只由同源 GET 端点在 `ideal-full` 返回。实际检查结果为 19 条本机消息、固定 Thread、无 `clusterid/sourceuid/msgbucketid` 等数据库标识；`classin-mvp` 返回 404，跨源请求返回 403。
- 浏览器真实 DeepSeek 验收中，Agent 从当前群聊识别出作文习作、古诗文与现代文阅读主题，并明确列出截止时间、完成状态、作文图片、个人错因等缺失证据；Runtime Envelope 确认包含近期 6 条消息、近期教学主题、互动模式、证据边界和 `read-only-business-data` 真值。
- `npm run typecheck`、`npm run build`、`npm run test:harness` 通过；Harness 为 11/11。Playwright `teachbuddy-im-personalized-services.spec.ts` 为 4/4，覆盖 GFM 语义渲染、原始 Markdown 标记不显示、桌面流程和 900×720 紧凑 Sidecar 无页面横向溢出。
- Vitest 仍在打印版本标题后无测试结果并持续不退出；分别运行全部新增文件和单个 `AgentRichResponse` 测试均复现，已人工停止，未记为通过。对应解析、端点、HTML 安全和合并逻辑测试代码已提交等待 runner 修复。
- 当前 ClassIn 消息写回为可重置 Mock Adapter；正式消息 API 必须继续验证最新 Context、权限、Artifact 版本和幂等键，并返回可追溯 Receipt。
- 跨设备 Session Binding、生产保留策略、审计控制台和真实 OAuth 不在本轮范围。
- Ticket 04 只能在 Vitest、ESLint、完整 Playwright、axe 和紧凑视觉证据通过后关闭。
