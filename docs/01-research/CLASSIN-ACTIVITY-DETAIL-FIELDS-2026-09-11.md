# Activity detail field evidence

Source: private Apifox project 345129, authenticated read-only CLI. Business calls remain unverified.

Important: rate in homework/exam students is a score ratio, not answer accuracy. correct/wrong in homework answer detail lack definitions; do not derive accuracy without confirming semantics. Activity roster must not be replaced with the current class roster. Time units and undocumented enum values require validation.

## 3471031 活动 - 作业 - 详情

POST /app/activity/homework/get

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | object | Undocumented |
| data.id | integer | Undocumented |
| data.courseId | integer | 课程id |
| data.schoolUid | integer | Undocumented |
| data.teacherUid | integer | 老师uid |
| data.name | string | 活动名称 |
| data.unitId | integer | 单元id |
| data.bizId | integer | Undocumented |
| data.bizType | integer | Undocumented |
| data.statusInfo | null | Undocumented |
| data.startTime | integer | 开始时间 |
| data.endTime | integer | 结束时间 |
| data.isAllStudent | integer | Undocumented |
| data.isScore | integer | Undocumented |
| data.scoreWeightId | integer | Undocumented |
| data.maxScore | integer | 满分 |
| data.systemMethod | integer | 是否自动评分 1 自动评分 0 手动评分 |
| data.systemGradeRuleId | integer | 系统评分ID |
| data.gradeDisplayId | integer | 评分显示ID |
| data.unitOrderId | integer | Undocumented |
| data.orderId | integer | Undocumented |
| data.publishFlag | integer | 状态：0,草稿;1隐藏,2显示 |
| data.processFlag | integer | Undocumented |
| data.studentTotal | integer | Undocumented |
| data.creatorUid | integer | Undocumented |
| data.isDeleted | integer | Undocumented |
| data.createdAt | integer | Undocumented |
| data.updatedAt | integer | Undocumented |
| data.unitName | string | Undocumented |
| data.homeworkDesc | string | 作业描述 |
| data.image | string | 图片 |
| data.video | string | 视频 |
| data.audio | string | 音频 |
| data.docs | string | 文档地址 |
| data.thImage | string | 答案图片 |
| data.thVideo | string | 答案视频 |
| data.thAudio | string | 答案音频 |
| data.thDocs | string | 答案文档 |
| data.thContent | string | 答案内容 |
| data.isOpen | integer | 是否公开 1：是，2：否，3：公开优秀作业 |
| data.openType | integer | 公开类型：1结束后公开，2提交后公开，3批阅后公开，4不限 |
| data.isRevise | integer | 是否允许作业结束后提交：1否，2是 |
| data.isDownload | integer | 是否允许下载附件 1：是 2：否 |
| data.autoAdd | integer | 是否允许后加入学生获取作业 0否 1是 |
| data.openAnswer | integer | 标准答案公开类型:0:无答案,1:不公开,2:立即公开,3:提交后公开,4:批阅后公开,5:结束后公开 |
| data.sourceType | integer | 资源类型 0：无  1：授权 |
| data.abilitys | array | Undocumented |
| data.gradeDisplayRule | object | 评分显示规则详情 |
| data.gradeDisplayRule.gradeDisplayId | integer | Undocumented |
| data.gradeDisplayRule.schoolUid | integer | Undocumented |
| data.gradeDisplayRule.courseId | string | Undocumented |
| data.gradeDisplayRule.gradeDisplayName | string | Undocumented |
| data.gradeDisplayRule.type | integer | Undocumented |
| data.gradeDisplayRule.config | array | Undocumented |
| data.systemGradeRuleConfig | object | Undocumented |
| data.totalScoreType | integer | 总成绩展示配置 1分数 2加权 |
| data.abilityRuleId | integer | 评价量规ID，0为未关联 |
| data.groupId | integer | 小组ID |
| data.categoryName | string | 课程名称 |
| data.categoryId | integer | 课程ID |
| data.aiConfig | string | json字符串：{"reviewSwitch":0,"reviewAgentUuid":"","reviewAgentSource":2} |
| preActivity |  | 解锁活动信息 |

## 3499108 活动 - 作业 - 学生作答详情

POST /app/activity/homework/student/detail

