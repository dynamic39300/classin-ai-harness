---
title: M3 逐题聚合、资料正文与连续对话验收记录
status: COMPLETE_SELF_GATE
milestone: M3
date: 2026-09-17
---

# 结论

M3 已按 D-163 连续目标模式通过内部严格 Gate。C5、E3、E5 和 P07 完成真实 API → Context → DeepSeek → 页面闭环；P06 已由真实进行中测验投影规则和契约测试覆盖，当前业务时钟没有进行中测验时不制造推荐。

# 验收结果

| 能力 | 结果 | 状态 |
| --- | --- | --- |
| C5 | 纳入已结束测验 1 项、10 题、3 名分配学生；第4/8/10题未完全正确 2/2 人；未参与和待批阅不进分母；已结束作业因无结构化逐题判定明确排除 | `PASS` |
| E3 | 从第14讲真实 PDF 文字层提炼“翻译为数轴距离、按零点分区间、候选解回代”三点，均可定位原文 | `PASS` |
| E5 | 同一 Session 将 E3 已确认内容转换成可审阅草稿，不调用新业务接口；页面出现修改/直接发送审阅动作 | `PASS` |
| P06 | 作业与测验分别投影；只有真实进行中测验才显示 | `PASS_CONTRACT` |
| P07 | 仅在逐题聚合存在有效分母且有未完全正确记录时显示，当前真实页面显示第4题 2/2 | `PASS` |

# 证据与回归

- 真实 DeepSeek：`.runtime/private/classin-test/m3-deepseek-check.json`；
- 浏览器：`.runtime/private/classin-test/m3-browser-check.json`；
- 截图：`/tmp/m3-c5-browser-smoke-2026-09-17.png`、`/tmp/m3-e3-browser-smoke-2026-09-17.png`、`/tmp/m3-e5-browser-smoke-2026-09-17.png`；
- 类型检查、Lint、生产构建通过；
- 160 个测试文件、1021 项测试通过；
- `classin-messages-hybrid.spec.ts` 7 项通过；
- `git diff --check` 通过。

# 边界

逐题排名不推断错因；图片题无文字题干时只显示限制。作业没有逐题结构时不进入排名。E5 的真实普通 IM 送达仍属于既有本机模拟传输回执，不改变业务 Context 的真实标签。
