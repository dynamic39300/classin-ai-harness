---
title: ClassIn 教学数据字典：组织、成员、班级与课程
status: METADATA_VERIFIED_WITH_SEMANTIC_GAPS
date: 2026-09-15
scope: 8张原始核心表完整列清单，附1张班级数仓视图对照
---

# 组织、成员、班级与课程字段字典

[返回教学数据地图](./CLASSIN-TEACHING-DATA-MAP-2026-09-15.md)

本分册记录2026-09-15只读元数据核验结果；字段存在与类型经过实测，业务意义来自在线字典并结合元数据注释校准。没有读取真实用户资料或凭据值。完整列清单表示本册8张原始表的列已穷举，不代表ClassIn全库穷举或所有字段语义已确认。

## 1. 表与关系目录

| 编号 | 对象 | 表 | 字段数 | 关系与使用边界 |
| --- | --- | --- | ---: | --- |
| B01 | 机构 | `eeo_school_auth` | 59 | 组织归属与服务状态；认证、财务及密钥类字段只列结构，不进入教学上下文。 |
| B02 | 机构教师关系 | `eeo_school_teacher` | 20 | 唯一关系为机构＋teacher_uid；st_id 是机构教师记录键，不是用户UID。 |
| B03 | 班级 | `eeo_course` | 42 | course_id 表示班级；course_stid 关联机构教师 st_id，不能代替全体任课教师。 |
| B04 | 班级成员 | `eeo_course_member` | 22 | 唯一键(course_id,user_id)；物理主键(id,user_id)。正常在班看 state=0；教师包含3和192，旁听2与正式学生1分开。 |
| B05 | 机构学生关系 | `eeo_school_students` | 20 | 唯一关系为机构＋student_uid；不能以此关系代替学生在某班或被某活动分配。 |
| B06 | 用户展示信息 | `eeo_user_basic_info` | 16 | 用于授权对象的名称/头像兜底；个人资料不进入教学表现推断。 |
| B07 | 班内课程 | `lms_category` | 10 | id 对应活动/单元的category_id；父级course_id仍是班级。 |
| B08 | 课程单元 | `lms_unit` | 13 | id 对应活动unit_id；同一单元中的课堂与作业不自动形成逐课配套关系。 |

机构键在机构主表是uid，在关系表是school_uid。用户键在成员表是user_id，在教师关系中是teacher_uid，在学生关系中是student_uid。物理关联按实测字段实现，业务查询仍应携带机构和班级范围并核对归属；索引不是访问授权。

## 2. 已确认差异与回答影响

| 项目 | 核验结果 | 对老师问题的影响 |
| --- | --- | --- |
| 班级与课程 | course_id是班级；LMS category_id是班内课程 | “几门课”按课程分类统计，不按班级或课次数统计 |
| 成员UID | 实测user_id；部分指南写uid | 以实测字段关联，防止误取姓名与个人记录 |
| 昵称 | 实测nickname/truename；指南示例带下划线 | 当前班级昵称→机构姓名→账号昵称，按授权和非空值兜底 |
| 班人数 | student_num口径冲突 | 在班正式学生用state=0、identity=1的去重成员，旁听单列 |
| 个人累计表现 | 103将学生course_count/attendence/total_class/on_class/off_class标不可靠，205仍仅列一般描述 | 不直接回答真实出勤率/课程完成度，回到课节明细 |
| 任课教师 | 创建人、班主任、活动教师、课节教师是不同关系 | 不能只用creator或班主任确定该教师所有授课/可见班级 |
| 班级状态/类型 | 103、205以及元数据注释有版本性差异 | 留原值及来源，业务解释待确认；不能只因班级结课就丢弃授权历史 |
| 群聊映射 | client_group_id被205标已废弃 | 班级到当前IM会话应核对现行映射，不能凭旧字段直接发消息 |
| 单元发布 | 0草稿、1隐藏、2显示，与是否删除独立 | 下层活动已发布不自动保证其在学生端可见 |
| 新字段 | 机构lifecycle_level不在103旧字典、已在元数据出现 | 已补列；不把其解释成学员学习等级 |

