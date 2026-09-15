---
title: ClassIn 教学数据结构分册：课堂、参与、报告与消息
status: METADATA_VERIFIED_CONTENT_COVERAGE_PENDING
date: 2026-09-15
scope: 只读元数据及现有接口代码核验；不读取学生或教师业务内容
---

# ClassIn 教学数据结构分册：课堂、参与、报告与消息

[返回教学数据地图](./CLASSIN-TEACHING-DATA-MAP-2026-09-15.md)

本分册用于判断教师可以围绕班级课堂问什么。它记录数据的结构和业务含义，不统计用户使用深度，也不承诺具体老师的数据已经完整取得。

本轮在线核验 **15 张表/视图、253 个字段**：原始业务表 5 张 84 列，数仓视图 10 张 169 列。下面逐表包含全部实测列；字段存在、业务内容非空、已接到 Copilot、可授权给当前老师，是四件不同的事。

## 1. 对象及关联

| 对象 | 关键标识与含义 | 关联证据及限制 |
| --- | --- | --- |
| 班级 | 课堂业务中的 course_id | 业务字典确认其为班级；不是班级下的 LMS 课程分类 |
| 单次课堂/课节 | class_id | 字典确认对应 LMS 活动 biz_type=1 的 biz_id；带机构、班级一并校验 |
| 班级内课程 | LMS category_id | 需经过课堂对应的 LMS 活动；不从课堂名称或 teach_id 猜课程归属 |
| 课节分配的教师/学生 | st_id/stud_id 与 teacher_uid/student_uid | 机构关系ID与全局UID分别保留；班级人数不能替代本课应到名单 |
| 实际参与 | member_uid / uid + class_id + 时间 | 应到关系与实际进出/停留分开；迟到早退要说明计划时段、实际时段及业务判定 |
| 课堂材料/产物 | 录制文件、笔记、板书、报告 | 文件元数据不等于内容被理解；报告有记录不等于报告正文已取得 |
| 班级群 | clusterid | 在线原始IM字典声称课程群ClusterID等于班级course_id；本轮未取业务样本或接口映射复核，作为字典关联而非实测通过的join |
| 消息 | clusterid + msgbucketid + msgid | IM消息与AI会话消息独立；按消息类型解释正文和附件，回复、撤回、可见范围另行验证 |

数仓用于历史问答和回溯，时效为 T-1。原始表只验证结构；本轮未读取原始库业务行。课堂关联范围应保留机构、班级、LMS课程、单次课堂，不能把“未命中某次 LMS 分类过滤”说成“课堂没有班级”。

## 2. 实测发现的结构差异

| 项目 | 在线知识库说明 | 2026-09-15 元数据核验 | 处理方式 |
| --- | --- | --- | --- |
| 用户群关系 | 视图待创建，列出37列，称无联系人/同事标识 | 视图已可describe；实际27列，含 contactoruid、relationmark、readcursor、sid 等，大多数为 string | 以下采用实测列；枚举、字段内容完整度和时标单位仍待业务复核 |
| IM成员关系 | 表末建议写“两张待创建视图” | 本轮消息、成员、用户群关系三个视图均成功describe | 不再说数仓没有IM结构 |
| IM msgdata | 表描述说二进制已转JSON，字段说明又说二进制不能作文本 | 实测为string且注释仅“消息内容” | 保留冲突；需要 msgcmd 协议和有限脱敏内容样本验证，不能宣称全文已可理解 |
| 原始与数仓课节学生 isdel | 原始0未删/1已删；数仓字典有特殊时段限定 | 数仓注释明确开课前10分钟内至课节结束前删除 | 分开定义，不把一个删除过滤复制到所有数据源 |
| 课节 camera_hide / record_type | 不同字典有“隐藏坐席/摄像头”“录现场/教师/教室”差异 | 类型可核验，语义注释仍存在差异 | 关键教学逻辑不依赖争议解释，待接口负责人定枚举 |
| 部分课堂视图读取 | 首次元数据读取未完成 | 切换同源备用数仓引擎取得学生关系、教师点评完整结构 | 表存在，不将短暂读取失败当作缺表 |

## 3. 核心字段字典

类型为本次元数据返回；业务含义以元数据注释为主，原始表无注释时引用在线课堂字典。未给含义或单位的字段标记待核。原始列的“可空/键”是实测声明；数仓的物理唯一约束没有验证，不能根据字段名推断。密码、账号等只登记字段，不读取值、不进入模型上下文。

### 1. 原始课节：`eeo_course_class`

