---
title: ClassIn 教学数据结构——LMS 活动字段字典与可回答问题
date: 2026-09-15
status: SCHEMA_VERIFIED_SEMANTICS_PARTIAL
scope: 42 张原始活动域表完整字段 + 12 张数仓视图核验
---

# ClassIn 教学数据结构——LMS 活动字段字典与可回答问题

[返回教学数据地图](./CLASSIN-TEACHING-DATA-MAP-2026-09-15.md)

先了解业务而非逐列查字段时，阅读[教学活动业务下钻](./CLASSIN-TEACHING-ACTIVITY-BUSINESS-DEEP-DIVE-2026-09-15.md)；作业、测验与答题卡的细节见[参数与师生操作规则分册](./CLASSIN-TEACHING-ACTIVITY-ASSESSMENT-RULES-2026-09-15.md)。

本研究回答“活动里有什么内容，分配给谁，学生做了什么，老师如何批阅，哪些事实可以支持回答”。它描述教学事实的数据结构，不以功能使用次数代替教学事实，不宣称原项目已接入这些数据。

已从在线知识库完整读取活动域九篇子字典，并通过只读元数据接口核验 **42 张原始表、649 个字段**；字段名及类型与这九篇字典一致。另核验 **12 张数仓视图**，补充现有数仓可读取的映射与差异。原始库此次只读取结构，未读取学生业务记录；“结构已验证”不代表字段都有值、每个班级都有此类活动、JSON 内部合同已验证，或教师具有读取全部记录的权限。数据行覆盖仍以独立样本研究为准。

课程分类和单元表由教学主结构文档负责，本篇只保留关联路径。课堂细节、IM 消息正文、完整题库治理与报告服务不纳入本篇 42 张表统计。

## 1. 从数据到老师的问题

| 老师的问题 | 必须取得的事实 | 能输出什么 | 不能直接推断什么 |
| --- | --- | --- | --- |
| 我准备的作业、资料，学生现在能看到吗？ | 活动及上层可见性、对象分配、删除状态、时间窗口 | 区分草稿、隐藏、已发布；列出允许查看的对象 | 创建了不等于已发布；发布了不等于所有成员可见 |
| 这份作业要做什么、怎么交？ | 作业正文、附件、起止时间、提交规则 | 原要求中的页码、题号、形式、截止时间 | 只有附件地址时不能声称看懂题面 |
| 哪些学生没交、交了没批？ | 活动分配名单、作业学生当前状态、草稿/打回/删除状态 | 按学生列未交、待批、已批和打回 | 班级人数不是固定应交分母；草稿不是已提交 |
| 这位学生改过几次，老师怎么批的？ | 当前学生作业 + 以学生作业 ID 串起的操作日志 | 提交—批阅—打回—订正时间线及对应内容 | 只按日志操作人筛学生，会遗漏老师批阅 |
| 哪些题容易错，错在哪里？ | 题面、答案、学生作答、逐题批阅、计分合同 | 错题分布、解题过程分析、可复查依据 | 作业整体分数或参与事件不能替代逐题证据 |
| 录播看完了吗，停在哪一段？ | 分配名单、逐学生逐视频的有效观看/进度/片段 | 未开始、进度、未看片段 | 看过、累计播放、有效观看、完播和掌握是不同概念 |
| 资料谁还没看？ | 学习资料分配名单、首次查看与查看次数 | 已查看/未查看及时间 | 首次查看不能证明读完、理解或完成练习 |
| 打卡漏了哪几天，能不能补？ | 应打卡日期、学生按日记录、补卡规则 | 缺失日期、已打卡/补卡天数 | 同一天多次提交不等于多天；一次提交不等于整项完成 |
| 英语哪些词需要再练？ | 朗读题目、学生音频、逐题 AI/教师评测细分 | 依据评测指出练习项 | AI 分数不是教师结论；音频 ID 不是识别文本 |
| 互动课件做到哪了？ | SCORM 文件/解析、学习进度、通过状态、报告数据 | 完成度、通过结果、报告摘要 | 每个课件都支持相同逐题报告、字符串进度都同量纲 |
| 讨论里大家提了什么问题？ | 讨论正文、回复、对象与作者关系 | 在取得正文后整理讨论 | 本次目录没有独立讨论回复表，不能仅靠活动标题回答 |

## 2. 主关联与内容层级

`机构 → 班级(course_id) → 课程分类(category_id) → 单元(unit_id) → 活动(activity_id)`。活动继续通过 **biz_type + biz_id** 路由到业务主表；相同数字的 biz_id 在不同类型之间不是同一对象。biz_id 为 0 的刚创建活动可能尚未拥有业务实体。

每次获取业务记录需要保留机构、班级、课程、活动和学生范围。某些子表没有机构/班级字段，必须先从已授权活动取得其业务 ID，再下钻，不能从全局子表扫描后交给前端过滤。

| 层级 | 核心承载 | 关联/粒度 | 作用 |
| --- | --- | --- | --- |
| 活动壳 | lms_activity | id；course_id/category_id/unit_id | 标题、时间、发布、排序、应参与与评分配置 |
| 分配与通用状态 | lms_activity_student | activity_id + student_uid 联合主键 | 谁被分配、通用状态、评分投影 |
| 活动扩展 | lms_activity_extension | activity_id | 活动内容及配置 JSON；不是已解析教学文本 |
| 业务主表 | 按 biz_type 路由 | biz_id → 业务主键 | 类型专属要求、期限、答案可见性等 |
| 学生过程与结果 | 业务学生表 | 业务 ID + student_uid，部分自增学生业务 ID | 提交、观看、答题、批阅、订正 |
| 日志 | 作业/打卡日志等 | 学生业务 ID → 多条时间记录 | 当前结果以外的过程证据 |
| 附件关系 | lms_activity_file | activity_id + role/uid/to_uid + lms_file_id | 区分老师资料、学生提交、老师定向反馈 |
| 附件元信息 | lms_file | id；file_id 指向文件总表 | 名称、类型、大小及文件引用；需要另行取得内容 |

## 3. 各类活动覆盖与关联键

| biz_type | 活动 | 本篇表族 | 下钻路径及最小粒度 |
| --- | --- | --- | --- |
| 1 | 在线课堂 | 活动壳；课堂表由课堂字典负责 | biz_id → eeo_course_class.class_id |
| 2 | 作业 | 3 张：作业、学生、日志 | biz_id → homework_id；stu_homework_id → 日志，日志 uid 是操作人 |
| 3 | 测验 | 7 张：新旧试卷/试题、发布、学生、主观作答 | biz_id → exam_id；exam_paper_id → 试卷；student_exam_id → 主观作答 |
| 4 | 录播课 | 3 张：主表、学生、逐视频 | biz_id → record_class.id；record_id + student_uid + file_id |
| 5 | 学习资料 | 2 张：主表、学生 | biz_id → learning_materials.id；materials_id + student_uid |
| 6 | 讨论 | 活动壳及可能的扩展内容 | 知识库称 LMS 内部、无独立业务表；正文/回复合同未覆盖 |
| 7 | 答题卡 | 6 张：主表、内容、选项分析、学生、客观题、主观题 | biz_id → answer_sheet.id；answer_sheet_id + student_uid；题号局限在该卡内 |
| 8 | 打卡 | 8 张：设置、统计、业务、提交/批阅/过程/学生记录 | activity_id → clock_setting；clock_id + student_uid → 天数；biz_id → homework.id；record.id → log.object_id；content_type 决定 content_id 的日志类型 |
| 9 | SCORM | 4 张：主表、文件、学生、报告 | biz_id → scorm.id，同时核对 activity_id；scorm_id + student_uid |
| 10 | 英语跟读（AI口语卡） | 与 11–15 共用 4 张阅读表 | biz_id → reading.id；reading_id + student_uid；question_id → reading_question.id |
| 11 | 英语背诵 | 同上 | 同上；通用状态字段版本差异见第 4 节 |
| 12 | 英语听写 | 同上 | 同上 |
| 13 | 语文朗读 | 同上 | 同上；题型不是仅“单词/句子” |
| 14 | 语文背诵 | 同上 | 同上 |
| 15 | 语文听写 | 同上 | 同上 |

试卷题目须解析 paper/topicInfos，并按 topicSource 区分个人、ClassIn、组织题源；不能将相同 topicId 无条件关联到同一张表。新题表支持 parent_id/sub_topics，题号与题 ID 不能混用。答题卡主要承载答案与计分配置，是否具有完整题干要另核实。

## 4. 必须固化的语义与待核实差异

| 项目 | 已有证据与约束 | 对回答的影响 |
| --- | --- | --- |
| 班级/课程 | LMS course_id 是班级，category_id 是班内课程分类；若数仓注释写课程仍按业务术语解释 | 不把多门课程合成一门，也不把整个班级人数当某活动人数 |
| 发布/进展/学生状态 | publish_flag：0草稿、1隐藏、2发布；process_flag：0未开始、1进行中、2结束；学生状态另在学生表 | 三种状态不能互相替代，隐藏进行中仍不表示学生可见 |
| 学生通用 state/is_done | 105.7 写仅 11–15 更新；010 写 10–15。字段存在已验证，**业务适用范围冲突待核** | 禁止把所有 state=0 解释成未参与；其他类型需解析 status.stStatus/类型专属表 |
| 学科活动时间 | 105.3 写 reading_student 的最后提交/批阅时间仅 type=10 有值；其他类型在通用 status JSON | 不把 0 时间戳展示为真实历史时间，不仅靠这两列排序 |
| 作业 score_type | 原始字典包含 5=分数，现用 4/5；其他显示方案经 grade_display_id；数仓注释仍列 1–4，学生视图只注“1数字” | 新旧口径必须按业务合同归一；不得将 5 当未知或擅自按百分制解释 |
| 作业 is_done | 0=批阅完成，1=未完成，和常见布尔直觉相反 | 不按列名直接转换 true/false |
| 评分与正确率 | score、rate、score_p、correct/wrong 都存在；满分、评分方式及是否批阅必须先确定 | 得分率不等于答题正确率；半对、主观题和不同分值需要明确分母 |
| 数值量纲 | papers.full_marks 扩大 100 倍；lms_activity_student.rate 文档称百分比乘 1,000,000；reading_student.rate 仅称得分率乘 1,000,000 | 保留原值/量纲/换算，百分数与比例写法仍须真实样本确认；不要对所有 rate 复用换算 |
| 可补交/公开答案 | 作业 is_revise、open_answer；测验 is_retake/public_parsing；答题卡 is_retake/open_type 各有独立枚举 | 截止不总等于无法提交；教师内部分析与发给学生的正文要遵循答案可见时机 |
| 录播进度 | duration/total_play_sec 累计观看；play_valid_sec 有效时长；play_bar_sec 最近位置；play_bar_max 最远位置 | 最远位置不是完整有效观看；rate_duration 缩放和“完播”判定须补合同 |
| 资料查看 | check_time 首次查看，学生 check_total 次数；主表 check_total 为人数 | 次数不能求和冒充已查看人数；查看不能等于掌握 |
| 日志与当前值 | 作业学生表为当前记录；log 多次操作；打卡 latest 还有 -1 状态 | 查过程必须保留版本/操作人，统计当前值不能把每次日志重复计人 |
| 无效/未启用字段 | problems_ids 字典称空且无效；scorm_setting/scorm_result 暂空；不是本次逐行验证 | 只能列为“不应依赖的字典提示”，不能声称现场所有记录为空 |
| 待核字段 | exam_student_infos.is_remove、exam_topic.real_count 字典含问号；各种 ext JSON 未给完整 schema | 只能说明字段存在，不使用其含义支撑强结论 |
| 数据可获得性 | 原始表元数据可读不等于业务数据授权；数仓为延迟快照；_7df 的保留/刷新窗另核 | 不声称实时全班知识，也不把未取到的数据当作没有发生 |

