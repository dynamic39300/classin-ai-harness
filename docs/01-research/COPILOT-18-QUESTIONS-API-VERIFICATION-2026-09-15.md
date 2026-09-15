---
title: 18 条班级通用问题的业务 API 逐条核验
status: READ_ONLY_API_VERIFIED_WITH_COVERAGE_GAPS
date: 2026-09-15
---

# 18 条班级通用问题的业务 API 逐条核验

## 1. 结论与本次证据边界

本次对[通用提问清单 v0.3](../04-specs/features/workbuddy-im-collaboration/COPILOT-GENERAL-QUESTION-GUIDANCE-CONTENT-DRAFT.md)保留的 18 条问题逐一核对接口、请求范围和实际返回。北京时间 2026-09-15 16:08 起，复用已授权教师凭据向 ClassIn **测试网关**执行 209 次业务 JSON 只读请求，均收到业务成功；另读取并解析 14 份 PDF 资源。没有启动 V2、修改服务配置、创建报告、提交作业或发送消息。

**这些是最新的真实接口返回，但样本属于测试环境，包含联调构造内容，不是自然发生的生产教学样本。** DW 自然业务样本是另一条独立证据链，不与这里拼成同一班级。接口返回成功也不等于问题已经通过 AI 回答验收。

此次新增的重要证据：

- 从此前抽查 10 项详情扩展到班内 **2/2 门课程目录、16 个单元、54/54 项活动详情和名单**，涵盖 15 课堂、14 作业、7 测验、4 录播、14 资料；第二门课程经追加只读核验为 1 个空单元、0 项活动。目录归属、活动数量和名单数量均已校验。
- 已实际取得 **3 名测试学生的个人课程/单元学情汇总结构**，不再仅停留在“有学生状态、未找到报告”。但它按课程或单元查询，不是任意日期的个人报告。
- 已取得课后逐人考勤，以及 **AI 授课分析正文**。AI 正文是生成内容，且存在与正式出勤不一致的描述，不能用它证明学生实际表现。
- 14 份资料 PDF 文字层均可读；录播和测验仍全部没有实际参与，不能证明非零进度、已评分错题等正向样本已经验收。
- 三处必须保留的差异：作业 `correctTotal` 文档语义冲突；个人报告 **64 项活动**与目录 **54 项活动**不同；学生单元活动报告接口成功却为空。

本文仅负责业务 API 证据；DW 表字段和生产样本由本轮配套 DW 核验记录负责。本文没有把测试接口迁入原版运行时，也没有调用大模型执行 18 条问题的端到端回答验证。

## 2. 来源与可复核方式

### 2.1 代码和合同来源

| 来源 | 用途 |
| --- | --- |
| [V2 只读 Transport](../../../classin-ai-harness-v2/server/classin-test-transport.ts) | 测试网关、既有教师签名、读取白名单、业务成功校验；没有把凭据写入报告 |
| [V2 Test Service](../../../classin-ai-harness-v2/server/classin-test-service.ts) | 班级/课程/单元/活动归属、分页完整性、五类活动详情与学生状态映射 |
| [课堂报告读取](../../../classin-ai-harness-v2/server/classin-test-reports.ts) | 报告票据交换、整体出勤、本人笔记和 AI 存在性 |
| [逐题作答读取](../../../classin-ai-harness-v2/server/classin-test-exam-answers.ts) | 试卷—学生—题目集合核验，未参与占位与真实作答区分 |
| [课堂回放读取](../../../classin-ai-harness-v2/server/classin-test-replay.ts) | 回放文件、时长、录制时间和教师播放授权；不提供逐字稿 |
| [资源读取](../../../classin-ai-harness-v2/server/classin-test-resources.ts)、[PDF 文字解析](../../../classin-ai-harness-v2/server/classin-pdf-text.ts) | 校验活动附件、下载权限和受限资源来源，解析实际 PDF 文字层 |
| [同日课堂报告复核](../../../classin-ai-harness-v2/docs/01-research/CLASSIN-INT4-REPORT-REPROBE-2026-09-15.md)及其 Apifox 原始合同 | 追加考勤明细、AI 报告定位与正文的准确读取路径 |
| 本轮 Apifox 一手定义：项目 345129 / 3492748、3492754、3492734 | 个人课程/单元汇总、学生单元活动、测验题目判分报告；与档案核查助手交叉核对 |

