# INT-4 第一讲课堂报告与教师笔记重新核验

日期：2026-09-15，Asia/Shanghai。状态：`READ_ONLY_REPROBED`。

范围：已授权测试教师及目标班级 `591820`，课程分类 `3153610`，第一讲活动 `54580408`，课节 `1250723`。本次只读，没有发送消息、创建报告或修改业务对象；未查询学生私人笔记。研发上游为 [PRD](../04-specs/features/classin-test-integration/PRD.md) → [Feature Spec](../04-specs/features/classin-test-integration/FEATURE-SPEC.md) → [Tickets](../04-specs/features/classin-test-integration/TICKETS.md)，本文件提供 CI-008/009 的接口证据，不代表实现验收通过。

## 结论

第一讲的正式课堂报告、课后出勤、当前教师自己的四条笔记与 AI 分析记录可重新读取。正式报告应到 3 人、实到 0 人；实际课堂时长 2,713 秒；返回 36 张精彩瞬间、2 张板书和 4 条笔记引用。AI 报告确实存在，但其评分字段互相不一致，且生成内容含学生对话/进展描述，与实到 0 人不一致。AI 内容必须标记为生成分析，不能当作学生实际表现。

## 来源与验证方法

本次先使用已登录的 Apifox CLI 2.2.9 重新获取接口定义，再使用仓库 [ClassIn 调用规范](../../reference/classin-api/SKILL.md) 的签名构造方法，在固定测试网关执行 POST。凭据只从 `~/.classin.token` 读入进程内存；没有复制或输出凭据。大文档直接重定向至受限文件，避免 CLI 管道输出截断。

当前 Apifox 一手定义快照与原始实测响应均存于被 Git 忽略的 `.runtime/private/classin-integration-int0-2026-09-14/reports/`：目录权限 0700、文件权限 0600。公开文档不保留报告 key、报告定位 URL、学生信息或媒体签名 URL。

| 来源 | 项目 / 接口 | 本次证据文件 |
| --- | --- | --- |
| 获取学习/教学报告路径 | 345136 / 3473727 | `3473727.json`、`report-url-documented.json` |
| 教学报告首页 | 345171 / 3478511 | `3478511.json`、`overall-view.json` |
| 教学报告考勤明细 | 345171 / 3478531 | `3478531.json`、`attendance.json` |
| 获取课堂笔记列表 | 345136 / 3478339 | `3478339.json`、`teacher-notes.json` |
| 课节是否存在 AI 授课分析记录 | 345469 / 3501069 | `3501069.json`、`ai-has.json` |
| AI 分析报告定位 | 345469 / 3499550 | `3499550.json`、`ai-locator.json` |
| AI 分析报告正文 | 345469 / 3499551 | `3499551.json`、`ai-content.json` |

补充一手来源：ClassIn 测试客户端日志 `ClassIn_20260914_193716_220995_9001.xlog` 的实际报告请求，位于本机 `~/Library/Application Support/ClassIn/log/`。只提取路径和参数定义，没有公开整行日志。历史对照见 [第一讲课堂数据接口核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)；本次结论以新的读取为准。

## 1. 报告票据交换：文档与客户端存在差异

Apifox 3473727 登记的是 `POST /statistics/course/course.ajax.php?action=getReportUrl`，URL-encoded 表单必填 `classId`、`memberUid`、`identify`、`SID`，其中 `identify=3` 表示老师。用当前教师签名执行该文档路径，返回 `error_info.errno=101`、`未登录`。该路径列有 Cookie 请求头；本次只证明单独的教师签名不能完成该路径的登录条件，不能认定接口整体故障。

客户端日志中的另一条路径为 `POST /api/classin.api.php?action=getReportUrl`，表单参数为 `SID`、`UID`、`clientClassId`、`identify=3`、`language=zh-CN`。本次重新调用返回 `error_info.errno=1`、`data.url` 和 `data.newUrl`，耗时约 264 ms。此路径由客户端一手证据加新实测支持；本次 Apifox 检索没有找到该准确路径/action 对应定义，**不能标记为 Apifox 文档已完全覆盖**。