| Field | Type | Description |
| --- | --- | --- |
| data | object | Undocumented |
| data.aiReviewStatus | integer |  0 无需批阅, 1批阅中, 3 批阅成功, 4批阅失败 |
| data.stu_homework_detail | object | 结构暂时保持和老接口一致 |
| data.stu_homework_detail.stu_homework_id | integer | Undocumented |
| data.stu_homework_detail.homework_id | integer | Undocumented |
| data.stu_homework_detail.student_uid | integer | Undocumented |
| data.stu_homework_detail.is_cream | integer | Undocumented |
| data.stu_homework_detail.status | integer | Undocumented |
| data.stu_homework_detail.reform | integer | Undocumented |
| data.stu_homework_detail.readover | integer | Undocumented |
| data.stu_homework_detail.warn | integer | Undocumented |
| data.stu_homework_detail.score | string | Undocumented |
| data.stu_homework_detail.content | string | Undocumented |
| data.stu_homework_detail.image | string | Undocumented |
| data.stu_homework_detail.video | string | Undocumented |
| data.stu_homework_detail.audio | string | Undocumented |
| data.stu_homework_detail.stu_homework_desc | string | Undocumented |
| data.stu_homework_detail.th_content | string | Undocumented |
| data.stu_homework_detail.th_image | string | Undocumented |
| data.stu_homework_detail.th_audio | string | Undocumented |
| data.stu_homework_detail.th_video | string | Undocumented |
| data.stu_homework_detail.comment | string | Undocumented |
| data.stu_homework_detail.is_del | integer | Undocumented |
| data.stu_homework_detail.th_time | integer | Undocumented |
| data.stu_homework_detail.comment_time | integer | Undocumented |
| data.stu_homework_detail.show_time | integer | Undocumented |
| data.stu_homework_detail.update_time | integer | Undocumented |
| data.stu_homework_detail.add_time | integer | Undocumented |
| data.stu_homework_detail.th_num | integer | Undocumented |
| data.stu_homework_detail.score_type | integer | Undocumented |
| data.stu_homework_detail.course_id | integer | Undocumented |
| data.stu_homework_detail.school_uid | integer | Undocumented |
| data.stu_homework_detail.th_uid | integer | Undocumented |
| data.stu_homework_detail.docs | string | Undocumented |
| data.stu_homework_detail.th_docs | string | Undocumented |
| data.stu_homework_detail.comment_audio | string | Undocumented |
| data.stu_homework_detail.is_startd | integer | Undocumented |
| data.stu_homework_detail.is_revised | integer | Undocumented |
| data.stu_homework_detail.is_draft | integer | Undocumented |
| data.stu_homework_detail.ref_time | integer | Undocumented |
| data.stu_homework_detail.is_reform | integer | Undocumented |
| data.stu_homework_detail.ch_time | integer | Undocumented |
| data.stu_homework_detail.rd_ch_time | integer | Undocumented |
| data.stu_homework_detail.correct | integer | Undocumented |
| data.stu_homework_detail.wrong | integer | Undocumented |
| data.stu_homework_detail.admire | integer | Undocumented |
| data.stu_homework_detail.belittle | integer | Undocumented |
| data.stu_homework_detail.score_p | string | Undocumented |
| data.stu_homework_detail.au_warn | integer | Undocumented |
| data.stu_homework_detail.emend | integer | Undocumented |
| data.stu_homework_detail.read | integer | Undocumented |
| data.stu_homework_detail.homework_title | string | Undocumented |
| data.stu_homework_detail.log | array | Undocumented |
| data.stu_homework_detail.log/items.id | integer | Undocumented |
| data.stu_homework_detail.log/items.uid | integer | Undocumented |
| data.stu_homework_detail.log/items.homework_id | integer | Undocumented |
| data.stu_homework_detail.log/items.stu_homework_id | integer | Undocumented |
| data.stu_homework_detail.log/items.info | string | Undocumented |
| data.stu_homework_detail.log/items.comment | string | Undocumented |
| data.stu_homework_detail.log/items.content | string | Undocumented |
| data.stu_homework_detail.log/items.image | string | Undocumented |
| data.stu_homework_detail.log/items.video | string | Undocumented |
| data.stu_homework_detail.log/items.audio | string | Undocumented |
| data.stu_homework_detail.log/items.stu_homework_desc | string | Undocumented |
| data.stu_homework_detail.log/items.stu_homework_status | integer | Undocumented |
| data.stu_homework_detail.log/items.readover | integer | Undocumented |
| data.stu_homework_detail.log/items.reform | integer | Undocumented |
| data.stu_homework_detail.log/items.score | string | Undocumented |
| data.stu_homework_detail.log/items.add_time | integer | Undocumented |
| data.stu_homework_detail.log/items.score_type | integer | Undocumented |
| data.stu_homework_detail.log/items.docs | string | Undocumented |
| data.stu_homework_detail.log/items.comment_audio | string | Undocumented |
| data.stu_homework_detail.log/items.correct | integer | Undocumented |
| data.stu_homework_detail.log/items.wrong | integer | Undocumented |
| data.stu_homework_detail.log/items.admire | integer | Undocumented |
| data.stu_homework_detail.log/items.belittle | integer | Undocumented |
| data.stu_homework_detail.log/items.score_p | string | Undocumented |
| data.stu_homework_detail.log/items.scoreText | string | Undocumented |
| data.stu_homework_detail.ability_score_record_id | integer | Undocumented |
| data.stu_homework_detail.scoreText | string | Undocumented |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| 01K3691MZ77G42M0C0ASWWB8F0 |  | Undocumented |

