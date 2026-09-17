---
title: ClassIn 教师测试环境接入证据与未知项
date: 2026-09-14
status: RESEARCH_RECOMMENDATION
truth_label: LOCAL_SOURCE_REVIEW_NOT_RETESTED
scope: IM Copilot 升级规划的接口证据；本次不调用业务接口、不读取凭据、不修改实现
---

# ClassIn 教师测试环境接入证据与未知项

整体范围、工程里程碑与验收清单统一见 [升级方案](../06-architecture/CLASSIN-TEST-INTEGRATION-UPGRADE-PLAN-2026-09-14.md)。本文只拥有接口证据及未知项，不替代实施计划。

## 结论与证据边界

已有材料足以支持规划“测试教师身份 → 班级 → 班级内课程 → 单元活动 → 详情与部分学习状态”的真实测试环境读取。普通 IM 的真实发送、历史同步、交付与已读回执仍没有被本次审阅材料证明；课堂课后出勤可读也不等于课中实时出勤已经验证。[教师鉴权实测记录](./CLASSIN-TEACHER-AUTH-PROBE-2026-09-11.md)、[导入执行报告](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md)、[课堂数据核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)、[API 能力缺口](./CLASSIN-API-CAPABILITY-MAP-2026-09-11.md)

**本文全部结论来自本地源码、接口索引与既有研究记录，未经本次重测。** “历史实测”仅指对应日期报告记载了成功或失败，并非当前凭据有效、服务在线、对象仍存在或当前教师仍有权限。本次未打开私人原始回执、客户端日志、凭据文件或学生原始记录；仅引用公开于仓库的脱敏结论。本文 Write Set 只有本文件，不改变锁定决策、产品实现或测试数据。

| 证据级别 | 本文使用方式 | 不可推导的结论 |
| --- | --- | --- |
| 本地代码核对 | 直接读取调用脚本和已保存接口索引 | 不能证明服务接受请求、权限有效或返回完整数据 |
| 历史实测报告 | 使用报告中的调用、回读与失败结论，保留日期与范围 | 不能作为实时快照；未在本次复核私有原始回执 |
| 目录或契约 | 技能注册表、Apifox 字段记录、PC 构建扫描 | 不能把“有接口”升级为“该老师可调用” |
| 未知 | 缺少对应运行证据或语义未校准 | 不能用 Mock、邻近接口或空数组填补事实 |

技能目录曾登记 173 项原子技能，PC 扫描还包含原生桥导出；这些数量均不是已验证 HTTP 能力数量。PC 包同时包含 `ClassInMock`，默认成功回调和浏览器展示不能算服务端成功。Agent 对话消息路径也不能算普通 IM 协议。[可调用性审计](./CLASSIN-API-CALLABILITY-AUDIT-2026-09-11.md)、[PC 传输研究](./CLASSIN-PC-API-TRANSPORT-2026-09-11.md)、[PC 接口扫描](./CLASSIN-PC-API-SCAN-2026-09-11.md)

## 鉴权、服务与身份

| 能力面 | 已有证据 | 集成规划必须保留的边界 |
| --- | --- | --- |
| 教师测试网关 | 参考脚本默认 `https://dynamic14.eeo.im`，读取用户配置中的 UID 对应长期 secret；JSON 使用 JsonSign 与 HS256 JWT，表单使用 SignV2，PHP 路由自动使用表单。9 月 11 日教师签名班级列表成功。 | 身份凭据只能由受控服务端或本地服务持有；页面、模型上下文和审阅文档不承载密钥。此脚本不是浏览器教师登录、续期、撤销或多租户授权的完整方案。 |
| 报告入口 | 课堂报告先用 `SID/UID/clientClassId/identify` 调用 `getReportUrl`，取得课节专属不透明 `classUserKey`，再读取报告。 | `classUserKey` 是访问材料，不是普通业务 ID；不进入公共日志或模型文本。不能声称报告都只需教师 secret。 |
| AI 授课分析 | 历史报告检查、定位与正文链路成功。 | 依赖机构能力、课堂配置、回放音频与异步生成；包含 `admin` 路径的单次成功不能推断所有教师均有正式权限。 |
| 原生客户端桥 | 构建包存在 `generateHeaders`、`generateToken` 等客户端包装，同时存在 Mock 分支。 | 原生桥、外部签名脚本、普通 Web 登录是不同接入形态；不得自动互换。 |
| 学生行为 | 一份作业的学生提交通过临时学生票据完成，教师接口回读。 | 教师签名读取权不等于学生登录或代作答权；该测试行为链不应成为教师产品的默认身份切换能力。 |

