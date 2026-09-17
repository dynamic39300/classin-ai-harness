---
title: ClassIn 在线课堂三客户端运行时采集
status: CALL_VERIFIED_PRIVATE_CAPTURE
date: 2026-09-16
scope: 测试教师与两个测试学生进入、开课、课中同步、下课及课后状态回读
---

# ClassIn 在线课堂三客户端运行时采集

## 1. 结论

本轮已完整观察课程 `591820` 的测试课节 `1250728` 从进入课堂、开课、课中同步到教师下课和三端退出。网页 CDP、ClassIn 原生课堂日志和课后 LMS 回读能够相互对上：

- 教师端和两个学生端进入同一课节；
- 客户端桥实时推送课堂在线人数，运行过程中由 `0 → 1 → 2 → 3`；
- 课节由 `lessonStatus/classStatus=1` 切换为上课中的 `2`；
- 教师端调用 `POST /classroom/app/class/finish` 成功，三端在同一秒退出；
- 课后 `unitActivityList` 与 `studentUnitActivityList` 都返回 `classStatus=3`、`processFlag=2`、`studentTotal=3`、`onClassTotal=2`，与两个测试学生实际进入课堂一致。

实时在线总数已经获得 `CALL` 证据，但它是课堂参与者总数，包含教师，不能直接当作“已到学生数”。成员级名单、迟到、早退、当前仍在教室和进出时间序列仍需 `getClassMember` 或受控数据库合同。

## 2. 采集拓扑

本轮同时监听三个独立 ClassIn 6.1 客户端，避免只监听一个调试端口造成漏采：

| 角色 | CDP 端口 | 运行时证据 |
| --- | --- | --- |
| 测试教师 | `127.0.0.1:7777` | 教师 LMS、原生课堂控制、结束课堂、课后教师活动列表 |
| 测试学生 A | `127.0.0.1:7779` | 学生 LMS、原生课堂同步、课后学生活动列表 |
| 测试学生 B | `127.0.0.1:7780` | 原生课堂同步与退出；退出后没有产生完整 LMS 列表刷新 |

CDP 监听从 15:32 左右持续到 15:53，分别记录 155、127、44 条脱敏页面网络事件。课堂核心控制与媒体流没有走 LMS 网页 XHR，而是走 ClassIn 原生课堂协议；因此同时保留了三个客户端的原生日志时间窗和起止网络连接快照。原始样本只保存在被忽略的 `.runtime/private/classroom-live-capture-2026-09-16/`，不进入 Git。

## 3. 已验证时间线

| 时间（Asia/Shanghai） | 观察结果 | 证据 |
| --- | --- | --- |
| 15:28:14 | 课节待开始，在线总数 `0/4` | LMS Bridge `lessonStatus=1`；`updateLessonMemberNumberNotice` |
| 15:28:40 | 学生 A 进入，在线总数 `1/4` | 原生 `EnterClassInform` 与 Bridge 推送 |
| 15:28:51 | 学生 B 进入，在线总数 `2/4` | 原生 `EnterClassInform` 与 Bridge 推送 |
| 15:29:07 | 教师进入，在线总数 `3/4` | `EnterClass/EnterClassReady` 成功；Bridge 推送 |
| 15:30:00 | 课节进入上课中 | `lessonStatus=2`；后续活动对象 `classStatus=2` |
| 15:51:24 | 教师结束课堂 | `POST /classroom/app/class/finish` HTTP 200、业务 `errno=1`；`EndClassClick` |
| 15:51:24–25 | 三端退出，在线数清零 | 三端 `QuitClass`；Bridge 推送 `0/0` |
| 15:51:32 起 | 学生与教师端回读课后状态 | `classStatus=3`、`processFlag=2`、`studentTotal=3`、`onClassTotal=2` |

`totalNum=4` 对应课程成员中的一名教师和三名学生；`onlineNum=3` 对应本轮实际进入的教师与两名学生。课后 `onClassTotal=2` 明确采用学生口径，这两个数字不能混为同一指标。

## 4. 可进入业务 Adapter 的接口