### 2.2 本机原始证据

全部新增原始返回存于被 Git 忽略的 `.runtime/private/questions-18-api-2026-09-15/`，目录权限 0700，文件权限 0600。文档只保留结构、计数和问题结论，不公开成员身份、报告票据或资源地址。

- `requests.json` + `raw-*.json`：176 次既有读取操作及其实际业务 data。
- `scene.json`、`detail-*.json`、`summaries.json`：现场与 54 份归属校验后的详情；PDF 提取正文在详情资源字段中。
- `extra-requests.json` + `extra-*.json`：13 次追加读取的完整业务外壳，包括个人报告、考勤和 AI 正文。
- `followup-requests.json`：17 次补查，验证所有非空单元的学生活动报告及单单元汇总过滤。
- `second-requests.json`、`second-summary.json`：16:25 追加 3 次同一班级读取，第二门课程返回 1 单元、0 活动，活动分页完整；两门课程共 16 单元、54 活动。
- `verify.mjs`、`extra.mjs`、`followup.mjs`、`second-course.mjs`：本轮受限只读研究脚本。复用凭据只在进程内读取，未复制密钥；脚本不构成产品接入实现。

## 3. 实际范围与结果

| 对象 | 本次实际结果 | 不应外推的结论 |
| --- | --- | --- |
| 教师班级 | 当前/正常/教师及班主任条件下返回 1 班 | 不等于全部历史班级 |
| 班内课程 | 目录返回 2 项，两门均已展开；第二门 1 单元、0 活动 | 当前可读取目录已完整，不外推被隐藏/历史删除等其他口径 |
| 学生 | 3 名，返回 `identity=1` | 未覆盖旁听、退班、后加入等正反例 |
| 单元/活动 | 两门共16单元，其中2空；54项活动详情均成功 | 同单元不证明同课节配套；发布与时间状态需独立判断 |
| 作业 | 14 份、42 个学生—活动关系；2 份提交均标待批，其余 40 未提交 | 40 包含未来作业，不可全部称为逾期或当前待办；汇总批阅差异未消解 |
| 测验 | 7 份，每份 10 题；21 个学生—测验关系；210 个逐题位置均“未参与” | 0 分/空答案占位不能当答错；本样本不能生成真实错题排行 |
| 录播 | 4 项、12 个学生—活动关系，均 `learnState=0,learnRate=0,duration=0` | 尚未验证学习中、完播及有效时长的非零返回 |
| 资料 | 14 份 PDF 均提取到 1 页正文；42 个学生—资料关系 `checkTime=0` | 文字层可读不等于图片/扫描件 OCR 已通过；首次查看不等于理解或看完 |
| 课堂 | 15 课堂只有 1 个已结束，其余为未来课次 | 没有多节已结束课堂样本，不能验证“最近几节”的累计结果 |
| 课后报告 | 已结束课实际时长 2713 秒，应到 3、实到 0、迟到 0；36 张课堂记录图、2 张板书、4 条本人笔记 | 课后报告不能作实时到场检测；图片数量不是图片内容已理解 |
| 课堂回放 | 已结束课返回 2 个录制文件，其余 14 课返回空列表 | 已有回放元数据不等于本轮播放或逐字稿读取成功 |
| 个人学情汇总 | 3 名学生都取得 `summaryScore/summaryData/unitData`；参与活动计数分别为 0/1/1，活动分母都为 64，课堂总数 15；14 个非空单元汇总 | 与活动目录 54 项有差异；不能直接据 64 或 54 混算完成率；不是一周统计 |