来源：[参考说明](../../reference/classin-api/SKILL.md)、[调用脚本](../../reference/classin-api/scripts/classin_api.py)、[教师鉴权实测](./CLASSIN-TEACHER-AUTH-PROBE-2026-09-11.md)、[报告核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)、[PC 传输研究](./CLASSIN-PC-API-TRANSPORT-2026-09-11.md)、[单份学生作业验收](./CLASSIN-STUDENT-HOMEWORK-SUBMISSION-CANARY-2026-09-13.md)。

本地参考脚本有两项值得在接入前收敛的实现事实：说明写“固定测试环境”，实际 CLI 暴露 `--host`；`--verbose` 会打印请求头。规划中的调用入口应显式约束目标环境与日志脱敏，不能仅依赖说明文字。脚本通用成功检查接受 `error_info.errno=1` 或 `code=0`，但多对象写操作还须检查逐项结果：历史加班曾出现顶层成功、单个目标失败且回读未新增。此处只记录差异，本次未修改脚本。[脚本](../../reference/classin-api/scripts/classin_api.py)、[加班失败回读](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md)

角色也必须按接口解释。PC 课程身份中 `teacher=3`、`manager=192`（班主任），同时其他接口存在不同枚举；9 月 11 日读取的两个班级关系角色不同，不能全部称为任教班级。任课教师、班主任与机构管理员不能互相替代。[教师入口与角色研究](./CLASSIN-PC-TEACHER-SURFACE-2026-09-11.md)、[教师鉴权实测](./CLASSIN-TEACHER-AUTH-PROBE-2026-09-11.md)

## 实体与 ID 关系

| 产品含义 | 常见接口字段 | 证据与注意事项 |
| --- | --- | --- |
| 当前账号 | `UID`、`uid`、`teacherUid` | 身份主体；不等于机构 ID、机构学员 ID或班级成员关系。 |
| 机构 | `SID`、`schoolUid` | 逐接口明确对应，不从默认教师身份盲目补一个全局机构。 |
| 班级 | `courseId` / DW `course_id` | ClassIn/LMS 此处的 course 常指班级；不能在页面中一律命名为课程。 |
| 班级内课程 | `categoryId` / `category_id` | 一个班级可有多个 LMS 课程分类。 |
| 单元 | `unitId` | 课程分类下的讲次或组织单元。 |
| 教学活动 | `activityId`、`bizType`、`bizId` | `activityId` 是 LMS 活动；`bizId` 是对应业务对象，必须和类型一起解释。 |
| 在线课堂/课节 | 课堂活动 `bizId`；报告 `clientClassId`；DW `class_id` | 需要从已授权课堂详情取得实际映射；不能把前端班级 `classId` 直接当课节 ID。 |
| 试卷或作业业务记录 | `paperId`、作业业务 ID、学生作业记录 ID | 活动 ID、试卷 ID、学生提交 ID相互不同；草稿试卷还可能尚无有效 `paperId`。 |
| 学生关系 | 用户 UID、机构 `studId`、班级成员关系、活动分配名单 | 班级成员不自动等于每项活动应完成人员；机构学生目录为空也不能推断班级无人。 |
| 普通 IM 会话 | 真实 conversation/thread 引用与班级映射待核实 | 没有本次证据证明本地 Demo `threadId` 可直接映射到真实群或 `courseId`。 |

依据：[课堂与课程关系复核](./CLASSIN-CLASSROOM-COURSE-RELATION-REVIEW-2026-09-14.md)、[活动详情字段](./CLASSIN-ACTIVITY-DETAIL-FIELDS-2026-09-11.md)、[账号与成员关系](./CLASSIN-STUDENT-ACCOUNT-AND-ENROLLMENT-2026-09-13.md)、[测验发布与字段差异](./CLASSIN-UNIT-EXAM-PUBLICATION-2026-09-13.md)、[普通 IM 缺口](./CLASSIN-API-CAPABILITY-MAP-2026-09-11.md)。

**历史 ID 不能充当 live 配置。** 9 月 13 日旧纯单选测验被新版混合题型替换；9 月 14 日改期又对部分零行为活动采用新建、回读、删除旧对象的方式。接入时应重新读取当前分类、单元和活动绑定；名称相同不代表 ID 相同，不应自动把旧草稿或旧发送目标迁到同名新对象。[混合测验替换记录](./CLASSIN-MIXED-UNIT-EXAMS-2026-09-13.md)、[活动改期记录](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md)

## 能力证据矩阵

