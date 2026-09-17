---
title: ClassIn 学生提交、教师批改与 IM 双客户端采集复核
status: READBACK_CALL_VERIFIED_WRITE_ROUTE_PENDING
date: 2026-09-16
scope: 学生作业/测验提交、教师批改、普通 IM 实时消息
---

# ClassIn 学生提交、教师批改与 IM 双客户端采集复核

## 1. 结论

第二轮在操作前同时监听教师端 `127.0.0.1:7777`、学生端 `127.0.0.1:7779` 和另一学生端 `127.0.0.1:7780`。本轮已经获得学生提交和教师操作后的跨角色**回读 `CALL` 证据**：两名学生分别完成第一讲测验，第二名学生随后回读到 `status=2`、`isStuScore=1`、`showScore=25`；第一名学生完成第二讲作业后，学生活动状态由 `1` 变为 `2`，教师待办 `biz_status` 由 `5` 变为 `4`。这些变化与用户实际执行的提交、批改操作按服务器时间一致。

三个 CEF CDP Network 流没有捕获作业提交、测验交卷或教师批改的直接 HTTP 写请求，只出现课程活动列表和待办详情等回读请求。继续检查仍可读取的辅助学生端原生日志后，确认测验窗口通过 `POST /api/exam.api.php?action=submitPaper` 写入：日志记录 13 次同一试卷的请求形状，前 12 次 `isExamEnd=2`，最后一次于 16:12:22 发出 `status=3/isExamEnd=1/isAuto=0`，并携带 10 题 `answerList`。约两秒后学生待办、学生活动和教师 `submitTotal` 都回读到完成状态。原生日志没有保留这次调用的直接响应外壳，因此可将该路径标为“请求与结果回读 `CALL`，直接响应合同待补”；作业提交和教师批改写 Endpoint 仍未捕获。

第一轮普通 IM 获得了独立的 `CALL` 证据：教师端完成 WebSocket 鉴权、回读一页 20 条历史消息，并实时收到一条由学生侧发起的 `clusterEvent:receiveChatMsg`。消息对象包含稳定消息 ID、本地 ID、发送者、时间、内容、发送状态和是否需要滚到底部等字段；研究记录没有保存正文与账号标识。

## 2. 采集结果

### 2.1 第一轮教师端主采集

- 采集 1,483 条事件、381 个请求；
- 其中 XHR 123 个、Fetch 27 个，合计 42 个唯一业务 Endpoint；
- 观察到 6 次 WebSocket 建连、193 个发出帧和 173 个接收帧；
- HTTP 侧主要是课程、单元、活动、待办和消息页面基线；
- 没有捕获作业提交、测验 `submitPaper`、批改 `reviewPapers` 或其他评分写接口。

### 2.2 第一轮学生端补充只读采集

学生客户端端口确认是 `127.0.0.1:7779`。完成操作后的只读重载记录 556 条事件、186 个请求和 176 个响应正文，确认：

- 当前身份是学生/家长；
- 学生可见一个目标课程；
- `/course/app/member/course_list`、`/todocenter/todo/list/index`、`/classroom/app/classInfo/simpleInfo` 等基线接口可用。

当前学生 Target 的浏览历史只有一条，浏览器资源时序也不保留已结束页面的完整请求，所以不能从事后状态恢复提交写调用。

### 2.3 第二轮三端并行采集

采集区间为 2026-09-16 16:02–16:26（Asia/Shanghai），三端在开始前已经完成角色和课程页面核对：

| 角色 / 端口 | 事件 | 请求 | 响应正文 | WebSocket | 本轮关键回读 |
| --- | ---: | ---: | ---: | ---: | --- |
| 教师 `7777` | 216 | 72 | 68 | 0 | `/lms/app/course/unitActivityList`、`/todocenter/todo/todo-list/detail` |
| 学生 `7779` | 99 | 34 | 29 | 0 | `/lms/app/course/studentUnitActivityList`、学生待办详情 |
| 学生 `7780` | 209 | 47 | 38 | 74 | 学生活动/待办回读；IM 连接仅鉴权和心跳，没有新增业务消息 |