## 4. 接口、输入与内容映射

下列均为 POST；`courseId` 在这些 LMS 路径中是班级标识，`categoryId` 才是班内课程。参数均来自已授权对象，不接受任意跨班学生 ID。

| 编号 | 实际操作 | 本次输入范围 | 已读到的关键返回 |
| --- | --- | --- | --- |
| API-01 | `/course/app/member/course_list`（JSON） | `states:[0],identitys:[3,192],processing:1,page,pageSize:50`，按 total 校验分页 | `total/list`，班级 `courseId/courseName/schoolUid/identity` |
| API-02 | `/lms/app/category/list`；`/course/app/getCourseMember`（后者 JSON） | 班级；成员请求 `SID,clientCourseId,identity:[1,2]` | 课程 `categoryId/name`；成员 `memberUid/identity/courseNickname/userName` |
| API-03 | `/lms/app/course/unitList`；`/lms/app/course/unitActivityList`（表单） | 班级+各课程，`unitIds` JSON 数组文本，`offset:0,limit:100,sort:asc`；各组 pageTotal 与数量校验 | `unitId/categoryId/activityCount`；活动 `activityId/bizId/type/name/startTime/endTime/publishFlag/processFlag/classStatus/status` |
| API-04 | `/lms/app/activity/{class,homework,exam,recordClass,learningMaterials}/{get,students}` | `activityId,courseId`；exam/get 为 JSON，其余表单 | 活动归属、正文、截止、评分与附件；逐人 `studentUid` 和各类型状态。不能用同一 `isDone` 解释所有类型 |
| API-05 | `/lms/app/activity/homework/student/detail` | 当前正式提交、作业业务 ID 与学生；具体合同由 submission 读取模块校验 | 两份提交正文、附件引用和老师反馈相关字段；未进行答题图识别 |
| API-06 | `/question-bank-business-service/topic/batchGet`；`/api/exam.api.php?action=getAnswerMarkResult` | 从试卷取 `topicQuery` 题 ID+题源；`UID,examId,studentIds,pageRole:1` | 题干/选项/答案/解析；`students[].markingInfo[]` 中 `topicId/topicSource/topicType/isAnswer/answer/judgeResult/score` |
| API-07 | `/api/classin.api.php?action=getReportUrl` → `/classroom/web/class/report/overallView`、`getAttendRecords` | 当前教师、机构、课堂；服务端交换 `classUserKey`，校验返回 classInfo 归属 | 总体应到/实到/迟到/时长、资源引用；明细 `uid/attendStatus/onClassTime/isLate/isEarly/playbackDuration/userStatus` |
| API-08 | `/api/classin.api.php?action=getLessonRecordInfo`；`getClassNotes` | 已授权课堂；笔记 `memberUid` 仅本人、`perpage:100` | 回放 `lessonData.fileList`、文件时长和播放许可；本人笔记 `noteInfo/addTime`，按 totalNum 校验完整性 |
| API-09 | `/lms/app/file/getFiles` → `/lms/app/file/getDownInfo` → 受限资源 GET | 活动附件的 lmsFileId/fileId，先核验归属与下载权限 | 文件元数据、下载许可；14 份 PDF 实际 bytes 和文字层；不是只读取 URL |
| API-10 | `/course-ai-assistant/app/course/checkAiTeachingAnalysisRecord` → `/app/file/aiTeachingAnalysis` → `/admin/ai-teaching-analysis/report`（后两者同前缀） | JSON `courseId,classId,theme:light,language:zh-CN,fileIds:[]`；正文 `classId,report,reqFileId` 取自服务端定位结果 | `hasRecord`、定位列表、`reportContent/reportScore/reportFile/classInfo`；正文读取已成功，不能等同于官方学习事实 |
| API-11 | `/lms/app/report/unit/summaryInfo`（表单，Apifox 3492748） | 当前学生 `studentUid`、`unitIds` JSON 数组文本、班级、课程、`isCourseReport:1`；另用单单元+0核验过滤 | `summaryScore`；`summaryData.activityAttendCount/activityTotalCount/classAttendance/classTotal`；`unitData.list`；没有任意日期请求参数 |
| API-12 | `/lms/app/report/unit/stuActivityList`（表单，3492754） | 当前学生、班级、单元，`page:1,pageSize:100` | 本次 `list:[],total:0`。已查学生甲全部 14 非空单元及首非空单元另外两生，均为空；不能用这个空结果否定 API-04 的有效活动分配 |
| API-13 | `/lms/app/report/activity/examInfo`（表单，3492734） | 第一份测验 activityId，分别查 3 名学生 studentUid | 每人 `currentNum/wrongNum/reviewNum/halfNum=0,noAnswer=10`，`topics` 10 项，含 `judgeResult/order`；与未参与事实一致 |

