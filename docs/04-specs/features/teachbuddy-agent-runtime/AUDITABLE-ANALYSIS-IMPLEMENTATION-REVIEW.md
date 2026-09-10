---
title: TeachBuddy 可审计分析过程实施验收记录
status: IMPLEMENTED_ACCEPTED
version: v1.0
date: 2026-09-08
decision: D-123
---

# 实施结果

已完成 D-123 和 Feature Spec 的 M1、M2 范围。`AnalysisProcessProjection` 在 Domain 中按每轮教师请求分组真实事件，避免把多轮 Session 的总时长错误显示为当前分析耗时。每轮记录独立保留；当前轮运行时默认展开，完成后自动折叠，教师可重新查看。

共享 `AnalysisProcess` 组件已进入：

- `ideal-full` 的 ClassIn TeachBuddy 主工作台；
- `classin-mvp` 的班级课程详情 TeachBuddy；
- `standalone-teacher` 的独立 TeachBuddy；
- IM 右侧 TeachBuddy Sidecar。

Sidecar 把已捕获的 `BusinessContextSnapshot` 投影为当前会话类型、最近消息条数、受治理来源、数据时效和敏感信息排除证据。Tool/Skill 事件由分析过程承载，不再重复渲染为聊天气泡；最终 Agent 回答继续使用原消息/LUI 视图。

# 状态与边界

运行、完成、需要补充、停止和失败由 Session/Event 决定。前端计时器只刷新 `now - startedAt`，不会生成步骤。完成耗时由最后事件时间冻结。没有真实阶段事件时仅显示“请求已接收，正在等待运行事件”。

Harness 的原始 `reasoning-delta` 过滤保持不变；页面不显示模型隐藏推理、Prompt、数据库/SQL 或凭据。M3 结构化 `reasoning_summary` 继续关闭，等待独立的事实性、隐私和简洁度评测。

# 验收证据

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --quiet` | 通过 |
| `npm run build` | 通过；仅保留既有大 Chunk 警告 |
| `npm run test:harness` | 11/11 通过 |
| Domain 直接运行 Smoke | 通过：实际耗时、完成冻结、每轮分组 |
| Agent Runtime Chromium E2E | 9/9 通过：1440×900、390×844、停止、离线、班级 Scope、Standalone |
| IM Sidecar Chromium E2E | 4/4 通过：真实上下文投影、富文本、900×720、草稿交付 |
| `git diff --check` | 通过 |

Vitest 在本机 Worker 启动阶段持续超时，未进入测试文件；该环境问题已在此前运行中存在。本轮新增 Domain 测试文件已通过 TypeScript/ESLint，核心分组与耗时逻辑另用 Node TypeScript strip-types 直接执行断言通过，浏览器契约由 13 个相关 E2E 覆盖。

# 视觉结论

主工作台过程区与消息列等宽，桌面和 390px 窄屏无水平溢出。Sidecar 紧凑形态最多显示当前与最近两个步骤，过程区内部滚动，Composer 保持固定可达。实机复核发现并修复了旧实现按整个 Session 计时造成的“52m 32s”问题，最终实现按每轮教师请求计算。