## 3. 完整原始字段清单

类型、可空与键来自本次describe；PRI/UNI/MUL分别是元数据键标记，不代表所有联合索引已在单列中表达。无可信说明的字段保留“待核”，默认0不自动等于真实业务零。

### B01 机构 · eeo_school_auth

来源：S01；本轮describe及详细元数据核验。59列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `id` | int(10) unsigned | 否 | PRI | 主键，唯一ID |
| `uid` | bigint(20) | 否 | UNI | 认证用户uid（机构主账号uid，即机构uid） |
| `user_account` | varchar(50) | 否 | MUL | 机构/学校的eeo帐号 |
| `school_name` | varchar(100) | 否 | — | 机构/学校名称 |
| `account_name` | varchar(100) | 是 | — | 开户名称；非教学问答上下文 |
| `school_logo` | varchar(100) | 是 | — | 机构/学校logo图片（相对地址） |
| `school_kind` | smallint(6) | 是 | — | 主营类目（1=IT/互联网计算机（已弃用） 2=考试考级（已弃用） 3=生活/文艺（已弃用） 4=通用技能（已弃用） 5=公立中小学校 6=职场（已弃用） 7=语言技能（已弃用） 8=金融类（已弃用） 9=营销类（已弃用） 10=其他（已弃用） 11=少儿英语培训 12=K12学科培训 13=留学语言培训 14=STEM（已弃用） 15=职业培训 16=四六级与考研 17=公立学校<已弃用> 18=公益组织 19=对外汉语 20=国际学校<已弃用> 21=成人英语 22=小语种 23=素质类教育培训 24=大学<高等教育> 25=民办中小学校 27=全日制国际学校 999=其他） |
| `school_type` | smallint(6) | 是 | — | 所属类型（已废弃） |
| `school_url` | varchar(155) | 是 | — | 机构/学校 主页 |
| `prove_file` | varchar(100) | 是 | — | 认证文件地址（相对地址）；非教学问答上下文 |
| `prove_number` | varchar(30) | 是 | — | 认证编号；非教学问答上下文 |
| `person_name` | varchar(50) | 否 | — | 认证人员姓名；非教学问答上下文 |
| `person_phone` | varchar(50) | 否 | — | 认证人员电话号码；非教学问答上下文 |
| `person_card` | varchar(100) | 是 | — | 身份证图片地址（相对地址）；非教学问答上下文 |
| `person_card_back` | varchar(100) | 是 | — | 身份证图片背面地址（相对地址）；非教学问答上下文 |
| `person_card_number` | varchar(20) | 是 | — | 身份证号码；非教学问答上下文 |
| `price_type` | tinyint(1) | 否 | — | 扣费标准（1默认 2定制） |
| `service_state` | tinyint(1) | 否 | MUL | 服务状态（1=服务中 2=服务到期停用 3=欠费暂停 4=手工停用 5=注销停用） |
| `bank_name` | varchar(100) | 是 | — | 开户行名称；非教学问答上下文 |
| `bank_num` | varchar(30) | 是 | — | 开户银行帐号；非教学问答上下文 |
| `pay_passwd` | varchar(100) | 是 | — | 凭据字段：仅登记结构；不读取值，不进入模型或教学问答 |
| `secret` | varchar(32) | 是 | — | 凭据字段：仅登记结构；不读取值，不进入模型或教学问答 |
| `uptime` | int(11) | 是 | — | 认证资料提交时间（unix时间戳） |
| `api_status` | tinyint(1) | 否 | — | API对接状态（0-未对接 1-已对接） |
| `show_api_manage` | tinyint(1) | 否 | — | 是否在左侧显示API对接状态（0-不显示 1-显示） |
| `auth_status` | smallint(6) | 否 | MUL | 认证状态（0-未认证 1-认证中 2-认证未通过 3-认证通过 99-空白认证（没填过资料） |
| `school_property` | tinyint(4) | 否 | — | 机构/学校性质（1=正式学校 2=内部学校 3=公益学校） |
| `remark` | text | 是 | — | 备注，通过大后台-学校管理页面输入的纯文本 |
| `email` | varchar(150) | 是 | — | 邮箱；非教学问答上下文 |
| `area_name` | varchar(50) | 否 | — | 地区 |
| `school_category` | tinyint(1) | 否 | — | 机构类型（1-教育机构 2-个体教师） |
| `school_category_type` | tinyint(1) | 否 | — | 机构证书类型（1-营业执照，2-事业单位法人证书，3-办学许可证） |
| `iden_type` | tinyint(1) | 否 | — | 身份证明类型（1-身份证，2-护照，3-其他证书） |
| `auth_time` | int(11) | 否 | — | 认证时间（unix时间戳） |
| `rebut_reason` | varchar(500) | 是 | — | 未通过认证的原因 |
| `contract_subject` | varchar(100) | 否 | — | 合同主体 |
| `contract_mode` | tinyint(1) | 否 | — | 合同方式（0-未签合同 1-电子合同 2-纸质合同） |
| `contract_type` | tinyint(1) | 否 | — | 合同类型（0=无合同 1=ClassIn 2=ClassIn+SchooIn 3=classin极速 4=schooin） |
| `expire_time` | int(10) unsigned | 否 | — | 服务到期时间（unix时间戳，0表示永久有效） |
| `first_recharge` | tinyint(3) unsigned | 否 | — | 是否已首次充值（0-未首充 1-已首充） |
| `service_version` | tinyint(3) unsigned | 否 | — | 服务版本（1=免费版 2=专业版 3=教师版 4=企业试用版 5=企业版 7=中小学试用版 8=学校版 9=板书教学版 10=在线教学版 11=LMS教学版 12=混合学习版 13=商业高级版 14=国际个人版 15=国际课时包标准版 16=高校教师版 17=高校学院版 18=国际课时包高级版 19=国际企业标准版 20=国际企业高级版 21=国际企业旗舰版 22=基础版 23=存储订阅版 24=高校学校版 25=商业试用版 26=商业版 27=臻享版 28=月享版） |
| `service_version_type` | tinyint(3) unsigned | 否 | — | 服务版本类型：1=默认；2=定制（已废弃） |
| `version_open_time` | int(10) unsigned | 否 | — | 服务版本开通时间（unix时间戳） |
| `version_expire_time` | int(10) unsigned | 否 | — | 服务版本到期时间（unix时间戳） |
| `trial_status` | tinyint(3) unsigned | 否 | — | 试用状态（0-未试用，1-试用中，2-试用结束） |
| `add_time` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `stop_time` | int(11) | 否 | MUL | 机构停用时间（unix时间戳） |
| `cmb_account` | varchar(50) | 是 | — | 招行银行子账号后十位；非教学问答上下文 |
| `result_ocr` | tinyint(1) | 否 | — | OCR识别结果（1-一致，2-一致但缺字段，3-不一致，4-未识别） |
| `rejection` | tinyint(1) | 否 | — | 驳回和填写状态（0-默认值，1-驳回重新填写，2-已填写过认证资料窗口，3-命中需要弹窗填写认证资料的uid白名单） |
| `country_line` | tinyint(4) | 否 | — | 国家地区（0-无，1-国内，2-海外） |
| `service_line` | tinyint(4) | 否 | — | 业务线；原始字典含0无/1幼儿园/2中小学/3高校/4教培/5公益/6市场合作；实测注释仅到5，205误写为服务版本，待维护者统一 |
| `type` | tinyint(4) | 否 | MUL | 机构类型（1-教培机构，2-中小学校） |
| `init_status` | tinyint(4) | 否 | — | 初始化状态（0-未（0-未初始化，1-初始化中，2-初始化完成） |
| `brief` | varchar(1024) | 否 | — | 大部分是空值，少部分存的机构配置 |
| `balance_state` | tinyint(4) | 否 | — | 余额状态（0-免费 1-正常 2-欠费），注意本字段只代表余额状态，与服务状态无关 |
| `arrears_time` | int(11) | 否 | MUL | 欠费时间点（unix时间戳），只和余额有关，不影响服务状态 |
| `is_clear_resource` | tinyint(4) | 否 | — | 是否清空资源（1-清除，0-不清除） |
| `lifecycle_level` | tinyint(3) unsigned | 否 | — | 生命周期等级，0免费版、1有订单或回退（本轮元数据注释；不等于教学能力） |