class_id 为主键；主讲 main_st_id 连接机构教师关系，不等于 teacher_uid。course_id 是班级，class_id 是单次课节。 共 36 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `class_id` | bigint(20) unsigned | NO / PRI | 课节ID |
| `course_id` | bigint(20) | YES / MUL | 班级ID；本分册课堂业务语境为班级ID |
| `school_uid` | bigint(20) | YES / MUL | 机构uid |
| `class_number` | int(11) | NO | 课节号（基本不用） |
| `class_name` | varchar(255) | YES | 课节名称 |
| `teach_id` | bigint(20) | YES | 关联课程体系id |
| `cloud_folder` | bigint(20) | NO | 云盘目录id |
| `skin_id` | bigint(20) | NO | 课节指定皮肤ID |
| `seat_num` | tinyint(3) unsigned | NO | 上台人数（传1时，表示1v0，台上只显示老师头像，以此类推） |
| `class_type` | tinyint(1) | NO | 课节类型（1-标准课；2-公开课；3-旧双师；9-双师子课节） |
| `main_st_id` | bigint(20) | NO / MUL | 课节主讲老师在机构下的唯一id（关联机构老师表中的st_id字段） |
| `ass_st_id` | bigint(20) | NO / MUL | 助教（联席教师）在机构下的唯一id（关联机构老师表中的st_id字段） |
| `class_btime` | int(11) | NO / MUL | 课节开始时间（unix时间戳） |
| `class_etime` | int(11) | NO / MUL | 课节结束时间（unix时间戳） |
| `is_auto_onstage` | tinyint(1) | NO | 是否自动上台（1-不自动，2-自动） |
| `class_status` | tinyint(1) | NO | 课节状态(1-还没开课，2-上课中，3-上课结束，4-已取消) |
| `is_hd` | tinyint(1) | NO | 是否高清(0-非高清 1-高清 2-全高清<仅支持 1v1和1v6， 即seatNum=2或seatNum=7使用>) |
| `is_dc` | tinyint(1) | NO | 是否是双摄像头（0-不开启，3-开启全高清副摄像头<仅支持1v1使用，即seatNum=2>） |
| `teach_mode` | tinyint(3) unsigned | NO | 教学模式，1 = 在线教室，2= 智慧教室 |
| `camera_hide` | tinyint(3) unsigned | NO | 是否隐藏座位席（0=显示坐席区，1=隐藏坐席区；当 camera_hide=1 时，is_auto_onstage 会始终被设置为1，即不自动上台） |
| `screen_mode` | tinyint(3) unsigned | NO | 屏幕模式：1=标准模式，2 = 大屏模式 |
| `add_status` | tinyint(1) | NO | 课节新建状态(没有开课时间-1，有开课时间-0) |
| `live_state` | tinyint(1) | NO | 是否直播(0-不直播，1-直播) |
| `record_state` | tinyint(1) | NO | 是否录课(0-不录课，1-录课) |
| `open_state` | tinyint(1) | NO | 是否公开回放(0-不公开，1-公开) |
| `is_lock` | tinyint(1) | NO | 是否锁定 |
| `client_class_id` | bigint(20) | NO / MUL | 课堂/课节 ID |
| `addtime` | int(11) | NO | 创建时间（unix时间戳） |
| `watch_by_login` | tinyint(3) unsigned | NO | 只允许登录账号观看直播回放：0=未开启，1=开启 |
| `allow_unlogged_chat` | tinyint(3) unsigned | NO | 允许未登录用户参与直播聊天发言：0=不允许，1=允许 |
| `watch_password` | varchar(20) | NO | 敏感凭据字段；仅登记结构，禁止读取或作为AI输入 |
| `record_type` | tinyint(3) unsigned | NO | 录课类型：0-录制教室，1-录制现场，2-两个都录 |
| `subject_id` | int(10) unsigned | NO | 学科ID |
| `creater_uid` | bigint(20) unsigned | NO | 创建人uid |
| `creater_name` | varchar(100) | NO | 创建人名字 |
| `class_source` | tinyint(1) | NO | 创建来源（0 历史数据， 1 后台，2 classin，3 lms， 4 第三方api<6.0版本之前用，6.0之后不会新增> ，5 大后台，6 三方api <6.0版本启用>） |

### 2. 原始课节学生关系：`eeo_class_and_student`

class_and_student_id 为主键；school_uid + course_id + class_id + student_uid 为业务关联范围，非已证唯一约束；isdel=0/1 为未删/已删。 共 7 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `class_and_student_id` | bigint(20) unsigned | NO / PRI | 主键，唯一ID |
| `course_id` | bigint(20) unsigned | NO / MUL | 班级ID；本分册课堂业务语境为班级ID |
| `class_id` | bigint(20) unsigned | NO / MUL | 课节ID |
| `stud_id` | bigint(20) | NO / MUL | 机构学生唯一关联ID（对应eo_os.eeo_school_students表主键） |
| `school_uid` | bigint(20) unsigned | NO | 机构uid |
| `student_uid` | bigint(20) unsigned | NO / MUL | 学生uid |
| `isdel` | tinyint(4) | NO | 是否标记删除（0为未删除，1为已删除） |

