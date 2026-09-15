---
title: 班级 Copilot 18 条问题：Apifox 与接口扫描资料核查
status: CONTRACTS_READ_NOT_BUSINESS_EXECUTED
date: 2026-09-15
---

# 班级 Copilot 18 条问题：Apifox 与接口扫描资料核查

## 1. 本文范围和证据级别

本文对应[问题清单 v0.3](../04-specs/features/workbuddy-im-collaboration/COPILOT-GENERAL-QUESTION-GUIDANCE-CONTENT-DRAFT.md)保留的 18 条问题。只核对可访问的官方接口合同、既有前端扫描索引和真实测试调用记录；**本研究执行的是 Apifox 文档查询，没有执行业务 API，没有取得新的学生业务记录，也不证明问答效果已经验证通过。** 同轮业务实测和 DW 样本由另外的核查记录承载。

2026-09-15 使用已登录 Apifox CLI 2.2.9 读取公司私有部署的主分支文档。只执行 `endpoint list/get`，未运行测试套件、写入远端或修改配置。重点读取项目 `lms`（345129）、`eeo_classroom_business`（345171）、`course_ai_assistant_service`（345469）；补查语言、作业、直播、实时字幕和 AI 板书相关目录。下面的项目/接口 ID 均为实际返回值，`released/developing/deprecated` 是文档标记，不是当前环境可用性判定。

调用路径保留文档原值，不擅自加网关前缀；实际测试服务常加 `/lms`、`/classroom`、`/course-ai-assistant`，路由对应需以已有传输合同与实测确认。`courseId` 在 LMS 链路通常是班级 ID，`categoryId` 才是班内课程；不能按单个文档里泛称的“课程 ID”混用。

本轮 Write Set 仅本文。既有代码和 V2 均未由本研究修改。文档不保存凭据、实际学生标识、报告签名地址和真实样本原文。

## 2. 回溯到的资料

| 来源 | 已核查内容 | 能证明什么 |
| --- | --- | --- |
| [V2 Apifox 首轮对应](../../../classin-ai-harness-v2/docs/01-research/APIFOX-CLASSIN-FIRST-MATCH-2026-09-11.md)及其 `apifox-classin-match-2026-09-11/matches.json` | 101 个可见项目、4,188 条 HTTP 目录的历史字面匹配；班级、成员、课程和作业合同 | 可定位正式合同；字面匹配不等于运行时同路由或已授权 |
| [V2 PC 扫描](../../../classin-ai-harness-v2/docs/01-research/CLASSIN-PC-API-SCAN-2026-09-11.md)及 `classin-pc-api-scan-2026-09-11/interface-index.json` | 350 条前端候选，包含方法证据、参数键、构建文件与一手脚本 URL | 前端曾引用该接口；不能代替输入输出合同 |
| [V2 技能目录](../../../classin-ai-harness-v2/docs/01-research/CLASSIN-SKILLS-CATALOG-2026-09-11.md)与[能力映射](../../../classin-ai-harness-v2/docs/01-research/CLASSIN-API-CAPABILITY-MAP-2026-09-11.md) | 173 项能力声明；视频总结和字幕链路 | 候选链路和参数线索；声明不等于业务成功 |
| [已有真实测试 API 证据](./COPILOT-GENERAL-QUESTIONS-API-EVIDENCE-2026-09-15.md) | 66 份 JSON、两份资料读取；同时明确测试构造数据与样本范围 | 有限样本确实返回过；不能升级成全班所有历史均完整 |
| 公司私有 Apifox 当前 `endpoint get` 返回 | 下文逐个列明项目/接口 ID、请求、响应和冲突 | 当前文档合同。可用 `apifox endpoint get <接口ID> --project <项目ID>` 只读复核 |

## 3. 18 条问题与合同对应

表中“缺口”是本文合同核查结论，最终可回答等级还需合并实际返回和 DW 证据。

