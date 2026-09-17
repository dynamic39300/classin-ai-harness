---
title: M2 实时/历史出勤与录播参与 Tickets
status: COMPLETE_USER_ACCEPTED
milestone: M2
date: 2026-09-16
---

# M2 范围

补全 B1 实时分支，实施 B2“最近几节课谁迟到或缺席”和 B3“录播大家学到哪了”，并核验课中 P03 推荐。真实测试 Thread 继续只使用真实 API；缺少成员级实时样本时不生成模拟未到名单。

# 已冻结事实

- B2 使用已结束课堂的 `/lms/app/activity/class/students` 成员明细聚合；`onClass/isLate/isEarly/classLength` 采用业务接口口径，不从评论或时长反推。
- B3 使用录播详情和 `/lms/app/activity/recordClass/students`；分母来自实际分配名单，状态、进度和时长逐人核对。
- B1 课中实时的 `getClassInfo → getClassMember` 契约已识别，但当前没有受支持登录会话的成员级正向样本。Bridge 在线总数包含教师，不能转换为学生到课人数。
- OceanBase 当前物理表名和访问合同未确认，T-1 数仓只能对账，不能冒充实时来源。

# Tickets

| Ticket | 交付 | 完成条件 |
| --- | --- | --- |
| RC-200 | M1 验收收口与 M2 状态 | M1 标记用户验收完成；M2 Write Set 和外部阻塞写回事实源 |
| RC-201 | 历史出勤 Reader | 最近已结束课堂逐课读取成员出勤；名单、状态、时长和课堂归属校验完整 |
| RC-202 | B2 跨课聚合 | 明确覆盖课次和时间窗；按学生聚合缺席、迟到、早退，明细可复算，不评价学习态度 |
| RC-203 | B3 录播参与 | 真实录播对象、分配人数、未开始/学习中/已完成、进度和时长准确；不把0进度解释为能力判断 |
| RC-204 | B1 实时 Gate | 实时与课后证据分离；无成员级正向样本时保持 `BLOCKED_EXTERNAL`，P03 不误触发 |
| RC-205 | Catalog、路由与 Runtime | B2/B3 加入真实问题全集；工具路由、Route Receipt、最小 Context 和回答约束一致 |
| RC-206 | 验证与验收证据 | B2/B3 完成真实 Context→DeepSeek→浏览器闭环；B1 阻塞状态可见；回归、文档和用户验收入口齐全 |

# Write Set

- `src/contracts/classin-test/`：出勤聚合与录播参与合同；
- `src/domain/classin-test/`：B2/B3 catalog、Context 与确定性派生；
- `server/`：历史出勤 Reader、真实路由及 BFF 组合；
- `runtime/harness/`：现有只读 Context 工具复用；
- `tests/`：状态枚举、缺值、归属、跨课聚合和录播分母测试；
- 本目录计划、矩阵、验收记录与决策账本。

# Gate

B2、B3 各完成一次真实 DeepSeek 和浏览器运行；聚合能由逐课明细复算；录播分母与学生列表一致。B1 实时只有在成员级正向样本通过后才能升级；否则以 `BLOCKED_EXTERNAL` 进入 M2 验收，不生成 P03 名单或“全员到齐”。

工程实现与验证已完成，详见[M2验收记录](./M2-ACCEPTANCE-2026-09-17.md)。用户已通过M2验收；M3已启动。
