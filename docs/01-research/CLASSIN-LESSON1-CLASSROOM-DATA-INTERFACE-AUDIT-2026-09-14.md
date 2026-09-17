# 第一讲课堂数据接口核验

> 核验日期：2026-09-14（Asia/Shanghai）<br>
> 对象：测试环境课程 `591820`、活动 `54580408`、课堂 `1250723`<br>
> 范围：只读核验授课分析、AI 授课分析、课堂报告、课堂出勤、课堂笔记和高光时刻。本文不记录账号凭证、报告 key、学生联系方式或资源签名 URL。

## 结论

这六类数据都有可用的读取链路。对本次第一讲的实际调用结果如下：

| 数据类型 | 当前可读 | 第一讲已有数据 | 当前结果 |
| --- | --- | --- | --- |
| 授课分析 / 教学报告 | 是 | 是 | 课堂概览、应到/实到、课件数、板书、课堂参与和课堂成就等结构均可读；学生未进课堂，所以参与与成就为空 |
| AI 授课分析 | 是 | 是 | 已生成 1 份报告，正文约 5,700 字符，含课堂画像、五个教学维度、高光片段、学习进展和下一步建议 |
| 课堂报告 | 是 | 是 | 新版总体报告与旧版教师报告都可读，课堂实际时长为 2,713 秒 |
| 课堂出勤 | 是 | 是 | 应到 3 人、实到 0 人、迟到 0 人；三名学生上课时长均为 0 |
| 课堂笔记 | 是 | 是 | 当前教师账号有 4 条笔记：数轴概念、计算例题、有理数综合题、加减运算方法 |
| 高光时刻 | 是 | 是 | 新版总体报告与 LMS 课堂详情都返回 36 张精彩瞬间；另有 2 张有效板书图，LMS 原始字段含 3 个板书资源记录 |

第一讲的接口本身没有故障。出勤、答题正确率、参与率和课堂成就为空，是因为三名测试学生都没有进入这次在线课堂，也没有在课堂内答题或使用互动工具。

## 接口映射

### 1. 授课分析与课堂报告

标准报告先通过以下接口换取教师对应的课节报告入口：

- `POST /api/classin.api.php?action=getReportUrl`
- 输入：`SID`、`UID`、`clientClassId`、`identify`、`language`
- 第一讲实测：成功返回教师报告入口及不透明 `classUserKey`。

拿到 `classUserKey` 后，可以读取两套结构化报告：

- `POST /api/web.api.php?action=getClassTeachingReport`
  - Apifox：项目 `345136`，接口 `3473835`
  - 返回教师、课堂、出勤、互动、学生、答题正确率、精彩瞬间和板书。
- `POST /classroom/web/class/report/overallView`
  - Apifox：项目 `345171`，接口 `3478511`
  - 返回 `attendance`、`engageInfo`、`sceneOccurTime`、`achievements`、`classRecords` 和 `AIReportPath`。

更细的明细接口包括：

- `POST /classroom/web/class/report/getAttendRecords`：出勤明细；Apifox `3478531`。
- `POST /classroom/web/class/report/achievements`：课堂成就与得分率；Apifox `3493816`。
- `POST /classroom/web/class/report/engageList`：按答题、小黑板、互动消息、抢答四种类型读取课堂参与；Apifox `3493818`。

第一讲实测中，这些接口全部返回成功。`overallView` 的 `isShowOverallView=1`，但 `engageInfo`、`sceneOccurTime`、`achievements` 为空；四种课堂参与明细和课堂成就列表也为空，和学生未出勤的事实一致。

### 2. AI 授课分析

AI 授课分析由独立服务提供：

- `POST /course-ai-assistant/app/course/checkAiTeachingAnalysisRecord`
  - Apifox：项目 `345469`，接口 `3501069`
  - 第一讲实测：`hasRecord=true`。
- `POST /course-ai-assistant/app/file/aiTeachingAnalysis`
  - Apifox：项目 `345469`，接口 `3499550`
  - 第一讲实测：返回 1 份报告定位信息，并关联本节课的回放文件。
- `POST /course-ai-assistant/admin/ai-teaching-analysis/report`
  - Apifox：项目 `345469`，接口 `3499551`
  - 第一讲实测：成功返回报告正文、标题和课堂信息。

报告正文包含以下结构：

- `lesson_meta`
- `honor_result`
- `lesson_portrait`
- `teaching_performance`
- `highlight_moments`
- `student_progress`
- `next_step`

本节报告给出的总体评分为 90，教学维度包含知识讲解质量、课堂参与质量、学习目标达成、学生思维启发、教学设计与课堂结构。该结果表明 AI 报告已完成异步生成，而不是仍在排队。