| ID | 对应接口或资料链路 | 合同能支撑的内容 | 仍需验证/限定 |
| --- | --- | --- | --- |
| A1 | LMS `category/list`（345129/3496924）→ `course/unitActivityList`（3471555）+ `course/classActivityList`（3498963） | 课程、单元、活动、计划时间、发布状态和课节真实状态 | 枚举全部课程、分页；时间已过不等于实际讲完，更不等于学生已掌握 |
| A2 | `classActivityList`（3498963）→ `activity/class/get`（3471071） | 未来课堂、课题、开始结束时间、状态 | 未发布、删除/取消过滤；时区；按目标环境核对 `classStatus` |
| A3 | 班级成员 `345169/3493906 /app/getCourseMember` | 历史合同明确 `SID/clientCourseId/identity`，正式学生与旁听筛选 | 本轮未重读该详情，沿用有来源的 9/11 合同，交由业务实测核对当前人数及有效成员 |
| A4 | `unitActivityList`（3471555） | 同一单元中课堂、作业、测验、录播和资料归属 | 同单元并非同课次配套证明；未见通用“作业→具体课堂”直接关系合同 |
| B1 | `345171/3478511 /web/class/report/overallView` + `3478531 getAttendRecords` | 课后应到、实到、迟到、早退与考勤明细 | 这是报告链路；不能保证课中实时在线状态或时延 |
| B2 | 对窗口内课次逐一调用 `getAttendRecords`，核对人员稳定标识 | 各课次出勤记录与上课时长 | 迟到枚举、请假处理、跨课次稳定身份及完整窗口；昵称不能作为唯一合并键 |
| B3 | `activity/recordClass/students`（现有业务读取）+ `participationDetails`（3495210） | `learnState/learnRate/duration/videoEnd`、逐视频有效播放片段 | 详情合同只列 `activityId`，返回单学生对象；老师如何指定其他学生未明确，不能拿登录者记录冒充全班 |
| C1 | `activity/homework/get`（现有测试读取）及 `student/detail`（3499108） | 作业正文、附件、期限；后者补充具体提交和批阅原文 | 附件引用还需读取/解析；不能用学生作答反推原题缺失部分 |
| C2 | `homework/students`（3471069）+ `student/detail`（3499108），用 `unitActivityList` 作目录 | 逐人 `stStatus/isDraft/refTime/thTime/isEmend` 等 | `correctTotal` 同一合同自相矛盾，需服务解释；草稿不算提交，评分/批阅中不等于已批阅 |
| C5 | `report/activity/examInfo`（3492734）+ 题目/答案结果链路；作业 `homeworkInfo`（3492738）及详情 | 测验逐题 `judgeResult` 与题序；作业有正误总数、批阅正文 | 测验题序要关联原题且需非空真实作答；**普通作业正误总数不够统计“第几题错得多”**，未找到已核验的统一逐题作业判分合同 |
| D1 | `report/unit/summaryInfo`（3492748）、`report/course/activityPerf`（3492916）及分类型活动明细 | 指定学生、指定单元/课程的综合成绩与参与事实 | 这些不是任意日期的个人周报，不能把全课程累计值写成近 7 天；仍需实际返回与明细一致性 |
| D2 | `report/unit/stuActivityList`（3492754）或 `course/studentUnitActivityList`（3471556） | 指定学生按活动类型读取状态、开始结束时间、补交/观看规则 | 完整课程和单元分页、有效分配、类型完成规则；多接口空/非空不一致需记录 |
| D5 | D1 报告链路 + AI 基于已读报告改写 | 有依据的个人情况可转写为家长话术 | 内容生成能力与数据接口分开验证；不推导家长接收关系或实际送达 |
| E1 | `class/get`（3471071）、`overallView`、`aiTeachingAnalysis`（345469/3499550）→ `/admin/ai-teaching-analysis/report`（3499551） | 板书、回放存在性/资源地址，以及 AI 报告定位和 Markdown 正文 | 报告可能回退到同课次其他视频；核对 `requestFileId/reportFileIds/isReportVod`；内容 URL 不等于已读正文 |
| E2 | `richVideoSummary`（345469/3499126、3499128）字幕链路；AI 报告正文为另一来源 | 文档明确章节/字幕开关，已有技能目录给出返回资源再读正文的链路 | 字幕响应 Schema 严重不足，内部 ASR 合同也不完整；必须取得具体逐字稿再生成课堂内容回顾 |
| E3 | 学习资料详情、文件引用、现有两份 PDF 读取 | 可解析原文可用于提炼已有方法 | 不能承诺所有文档、图片、损坏文件或签名过期资源均可读 |
| E4 | 课程/单元活动目录 + 学生/活动矩阵 `score/getActivityScoreList`（3471063）；D1 的报告可作为单人累计补充 | 班内指定活动及学生的状态/成绩矩阵有正式合同 | **尚未确认任意日期的全班周报统一接口**；可按窗口和业务口径聚合事实，但需完整范围和可核对原始数据，不能偷换成单人课程报告 |
| E5 | 已确认对话内容与现有消息草稿/审阅能力 | 这是已有事实的二次加工，不必为每次改写重新查一套数据库 | 验证对象承接、事实不丢失、草稿与发送分离；本轮文档查询不等于完成交互验收 |

