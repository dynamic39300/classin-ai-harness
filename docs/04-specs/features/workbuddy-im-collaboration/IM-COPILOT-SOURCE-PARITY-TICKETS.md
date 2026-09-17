---
title: IM Copilot 模拟基线恢复与源项目对齐 Tickets
status: COMPLETE
version: v1.0
date: 2026-09-15
decision: D-157
---

# Tickets

| Ticket | 纵向结果 | Write Set | 状态 |
| --- | --- | --- | --- |
| PAR-01 | 冻结源工作树、截图和哈希 | 对齐审计、manifest、prototype export | DONE |
| PAR-02 | V2 默认组合根恢复 Mock | `src/app/App.tsx`、消息/Copilot Provider 装配及相关测试 | DONE |
| PAR-03 | 迁入通用问题、聊天引用和历史 Module | contracts、domain、mocks、Sidecar、MessageWorkspace及测试 | DONE |
| PAR-04 | 对齐顶部、草稿、提及和密度 | TeachingDynamics、AgentRichResponse、Sidecar CSS、tokens及测试 | DONE |
| PAR-05 | 合并 V2 图片排序和 Runtime 恢复 | Sidecar、Runtime Envelope、过程投影及回归 | DONE |
| PAR-06 | 双实例交互和视觉验收 | 源/V2浏览器脚本、E2E、截图与验收记录 | DONE |
| PAR-07 | 全仓 Gate 与记录 | typecheck、lint、Vitest、build、Playwright、本票与状态文档 | DONE |

# 顺序与限制

PAR-02 先保证默认页面只有 Mock；PAR-03～05 按 Interface 合并，不能用目录覆盖解决冲突；PAR-06 同时验证源页面和 V2 页面；PAR-07 只在前述行为通过后完成。真实 API Module 和测试环境数据不在 Write Set 内。