三个端口共捕获 153 个 CEF 请求。教师与学生主端本轮除埋点外只出现单元、活动和待办回读；辅助学生端另有课程主页初始化与普通 IM 鉴权。三个 CDP 流都没有出现 `ReferHomeworkStudents`、`submitPaper`、`reviewPapers`、`homework/student/submit` 或新的评分写路径。辅助学生端原生日志另行记录了 `submitPaper` 请求，证明 CDP 端口并不覆盖测验子窗口的完整网络流。

原生日志还在 16:13:41 收到 `option=304`、`pushScenes=测验被批阅-无系统评分` 的实时通知，包含 `stuStatus=2`、`showScore=25` 和 `correctTotal=1`。这条通知与随后学生端状态回读一致，可以冻结为教师批改结果事件；它不是教师发起批改的写请求或 ACK。

### 2.4 第二轮业务状态时间线

| 本地时间 | 端口 / 角色 | 已验证变化 | 证据含义 |
| --- | --- | --- | --- |
| 16:03:22 → 16:10:29 | `7779` 学生 | 第一讲测验活动 `status: 3 → 1`；学生待办 `is_cmplt=1`、`cmplt_time=1789546227` | 第一名学生的交卷结果已被服务端回读 |
| 16:10:48 → 16:12:24 | `7780` 学生 | 第一讲测验活动 `status: 3 → 1`；学生待办 `is_cmplt=1`、`cmplt_time=1789546342` | 第二名学生的交卷结果已被服务端回读 |
| 16:12:24 → 16:13:43 | `7780` 学生 | 测验 `status: 1 → 2`、`isStuScore=1`、`showScore=25` | 用户执行教师批改后，学生端读到已出分结果 |
| 16:15:39 → 16:22:08 | `7779` 学生 / `7777` 教师 | 第二讲作业从 `submitTotal=0` 变为 `1`；学生待办 `is_cmplt=1`、`cmplt_time=1789546926` | 学生作业提交结果已由两端回读 |
| 16:22:08 → 16:23:58 | `7779` 学生 / `7777` 教师 | 学生作业活动 `status: 1 → 2`；教师待办 `biz_status: 5 → 4`；教师汇总保持 `submitTotal=1`，`correctTotal: 1 → 0` | 教师操作后的状态变化已同步到两端；枚举含义和 `correctTotal` 变化仍需正式字段合同解释 |

时间线只把原始状态变化与用户操作相关联，不擅自补写未文档化枚举含义。特别是 `correctTotal` 在教师操作后从 `1` 变为 `0`，不能仅凭字段名解释为“取消批改”或“答案错误”。

## 3. 普通 IM 新证据

| 能力 | 观察结果 | 证据状态 |
| --- | --- | --- |
| WebSocket 鉴权 | `wss://dynamic14.eeo.im/chat-gateway-go/ws` 四次返回 `authenticated`、`errCode=0` | `CALL` |
| 进入课程群 | `chatWith` 七次得到成功 ACK | `CALL` |
| 历史消息 | `requestChatMsg` 请求课程群最近 20 条，成功返回 20 个消息对象 | `CALL` |
| 实时收件 | 教师端收到一条学生侧发起的 `clusterEvent:receiveChatMsg` | `CALL` |
| 发送命令 | 教师端没有观察到 `sendTextMessage`；学生发送侧当时未监听 | 保持 `DOC` |
| 发送结果 | 订阅了 `msgSendSuccess/msgSendTimeout/msgSendFailure`，但没有捕获本条消息的发送侧 ACK | 保持 `DOC` |

这证明“学生发出后教师端实时收到”成立，但尚不能冻结发送命令、幂等、ACK、失败恢复和学生端发送回读合同。

## 4. 作业、测验与批改的证据口径