### B02 机构教师关系 · eeo_school_teacher

来源：S01；本轮describe及详细元数据核验。20列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `st_id` | bigint(20) unsigned | 否 | PRI | 主键，教师（老师）在机构下的唯一id |
| `school_uid` | bigint(20) | 是 | MUL | 机构uid |
| `teacher_uid` | bigint(20) | 是 | MUL | 教师（老师）uid |
| `teacher_account` | varchar(50) | 否 | — | 教师（老师）帐号 |
| `teacher_name` | varchar(50) | 是 | — | 教师（老师）姓名 |
| `teacher_logo` | varchar(100) | 是 | — | 教师（老师）logo |
| `class_num` | int(11) | 是 | — | 课节数（已废弃） |
| `student_num` | int(11) | 是 | — | 学生数（已废弃） |
| `credit_num` | tinyint(1) | 是 | — | 废弃字段 |
| `teacher_cloud_folder` | varchar(1000) | 是 | — | 老师指定云盘目录 |
| `addtime` | int(11) | 是 | — | 创建时间（unix时间戳，即老师被加入该机构时间） |
| `isdel` | tinyint(1) | 否 | — | 老师与机构的关联关系状态标记:0-未删除,1-已停用,2-停用中,3-已删除 |
| `teacher_homework_folder` | varchar(500) | 是 | — | 老师指定作业资源库目录 |
| `public_resource_status` | tinyint(3) unsigned | 否 | — | 公共授权资源是否开启，0=未开启，1=开启 |
| `empno` | varchar(100) | 否 | — | 老师工号 |
| `position` | varchar(100) | 否 | — | 老师职务 |
| `is_group` | tinyint(4) | 否 | — | 是否已分组教师 |
| `client_create_course` | tinyint(4) | 否 | — | 是否允许教师客户端建课 |
| `delTime` | int(11) | 是 | — | 删除时间（unix时间戳） |
| `join_type` | tinyint(1) | 否 | — | 账号类型:0-未知,1-手机号,2-邮箱,3-手机号和邮箱 |