## 5. 内容载体与解析缺口

数据库结构足以定位“去哪里找”，但不等于模型已经看懂了教学内容：

- **直接文字**：作业正文、学生文字、教师评语、资料简介、题干文本、朗读内容，可保留原文及出处后回答。
- **结构化 JSON**：试卷题序、题源、客观答案、逐题批阅、状态与配置，需逐类型/版本解析；未知键保留原文，不猜含义。
- **HTML**：主观题答案与题面可能含图片、公式和排版，需要安全解析、资源获取和图文还原。
- **文件引用**：lms_file_id 与底层 file_id 是两种 ID。必须通过授权资源链取得正文、页码、图片/音频/视频内容，不能凭文件名总结知识点。
- **音视频**：观看记录只能说明学习行为；总结讲授内容需要字幕、转写或多模态解析，并保留时间片段定位。
- **AI 批阅**：AI 输出与教师批阅分开保存，不能将 AI 成功状态投影成教师已确认。失败信息不进入面向教师的原始调试展示。
- **知识点关系**：旧题库有 points，新题 JSON 和题库分类另有关系；不要只凭标题自动宣布“已覆盖全部知识点”。

本次没有取业务正文样本，因此 **空值率、资源可下载率、JSON 版本分布、提交记录覆盖、关联命中率、成绩换算及答案可见策略** 仍是接入前验证项。它们不是通过 describe_table 可以证明的。

## 6. 完整字段附录的阅读方式

附录 A 每个字段都列名称、实测类型、实测是否可空、实测索引标志和业务解释。字段意义来自对应在线子字典；元数据只核验结构。PRI/UNI/MUL 是元数据索引标志，**不是外键声明**，MUL 也不证明哪个复合索引组合。所有关联路径均为业务字典关系，不冒充数据库外键。

所有列都被保留，包括尚无解析合同的 JSON/ext 字段。说明中的“字典提示”并未通过数据取值分布验证。原始字段字典是此次研究成果的字段映射，不是在线知识库缓存或后续查询的权威替代；后续查数仍应检索在线最新字典。


## 附录 A：42 张原始表 / 649 个字段