### 3. 原始课节教师关系：`eeo_class_teacher`

id 为主键；class_id + teacher_uid + identity 描述课堂教师角色；identity=3 主讲、4 助教/联席。st_id 与 teacher_uid 不同。 共 6 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | bigint(20) unsigned | NO / PRI | 主键ID |
| `course_id` | bigint(20) unsigned | NO / MUL | 班级ID；本分册课堂业务语境为班级ID |
| `class_id` | bigint(20) | NO / MUL | 课节ID |
| `identity` | tinyint(4) | NO | 身份（3为老师 4为助教<或称联席教师>） |
| `st_id` | bigint(20) | NO / MUL | 机构老师唯一关联ID（对应eo_os.eeo_school_teacher表主键） |
| `teacher_uid` | bigint(20) | NO | 老师uid |

### 4. 原始课堂录制文件：`classesrecords`

AID 为主键，FileId 带唯一索引标记；同一 CID 可以有多段、多种录制，不能按单文件代表整节课。 共 15 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `AID` | int(10) unsigned | NO / PRI | 自增主键 |
| `SID` | bigint(20) unsigned | YES / MUL | 机构uid |
| `CourseID` | bigint(20) unsigned | YES / MUL | 班级id；本分册课堂业务语境为班级ID |
| `CID` | bigint(20) unsigned | NO / MUL | 课堂/课节 id |
| `StartTime` | int(10) unsigned | YES | 开始时间（unix时间戳） |
| `CloseTime` | int(10) unsigned | YES | 关闭时间（unix时间戳） |
| `JSON` | mediumtext | YES | 视频信息（JSON），其中“video_url” key为视频地址 |
| `Tag` | int(10) unsigned | YES / MUL | 标签 |
| `FileId` | varchar(100) | NO / UNI | 视频文件在COS上的文件id |
| `Size` | bigint(20) unsigned | YES | 视频大小（字节） |
| `Duration` | bigint(20) unsigned | YES | 视频时长（秒） |
| `CreateTime` | int(10) unsigned | NO / MUL | 创建时间（unix时间戳） |
| `DeleteTime` | int(10) unsigned | NO / MUL | 删除时间（unix时间戳） |
| `SubAppId` | bigint(20) unsigned | YES / MUL | 子应用ID |
| `SourceType` | tinyint(3) unsigned | YES | 来源类型 |

### 5. 原始回放观看记录：`eeo_webcast_client_play_data`

id 为主键；用户 × 课节 × file_id 层次。file_id=0 按KB为课节维度，其他为视频维度，二者不能累加。物理联合唯一索引未核验。 共 20 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | bigint(20) unsigned | NO / PRI | 主键ID |
| `client_course_id` | bigint(20) unsigned | NO | 班级ID |
| `client_class_id` | bigint(20) unsigned | NO / MUL | 课堂/课节 ID |
| `uid` | bigint(20) unsigned | NO / MUL | 用户UID |
| `look_count` | int(10) unsigned | NO | 观看次数 |
| `top_process` | tinyint(3) unsigned | NO | 观看最高进度（百分比的分母） |
| `sum_time` | int(10) unsigned | NO | 观看累计时长（秒） |
| `play_new_time` | varchar(1000) | NO | 观看最新时长(json) |
| `video_sum_time` | int(10) unsigned | NO | 回放视频累计时长（秒） |
| `create_time` | int(10) unsigned | NO | 创建时间（unix时间戳） |
| `update_time` | int(10) unsigned | NO | 更新时间（unix时间戳） |
| `file_id` | varchar(100) | NO | 视频id, 课节维度的为0 |
| `total_play_sec` | int(11) | NO | 视频累计观看时长（秒） |
| `play_part` | text | YES | 观看片段 |
| `play_valid_sec` | int(11) | NO | 有效观看时长（秒） |
| `play_bar_max` | int(11) | NO | 最大一次观看进度条位置（秒） |
| `play_bar_sec` | int(11) | NO | 最近一次观看进度条位置（秒） |
| `play_num_part` | text | YES | 观看次数片段-课节维度无数据,仅视频维度有数据 |
| `play_valid_num` | int(10) unsigned | NO | 有效观看次数 |
| `all_file_ids` | text | YES | 所有的file_id(包含录制教室+录制现场) |

### 6. 数仓课节：`ods_ms_eo_os_eeo_course_class_di_view`