### B03 班级 · eeo_course

来源：S01；本轮describe及详细元数据核验。42列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `course_id` | bigint(20) unsigned | 否 | PRI | 主键，班级ID |
| `school_uid` | bigint(20) | 否 | MUL | 班级所属机构uid |
| `kind_f` | int(11) | 否 | — | 第一级分类 |
| `kind_s` | int(11) | 否 | — | 第二级分类 |
| `kind_t` | int(11) | 否 | — | 第三级分类 |
| `course_name` | varchar(255) | 是 | — | 班级名称 |
| `cover_img` | varchar(100) | 是 | — | 图片地址 |
| `course_type` | tinyint(1) | 否 | — | 原始字典/元数据：1常规、2多人；205同名视图写另一套类型，待校准，不能跨层套枚举 |
| `course_introduce` | varchar(500) | 是 | — | 班级介绍 |
| `course_stid` | bigint(20) | 否 | MUL | 班主任老师ID，关联eo_os.school_teacher表的st_id字段 |
| `student_num` | smallint(6) | 否 | — | 人数或容量字段；103/元数据写学生数，205写人数上限。语义冲突，实际在班人数按成员关系核验 |
| `is_sale` | tinyint(1) | 否 | — | 班级是否外放(0为不外放 1为正在外放 2为审核中 3为审核没通过 4为停止外放) |
| `yu_num` | smallint(6) | 否 | — | 剩余学生数 |
| `class_count` | smallint(5) unsigned | 否 | — | 课时数 |
| `cloud_folder` | bigint(20) | 是 | — | 云盘目录id |
| `skin_id` | bigint(20) | 否 | — | 班级指定皮肤ID |
| `course_date` | date | 是 | — | 课程日期字段；205描述最早课节开课日期，需与排课明细校验 |
| `course_btime` | int(11) | 否 | — | 班级开课时间（unix时间戳） |
| `course_etime` | int(11) | 否 | — | 班级结课时间（unix时间戳） |
| `expiry_time` | int(11) | 是 | MUL | 班级过期时间（unix时间戳） |
| `course_status` | tinyint(1) | 否 | — | 原始字典/元数据：1未开、2上课中、3结束、4取消、5创建未完成、6创建中；205另有当前业务解释，须版本核对 |
| `addtime` | int(11) | 是 | — | 班级创建时间（unix时间戳） |
| `course_ware` | text | 是 | — | 班级课件/课节相关信息载体；JSON结构、附件是否可读待核，非完整授课内容 |
| `allow_initiative_join` | tinyint(1) | 否 | — | 允许学生主动加入班级，0=不允许，1=允许 |
| `allow_add_friend` | tinyint(1) | 否 | — | 允许班级成员互相添加好友，0=不允许，1=允许 |
| `allow_teacher_add_friend` | tinyint(1) | 否 | — | 允许班主任添加好友设置，0=不支持，1=支持 |
| `allow_temp_classroom` | tinyint(1) | 否 | — | 允许班级里任何用户发起临时教室，0=不允许，1=允许 |
| `invite_state` | varchar(500) | 否 | — | 分享后的网页显示加入班级入口，json，各端传递 |
| `client_course_id` | bigint(20) unsigned | 否 | MUL | 客户端对应班级id |
| `client_step_id` | bigint(20) | 否 | — | 103无明确解释、205标已废弃；不作为教学关系键 |
| `client_group_id` | bigint(20) | 否 | — | 历史客户端群组引用；205标已废弃，当前IM映射不得直接依赖 |
| `allow_teacher_add_class` | tinyint(1) | 否 | — | 是否允许教师在班级内添加课，0=不允许，1=允许 |
| `allow_student_modify_nickname` | tinyint(1) | 否 | — | 是否允许学生修改班级昵称，0=不允许，1=允许 |
| `creater_uid` | bigint(20) unsigned | 否 | — | 创建人ID |
| `creater_name` | varchar(100) | 否 | — | 创建人名字 |
| `has_cat` | tinyint(4) | 否 | — | 是否分类，0=未分类、1=已分类 |
| `end_uid` | bigint(20) unsigned | 否 | — | 结课人UID |
| `end_name` | varchar(100) | 否 | — | 结课人姓名 |
| `category_id` | bigint(20) unsigned | 否 | — | 班级分类ID 0=其他班级 |
| `subject_id` | int(11) | 否 | — | 学科id |
| `course_active_time` | int(10) unsigned | 否 | MUL | 班级活动活跃时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

