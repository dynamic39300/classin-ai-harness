---
title: ClassIn IM 2.0 Part 2 基础能力 Tickets
status: IM2_01_07_COMPLETED
version: v1.0
date: 2026-09-09
---

# ClassIn IM 2.0 Part 2 基础能力 Tickets

## 执行顺序

```text
IM2-01 范围与契约冻结
  ├─→ IM2-02 引用回复
  ├─→ IM2-03 消息 Reaction
  ├─→ IM2-04 聊天记录搜索
  ├─→ IM2-05 资源检索与复用
  └─→ IM2-06 双语对照翻译
IM2-02…06 → IM2-07 跨入口回归与验收
```

## IM2-01 — 范围与稳定 Interface

**What to build:** 固化 Part 2 七项 P0、范围差异、Message Domain 扩展点以及搜索、资源和翻译 Adapter Interface，让后续每条切片都能独立替换 Mock。

**Blocked by:** None — can start immediately

**Status:** completed

- [x] 会话分类与沉浸布局被标记为回归基线。
- [x] AI 能力和“稍后处理”不进入本轮实现。
- [x] 引用、Reaction、搜索结果、资源引用和翻译状态有稳定语义。

## IM2-02 — 引用回复纵向闭环

**What to build:** 用户可从任意普通消息选择“回复”，在 Composer 看到并取消引用，发送后消息携带引用摘要，点击摘要可定位原消息。

**Blocked by:** IM2-01

**Status:** completed

- [x] 教师和学生、群聊和 1v1 共用同一交互。
- [x] 撤回或未加载原消息时引用摘要安全降级。
- [x] 切换会话不串用引用草稿。

## IM2-03 — 消息 Reaction 纵向闭环

**What to build:** 用户可对消息添加/取消常用 Reaction，并看到聚合计数与本人选择状态。

**Blocked by:** IM2-01

**Status:** completed

- [x] 同一用户同一 Reaction 幂等切换。
- [x] 撤回消息不可新增 Reaction。
- [x] 键盘与辅助技术能理解按钮状态和计数。

## IM2-04 — 聊天记录组合搜索

**What to build:** 用户可在当前会话按关键词、发送人和日期搜索全部可用历史，从结果跳转并高亮原消息。

**Blocked by:** IM2-01

**Status:** completed

- [x] 搜索与会话列表过滤在入口和语义上明确分离。
- [x] 结果覆盖已加载消息和 Mock 历史页。
- [x] 空、加载、清除和焦点恢复可操作；生产 Adapter 接入后复用现有可恢复错误边界。

## IM2-05 — 会话资源检索与引用复用

**What to build:** 用户可检索当前会话和班级共享资源，查看来源与元数据，并把已有资源引用插入当前消息。

**Blocked by:** IM2-01

**Status:** completed

- [x] 支持关键词和类型过滤，结果按来源标识。
- [x] 资源以稳定 Reference 复用，不复制文件二进制或所有权。
- [x] 无真实文件服务时清晰标记 `SIMULATED`。

## IM2-06 — 原文与译文对照

**What to build:** 用户可在单条消息下展开目标语言译文，持续看到原文，并在失败时原位重试。

**Blocked by:** IM2-01

**Status:** completed

- [x] 每条消息独立维护加载、完成、失败和收起状态。
- [x] 同一原文和目标语言可复用缓存。
- [x] Demo 译文显示 `SIMULATED` 真值标签。

## IM2-07 — 跨入口回归与验收

**What to build:** 在教师、学生、消息中心、固定班级入口、沉浸与紧凑宽度中验证五项新增能力，同时保护会话分类、沉浸布局和既有 Sidecar 几何。

**Blocked by:** IM2-02, IM2-03, IM2-04, IM2-05, IM2-06

**Status:** completed

- [x] TypeScript、Lint、相关 Unit/Integration、消息 E2E 与构建通过。
- [x] Overlay 不形成第四栏，Composer 草稿和焦点可恢复。
- [x] 无溢出、遮挡、不可达操作或生产能力误标。