API-05 的完整字段解释参见 [submission 模块](../../../classin-ai-harness-v2/server/classin-test-submissions.ts)。API-11/12/13 是本轮研究追加调用，不在当前产品 Transport 白名单内；没有为核查而修改该白名单。

## 5. 18 条问题逐条结论

“有回答基础”仅指所列范围的数据确实读到；全部条目仍需后续模型回答、引用核验及两处 IM 入口验收。不能把下表读成 18 条已全面上线。

| ID | 最终问题 | 对应接口 | 本次实际佐证 | 本次结论与仍缺什么 |
| --- | --- | --- | --- | --- |
| A1 | 我们班各门课学到哪了，后面还有什么安排？ | API-01/02/03/04 | 2/2门课程均展开，一门54活动，一门0活动；时间/过程/发布字段可读 | **当前目录有回答基础**：列有活动课程已结束和未来安排，对另一门明确暂无活动安排；processFlag 是活动进度，不证明知识已掌握，也不将空目录说成已经学完 |
| A2 | 接下来要上什么课，什么时候上？ | API-03/04 | 15 课堂详情、发布/取消标志、开始和结束秒时间戳 | **当前班级目录有回答基础**：两门课程已展开，15课堂集中于其中一门；按当前时间过滤已发布未取消课次，转换上海时区 |
| A3 | 我们班有多少学生？ | API-02 | 成员 3 名，均 identity=1，无重复 | **当前名单有回答基础**：本次正式学生数可答；旁听/退班/新加入样本未验证，不承诺所有身份口径无歧义 |
| A4 | 这节课或这个单元有哪些配套活动和资料？ | API-03/04/09 | 54 活动均有 unitId/categoryId，14 资料正文可读 | **按单元有回答基础**；若指具体课节，不能仅凭同单元断言其所有作业均属于该课节，仍需显式课节关联或清晰标题依据 |
| B1 | 这节课的到课情况怎么样？ | API-04/07 | 课后应到3实到0迟到0；逐人明细也为上课0秒 | **课后可答，实时未验证**。明细 isLate=-1 不映射为“没迟到”；不能以数仓或课后刷新替代实时 |
| B2 | 最近几节课，哪些同学有迟到或缺席记录？ | API-03/04/07 | 所有课堂分配可读；仅1课已结束且有正式课后明细 | **部分可答**：当前可说明这1课的记录；缺多节已结束课堂的连续样本、请假与完整迟到状态口径 |
| B3 | 这节录播大家学到哪了？ | API-04 recordClass | 四录播12人次全未开始，进度/时长0 | **“尚未开始”有回答基础**；实际学习中、完播、有效观看统计须取得非零样本核验，不能提前承诺完成判定准确 |
| C1 | 这份作业要做什么，什么时候截止？ | API-03/04/05/09 | 14作业正文、附件引用、截止时间；2份学生提交可读 | **文字任务和截止有回答基础**；图片题面未识别，纯图任务不能仅凭附件存在概括内容；没截止时应如实说明 |
| C2 | 这份作业还有谁没交，交上来的批完了吗？ | API-03/04/05 | 首作业2交1未交；两份明细均待批。目录correctTotal=2 | **提交可答，批阅需保留口径差异**：合同correctTotal“已批/待批”解释冲突；不强行宣布全批或汇总错误 |
| C5 | 最近作业和测验，哪些题做错的人比较多？ | API-06/13 | 7测验题面完整、210逐题位置全未参与；第一测验报告noAnswer=10 | **当前样本只能回答暂无实际错题依据**。缺真实已作答已判分样本；普通作业的自由文本/图片提交不自然具备逐题结构，需逐题批阅来源 |
| D1 | 帮我看看这位同学最近的学习情况 | API-04/07/11/12/13 | 三人个人课程汇总可读，另有逐活动事实 | **课程/单元报告有输入基础，“最近”仍需适用时间窗**。汇总64与目录54、报告活动列表空均待核，不能输出无口径的总体完成率 |
| D2 | 这位同学还有哪些学习任务没完成？ | API-03/04/11/12 | 两门课程共54活动名单/状态全读；未来、已结束、当前任务可区分 | **当前班级两门课程可据逐活动事实列已知任务**；第二门当前无活动。资料查看≠完成，课堂、录播各自规则；不采用空的学生单元报告当“全完成” |
| D5 | 根据这位同学的学情报告，帮我写一段给家长的话 | API-11及已核对的API-04/07 | 个人结构化课程/单元学情已读 | **具备受限事实转写输入**；先排除冲突分母和未经发生的测试描述。未执行模型话术验收；没有验证家长关系、接收人或送达 |
| E1 | 这节课有哪些报告、回放和板书？ | API-07/08/10 | 正式报告、2回放文件、36课堂图、2板书；AI正文也读到 | **资源目录和存在性可答**；本轮未播放视频或识别板书。AI正文须独立标为生成报告，不与官方事实混淆 |
| E2 | 把这节课讲的内容整理成课堂回顾 | API-08/10；逐字稿候选未执行 | 本人笔记可读，AI报告可读；**没有取得课堂原始逐字稿** | **主输入仍不充分**：不能用AI学生进展描述或计划课题代替课堂实际讲解；笔记只可辅助，不能偷偷恢复成默认依据 |
| E3 | 帮我把这份学习资料里的方法整理成三点 | API-04/09 | 14份PDF文字层均成功，含题目、解答、方法文本 | **这类可读资料有回答基础**；输出三点仍须逐条对照原文。尚未验收扫描件、公式排版和其他格式 |
| E4 | 总结一下我们班本周的学习情况 | API-03/04/07/11 | 活动时间、部分事实及个人课程汇总均有 | **部分基础，未取得直接“班级本周”报告**。summaryInfo是单学生课程/单元口径，不能拼个人课程累计数当本周班级报告；两门课程目录已完整，窗口和分母仍待补 |
| E5 | 把刚才的内容整理成一条消息 | 依赖上文已核对内容；无需为改写新增业务读取 | 既有消息草稿规则和对话入口可复用 | **不是数据库接口充分性问题**：要验证对象承接、事实保真、消息审阅和两个入口。此次未调用模型或发送，不标为闭环已验收 |

