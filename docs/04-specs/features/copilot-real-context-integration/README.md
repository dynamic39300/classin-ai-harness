---
title: Copilot 真实业务 Context 接入计划索引
status: COMPLETE_SELF_GATE_AWAITING_USER_ACCEPTANCE
date: 2026-09-17
---

# 审阅顺序

1. [PRD](./PRD.md)：产品目标、范围、数据真实性和整体成功定义；
2. [Feature Spec](./FEATURE-SPEC.md)：Module、Interface、Seam、工具路由、Context和测试设计；
3. [21题验收矩阵](./ACCEPTANCE-MATRIX.md)：每道问题的接口、当前准备度和Demo通过标准；
4. [四阶段与10条推荐覆盖矩阵](./TEACHING-DYNAMICS-COVERAGE.md)：阶段空态、P01–P10触发、接口、去重和验收；
5. [里程碑计划](./MILESTONE-PLAN.md)：M0–M6实施顺序、依赖、Gate和Ticket组。
6. [M0实施与验收记录](./M0-ACCEPTANCE-2026-09-16.md)：当前可运行结果、验证证据和五项用户验收。
7. [M1实施与验收记录](./M1-ACCEPTANCE-2026-09-16.md)：十题真实Context、DeepSeek运行、浏览器证据和本次验收清单。
8. [M2实施 Tickets](./M2-TICKETS.md)：实时/历史出勤、录播参与、外部阻塞和验收 Gate。
9. [M2实施与验收记录](./M2-ACCEPTANCE-2026-09-17.md)：B2/B3真实运行、B1实时阻塞、P03安全降级。
10. [M3验收](./M3-ACCEPTANCE-2026-09-17.md)、[M4验收](./M4-ACCEPTANCE-2026-09-17.md)、[M5验收](./M5-ACCEPTANCE-2026-09-17.md)：逐题/资料、学情/周报、群聊引用闭环。
11. [M6最终验收](./M6-FINAL-ACCEPTANCE-2026-09-17.md)：21题、P01–P10、回归、外部阻塞与整体签收入口。

原需求计划、四阶段空态和P01–P10完整覆盖均已获用户确认。M0、M1 已通过用户验收；M2～M6 已按 D-163 连续目标模式通过严格工程 Gate，当前等待用户晨间整体验收。

## 已批准的交互优化

- [IM 进入加载与快捷提问实施合同](../workbuddy-im-collaboration/COPILOT-ENTRY-LOADING-IMPLEMENTATION.md)：最新增量完成输入框主题文案、顶部数量说明合并、一小时推荐刷新；三问在加载期间入场，可操作推荐渐显后再退出，“可以问什么”保持普通入口（临时提示/高亮已移除），保护悬停/键盘操作；历史收起可展示、展开后退出；局部加载和失败恢复已实现；课中无课仅提示，总结已删除活动完整性行；[验收记录](../workbuddy-im-collaboration/COPILOT-ENTRY-LOADING-ACCEPTANCE-2026-09-17.md)含首轮回归和后续迭代证据；[讨论过程](../workbuddy-im-collaboration/COPILOT-ENTRY-LOADING-DISCUSSION-2026-09-17.md)保留。

## 后续讨论（尚未实施）

- [问题处理与输出 Skill 化讨论稿](../../../06-architecture/COPILOT-SKILL-ARCHITECTURE-DISCUSSION-2026-09-17.md)：2026-09-17 当前硬编码/Prompt 盘点、路由探针、候选问题族、Runtime 边界与对照评测建议；讨论通过后再形成实施规格。
- [一手行业证据](../../../01-research/COPILOT-SKILL-INDUSTRY-EVIDENCE-2026-09-17.md)：Agent Skills、路由、工具合同与评测的官方来源，区分公开事实与项目建议。