日增量 dt；业务 class_id 应在指定分区窗口内去重或按快照/变更规则选取，不能把跨日记录直接当多节课。 共 37 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `class_id` | bigint | 未返回 | 单课ID |
| `course_id` | bigint | 未返回 | 课程ID；本分册课堂业务语境为班级ID |
| `school_uid` | bigint | 未返回 | 机构id |
| `class_number` | int | 未返回 | 课节号 |
| `class_name` | string | 未返回 | 单课名称 |
| `teach_id` | bigint | 未返回 | 关联课程体系id |
| `cloud_folder` | bigint | 未返回 | 云盘目录id |
| `skin_id` | bigint | 未返回 | 课节指定皮肤ID |
| `seat_num` | tinyint | 未返回 | 上台人数 |
| `class_type` | tinyint | 未返回 | 课节类型 |
| `main_st_id` | bigint | 未返回 | 老师-机构教师唯一关系uid |
| `ass_st_id` | bigint | 未返回 | 助教-机构教师唯一关系uid |
| `class_btime` | int | 未返回 | 开始上课时间 |
| `class_etime` | int | 未返回 | 上课结束时间 |
| `is_auto_onstage` | tinyint | 未返回 | 是否自动上台（1不自动2自动） |
| `class_status` | tinyint | 未返回 | 单课状态(1还没开课 2上课中 3上课结束 4已取消) |
| `is_hd` | tinyint | 未返回 | 是否高清(0非高清 1高清) |
| `is_dc` | tinyint | 未返回 | 是否是双摄像头（0 不是 1 普通 2 高清 3 全高清） |
| `teach_mode` | tinyint | 未返回 | 教学模式，1 = 在线教室，2= 智慧教室 |
| `camera_hide` | tinyint | 未返回 | 摄像头是否隐藏，0=否，显示摄像头，1=是，隐藏摄像头 |
| `screen_mode` | tinyint | 未返回 | 屏幕模式，1=标准模式，2 = 大屏模式 |
| `add_status` | tinyint | 未返回 | 课程新建状态(没有开课时间时为1有开课时间为0) |
| `live_state` | tinyint | 未返回 | 是否直播(0 不直播，1 直播) |
| `record_state` | tinyint | 未返回 | 是否录播(0 不录播 1 录播) |
| `open_state` | tinyint | 未返回 | 是否公开回放(0 不公开，1 公开) |
| `is_lock` | tinyint | 未返回 | 是否锁定 |
| `client_class_id` | bigint | 未返回 | 客户端对应单课id |
| `addtime` | int | 未返回 | 添加时间 |
| `watch_by_login` | tinyint | 未返回 | 只允许登录账号观看直播回放 0=未开启 1=开启 |
| `allow_unlogged_chat` | tinyint | 未返回 | 允许未登录用户参与直播聊天发言 0=不允许 1=允许 |
| `watch_password` | string | 未返回 | 敏感凭据字段；仅登记结构，禁止读取或作为AI输入 |
| `record_type` | tinyint | 未返回 | 录课类型 0录教室 1录教室 2两个都录 |
| `subject_id` | int | 未返回 | 学科ID |
| `creater_uid` | bigint | 未返回 | 创建人ID |
| `creater_name` | string | 未返回 | 创建人名字 |
| `class_source` | tinyint | 未返回 | 课节来源 |
| `dt` | string | 未返回 | 分区日期 |

### 7. 数仓成员停留：`ods_ms_eo_os_eeo_class_member_time_di_view`

成员 × 单次课节的停留记录；带 dt。重复进出在 time_list 中（KB：PHP序列化），不是一行等于一次进入。is_on 为昨日入仓状态，不是现在在线。 共 17 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | bigint | 未返回 | ID |
| `school_uid` | bigint | 未返回 | 机构UID |
| `course_id` | bigint | 未返回 | 课程ID；本分册课堂业务语境为班级ID |
| `class_id` | bigint | 未返回 | 单课ID |
| `member_uid` | bigint | 未返回 | 成员UID |
| `member_account` | string | 未返回 | 成员帐号；非教学问答默认不取 |
| `member_nickname` | string | 未返回 | 成员昵称 |
| `time_list` | string | 未返回 | 时间列表 |
| `is_late` | tinyint | 未返回 | 是否迟到(0未迟到 1迟到) |
| `is_on` | tinyint | 未返回 | 是否在线(0未在线 1在线) |
| `is_early` | tinyint | 未返回 | 是否早退(0未早退 1早退) |
| `identity` | int | 未返回 | 用户身份 |
| `platform_type` | smallint | 未返回 | 进入教室时终端类型 |
| `stayin_time` | int | 未返回 | 教室停留时间 |
| `add_time` | int | 未返回 | 添加时间 |
| `client_class_id` | bigint | 未返回 | 客户端单课ID |
| `dt` | string | 未返回 | 分区日期 |

### 8. 数仓课节学生关系：`ods_ms_eo_os_eeo_class_and_student_di_view`