## 6. 冲突和空结果的处理

### 6.1 作业 correctTotal 不能武断叫“已批人数”

第一份作业目录 `correctTotal=2`，学生明细是两份正式提交、`stStatus=1`。本轮 Apifox 3471555 对同字段存在文字“批阅人数”和 schema“待批阅数量”两种说明，现有 Adapter 把它与已批人数比较，因此提示差异。

可以确认的是“2人已交、1人未交；两份明细均标待批”。不能把列表数2机械解释成“2人已批”，也不能直接判上游数据坏。需要接口维护者确认字段现行定义、缓存/汇总刷新机制及应消费的权威值。

### 6.2 学情汇总与活动目录有不同分母

三人的全课程 `summaryData.activityTotalCount=64`，但按目录、单元 activityCount 和详情复核共54项；差异散落多个单元，不是把空单元误计成一项。单单元请求验证确实只返回该单元（5活动、2课堂），说明不能把差异简单归为请求完全未过滤。

报告可能与目录采用不同发布/历史/删除/活动种类口径，但本轮没有证据选定原因。保留两个来源的原值；未完成口径核对前不混算完成率，也不从缺失评分值推出0分。

`stuActivityList` 查询成功且 `total=0,list=[]`，与同学生在 API-04 的有效分配不一致。已按合同对非空单元重复核验，未发现可据此认定无任务的依据。没有猜测额外参数或切换学生身份绕过权限。

