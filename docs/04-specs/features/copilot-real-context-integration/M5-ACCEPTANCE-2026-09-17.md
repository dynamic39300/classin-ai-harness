---
title: M5 群聊引用闭环验收记录
status: COMPLETE_CONDITIONAL_GATE
milestone: M5
date: 2026-09-17
---

# 结论

M5 已按 D-163 完成可用范围内的严格 Gate。F1、F2、F3 使用授权私有目录中的真实 WebSocket 消息原文完成 Reader 校验、引用定位、作业题 OCR、DeepSeek 和页面闭环。当前快照只有一次实际历史帧，`coverage.complete=false`；因此快照读取能力通过，独立在线 WebSocket 会话和完整历史分页保持 `BLOCKED_EXTERNAL`。

# 验收结果

| 能力 | 结果 | 状态 |
| --- | --- | --- |
| F1 | 实际读取 20 条原始正文，时间范围 2026/09/16 14:43:42–15:00:45；模型和页面均明确“最近5天请求范围、实际只返回该时段、分页不完整” | `CONDITIONAL_PASS` |
| F2 | 引用消息 `1789541141118130` 唯一定位第一讲作业第2题；Apple Vision OCR 还原完整题面；AI新解验算为 3℃、−8℃、11℃、−3℃ | `PASS` |
| F3 | 引用消息 `1789541501760949` 后的教师回复被识别；最终回答指出教师已回答、学生已理解，因此无需重复发送同义草稿 | `PASS` |
| 在线 Reader | 群归属、帧类型、作者、时间、去重冲突、撤回和非文本消息合同已实现；测试环境未提供可长期连接的独立 WS 鉴权与分页会话 | `BLOCKED_EXTERNAL` |
| 真实发送 | 发送前变化检测合同通过；当前仍只允许审阅、编辑、复制或既有本机模拟交付 | `BLOCKED_EXTERNAL_SAFE` |

# 数据与安全

消息原文不脱敏地进入授权模型 Context，满足本轮测试要求；原文只保存在 `.runtime/private/`，不写入仓库文档、提交记录或公开日志。Agent 消息与学生消息分角色；撤回正文投影为“消息已撤回”；同 ID 不同正文安全失败。

# 回归证据

- 真实 Context：`.runtime/private/classin-test/m5-context-check.json`；
- 真实 DeepSeek：`.runtime/private/classin-test/m5-deepseek-check.json`；
- 浏览器：`.runtime/private/classin-test/m5-browser-check.json`；
- 截图：`/tmp/m5-f1-live.png`、`/tmp/m5-f2-browser-smoke-2026-09-17.png`、`/tmp/m5-f3-final-browser-smoke-2026-09-17.png`；
- 164 个测试文件、1032 项测试通过；
- 类型检查、Lint、生产构建通过；
- ClassIn 专项 Playwright 40 项通过，覆盖错误、恢复、紧凑视口、历史和草稿交付。

# 外部恢复条件

若要把 F1 从条件通过升级为完整通过，需要测试环境提供稳定 WebSocket 鉴权方式、历史分页游标/终止语义和增量订阅生命周期，并重新验证跨页去重、撤回、附件正文与五天完整性。若要开放真实发送，还需要普通 IM 写入接口、接收对象合同、幂等键和服务端回执。