| 能力 | 运行时调用 | 本轮结果 | 接入判断 |
| --- | --- | --- | --- |
| 课堂聚合在线人数 | 客户端 Bridge `getBatchLessonMemberNumber` | 返回 `courseId/lessonId/onlineNum/totalNum` | `CALL`；适合只读聚合状态，但需要受支持的客户端桥 |
| 在线人数增量 | Bridge 事件 `updateLessonMemberNumberNotice` | 三端一致观察到进入与清零 | `CALL`；需要重连、去重和角色口径合同 |
| AI 字幕能力状态 | POST `/classroom/app/class/getAIFeatureStatus`，参数 `classId` | HTTP 200、业务成功；返回 `realTimeSubtitleTranslationCode` | `CALL`；只表示能力开关，不表示已获得 ASR 正文 |
| 教师结束课堂 | POST `/classroom/app/class/finish`，参数含 `CID/SID/UID/reason` | HTTP 200、业务成功，随后全端退出 | `CALL` 写接口；不纳入首轮只读 Adapter |
| 课后教师活动状态 | POST `/lms/app/course/unitActivityList` | 返回正式结束时间、课堂状态及 `onClassTotal/studentTotal` | `CALL/V2` 现有读链可复用 |
| 课后学生活动状态 | POST `/lms/app/course/studentUnitActivityList` | 学生端回读与教师端一致 | `CALL`；适合学生本人视图，不替代教师成员明细 |
| 课堂笔记 | `/api/classin.api.php?action=getClassNotes/addClassNote/updateClassNote` | 教师与学生客户端运行时均有读写调用 | 读取已 `CALL/V2`；写入不进入本轮接入范围 |
| 课堂题目目录 | `/api/classin.api.php?action=getSimpleQuestion/getQuestionList` | 三端进入课堂时调用成功 | `CALL`；需要再核对题目与活动归属后才能投影 |
| 备课包 | POST `/classroom/app/class/getPreparation`、`setPreparation` | 教师端观察到读取与保存 | `CALL` 写读混合；本轮只记录，不进入首轮范围 |

## 5. 原生课堂协议边界

客户端还运行了 `GetClassInfo`、`CheckClassAvailable`、`EnterClass`、`EnterClassReady`、`SetClassRoomFlags`、`GetMediaGateway`、`MoleFootpath`、`MolePalette`、`QuitClass` 等二进制控制命令，并通过 TCP/UDP/RTMP 传输音视频和课堂状态。这些证据可以解释页面行为和交叉验证时间线，但不是稳定的 Web API，不应直接实现为 TeachBuddy Adapter。

本轮还观察到：

- 教师课件与板书轨迹在两名学生端连续同步；
- 三端持续交换音频、摄像头和发言人状态；
- 客户端向 AI 媒体域上传了摄像头采样和近端/远端音频样本；
- 下课时教师端保存课堂板书图片并停止录制组件。

这些运行时流量只证明采集与上传发生，不能据此宣称 ASR、课堂纪要、知识点或 AI 授课分析正文已经生成。媒体地址、正文、学生标识和签名参数均未写入本报告。

## 6. 对实时考勤映射的升级

现在可以把实时考勤拆成三层：

1. **课节发现**：`classInfo/simpleInfo` 或监课 `getClassInfo`，返回目标 `classId`；
2. **课堂聚合在线状态**：客户端桥的 `getBatchLessonMemberNumber` 与 `updateLessonMemberNumberNotice`，本轮已 `CALL`；
3. **成员级实时考勤**：`getClassMember` 或 OceanBase 源表，仍待登录态正向样本与字段对账。

TeachBuddy 可以先用第二层回答“当前课堂有多少参与者在线”，但不能由此生成缺席学生名单、迟到/早退结论或每人的进入时间。B1“这节课的到课情况怎么样”仍为“部分”，直到第三层完成。

## 7. 安全与证据限制

ClassIn 原生日志会记录测试账号标识、设备标识、媒体地址，并可能记录包含登录参数的客户端深链。原始日志必须留在受限运行目录，不得提交、复制到产品文档或进入模型上下文；本轮发现的测试凭据应按已写入本机日志处理并轮换。

本轮没有由 Agent 触发任何业务写入。结束课堂、课堂笔记、板书、课件和其他交互均由用户在测试客户端中执行；Agent 只做被动监听、脱敏与事实整理。

## 8. 下一步

1. 为客户端桥聚合在线人数建立只读合同，明确 `onlineNum` 是否包含教师、总人数的成员范围、重连快照和事件去重；
2. 在同一课节完成 `getClassMember` 正向读取，验证成员在线、迟到、早退、终端、累计时长和 `timeList`；
3. 用课后 `onClassTotal/studentTotal`、`getAttendRecords` 和受控 OceanBase 查询对账；
4. 等待本课报告生成后，再核对回放、ASR、课堂笔记和 AI 分析的生成时延与内容边界。