## 4. 关键合同展开

### 4.1 课程与活动目录

`345129/3471555 POST /app/course/unitActivityList` 为 form-urlencoded。必填 `courseId/SID/categoryId`；`unitIds` 标记可选但说明写“必须指定”，还包括 `publishFlags/processFlags/offset/limit/sort` 等。返回 `list[].unitId/activities[]`，活动含 `activityId/bizId/type/name/startTime/endTime/publishFlag/processFlag/classStatus/status`。`classStatus` 文档为 1 未开始、2 进行中、3 已结束、4 已删除。

`345129/3498963 POST /app/course/classActivityList` 为 JSON。必填 `SID/courseId/categoryId`；可选 `processFlag`，过滤时可用 `limit/lastActivityId`。返回 ongoing/notStarted/end 分组、`total/list` 及课节真实状态、报告/板书状态。仅有目录状态不能证明讲授内容完成程度。

### 4.2 考勤与报告

`345171/3478511 overallView` 与 `3478531 getAttendRecords` 为 multipart/form-data。核心输入 `classUserKey` 是“课节 ID_用户 ID 加密串”，不能自己拼明文替代；`UID` 为当前登录用户（考勤明细标必填）。前者返回 `attendance.shouldNum/actualNum/lateNum/earlyLeaveNum`、`header.classBtime/classEtime/duration`、`classRecords.blackboardImgs/classPic/note`。后者返回 `totalNum/classInfo/list`，明细含 `attendStatus/onClassTime/userStatus/classUserKey`，但当前 Schema 没有完整的字段枚举或明文学生 UID。

跨课次统计应优先通过有来源的稳定身份映射。加密 key 的变体、昵称相同和请假等情形必须实测，不能仅把不同课节列表按昵称相加。报告中的考勤不升级为实时在线名单。

### 4.3 录播和资料

`345129/3495210 POST /app/activity/recordClass/participationDetails` form-urlencoded 只明确必填 `activityId`。返回 `studentUid/duration/checkTime/learnState/learnRate/videoEnd`；`videoRate[]` 包括 `fileId/playBarSec/playValidNum/playPart`。未上报过的视频无对应记录；`videoEnd` 是观看完成文件 ID 集合。`playBarSec` 是最新进度条位置，不能独立当有效完播。

`345171/3499156 POST /class/batchClassVideoProcess` JSON 必填 `uid/classIds`，课次上限 100；返回课堂回放 `learnProcess`（有效观看进度，百分比两位小数）、`videoDuration/learnCount/learnTime`。**这是课堂回放，不是 LMS 录播课活动**，不能混算 B3 的学习完成情况。

补充核查的 B4 虽未进入首批，已有明确资料：`345129/3471026 POST /app/activity/learningMaterials/students` 必填 `activityId/courseId`，返回 `data[].checkTime`，描述为“首次查看时间，未查看则为 0”。这足以候选回答“打开过吗”，不是“认真看完/理解了吗”。

### 4.4 作业提交与逐题结果

