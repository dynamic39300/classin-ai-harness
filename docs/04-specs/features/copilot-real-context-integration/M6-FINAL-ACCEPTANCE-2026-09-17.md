---
title: M6 Copilot 真实业务 Context 最终验收记录
status: COMPLETE_SELF_GATE_AWAITING_USER_ACCEPTANCE
milestone: M6
date: 2026-09-17
---

# 交付结论

M0～M6 计划范围已完成内部严格 Gate。真实测试 Thread 使用真实 ClassIn API、授权私有 IM 快照和 DeepSeek；没有对应任务时显示真实空态或未知状态，没有注入模拟业务数据。普通 IM 写入未接通时保留的本机模拟只表示传输回执，不增加 Context 事实。

21 类主动问题最终为 **15 PASS + 6 CONDITIONAL_PASS + 0 状态不明**。P01～P10 为 **7 PASS + 2 CONDITIONAL_PASS + 1 BLOCKED_EXTERNAL**。完整逐项结果分别见[21题矩阵](./ACCEPTANCE-MATRIX.md)与[推荐覆盖矩阵](./TEACHING-DYNAMICS-COVERAGE.md)。

# M3～M6 完成结果

| 里程碑 | 主要交付 | Gate |
| --- | --- | --- |
| M3 | C5逐题有效分母、E3真实PDF正文、E5同Session复用；P06/P07 | `COMPLETE_SELF_GATE` |
| M4 | D1/D2/D5/E4受限活动学情聚合；P09/P10 | `COMPLETE_SELF_GATE` |
| M5 | F1真实消息快照、F2引用题图OCR与验算、F3后续回复核对 | `COMPLETE_CONDITIONAL_GATE` |
| M6 | 21题终态、P01/P04/P08真实动态补齐、失败/容量/安全、文档和全量回归 | `COMPLETE_SELF_GATE` |

# 最终业务验证

- 当前真实课程目录含 54 项活动；问答目录只展示当前证据可支持的 21 类问题实例；
- 当前教学动态显示 7 项真实建议：P01、P04、P05、P07、P08、P09、P10；
- P02 与 P06 因当前时间没有对应触发事实而隐藏；P03 显示“实时出勤尚未接入”，不产生学生名单或提醒动作；
- P01 实际路由 `read_course_progress`；P04 路由 `read_lesson_companions` 并绑定课堂与配套作业；P08 路由原始 ASR、教师笔记和 AI 分析；
- F1 使用 20 条真实原文，明确实际时段与分页不完整；F2 还原温度题并验算 3℃、−8℃、11℃、−3℃；F3 识别已有教师回复和学生理解，判断无需重复发送；
- 所有真实 Context 服务端重核教师、机构、Thread、活动、学生和引用消息归属；Context 超限、重复消息冲突、失效 Session 与跨 Scope 均安全失败。

# 最终回归

| 检查 | 结果 |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS |
| Vitest | PASS：165 个文件、1034 项测试 |
| Harness 契约 | PASS：22/22；包含失败响应、40KB响应、26KB Context、单字段4KB及跨Scope拒绝 |
| 生产构建 | PASS；保留既有约2.04MB主JS chunk提示 |
| ClassIn专项 Playwright | PASS：40/40；错误、重试、并发选择、紧凑视口、历史、草稿、隔离均通过 |
| 真实 DeepSeek / 浏览器 | M3、M4、M5逐里程碑证据通过 |
| 三视口视觉 | 1440×1000、1024×768、390×844 无Sidecar横向溢出，人工复核无遮挡或不可达动作 |
| axe | Sidecar三视口 serious/critical = 0；ClassIn专项 @a11y 通过 |
| whitespace | `git diff --check` PASS |

M6 门禁中首次运行发现 Harness 只限制整体 Context、没有限制单项事实长度；现已增加单项 label 200 字符/value 4000 字符边界，并由失败用例验证通过。

# 仍受外部合同限制

| 能力 | 状态 | 恢复所需 |
| --- | --- | --- |
| 成员级实时考勤与P03 | `BLOCKED_EXTERNAL` | 支持的实时课堂会话、`getClassInfo → getClassMember`正向成员样本，或已确认物理表的只读DB Adapter |
| 正式学情报告 | `BLOCKED_EXTERNAL` | 稳定的正式个人/班级学情报告合同；当前 D1/D2/D5/E4 使用明确标注的受限活动聚合 |
| 完整在线IM Reader | `BLOCKED_EXTERNAL` | 稳定WS鉴权、历史分页游标/终止语义、增量订阅生命周期和附件读取合同 |
| 普通IM真实发送 | `BLOCKED_EXTERNAL_SAFE` | 写接口、接收对象、幂等键、ACK/回读合同和测试学生真实收件证据 |

# 晨间验收入口

预览继续运行于 `http://127.0.0.1:4175/`。建议按以下顺序抽验：

1. 查看顶部四阶段的 7 项建议，以及课中“待核”状态；
2. 在“可以问什么”中抽验 C5、D1、E3、E4；
3. 在“群聊内容”中依次抽验 F1、F2、F3；
4. 核对 F1 的分页限制、F2 的 OCR/AI解析边界、F3 的“无需再发”；
5. 确认条件能力的限制文案可以接受后，完成整体用户签收。