## 3471069 活动 - 作业 - 学生

POST /app/activity/homework/students

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | array | Undocumented |
| data/items.studentUid | integer | Undocumented |
| data/items.isScore | integer | 是否已经评分 |
| data/items.rate | string | Undocumented |
| data/items.gradeMethod | integer | 评分方式: 0手动评分 1自动评分 2量规评分 |
| data/items.stStatus | integer | 0：未提交，1：已提交，2：已批阅 |
| data/items.isCream | integer | 是否加精（0：正常，1：加精） |
| data/items.isRevised | integer | 是否补交（1：否 2：是） |
| data/items.readover | integer | 是否批阅中（0：否，1：是） |
| data/items.reform | integer | 重做状态 1：是 0：否 |
| data/items.warn | integer | 提醒时间 |
| data/items.thTime | integer | 批阅时间 |
| data/items.refTime | integer | 提交时间 |
| data/items.chTime | integer | 提交前查看时间 |
| data/items.rdChTime | integer | 批阅后查看时间 |
| data/items.updateTime | integer | Undocumented |
| data/items.isDraft | integer | 学生作业草稿状态，0：非草稿，1：草稿 |
| data/items.isEmend | integer | 学生是否订正过，0：否，1：是 |
| data/items.showGrade | string | Undocumented |
| data/items.isBindRule | integer | 0-未绑定 1-已绑定 |
| data/items.isReformScore | integer | 打回评分设置：0打回订正(不评分) 1打回订正(评分)，默认0 |
| data/items.aiReviewStatus | integer | AI批阅状态 ( 0 无需批阅, 1批阅中, 3 批阅成功, 4批阅失败) |

## 3471022 活动 - 作业 - 学生统计

POST /app/activity/homework/studentStatistics

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | number | Undocumented |
| error_info.error | string | Undocumented |
| data | object | Undocumented |
| data.list | array | Undocumented |
| data.list/items.num | integer | 学生总数 |
| data.list/items.cnum | integer | 提交数 |
| data.list/items.revised_num | integer | 补交数 |
| data.list/items.ref_num | integer | 打回订正数 |
| data.list/items.refc_num | integer | 已订正数 |
| data.list/items.cream_num | integer | 优秀数 |
| data.list/items.rnum | integer | 批阅数 |
| data.list/items.min_score | string | 最低分 |
| data.list/items.max_score | string | 最高分 |
| data.list/items.av_score | string | 平均分 |

## 3471071 活动 - 课堂 - 详情