### 6.3 AI 报告是可读生成文本，不是新增教学事实

本轮 AI `reportContent` 长5983字符，外层 JSON 的 rawMarkdown 仍是 JSON 字符串，内含 lesson_meta、lesson_portrait、teaching_performance、highlight_moments、student_progress、next_step 等结构。顶层 reportScore为0，外层totalScore为0，内层教学分数为93；正式课后实到0，而内容包含学生进展描述。

上述评分字段的指标口径尚未对齐，不能仅凭0与93不同认定是同一分数的错误。

这些数据证明“有正文且可解析”，不证明AI描述准确。不能据其生成学生事实、学习进步判断或家长话术中的表现结论。也不能拿其中的教学分析当原始语音逐字稿。

## 7. 已找到但未实际调用的后续线索

| 线索 | 当前证据 | 未调用/未升级的原因 |
| --- | --- | --- |
| Apifox 3499126 `/course-ai-assistant/app/file/richVideoSummary` | 请求含courseId/fileId/bizId/bizType/classId，subtitle/chapter/isRetry等，存在生成中/失败/机构未开通错误 | 尚未确认纯读取已有字幕是否会触发生成；响应schema未完整定义字幕正文。研究不发起生成任务，故未调用 |
| 3499128 `/course-ai-assistant/app/share/richVideoSummary` | classKey/fileId，subtitle/chapter；旧skills目录有cosUrl/content描述 | 加密classKey取得方式和当前完整输出合同未闭环，不使用任意票据 |
| 3499234 内部 video/origin、3499148 query/parts | 内部服务目录出现逐字稿/视频原文候选 | 额外source/token权限及合同不完整；不通过内部地址扩大授权 |
| 3471556 `/lms/app/course/studentUnitActivityList` | 教师指定studentId的学生视图候选 | 是stuActivityList空结果的后续合法排查方向；本轮已有逐活动名单，未再扩大调用面 |
| 3492770 `/lms/app/report/course/getSummaryList` | 历史课程汇总接口 | 当前Apifox标deprecated；不能作为首选新接口或直接当班级周期报告 |

## 8. 建议补齐信息与后续验收

仍需的补充信息是具体合同或业务口径，不是要求用户重新手工整理整套学生数据：

1. **课堂逐字稿**：能只读已有内容的正式 endpoint、课节/回放文件关联、结果状态和权限；ASR生成入口与读取入口分开。
2. **报告口径**：个人summaryInfo活动分母为何不同于目录；学生单元报告空结果的必要权限/上下文；班级按日期周期汇总的正式接口是否存在。
3. **批阅与考勤口径**：correctTotal当前含义；attendStatus/isLate/isEarly完整枚举，尤其-1；请假或不应到学生如何从分母排除。
4. **有效正向样本**：同一授权范围内有已批作答、有非零录播进度、有多节历史出勤的自然样本，以验证计算和输出；空记录不能替代这些验收。

后续将每条问题的可用输入做最小上下文投影，再执行“真实取数→生成回答→对照原始依据”，逐条记录通过/部分通过/不能回答。数据接口核验完成的部分与产品对话验收分别追踪。

Write Set：仅本文和 Git 忽略的本轮私有研究证据。没有修改应用、原问题清单、V2 或用户已有更改。