`345129/3471069 homework/students` 必填 `activityId/courseId`，可选 `identity=1 老师/2 学生`是视图参数，不能代替真实授权。返回 `stStatus=0 未提交/1 已提交/2 已批阅`、`isDraft/refTime/thTime/isEmend/isScore/readover`。当前合同把 `readover` 描述为“批阅中”，不是已批阅。`aiReviewStatus=3 批阅成功`与正式学生作业状态也需要分别理解。

`345129/3499108 homework/student/detail` 表单必填 `activityId/studentUid/courseId`，但其附带 JSON Schema 漏了 `studentUid`，应按实际 Content-Type 核对。返回提交原文和文件、教师修改内容和文件、`correct/wrong`、历史 `log`。日志 `uid` 可是动作执行人，不是统一学生标识。

`345129/3492734 POST /app/report/activity/examInfo` 必填 `activityId/studentUid`，返回可为 null；`topics[].judgeResult` 为 0 待批阅、1 正确、2 错误、3 半对、4 未答；另有 `order/currentNum/wrongNum/reviewNum/halfNum/noAnswer`。这是逐题判分候选，但仍要用实际题序匹配完整题面。

`345129/3492738 homeworkInfo` 同样按活动+学生读取，只有 `correct/wrong` 总数及正文/批阅；其 `content` 明确“未批阅取学生提交，否则取教师批阅内容”。另外重读新包装路径 `3497958 getLmsStudentsHomeworkDetail`、`3497951 lmsGetStudentsAnalysisDetail`，仍是学生整份作业维度和正误数。不能因此宣称普通上传作业有统一的题目 ID—逐题判分矩阵。

### 4.5 个人学情、任务和全班聚合

`345129/3492748 POST /app/report/unit/summaryInfo` form-urlencoded 必填 `studentUid/unitIds/courseId/isCourseReport`，可选 `categoryId`。`isCourseReport=0 否/1 是`控制课程报告，**不是全班开关**；无 `studentUid=0` 表示全班的说明。`unitIds` 描述为数组，示例编码不严谨；同族 `activityPerf` 明确 JSON 数组字符串，实际编码应通过当前传输层实测。

返回 `summaryScore.scoreValue/scoreLevel/avgRate/displayType/totalScoreType`、`summaryData.activityAttendCount/activityTotalCount/classAttendance/classTotal`等。`avgRate` 描述是“本学生平均得分率”，不能自动改名为答题正确率；报告分数制、百分制、等第制分别处理。

`345129/3492916 POST /app/report/course/activityPerf` 必填 `studentUid/unitIds/courseId`，可选 `categoryId/isCourseReport/activityType`，返回各活动类型的 total/joinTotal 和观看、作业按时完成等指标。两者均未列 `startDate/endDate`，不能直接获得任意“本周”范围。

`345129/3492754 POST /app/report/unit/stuActivityList` 必填 `courseId/studentUid/unitId/page`，`page`默认 1，`pageSize`可选默认 20，`activityType` 可选。`studentUid`明确是教师所选学生，返回 `list/total`；每条有活动时间和分类型 status，包括课堂 `onClass`、作业/测验状态、录播 `learnState`、资料 `isWatched`、打卡累计天数。无另一个课程/日期开关，空记录不能靠猜参数解释。

另一个学生视图候选 `345129/3471556 /app/course/studentUnitActivityList`，表单必填 `courseId/SID/categoryId/unitIds[0]/sort`，可选 **studentId**（此处不是 studentUid），文档明确教师指定学生查看视图。`status`类型语义与其他接口可能不同，必须保留来源后转换。

全班矩阵候选 `345129/3471063 /app/score/getActivityScoreList` 必填 `courseId/studentUids/page/pageSize/stuPage/stuPageSize/pageType`，可选 `categoryId/activityIds/unitIds/bizTypes/processFlags`；`pageType=0 学生纵向分页/1 活动横向分页`。返回 `headerData`活动分母和完成数，以及 `studentData[].activity[]`的类型状态、评分方式、展示分数和录播进度。读取一页不代表完整班级矩阵，展示分数不能覆盖未评分和不评分状态。

### 4.6 AI 授课分析和逐字稿