日增量 dt；比原始关系多 class_etime/dt。isdel 的实测注释限定在开课前10分钟内到课节结束前删除，不能直接移用原始删除语义。 共 9 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `class_and_student_id` | BIGINT | Yes / false | 主键ID |
| `course_id` | BIGINT | Yes / false | 课程ID；本分册课堂业务语境为班级ID |
| `class_id` | BIGINT | Yes / false | 课节ID |
| `stud_id` | BIGINT | Yes / false | 学生明细ID |
| `school_uid` | BIGINT | Yes / false | 学校UID |
| `student_uid` | BIGINT | Yes / false | 学生UID |
| `isdel` | TINYINT | Yes / false | 是否是在开课前10分钟以内到课节结束前删除 0否 1是 |
| `class_etime` | BIGINT | Yes / false | 课节结束时间 |
| `dt` | VARCHAR(1073741824) | Yes / false | 分区日期 |

### 9. 数仓教师课后点评：`ods_ms_eo_os_eeo_teacher_comment_di_view`

每条老师对学生的课后点评，以 id 识别；st_id / stud_id 是机构关系ID，不是全局用户UID；本次未验证一师一生一课唯一。 共 9 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | BIGINT | Yes / false | ID |
| `stud_id` | BIGINT | Yes / false | 机构学生关系ID |
| `st_id` | BIGINT | Yes / false | 机构老师关系ID |
| `course_id` | BIGINT | Yes / false | 课程ID；本分册课堂业务语境为班级ID |
| `class_id` | BIGINT | Yes / false | 课节ID |
| `star_level` | INT | Yes / false | 评星 |
| `comment` | VARCHAR(1073741824) | Yes / false | 评论内容 |
| `comment_timestamp` | INT | Yes / false | 评论时间 |
| `dt` | VARCHAR(1073741824) | Yes / false | 分区日期 |

### 10. 数仓进出课堂日志：`ods_ms_eo_log_logclassattendance_di_view`

每次出勤事件；logid 标注主键来源，uid+cid+actiontime 可解释事件。进入次数≠到课人数；action/result 完整成功枚举未核验。 共 14 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `logid` | int | 未返回 | 主键，自增长 |
| `actiontime` | timestamp | 未返回 | 事件时间 |
| `uid` | bigint | 未返回 | 目标用户唯一标识号 |
| `cid` | bigint | 未返回 | 教室唯一标识号 |
| `courseid` | bigint | 未返回 | 课程唯一标识号 |
| `sid` | bigint | 未返回 | 学校唯一标识号 |
| `servername` | string | 未返回 | 登录服务器名称；非教学问答默认不取 |
| `clienttype` | int | 未返回 | 客户端类型 |
| `clientflag` | string | 未返回 | 客户端标志 |
| `ip` | bigint | 未返回 | 客户端IP地址；非教学问答默认不取 |
| `action` | string | 未返回 | 事件 |
| `result` | int | 未返回 | 结果 |
| `remark` | string | 未返回 | 说明 |
| `dt` | string | 未返回 | 分区日期 |

### 11. 数仓学生课堂行为：`dwd_class_student_action_v2_di_view`

一条学生课堂行为；source_id + action + 课节 + 用户仅候选定位，未验证唯一。details 是未解析字符串，不能直接推断题目答案或板书正文。 共 11 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `action` | string | 未返回 | 动作 |
| `class_id` | bigint | 未返回 | 课节ID |
| `course_id` | bigint | 未返回 | 班级ID；本分册课堂业务语境为班级ID |
| `school_uid` | bigint | 未返回 | 学校ID |
| `source_id` | string | 未返回 | 来源ID |
| `close_time` | bigint | 未返回 | 课节结束时间 |
| `start_time` | bigint | 未返回 | 课节开始时间 |
| `uid` | bigint | 未返回 | 用户ID |
| `iden` | int | 未返回 | 用户身份 |
| `details` | string | 未返回 | 详情 |
| `dt` | string | 未返回 | 分区日期 |

### 12. 数仓IM消息：`ods_ms_eo_chat_msg_user_chat_msg_di_view`

KB给定消息逻辑定位 clusterid + msgbucketid + msgid；本次仅元数据，不验证唯一。replymsgid 关联回复目标时须补群/桶约束。发送者 sourceuid 和 targetuids 接收列表不同。 共 13 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | bigint | 未返回 | id |
| `clusterid` | bigint | 未返回 | 集群ID |
| `clustertype` | int | 未返回 | 集群类型 |
| `msgbucketid` | bigint | 未返回 | 消息桶ID |
| `msgid` | bigint | 未返回 | 消息ID |
| `msgcmd` | int | 未返回 | 消息指令 |
| `msgdata` | string | 未返回 | 消息内容 |
| `replymsgid` | bigint | 未返回 | 回复消息ID |
| `sourceuid` | bigint | 未返回 | 发送者UID |
| `targetuids` | string | 未返回 | 接收者UID列表 |
| `timetag` | bigint | 未返回 | 消息时间戳 |
| `timeformat` | bigint | 未返回 | 格式化时间 |
| `dt` | string | 未返回 | 分区日期 |