下表路径只用于规划定位，不能当作完整请求模板；实际参数、编码、机构和目标对象仍需逐接口合同核对。

| 能力 | 路径或读取面 | 最强现有证据 | 未知或不足 |
| --- | --- | --- | --- |
| 教师班级发现 | `/course/app/member/course_list` | 9/11 教师签名成功；匿名调用曾 HTTP 200 但业务 102 拒绝。[鉴权](./CLASSIN-TEACHER-AUTH-PROBE-2026-09-11.md)、[匿名探测](./CLASSIN-PC-COURSE-LIST-PROBE-2026-09-11.md) | 本次账号有效性、完整分页、多机构及普通教师角色权限未重测。 |
| 班级内课程与单元 | `/lms/app/category/list`、`/lms/app/course/unitList` | 9/11 只读成功；导入后分类、14 单元回读。[鉴权](./CLASSIN-TEACHER-AUTH-PROBE-2026-09-11.md)、[导入](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md) | 分类可见性、隐藏/退出班级的授权边界需覆盖。 |
| 活动目录 | `/lms/app/course/unitActivityList` | 9/14 改期报告记载 53 项：14 课堂、14 作业、7 测验、4 录播、14 资料，关联及详情回读通过。[改期](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md) | 这是当时数量，不能作为当前 UI 总数或完备断言。 |
| 班级成员/活动名单 | 班级成员读取、各活动 `/students` | 9/13 三个测试成员正常；活动名单逐项匹配；9/14 活动范围回读。[导入](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md)、[改期](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md) | 仓库报告未给出所有成员读取的完整传输合同；成员变更、退出、跨机构与分页需校准。 |
| 课堂状态 | `/lms/app/activity/class/get` | 首讲从课前到课后历史回读，结束后 `processFlag=2`、`classStatus=3`。[回放诊断](./CLASSIN-LESSON1-REPLAY-DIAGNOSIS-2026-09-14.md) | 无实时状态推送或刷新延迟 SLA；不能单靠客户端时间冒充真实开课/结束。 |
| 课后出勤 | `/lms/app/activity/class/students`、报告 `getAttendRecords` | 9/14 首讲三源读取一致：应到 3、实到 0、学生时长均为 0。[课堂核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md) | 没有正向到课、迟到、早退样本；**课中实时出勤与缺勤提醒时效未验证**。另一 `classMemberTime` 候选网关历史 404。 |
| 作业详情与进度 | `/lms/app/activity/homework/get`、`students`、`student/detail` | 一名测试学生一份作业正式提交并由教师回读，其他两人当时未提交。[单份验收](./CLASSIN-STUDENT-HOMEWORK-SUBMISSION-CANARY-2026-09-13.md) | 一份行为不足以证明完整作业学情；草稿、补交、订正、批阅、删除、统计延迟还需样本。改期称保留首讲提交/批改记录，但没有单独完整批阅测试链，不能据此宣布批阅覆盖完成。[改期](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md) |
| 测验详情与进度 | `/lms/app/activity/exam/get`、`students` | 发布、试卷内容、分配与未作答状态历史成功；新版混合测验亦回读。[发布](./CLASSIN-UNIT-EXAM-PUBLICATION-2026-09-13.md)、[混合卷](./CLASSIN-MIXED-UNIT-EXAMS-2026-09-13.md) | 学生答题、交卷、自动/人工批阅及非零正确率无本次所见闭环；不能称完整成绩数据。 |
| 录播/资料 | `/lms/app/activity/recordClass/get` 及类型详情/学生读取 | 9/14 4 录播和14资料保留资源、活动分配回读；录播转码成功。[改期](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md) | 内容可读不等于学生观看/学习发生；观看进度上报、完成率与资料阅读行为未形成充分运行证据。 |
| 课堂报告与回放 | `getReportUrl` → `getClassTeachingReport` / `overallView`；`getLessonRecordInfo` | 首讲已有报告与回放；回放是课后异步产出，曾经历空结果后可用。[课堂核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)、[回放](./CLASSIN-LESSON1-REPLAY-DIAGNOSIS-2026-09-14.md) | 报告与回放生成中不能当永久无数据；课堂真实时长与录制时长不同。学生未到课，参与/成就为空，AI 文本不能补出学生事实。 |
| 真实 IM 发送/历史 | 未确认正式普通 IM 协议 | 目录与 PC 扫描明确登记缺口；Agent API 不等于普通 IM。[能力图](./CLASSIN-API-CAPABILITY-MAP-2026-09-11.md)、[PC 扫描](./CLASSIN-PC-API-SCAN-2026-09-11.md) | 群/私聊会话映射、教师发送身份、鉴权、历史、发送幂等、状态查询、已读、撤回、订阅、断线补偿全部需要独立合同与实测。 |