### B04 班级成员 · eeo_course_member

来源：S01；本轮describe及详细元数据核验。22列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级id |
| `user_id` | bigint(20) unsigned | 否 | PRI | 用户uid |
| `nickname` | varchar(64) | 否 | — | 用户昵称 |
| `identity` | tinyint(3) unsigned | 否 | — | 身份：1-学生, 2-旁听生,3-教师,192-班主任 |
| `join_time` | int(10) unsigned | 否 | — | 加入班级时间（unix时间戳） |
| `add_course_replay` | tinyint(3) unsigned | 否 | — | 新进班用户是否有观看以前视频的权限（0 没有 1有） |
| `delete_course_replay` | tinyint(1) | 否 | — | 删除班级用户后是否有观看以前视频权限（0 没有 1 有） |
| `sort` | int(11) | 否 | — | 排序 |
| `is_del` | tinyint(4) | 否 | — | 是否删除:0-未删除,1-已删除（本字段仅作参考，以state字段为准） |
| `is_top` | tinyint(4) | 否 | — | 置顶，0否，1是 |
| `created_at` | int(11) | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(11) | 否 | — | 更新时间（unix时间戳） |
| `switch` | bit(64) | 否 | — | 开关 |
| `course_alias` | varchar(64) | 否 | — | 班级别名 |
| `state` | tinyint(3) unsigned | 否 | — | 用户在班级中的状态：0正常，1离开班级，2解散班级 |
| `todo_total` | int(10) unsigned | 否 | — | 班级待办消息总数 |
| `co_creation_total` | int(10) unsigned | 否 | — | 班级共创消息总数 |
| `notice_total` | int(10) unsigned | 否 | — | 班级公告消息总数 |
| `process_flag` | bit(64) | 否 | — | 消息标记位(bit64)，非学生活动进度；位语义未完整定义 |
| `lms_activity_latest_time` | int(10) unsigned | 否 | — | LMS活动最新时间（unix时间戳） |