两个返回 URL 的不透明查询参数均名为 **`key`**：旧入口路径 `/s/newreport/teachreport`，新入口路径 `/client/lmsbleach/report/teacher`。本次两者的 `key` 值相同。后续 API 的输入字段才叫 **`classUserKey`**。本次使用 `data.url` 提取的 key 完成下游实测。

接入建议：服务端解析 `data.newUrl` 中的 key，缺失时回退 `data.url`；这是本地兼容策略，不是已经找到的供应商优先级约定。若两者都存在而 key 不一致，应拒绝或重新核验，不能静默混用。服务端只提取 key，**不访问返回的完整 URL**；不允许浏览器提供任意 key，不把 key 传给模型或持久化到公开日志。

## 2. 正式课堂报告与课后出勤

### 报告首页

`POST /classroom/web/class/report/overallView`，Apifox 路径为不带网关前缀的 `/web/class/report/overallView`。

- 请求：URL-encoded 表单 `classUserKey`（必填）、`UID`（本次为当前教师）；文档类型为 multipart/form-data，本次 URL-encoded 签名表单成功。
- 响应：`error_info.errno=1`，耗时约 358 ms。
- `data.classInfo.courseId/classId/schoolUid` 应与固定授权对象再次核对。
- 白名单标量：`header.className`、`header.classBtime`、`header.classEtime`、`header.duration`，以及 `attendance.actualNum/shouldNum/lateNum/earlyLeaveNum/playbackValidNum`、`isShowOverallView`。
- 时间字段 `classBtime/classEtime` 是 Unix 秒；`duration=2713` 是实际时长秒。不能用排课的 45 分钟覆盖实际时长。
- 当前出勤值依次为 `0/3/0/0/0`；`isShowOverallView=1`。
- `classRecords.blackboardImgs.length=2`、`classRecords.classPic.length=36`、`classRecords.note.length=4`。笔记引用元素有 `url/desc`。第一版可仅返回资源计数和脱敏描述，原始链接不进入模型。

`engageInfo`、`sceneOccurTime`、`achievements` 是空对象，不能把缺失字段转成完整的 0 分成绩或全体学生没有掌握。`AIReportPath` 是空字符串，但独立 AI 服务报告已存在；不能据此显示“AI 分析未生成”。`classInfo.teacherKey` 是另一个敏感票据字段，必须剔除。

### 出勤明细

`POST /classroom/web/class/report/getAttendRecords`，URL-encoded 表单 `classUserKey/UID`，返回 `error_info.errno=1`，耗时约 240 ms。

外壳 `data.totalNum=3`、`data.classInfo`、`data.list`。每条有 `uid`、`attendStatus`、`onClassTime`、`isLate`、`isEarly`、`playbackDuration`、`userStatus`，还含头像、昵称和成员专属 `classUserKey`。本次三人 `onClassTime=0`、`attendStatus=1`、`isLate=-1`、`isEarly=-1`。当前文档未给出完整状态枚举，第一版应优先消费正式聚合出勤与已确认的时长，不自行把 `-1` 当正常布尔值。返回的逐成员 key 不应外传。

这两条是课后报告，不能作为实时上课到场检测的证据。

## 3. 当前教师自己的课堂笔记

`POST /api/classin.api.php?action=getClassNotes`，URL-encoded 表单 `SID`、`clientClassId`、`memberUid`、`perpage`。文档类型为 multipart/form-data，本次 URL-encoded 表单成功。

`memberUid` 固定为当前教师，`perpage=100`。返回 `error_info.errno=1`，耗时约 99 ms，`data.totalNum=4`、`data.noteList.length=4`。元素为 `noteId/noteUrl/noteInfo/addTime/isMigrate`，`addTime` 为 Unix 秒。四条笔记主题是数轴概念、计算例题、有理数综合题、加减运算方法。

