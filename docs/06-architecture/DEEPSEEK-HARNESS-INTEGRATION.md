---
title: ClassIn TeachBuddy × DeepSeek Harness 接入边界
status: LIVE_MODEL_ACCEPTED
version: v0.2
date: 2026-09-05
---

# ClassIn TeachBuddy × DeepSeek Harness 接入边界

## 当前事实

- `classin-ai-harness` 是从 `classin-ai-buddy` M4.5 封版代码复制出的独立工作目录；不携带原仓库 Git 历史、依赖缓存、reference、研究截图、历史会话、汇报材料、原型视频或视觉截图基线。
- DeepSeek Harness 以 Git submodule 固定在 `vendor/deepseek-harness`，当前提交为 `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`（`dsh-v0.1.1-rc.2`）。
- 官方 Harness 仍是 Developer Preview。当前接入只建立本地 Runtime 与源码定点，不把它声明为生产基座。
- 2026-09-05 新增真实运行时工作台、HTTP Adapter 与本机 BFF，已连接官方 Harness 会话接口。专用教学工具生成可审阅文稿；教师确认后保存到本机并产生持久化 Approval/Receipt。按 D-114，教师产品页不再公开原确定性课程任务 Demo。
- 本机已通过服务端 `.env` 配置模型凭据，且真实 `deepseek-official/deepseek-v4-flash` 文本、工具、保存、停止和重启恢复验收通过。协议替身、浏览器回归和真实模型证据仍分别记录，不把单次验收声明为生产 SLA。

## Module、Interface 与 Seam

DeepSeek Harness 位于 TeachBuddy 领域 Module 之外，通过 `AgentRuntimeAdapter` 接入。BFF 将供应商事件映射为既有 `ConversationRunEvent`，真实运行时不使用确定性阶段调度器：

```text
TeachBuddy AgentRuntimeSurface
  -> AgentRuntimeAdapter
    -> HTTP Adapter / local BFF :4173
      -> DeepSeek Harness HTTP :3080
        -> teachbuddy preset + create_teaching_draft
```

该 Seam 必须保持以下规则：

1. TeachBuddy Domain 不依赖 Cordis、DeepSeek Session Event 或具体模型类型。
2. Harness Event 必须先映射为稳定的 `ConversationRunEvent`，再进入页面投影。
3. `ContextSnapshot`、`ArtifactDraft`、`ProposedAction`、`Approval`、`ExecutionReceipt` 和 Evaluation 仍由 TeachBuddy 语义拥有。
4. ClassIn 写回继续经过 ProposedAction、策略、教师审批、领域校验和 Receipt；Harness 工具成功不等于业务写回成功。
5. 学生数据只按已授权 ContextSnapshot 最小投影给 Runtime；模型可见输入必须可追溯、可删除并受机构隔离。
6. API Key 只由 Harness 进程读取，绝不进入 Vite 浏览器变量、源码或 Git。

## 本地启动

启动完整产品链路：

```bash
npm run dev
```

前端/BFF 通常位于 `http://127.0.0.1:4173`，专用运行时固定为 `http://127.0.0.1:3080`。仅启动专用运行时：

```bash
npm run harness:teachbuddy
```

在未提交的根 `.env` 中配置 `DEEPSEEK_API_KEY` 后重启。旧 `npm run harness:web` 启动官方通用配置，不能替代产品专用配置。BFF 校验运行工作目录与唯一 `teachbuddy` preset；仅接受本产品拥有的会话和固定方法。

需要修改或调试 Harness 源码时：

```bash
npm run harness:source:install
npm run harness:source:build
npm run harness:source:web
```

## 实施规格与验收

本切片由用户今夜完成真实交互的明确授权启动，规格见 [TeachBuddy Agent Runtime](../04-specs/features/teachbuddy-agent-runtime/README.md)。已实现的接口覆盖：

- Runtime Interface 的输入、输出、取消、重试、超时与恢复语义；
- Session Event → ConversationRunEvent 的确定性映射；
- Context 最小披露、来源、版本、权限与保留策略；
- Tool Call → ProposedAction / Approval / ExecutionReceipt 的治理映射；
- Mock Adapter 与 DeepSeek Harness Adapter 的契约测试；
- 无 Key、Runtime 离线、流中断、工具拒绝和恢复路径。

实际使用固定 rc2 的官方 Web HTTP 契约。该契约尚无协议版本协商；发布包 `host.describe.version` 实际返回 `0.0.1`，不能把它用作包版本校验。版本固定由启动器负责。工具配置和一手源码依据见 [专用运行时说明](../../runtime/harness/README.md)。