### B05 机构学生关系 · eeo_school_students

来源：S01；本轮describe及详细元数据核验。20列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `stud_id` | bigint(20) unsigned | 否 | PRI | 主键，学生在机构下的唯一id |
| `stud_num` | int(11) | 是 | — | 学号（没用） |
| `school_uid` | bigint(20) | 是 | MUL | 机构uid |
| `student_uid` | bigint(20) | 是 | MUL | 学生uid |
| `student_account` | varchar(50) | 否 | — | 学生帐号 |
| `student_name` | varchar(50) | 是 | — | 学生姓名 |
| `course_count` | int(11) | 否 | — | 课程数（不可靠） |
| `attendence` | tinyint(1) | 否 | — | 出勤率（存分子数字 80、90之类的，不可靠） |
| `total_class` | int(11) | 否 | — | 课时数量（不可靠） |
| `on_class` | int(11) | 否 | — | 上过的课数量（不可靠） |
| `off_class` | int(11) | 否 | — | 逃课的数量（不可靠） |
| `endtime` | int(11) | 是 | — | 服务到期时间（不用） |
| `addtime` | int(11) | 是 | — | 创建时间（unix时间戳，即学生加入该机构时间） |
| `isdel` | tinyint(3) unsigned | 否 | — | 学生与机构的关联关系状态标记: 0- 未删除,1-已归档,3-已删除 |
| `public_resource_status` | tinyint(3) unsigned | 否 | — | 公共授权资源是否开启，0=未开启，1=开启 |
| `cloud_folders` | varchar(1000) | 是 | — | 学生指定云盘目录 |
| `is_group` | bigint(20) | 否 | — | 是否已分组学生 |
| `stuno` | varchar(50) | 否 | — | 学生号（没用） |
| `has_cat` | tinyint(4) | 否 | — | 是否分类，0=未分类、1=已分类 |
| `join_type` | tinyint(1) | 否 | — | 账号类型:0-未知,1-手机号,2-邮箱,3-手机号和邮箱 |

### B06 用户展示信息 · eeo_user_basic_info