POST /app/activity/class/get

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | number | Undocumented |
| error_info.error | string | Undocumented |
| data | object | Undocumented |
| data.name | string | 课堂名称 |
| data.courseId | integer | 课程id |
| data.unitId | integer | 单元id |
| data.teacherUid | integer | Undocumented |
| data.startTime | integer | 开始时间 |
| data.endTime | integer | 结束时间 |
| data.maxScore | number | 满分 |
| data.publishFlag | integer | 0,草稿;1隐藏,2显示 |
| data.processFlag | integer | 0 未开始,1 进行中,2 已结束 |
| data.abilitys | array | 素养集合 |
| data.abilitys/items.id | integer | 素养id |
| data.abilitys/items.name | string | Undocumented |
| data.assistantUids | array | 助教uids |
| data.cameraHide | integer | 摄像头是否隐藏，0=否，显示摄像头，1=是，隐藏摄像头；不传默认0，传了则会检查参数值是否符合要求, |
| data.isAutoOnstage | integer | 学生进入教室时是否自动上台，1不自动，2自动, |
| data.isDc | integer | 是否双摄像头，0没有开启副摄像头，1 副摄像头标清 2 副摄像头高清 3 副摄像头全高清, |
| data.isHd | integer | 是否高清，0标清，1高清 2 全高清, |
| data.screenMode | integer | 屏幕模式，1=标准模式，2 = 大屏模式；不传默认1，传了则会检查参数值是否符合要求, |
| data.seatNum | integer | 上台人数 |
| data.subjectId | string | 学科ID |
| data.teachMode | integer | 教学模式，1 = 在线教室，2= 智慧教室； |
| data.liveState | integer | 是否直播 0 不直播 1 直播 |
| data.openState | integer | 是否公开回放 0 不公开 1 公开 |
| data.recordState | integer | 是否录课 0 不录课， 1 录课 |
| data.recordType | integer | 录课类型 0 录教师 1 录现场 2 两个都录 |
| data.edbs | array | ebb 板书 |
| data.moments | array | 精彩瞬间 |
| data.bizType | integer | 活动类型1.课堂，2.作业，3.考试，4.录播， 5. 资源，6 讨论 |
| data.bizId | integer | 业务id  |
| data.isScore | integer | 是否评分 |
| data.gradeDisplayId | integer | 评分显示id |
| data.systemMethod | integer | 是否设置系统评分 0 没有 1 有 |
| data.systemGradeRuleId | integer | 系统评分id |
| data.isAllStudent | integer | 是否全部学生 0 否 1是 |
| data.gradeDisplayRule | object | 评分显示规则详情 |
| data.gradeDisplayRule.gradeDisplayId | number | 评分显示规则ID |
| data.gradeDisplayRule.schoolUid | number | 机构ID |
| data.gradeDisplayRule.courseId | number | 课程ID |
| data.gradeDisplayRule.gradeDisplayName | string | 评分显示规则名称 |
| data.gradeDisplayRule.type | number | 评分规则类型，1分数制,2百分比,3等第制,0其他（1和2 没有config   3和0 通用下面config逻辑） |
| data.gradeDisplayRule.config | array | 等第制规则 |
| data.gradeDisplayRule.config/items.level | string | 显示 |
| data.gradeDisplayRule.config/items.min | number | 最小百分比 |
| data.gradeDisplayRule.config/items.max | number | 最大百分比 |
| data.activityId | string | 活动id |
| data.isAllowCheck | integer | 是否允许查看学生报告 0 否 1 是 |
| data.systemGradeRuleConfig | object | Undocumented |
| data.relVideoFlag | integer | 是否有真实视频1=有，0=没有（recordState=1时返回该字段） |
| data.hasBoardReport | integer | 0-未生成，1-已生成 |
| data.omoStationBroadcast | integer | 站播开关 0 关 1 开 |
| data.webLiveReplayUrl | string | 直播回放地址 |
| data.aiSummaryConfig |  | Undocumented |
| data.courseWebCastUrl | string | 班级回放地址 |

## 3471043 活动 - 课堂 - 学生

POST /app/activity/class/students

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | array | Undocumented |
| data/items.studentUid | integer | Undocumented |
| data/items.isScore | integer | Undocumented |
| data/items.rate | string | Undocumented |
| data/items.gradeMethod | integer | Undocumented |
| data/items.onClass | integer | Undocumented |
| data/items.isLate | integer | Undocumented |
| data/items.isEarly | integer | Undocumented |
| data/items.classLength | integer | Undocumented |
| data/items.awardsNum | integer | Undocumented |
| data/items.comment | string | Undocumented |
| data/items.learnProcess | integer | Undocumented |
| data/items.learnTime | integer | Undocumented |
| data/items.showGrade | string | Undocumented |
| data/items.identity | integer | Undocumented |
| data/items.star | string | Undocumented |

## 3471127 活动 - 测验 - 详情