| 编号 | 业务域 | 表 | 字段数 |
| --- | --- | --- | --- |
| A1 | LMS基础信息 | [eo_oslms.lms_activity](#a1) | 29 |
| A2 | LMS基础信息 | [eo_oslms.lms_activity_student](#a2) | 14 |
| A3 | LMS基础信息 | [eo_oslms.lms_activity_extension](#a3) | 5 |
| A4 | LMS基础信息 | [eo_oslms_file.lms_file](#a4) | 13 |
| A5 | LMS基础信息 | [eo_oslms_file.lms_activity_file](#a5) | 18 |
| A6 | 作业 | [eo_oshw.eeo_course_homework](#a6) | 36 |
| A7 | 作业 | [eo_oshw.eeo_course_homework_students](#a7) | 47 |
| A8 | 作业 | [eo_oshwlog.eeo_course_homework_log](#a8) | 25 |
| A9 | 考试测验 | [eo_osexam.eeo_exam_papers](#a9) | 16 |
| A10 | 考试测验 | [eo_osexam.eeo_exam_paper](#a10) | 16 |
| A11 | 考试测验 | [eo_osexam.eeo_exam_release](#a11) | 27 |
| A12 | 考试测验 | [eo_osexam.eeo_exam_student_answer](#a12) | 9 |
| A13 | 考试测验 | [eo_osexam.eeo_exam_student_infos](#a13) | 24 |
| A14 | 考试测验 | [eo_osexam.eeo_exam_topic](#a14) | 22 |
| A15 | 考试测验 | [eo_osexam.eeo_exam_topics](#a15) | 16 |
| A16 | 录播课 | [eo_oslms.record_class](#a16) | 23 |
| A17 | 录播课 | [eo_oslms.record_class_students](#a17) | 11 |
| A18 | 录播课 | [eo_oslms.record_class_student_videos](#a18) | 13 |
| A19 | 学习资料 | [eo_oslms.learning_materials](#a19) | 20 |
| A20 | 学习资料 | [eo_oslms.learning_materials_students](#a20) | 10 |
| A21 | 答题卡 | [eo_osanswer_sheet.answer_sheet](#a21) | 16 |
| A22 | 答题卡 | [eo_osanswer_sheet.answer_sheet_content](#a22) | 7 |
| A23 | 答题卡 | [eo_osanswer_sheet.answer_sheet_option_analyze](#a23) | 9 |
| A24 | 答题卡 | [eo_osanswer_sheet.answer_sheet_student](#a24) | 13 |
| A25 | 答题卡 | [eo_osanswer_sheet.answer_sheet_student_detail](#a25) | 7 |
| A26 | 答题卡 | [eo_osanswer_sheet.answer_sheet_student_quiz_detail](#a26) | 8 |
| A27 | 打卡 | [eo_lms_clock.clock_setting](#a27) | 11 |
| A28 | 打卡 | [eo_lms_clock.clock_student_statistics](#a28) | 11 |
| A29 | 打卡 | [eo_oslms_homework.homework](#a29) | 14 |
| A30 | 打卡 | [eo_oslms_homework.homework_mark_log](#a30) | 13 |
| A31 | 打卡 | [eo_oslms_homework.homework_submit_log](#a31) | 7 |
| A32 | 打卡 | [eo_oslms_homework.homework_student_record](#a32) | 16 |
| A33 | 打卡 | [eo_oslms_homework.homework_student_log](#a33) | 12 |
| A34 | 打卡 | [eo_oslms_homework.homework_student](#a34) | 8 |
| A35 | SCORM | [eo_oslms_scorm.scorm](#a35) | 10 |
| A36 | SCORM | [eo_oslms_scorm.scorm_file](#a36) | 11 |
| A37 | SCORM | [eo_oslms_scorm.scorm_student](#a37) | 17 |
| A38 | SCORM | [eo_oslms_scorm.scorm_student_record](#a38) | 9 |
| A39 | 英语语文学科活动 | [eo_oslms_ai_reading.reading](#a39) | 8 |
| A40 | 英语语文学科活动 | [eo_oslms_ai_reading.reading_question](#a40) | 13 |
| A41 | 英语语文学科活动 | [eo_oslms_ai_reading.reading_student](#a41) | 21 |
| A42 | 英语语文学科活动 | [eo_oslms_ai_reading.reading_student_question](#a42) | 14 |

<a id="a1"></a>

### A1. eo_oslms.lms_activity

来源：在线知识库《105.7-原始数据-LMS活动-LMS基础信息.md》；2026-09-15 元数据核验 29 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键，活动id |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级id |
| `category_id` | bigint(20) unsigned | 否 | MUL | 课程id |
| `school_uid` | bigint(20) unsigned | 否 | MUL | 机构uid |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 活动老师（教师）uid |
| `name` | varchar(200) | 否 | — | 活动名称（标题） |
| `unit_id` | bigint(20) unsigned | 否 | MUL | 单元id |
| `biz_id` | bigint(20) unsigned | 否 | MUL | 业务id（对应业务表中的主键/唯一id） |
| `biz_type` | tinyint(3) unsigned | 否 | — | 业务类型（不同业务类型，biz_id字段会对应不同业务表的主键）: 1-课堂,2-作业,3-测验,4-录播课,5-学习资料,6-讨论,7-答题卡，8-打卡，9-scorm,10-英语跟读（AI口语卡），11-英语背诵，12-英语听写，13-语文朗读，14-语文背诵，15-语文听写 |
| `status_info` | varchar(255) | 否 | — | 业务状态信息（json） |
| `start_time` | int(10) unsigned | 否 | MUL | 活动开始时间（unix时间戳） |
| `end_time` | int(10) unsigned | 否 | MUL | 活动结束时间（unix时间戳） |
| `student_total` | smallint(5) unsigned | 否 | — | 参与活动学生总数 |
| `is_all_student` | tinyint(3) unsigned | 否 | — | 是否班级全部学生参与: 0否 1是 |
| `is_score` | tinyint(3) unsigned | 否 | — | 是否评分: 0-不评分，1-评分 |
| `score_weight_id` | bigint(20) unsigned | 否 | — | 评分权重id |
| `max_score` | int(10) unsigned | 否 | — | 满分 |
| `system_method` | tinyint(3) unsigned | 否 | — | 评分方式: 0-手动评分，1-自动评分 |
| `system_grade_rule_id` | bigint(20) unsigned | 否 | — | 自动评分规则id |
| `grade_display_id` | bigint(20) unsigned | 否 | — | 评分显示方案id |
| `unit_order_id` | smallint(5) unsigned | 否 | — | 单元顺序值 |
| `order_id` | smallint(5) unsigned | 否 | — | 活动顺序值 |
| `publish_flag` | tinyint(3) unsigned | 否 | — | 发布状态: 0-草稿，1-隐藏，2-发布 |
| `process_flag` | tinyint(3) unsigned | 否 | — | 进展状态: 0-未开始，1-进行中，2-已结束 |
| `creator_uid` | bigint(20) unsigned | 否 | — | 创建人uid |
| `is_deleted` | tinyint(3) unsigned | 否 | MUL | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `passing_score` | int(10) | 否 | — | 及格分 |

<a id="a2"></a>

### A2. eo_oslms.lms_activity_student

来源：在线知识库《105.7-原始数据-LMS活动-LMS基础信息.md》；2026-09-15 元数据核验 14 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `activity_id` | bigint(20) unsigned | 否 | PRI | 活动id |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid，与活动id联合主键 |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `status` | varchar(500) | 否 | — | 学生参与活动的业务状态信息json |
| `is_score` | tinyint(3) unsigned | 否 | — | 是否已经评分: 0-否，1-是 |
| `grade_method` | tinyint(3) unsigned | 否 | — | 评分方式: 0-手动评分，1-自动评分 |
| `rate` | bigint(20) unsigned | 否 | — | 得分率（该数值=实际得分率（百分比）*1000000 后的整数值） |
| `creator_uid` | bigint(20) unsigned | 否 | — | 创建人uid |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `state` | tinyint(3) unsigned | 否 | — | 学生活动参与状态: 0-未提交，10-已查看，20-已参与，30-已提交，40-已批阅，50-已打回，60-已订正。6.06版本新加字段，只在活动类型biz_type=11，12，13，14，15时，更新此字段。其他活动类型都为0，其他活动的类似字段是status的json中key=stStatus的value值 |
| `is_done` | tinyint(3) unsigned | 否 | — | 学生活动完成状态: 0-未完成，1-已完成。6.06版本新加字段，只在biz_type=11，12，13，14，15时，更新此字段，其他活动类型的该字段都为0，无意义。 |

<a id="a3"></a>

### A3. eo_oslms.lms_activity_extension

来源：在线知识库《105.7-原始数据-LMS活动-LMS基础信息.md》；2026-09-15 元数据核验 5 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `activity_id` | bigint(20) unsigned | 否 | PRI | 活动id |
| `content` | mediumtext | 是 | — | 内容json（活动业务表的内容字段） |
| `config` | varchar(500) | 否 | — | 配置json（活动业务表的配置字段） |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a4"></a>

### A4. eo_oslms_file.lms_file

来源：在线知识库《105.7-原始数据-LMS活动-LMS基础信息.md》；2026-09-15 元数据核验 13 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id |
| `file_id` | bigint(20) unsigned | 否 | MUL | eo_osfile.eeo_files表主键id |
| `file_size` | int(10) unsigned | 否 | — | 文件大小单位kb |
| `file_name` | varchar(300) | 否 | — | 文件名称 |
| `file_extension` | varchar(10) | 否 | — | 文件扩展名 |
| `file_info` | varchar(500) | 否 | — | 文件附加信息 |
| `file_type` | tinyint(3) unsigned | 否 | — | 文件类型: 1-视频，2-ClassIn录音，3-文档，4-图片，5-链接 |
| `version` | varchar(10) | 否 | — | 文件附加信息版本号 |
| `is_used` | tinyint(3) unsigned | 否 | — | 是否被活动使用: 0-否，1-是 |
| `upload_type` | tinyint(3) unsigned | 否 | MUL | 上传方式: 1-cos(腾讯云)，2-兜底(NAS,现已弃用)，3-云盘 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |

<a id="a5"></a>

### A5. eo_oslms_file.lms_activity_file

来源：在线知识库《105.7-原始数据-LMS活动-LMS基础信息.md》；2026-09-15 元数据核验 18 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id |
| `school_uid` | bigint(20) unsigned | 否 | MUL | 机构uid |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级id |
| `unit_id` | bigint(20) unsigned | 否 | — | 单元id |
| `activity_id` | bigint(20) unsigned | 否 | PRI | 活动id |
| `biz_type` | tinyint(3) unsigned | 否 | — | 业务类型: 1-课堂,2-作业,3-测验,4-录播课,5-学习资料,6-讨论,7-答题卡，8-打卡，9-scorm,10-英语跟读（AI口语卡），11-英语背诵，12-英语听写，13-语文朗读，14-语文背诵，15-语文听写 |
| `role` | tinyint(3) unsigned | 否 | — | 角色: 1-老师，2-学生 |
| `uid` | bigint(20) unsigned | 否 | — | 用户uid |
| `to_uid` | bigint(20) unsigned | 否 | — | 目标uid |
| `lms_file_id` | bigint(20) unsigned | 否 | MUL | lms_file表主键id |
| `file_id` | bigint(20) unsigned | 否 | — | eo_osfile.eeo_files表主键id |
| `source_type` | tinyint(3) unsigned | 否 | — | 来源: 1-活动，2-teacherIn导入，3-复制其他班级 |
| `action_type` | tinyint(3) unsigned | 否 | — | 行为: 1-老师，2-学生，3-老师to学生 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |
| `file_size` | int(10) unsigned | 否 | — | 文件大小单位kb |
| `ext` | varchar(512) | 否 | — | 扩展字段 |

<a id="a6"></a>

### A6. eo_oshw.eeo_course_homework

来源：在线知识库《105.8-原始数据-LMS活动-作业.md》；2026-09-15 元数据核验 36 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `homework_id` | bigint(20) | 否 | PRI | 作业id，自增主键 |
| `course_id` | bigint(20) | 否 | MUL | 班级id |
| `teacher_uid` | bigint(20) | 否 | MUL | 教师uid |
| `homework_title` | varchar(200) | 否 | — | 作业标题 |
| `homework_desc` | mediumtext | 是 | — | 作业描述 |
| `image` | text | 是 | — | 图片附件信息（json数组） |
| `video` | text | 是 | — | 视频附件信息（json数组） |
| `audio` | text | 是 | — | 音频附件信息（json数组） |
| `problems_ids` | varchar(500) | 否 | — | 字典提示：题库id（都为空字符串，无效字段） |
| `status` | tinyint(1) | 否 | MUL | 作业状态: 1-进行中，2-已结束，3-已删除 |
| `is_open` | tinyint(1) | 否 | — | 是否公开: 1-是，2-否 |
| `end_time` | int(11) | 否 | MUL | 结束时间（unix时间戳） |
| `update_time` | int(11) | 否 | — | 更新时间（unix时间戳） |
| `add_time` | int(11) | 否 | MUL | 添加时间（unix时间戳） |
| `school_uid` | bigint(20) | 否 | MUL | 机构uid |
| `score_type` | tinyint(1) | 否 | — | 字典提示：评分类型: 1-百分，2-十分，3-等第，4-不评分，5-分数。现在该字段只有4，5两种类型，其他的三种类型，以及自定义评分通过lms_activity.grade_display_id关联lms_grade_display.id查到 |
| `docs` | text | 是 | — | 文档附件信息（json数组） |
| `is_revise` | tinyint(1) | 否 | — | 是否允许作业结束后提交: 1-否，2-是 |
| `open_type` | tinyint(1) | 否 | — | 公开类型: 1-结束后公开，2-提交后公开，3-批阅后公开 |
| `start_time` | int(11) | 否 | MUL | 作业开始时间（unix时间戳） |
| `score_value` | varchar(100) | 是 | — | 分数默认值 |
| `is_del` | tinyint(1) | 否 | — | 是否删除: 0-否，1-是 |
| `is_download` | tinyint(1) | 否 | — | 是否允许下载附件: 1-是，2-否 |
| `auto_add` | tinyint(4) | 否 | — | 是否允许后进班学生获取作业: 0-否，1-是 |
| `is_done` | tinyint(4) | 否 | — | 是否批阅完成: 0-是，1-否 |
| `source_type` | tinyint(4) | 否 | — | 资源类型: 0-无，1-授权 |
| `num` | int(11) | 否 | — | 作业学生总数 |
| `cnum` | int(11) | 否 | — | 提交作业数 |
| `rnum` | int(11) | 否 | — | 已批阅数 |
| `open_answer` | tinyint(1) | 否 | — | 标准答案公开类型: 0-无答案，1-不公开，2-立即公开，3-提交后公开，4-批阅后公开，5-结束后公开 |
| `th_content` | text | 是 | — | 答案文字内容 |
| `th_image` | text | 是 | — | 答案图片附件信息（json数组） |
| `th_video` | text | 是 | — | 答案视频附件信息（json数组） |
| `th_audio` | text | 是 | — | 答案音频附件信息（json数组） |
| `th_docs` | text | 是 | — | 答案文档附件信息（json数组） |
| `grade_id` | bigint(20) unsigned | 否 | — | 自动评分规则id |

<a id="a7"></a>

### A7. eo_oshw.eeo_course_homework_students

来源：在线知识库《105.8-原始数据-LMS活动-作业.md》；2026-09-15 元数据核验 47 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `stu_homework_id` | bigint(20) | 否 | PRI | 学生作业id，自增主键 |
| `homework_id` | bigint(20) | 否 | MUL | 作业id |
| `student_uid` | bigint(20) | 否 | MUL | 学生uid |
| `is_cream` | tinyint(1) | 否 | — | 是否加精（是否优秀作业）: 0-正常，1-加精 |
| `status` | tinyint(1) | 否 | — | 学生作业状态: 0-未提交，1-已提交，2-已批阅 |
| `reform` | tinyint(1) | 否 | — | 重做状态（是否重做）: 1-是，0-否 |
| `readover` | tinyint(1) | 否 | — | 批阅中状态: 1-是，0-否 |
| `warn` | int(11) | 否 | — | 提醒时间（unix时间戳） |
| `score` | varchar(10) | 否 | — | 评分 |
| `content` | text | 是 | — | 作业文字内容 |
| `image` | text | 是 | — | 图片附件信息（json数组） |
| `video` | text | 是 | — | 视频附件信息（json数组） |
| `audio` | text | 是 | — | 音频附件信息（json数组） |
| `stu_homework_desc` | text | 是 | — | 学生留言 |
| `th_content` | text | 是 | — | 教师批阅内容 |
| `th_image` | text | 是 | — | 教师批阅图片附件信息（json数组） |
| `th_audio` | text | 是 | — | 教师批阅音频附件信息（json数组） |
| `th_video` | text | 是 | — | 教师批阅视频附件信息（json数组） |
| `comment` | text | 是 | — | 老师评语 |
| `is_del` | tinyint(1) | 否 | — | 删除状态: 1-是，0-否 |
| `th_time` | int(11) | 否 | — | 批阅时间（unix时间戳） |
| `comment_time` | int(11) | 否 | — | 老师评语时间（unix时间戳） |
| `show_time` | int(11) | 否 | — | 展示到期时间（unix时间戳） |
| `update_time` | int(11) | 否 | — | 更新时间（unix时间戳） |
| `add_time` | int(11) | 否 | — | 添加时间（unix时间戳） |
| `th_num` | tinyint(4) | 否 | — | 批阅次数 |
| `score_type` | tinyint(1) | 否 | — | 同eo_oshw.eeo_course_homework的score_type |
| `course_id` | bigint(20) | 否 | MUL | 班级id |
| `school_uid` | bigint(20) | 否 | MUL | 机构uid |
| `th_uid` | bigint(20) | 否 | — | 批阅者uid |
| `docs` | text | 是 | — | 学生文档附件信息（json数组） |
| `th_docs` | text | 是 | — | 老师文档附件信息（json数组） |
| `comment_audio` | text | 是 | — | 评语录音附件信息（json数组） |
| `is_startd` | tinyint(1) | 否 | — | 作业开始状态: 1-已开始，2-未开始 |
| `is_revised` | tinyint(1) | 否 | — | 是否为补交作业: 1-否，2-是 |
| `is_draft` | tinyint(1) | 否 | — | 是否为草稿: 1-是，0-否 |
| `ref_time` | int(11) | 否 | — | 学生最后提交作业时间 |
| `is_reform` | tinyint(1) | 否 | — | 是否为打回重做作业: 0-否，1-是 |
| `ch_time` | int(11) | 否 | — | 查看时间（unix时间戳） |
| `rd_ch_time` | int(11) | 否 | — | 批阅后查看时间（unix时间戳） |
| `correct` | int(11) | 否 | — | 正确数 |
| `wrong` | int(11) | 否 | — | 错误数 |
| `admire` | int(11) | 否 | — | 赞数 |
| `belittle` | int(11) | 否 | — | 踩数 |
| `score_p` | char(10) | 否 | — | 得分率 |
| `au_warn` | int(11) | 否 | — | 自动提醒时间（unix时间戳） |
| `emend` | tinyint(1) | 否 | — | 是否订正: 1-是，0-否 |

<a id="a8"></a>

### A8. eo_oshwlog.eeo_course_homework_log

来源：在线知识库《105.8-原始数据-LMS活动-作业.md》；2026-09-15 元数据核验 25 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) | 否 | PRI | 主键id |
| `uid` | bigint(20) | 否 | — | 用户uid（本表为操作人 uid。学生提交/修改时 = 学生本人；老师批阅时 = 老师。按学生维度取全量（含老师批阅）应直接用 stu_homework_id，勿用学生 uid 过滤。） |
| `homework_id` | bigint(20) | 否 | MUL | 作业id |
| `stu_homework_id` | bigint(20) | 否 | MUL | 学生作业id（关联eo_oshw.eeo_course_homework_students表主键） |
| `info` | text | 是 | — | 日志信息 |
| `comment` | text | 是 | — | 评语 |
| `content` | text | 是 | — | 作业内容 |
| `image` | text | 是 | — | 图片附件信息（json数组） |
| `video` | text | 是 | — | 视频附件信息（json数组） |
| `audio` | text | 是 | — | 音频附件信息（json数组） |
| `stu_homework_desc` | text | 是 | — | 学生留言 |
| `stu_homework_status` | tinyint(1) | 是 | — | 学生作业状态: 0-未提交，1-已提交，2-已批阅 |
| `readover` | tinyint(1) | 否 | — | 批阅中状态: 1-是，0-否 |
| `reform` | tinyint(1) | 否 | — | 重做状态: 1-是，0-否 |
| `score` | varchar(10) | 否 | — | 评分 |
| `add_time` | int(11) | 否 | — | 添加时间 |
| `score_type` | tinyint(1) | 否 | — | 同eo_oshw.eeo_course_homework的score_type |
| `docs` | text | 是 | — | 文档附件信息（json数组） |
| `comment_audio` | text | 是 | — | 评语录音附件信息（json数组） |
| `correct` | int(11) | 否 | — | 正确数 |
| `wrong` | int(11) | 否 | — | 错误数 |
| `admire` | int(11) | 否 | — | 赞数 |
| `belittle` | int(11) | 否 | — | 踩数 |
| `score_text` | varchar(100) | 否 | — | 评分显示方案成绩 |
| `score_p` | char(10) | 否 | — | 得分率 |

<a id="a9"></a>

### A9. eo_osexam.eeo_exam_papers

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 16 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `exam_paper_id` | bigint(20) unsigned | 否 | PRI | 试卷ID |
| `user_id` | bigint(20) unsigned | 否 | MUL | 所属用户UID |
| `exam_paper_no` | varchar(255) | 否 | — | 试卷编号 |
| `exam_paper_version` | varchar(255) | 否 | — | 试卷版本号 |
| `exam_paper_dec` | mediumtext | 是 | — | 试卷描述说明 |
| `exam_paper_title` | varchar(255) | 否 | — | 试卷标题 |
| `exam_topic_sum` | int(10) unsigned | 否 | — | 试卷题目个数 |
| `score_type` | tinyint(3) unsigned | 否 | — | 评分类型:0-未知,1-百分,2-十分,3-等第,4-不评分,5-自定义 |
| `degree` | float(3,2) unsigned | 否 | — | 难度，值越大，难度越大 |
| `full_marks` | int(10) unsigned | 否 | — | 试卷满分，实际为扩大100倍入库 |
| `exam_paper_info` | text | 是 | — | 试卷信息 json 格式，键值paper为试卷的题目信息，包含serialNo 题号，topicInfos 题目信息。 键值topicInfos 包含topicId为试题id，serialNo 单个试题小题题号 topicSource 试题来源 0 = 个人题库、1 = CLASSIN题库、2 = 组织题库 |
| `source` | tinyint(3) unsigned | 否 | — | 来源端:0-未知,1-EEO后台,2-客户端 |
| `ext` | text | 是 | — | 其他扩展信息 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除:0-未删除,1-已删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a10"></a>

### A10. eo_osexam.eeo_exam_paper

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 16 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 自增 ID 试卷id |
| `uid` | bigint(20) unsigned | 否 | — | 用户 UID |
| `title` | varchar(100) | 否 | — | 标题 |
| `desc` | text | 否 | — | 试卷说明 |
| `topic_count` | smallint(5) unsigned | 否 | — | 试卷题数 |
| `score` | int(10) unsigned | 否 | — | 试卷总分 |
| `info` | text | 否 | — | 试卷信息 json 格式，键值paper为试卷的题目信息，包含serialNo 题号，topicInfos 题目信息。 键值topicInfos 包含topicId为试题id，serialNo 单个试题小题题号 |
| `source_id` | int(10) unsigned | 否 | — | 来源 id 对应 eeo_exam_source的自增id |
| `region_id` | int(10) unsigned | 否 | — | 地区 id |
| `degree` | float(3,2) unsigned | 否 | — | 难度，值越大，难度越大度 |
| `year` | smallint(5) unsigned | 否 | — | 年份 |
| `include_at` | int(10) unsigned | 否 | — | 收录时间（unix时间戳） |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 1 已发布 2 删除 3 未发布 4 停用 5 已编辑 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a11"></a>

### A11. eo_osexam.eeo_exam_release

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 27 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `exam_id` | bigint(20) unsigned | 否 | PRI | 考试id，对应活动信息表中的biz_id，业务类型biz_type=3 |
| `school_uid` | bigint(20) unsigned | 否 | MUL | 机构UID 机构唯一标识，多表关联机构维度 |
| `course_id` | bigint(20) unsigned | 否 | MUL | 课程ID或者 班级 ID，班级、课节、成员、活动关联核心字段 |
| `teacher_uid` | bigint(20) unsigned | 否 | MUL | 教师UID |
| `exam_paper_id` | bigint(20) unsigned | 否 | — | 试卷ID，每个考试对应一个试卷(对应eo_osexam.eeo_exam_papers的主键) |
| `arrange_time` | int(10) unsigned | 否 | MUL | 考试布置时间 （unix时间戳） |
| `start_time` | int(10) unsigned | 否 | MUL | 考试开始时间 （unix时间戳） |
| `end_time` | int(10) unsigned | 否 | MUL | 考试结束时间 （unix时间戳） |
| `exam_time_limit` | int(10) unsigned | 否 | — | 答题限时,单位分钟(0 代表不限时) |
| `public_parsing` | tinyint(3) unsigned | 否 | — | 公开解析:0-未知,1-不公开,4-交卷后,5-批阅后,7-结束后 |
| `public_exam` | tinyint(3) unsigned | 否 | — | 公开考试:0-未知,1-不公开,4-交卷后,5-批阅后,7-结束后 |
| `blank_answer_diff` | tinyint(3) unsigned | 否 | — | 作答与正确答案不一致:0-判为错误,1-手动批阅 |
| `is_retake` | tinyint(3) unsigned | 否 | — | 是否允许补考:0-否,1-是 |
| `is_rjcs_exam` | tinyint(3) unsigned | 否 | — | 是否允许后加入班级的学生参加考试:0-否,1-是 |
| `is_late_exam` | tinyint(3) unsigned | 否 | — | 是否允许迟到考试:0-否,1-是 |
| `exam_student` | text | 是 | — | 参考学生集合，学生的uid集合 |
| `should_exam_sum` | int(10) unsigned | 否 | — | 应试学生数 |
| `exam_end_sum` | int(10) unsigned | 否 | — | 交卷学生数 |
| `tobe_reviewed_sum` | smallint(5) unsigned | 否 | — | 待批阅学生数 |
| `is_display` | tinyint(3) unsigned | 否 | — | 客户端是否显示:0-显示,1-隐藏 |
| `is_judge` | tinyint(3) unsigned | 否 | — | 是否需要手动批阅: 0历史数据 1是 2否 |
| `status` | tinyint(3) unsigned | 否 | — | 考试状态:5-进行中,10-未开始,15-已结束 |
| `source` | tinyint(3) unsigned | 否 | — | 来源端:0-未知,1-EEO后台,2-客户端 |
| `ext` | text | 是 | — | 其他扩展信息 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除:0-未删除,1-已删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间 （unix时间戳） |

<a id="a12"></a>

### A12. eo_osexam.eeo_exam_student_answer

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 9 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | ID 自增唯一id |
| `student_exam_id` | bigint(20) unsigned | 否 | MUL | 学生考试ID 学生考试唯一id |
| `student_uid` | bigint(20) unsigned | 否 | MUL | 学生UID |
| `exam_id` | bigint(20) unsigned | 否 | — | 考试ID ，对应活动信息表中的biz_id，业务类型biz_type=3 |
| `exam_topic_id` | bigint(20) unsigned | 否 | — | 试题ID 每份试卷包含多个试题 |
| `answer_info` | mediumtext | 是 | — | 作答信息 json 格式，topicId 主观题id，answer 为html格式 topicSource 试题来源 0 = 个人题库、1 = CLASSIN题库、2 = 组织题库 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除:0-未删除,1-已删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间 （unix时间戳） |

<a id="a13"></a>

### A13. eo_osexam.eeo_exam_student_infos

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 24 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `student_exam_id` | bigint(20) unsigned | 否 | PRI | 学生考试唯一id |
| `exam_id` | bigint(20) unsigned | 否 | MUL | 考试ID ，对应活动信息表中的biz_id，业务类型biz_type=3 |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构唯一标识，多表关联机构维度 |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级ID，班级、课节、成员、活动关联核心字段 |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 阅卷教师UID |
| `student_uid` | bigint(20) unsigned | 否 | MUL | 学生UID |
| `answer_info` | text | 是 | — | 作答信息 json数组，topicId 题目id、answer 学生作答结果 |
| `marking_info` | text | 是 | — | 阅卷信息 json数组，topicId 题目id、sysJudge 是否是系统阅卷 0是 1否 ，judgeResult 系统批阅结果，score 该题得分 |
| `result_info` | text | 是 | — | 学生考试结果统计 json格式，correctRate 得分率 |
| `start_time` | int(10) unsigned | 否 | — | 作答开始时间 （unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 作答结束时间 （unix时间戳） |
| `marking_time` | int(10) unsigned | 否 | — | 阅卷时间 （unix时间戳） |
| `review_teacher_uid` | bigint(20) unsigned | 否 | — | 批阅人UID |
| `is_retake` | tinyint(3) unsigned | 否 | — | 是否补考:0-否,1-是 |
| `is_exam_end` | tinyint(3) unsigned | 否 | — | 是否交卷:0-否,1-是 |
| `exam_score` | int(10) unsigned | 否 | — | 考试得分 |
| `status` | tinyint(3) unsigned | 否 | — | 学生作答批阅状态: 0未作答 3作答中 6已批阅 9待批阅 |
| `ext` | text | 是 | — | 其他扩展信息 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除:0-未删除,1-已删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间 （unix时间戳） |
| `read_at` | int(10) unsigned | 否 | — | 首次查看时间 （unix时间戳） |
| `au_warn` | int(11) | 否 | — | 自动提醒时间 （unix时间戳） |
| `is_remove` | tinyint(3) unsigned | 否 | — | **待核**：是否移出课程:0-否,1-是  ? |

<a id="a14"></a>

### A14. eo_osexam.eeo_exam_topic

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 22 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 自增试题ID |
| `uid` | bigint(20) unsigned | 否 | — | 用户ID |
| `title` | varchar(100) | 否 | — | 标题 |
| `type` | tinyint(3) unsigned | 否 | — | 题型 0-未知，1-单选题，2-多选题,3-判断题，4-填空，5-问答，6-综合题 |
| `label` | varchar(50) | 否 | — | 标记 |
| `content` | text | 否 | — | 题干 |
| `options` | varchar(5000) | 否 | — | 选项 |
| `analyse` | text | 否 | — | 分析 |
| `method` | text | 否 | — | 解答 |
| `discuss` | text | 否 | — | 点评 |
| `answers` | varchar(5000) | 否 | — | 答案 |
| `points` | varchar(500) | 否 | — | 知识点 |
| `degree` | float(2,1) unsigned | 否 | — | 难度 |
| `score` | int(10) unsigned | 否 | — | 分数 |
| `real_count` | int(10) unsigned | 否 | — | **待核**：真题次数 ？ |
| `include_at` | int(10) unsigned | 否 | — | 收录时间（unix时间戳） |
| `tags` | varchar(200) | 否 | — | 标签 |
| `channel` | tinyint(3) unsigned | 否 | — | 渠道: 1菁优 2ClassIn |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 1显示 2删除 3草稿 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间 （unix时间戳） |

<a id="a15"></a>

### A15. eo_osexam.eeo_exam_topics

来源：在线知识库《105.2-原始数据-LMS活动-考试测验.md》；2026-09-15 元数据核验 16 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `exam_topic_id` | bigint(20) unsigned | 否 | PRI | 试题ID |
| `user_id` | bigint(20) unsigned | 否 | MUL | 所属用户ID |
| `exam_topic_no` | varchar(255) | 否 | — | 试题编号 |
| `topic_version` | varchar(255) | 否 | — | 题目版本号 |
| `exam_topic_type` | tinyint(3) unsigned | 否 | — | 试题类型:0-未知，1-单选题，2-多选题,3-判断题，4-填空，5-问答，6-综合题 |
| `exam_topic_title` | varchar(255) | 否 | — | 试题标题 |
| `exam_topic_info` | mediumtext | 是 | — | 试题信息 json 格式，topicDry 试题问答内容，optionId代表选项id, optionKey 代表对应选项英文字母 （对应A、B、C、D），判断题则对应为R、W，optionValue 选项值，correctAnswer 正确答案 |
| `degree` | float(10,2) unsigned | 否 | — | 难度：1易 2较易 3中档 4较难 5难 |
| `school_uid` | bigint(20) | 否 | — | 机构UID |
| `source` | tinyint(3) unsigned | 否 | — | 来源端:0-未知,1-EEO后台,2-客户端 |
| `ext` | text | 是 | — | 其他扩展信息 |
| `is_del` | tinyint(3) unsigned | 否 | — | 是否删除:0-未删除,1-已删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间 （unix时间戳） |
| `parent_id` | bigint(20) unsigned | 否 | MUL | 父级试题ID |
| `sub_topics` | text | 是 | — | 子试题ID（json数组） |

<a id="a16"></a>

### A16. eo_oslms.record_class

来源：在线知识库《105.5-原始数据-LMS活动-录播课.md》；2026-09-15 元数据核验 23 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增，录播课id |
| `course_id` | bigint(20) unsigned | 否 | — | 班级id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 教师uid |
| `title` | varchar(200) | 否 | — | 录播课标题 |
| `describe` | mediumtext | 否 | — | 录播课简介 |
| `video` | text | 是 | — | 视频信息json |
| `start_time` | int(10) unsigned | 否 | — | 开始时间（unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束时间（unix时间戳） |
| `video_duration` | int(10) unsigned | 否 | — | 视频总时长（单位：秒） |
| `student_total` | int(10) unsigned | 否 | — | 学生总数 |
| `check_total` | int(10) unsigned | 否 | — | 学生已查看总数 |
| `is_fast` | tinyint(3) unsigned | 否 | — | 是否允许学生倍速观看视频: 0-否，1-是 |
| `is_drag` | tinyint(3) unsigned | 否 | — | 首次播放是否允许学生拖动播放条: 0-否，1-是 |
| `is_mutual_look` | tinyint(3) unsigned | 否 | — | 是否允许学生间互相查看学习进度: 0-否，1-是 |
| `is_end_look` | tinyint(3) unsigned | 否 | — | 是否允许学生结束后观看: 0-否，1-是 |
| `is_caption` | tinyint(3) unsigned | 否 | — | 是否显示防录屏跑马灯: 0-否，1-是 |
| `auto_add` | tinyint(3) unsigned | 否 | — | 开放给后加入班级学生: 0-不开放，1-开放 |
| `play_max` | smallint(5) unsigned | 否 | — | 限制播放次数 |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 0-未开始，1-进行中，2-已结束 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a17"></a>

### A17. eo_oslms.record_class_students

来源：在线知识库《105.5-原始数据-LMS活动-录播课.md》；2026-09-15 元数据核验 11 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `record_id` | bigint(20) unsigned | 否 | PRI | 录播课id（关联eo_oslms.record_class表主键） |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `course_id` | bigint(20) unsigned | 否 | — | 班级id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `check_time` | int(10) unsigned | 否 | — | 首次查看时间（unix时间戳） |
| `duration` | int(10) unsigned | 否 | — | 累计观看时长（单位：秒） |
| `rate_duration` | int(10) unsigned | 否 | — | 观看总进度率 |
| `video_end` | varchar(1000) | 否 | — | 已完播视频file_id集合，json数组 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a18"></a>

### A18. eo_oslms.record_class_student_videos

来源：在线知识库《105.5-原始数据-LMS活动-录播课.md》；2026-09-15 元数据核验 13 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `record_id` | bigint(20) unsigned | 否 | PRI | 录播课id(关联eo_oslms.record_class表主键) |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `file_id` | bigint(20) unsigned | 否 | PRI | 视频文件id，eo_osfile.eeo_files表主键 |
| `total_play_sec` | int(10) unsigned | 否 | — | 视频累计观看时长 单位：秒 |
| `play_bar_sec` | int(10) unsigned | 否 | — | 最近一次观看进度条位置 单位：秒 |
| `play_bar_max` | int(10) unsigned | 否 | — | 最大一次观看进度条位置 单位：秒 |
| `play_valid_sec` | int(10) unsigned | 否 | — | 有效观看时长 单位：秒 |
| `play_valid_num` | int(10) unsigned | 否 | — | 有效观看次数 |
| `play_num_part` | text | 是 | — | 观看次数片段 |
| `play_part` | text | 是 | — | 活动期间观看片段 |
| `play_part_end` | text | 是 | — | 活动结束观看片段 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a19"></a>

### A19. eo_oslms.learning_materials

来源：在线知识库《105.4-原始数据-LMS活动-学习资料.md》；2026-09-15 元数据核验 20 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增，学习资料id |
| `course_id` | bigint(20) unsigned | 否 | — | 班级id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 教师uid |
| `title` | varchar(200) | 否 | — | 学习资料标题 |
| `describe` | mediumtext | 否 | — | 学习资料内容 |
| `image` | varchar(5000) | 否 | — | 图片附件信息json |
| `video` | varchar(5000) | 否 | — | 视频附件信息json |
| `audio` | varchar(5000) | 否 | — | 音频附件信息json |
| `docs` | text | 否 | — | 文档附件信息json |
| `start_time` | int(10) unsigned | 否 | — | 开始时间（unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束时间（unix时间戳） |
| `student_total` | int(10) unsigned | 否 | — | 学生总数 |
| `check_total` | int(10) unsigned | 否 | — | 学生已查看总数 |
| `auto_add` | tinyint(3) unsigned | 否 | — | 开放给后加入班级学生: 0-不开放，1-开放 |
| `is_download` | tinyint(3) unsigned | 否 | — | 是否允许学生下载附件: 0-否，1-是 |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 0-未开始，1-进行中，2-已结束 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a20"></a>

### A20. eo_oslms.learning_materials_students

来源：在线知识库《105.4-原始数据-LMS活动-学习资料.md》；2026-09-15 元数据核验 10 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `materials_id` | bigint(20) unsigned | 否 | PRI | 学习资料id |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `course_id` | bigint(20) unsigned | 否 | — | 班级id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `check_time` | int(10) unsigned | 否 | — | 首次查看时间（unix时间戳） |
| `check_total` | int(10) unsigned | 否 | — | 查看次数 |
| `score_percent` | char(10) | 否 | — | 得分率 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a21"></a>

### A21. eo_osanswer_sheet.answer_sheet

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 16 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id 答题卡id |
| `title` | varchar(200) | 否 | — | 答题卡标题 |
| `description` | mediumtext | 否 | — | 答题卡描述说明 |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 教师 UID |
| `start_time` | int(10) unsigned | 否 | — | 开始时间 （unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束时间 （unix时间戳） |
| `total_score` | decimal(10,2) unsigned | 否 | — | 总分，满分 |
| `time_limit` | int(10) unsigned | 否 | — | 答题限时，单位：秒，0不限时 |
| `check_type` | tinyint(3) unsigned | 否 | — | 学生可互相查看作答和成绩的时机: 0不可查看 1提交后 2被批阅后 3结束后 |
| `open_type` | tinyint(3) unsigned | 否 | — | 公开答案和解析的时机：0不公开 1提交后 2被批阅后 3结束后 |
| `is_retake` | tinyint(3) unsigned | 否 | — | 是否允许补交：0否 1是 |
| `class_id` | bigint(20) unsigned | 否 | — | 课节表主键 ID，课节id（只针对教室内的答题卡） |
| `blank_answer_diff` | tinyint(3) | 否 | — | 填空作答与答案不一致时的处理方案：0-判错 1-需要手动批阅 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除：0否 1是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 （unix时间戳） |

<a id="a22"></a>

### A22. eo_osanswer_sheet.answer_sheet_content

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 7 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `answer_sheet_id` | bigint(20) unsigned | 否 | PRI | 答题卡id，对应活动信息表中的biz_id，业务类型biz_type=7 |
| `max_question_id` | int(10) unsigned | 否 | — | 答题卡中的最大题号 |
| `content` | mediumtext | 否 | — | 内容 为json结构，singleChoice代表单选题、multipleChoice代表多选题、judge代表判断题。每种题型包含questionId 题号、questionType 题型、answer 答案、option 选项个数、score 满分、halfScore 半对分数 orderId 展示序号 |
| `structure` | varchar(500) | 否 | — | 试卷构成 json 结构，singleChoice代表单选题、multipleChoice代表多选题、judge代表判断题。 number 题目数量、percent 该题型分数对应整个答题卡占比 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除：0否 1是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 （unix时间戳） |

<a id="a23"></a>

### A23. eo_osanswer_sheet.answer_sheet_option_analyze

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 9 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `answer_sheet_id` | bigint(20) unsigned | 否 | PRI | 答题卡id，对应活动信息表中的biz_id，业务类型biz_type=7 |
| `question_id` | int(10) unsigned | 否 | PRI | 答题卡中的题号 |
| `option_order` | tinyint(3) unsigned | 否 | PRI | 选项序号 |
| `student_uid_list` | text | 否 | — | 学生集合，学生的uid集合 |
| `student_num` | int(10) unsigned | 否 | — | 学生人数 |
| `correct_score` | decimal(10,2) unsigned | 否 | — | 本试题总得分 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除：0否 1是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 （unix时间戳） |

<a id="a24"></a>

### A24. eo_osanswer_sheet.answer_sheet_student

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 13 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `answer_sheet_id` | bigint(20) unsigned | 否 | PRI | 答题卡id，对应活动信息表中的biz_id，业务类型biz_type=7 |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `start_time` | int(10) unsigned | 否 | — | 开始作答时间 （unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束作答时间 （unix时间戳） |
| `status` | tinyint(3) unsigned | 否 | — | 测验状态：0未作答 1作答中 2待批阅 3已批阅 |
| `is_retake` | tinyint(3) unsigned | 否 | — | 是否补考：0否 1是 |
| `review_type` | tinyint(3) unsigned | 否 | — | 批阅类型：0系统 1老师 |
| `review_time` | int(10) unsigned | 否 | — | 批阅时间 |
| `score` | decimal(10,2) unsigned | 否 | — | 得分 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除：0否 1是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 （unix时间戳） |
| `review_teacher_uid` | bigint(20) | 否 | — | 批阅教师uid |

<a id="a25"></a>

### A25. eo_osanswer_sheet.answer_sheet_student_detail

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 7 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `answer_sheet_id` | bigint(20) unsigned | 否 | PRI | 答题卡id，对应活动信息表中的biz_id，业务类型biz_type=7 |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `answer_detail` | mediumtext | 否 | — | 作答详情 |
| `review_detail` | text | 否 | — | 批阅详情，为json格式，questionId代表题号id；reviewDetail批阅状态 1代表正确，2代表错误，3代表半对； score为该题得分；rate 为该题得分率 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 （unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 （unix时间戳） |

<a id="a26"></a>

### A26. eo_osanswer_sheet.answer_sheet_student_quiz_detail

来源：在线知识库《105.6-原始数据-LMS活动-答题卡.md》；2026-09-15 元数据核验 8 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `answer_sheet_id` | bigint(20) unsigned | 否 | PRI | 答题卡id，对应活动信息表中的biz_id，业务类型biz_type=7 |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `question_id` | smallint(5) unsigned | 否 | PRI | 答题卡对应试题的题号 |
| `answer_detail` | mediumtext | 否 | — | 作答详情（html格式） |
| `review_detail` | mediumtext | 否 | — | 批阅详情 为json格式，questionId 代表题号id；reviewDetail批阅状态 1代表正确，2代表错误，3代表半对； score 为学生该题得分；rate 为该题得分率 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |

<a id="a27"></a>

### A27. eo_lms_clock.clock_setting

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 11 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 自增主键，打卡设置表ID（不是打卡的业务表，是打卡设置表） |
| `activity_id` | bigint(20) unsigned | 否 | UNI | 活动id（关联活动信息表主键） |
| `start_time` | int(10) unsigned | 否 | — | 开始时间（unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束时间（unix时间戳） |
| `frequency` | varchar(20) | 否 | — | 打卡日，JSON数组，值在1-7（表示星期几）区间内 |
| `clock_dates` | varchar(5000) | 否 | — | 需打卡日期，JSON数组，值是打卡日0点时间戳（北京时间） |
| `clock_days` | smallint(5) unsigned | 否 | — | 需打卡天数 |
| `remind_time` | varchar(6) | 否 | — | 打卡提醒时间（相对于0点的秒数） |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a28"></a>

### A28. eo_lms_clock.clock_student_statistics

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 11 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `clock_id` | bigint(20) unsigned | 否 | PRI | 打卡设置表主键id |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `clock_days` | smallint(5) unsigned | 否 | MUL | 已打卡天数 |
| `late_days` | smallint(5) unsigned | 否 | — | 补卡天数 |
| `continuous_days` | smallint(5) unsigned | 否 | — | 最长连续打卡天数 |
| `last_submit_time` | int(10) unsigned | 否 | — | 最后提交时间（unix时间戳） |
| `prev_rank` | smallint(5) unsigned | 否 | — | 上次排名 |
| `current_rank` | smallint(5) unsigned | 否 | — | 当前排名 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0否 1是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a29"></a>

### A29. eo_oslms_homework.homework

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 14 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 自增主键，打卡作业id |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 教师uid |
| `title` | varchar(200) | 否 | — | 标题 |
| `description` | mediumtext | 否 | — | 描述 |
| `files` | text | 否 | — | 附件JSON |
| `start_time` | int(10) unsigned | 否 | — | 开始时间（unix时间戳） |
| `end_time` | int(10) unsigned | 否 | — | 结束时间（unix时间戳） |
| `is_open` | tinyint(3) unsigned | 否 | — | 是否公开: 0-否，1-是 |
| `is_allow_late` | tinyint(3) unsigned | 否 | — | 是否允许补交: 0-否，1-是 |
| `late_limit` | tinyint(3) unsigned | 否 | — | 允许补卡期限（天）: 1-30数字,默认为0没有时限 |
| `type` | tinyint(3) unsigned | 否 | — | 字典提示：类型: 1-普通作业，2-打卡作业，3-小组作业（现在只有2，打卡作业） |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a30"></a>

### A30. eo_oslms_homework.homework_mark_log

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 13 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 学生打卡作业批阅日志id，自增主键 |
| `is_score` | tinyint(20) | 否 | — | 是否评分: 0-否，1-是 |
| `grade_method` | tinyint(20) | 否 | — | 评分方式: 0-老师评分，1-系统评分 |
| `rate` | int(10) | 否 | — | 得分率 |
| `show_grade` | varchar(500) | 否 | — | 成绩（评分展示） |
| `mark_uid` | bigint(20) unsigned | 否 | — | 批阅者uid |
| `comment` | text | 否 | — | 老师评论 |
| `files` | text | 否 | — | 评论附件json |
| `is_excellent` | tinyint(3) unsigned | 否 | — | 是否优秀: 0-否，1-是 |
| `score_record_id` | bigint(20) unsigned | 否 | — | 素养成绩记录ID |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a31"></a>

### A31. eo_oslms_homework.homework_submit_log

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 7 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 学生打卡作业提交日志id，自增主键 |
| `submit_uid` | bigint(20) unsigned | 否 | — | 提交打卡的用户uid |
| `is_lated` | tinyint(3) unsigned | 否 | — | 是否补交: 0-否，1-是 |
| `is_emend` | tinyint(3) unsigned | 否 | — | 是否订正过：0-否，1-是 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a32"></a>

### A32. eo_oslms_homework.homework_student_record

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 16 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 学生打卡作业提交记录id，自增主键 |
| `homework_id` | bigint(20) unsigned | 否 | MUL | 作业表主键id |
| `student_uid` | bigint(20) unsigned | 否 | — | 学生uid |
| `submit_date` | int(10) unsigned | 否 | — | 提交日0点时间戳,非打卡作业为0 |
| `description` | text | 否 | — | 提交内容 |
| `files` | text | 否 | — | 附件JSON |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 1-已提交，2-已批阅 |
| `is_lated` | tinyint(3) unsigned | 否 | — | 是否补交: 0-否，1-是 |
| `is_emend` | tinyint(3) unsigned | 否 | — | 是否订正过: 0-否，1-是 |
| `is_reform` | tinyint(3) unsigned | 否 | — | 是否打回过: 0-否，1-是 |
| `last_submit_time` | int(10) unsigned | 否 | — | 最后提交时间（unix时间戳） |
| `is_excellent` | tinyint(3) unsigned | 否 | — | 是否优秀: 0-否，1-是 |
| `like_times` | smallint(5) unsigned | 否 | — | 提交日点赞次数 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a33"></a>

### A33. eo_oslms_homework.homework_student_log

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 12 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id |
| `homework_id` | bigint(20) unsigned | 否 | MUL | 作业id |
| `object_id` | bigint(20) unsigned | 否 | — | 作业对象ID（学生/小组id/学生打卡作业提交记录id），关联 eo_oslms_homework.homework_student_record表主键 |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 0-未作答，1-已提交，2-已批阅，3-被打回，4-已订正 |
| `content` | text | 否 | — | 学生作答内容 |
| `files` | text | 否 | — | 学生作答附件JSON |
| `content_type` | tinyint(3) unsigned | 否 | — | 内容类型: 0-提交，1-批阅 |
| `content_id` | bigint(20) unsigned | 否 | — | 内容ID （关联 eo_oslms_homework.homework_mark_log 和 eo_oslms_homework.homework_submit_log 表主键） |
| `latest` | tinyint(3) | 否 | — | 是否为最新: 0-否，1-是，-1 -最旧 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a34"></a>

### A34. eo_oslms_homework.homework_student

来源：在线知识库《105.1-原始数据-LMS活动-打卡.md》；2026-09-15 元数据核验 8 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `homework_id` | bigint(20) unsigned | 否 | PRI | 主键id |
| `student_uid` | bigint(20) unsigned | 否 | PRI | 学生uid |
| `excellent_times` | smallint(5) unsigned | 否 | — | 优秀次数 |
| `like_times` | smallint(5) unsigned | 否 | — | 总点赞次数 |
| `rates` | int(10) | 否 | — | 得分率 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

<a id="a35"></a>

### A35. eo_oslms_scorm.scorm

来源：在线知识库《105.9-原始数据-LMS活动-SCORM.md》；2026-09-15 元数据核验 10 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键 |
| `activity_id` | bigint(20) unsigned | 否 | — | 活动ID |
| `course_id` | bigint(20) unsigned | 否 | — | 班级ID |
| `school_id` | bigint(20) unsigned | 否 | — | 机构uid |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 老师uid |
| `title` | varchar(256) | 否 | — | 标题 |
| `description` | mediumtext | 是 | — | 描述 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |

<a id="a36"></a>

### A36. eo_oslms_scorm.scorm_file

来源：在线知识库《105.9-原始数据-LMS活动-SCORM.md》；2026-09-15 元数据核验 11 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键 |
| `scorm_id` | bigint(20) unsigned | 否 | MUL | SCORM活动的业务ID |
| `lms_file_id` | bigint(20) unsigned | 否 | — | LMS附件id（对应eo_oslms_file.lms_file表的id）字段. |
| `cloud_disk_file_id` | bigint(20) unsigned | 否 | — | 对应云盘附件id（eo_osfile.eeo_files总表中的file_id） |
| `cloud_disk_file_path` | varchar(512) | 否 | — | 云盘存储路径 |
| `scorm_base_info` | mediumtext | 否 | — | scorm 基础展示信息（JSON） |
| `scorm_info` | mediumtext | 否 | — | scorm解析内容（JSON） |
| `scorm_setting` | mediumtext | 否 | — | 字典提示：scorm设置内容（暂空） |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间 |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间 |

<a id="a37"></a>

### A37. eo_oslms_scorm.scorm_student

来源：在线知识库《105.9-原始数据-LMS活动-SCORM.md》；2026-09-15 元数据核验 17 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键 |
| `scorm_id` | bigint(20) unsigned | 否 | MUL | SCORM活动的业务ID |
| `activity_id` | bigint(20) unsigned | 否 | — | 活动ID |
| `student_uid` | bigint(20) unsigned | 否 | — | 学生uid |
| `status` | tinyint(3) unsigned | 否 | — | 0-未参与 1-参与中 2-已完成 3-已批阅 |
| `learn_duration` | varchar(255) | 否 | — | 学习总时长（HH:MM:SS） |
| `learn_rate` | varchar(255) | 否 | — | 学习进度（小数表示百分比） |
| `sco_comp_status` | varchar(255) | 否 | — | 答题完成状态 |
| `sco_succ_status` | varchar(255) | 否 | — | 答题通过状态 |
| `score_percent` | varchar(256) | 否 | — | 活动成绩（得分率） |
| `sco_result` | varchar(255) | 否 | — | 活动成绩（分数） |
| `ext` | varchar(256) | 否 | — | 扩展字段 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `completed_at` | int(10) unsigned | 否 | — | 完成时间（unix时间戳） |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |
| `total_time` | int(10) unsigned | 否 | — | 总学习时长（秒） |

<a id="a38"></a>

### A38. eo_oslms_scorm.scorm_student_record

来源：在线知识库《105.9-原始数据-LMS活动-SCORM.md》；2026-09-15 元数据核验 9 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键 |
| `activity_id` | bigint(20) unsigned | 否 | — | 活动ID |
| `scorm_id` | bigint(20) unsigned | 否 | MUL | scorm活动业务id |
| `student_uid` | bigint(20) unsigned | 否 | — | 学生uid |
| `content` | mediumtext | 否 | — | 活动报告数据（json） |
| `scorm_result` | varchar(128) | 否 | — | 字典提示：成绩数据（暂空） |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 修改时间（unix时间戳） |

<a id="a39"></a>

### A39. eo_oslms_ai_reading.reading

来源：在线知识库《105.3-原始数据-LMS活动-英语语文学科活动.md》；2026-09-15 元数据核验 8 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id，对应lms_activity 表中 biz_type(业务类型) 为 (10,11,12,13,14,15) 的数据中的 biz_id 字段 |
| `teacher_uid` | bigint(20) unsigned | 否 | — | 教师uid |
| `title` | varchar(512) | 否 | — | 活动的标题 |
| `question_ids` | text | 否 | — | 所有朗读试题id（eo_oslms_ai_reading.reading_question主键id）,作为排序依赖 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `biz_type` | tinyint(4) unsigned | 否 | — | 业务类型: 10-英语跟读，11-英语背诵，12-英语听写，13-语文跟读，14-语文背诵，15-语文生字听写 |

<a id="a40"></a>

### A40. eo_oslms_ai_reading.reading_question

来源：在线知识库《105.3-原始数据-LMS活动-英语语文学科活动.md》；2026-09-15 元数据核验 13 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id，英语语文学科活动试题表id |
| `reading_id` | bigint(20) unsigned | 否 | MUL | 阅读活动id，关联eo_oslms_ai_reading.reading表id |
| `content` | text | 否 | — | 题干文本 |
| `type` | tinyint(3) | 否 | — | 试题类型: 英语试题（1-单词，2-句子）语文试题（1-字，2-词，3-句/段，4-诗词） |
| `audio` | varchar(512) | 否 | — | 音频（标准音）文件 lms_file_id |
| `paraphrase` | text | 否 | — | 释义 |
| `phonetic` | text | 否 | — | 音标,句子没有音标 |
| `sum_rate` | bigint(20) | 否 | — | 总得分率 |
| `word_sum_rate` | mediumtext | 否 | — | 单词维度总得分率 |
| `ext` | text | 是 | — | 拓展字段 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `is_deleted` | tinyint(3) | 否 | — | 是否删除: 0-否，1-是 |

<a id="a41"></a>

### A41. eo_oslms_ai_reading.reading_student

来源：在线知识库《105.3-原始数据-LMS活动-英语语文学科活动.md》；2026-09-15 元数据核验 21 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id |
| `reading_id` | bigint(20) unsigned | 否 | MUL | 英语语文学科活动业务id，关联eo_oslms_ai_reading.reading表id |
| `student_uid` | bigint(20) unsigned | 否 | — | 学生uid |
| `is_excellent` | smallint(5) unsigned | 否 | — | 是否优秀: 0-否，1-是 |
| `rate` | bigint(20) | 否 | — | 得分率乘1000000 |
| `review_comment` | text | 否 | — | 老师评论 |
| `review_files` | text | 否 | — | 评论附件json |
| `ability_score_record_id` | bigint(20) unsigned | 否 | — | 素养成绩记录ID |
| `review_uid` | bigint(20) unsigned | 否 | — | 批阅者uid |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 0-待提交，1-已提交，2-已批阅，3-打回 |
| `is_lated` | tinyint(3) unsigned | 否 | — | 是否补交: 0-否，1-是 |
| `is_emend` | tinyint(3) unsigned | 否 | — | 是否订正过: 0-否，1-是 |
| `is_reform` | tinyint(3) unsigned | 否 | — | 是否打回过: 0-否，1-是 |
| `last_submit_time` | int(10) unsigned | 否 | — | 最后提交时间（unix时间戳），该活动类型为10时有值，其他活动类型为0（其他活动类型的该值保存在eo_oslms.lms_activity_student的status字段） |
| `last_review_time` | int(10) unsigned | 否 | — | 最后批阅时间（unix时间戳），该活动类型为10时有值，其他活动类型为0（其他活动类型的该值保存在eo_oslms.lms_activity_student的status字段） |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `ai_show_grade` | varchar(512) | 否 | — | AI评分展示 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `ai_review_rate` | bigint(20) | 否 | — | ai评测得分 |
| `answer_ext` | text | 是 | — | 学生作答拓展字段 |

<a id="a42"></a>

### A42. eo_oslms_ai_reading.reading_student_question

来源：在线知识库《105.3-原始数据-LMS活动-英语语文学科活动.md》；2026-09-15 元数据核验 14 列，名称与类型一致。

| 字段 | 实测类型 | 可空 | 索引标志 | 业务意义 / 枚举 / 限制 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id |
| `reading_id` | bigint(20) unsigned | 否 | MUL | 英语语文学科活动id，关联eo_oslms_ai_reading.reading表id |
| `student_uid` | bigint(20) unsigned | 否 | — | 学生uid |
| `question_id` | bigint(20) unsigned | 否 | — | 英语语文学科活动问试题表id,eo_oslms_ai_reading.reading_question的主键id |
| `answer_audio` | varchar(512) | 否 | — | 学生作答音频文件，lms_file_id |
| `ai_review_rate` | bigint(20) | 否 | — | ai评测得分 |
| `tea_review_rate` | bigint(20) | 否 | — | 教师评测得分 |
| `ai_review_ext` | mediumtext | 否 | — | ai评测拓展字段-存流利度、完整度等细粒度分数 |
| `tea_review_ext` | text | 否 | — | 教师评测拓展字段-存流利度、完整度等细粒度分数 |
| `review_uid` | bigint(20) unsigned | 否 | — | 批阅者uid |
| `status` | tinyint(3) unsigned | 否 | — | 状态: 0-待提交，1-已提交，2-已批阅 |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

## 附录 B：12 张数仓视图 / 238 个字段的当前可用结构

以下仅为此次在线 207 字典明确列出且本次核验成功的视图，不代表其余原始表都未入仓。没有映射的表需要检索血缘或向数据平台补全，不能按名称臆造视图。_df/_7df 查询需指定 dt；_f 视图没有 dt 列的，不擅自添加分区条件。所有视图仍按数仓延迟读取，不用于实时缺勤。

字段表含完整实测列名、类型与说明；Impala 返回未提供可空/索引属性，故不推断。

| 视图 | 字段数 | 原始对应 / 差异 |
| --- | --- | --- |
| eo_pdviews.ods_ms_eo_oslms_lms_activity_df_view | 29 | 对应 lms_activity；数仓缺 passing_score，新增 dt |
| eo_pdviews.ods_ms_eo_oslms_learning_materials_df_view | 21 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_learning_materials_students_f_view | 10 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_record_class_f_view | 19 | 对应 record_class；缺 is_mutual_look/is_end_look/is_caption/play_max |
| eo_pdviews.ods_ms_eo_oshw_eeo_course_homework_7df_view | 37 | 对应作业主表；新增 dt，score_type 注释尚未覆盖值5 |
| eo_pdviews.ods_ms_eo_oshw_eeo_course_homework_students_7df_view | 48 | 对应作业学生；score_p 原始 char(10) → 数仓 float，新增 dt，score_type 注释过时 |
| eo_pdviews.ods_ms_eo_oslms_lms_activity_student_ai_f_view | 13 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_lms_activity_ai_config_f_view | 6 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_f_view | 8 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_question_f_view | 13 | 参见下方完整字段 |
| eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_student_f_view | 20 | 对应 reading_student；缺 answer_ext；时间列类型不同 |
| eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_student_question_f_view | 14 | 参见下方完整字段 |

### B1. eo_pdviews.ods_ms_eo_oslms_lms_activity_df_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构uid |
| `category_id` | bigint | 班内课程分类 ID |
| `teacher_uid` | bigint | 教师uid |
| `name` | string | 活动标题 |
| `unit_id` | bigint | 单元id |
| `biz_id` | bigint | 业务id |
| `biz_type` | int | 业务类型: 1课堂 2作业 3测验 4录播课 5学习资料 6讨论 |
| `status_info` | string | 业务信息json |
| `start_time` | int | 开始时间 |
| `end_time` | int | 结束时间 |
| `is_all_student` | int | 是否全部学生: 0否 1是 |
| `is_score` | int | 是否评分: 0不评分 1评分 |
| `max_score` | int | 满分 |
| `system_method` | int | 评分方式: 0手动评分 1自动评分 |
| `system_grade_rule_id` | bigint | 自动评分规则id |
| `grade_display_id` | bigint | 评分显示方案id |
| `unit_order_id` | int | 单元顺序值 |
| `order_id` | int | 顺序值 |
| `publish_flag` | int | 发布标识: 0草稿 1隐藏 2显示 |
| `process_flag` | int | 状态: 0未开始 1进行中 2已结束 |
| `creator_uid` | bigint | 创建人uid |
| `is_deleted` | int | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |
| `student_total` | smallint | 活动学生总数 |
| `score_weight_id` | bigint | 评分权重id |
| `dt` | string | 分区日期 |

### B2. eo_pdviews.ods_ms_eo_oslms_learning_materials_df_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构uid |
| `teacher_uid` | bigint | 教师uid |
| `title` | string | 学习资料标题 |
| `describe` | string | 学习资料内容 |
| `image` | string | 图片信息json |
| `video` | string | 视频信息json |
| `audio` | string | 音频信息json |
| `docs` | string | 文档信息json |
| `start_time` | int | 开始时间 |
| `end_time` | int | 结束时间 |
| `student_total` | int | 学生总数 |
| `check_total` | int | 学生已查看总数 |
| `auto_add` | tinyint | 开放给后加入班级学生: 0不开放 1开放 |
| `is_download` | tinyint | 是否允许学生下载附件: 0否 1是 |
| `status` | tinyint | 状态: 0未开始 1进行中 2已结束 |
| `is_deleted` | tinyint | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |
| `dt` | string | 分区日期 |

### B3. eo_pdviews.ods_ms_eo_oslms_learning_materials_students_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `materials_id` | bigint | 学习资料id |
| `student_uid` | bigint | 学生uid |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构uid |
| `check_time` | int | 首次查看时间 |
| `check_total` | int | 查看总数 |
| `score_percent` | string | 得分率 |
| `is_deleted` | int | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |

### B4. eo_pdviews.ods_ms_eo_oslms_record_class_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构uid |
| `teacher_uid` | bigint | 教师uid |
| `title` | string | 录播课标题 |
| `describe` | string | 录播课简介 |
| `video` | string | 视频信息json |
| `start_time` | int | 开始时间 |
| `end_time` | int | 结束时间 |
| `video_duration` | int | 视频总时长(秒) |
| `student_total` | int | 学生总数 |
| `check_total` | int | 学生已查看总数 |
| `is_fast` | int | 是否允许倍速观看: 0否 1是 |
| `is_drag` | int | 是否允许拖动进度条: 0否 1是 |
| `auto_add` | int | 开放给后加入学生: 0不开放 1开放 |
| `status` | int | 状态: 0未开始 1进行中 2已结束 |
| `is_deleted` | int | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |

### B5. eo_pdviews.ods_ms_eo_oshw_eeo_course_homework_7df_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `homework_id` | bigint | 作业id |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `teacher_uid` | bigint | 教师id |
| `homework_title` | string | 作业标题 |
| `homework_desc` | string | 作业描述 |
| `image` | string | 图片地址 |
| `video` | string | 视频地址 |
| `audio` | string | 音频地址 |
| `problems_ids` | string | 题库id |
| `status` | tinyint | 1：进行中，2：已结束，3：已删除 |
| `is_open` | tinyint | 是否公开 1：是，2：否 |
| `end_time` | int | 结束时间 |
| `update_time` | int | 更新时间 |
| `add_time` | int | 添加时间 |
| `school_uid` | bigint | 机构id |
| `score_type` | tinyint | 评分类型 1：百分,2:十分,3:等第,4:不评分；旧注释，按第4节原始字典及评分方案补核 |
| `docs` | string | 文档地址 |
| `is_revise` | tinyint | 是否允许作业结束后提交：1否，2是 |
| `open_type` | tinyint | 公开类型：1结束后公开，2提交后公开，3批阅后公开 |
| `start_time` | int | 作业开始时间 |
| `score_value` | string | 分数默认值 |
| `is_del` | tinyint | 是否删除 0：否 1：是 |
| `is_download` | tinyint | 是否允许下载附件 1：是 2：否 |
| `auto_add` | tinyint | 是否允许后加入学生获取作业 0否 1是 |
| `is_done` | tinyint | 是否批阅完成：0是 1否 |
| `source_type` | tinyint | 资源类型 0：无  1：授权 |
| `num` | int | 作业学生总数 |
| `cnum` | int | 提交作业数 |
| `rnum` | int | 已批阅数 |
| `open_answer` | int | 标准答案公开类型:0:无答案,1:不公开,2:立即公开,3:提交后公开,4:批阅后公开,5:结束后公开 |
| `th_content` | string | 答案文字内容 |
| `th_image` | string | 答案图片地址 |
| `th_video` | string | 答案视频地址 |
| `th_audio` | string | 答案音频地址 |
| `th_docs` | string | 答案文档地址 |
| `grade_id` | bigint | 自动评分规则id |
| `dt` | string | 分区日期 |

### B6. eo_pdviews.ods_ms_eo_oshw_eeo_course_homework_students_7df_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `stu_homework_id` | bigint | 学生作业ID |
| `homework_id` | bigint | 作业ID |
| `student_uid` | bigint | 学生UID |
| `is_cream` | tinyint | 加精状态(0：正常，1：加精) |
| `status` | tinyint | 提交状态(0：未提交，1：已提交，2：已批阅) |
| `reform` | tinyint | 重做状态(1：是 0：否) |
| `readover` | tinyint | 批阅中状态(1：是 0：否) |
| `warn` | int | 提醒时间 |
| `score` | string | 评分 |
| `content` | string | 作业文字内容 |
| `image` | string | 图片地址 |
| `video` | string | 视频地址 |
| `audio` | string | 音频地址 |
| `stu_homework_desc` | string | 学生留言 |
| `th_content` | string | 教师修改内容 |
| `th_image` | string | 教师修改图片 |
| `th_audio` | string | 教师修改音频 |
| `th_video` | string | 教师修改视频 |
| `comment` | string | 评语 |
| `is_del` | tinyint | 删除状态(1：是 0：否) |
| `th_time` | int | 批阅时间 |
| `comment_time` | int | 评论时间 |
| `show_time` | int | 展示到期时间 |
| `update_time` | int | 更新时间 |
| `add_time` | int | 添加时间 |
| `th_num` | tinyint | 批阅次数 |
| `score_type` | tinyint | 评分类型(1：数字)；旧注释，按第4节原始字典及评分方案补核 |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构ID |
| `th_uid` | bigint | 操作老师 |
| `docs` | string | 学生文档地址 |
| `th_docs` | string | 老师文档地址 |
| `comment_audio` | string | 评语录音 |
| `is_startd` | tinyint | 作业开始状态(1：已开始，2：未开始) |
| `is_revised` | tinyint | 是否为补交作业(1：否，2：是) |
| `is_draft` | tinyint | 是否为草稿(1：是，0：否) |
| `ref_time` | int | 学生最后提交作业时间 |
| `is_reform` | tinyint | 是否为打回重做作业(0：否，1：是) |
| `ch_time` | int | 查看时间 |
| `rd_ch_time` | int | 批阅后查看时间 |
| `correct` | int | 正确数 |
| `wrong` | int | 错误数 |
| `admire` | int | 赞数 |
| `belittle` | int | 踩数 |
| `score_p` | float | 得分率 |
| `au_warn` | int | 自动提醒时间 |
| `emend` | tinyint | 是否订正(1：是 0：否) |
| `dt` | string | 分区日期 |

### B7. eo_pdviews.ods_ms_eo_oslms_lms_activity_student_ai_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `activity_id` | bigint | 活动id |
| `student_uid` | bigint | 学生uid |
| `course_id` | bigint | 班级 ID（元数据旧注释可能写课程 ID） |
| `school_uid` | bigint | 机构uid |
| `ai_review_status` | bigint | AI批阅状态 (1-未批阅;3-批阅成功, 4-批阅失败) |
| `ai_review_count` | bigint | AI批阅次数 |
| `ai_review_content` | string | AI批阅内容 |
| `ai_review_fail_code` | bigint | 批阅错误码 |
| `ai_review_fail_content` | string | 批阅错误码 |
| `ai_review_time` | bigint | ai批阅时间 |
| `created_at` | bigint | 创建时间 |
| `updated_at` | bigint | 更新时间 |
| `rate` | bigint | 得分率；量纲须按具体表合同核验 |

### B8. eo_pdviews.ods_ms_eo_oslms_lms_activity_ai_config_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `activity_id` | bigint | 活动id |
| `review_agent_uuid` | string | 自动批阅agent_uuid |
| `review_agent_source` | int | 自动批阅agent的来源, 个人/官方 |
| `review_switch` | tinyint | 自动批阅开关 0-关闭 1-开启 |
| `created_at` | bigint | 创建时间 |
| `updated_at` | bigint | 更新时间 |

### B9. eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `teacher_uid` | bigint | 教师uid |
| `title` | string | 标题 |
| `question_ids` | string | 所有朗读试题id,作为排序依赖 |
| `is_deleted` | tinyint | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |
| `biz_type` | tinyint | 业务类型: 10英语跟读 11英语背诵 12英语听写 13语文跟读 14语文背诵 15语文生字听写 |

### B10. eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_question_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `reading_id` | bigint | reading id |
| `content` | string | 题干英语文本 |
| `type` | tinyint | 试题类型:1-单词 2-句子 |
| `audio` | string | 音频文件 lmsFileId |
| `paraphrase` | string | 释义 |
| `phonetic` | string | 音标,句子没有音标 |
| `sum_rate` | bigint | 总得分率 |
| `word_sum_rate` | string | 单词维度总得分率 |
| `ext` | string | 拓展字段 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |
| `is_deleted` | tinyint | 是否删除 |

### B11. eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_student_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `reading_id` | bigint | 英语语文学科活动id |
| `student_uid` | bigint | 学生uid |
| `is_excellent` | int | 是否优秀: 0否 1是 |
| `rate` | bigint | 得分率乘1000000；量纲须按具体表合同核验 |
| `review_comment` | string | 老师评论 |
| `review_files` | string | 评论附件json |
| `ability_score_record_id` | bigint | 素养成绩记录ID |
| `review_uid` | bigint | 批阅作业的用户uid |
| `status` | tinyint | 状态: 0-待提交 1-已提交 2-已批阅 3-打回 |
| `is_lated` | tinyint | 是否补交: 0否 1是 |
| `is_emend` | tinyint | 是否订正: 0否 1是 |
| `is_reform` | tinyint | 是否打回: 0否 1是 |
| `last_submit_time` | bigint | 最后提交时间 |
| `last_review_time` | bigint | 最后批阅时间 |
| `is_deleted` | tinyint | 是否删除: 0否 1是 |
| `ai_show_grade` | string | AI评分展示 |
| `created_at` | bigint | 创建时间 |
| `updated_at` | bigint | 更新时间 |
| `ai_review_rate` | bigint | ai评测得分 |

### B12. eo_pdviews.ods_ms_eo_oslms_ai_reading_reading_student_question_f_view

来源：在线知识库《207-数据仓库-LMS活动.md》及 2026-09-15 元数据核验。

| 字段 | 实测类型 | 业务意义 / 注释限制 |
| --- | --- | --- |
| `id` | bigint | 主键自增id |
| `reading_id` | bigint | 英语语文学科活动id |
| `student_uid` | bigint | 学生uid |
| `question_id` | bigint | 试题id |
| `answer_audio` | string | 学生作答音频文件 |
| `ai_review_rate` | bigint | ai评测得分 |
| `tea_review_rate` | bigint | 教师评测得分 |
| `ai_review_ext` | string | ai评测拓展字段-存流利度、完整度等细粒度分数 |
| `tea_review_ext` | string | 教师评测拓展字段-存流利度、完整度等细粒度分数 |
| `review_uid` | bigint | 批阅作业的用户uid |
| `status` | tinyint | 状态: 0待提交 1已提交 2已批阅 |
| `is_deleted` | tinyint | 是否删除: 0否 1是 |
| `created_at` | int | 创建时间 |
| `updated_at` | int | 更新时间 |

## 7. 来源及后续复核

本篇一手来源为 2026-09-15 在线 dw_kb：

- 《010-全局查询指南.md》：18/18 分片；《011-业务术语.md》：29/29 分片。
- 《105-原始数据-LMS活动.md》：5/5 分片；其 105.1–105.9 子字典分别 8、10、5、3、4、6、9、7、4 个分片，全部读取。
- 《207-数据仓库-LMS活动.md》：19/19 分片。
- 本次只读元数据核验：42 张原始表 + 12 张数仓视图，未查询学生业务行。

全字段清单给出“可以寻找的事实”。要把某个问题升级为产品可回答范围，还要逐项验证：教师授权范围 → 实际记录覆盖 → 关联命中 → 内容可解析 → 时间与评分口径 → 输出可引用。具体班级是否支持该问题，应按这条链返回局部结果和缺失项，避免要求老师替系统补充它本应自动读取的数据。