可以白名单读取 `noteInfo` 和创建时间、计数，并保留内部稳定 `noteId`。`noteUrl` 不进入模型。若 totalNum 超过本次列表长度，必须呈现不完整；当前定义只声明 perpage，没有经过本轮验证的续页协议。

本次只证明教师能读自己的笔记；没有查询三个孩子的私人笔记，不能声称已获全班私人笔记访问权限。

## 4. AI 分析定位与正文：需区别生成内容和事实

三个路径均以 `/course-ai-assistant` 为固定网关前缀，均使用 JSON 请求：

1. `/app/course/checkAiTeachingAnalysisRecord`：`{courseId,classId}`。本次 errno 1、`data.hasRecord=true`，约 101 ms。
2. `/app/file/aiTeachingAnalysis`：`{courseId,classId,theme:"light",language:"zh-CN",fileIds:[]}`。本次 errno 1、`data.list.length=1`，约 243 ms；元素包含 `requestFileId/reportUrl/reportFileIds`。
3. `/admin/ai-teaching-analysis/report`：`{classId,report,reqFileId}`。`report` 从上一步 reportUrl 的 **`report`** 查询参数提取，`reqFileId` 取 `requestFileId`，本次为空字符串。errno 1，约 716 ms，返回 `reportContent/reportScore/reportFile/isReportVod/reportTitle/isClientDefaultAgent/classInfo`。这个 `/admin` 命名的读取路径本次可由授权教师测试签名完成，不代表对其他身份或生产环境也具有权限。

第一版推荐只接入 `hasRecord` 状态及报告可用性；正文后续需要独立的“AI 生成分析”投影。报告定位 URL 不应直接抓取，也不应接受客户端任意 report 参数。

本次 `reportContent` 不是直接可显示的 Markdown：它是长 5,737 字符的 JSON 字符串，外层含 `analysis:null`、`isRawText:true`、`rawMarkdown`、`scores:[]`、`scoring`。`rawMarkdown` 又是一个 JSON 字符串，内部实际结构是：

- `lesson_meta`；
- `honor_result`；
- `lesson_portrait`；
- `teaching_performance`；
- `highlight_moments`；
- `student_progress`；
- `next_step`。

两个必须保留的冲突：

1. 顶层 `reportScore="0"`、包装层 `totalScore=0`，内层 `teaching_performance.overall_score=90`。不能选一个数字直接呈现为已验证课堂得分，也不能将解析失败默认成零分。
2. 内层含学生对话、`student_progress` 等生成描述，而正式出勤为 0 人。此类内容不是已验证学生作答/学习事实。模型上下文中需要与正式事件数据隔离；课堂高光中的 AI 文本分析与 36 张实际精彩瞬间图片也不是同一种数据。

`analysis:null` 或 `scores:[]` 在这个响应里不表示“报告仍在生成”，因为实际内容已在 rawMarkdown 中。`hasRecord=false` 也只证明查询时没有记录；仅凭这个布尔值不能判定尚未请求、正在排队或永久失败。

## 接入边界与剩余事项

- 统一网关实测成功外壳为 `error_info.errno=1`，不能把所有服务硬编码为 `code=0`；本轮未绕过网关实测原始服务的成功码。
- 先校验活动属于当前授权现场，再把 bizId 作为 clientClassId/classId；各报告 classInfo 再校验归属。
- 先接入正式报告白名单标量、教师自己的笔记描述、资源计数与 AI 记录状态。AI 正文需要处理异构包装、分数冲突和推断标签后再用。
- 报告路径文档差异、笔记完整分页、出勤状态完整枚举仍需供应商文档补齐；本次不扩大为全站接口支持。
- 本文不证明普通 IM 已接通，也不证明学生真正参加了课堂、观看了视频或完成了学习活动。
