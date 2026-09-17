---
title: M2 实时/历史出勤与录播参与验收记录
status: COMPLETE_USER_ACCEPTED
milestone: M2
date: 2026-09-17
---

# 结论

M2 工程实现和真实环境验证已完成，当前停在用户验收 Gate。B2、B3 为 `PASS_PENDING_USER`；B1 课中成员级实时分支为 `BLOCKED_EXTERNAL`，没有用课后报告、Bridge 聚合人数、数仓历史表或模拟数据填补。

# 本次可验收能力

| 能力 | 真实结果 | 状态 |
| --- | --- | --- |
| B2 最近迟到/缺席 | 覆盖最近3节已结束课堂（2026-09-14至2026-09-16）；逐课应到、到课、缺席、迟到、早退和时长可复算。当前测试学生A缺席3次，测试学生B缺席2次，测试学生C缺席2次；三人迟到/早退均0；请假状态未知 | `PASS_PENDING_USER` |
| B3 录播参与 | 第3讲录播分配3人；测试学生A、测试学生B、测试学生C均为未开始、0%、0秒；开放时间为2026-09-13 21:06至2026-10-12 15:30 | `PASS_PENDING_USER` |
| B1 课中实时 | 已确认 `getClassInfo → getClassMember` 合同和 Bridge 聚合在线人数；尚无受支持登录会话下的成员级正向样本，无法可靠给出未进入、迟到、早退名单 | `BLOCKED_EXTERNAL` |
| P03 课中未进入提醒 | 成员级实时证据缺失时继续显示“实时出勤尚未接入/待核”，不生成动作、不显示全员到齐 | `BLOCKED_EXTERNAL_SAFE` |

# 实施结果

- `RC-200`：M1 已标记用户验收完成，M2 范围和 Write Set 落盘；
- `RC-201/202`：新增历史出勤 Reader，逐课核验授权班级成员、名单数量、0/1 状态枚举和在课时长；跨课聚合保留覆盖窗口与请假缺口；
- `RC-203`：B3 复用录播详情和学生列表，回答包含实际分母、状态、进度和时长；
- `RC-204`：B1 实时及 P03 保持外部阻塞，不制造业务事实；
- `RC-205`：Catalog 从10题扩为12题，B2/B3 已具备确定性工具路由、Route Receipt、对象引用和最小 Context；
- `RC-206`：真实 Context、DeepSeek、浏览器、隐私分层和工程回归均已完成。

# 回答质量修正

首次模型运行曾把 B2 的事实扩写为“情况突出、建议重点关注、情况有所好转”，并把 B3 开始时间写成发布时间、追加督促建议。回答合同已补充专项约束并重新通过浏览器验证：

- 出勤只陈述覆盖课次、绝对时间、逐课状态和可复算次数，不评价态度、趋势或给干预建议；
- 请假字段缺失时明确为未知；
- 录播只陈述分母、状态、进度、时长和开放起止，不估算剩余天数或增加督促建议；
- 面向消息草稿的 Context 不包含学生姓名，教师私有问答才包含逐人明细。

# 验证证据

- 真实 Context：`.runtime/private/classin-test/m2-context-check.json`；
- 真实 DeepSeek/浏览器：`.runtime/private/classin-test/m2-browser-check.json`；
- B2 截图：`/tmp/m2-b2-browser-smoke-2026-09-17.png`；
- B3 截图：`/tmp/m2-real-demo-browser-smoke-2026-09-17.png`；
- 本轮新增契约测试覆盖完整名单、外班成员、未知枚举、Catalog、Route Receipt 和群草稿隐私分层。

工程验证：

- `npm run typecheck`：通过；
- `npm run lint -- --quiet`：通过；
- `npm run test`：158个测试文件、1016项测试通过；
- `npm run build`：通过，只有既有产物分包大小提示；
- `classin-messages-hybrid.spec.ts`：7项浏览器回归通过；
- B2、B3 在真实测试 Thread 中分别完成一次真实 API → Context → DeepSeek → 页面回答。

# 用户验收清单

在真实测试 Thread 的“可以问什么 → 课堂参与”中检查：

1. B2 是否清楚说明3节课的覆盖范围、逐课缺席和按学生次数，并明确请假未知；
2. B2 是否没有态度评价、趋势判断和额外干预建议；
3. B3 是否准确显示3人均未开始、0%、0秒和真实开放起止；
4. 课中 Tab 是否继续显示待核状态，且没有模拟未进入名单或错误的“全员到齐”；
5. 若以上可接受，确认 M2 通过；之后才进入 M3。

# 外部解除条件

B1 实时升级需要同一授权测试课堂中完成 `getClassInfo → getClassMember` 正向读取，验证 `isOnClass/isInClass/isLate/isEarly/classTime/timeList` 的语义、时区、刷新延迟和名单分母。若改用数据库，需要先确认 OceanBase 当前物理表名、只读权限和时效；T-1 数仓继续只用于对账。

> 发布说明：本文件使用测试学生代称；原始授权样本保留于本机受限运行目录。
