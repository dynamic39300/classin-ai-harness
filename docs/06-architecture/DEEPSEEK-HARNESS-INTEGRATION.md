---
title: ClassIn TeachBuddy × DeepSeek Harness 接入边界
status: BOOTSTRAPPED_NOT_PRODUCT_INTEGRATED
version: v0.1
date: 2026-08-25
---

# ClassIn TeachBuddy × DeepSeek Harness 接入边界

## 当前事实

- `classin-ai-harness` 是从 `classin-ai-buddy` M4.5 封版代码复制出的独立工作目录；不携带原仓库 Git 历史、依赖缓存、reference、研究截图、历史会话、汇报材料、原型视频或视觉截图基线。
- DeepSeek Harness 以 Git submodule 固定在 `vendor/deepseek-harness`，当前提交为 `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`（`dsh-v0.1.1-rc.2`）。
- 官方 Harness 仍是 Developer Preview。当前接入只建立本地 Runtime 与源码定点，不把它声明为生产基座。
- 当前 TeachBuddy 页面仍使用既有确定性 Experience Adapter；尚未把模型、工具或 Session Event 接入产品 Run。

## Module、Interface 与 Seam

DeepSeek Harness 位于 TeachBuddy `ConversationRunModule` 之外，通过新的 Runtime Adapter 接入：

```text
TeachBuddy Page
  -> ConversationRunModule Interface
    -> Agent Runtime Seam
      -> Deterministic Experience Adapter（现有）
      -> DeepSeek Harness Adapter（下一条纵向切片）
        -> DeepSeek Harness Runtime :3080
```

该 Seam 必须保持以下规则：

1. TeachBuddy Domain 不依赖 Cordis、DeepSeek Session Event 或具体模型类型。
2. Harness Event 必须先映射为稳定的 `ConversationRunEvent`，再进入页面投影。
3. `ContextSnapshot`、`ArtifactDraft`、`ProposedAction`、`Approval`、`ExecutionReceipt` 和 Evaluation 仍由 TeachBuddy 语义拥有。
4. ClassIn 写回继续经过 ProposedAction、策略、教师审批、领域校验和 Receipt；Harness 工具成功不等于业务写回成功。
5. 学生数据只按已授权 ContextSnapshot 最小投影给 Runtime；模型可见输入必须可追溯、可删除并受机构隔离。
6. API Key 只由 Harness 进程读取，绝不进入 Vite 浏览器变量、源码或 Git。

## 本地启动

使用官方 npm 发布包启动固定版本：

```bash
npm run harness:web
```

默认地址为 `http://127.0.0.1:3080`。TeachBuddy PC 应用仍使用：

```bash
npm run dev
```

默认地址由 Vite 输出，通常为 `http://127.0.0.1:4173`。如果需要真实 DeepSeek 模型，在未提交的 `.env` 中配置 `DEEPSEEK_API_KEY`。

需要修改或调试 Harness 源码时：

```bash
npm run harness:source:install
npm run harness:source:build
npm run harness:source:web
```

## 下一条实施切片

在产品代码中新增 DeepSeek Harness Adapter 前，先完成独立 Feature Spec，至少锁定：

- Runtime Interface 的输入、输出、取消、重试、超时与恢复语义；
- Session Event → ConversationRunEvent 的确定性映射；
- Context 最小披露、来源、版本、权限与保留策略；
- Tool Call → ProposedAction / Approval / ExecutionReceipt 的治理映射；
- Mock Adapter 与 DeepSeek Harness Adapter 的契约测试；
- 无 Key、Runtime 离线、流中断、工具拒绝和恢复路径。

在上述 Spec 通过前，不直接替换现有确定性 Adapter，也不让页面调用 Harness 私有接口。