`345469/3499550 POST /app/file/aiTeachingAnalysis` JSON 必填 `courseId/classId/theme/fileIds`，`fileIds`无指定时为空；返回 `list[].reportUrl/requestFileId/reportFileIds`。文档说明请求视频无对应报告时可能回退到课堂已有首份报告。`345469/3499551 POST /admin/ai-teaching-analysis/report` 需要 `classId/report(jobId)`，可选 `reqFileId`，返回 **reportContent（Markdown）**、`reportFile`、`reportTitle/reportScore/classInfo/isReportVod`。这一链路已足以定位正文合同，但授课分析并非原始逐字稿。

`345469/3499126 POST /app/file/richVideoSummary` JSON 必填 `courseId/fileId/bizId/bizType/classId`，可选 `chapter/subtitle`（0/1）、`language/isRetry`。`3499128 /app/share/richVideoSummary` 面向回放，必填 `classKey/fileId`，可选 `chapter/subtitle`。技能目录明确 `subtitle=1`取转写，默认资源地址，显式读取才有正文；然而当前 Apifox 成功 Schema 前者只有 `agentId/language`、后者只有 `language`，没有完整字幕结构。须用实际响应补合同，不能把字段声明当已取得转写。

内部 ASR 候选 `345469/3499234 /api/query/info/video/origin`（文档为内部测试域名）要求 `uniqueKey`及独立 `source/token` header；`3499148 /api/query/info/parts` 请求 Schema 为空，两者响应又复制了 `summay/list[].summary`式总结结构。本轮未执行这些内部接口，也未推导凭据或构造 uniqueKey。实时字幕项目 `345577`只发现链路/连接状态查询，不能替代历史转写正文。

视频总结错误码 `111001023 生成中/111001024 失败/111001025 机构未开通`；报告还有无记录、空音频、已删除等明确失败。不得把“尝试读取”变成设置 `isRetry`、重新生成或开通服务。

## 5. 需要业务接口负责人补充的精确问题

1. **C2 批阅计数**：`unitActivityList`正文称 `correctTotal` 为“批阅人数”，同一响应 Schema 称“待批阅数量”。请确认当前服务语义及汇总刷新时机；不能先认定测试数据损坏。
2. **C5 普通作业逐题结果**：是否存在覆盖当前上传作业的稳定题号/题目 ID—学生答案—最终判分接口？若只有整份批注图或正误总数，应收窄到有结构化逐题结果的测验/答题卡。
3. **D1/E4 周期和全班报告**：是否已有教师授权范围内、明确日期窗口的个人/班级学情接口？若没有，确认从活动时间和有效学生分配聚合的口径，不把单学生全课程累计报告直接当班级周报。
4. **E2 逐字稿**：提供当前对外支持的字幕正文合同、资源定位与鉴权、完整性/语言/时间段字段。已有 `richVideoSummary`/内部 ASR文档仍不足；无需用户提供学生内容或明文 Token。
5. **B1/B2 考勤**：明确实时与课后接口时效、迟到/缺席/请假枚举、跨课次稳定学生映射；存在课后记录不能保证实时未进课堂提示。
6. **A4 配套关系**：明确是否有课次与作业/资料的业务关联键；若仅同单元，应把问法收窄为“这个单元有哪些配套活动”。

这些是资料和合同中的具体缺口，不代表业务系统必然没有能力。按实际测试返回先填可验证部分，再集中向用户或接口负责人索取仍缺的信息。

## 6. 本轮发现的版本与解释风险

- `345129/3492770 /app/report/course/getSummaryList`当前为 **deprecated**；旧能力目录把它当候选，不宜据旧目录直接选择为首批接入路径。
- `unitActivityList`旧 Schema 曾把 type 11写为 AI作文，而当前教学活动数据字典的 11为英语背诵；报告/详情中的状态枚举也不同。接口版本边界不可用一个全局枚举抹平。
- Apifox可读、接口文档released、业务errno成功、返回非空、正文可读、答案正确，是不同验证层。本文完成前两类资料核查，其他由同轮实测记录逐项确认。
- `getStudentReportUrl`（345129/3493866）需要来源合法的 `shareParam`，返回 URL 可能为空；有 URL不代表报告完整或家长有接收权限。本轮没有生成分享或发送动作。