| 能力 | 本轮结论 | 既有独立证据 |
| --- | --- | --- |
| 学生作业提交 | 第二讲作业的学生待办完成、学生状态变化以及教师 `submitTotal: 0 → 1` 已跨端回读；直接写请求未出现 | 既有受控样本已经验证 `/lms/web/activity/homework/student/submit` 成功，并由教师端 `/lms/app/activity/homework/student/detail` 回读为已提交待批 |
| PC 学生作业提交 | 业务结果 `CALL`；具体写路由仍未捕获 | 既有合同识别 `homework.api.php?action=ReferHomeworkStudents`，不得与 Web 提交路径混成同一合同 |
| 学生测验提交 | 两名学生的交卷完成时间、活动状态及教师提交数已跨端回读；第二名学生原生日志捕获 13 次 `submitPaper` 请求形状，最后一次 `isExamEnd=1` 与最终交卷回读对齐 | `submitPaper` 请求与结果回读升级为 `CALL`；直接响应外壳、签名生命周期、幂等和失败恢复仍待验收 |
| 教师测验批改 | 第二名学生收到 `pushScenes=测验被批阅-无系统评分`，并回读 `status=2`、`isStuScore=1`、`showScore=25`；教师发起写请求未捕获 | 批改结果事件升级为 `CALL`；既有 `reviewPapers/getAnswerMarkResult` 写请求、ACK、幂等和失败恢复仍待运行时验收 |
| 教师作业批改 | 学生状态与教师待办状态均发生同步变化；未获得单份批改详情或直接写响应 | 需要继续以 `/homework/student/detail` 对账评语、得分和状态枚举，并识别 PC 原生写合同 |

本轮把测验 `submitPaper` 升级为“请求与结果回读 `CALL`”，把教师测验批改结果事件升级为 `CALL`，并把作业提交和教师操作后的真实状态变化升级为跨角色回读 `CALL`。由于直接响应、鉴权生命周期、幂等和失败恢复不完整，仍不把这些路径升级为 V2 可用写接口。

## 5. 采集改进

本轮证明只监听三个 CEF 端口仍不足以覆盖原生写网络栈。后续若继续验收写合同，应在操作前完成：

1. 枚举所有 ClassIn 实例与 CDP Target；
2. 为每个端口断言教师/学生角色与目标课程；
3. 三路分别保留脱敏请求流，并用服务器时间对齐；
4. 同时接入 ClassIn 原生网络层的受支持诊断、代理或研发日志，不能只依赖 CEF CDP；本轮 `submitPaper` 正是由原生日志补获；
5. 使用新的测试活动或明确允许重新提交的活动，不盲目重放已经完成的业务写操作；
6. 对每次写操作保留“操作前详情 → 写请求/ACK → 教师回读 → 学生回读”四段证据；没有中间写证据时只标记为结果回读 `CALL`。

## 6. 依据

- [学生作业提交金丝雀](./CLASSIN-STUDENT-HOMEWORK-SUBMISSION-CANARY-2026-09-13.md)
- [学生提交变更记录](./CLASSIN-STUDENT-SUBMISSION-CHANGE-2026-09-15.md)
- [学生作业提交鉴权合同](./CLASSIN-STUDENT-SUBMIT-AUTH-CONTRACT-2026-09-15.md)
- [学生测验生命周期合同](./CLASSIN-STUDENT-EXAM-LIFECYCLE-CONTRACT-2026-09-15.md)
- [普通 IM 接入探测](./CLASSIN-IM-INTEGRATION-PROBE-2026-09-14.md)

原始样本位于被忽略的 `.runtime/private/lms-student-teacher-assessment-im-capture-2026-09-16/` 与 `.runtime/private/homework-submit-grade-dual-capture-2026-09-16/`，不进入 Git。第二轮脱敏核验摘要为后一路径下的 `verification-summary.redacted.json` 和 `native-exam-submit-summary.redacted.json`。原生 `.xlog` 含动态签名与设备字段，只保留在 ClassIn 本地日志目录，不复制进仓库运行目录。