### 13. 数仓IM群成员：`ods_ms_eo_im_cluster_member_f_view`

群 × 用户，以 clusterid+uid 为业务关联候选；type 有普通/联系人维度。identity 是管理身份，classidentity 是课堂角色；二者不等同。 共 19 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `clusterid` | bigint | 未返回 | 群唯一标识 |
| `type` | int | 未返回 | 聊天群类型：0 - 普通聊天群；1 - 联系人聊天群 |
| `uid` | bigint | 未返回 | 用户唯一标识 |
| `status` | int | 未返回 | 群成员状态：0 - 正常；1 - 锁定；255 - 删除 |
| `cardsetting` | tinyint | 未返回 | 群名片更改设置：0-不允许被修改；1-允许管理员修改 |
| `cardinfover` | int | 未返回 | 群名片版本 |
| `nickname` | string | 未返回 | 群昵称 |
| `identity` | int | 未返回 | 群身份：0-普通成员；1-管理员；255-群主 |
| `classidentity` | tinyint | 未返回 | 群成员的教室身份: 0-无效, 1-学生, 2-旁听, 3-讲师, 4-助教 |
| `gender` | tinyint | 未返回 | 群名片性别 |
| `tel` | string | 未返回 | 群名片电话；非教学问答默认不取 |
| `email` | string | 未返回 | 群名片邮箱；非教学问答默认不取 |
| `comment` | string | 未返回 | 群名片个人说明 |
| `membersettingflags` | int | 未返回 | 全局群成员设置：0x1 - 禁言 |
| `allowspeaktime` | int | 未返回 | 允许发言的时间 |
| `exitmsgid` | bigint | 未返回 | 成员退出群组时的最近一条消息的ID |
| `exitdisplayablemsgid` | bigint | 未返回 | 成员退出群组时的最近一条可呈现消息的ID |
| `timetag` | bigint | 未返回 | 时间标记 |
| `updatetime` | date | 未返回 | 修改时间戳 |

### 14. 数仓用户群关系：`ods_ob_eo_im_user_cluster_relation_f_view`

用户 × 群，以 uid+clusterid 为业务关联候选；实测两键均string，连接bigint表需验证数值合法和无损转换。当前关系不是历史消息发生时成员快照。 共 27 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `uid` | string | 未返回 | 用户唯一标识 |
| `clusterid` | string | 未返回 | 群唯一标识 |
| `type` | string | 未返回 | 聊天群类型：0 - 普通聊天群；1 - 联系人聊天群（联系人之间的聊天） |
| `status` | string | 未返回 | 群成员状态：0 - 正常；1 - 锁定；255 - 删除 |
| `relationmark` | string | 未返回 | 群关系标记 |
| `contactoruid` | string | 未返回 | 联系人唯一标识 |
| `timetag` | string | 未返回 | 时间标记 |
| `clusterinfotimetag` | string | 未返回 | 群信息时间标记 |
| `sid` | string | 未返回 | 机构唯一标识号 |
| `clusterstatus` | string | 未返回 | 群状态 |
| `memberinfotimetag` | string | 未返回 | 群成员信息时间标记 |
| `identity` | string | 未返回 | 群成员身份 |
| `classidentity` | string | 未返回 | 教室角色 |
| `userconfigtimetag` | string | 未返回 | 个人群配置时间标记 |
| `readcursor` | string | 未返回 | 个人已读游标 |
| `usermsgflags` | string | 未返回 | 个人消息标志位 |
| `tasktimetag` | string | 未返回 | 个人任务快照信息时间标记 |
| `taskver` | string | 未返回 | 个人任务快照信息版本 |
| `taskinfo` | string | 未返回 | 个人任务快照信息 |
| `topmsgflag` | string | 未返回 | 置顶消息标志 |
| `topmsgtimetag` | string | 未返回 | 置顶消息时间标记 |
| `lastmsgtimetag` | string | 未返回 | 群最近一条消息时间标记 |
| `lastmsgid` | string | 未返回 | 群最近一条消息的ID |
| `lastdisplayablemsgid` | string | 未返回 | 群最近一条可呈现聊天消息的ID |
| `displayablemsgnum` | string | 未返回 | 个人已读游标与最近一条聊天消息之间的可呈现聊天消息数量 |
| `atmsgid` | string | 未返回 | 个人已读游标与最近一条聊天消息之间的本用户被@标识 |
| `updatetime` | date | 未返回 | 修改时间 |

### 15. 数仓AI会话消息：`dwd_ai_session_message_df_view`

一条AI问答消息；as_id 实测注释仅写ai_agent主键，未验证与会话主表的关联，不能猜作session_id。它不是班级IM消息或授课报告正文。 共 13 列。