POST /app/activity/exam/get

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | object | Undocumented |
| data.id | integer | Undocumented |
| data.courseId | integer | 课程id |
| data.schoolUid | integer | Undocumented |
| data.teacherUid | integer | 老师id |
| data.name | string | 活动名称 |
| data.unitId | integer | 单元id |
| data.bizId | integer | Undocumented |
| data.bizType | integer | Undocumented |
| data.statusInfo | object | Undocumented |
| data.statusInfo.submitTotal | integer | Undocumented |
| data.statusInfo.waitCorrectTotal | integer | Undocumented |
| data.statusInfo.isJudge | integer | Undocumented |
| data.startTime | integer | 开始时间 |
| data.endTime | integer | 结束时间 |
| data.isAllStudent | integer | Undocumented |
| data.isScore | integer | Undocumented |
| data.scoreWeightId | integer | Undocumented |
| data.maxScore | integer | 满分, 0为不评分 |
| data.systemMethod | integer | Undocumented |
| data.systemGradeRuleId | integer | Undocumented |
| data.gradeDisplayId | integer | 评分显示ID |
| data.unitOrderId | integer | Undocumented |
| data.orderId | integer | Undocumented |
| data.publishFlag | integer | 0,草稿;1隐藏,2显示 |
| data.processFlag | integer | Undocumented |
| data.studentTotal | integer | Undocumented |
| data.creatorUid | integer | Undocumented |
| data.isDeleted | integer | Undocumented |
| data.createdAt | integer | Undocumented |
| data.updatedAt | integer | Undocumented |
| data.unitName | string | Undocumented |
| data.paperDec | string | 测验说明 |
| data.paperInfo | string | 试卷信息,json格式 |
| data.limitTime | integer | Undocumented |
| data.publicParsing | integer | 是否公开解析：1-不公开,4-交卷后,5-批阅后,7-结束后（int） |
| data.publicExam | integer | 是否公开考试：1-不公开,4-交卷后,5-批阅后,7-结束后（int） |
| data.retake | integer | 是否允许补考：0-否,1-是（int） |
| data.isRjcsExam | integer | 是否允许后加入班级的学生参加考试:0-否,1-是（int） |
| data.answerDiff | integer | 填空题作答与正确答案不一致:0-判为错误,1-手动批阅（int） |
| data.paperId | integer | Undocumented |
| data.classId | integer | Undocumented |
| data.abilitys | array | 素养集合 |
| data.gradeDisplayRule | object | 评分显示规则详情 |
| data.systemGradeRuleConfig | object | Undocumented |
| data.totalScoreType | integer | Undocumented |
| data.abilityRuleId | integer | Undocumented |
| data.paperMake | object | Undocumented |
| data.paperMake.1 | object | Undocumented |
| data.paperMake.1.score | integer | Undocumented |
| data.paperMake.1.number | integer | Undocumented |
| data.paperMake.1.type | integer | Undocumented |
| data.oldPaperInfo | string | 旧格式的试卷详情，json字符串 |

## 3471053 活动 - 测验 - 学生

POST /app/activity/exam/students

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | array | Undocumented |
| data/items.studentUid | integer | 学生UID |
| data/items.isScore | integer | 是否已经评分0 否 1是 |
| data/items.rate | string | 得分率 |
| data/items.gradeMethod | integer | 0教师手动评分，1自动评分 |
| data/items.stStatus | integer | 学生作答批阅状态:0-未作答,3-作答中,6-已批阅,9-已交卷 |
| data/items.isRetake | integer | 是否补考:0-否,1-是 |
| data/items.upTime | integer | 更新时间 |
| data/items.elapsedTime | integer | 作答耗时 |
| data/items.markingTime | integer | 阅卷时间 |
| data/items.startTime | integer | 作答开始时间 |
| data/items.endTime | integer | 作答结束时间 |
| data/items.lookedAt | integer | Undocumented |
| data/items.showGrade | string | 评分显示 |

## 3471030 录播课 - 详情