## 状态解释与覆盖缺口

1. 作业与测验的状态码并不相同。Apifox 字段记录中，作业 `stStatus` 为未提交/已提交/已批阅，测验则包括未作答/作答中/已批阅/已交卷；这些是契约证据，不能在统一进度中直接沿用原始数字。历史回读还有 `student_uid` 与 `studentUid`、分值倍率、试卷字段结构等差异。[字段记录](./CLASSIN-ACTIVITY-DETAIL-FIELDS-2026-09-11.md)、[导入回读](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md)、[测验字段差异](./CLASSIN-UNIT-EXAM-PUBLICATION-2026-09-13.md)
2. “数据为空”“没有发生行为”“当前账号无权”“读取失败”“尚未生成”需要独立表达。历史云盘目录失败并非无文件；首讲参与为空有未到课的交叉证据；AIC 未请求生成也不否定另一管线的 AI 授课分析已生成。[导入报告](./CLASSIN-SINGLE-COURSE-IMPORT-EXECUTION-REPORT-2026-09-12.md)、[课堂核验](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)
3. 真实接口读取与内容来源要分别标记：源课程结构、AI 生成测试题、测试账号实际提交、固定 Demo 数据是不同真值维度。测试环境真实写入不使生成题或测试作答变成生产教学历史。[数据集里程碑](./CLASSIN-SINGLE-COURSE-IMPORT-MILESTONES-2026-09-12.md)、[混合测验](./CLASSIN-MIXED-UNIT-EXAMS-2026-09-13.md)、[单份作答](./CLASSIN-STUDENT-HOMEWORK-SUBMISSION-CANARY-2026-09-13.md)
4. 历史材料按事件理解，不能只看文件标题或顶部“最新”：9/12 里程碑仍写资源/学员受阻；9/13–14 专项记录已推进到资源分配、首讲回放等结果。9/14 上午时间清单也被同日改期报告替代。最终绑定与当下状态必须在接入验收中重取。[早期里程碑](./CLASSIN-SINGLE-COURSE-IMPORT-MILESTONES-2026-09-12.md)、[上午清单](./CLASSIN-COURSE-ACTIVITY-SCHEDULE-AUDIT-2026-09-14.md)、[改期](./CLASSIN-COURSE-ACTIVITY-RESCHEDULE-2026-09-14.md)、[晚间课堂](./CLASSIN-LESSON1-CLASSROOM-DATA-INTERFACE-AUDIT-2026-09-14.md)

## 建议的接入验收顺序

以下仅为规划建议，尚未实施或重测。

1. 重新建立当前教师身份和可访问班级清单，冻结获授权测试对象的范围；校验机构、班级角色、课程、单元、活动和对象版本，保存脱敏 schema、计数与采集时间。
2. 完成最小只读链：一个班级、一门班内课程、一项课堂、一份作业、一份测验；同时对照目录、详情与目标人员集合。失败时明确未知，不回填固定 Demo 结论。
3. 教学动态先使用有历史证据的课前排期、作业/测验状态和课后事实；课中“谁未到课”须等实时接口与时效验收通过。无正向到课、交卷等样本时，保持对应能力未验证。
4. 用少量测试行为补齐正向到课、迟到/早退、作业提交与批阅、测验交卷与批阅，逐条验证详情和汇总一致性；同时覆盖过期凭据、跨班拒绝、活动删除、空名单、部分响应与恢复。
5. 普通 IM 单独建立准入条件：先确认正式协议和会话绑定，再验证教师审阅后单条测试发送、服务端回执与对端可见性；重试复用幂等键，超时未知先查状态。真实发送尚未打通时，产品应停在可审阅草稿或明确标识的人工交付，不能把本地追加标成真实发送。

该顺序依据上述证据强弱与当前项目的事实所有权、真值和教师审批约束提出，不静默升级任何 `LOCKED` 决策。[项目规范](../../AGENTS.md)、[决策账本](../00-project/DECISION-LEDGER.md)

## 本次验证记录

- 已只读审查 `reference/classin-api` 的说明和签名脚本、PC 静态接口索引，以及本文件引用的既有研究报告。
- 未调用 ClassIn、Apifox 或数仓业务接口，未读取私有回执或身份配置，未产生新的服务端可用性结论。
- 仅新增本文件；本地相对 Markdown 来源链接已检查存在。当前证据审计可用于系统规划，不能替代实际接入验收。