来源：S01；本轮describe及详细元数据核验。16列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `uid` | bigint(20) unsigned | 否 | PRI | 用户uid |
| `nickname` | varchar(255) | 否 | — | 账号昵称；实测字段为nickname，非指南示例nick_name |
| `truename` | varchar(255) | 否 | — | 账号真实姓名；实测字段为truename，非指南示例true_name |
| `avatar_url` | varchar(1024) | 否 | — | 用户头像信息（Json） |
| `gender` | tinyint(3) unsigned | 否 | — | 性别（不用） |
| `sign` | varchar(512) | 否 | — | 签名 |
| `location` | varchar(255) | 否 | — | 地区（不用） |
| `birthday` | varchar(10) | 否 | — | 生日（不用） |
| `constellation` | tinyint(3) unsigned | 否 | — | 星座（不用） |
| `age` | tinyint(3) unsigned | 否 | — | 年龄（不用） |
| `blood_type` | tinyint(3) unsigned | 否 | — | 血型（不用） |
| `zipcode` | int(10) unsigned | 否 | — | 邮编（不用） |
| `zodiac` | tinyint(3) unsigned | 否 | — | 生肖（不用） |
| `update_time` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |
| `upload_time` | int(10) unsigned | 否 | — | 上传时间（unix时间戳，不用） |
| `user_qrcode` | varchar(255) | 否 | — | 个人二维码(不用) |

### B07 班内课程 · lms_category

来源：S03；本轮describe及详细元数据核验。10列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键，课程分类表唯一id |
| `name` | varchar(255) | 否 | — | 名称 |
| `school_uid` | bigint(20) | 否 | — | 机构uid |
| `course_id` | bigint(20) | 否 | MUL | 班级id |
| `order_id` | smallint(5) | 否 | — | 排序id |
| `source` | smallint(5) | 否 | — | 是否默认创建: 0-自定义，1-默认，2-课节迁移 |
| `is_deleted` | tinyint(4) | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) | 否 | — | 更新时间（unix时间戳） |
| `creator_uid` | bigint(20) | 否 | — | 创建课程分类人uid |

### B08 课程单元 · lms_unit

来源：S03；本轮describe及详细元数据核验。13列。

| 字段 | 实测类型 | 可空 | 键 | 业务意义与边界 |
| --- | --- | --- | --- | --- |
| `id` | bigint(20) unsigned | 否 | PRI | 主键自增id，单元主题表唯一ID |
| `course_id` | bigint(20) unsigned | 否 | MUL | 班级id |
| `category_id` | bigint(20) unsigned | 否 | MUL | 课程分类id |
| `school_uid` | bigint(20) unsigned | 否 | — | 机构uid |
| `name` | varchar(200) | 否 | — | 单元主题名称 |
| `content` | varchar(8000) | 否 | — | 单元介绍 |
| `order_id` | int(10) unsigned | 否 | — | 顺序值(由小到大) |
| `publish_flag` | tinyint(3) unsigned | 否 | — | 发布标识: 0-草稿，1-隐藏，2-显示 |
| `type` | smallint(5) unsigned | 否 | — | 单元类型: 0-正常单元，1-无主题单元 |
| `creator_uid` | bigint(20) unsigned | 否 | — | 创建人uid |
| `is_deleted` | tinyint(3) unsigned | 否 | — | 是否删除: 0-否，1-是 |
| `created_at` | int(10) unsigned | 否 | — | 创建时间（unix时间戳） |
| `updated_at` | int(10) unsigned | 否 | — | 更新时间（unix时间戳） |

## 4. 班级数仓视图字段对照

已describe验证班级数仓视图 `ods_ms_eo_os_eeo_course_f_view`：39列。视图并非原始表所有字段等量复制；例如未返回原始表的updated_at、course_active_time、allow_teacher_add_friend。205将其同时标_f和日增量，刷新/快照口径存在文档冲突，不能仅凭后缀推断。