POST /app/activity/recordClass/get

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | object | Undocumented |
| data.id | number | 活动ID |
| data.name | string | 录播课名称 |
| data.schoolUid | number | Undocumented |
| data.courseId | number | Undocumented |
| data.unitId | number | Undocumented |
| data.bizType | number | 活动类型：1课堂, 2作业, 3测验, 4录播课, 5资料，6讨论 |
| data.bizId | number | 录播课id |
| data.startTime | number | 开始时间 |
| data.endTime | number | 结束时间 |
| data.maxScore | number | 最大分 |
| data.gradeDisplayId | number | Undocumented |
| data.isScore | integer | 是否评分: 0不评分 1评分 |
| data.systemMethod | number | Undocumented |
| data.systemGradeRuleId | number | Undocumented |
| data.orderId | number | Undocumented |
| data.isAllStudent | number | Undocumented |
| data.isDeleted | number | Undocumented |
| data.publishFlag | number | 活动状态:0,草稿;1隐藏,2显示 |
| data.processFlag | number | 活动进行状态：0 未开始,1 进行中,2 已结束 |
| data.creatorUid | number | Undocumented |
| data.unitName | string | Undocumented |
| data.video | string | 视频json，字段注释见说明 |
| data.describe | string | 描述 |
| data.isFast | number | 是否允许倍数观看 1：是 0：否 |
| data.isDrag | number | 是否允许拖动 1：是 0：否 |
| data.autoAdd | number | 是否允许后加入学生加入 1：是0：否 |
| data.abilitys | array | 素养 |
| data.abilitys/items.id | number | Undocumented |
| data.abilitys/items.name | string | Undocumented |
| data.teacherUid | number | 老师uid |
| data.studentDetail | object | 学生参与详情 |
| data.studentDetail.studentUid | integer | 学生UID |
| data.studentDetail.duration | number | 观看总时长（s） |
| data.studentDetail.checkTime | integer | 查看时间 |
| data.studentDetail.videoRate | array | 视频进度集合，未上报过的视频则无记录 |
| data.studentDetail.videoRate/items.fileId | integer | 视频fileId |
| data.studentDetail.videoRate/items.playBarSec | integer | 进度条最新位置，单位s |
| data.studentDetail.videoRate/items.playValidNum | integer | 播放次数 |
| data.studentDetail.videoRate/items.playPart | array | 观看片段 |
| data.studentDetail.videoRate/items.playPart/items.0 | number | 片段开始时间 |
| data.studentDetail.videoRate/items.playPart/items.1 | number | 片段结束时间 |
| data.studentDetail.videoEnd | array | 观看完成结束文件id json集合 |
| data.studentDetail.lastVideoFileId | integer | 最近一次上报视频进度fileId |
| data.studentDetail.learnState | integer | 学习状态 0未开始 1观看中 2已看完 |
| data.studentDetail.learnRate | integer | 学习进度 |
| data.studentDetail.commentCount | string | 评论数 |
| data.studentDetail.replyCount | string | 回复数 |
| data.studentDetail.likeCount | string | 点赞数 |
| data.studentDetail.isScore | integer | 是否已评分：0否 1是 |
| data.studentDetail.showScore | string | 展示评分 |
| data.isCaption | integer | 是否开启防盗录跑马灯 1是 0否 |
| data.isEndLook | integer | 是否允许结束后观看 1是 0否 |
| data.isMutualLook | integer | 是否允许学生间互相查看学习进度 1是 0否 |
| data.playMax | integer | 限制播放次数 |
| data.preActivity |  | 解锁条件活动 |
| data.groupId | integer | 分组ID |
| data.isOpenComment | integer | 是否开启讨论:0否 1是 |
| data.stuStatistic | object | 学生参与统计 |
| data.stuStatistic.joinRate | integer | 参与率(*10000) |
| data.stuStatistic.completeRate | integer | 完播率(*10000) |
| data.stuStatistic.durationAve | integer | 评论观看时长(s) |
| data.stuStatistic.learnRateAve | integer | 评论观看进度(*10000) |
| data.aiSummaryConfig |  | Undocumented |

## 3471061 录播课 - 学生列表

POST /app/activity/recordClass/students

| Field | Type | Description |
| --- | --- | --- |
| error_info | object | Undocumented |
| error_info.errno | integer | Undocumented |
| error_info.error | string | Undocumented |
| data | array | Undocumented |
| data/items.studentUid | integer | 学生uid |
| data/items.isScore | integer | 是否已经评分0 否 1是 |
| data/items.gradeMethod | number | Undocumented |
| data/items.checkTime | integer | 首次查看时间，未查看则为0 |
| data/items.showGrade | string | 成绩 |
| data/items.totalTime | integer | 观看时长（s） |
| data/items.totalRate | integer | 学习进度，30代表30% |
| data/items.learnState | integer | 录播课学习状态：0未开始 1进行中 2已完成 |
| data/items.learnRate | integer | 学习进度，30代表30% |
| data/items.duration | integer | 观看时长（s） |
| data/items.commentCount | integer | 评论数量 |
| data/items.replyCount | integer | 回复数量 |
| data/items.likeCount | integer | 点赞数量 |
| data/items.rate | integer | 得分 |
| data/items.isBindRule | integer | 是否绑定素养量规 |