| 字段 | 实测类型 | 可空 / 键 | 业务意义 |
| --- | --- | --- | --- |
| `id` | bigint | 未返回 | id |
| `uid` | bigint | 未返回 | uid |
| `as_id` | bigint | 未返回 | ai_agent 的主键 |
| `message_id` | string | 未返回 | ai侧消息id |
| `question` | string | 未返回 | 问题 |
| `answer` | string | 未返回 | 答案 |
| `is_useful` | tinyint | 未返回 | 1:无用 2:有用 |
| `is_deleted` | tinyint | 未返回 | 是否删除: 0否 1是 |
| `created_at` | int | 未返回 | 创建时间 |
| `created_at_str` | string | 未返回 | 创建时间字符串 |
| `updated_at` | int | 未返回 | 更新时间 |
| `updated_at_str` | string | 未返回 | 更新时间字符串 |
| `dt` | string | 未返回 | 分区日期 |

## 4. 现有 V2 接口实际提供到哪一层

本节是本地实现证据，不把代码字段当成全平台业务内容覆盖证明。9月15日已有测试接口样本另见[API证据](COPILOT-GENERAL-QUESTIONS-API-EVIDENCE-2026-09-15.md)。

| 内容 | 当前读取/映射 | 当前不能承诺的部分 |
| --- | --- | --- |
| 课堂概览报告 | 时长、应到/实到/迟到人数；先核对报告机构、班级、课节归属 | 不是实时在课名单；不会因此得到每人答题或注意力 |
| 课堂截图/板书 | 图片列表的数量分别映射为 highlights / blackboards | 当前报告适配器只计数，未识别图像正文；“有2张板书”不能写成“学了2个知识点” |
| 教师笔记 | 当前教师本人的笔记ID、去HTML文本、创建时间；验证返回数量 | 不是全部教师或学生笔记，不是录音逐字稿；单页上限与total不符时判未取全 |
| 授课AI分析 | 判断 hasRecord 后映射 available / not_generated | available 仅有记录，未取得分析正文；AI观点不覆盖业务到课事实 |
| 回放录制 | 课节下文件、时长、受控播放引用；再次校验教师权限 | 文件存在不证明学生有观看权限；可播放不代表已转写/理解课程内容 |
| 自由问答上下文 | 按问题挑选课堂/资料等已取得内容；教师笔记在私有分析场景中有范围控制 | 不是全量数据自动装进每次模型调用；当前类目范围和缺失字段要单独验证 |
| IM消息 | DW 已验证结构；当前课堂报告适配器不负责聊天全文读取 | 此处分册不证明原项目或V2已获得完整历史IM检索及消息协议解析 |

实现依据：V2 的 `server/classin-test-reports.ts`、`server/classin-test-replay.ts`、`server/classin-test-service.ts` 及对应测试、`src/contracts/classin-test/index.ts`。这些文件未修改。

## 5. 从数据反推教师问题

| 老师的问题 | 最少证据链 | 可给出的回答 | 仍需补齐/限制 |
| --- | --- | --- | --- |
| 明天哪节课，谁来上？ | 单次课节计划 + 本课教师/学生关系 + LMS课程映射 | 课程/课节、时段、授课角色、应到名单 | 原始实时接口及成员变更口径；不能取全班成员当应到 |
| 这节课谁没到、谁迟到？ | 应到关系 + 实际进出/停留 + 课节时段 | 截止到某时点的名单和事实 | DW只能历史；实时催课必须实时状态，离班/旁听需明确 |
| 他是不是中途离开了？ | 多段进出明细 time_list + 实际授课结束时间 | 进入、离开、再次进入、累计停留 | 不把早退标记直接解释为主动逃课；断网等原因未知 |
| 最近几节参与怎么样？ | 多课节事件 + 动作枚举 + 应参与机会 | 举手/上台/答题次数及时间范围 | details协议及完整动作枚举尚未核验；次数不等于专注度/掌握程度 |
| 哪些课堂题答错了？ | 行为details解析 + 题干/标准答案 + 学生作答 + 正确判定 | 原题、错答和解析，附分母 | 当前只验证details字段，未证明里面可恢复全部题目和答案 |
| 我上次怎么评价这个孩子的？ | 教师点评 + 机构师生ID桥接 + 单课 | 原评语、星级、评价时间 | 评星不是客观正确率；空评语不应生成假原话 |
| 这堂课有回放吗？ | 录制配置 + 实际文件元数据 + 删除状态 + 权限 | 录制文件和可访问状态 | record_state=1不保证文件存在；读取失败不等于无回放 |
| 哪些孩子补看了回放？ | 应看范围 + 用户×课节×文件观看数据 | 已观察到的观看时长/片段 | 课节汇总file_id=0不能叠加文件明细；拖动进度不等于看完 |
| 帮我整理本讲知识点 | 本人笔记正文 + 可识别板书/课件 + 报告正文或转写 | 基于已取得内容的整理 | 仅有课名、截图数量、AI报告存在标志不足以完整课堂回顾 |
| 群里上次布置了什么？ | 授权班级群映射 + 历史消息协议解析 + 时间窗口 | 原消息出处、要求、附件索引 | 撤回/编辑、系统消息、引用范围和保留期限尚未验证 |
| 哪些学生还没看通知？ | 消息ID + 成员读取游标/已读协议 + 可见范围 | 若协议支持，消息级阅读状态 | readcursor字段存在不等于逐条已读证明，不能按ID大小自行比较 |
| 老师已经问AI什么？ | 本人授权会话与AI消息关联 | 本会话问题及回答历史 | as_id关联未经验证；其他用户私有会话不可作为班级公共事实 |