另外还发现一条独立的 AIC 报告链路：`POST /classroom/web/class/aic-report/url`（Apifox `3499173`）。第一讲返回错误码 `121605044`，含义为“未请求生成 AIC 报告”。它和已经生成的“AI 授课分析”不是同一条报告管线，不能用这个错误否定现有 AI 授课分析结果。

### 3. 课堂出勤

出勤至少有三种读取视角：

- `POST /lms/app/activity/class/students`：活动维度学生状态；第一讲返回 3 名学生，`onClass=0`、`classLength=0`。
- `POST /api/web.api.php?action=getClassTeachingReport`：教师报告聚合出勤；第一讲为应到 3、实到 0、迟到 0。
- `POST /classroom/web/class/report/getAttendRecords`：逐学生出勤明细；第一讲三人均为未出勤，上课时长 0 秒。

Apifox 还登记了 `POST /class/classMemberTime`（项目 `345171`，接口 `3493836`），但通过当前统一测试网关调用 `/classroom/class/classMemberTime` 返回 HTTP 404。现阶段应使用上面三条已经实测成功的接口，不把 `classMemberTime` 作为 Harness 的依赖。

### 4. 课堂笔记

- `POST /api/classin.api.php?action=getClassNotes`
- Apifox：项目 `345136`，接口 `3478339`
- 必填：`SID`、`clientClassId`、`memberUid`、`perpage`
- 返回：`noteId`、`noteUrl`、`noteInfo`、`addTime`、`isMigrate`。

第一讲以教师 UID 查询成功，返回 4 条课堂笔记。该接口按 `memberUid` 读取某一成员的笔记；Apifox 中未发现一个请求直接汇总全班所有成员笔记的独立接口。如果需要全班笔记，只能先取得有权访问的成员列表，再逐成员读取，并遵守机构与隐私权限。

新版总体报告的 `classRecords.note` 也返回这 4 条笔记的描述，可用于课堂概览；原始笔记图片和时间仍应以 `getClassNotes` 为准。

### 5. 高光时刻与板书

高光数据有两条已验证的读取路径：

- `POST /lms/app/activity/class/get`：`moments` 返回 36 个精彩瞬间资源，`edbs` 返回 3 个板书资源记录。
- `POST /classroom/web/class/report/overallView`：`classRecords.classPic` 返回 36 张完整高光图片地址，`classRecords.blackboardImgs` 返回 2 张有效板书图片地址。

旧版 `getClassTeachingReport` 的 `classPic.picList` 在本节为空，但新版总体报告和 LMS 课堂详情均有 36 条高光，因此消费端应优先使用新版 `overallView` 或 LMS `moments`，并把旧版字段为空当作数据源差异处理。

## 权限与生成条件

教师 secret 能完成 LMS 签名接口和当前网关中的多数读取，但不能把所有报告接口概括为“只传 secret 即可”：

1. LMS 课堂详情、活动学生状态、课堂笔记、AI 报告检查与定位可使用当前测试教师签名调用。
2. 传统教学报告需要先用教师上下文和课堂 ID 换取课节专属 `classUserKey`，再访问报告接口。
3. AI 授课分析还依赖机构已开通能力、课堂启用 `teachingAnalysis`、回放音频可用以及异步任务完成。
4. 课堂出勤、正确率、参与率和学生进展只会反映真实课堂事件。仅把学生加入班级不会产生出勤和互动数据。
5. 课堂笔记按成员权限读取；教师能读自己的笔记，不代表默认拥有全班所有私人笔记的聚合权限。

## 对 Harness 的建议

建议把这些能力拆成四个只读 Adapter，而不是让页面直接拼接接口：

- `ClassroomReportReader`：总体报告、出勤、参与、成就。
- `AiTeachingAnalysisReader`：生成状态、报告定位、报告正文。
- `ClassroomNoteReader`：按成员读取笔记。
- `ClassroomMomentReader`：高光与板书，并处理新旧报告字段差异。

所有结果保留真值状态：`available`、`generating`、`not_requested`、`empty_because_no_events`、`permission_denied` 和 `failed`。这样 TeachBuddy 可以区分“接口失败”“报告还在生成”和“课堂没有学生行为”。

## 证据

- Apifox 项目与接口：`345136/3473835`、`345136/3478339`、`345171/3478511`、`345171/3478531`、`345171/3493816`、`345171/3493818`、`345171/3499173`、`345469/3501069`、`345469/3499550`、`345469/3499551`。
- ClassIn PC 本地日志：`/Users/eeo/Library/Application Support/ClassIn/log/ClassIn_20260914_193716_220995_9001.xlog`。日志记录了客户端实际请求、响应状态和课后异步报告生成过程。
- 私有实测回执：`.runtime/private/classin-target-import-2026-09-11/lesson1-classroom-data-audit-2026-09-14.json`。该文件不应提交版本库或公开分享。
- 回放链路前置核验：`docs/01-research/CLASSIN-LESSON1-REPLAY-DIAGNOSIS-2026-09-14.md`。