| 字段 | 数仓实测类型 | 解释 |
| --- | --- | --- |
| `course_id` | bigint | 主键，班级ID |
| `school_uid` | bigint | 班级所属机构uid |
| `kind_f` | int | 第一级分类 |
| `kind_s` | int | 第二级分类 |
| `kind_t` | int | 第三级分类 |
| `course_name` | string | 班级名称 |
| `cover_img` | string | 图片地址 |
| `course_type` | int | 原始字典/元数据：1常规、2多人；205同名视图写另一套类型，待校准，不能跨层套枚举 |
| `course_introduce` | string | 班级介绍 |
| `course_stid` | bigint | 班主任老师ID，关联eo_os.school_teacher表的st_id字段 |
| `student_num` | int | 人数或容量字段；103/元数据写学生数，205写人数上限。语义冲突，实际在班人数按成员关系核验 |
| `is_sale` | int | 班级是否外放(0为不外放 1为正在外放 2为审核中 3为审核没通过 4为停止外放) |
| `yu_num` | int | 剩余学生数 |
| `class_count` | int | 课时数 |
| `cloud_folder` | bigint | 云盘目录id |
| `skin_id` | bigint | 班级指定皮肤ID |
| `course_date` | date | 课程日期字段；205描述最早课节开课日期，需与排课明细校验 |
| `course_btime` | int | 班级开课时间（unix时间戳） |
| `course_etime` | int | 班级结课时间（unix时间戳） |
| `expiry_time` | int | 班级过期时间（unix时间戳） |
| `course_status` | int | 原始字典/元数据：1未开、2上课中、3结束、4取消、5创建未完成、6创建中；205另有当前业务解释，须版本核对 |
| `addtime` | int | 班级创建时间（unix时间戳） |
| `course_ware` | string | 班级课件/课节相关信息载体；JSON结构、附件是否可读待核，非完整授课内容 |
| `allow_initiative_join` | int | 允许学生主动加入班级，0=不允许，1=允许 |
| `allow_add_friend` | int | 允许班级成员互相添加好友，0=不允许，1=允许 |
| `allow_temp_classroom` | int | 允许班级里任何用户发起临时教室，0=不允许，1=允许 |
| `invite_state` | string | 分享后的网页显示加入班级入口，json，各端传递 |
| `client_course_id` | bigint | 客户端对应班级id |
| `client_step_id` | bigint | 103无明确解释、205标已废弃；不作为教学关系键 |
| `client_group_id` | bigint | 历史客户端群组引用；205标已废弃，当前IM映射不得直接依赖 |
| `allow_teacher_add_class` | int | 是否允许教师在班级内添加课，0=不允许，1=允许 |
| `allow_student_modify_nickname` | int | 是否允许学生修改班级昵称，0=不允许，1=允许 |
| `creater_uid` | bigint | 创建人ID |
| `creater_name` | string | 创建人名字 |
| `has_cat` | int | 是否分类，0=未分类、1=已分类 |
| `end_uid` | bigint | 结课人UID |
| `end_name` | string | 结课人姓名 |
| `category_id` | bigint | 班级分类ID 0=其他班级 |
| `subject_id` | bigint | 学科id |

## 5. 来源与复核边界

- S01：在线数仓知识库《103 原始数据—后台与基础业务》，文档版本2026-09-04；完整字段解释按本次取回版本核对。
- S02：《205 数据仓库—后台与基础业务》，版本2026-09-09；用于原始/数仓口径差异对照。
- S03：《105.7 原始数据—LMS基础信息》，版本2026-09-09；课程分类与单元定义。
- S04：《011 业务术语》《010 全局查询指南》，本次在线检索；元数据和内容权限分别判断，当前允许元数据核验不意味着允许原始业务记录查询。
- S05：2026-09-15上述8张原始表的describe与详细元数据，以及1张班级数仓视图describe；共202个原始字段＋39个视图字段。DDL与内部连接标识不复制到本分册。

本册只完成结构和已登记语义核对，未运行当前班级全部成员唯一性、跨表完整率或历史版本对账。接入时须校验实际返回记录和当前教师可见范围，再投影为老师可询问的数据。