问答要有四层证据：**业务对象 → 事件/参与事实 → 教学内容原文 → 教师或AI解释**。前两层能回答“谁、什么时候、多少”，第三层才支持“具体讲了什么、错在哪里”；第四层必须说明它是点评或推断。

## 6. 接入前需要确定的合同

1. **范围合同**：机构、当前教师、班级、LMS课程、活动、课节及个人对象必须有可复核关联；当前身份、历史身份、可访问权限分开。
2. **时间合同**：计划开始/结束、实际进出、点评时间、文件更新时间、业务消息时间、数仓入仓日期分别保留。时间戳未标单位的字段不猜秒/毫秒；timeformat、timetag需取协议校验。
3. **参与合同**：应到、实际到过、此刻在线、旁听、迟到、早退、留在课堂的秒数是不同指标。有效课堂“教师≥900秒且有学生进入”属于统计口径，不是可向家长解释的学习质量。
4. **内容合同**：notes.text可引用；图像计数仅说明产物数量；details、msgdata、JSON等需指定解析版本。附件URL/文件ID只是资源指针，另需读取、授权和内容解析。
5. **状态合同**：无数据、尚未生成、没权限、提取失败、数据未取全、确认为0分别呈现。报告部分失败不抹掉其他已取得证据。
6. **聚合合同**：先验证一对多和唯一性，再计算人数/次数；跨文件、跨课、跨天都避免重复累计。正确率同时声明“实际答题”或“应答题”分母。
7. **消息合同**：按msgcmd区分业务类型，明确正文、附件、系统消息、回复、撤回/编辑、可见性、已读语义及保留期；AI会话绝不能混作学生发言。

## 7. 缺口和下一步核验范围

- **已完成**：上述15对象253列的实时元数据核验、核心对象关系整理、V2报告/笔记/回放适配代码对照。
- **未完成**：完整数据库所有表普查；课堂行为所有动作与details嵌套结构；报告正文/板书/逐字稿的源表定位；IM协议、消息内容结构、撤回与权限；学生观看与实际内容样本的完整性。
- **仅字典或研究证据**：班级course_id到群clusterid、课节class_id到LMS课堂biz_id的关系；本轮没有业务行join验证，不宣称100%覆盖。
- **优先闭环**：选一位获授权教师、一个班级一门课程、两节结束课，逐对象校验应到→参与→点评→材料→群消息；保留字段来源和缺口。未经该闭环，不把“可查询字段”写成页面承诺。
- **扩大覆盖**：再验证班级多课程、跨天课堂、联席教师、旁听、多人多录制文件、课程/成员变更、撤回消息等边界。

本轮没有读业务正文或个人数据，没有改动原项目/V2应用代码，没有启动或停止服务。

## 8. 来源及核验记录

- 在线数仓知识库：全局查询指南、课堂/课节原始字典（104）、课堂/课节数仓字典（206）、AI应用数仓字典（208）、IM聊天数仓字典（213）；本次完整读取104/206/208/213，文档版本标记2026-09-09。
- 在线术语及指标检索：老师课节考勤、学生课节考勤、业务场景指南；其记录的指标缺陷与占位值不视为当日数据测量。
- 2026-09-15逐表元数据：原始5表与数仓10视图；权限仅用于describe，不查业务内容。两张数仓视图切换同源引擎后成功取得。
- [课堂到课程分类关联复核（V2，9月14日）](/Users/eeo/Documents/claudecode/classin-ai-harness-v2/docs/01-research/CLASSIN-CLASSROOM-COURSE-RELATION-REVIEW-2026-09-14.md)：复核范围和术语背景，不覆盖本次元数据实测。
- [既有API原文证据](COPILOT-GENERAL-QUESTIONS-API-EVIDENCE-2026-09-15.md)、[既有DW内容证据](COPILOT-GENERAL-QUESTIONS-DW-EVIDENCE-2026-09-15.md)：以前述独立采样范围为限，不作为全平台内容覆盖率。
