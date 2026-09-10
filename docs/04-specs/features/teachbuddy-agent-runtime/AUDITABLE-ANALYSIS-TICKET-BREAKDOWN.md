---
title: TeachBuddy 可审计分析过程 Ticket Breakdown
status: COMPLETE
version: v1.0
date: 2026-09-08
decision: D-123
---

# 纵向切片

三个切片已于 2026-09-08 完成，验收证据见 [实施验收记录](./AUDITABLE-ANALYSIS-IMPLEMENTATION-REVIEW.md)。

## AA-01 共享投影与主工作台

从真实 Session/Event 构建 `AnalysisProcessProjection`，实现运行、完成、停止、失败、需要补充、实际耗时和来源引用。主工作台替换单行等待提示，三个 Runtime Scope 自动共享完整形态。

完成条件：Domain 测试通过；主工作台可展开/折叠；Tool/Skill 不重复显示；最终回答、Artifact、停止和重试行为不回归。

## AA-02 IM Sidecar 紧凑形态

Sidecar 使用同一 Projection 与组件，并把已捕获的真实 `BusinessContextSnapshot` 以最小标签注入投影；紧凑模式展示当前与最近步骤，同 Session 主工作台保持一致。

完成条件：Sidecar 不再显示孤立的“正在处理”；过程不推走 Composer；消息草稿、个性化服务和进入主工作台不回归。

## AA-03 证据详情、回归与记录

展示现有 Event Detail、Context 标签、对象引用和敏感信息排除数；完成桌面、窄屏、Sidecar、停止/失败和刷新恢复验收，写回结果。

完成条件：类型检查、构建、Harness、相关单测/E2E 与视觉几何检查通过；实施记录注明未开放的 M3 结构化摘要和任何剩余限制。
