---
title: IM Copilot 阶段里程碑交付
date: 2026-09-17
status: MILESTONE_ACCEPTED_WITH_DOCUMENTED_BOUNDARIES
tag: im-copilot-milestone-2026-09-17
---

# IM Copilot：基于学情的个性化师生教学沟通

用户确认当前方案已阶段性完成，要求以 Git Commit / Push 固化前端交互、DeepSeek Harness Runtime、真实测试业务读取及教师审阅交付闭环，并另行起草完整产品 PRD。

## 版本范围

- 两个 IM 入口共用消息工作区、教师 AI 消息助手、连续对话、历史恢复和草稿审阅。
- 四阶段教学建议、21 类主动问题、10 类推荐意图及真实空态；包括最新加载渐变、一小时推荐刷新、输入引导和课中提示简化。
- DeepSeek Harness、服务端授权与 Context 读取、运行/停止/恢复，以及模型输出与 IM 共用的结构化正文呈现。
- ClassIn 测试业务 API、ASR/报告/课件正文、课后考勤、作业测验、录播及授权 IM 样本读取；独立 API 审阅台和逐里程碑验证文档。
- 既有 ClassIn 教师/学生 Demo、消息基础交互、群聊 Agent 与 Agent 单聊渠道骨架继续保留。

## 本次发布复核

| 检查 | 结果 |
| --- | --- |
| TypeScript、ESLint | 通过；测试断言更新后另行复核 |
| Vitest | 168 文件、1065 项通过 |
| Harness 契约 | 22 项通过 |
| 独立 API 审阅台 | 36 项通过 |
| Vite 生产构建 | 通过；既有大 chunk 提示保留 |
| ClassIn 专项浏览器回归 | 54 项覆盖：首轮 52 项通过，2 项旧纯文本断言更新为结构化列表/正文/已知提及断言后 2/2 复验通过 |
| 当前本机 Runtime | `/api/teachbuddy/health` 返回 ready |
| 当前真实业务读取 | `/api/classin-test/dynamics` 成功返回四阶段、7 项建议 |
| 提交检查 | staged diff、凭据/账号字面量扫描；`.env`、`.runtime`、原始消息及含测试账号的答卷样本不提交 |

本轮浏览器复核只使用隔离的契约样本，不重新发送真实群消息；真实 DeepSeek 业务生成证据沿用已完成的 M1～M6 联调，健康状态不能替代新的全问题模型验收。

浏览器发现的两条失败均在发送成功后：旧断言定位到“当前进度”段落，并要求显示原始 Markdown 列表符号。当前共享组件已将其渲染为列表；修正测试为完整消息唯一性、四条列表内容、全部原文保留及已知成员提及样式，不修改业务实现。

原始验证日志和浏览器产物位于本机 `.runtime/milestone-2026-09-17-*`。

## 交付边界

测试环境可运行闭环不等于生产上线：普通 IM 发送仍为教师端本机模拟传输，学生端真实收件未接通；实时成员级考勤、完整在线 IM Reader 和正式学情报告合同仍有缺口。课后成员级考勤可读，学情摘要使用明确范围的活动聚合，不能据此宣称实时到课或完整学情诊断。

21 类主动问题的既有业务 Gate 为 15 PASS、6 CONDITIONAL_PASS；10 类阶段推荐为 7 PASS、2 CONDITIONAL_PASS、1 BLOCKED_EXTERNAL。可用建议数量随真实事实变化，不能固定补满。

## 追溯

- [M6 真实 Context 最终验收](../04-specs/features/copilot-real-context-integration/M6-FINAL-ACCEPTANCE-2026-09-17.md)
- [21 类主动问题矩阵](../04-specs/features/copilot-real-context-integration/ACCEPTANCE-MATRIX.md)
- [四阶段推荐覆盖](../04-specs/features/copilot-real-context-integration/TEACHING-DYNAMICS-COVERAGE.md)
- [最新进入与加载交互验收](../04-specs/features/workbuddy-im-collaboration/COPILOT-ENTRY-LOADING-ACCEPTANCE-2026-09-17.md)

用户另行要求的新 PRD 是独立产品需求基线，后续单独提交；Notion 原汇报仅用于功能范围参考，保持原文不变。
