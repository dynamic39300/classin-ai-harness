# ClassIn 技能完整清单

采集日期：2026-09-11。共 173 项技能，96 项读操作、77 项写操作。分类按技能 ID 的第二段归纳（平台分类标签为空）。157 项列出必填参数，16 项未列；所有项均未提供实际执行端点和 HTTP 方法。范围：读取平台目录并整理文档；不修改应用、不执行业务读写。清单包含名称、完整用途与触发场景、已列必填输入、权限范围和限流。平台目录未提供任何技能的结构化输出契约或可选参数表；下述「输出/结果用途」仅复述技能描述的业务含义，不代表经过验证的响应字段。未列必填参数不等于无需身份或上下文。

来源：[技能市场](https://classin-skills-platform.eeo-inc.com/skills) · [页面实际使用的技能注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

## 分类总览

| 分类 | 数量 | 读 | 写 |

|---|---:|---:|---:|

| 教学活动 | 39 | 31 | 8 |

| 账号身份 | 1 | 1 | 0 |

| 单元管理 | 4 | 2 | 2 |

| 待办事项 | 6 | 4 | 2 |

| 云盘与文件空间 | 76 | 22 | 54 |

| 成绩 | 4 | 3 | 1 |

| 学习报告 | 4 | 4 | 0 |

| 题库与试卷 | 16 | 16 | 0 |

| 视频 AI 内容 | 1 | 1 | 0 |

| 测验作答与批阅 | 1 | 1 | 0 |

| 课程与活动列表 | 5 | 5 | 0 |

| 组合查询 | 2 | 2 | 0 |

| 班级管理 | 10 | 3 | 7 |

| 课程分类 | 4 | 1 | 3 |

## 教学活动（39 项）

### classin-activity-exam-get

- 技能 ID：`classin:activity:exam:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定测验活动的详细信息，包含题目、设置和截止时间。 SID 必须用班级所属机构的 schoolUid，禁止用当前登录用户自己的机构 ID。 course_id 可选；未知时可传 0 或不传，响应 data 中会带回 courseId。 触发场景：用户问「这次测验的题目是什么」「测验详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：测验活动 ID，必填（API 字段: activityId）

**输出/结果用途（按描述）**

查询指定测验活动的详细信息，包含题目、设置和截止时间。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-video_list

- 技能 ID：`classin:activity:video_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

按活动类型列出可总结的视频 FileId。 触发：「这个活动有哪些视频/回放片段」「课堂回放文件」「录播课视频列表」。 bizType=1 普通课堂：activity/class/get → lessonKey → getLessonWebcastData； bizType=4 录播：recordClass/get → data.video。 拿到 fileId 后用 classin-file-rich_video_summary（source=classroom_replay|record）。

**已公开的必填输入**

- `biz_type`（integer，required）：1=普通课堂回放；4=录播课

**输出/结果用途（按描述）**

按活动类型列出可总结的视频 FileId。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-scorm-students

- 技能 ID：`classin:activity:scorm:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询 SCORM 活动的学生学习进度与完成情况列表。 触发场景：用户问「哪些学生学完了 SCORM 课件」「学习进度」。

**已公开的必填输入**

- `activity_id`（integer，required）：SCORM 活动 ID，必填（API 字段: activityId）
- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）

**输出/结果用途（按描述）**

查询 SCORM 活动的学生学习进度与完成情况列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-scorm-get

- 技能 ID：`classin:activity:scorm:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询 SCORM 课件活动的详细信息，包含课件内容和学习设置。 触发场景：用户问「SCORM 课件详情」「标准课件内容」。

**已公开的必填输入**

- `activity_id`（integer，required）：SCORM 活动 ID，必填

**输出/结果用途（按描述）**

查询 SCORM 课件活动的详细信息，包含课件内容和学习设置。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-scorm-create

- 技能 ID：`classin:activity:scorm:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建 SCORM 课件学习活动。 触发场景：用户说「发布SCORM」「上传课件包」。 发布/后进班/下载/公开等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：SCORM 活动标题（API: name）
- `course_id`（string，required）：主班级 ID（API: courseId）
- `course`（string，required）：课程和学生信息（JSON 数组）（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）
- `files`（string，required）：SCORM 附件 lmsFileId（JSON）（API: files）
- `unit_name`（string，required）：单元名称 JSON，如 {"name":"单元1","type":0}（API: unitName）
- `category_name`（string，required）：课程分类名称（API: categoryName）

**输出/结果用途（按描述）**

在指定班级创建 SCORM 课件学习活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-record_class-students

- 技能 ID：`classin:activity:record_class:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询录播课活动的学生观看情况列表。 触发场景：用户问「哪些学生看了录播」「录播观看情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：录播课活动 ID，必填（API 字段: activityId）
- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）

**输出/结果用途（按描述）**

查询录播课活动的学生观看情况列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-record_class-participation

- 技能 ID：`classin:activity:record_class:participation`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询录播课的整体参与统计详情（观看时长、完成率等）。 触发场景：用户问「录播课的参与情况」「观看完成率」。

**已公开的必填输入**

- `activity_id`（integer，required）：录播课活动 ID，必填（API 字段: activityId）

**输出/结果用途（按描述）**

查询录播课的整体参与统计详情（观看时长、完成率等）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-record_class-get

- 技能 ID：`classin:activity:record_class:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询录播课活动的详细信息，包含视频内容和时长。 触发场景：用户问「录播课详情」「这节录播内容是什么」。

**已公开的必填输入**

- `activity_id`（integer，required）：录播课活动 ID，必填（API 字段: activityId）
- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）

**输出/结果用途（按描述）**

查询录播课活动的详细信息，包含视频内容和时长。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-record_class-create

- 技能 ID：`classin:activity:record_class:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级发布录播课视频活动。 触发场景：用户说「发布录播课」「上传视频课」。 发布/倍速/拖动/跑马灯等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：录播课标题（API: name）
- `course_id`（string，required）：主班级 ID（API: courseId）
- `course`（string，required）：课程和学生信息（JSON 数组）（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）
- `video`（string，required）：视频集合 JSON，如 [{"fileId":1,"fileName":"a.mp4"}]（API: video）
- `play_max`（integer，required）：限制播放次数（API: playMax）
- `unit_name`（string，required）：单元名称 JSON，如 {"name":"单元1","type":0}（API: unitName）
- `category_name`（string，required）：课程分类名称（API: categoryName）

**输出/结果用途（按描述）**

在指定班级发布录播课视频活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-learning_materials-students

- 技能 ID：`classin:activity:learning_materials:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询学习资料活动的学生查看情况列表。 触发场景：用户问「哪些学生看了这份资料」「资料查看情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：学习资料活动 ID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询学习资料活动的学生查看情况列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-learning_materials-get

- 技能 ID：`classin:activity:learning_materials:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询学习资料活动的详细信息，包含资料内容和访问状态。 触发场景：用户问「这份学习资料是什么」「资料详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：学习资料活动 ID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询学习资料活动的详细信息，包含资料内容和访问状态。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-learning_materials-create

- 技能 ID：`classin:activity:learning_materials:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建学习资料（文件/图片/音视频）活动。 触发场景：用户说「发布资料」「上传学习材料」。 发布/后进班/下载等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：资料标题（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `course`（string，required）：课程和学生信息（JSON 数组）（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）
- `unit_name`（string，required）：单元名称 JSON，如 {"name":"单元1","type":0}（API: unitName）
- `category_name`（string，required）：课程分类名称（API: categoryName）

**输出/结果用途（按描述）**

在指定班级创建学习资料（文件/图片/音视频）活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-homework-students

- 技能 ID：`classin:activity:homework:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询作业活动的学生提交状态与成绩列表。 触发场景：用户问「哪些学生还没提交作业」「作业提交情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：作业活动 ID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询作业活动的学生提交状态与成绩列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-homework-student_detail

- 技能 ID：`classin:activity:homework:student_detail`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询单个学生在指定作业中的作答详情与批阅情况。 触发场景：用户问「张同学的作业内容」「查看批阅结果」。

**已公开的必填输入**

- `activity_id`（integer，required）：作业活动 ID，必填
- `student_uid`（integer，required）：学生 UID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询单个学生在指定作业中的作答详情与批阅情况。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-homework-get

- 技能 ID：`classin:activity:homework:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定作业活动的详细信息，包含题目、设置和截止时间。 触发场景：用户问「这次作业的要求是什么」「作业详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：作业活动 ID，必填（API 字段: activityId）
- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）

**输出/结果用途（按描述）**

查询指定作业活动的详细信息，包含题目、设置和截止时间。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-homework-create

- 技能 ID：`classin:activity:homework:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建作业活动（普通作业）。 触发场景：用户说「布置作业」「创建一个作业」。 公开/补交/下载等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：作业标题（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `course`（string，required）：JSON 数组，格式：[{"courseId":196212,"studentUid":[],"isAllStudent":1}]（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）

**输出/结果用途（按描述）**

在指定班级创建作业活动（普通作业）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-exam-students

- 技能 ID：`classin:activity:exam:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询测验的学生作答状态列表。 触发场景：用户问「哪些学生参加了测验」「测验完成情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：测验活动 ID，必填

**输出/结果用途（按描述）**

查询测验的学生作答状态列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-discuss-get

- 技能 ID：`classin:activity:discuss:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询讨论活动的详细信息，包含讨论话题和参与情况。 触发场景：用户问「讨论活动的详情」「讨论话题是什么」。

**已公开的必填输入**

- `activity_id`（integer，required）：讨论活动 ID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询讨论活动的详细信息，包含讨论话题和参与情况。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-discuss-create

- 技能 ID：`classin:activity:discuss:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建讨论活动。 触发场景：用户说「发布讨论」「创建讨论话题」。 评分/公开等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：讨论标题（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `course`（string，required）：JSON 数组，格式：[{"courseId":196212,"studentUid":[],"isAllStudent":1}]（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）

**输出/结果用途（按描述）**

在指定班级创建讨论活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-discuss-comment_list_v2

- 技能 ID：`classin:activity:discuss:comment_list_v2`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询活动下视频/打点评论列表（评论模块 V2，替代已废弃的 activity/discuss/commentList）。 可选：tag_types（JSON 数组字符串，例如 [1,2]，用于按标签筛选）、language（1 中文 2 英文 3 繁体）。 tagType：1 重点 2 难点 3 困惑 4 头疼 5 有点意思。 触发场景：用户问「某活动/讨论里这段视频有哪些评论」「打点评论列表」。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID（API: activityId）
- `file_id`（integer，required）：视频文件 ID（API: fileId）
- `cluster_role`（string，required）：机构角色 0/1/255 等字符串（API: clusterRole）
- `class_role`（string，required）：班级角色字符串（API: classRole）
- `sid`（string，required）：机构 SID（API: SID）

**输出/结果用途（按描述）**

查询活动下视频/打点评论列表（评论模块 V2，替代已废弃的 activity/discuss/commentList）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-discuss-comment_list

- 技能 ID：`classin:activity:discuss:comment_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询讨论活动的评论列表，支持按热度或时间排序。 触发场景：用户问「查看讨论的评论」「热门讨论内容」。 排序/分页脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_id`（integer，required）：讨论活动 ID，必填（API 字段: activityId）

**输出/结果用途（按描述）**

查询讨论活动的评论列表，支持按热度或时间排序。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-common-get

- 技能 ID：`classin:activity:common:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

按活动 ID 和活动类型（bizType）查询任意类型活动的详情（教师视图）。 bizType 枚举：1=课堂 2=作业 3=测验 4=录播 5=资料 6=讨论 7=答题卡 8=打卡 9=SCORM 10=AI口语卡。 触发场景：已知 activityId 和类型时的通用查询入口。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID
- `biz_type`（integer，required）：活动类型：1=课堂 2=作业 3=测验 4=录播 5=资料 6=讨论 7=答题卡

**输出/结果用途（按描述）**

按活动 ID 和活动类型（bizType）查询任意类型活动的详情（教师视图）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-clock-students

- 技能 ID：`classin:activity:clock:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询打卡活动的全体学生打卡状态列表。 触发场景：用户问「打卡活动有哪些学生」「打卡总人数」。

**已公开的必填输入**

- `activity_id`（integer，required）：打卡活动 ID，必填

**输出/结果用途（按描述）**

查询打卡活动的全体学生打卡状态列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-clock-rank

- 技能 ID：`classin:activity:clock:rank`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询打卡活动的学生排行榜（总榜或周榜）。 触发场景：用户问「打卡排行」「谁打卡最多」。

**已公开的必填输入**

- `activity_id`（integer，required）：打卡活动 ID，必填（API 字段: activityId）

**输出/结果用途（按描述）**

查询打卡活动的学生排行榜（总榜或周榜）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-clock-get

- 技能 ID：`classin:activity:clock:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询打卡活动的详细信息，包含打卡规则和进度。 触发场景：用户问「打卡活动是什么」「打卡详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：打卡活动 ID，必填

**输出/结果用途（按描述）**

查询打卡活动的详细信息，包含打卡规则和进度。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-clock-create

- 技能 ID：`classin:activity:clock:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建打卡签到活动。 触发场景：用户说「创建打卡」「布置签到」。 发布/后进班/补卡/频率/公开等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：打卡标题（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `course`（string，required）：课程和学生信息（JSON 数组）（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）
- `clock_dates`（string，required）：需打卡日期 JSON 数组（各日期0点时间戳）（API: clockDates）
- `remind_time`（string，required）：提醒时间（秒），不提醒传 -1（API: remindTime）
- `description`（string，required）：打卡说明（API: description）
- `unit_name`（string，required）：单元名称 JSON，如 {"name":"单元1","type":0}（API: unitName）
- `category_name`（string，required）：课程分类名称（API: categoryName）

**输出/结果用途（按描述）**

在指定班级创建打卡签到活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-clock-calendar

- 技能 ID：`classin:activity:clock:calendar`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询打卡活动的教师端日历视图（各日期打卡情况汇总）。 触发场景：用户问「打卡日历」「各天打卡情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：打卡活动 ID，必填

**输出/结果用途（按描述）**

查询打卡活动的教师端日历视图（各日期打卡情况汇总）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-class-students

- 技能 ID：`classin:activity:class:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询某节课堂直播活动的学生参与情况列表。 触发场景：用户问「哪些学生参加了这次课」「课堂出席情况」。

**已公开的必填输入**

- `activity_id`（integer，conditional）：活动 ID，与 class_id 二选一（API 字段: activityId）
- `class_id`（integer，conditional）：课节 ID，与 activity_id 二选一（API 字段: classId）

**输出/结果用途（按描述）**

查询某节课堂直播活动的学生参与情况列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-class-get

- 技能 ID：`classin:activity:class:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定课堂活动（直播课）的详情。 触发场景：用户查询某堂课的详情，如「第3次课是什么时候」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）

**输出/结果用途（按描述）**

查询指定课堂活动（直播课）的详情。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-class-create

- 技能 ID：`classin:activity:class:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建课堂直播活动（在线教室）。 触发场景：用户说「创建课堂」「排课」「新建直播课」。 教室配置（录课/直播/上台等）接口必填，脚本有默认值；用户未指定时不要追问。 分类用名称不是 ID。有 categoryId 时先 classin-category-list 转成 name；名称和 ID 都没有则向用户要分类，不要猜测。

**已公开的必填输入**

- `activity_name`（string，required）：课堂名称（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `teacher_uid`（integer，required）：主讲老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：结束时间（Unix 秒级时间戳）（API: endTime）
- `category_name`（string，required）：课程分类名称（API: categoryName）。接口不收 categoryId；有 ID 时先 list 转 name；名称和 ID 都没有则向用户要分类

**输出/结果用途（按描述）**

在指定班级创建课堂直播活动（在线教室）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-answer_sheet-students

- 技能 ID：`classin:activity:answer_sheet:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询答题卡活动的学生作答状态列表。 触发场景：用户问「哪些学生完成了答题卡」「答题情况统计」。

**已公开的必填输入**

- `activity_id`（integer，required）：答题卡活动 ID，必填

**输出/结果用途（按描述）**

查询答题卡活动的学生作答状态列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-answer_sheet-get

- 技能 ID：`classin:activity:answer_sheet:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询答题卡活动的详细信息，包含题目和答题设置。 触发场景：用户问「答题卡的题目」「答题卡详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：答题卡活动 ID，必填

**输出/结果用途（按描述）**

查询答题卡活动的详细信息，包含题目和答题设置。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-answer_sheet-create

- 技能 ID：`classin:activity:answer_sheet:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

在指定班级创建答题卡（测验）活动。 触发场景：用户说「创建答题卡」「发布测验」。 公开/限时/补交等接口必填开关脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `activity_name`（string，required）：答题卡标题（API: name）
- `course_id`（integer，required）：主班级 ID（API: courseId）
- `course`（string，required）：JSON 数组，格式：[{"courseId":196212,"studentUid":[],"isAllStudent":1}]（API: course）
- `teacher_uid`（integer，required）：发布老师 UID（API: teacherUid）
- `start_time`（integer，required）：开始时间（Unix 秒级时间戳）（API: startTime）
- `end_time`（integer，required）：截止时间（Unix 秒级时间戳）（API: endTime）
- `questions`（string，required）：试题 JSON 对象，须含 singleChoice/multipleChoice/judge（API: questions）

**输出/结果用途（按描述）**

在指定班级创建答题卡（测验）活动。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-answer_sheet-analyze

- 技能 ID：`classin:activity:answer_sheet:analyze`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询答题卡活动的整体答题统计分析，包含各题正确率等数据。 触发场景：用户问「答题卡的分析结果」「各题答对率」。

**已公开的必填输入**

- `activity_id`（integer，required）：答题卡活动 ID，必填

**输出/结果用途（按描述）**

查询答题卡活动的整体答题统计分析，包含各题正确率等数据。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-ai_reading-students

- 技能 ID：`classin:activity:ai_reading:students`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询 AI 口语卡活动的学生完成列表。 触发场景：用户问「哪些学生完成了口语卡」「学生跟读情况」。

**已公开的必填输入**

- `activity_id`（integer，required）：AI 口语卡活动 ID，必填

**输出/结果用途（按描述）**

查询 AI 口语卡活动的学生完成列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-ai_reading-student_detail

- 技能 ID：`classin:activity:ai_reading:student_detail`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询单个学生在 AI 口语卡活动中的作答与批阅详情。 触发场景：用户问「查看某个学生的口语卡批阅详情」。

**已公开的必填输入**

- `activity_id`（integer，required）：AI 口语卡活动 ID，必填
- `student_uid`（integer，required）：学生 UID，必填
- `log_id`（integer，required）：作答记录 ID，必填

**输出/结果用途（按描述）**

查询单个学生在 AI 口语卡活动中的作答与批阅详情。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-ai_reading-statistic

- 技能 ID：`classin:activity:ai_reading:statistic`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询 AI 口语卡活动的整体统计数据（完成率、平均分等）。 触发场景：用户问「口语卡完成情况」「AI 跟读统计」。

**已公开的必填输入**

- `activity_id`（integer，required）：AI 口语卡活动 ID，必填

**输出/结果用途（按描述）**

查询 AI 口语卡活动的整体统计数据（完成率、平均分等）。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-ai_reading-history

- 技能 ID：`classin:activity:ai_reading:history`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询学生在 AI 口语卡活动中的历次作答历史记录列表。 触发场景：用户问「查看某学生的口语卡历史」「多次作答记录」。

**已公开的必填输入**

- `activity_id`（integer，required）：AI 口语卡活动 ID，必填
- `student_uid`（integer，required）：学生 UID，必填

**输出/结果用途（按描述）**

查询学生在 AI 口语卡活动中的历次作答历史记录列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-activity-ai_reading-get

- 技能 ID：`classin:activity:ai_reading:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询 AI 口语卡活动的详细信息。 触发场景：用户问「AI 跟读活动的详情」「口语卡内容」。

**已公开的必填输入**

- `activity_id`（integer，required）：AI 口语卡活动 ID，必填

**输出/结果用途（按描述）**

查询 AI 口语卡活动的详细信息。 具体响应字段、类型及错误结构：目录未提供。

## 账号身份（1 项）

### classin-user-identity-get

- 技能 ID：`classin:user:identity:get`
- 操作类型：读
- 权限范围：`skill:classin:user:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询当前登录账号的身份信息：是老师、学生还是其他，以及对应学段、学科、年级。 触发场景：「我是老师还是学生」「查一下账号身份」「这个用户的学段是什么」。 身份枚举是 1=老师 / 2=学生 / 3=其他；没有单独的「家长」身份，「家长」归入「其他」。 这是账号级身份，不是某班里的成员角色（班内角色见 classin-class-lifecycle-member_list）。 只能查当前 X-EEO-UID 对应用户，不能指定查任意 uid。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

查询当前登录账号的身份信息：是老师、学生还是其他，以及对应学段、学科、年级。 具体响应字段、类型及错误结构：目录未提供。

## 单元管理（4 项）

### classin-unit-publish

- 技能 ID：`classin:unit:publish`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将指定单元对学生显示或隐藏（不能改回草稿）。 触发场景：用户说「发布这个单元」「对学生隐藏这个单元」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID（API: courseId）
- `unit_id`（integer，required）：单元 ID（API: unitId）
- `publish_flag`（integer，required）：1=对学生隐藏 2=对学生显示；不可传 0（API: publishFlag）

**输出/结果用途（按描述）**

将指定单元对学生显示或隐藏（不能改回草稿）。 具体响应字段、类型及错误结构：目录未提供。

### classin-unit-list

- 技能 ID：`classin:unit:list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定班级课程分类下的单元列表（教师视图）。 触发场景：用户问「查看单元列表」「有哪些单元」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `category_id`（integer，required）：课程分类 ID，必填
- `sid`（string，required）：机构 ID

**输出/结果用途（按描述）**

查询指定班级课程分类下的单元列表（教师视图）。 具体响应字段、类型及错误结构：目录未提供。

### classin-unit-get

- 技能 ID：`classin:unit:get`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定单元的详细信息，包含名称、发布状态和描述。 触发场景：用户问「查看这个单元的详情」「单元信息」。

**已公开的必填输入**

- `unit_id`（integer，required）：单元 ID（API: unitId）
- `course_id`（integer，required）：班级 ID（API: courseId）

**输出/结果用途（按描述）**

查询指定单元的详细信息，包含名称、发布状态和描述。 具体响应字段、类型及错误结构：目录未提供。

### classin-unit-create

- 技能 ID：`classin:unit:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

在指定班级的课程分类下创建单元主题（不是课程分类）。 触发场景：用户说「创建一个单元」「加一个单元叫第一单元」「新建单元主题」。 未指定发布状态时默认对学生可见，不要追问。 上下文已有 unitId 时不要调用本技能，先 classin-unit-get；名称和 ID 都没有则向用户要单元名。没有 categoryId 时向用户要（可先 classin-category-list 列出选项）。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID（API: courseId）
- `category_id`（integer，required）：课程分类 ID（API: categoryId）
- `unit_name`（string，required）：单元名称，最长 100 字（API: name）。已有 unitId 时先 classin-unit-get，不要再创建；名称和 ID 都没有则向用户要

**输出/结果用途（按描述）**

在指定班级的课程分类下创建单元主题（不是课程分类）。 具体响应字段、类型及错误结构：目录未提供。

## 待办事项（6 项）

### classin-todo-list-pending

- 技能 ID：`classin:todo:list:pending`
- 操作类型：读
- 权限范围：`skill:classin:todo:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询当前用户所有「待处理」状态的待办事项，按截止时间升序排列。 触发场景：「我有哪些待处理的任务」「查看未完成的待办」「催我处理待办」。 支持按班级（group_id）、角色（role）筛选。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

查询当前用户所有「待处理」状态的待办事项，按截止时间升序排列。 具体响应字段、类型及错误结构：目录未提供。

### classin-todo-list-overview

- 技能 ID：`classin:todo:list:overview`
- 操作类型：读
- 权限范围：`skill:classin:todo:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询当前用户的待办事项总览，按时间维度分类： · within_week — 一周内将截止 · dead_line — 已逾期/临近截止 · after_week — 一周后截止 · no_dead_line — 无截止时间 每类包含 list、total、red_total（红点数）。 触发场景：「查看我的待办」「有哪些未完成任务」「待办总览」。 可按班级（group_id）、角色（role）、分类（category）筛选。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

查询当前用户的待办事项总览，按时间维度分类： · within_week — 一周内将截止 · dead_line — 已逾期/临近截止 · after_week — 一周后截止 · no_dead_line — 无截止时间 每类包含 list、total、red_total（红点数）。 具体响应字段、类型及错误结构：目录未提供。

### classin-todo-item-detail

- 技能 ID：`classin:todo:item:detail`
- 操作类型：读
- 权限范围：`skill:classin:todo:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定待办事项的详细信息，包含关联活动、截止时间、所属班级等。 触发场景：用户点击某条待办后查看详情，或询问「这个待办是什么」。

**已公开的必填输入**

- `todo_id`（integer，required）：待办 ID

**输出/结果用途（按描述）**

查询指定待办事项的详细信息，包含关联活动、截止时间、所属班级等。 具体响应字段、类型及错误结构：目录未提供。

### classin-todo-item-complete

- 技能 ID：`classin:todo:item:complete`
- 操作类型：写
- 权限范围：`skill:classin:todo:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将指定待办事项标记为已完成（已处理）状态。 触发场景：用户说「把这条待办标记为完成」「处理掉这些待办」。

**已公开的必填输入**

- `todo_id`（integer，required）：待办 ID（API: id）

**输出/结果用途（按描述）**

将指定待办事项标记为已完成（已处理）状态。 具体响应字段、类型及错误结构：目录未提供。

### classin-todo-item-batch

- 技能 ID：`classin:todo:item:batch`
- 操作类型：写
- 权限范围：`skill:classin:todo:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

将多条待办事项批量标记为已处理状态，高效清理待办积压。 触发场景：「把这些待办都标记为已处理」「批量清理待办」「全部处理掉」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

将多条待办事项批量标记为已处理状态，高效清理待办积压。 具体响应字段、类型及错误结构：目录未提供。

### classin-todo-badge-count

- 技能 ID：`classin:todo:badge:count`
- 操作类型：读
- 权限范围：`skill:classin:todo:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询当前用户待办的未读红点数（角标数量）。 触发场景：「我有多少条待处理的待办」「待办红点数量」。 可按班级（group_id）或角色（role）筛选。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

查询当前用户待办的未读红点数（角标数量）。 具体响应字段、类型及错误结构：目录未提供。

## 云盘与文件空间（76 项）

### classin-space-user-weike_create

- 技能 ID：`classin:space:user:weike_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

创建微课。 触发场景：用户说「创建微课」。

**已公开的必填输入**

- `file_name`（string，required）：fileName（API: fileName）
- `file_path`（string，required）：filePath（API: filePath）
- `file_size`（integer，required）：fileSize（API: fileSize）

**输出/结果用途（按描述）**

创建微课。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-upload

- 技能 ID：`classin:space:user:upload`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

上传文件到个人云盘。 触发场景：用户说「上传文件到个人云盘」。

**已公开的必填输入**

- `file_type`（integer，required）：上传类型，固定传 1（cos 上传）（API: fileType）
- `file_name`（string，required）：上传的文件名（含后缀）（API: fileName）
- `file_size`（integer，required）：文件大小，单位 Byte（API: fileSize）
- `file_path`（string，required）：COS 地址（API: filePath）

**输出/结果用途（按描述）**

上传文件到个人云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-trans_state

- 技能 ID：`classin:space:user:trans_state`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询个人云盘文件转换状态。 触发场景：用户说「查询个人云盘文件转换状态」。

**已公开的必填输入**

- `files_id_str`（string，required）：文件id串，用逗号,分割，如

**输出/结果用途（按描述）**

查询个人云盘文件转换状态。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-subfolder_list

- 技能 ID：`classin:space:user:subfolder_list`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取个人云盘子文件夹列表。 触发场景：用户说「获取个人云盘子文件夹列表」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

获取个人云盘子文件夹列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-share

- 技能 ID：`classin:space:user:share`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

批量分享个人云盘文件。 触发场景：用户说「批量分享个人云盘文件」。

**已公开的必填输入**

- `user_file_ids`（string，required）：用户文件关系id 如：1123

**输出/结果用途（按描述）**

批量分享个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-search

- 技能 ID：`classin:space:user:search`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

搜索个人云盘文件。 触发场景：用户说「搜索个人云盘文件」。

**已公开的必填输入**

- `file_name`（string，required）：fileName（API: fileName）

**输出/结果用途（按描述）**

搜索个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-save_basefile

- 技能 ID：`classin:space:user:save_basefile`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

保存基础文件到个人云盘。 触发场景：用户说「保存基础文件到个人云盘」。

**已公开的必填输入**

- `origin_id`（integer，required）：基础文件ID（API: originId）

**输出/结果用途（按描述）**

保存基础文件到个人云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-retrans

- 技能 ID：`classin:space:user:retrans`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重新转换个人云盘文件。 触发场景：用户说「重新转换个人云盘文件」。

**已公开的必填输入**

- `user_file_id`（string，required）：用户文件id

**输出/结果用途（按描述）**

重新转换个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-move

- 技能 ID：`classin:space:user:move`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

批量移动个人云盘文件。 触发场景：用户说「批量移动个人云盘文件」。

**已公开的必填输入**

- `dest_folder_id`（string，required）：目标文件夹id（API: destFolderId）

**输出/结果用途（按描述）**

批量移动个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-list

- 技能 ID：`classin:space:user:list`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取个人云盘文件夹列表。 触发场景：用户说「获取个人云盘文件夹列表」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

获取个人云盘文件夹列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-homework_upload

- 技能 ID：`classin:space:user:homework_upload`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

上传作业文件到个人云盘。 触发场景：用户说「上传作业文件到个人云盘」。

**已公开的必填输入**

- `homework_title`（string，required）：作业标题（API: homeworkTitle）
- `folder_id`（string，required）：文件夹id（API: folderId）

**输出/结果用途（按描述）**

上传作业文件到个人云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-homework_edit

- 技能 ID：`classin:space:user:homework_edit`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

编辑个人云盘作业文件。 触发场景：用户说「编辑个人云盘作业文件」。

**已公开的必填输入**

- `homework_title`（string，required）：作业标题（API: homeworkTitle）
- `user_template_id`（string，required）：模板id（API: userTemplateId）

**输出/结果用途（按描述）**

编辑个人云盘作业文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-folder_rename

- 技能 ID：`classin:space:user:folder_rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名个人云盘文件夹。 触发场景：用户说「重命名个人云盘文件夹」。

**已公开的必填输入**

- `folder_id`（string，required）：用户文件id
- `folder_name`（string，required）：文件名称，长度1-128个字，不区分中英文，超出会自动截取为128个字

**输出/结果用途（按描述）**

重命名个人云盘文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-file_rename

- 技能 ID：`classin:space:user:file_rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名个人云盘文件。 触发场景：用户说「重命名个人云盘文件」。

**已公开的必填输入**

- `file_id`（string，required）：用户文件id
- `file_name`（string，required）：文件名称，长度1-128个字，不区分中英文，超出会自动截取为128个字

**输出/结果用途（按描述）**

重命名个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-download

- 技能 ID：`classin:space:user:download`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

批量下载个人云盘文件。 触发场景：用户说「批量下载个人云盘文件」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

批量下载个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-delete

- 技能 ID：`classin:space:user:delete`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

批量删除个人云盘文件。 触发场景：用户说「批量删除个人云盘文件」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

批量删除个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-copy

- 技能 ID：`classin:space:user:copy`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

批量复制个人云盘文件。 触发场景：用户说「批量复制个人云盘文件」。

**已公开的必填输入**

- `dest_folder_id`（string，required）：目标文件夹id（API: destFolderId）

**输出/结果用途（按描述）**

批量复制个人云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-check_filename

- 技能 ID：`classin:space:user:check_filename`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

检查个人云盘文件名是否可用。 触发场景：用户说「检查个人云盘文件名是否可用」。

**已公开的必填输入**

- `file_name`（string，required）：文件名 包含后缀（API: fileName）

**输出/结果用途（按描述）**

检查个人云盘文件名是否可用。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-beike_name

- 技能 ID：`classin:space:user:beike_name`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

修改备课包名称。 触发场景：用户说「修改备课包名称」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

修改备课包名称。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-beike_detail

- 技能 ID：`classin:space:user:beike_detail`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取备课包详情。 触发场景：用户说「获取备课包详情」。

**已公开的必填输入**

- `user_file_id`（string，required）：userFileId（API: userFileId）

**输出/结果用途（按描述）**

获取备课包详情。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-beike_create

- 技能 ID：`classin:space:user:beike_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

创建备课包。 触发场景：用户说「创建备课包」。

**已公开的必填输入**

- `file_name`（string，required）：fileName
- `folder_id`（string，required）：folderId

**输出/结果用途（按描述）**

创建备课包。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-user-beike_add

- 技能 ID：`classin:space:user:beike_add`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

添加文件到备课包。 触发场景：用户说「添加文件到备课包」。

**已公开的必填输入**

- `user_file_id`（string，required）：getFolderList列表中的id
- `files`（string，required）：文件列表

**输出/结果用途（按描述）**

添加文件到备课包。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-share

- 技能 ID：`classin:space:org:share`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

分享组织云盘文件。 触发场景：用户说「分享组织云盘文件」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织盘id
- `org_file_ids`（string，required）：多个文件

**输出/结果用途（按描述）**

分享组织云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-search

- 技能 ID：`classin:space:org:search`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

搜索组织云盘文件。 触发场景：用户说「搜索组织云盘文件」。 分页/搜索类型脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `file_name`（string，required）：搜索关键词（API: fileName）

**输出/结果用途（按描述）**

搜索组织云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-school_list

- 技能 ID：`classin:space:org:school_list`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织机构下文件列表。 触发场景：用户说「获取组织机构下文件列表」。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

获取组织机构下文件列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-save_shared

- 技能 ID：`classin:space:org:save_shared`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

保存分享文件到组织云盘。 触发场景：用户说「保存分享文件到组织云盘」。

**已公开的必填输入**

- `share_id`（integer，required）：分享id
- `share_uid`（integer，required）：分享用户的uid
- `message_type`（integer，required）：消息类型 0课件 1试卷 2作业
- `folder_id`（integer，required）：存在则保存到指定文件夹下
- `sid`（integer，required）：机构id

**输出/结果用途（按描述）**

保存分享文件到组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-save_basefile

- 技能 ID：`classin:space:org:save_basefile`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

保存基础文件到组织云盘。 触发场景：用户说「保存基础文件到组织云盘」。

**已公开的必填输入**

- `origin_id`（integer，required）：基础文件ID
- `file_name`（string，required）：文件名
- `sid`（integer，required）：机构id

**输出/结果用途（按描述）**

保存基础文件到组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-save_auth_file

- 技能 ID：`classin:space:org:save_auth_file`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

保存授权文件到组织云盘。 触发场景：用户说「保存授权文件到组织云盘」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `file_id_str`（string，required）：批量保存的文件id串（API: fileIdStr）
- `folder_id`（integer，required）：登陆人保存的文件夹ID（API: folderId）

**输出/结果用途（按描述）**

保存授权文件到组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-ppt_upgrade

- 技能 ID：`classin:space:org:ppt_upgrade`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

升级组织云盘 PPT 文件。 触发场景：用户说「升级组织云盘 PPT 文件」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）

**输出/结果用途（按描述）**

升级组织云盘 PPT 文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-move

- 技能 ID：`classin:space:org:move`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

移动组织云盘文件或文件夹。 触发场景：用户说「移动组织云盘文件或文件夹」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `organization_disk_id`（integer，required）：组织盘id（API: organizationDiskId）
- `dest_folder_id`（integer，required）：目标目录id（API: destFolderId）
- `dest_type`（integer，required）：目标盘类型1：个人云盘，2：组织盘（API: destType）

**输出/结果用途（按描述）**

移动组织云盘文件或文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-import_from_mine

- 技能 ID：`classin:space:org:import_from_mine`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将个人云盘文件导入组织云盘。 触发场景：用户说「将个人云盘文件导入组织云盘」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `organization_disk_id`（integer，required）：组织盘id（API: organizationDiskId）
- `dest_folder_id`（integer，required）：目标目录id（API: destFolderId）

**输出/结果用途（按描述）**

将个人云盘文件导入组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-image_preview

- 技能 ID：`classin:space:org:image_preview`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织云盘图片预览信息。 触发场景：用户说「获取组织云盘图片预览信息」。

**已公开的必填输入**

- `sid`（integer，required）：机构sid（API: sid）
- `org_file_id`（integer，required）：组织文件id（API: orgFileId）

**输出/结果用途（按描述）**

获取组织云盘图片预览信息。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-homework_upload

- 技能 ID：`classin:space:org:homework_upload`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

上传作业文件到组织云盘。 触发场景：用户说「上传作业文件到组织云盘」。

**已公开的必填输入**

- `homework_title`（string，required）：作业标题（API: homeworkTitle）
- `folder_id`（string，required）：文件夹id（API: folderId）

**输出/结果用途（按描述）**

上传作业文件到组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-homework_edit

- 技能 ID：`classin:space:org:homework_edit`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

编辑组织云盘作业文件。 触发场景：用户说「编辑组织云盘作业文件」。

**已公开的必填输入**

- `homework_title`（string，required）：作业标题（API: homeworkTitle）
- `user_template_id`（string，required）：模板id（API: userTemplateId）

**输出/结果用途（按描述）**

编辑组织云盘作业文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-folder_rename

- 技能 ID：`classin:space:org:folder_rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名组织云盘文件夹。 触发场景：用户说「重命名组织云盘文件夹」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `folder_id`（integer，required）：文件夹id
- `name`（string，required）：名称

**输出/结果用途（按描述）**

重命名组织云盘文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-folder_list

- 技能 ID：`classin:space:org:folder_list`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织云盘文件夹列表。 触发场景：用户说「获取组织云盘文件夹列表」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `organization_disk_id`（integer，required）：组织盘id（API: organizationDiskId）

**输出/结果用途（按描述）**

获取组织云盘文件夹列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-folder_create

- 技能 ID：`classin:space:org:folder_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

在组织云盘新建文件夹。 触发场景：用户说「在组织云盘新建文件夹」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `folder_id`（integer，required）：目录id
- `name`（string，required）：名称

**输出/结果用途（按描述）**

在组织云盘新建文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-file_upload

- 技能 ID：`classin:space:org:file_upload`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

上传文件到组织云盘。 触发场景：用户说「上传文件到组织云盘」。

**已公开的必填输入**

- `folder_id`（integer，required）：文件夹id（API: folderId）
- `sid`（integer，required）：sid（API: sid）

**输出/结果用途（按描述）**

上传文件到组织云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-file_rename

- 技能 ID：`classin:space:org:file_rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名组织云盘文件。 触发场景：用户说「重命名组织云盘文件」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `file_id`（integer，required）：组织文件id
- `name`（string，required）：名字

**输出/结果用途（按描述）**

重命名组织云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-file_info

- 技能 ID：`classin:space:org:file_info`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织云盘文件详情。 触发场景：用户说「获取组织云盘文件详情」。

**已公开的必填输入**

- `org_file_id`（integer，required）：组织盘文件id（API: orgFileId）
- `sid`（integer，required）：机构id（API: sid）

**输出/结果用途（按描述）**

获取组织云盘文件详情。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-file_edit

- 技能 ID：`classin:space:org:file_edit`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

编辑组织云盘文件信息。 触发场景：用户说「编辑组织云盘文件信息」。

**已公开的必填输入**

- `sid`（integer，required）：sid（API: sid）
- `org_file_id`（integer，required）：原组织盘文件id（API: orgFileId）

**输出/结果用途（按描述）**

编辑组织云盘文件信息。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-eppt_create

- 技能 ID：`classin:space:org:eppt_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

在组织云盘创建演示文件。 触发场景：用户说「在组织云盘创建演示文件」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `folder_id`（integer，required）：非0（API: folderId）
- `file_name`（string，required）：fileName（API: fileName）

**输出/结果用途（按描述）**

在组织云盘创建演示文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-eppt_convert

- 技能 ID：`classin:space:org:eppt_convert`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将组织云盘文件转换为 EPPT。 触发场景：用户说「将组织云盘文件转换为 EPPT」。

**已公开的必填输入**

- `org_file_id`（integer，required）：组织盘id（API: orgFileId）
- `sid`（integer，required）：sid（API: sid）

**输出/结果用途（按描述）**

将组织云盘文件转换为 EPPT。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-edoc_create

- 技能 ID：`classin:space:org:edoc_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

在组织云盘创建在线文档。 触发场景：用户说「在组织云盘创建在线文档」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织盘id
- `doc_name`（string，required）：docName
- `folder_id`（integer，required）：folderId

**输出/结果用途（按描述）**

在组织云盘创建在线文档。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-edoc_convert

- 技能 ID：`classin:space:org:edoc_convert`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将组织云盘文件转换为 EDOC。 触发场景：用户说「将组织云盘文件转换为 EDOC」。

**已公开的必填输入**

- `org_file_id`（integer，required）：组织盘id
- `sid`（integer，required）：sid

**输出/结果用途（按描述）**

将组织云盘文件转换为 EDOC。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-download

- 技能 ID：`classin:space:org:download`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

下载组织云盘文件。 触发场景：用户说「下载组织云盘文件」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `file_ids`（string，required）：多个文件

**输出/结果用途（按描述）**

下载组织云盘文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-disk_rename

- 技能 ID：`classin:space:org:disk_rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名组织磁盘。 触发场景：用户说「重命名组织磁盘」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `name`（string，required）：名称

**输出/结果用途（按描述）**

重命名组织磁盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-disk_list

- 技能 ID：`classin:space:org:disk_list`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织磁盘列表。 触发场景：用户说「获取组织磁盘列表」。

**已公开的必填输入**

- `sid`（integer，required）：机构id

**输出/结果用途（按描述）**

获取组织磁盘列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-disk_delete

- 技能 ID：`classin:space:org:disk_delete`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

删除组织磁盘。 触发场景：用户说「删除组织磁盘」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id

**输出/结果用途（按描述）**

删除组织磁盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-disk_create

- 技能 ID：`classin:space:org:disk_create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

创建组织磁盘。 触发场景：用户说「创建组织磁盘」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `name`（string，required）：名称（API: name）

**输出/结果用途（按描述）**

创建组织磁盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-delete

- 技能 ID：`classin:space:org:delete`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

删除组织云盘文件或文件夹。 触发场景：用户说「删除组织云盘文件或文件夹」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `folder_ids`（string，required）：多个目录,分割（API: folderIds）
- `organization_disk_id`（integer，required）：organizationDiskId（API: organizationDiskId）

**输出/结果用途（按描述）**

删除组织云盘文件或文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-copy

- 技能 ID：`classin:space:org:copy`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

复制组织云盘文件或文件夹。 触发场景：用户说「复制组织云盘文件或文件夹」。

**已公开的必填输入**

- `sid`（integer，required）：机构id（API: sid）
- `organization_disk_id`（integer，required）：组织盘id（API: organizationDiskId）
- `dest_folder_id`（integer，required）：目标目录id（API: destFolderId）
- `dest_type`（integer，required）：目标盘类型1：个人云盘，2：组织盘（API: destType）
- `operation`（integer，required）：操作： 1：复制 2：保存到云盘（权限判断不一样）（API: operation）

**输出/结果用途（按描述）**

复制组织云盘文件或文件夹。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-breadcrumb

- 技能 ID：`classin:space:org:breadcrumb`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织云盘面包屑路径。 触发场景：用户说「获取组织云盘面包屑路径」。

**已公开的必填输入**

- `folder_id`（integer，required）：folderId（API: folderId）

**输出/结果用途（按描述）**

获取组织云盘面包屑路径。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-auth_set_download

- 技能 ID：`classin:space:org:auth_set_download`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

设置组织云盘下载权限。 触发场景：用户说「设置组织云盘下载权限」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织盘id
- `org_file_ids`（string，required）：组织盘文件id
- `download_auth`（integer，required）：允许
- `folder_id`（integer，required）：当前文件夹id

**输出/结果用途（按描述）**

设置组织云盘下载权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-auth_set_action

- 技能 ID：`classin:space:org:auth_set_action`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

按操作类型设置组织云盘权限。 触发场景：用户说「按操作类型设置组织云盘权限」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `folder_id`（integer，required）：目录id
- `authorize`（string，required）：成员权限 json 数组
- `action_type`（integer，required）：动作类型: 1新增 2删除 3修改

**输出/结果用途（按描述）**

按操作类型设置组织云盘权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-auth_set

- 技能 ID：`classin:space:org:auth_set`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

设置组织云盘权限。 触发场景：用户说「设置组织云盘权限」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `folder_id`（integer，required）：目录id
- `authorize`（string，required）：成员权限 json 数组

**输出/结果用途（按描述）**

设置组织云盘权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-org-auth_get

- 技能 ID：`classin:space:org:auth_get`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织云盘权限信息。 触发场景：用户说「获取组织云盘权限信息」。

**已公开的必填输入**

- `sid`（integer，required）：机构id
- `organization_disk_id`（integer，required）：组织云盘id
- `folder_id`（integer，required）：目录id

**输出/结果用途（按描述）**

获取组织云盘权限信息。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-eppt-create

- 技能 ID：`classin:space:eppt:create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

创建 EPPT 演示文件。 触发场景：用户说「创建 EPPT 演示文件」。

**已公开的必填输入**

- `folder_id`（string，required）：非0（API: folderId）
- `file_name`（string，required）：fileName（API: fileName）

**输出/结果用途（按描述）**

创建 EPPT 演示文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-eppt-convert

- 技能 ID：`classin:space:eppt:convert`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

转换文件为 EPPT 格式。 触发场景：用户说「转换文件为 EPPT 格式」。

**已公开的必填输入**

- `user_file_id`（string，required）：userFileId（API: userFileId）

**输出/结果用途（按描述）**

转换文件为 EPPT 格式。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-permission

- 技能 ID：`classin:space:edoc:permission`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取当前用户在线文档操作权限。 触发场景：用户说「获取当前用户在线文档操作权限」。

**已公开的必填输入**

- `file_key`（string，required）：fileKey

**输出/结果用途（按描述）**

获取当前用户在线文档操作权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-file_auth_edit

- 技能 ID：`classin:space:edoc:file_auth_edit`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

编辑在线文档文件权限。 触发场景：用户说「编辑在线文档文件权限」。

**已公开的必填输入**

- `auth`（string，required）：授权类型0删除1可读2读写
- `file_id`（string，required）：fileId

**输出/结果用途（按描述）**

编辑在线文档文件权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-create

- 技能 ID：`classin:space:edoc:create`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

创建在线文档。 触发场景：用户说「创建在线文档」。

**已公开的必填输入**

- `doc_name`（string，required）：docName
- `folder_id`（string，required）：folderId

**输出/结果用途（按描述）**

创建在线文档。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-convert

- 技能 ID：`classin:space:edoc:convert`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

转换文件为在线文档格式。 触发场景：用户说「转换文件为在线文档格式」。

**已公开的必填输入**

- `user_file_id`（string，required）：userFileId

**输出/结果用途（按描述）**

转换文件为在线文档格式。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-auth_info

- 技能 ID：`classin:space:edoc:auth_info`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取在线文档权限信息。 触发场景：用户说「获取在线文档权限信息」。

**已公开的必填输入**

- `file_id`（string，required）：fileId

**输出/结果用途（按描述）**

获取在线文档权限信息。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-auth_edit

- 技能 ID：`classin:space:edoc:auth_edit`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

编辑在线文档权限。 触发场景：用户说「编辑在线文档权限」。

**已公开的必填输入**

- `file_id`（string，required）：从文件列表中拿到的id（API: fileId）
- `auth`（string，required）：授权类型0删除1可读2读写（API: auth）

**输出/结果用途（按描述）**

编辑在线文档权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-edoc-auth_add

- 技能 ID：`classin:space:edoc:auth_add`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

添加在线文档权限。 触发场景：用户说「添加在线文档权限」。

**已公开的必填输入**

- `file_id`（string，required）：files表id（API: fileId）

**输出/结果用途（按描述）**

添加在线文档权限。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-trans_state

- 技能 ID：`classin:space:course:trans_state`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询班级文件转换状态。 触发场景：用户说「查询班级文件转换状态」。

**已公开的必填输入**

- `course_file_ids`（string，required）：courseFileIds（API: courseFileIds）

**输出/结果用途（按描述）**

查询班级文件转换状态。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-trans_files

- 技能 ID：`classin:space:course:trans_files`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取班级文件转换结果列表。 触发场景：用户说「获取班级文件转换结果列表」。

**已公开的必填输入**

- `course_id`（string，required）：群id（API: courseId）
- `course_file_id`（string，required）：群文件关系id（API: courseFileId）

**输出/结果用途（按描述）**

获取班级文件转换结果列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-to_mine

- 技能 ID：`classin:space:course:to_mine`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

班级文件保存到个人云盘。 触发场景：用户说「班级文件保存到个人云盘」。

**已公开的必填输入**

- `course_id`（integer，required）：课程id（API: courseId）
- `course_file_ids`（string，required）：待保存的群文件关系id，多个用逗号分割（API: courseFileIds）

**输出/结果用途（按描述）**

班级文件保存到个人云盘。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-source_path

- 技能 ID：`classin:space:course:source_path`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取班级文件源文件路径。 触发场景：用户说「获取班级文件源文件路径」。

**已公开的必填输入**

- `course_id`（string，required）：courseId
- `course_file_id`（string，required）：courseFileId

**输出/结果用途（按描述）**

获取班级文件源文件路径。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-share

- 技能 ID：`classin:space:course:share`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

分享班级文件。 触发场景：用户说「分享班级文件」。

**已公开的必填输入**

- `course_file_id`（integer，required）：courseFileId（API: courseFileId）

**输出/结果用途（按描述）**

分享班级文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-rename

- 技能 ID：`classin:space:course:rename`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

重命名班级文件。 触发场景：用户说「重命名班级文件」。

**已公开的必填输入**

- `course_id`（integer，required）：群id
- `course_file_id`（integer，required）：群文件关系id
- `file_name`（string，required）：重命名文件名称

**输出/结果用途（按描述）**

重命名班级文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-move

- 技能 ID：`classin:space:course:move`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

批量移动班级文件。 触发场景：用户说「批量移动班级文件」。

**已公开的必填输入**

- `course_id`（integer，required）：群id（API: courseId）
- `target_folder_id`（integer，required）：移动到哪个目录id 不允许0（API: targetFolderId）

**输出/结果用途（按描述）**

批量移动班级文件。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-from_mine

- 技能 ID：`classin:space:course:from_mine`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

个人云盘文件保存到班级。 触发场景：用户说「个人云盘文件保存到班级」。

**已公开的必填输入**

- `course_id`（string，required）：群id
- `user_file_ids`（string，required）：用户文件关系id，多个用逗号分割
- `sid`（string，required）：sid

**输出/结果用途（按描述）**

个人云盘文件保存到班级。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-download

- 技能 ID：`classin:space:course:download`
- 操作类型：读
- 权限范围：`skill:classin:space:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取班级云盘文件的源文件下载路径（单文件或多文件逐个请求）。 触发场景：用户说「下载班级文件」「批量下载班级文件」。

**已公开的必填输入**

- `course_id`（integer，required）：课程 ID

**输出/结果用途（按描述）**

获取班级云盘文件的源文件下载路径（单文件或多文件逐个请求）。 具体响应字段、类型及错误结构：目录未提供。

### classin-space-course-delete

- 技能 ID：`classin:space:course:delete`
- 操作类型：写
- 权限范围：`skill:classin:space:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

批量删除班级文件。 触发场景：用户说「批量删除班级文件」。

**已公开的必填输入**

- `course_id`（integer，required）：群id（API: courseId）

**输出/结果用途（按描述）**

批量删除班级文件。 具体响应字段、类型及错误结构：目录未提供。

## 成绩（4 项）

### classin-score-student-total

- 技能 ID：`classin:score:student:total`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定学生在指定班级内的总成绩汇总。 触发场景：用户问「这个学生的总分」「学生综合成绩」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `student_uid`（integer，required）：学生 UID，必填

**输出/结果用途（按描述）**

查询指定学生在指定班级内的总成绩汇总。 具体响应字段、类型及错误结构：目录未提供。

### classin-score-set

- 技能 ID：`classin:score:set`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

手动设置或修改指定学生在某活动中的成绩（分数）。 触发场景：用户说「给张同学的作业打 85 分」「修改成绩」。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID，必填
- `student_uid`（integer，required）：学生 UID，必填
- `score`（string，required）：成绩分数，必填

**输出/结果用途（按描述）**

手动设置或修改指定学生在某活动中的成绩（分数）。 具体响应字段、类型及错误结构：目录未提供。

### classin-score-activity-student

- 技能 ID：`classin:score:activity:student`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定活动中所有学生的成绩列表。 触发场景：用户问「这个活动的学生成绩」「某活动所有学生分数」。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID，必填
- `course_id`（integer，required）：班级 ID，必填

**输出/结果用途（按描述）**

查询指定活动中所有学生的成绩列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-score-activity-list

- 技能 ID：`classin:score:activity:list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定班级+课程分类下的活动成绩列表。 触发场景：用户问「这个课程的成绩如何」「各活动分数情况」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `category_id`（integer，required）：课程分类 ID，必填。未知时先调 class:category:list 获取（API 字段: categoryId）

**输出/结果用途（按描述）**

查询指定班级+课程分类下的活动成绩列表。 具体响应字段、类型及错误结构：目录未提供。

## 学习报告（4 项）

### classin-report-unit-summary

- 技能 ID：`classin:report:unit:summary`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定学生在指定单元中的综合学习评价与成绩构成。 触发场景：用户问「某学生这个单元的学习情况」「单元综合评价」。

**已公开的必填输入**

- `unit_id`（integer，required）：单元 ID，必填
- `student_uid`（integer，required）：学生 UID，必填

**输出/结果用途（按描述）**

查询指定学生在指定单元中的综合学习评价与成绩构成。 具体响应字段、类型及错误结构：目录未提供。

### classin-report-course-summary

- 技能 ID：`classin:report:course:summary`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询课程（按课程分类）的单元数据汇总报告列表。 触发场景：用户问「课程报告」「这个课程分类的学习数据汇总」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `category_id`（integer，required）：课程分类 ID，必填

**输出/结果用途（按描述）**

查询课程（按课程分类）的单元数据汇总报告列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-report-activity-type_info

- 技能 ID：`classin:report:activity:type_info`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询某个学生对指定活动类型的专项报告详情（含测验作答结果）。 触发场景：用户问「某学生的测验结果」「查看作业报告」「测验详细报告」「打卡报告」。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID，必填（API: activityId）
- `student_uid`（integer，required）：学生 UID，必填（API: studentUid）
- `report_type`（string，required）：报告类型路径后缀，如 examInfo / homeworkInfo（API 路径段）

**输出/结果用途（按描述）**

查询某个学生对指定活动类型的专项报告详情（含测验作答结果）。 具体响应字段、类型及错误结构：目录未提供。

### classin-report-activity-base

- 技能 ID：`classin:report:activity:base`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询任意活动类型的报告基础信息（适用所有 bizType）。 触发场景：用户问「这个活动的报告」「查看活动数据」。

**已公开的必填输入**

- `activity_id`（integer，required）：活动 ID，必填
- `biz_type`（integer，required）：活动类型

**输出/结果用途（按描述）**

查询任意活动类型的报告基础信息（适用所有 bizType）。 具体响应字段、类型及错误结构：目录未提供。

## 题库与试卷（16 项）

### classin-question_bank-topic-share_view

- 技能 ID：`classin:question_bank:topic:share_view`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

通过 share_id 预览已分享试题内容（只读）。 触发场景：「打开分享链接里的试题预览」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `share_id`（integer，required）：试题分享 ID

**输出/结果用途（按描述）**

通过 share_id 预览已分享试题内容（只读）。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-topic-list

- 技能 ID：`classin:question_bank:topic:list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

分页查询试题列表，支持题型、难度、知识点/章节、关键字等筛选。 触发场景：「列出某学科的试题」「搜题」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

分页查询试题列表，支持题型、难度、知识点/章节、关键字等筛选。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-topic-batch_get

- 技能 ID：`classin:question_bank:topic:batch_get`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

按 topicQuery JSON 批量拉取试题完整内容。 触发场景：「根据 ID 批量看题干与选项」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `topic_query`（string，required）：JSON 数组字符串，如 `[{"topicId":1,"topicSource":1},...]`

**输出/结果用途（按描述）**

按 topicQuery JSON 批量拉取试题完整内容。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-subject-subject_list

- 技能 ID：`classin:question_bank:subject:subject_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取指定学段下的学科列表。 触发场景：「初中有哪些学科」「这个学段下的学科」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `period_id`（integer，required）：学段 ID，必填

**输出/结果用途（按描述）**

获取指定学段下的学科列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-subject-section_list

- 技能 ID：`classin:question_bank:subject:section_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

K12 场景获取教材章节树。 触发场景：「章节树」「教材章节」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

K12 场景获取教材章节树。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-subject-period_list

- 技能 ID：`classin:question_bank:subject:period_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

管理端获取学段列表（组织题库 sid 非 0）。 触发场景：「有哪些学段」「列出学段」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `language`（integer，required）：1 国内，2 海外，必填

**输出/结果用途（按描述）**

管理端获取学段列表（组织题库 sid 非 0）。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-subject-member_list

- 技能 ID：`classin:question_bank:subject:member_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

成员管理：获取指定学科下的授权成员列表。 触发场景：「这个学科有哪些管理员」「题库成员」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

成员管理：获取指定学科下的授权成员列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-subject-bank_list

- 技能 ID：`classin:question_bank:subject:bank_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取已创建题库的学科学段汇总列表；我的题库/官方题库可传 status 过滤未启用项。 触发场景：「我有哪些题库」「启用的学科题库列表」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

获取已创建题库的学科学段汇总列表；我的题库/官方题库可传 status 过滤未启用项。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-paper-share_view

- 技能 ID：`classin:question_bank:paper:share_view`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

通过 share_id 预览已分享试卷（只读）。 触发场景：「预览分享的试卷」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `share_id`（integer，required）：试卷分享 ID

**输出/结果用途（按描述）**

通过 share_id 预览已分享试卷（只读）。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-paper-relation

- 技能 ID：`classin:question_bank:paper:relation`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询试卷与题库实例等的绑定关系（返回结构以接口为准，可能与 error_info 封装不一致）。 触发场景：「这张卷绑在哪个题库」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `paper_bank_id`（integer，required）：题库主键 id（paperBankId）

**输出/结果用途（按描述）**

查询试卷与题库实例等的绑定关系（返回结构以接口为准，可能与 error_info 封装不一致）。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-paper-list

- 技能 ID：`classin:question_bank:paper:list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

分页查询试卷列表，支持分类与关键字。 触发场景：「某学科有哪些试卷」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

分页查询试卷列表，支持分类与关键字。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-paper-get

- 技能 ID：`classin:question_bank:paper:get`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取单套试卷的题目结构、分值与元数据。 触发场景：「这套卷子里有哪些题」「试卷内容」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `paper_id`（integer，required）：卷库试卷映射 ID，必填
- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

获取单套试卷的题目结构、分值与元数据。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-org-school_list

- 技能 ID：`classin:question_bank:org:school_list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取组织题库场景下可选机构列表（个人/官方题库会按成员权限过滤）。 触发场景：「组织题库有哪些学校」「列出可切换的机构」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

获取组织题库场景下可选机构列表（个人/官方题库会按成员权限过滤）。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-dimension-list

- 技能 ID：`classin:question_bank:dimension:list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

按 type 获取维度数据（如题型等），返回结构在 data 下按类型分键。 触发场景：「可选题型标签」「维度枚举」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `type`（string，required）：维度类型参数（OpenAPI 示例如 "[1,2,3]"），必填
- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

按 type 获取维度数据（如题型等），返回结构在 data 下按类型分键。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-category-relation_count

- 技能 ID：`classin:question_bank:category:relation_count`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询某分类节点关联的试题或试卷数量。 触发场景：「这个分类下有多少题」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

查询某分类节点关联的试题或试卷数量。 具体响应字段、类型及错误结构：目录未提供。

### classin-question_bank-category-list

- 技能 ID：`classin:question_bank:category:list`
- 操作类型：读
- 权限范围：`skill:classin:question_bank:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

获取分类/知识点/章节树（依 tree_type）。 触发场景：「分类树」「知识点目录」。 sourceType/分页等筛选脚本有默认值；用户未指定时不要追问。

**已公开的必填输入**

- `tree_type`（integer，required）：1 试题，2 章节，3 分类，必填
- `subject_id`（integer，required）：学科 id，必填

**输出/结果用途（按描述）**

获取分类/知识点/章节树（依 tree_type）。 具体响应字段、类型及错误结构：目录未提供。

## 视频 AI 内容（1 项）

### classin-file-rich_video_summary

- 技能 ID：`classin:file:rich_video_summary`
- 操作类型：读
- 权限范围：`skill:classin:file:read`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

按视频来源拉取多形态 AI 内容总结或 AI 转写（章节树 / 字幕列表）。 触发：「直播回放的视频总结」「录播课的 AI 总结 / AI 转写 / 字幕转写」； 「章节大纲」「转写」。 默认只返回 data.cosUrl，不返回正文；用户明确要求输出内容时加 --include-content。 chapter=1（或默认）→ AI 内容总结；subtitle=1 → AI 转写。 用 source 区分：classroom_replay（直播回放，share：classKey+fileId） 与 record（录播，app/file：courseId+fileId+bizType=4+bizId）。 成功返回 cosUrl（及可选 content）；不是授课分析报告 URL，也不是 LMS 学情报告。

**已公开的必填输入**

- `file_id`（string，required）：视频/回放 FileId（API: fileId）

**输出/结果用途（按描述）**

按视频来源拉取多形态 AI 内容总结或 AI 转写（章节树 / 字幕列表）。 具体响应字段、类型及错误结构：目录未提供。

## 测验作答与批阅（1 项）

### classin-exam-answer_mark_result

- 技能 ID：`classin:exam:answer_mark_result`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询某学生在指定测验中的作答与批阅详情（含作答正文、对错、得分）。 触发场景：用户问「学生答了什么」「错题详情」「批阅结果」「红错答案」。 与 classin-report-activity-type_info（examInfo）不同：本接口返回逐题 answer，不只是对错汇总。 注意：选择题/判断题的 answer 是从 1 起的 optionId（如 "2"=第 2 项），不是 A/B/C 字母也不是选项原文；需配合试题 options 映射。

**已公开的必填输入**

- `exam_id`（integer，required）：测验 ID，必填（API: examId）；通常等于 classin-activity-exam-get 返回的 data.bizId
- `student_uid`（integer，required）：学生 UID，必填（API: studentIds 数组单元素）

**输出/结果用途（按描述）**

查询某学生在指定测验中的作答与批阅详情（含作答正文、对错、得分）。 具体响应字段、类型及错误结构：目录未提供。

## 课程与活动列表（5 项）

### classin-course-unit_list

- 技能 ID：`classin:course:unit_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询教师视角的班级单元列表（含活动数量与发布状态）。 触发场景：教师在课程页预加载/搜索单元列表。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `category_id`（integer，required）：课程分类 ID，必填（API 字段: categoryId）

**输出/结果用途（按描述）**

查询教师视角的班级单元列表（含活动数量与发布状态）。 具体响应字段、类型及错误结构：目录未提供。

### classin-course-unit_activity_list

- 技能 ID：`classin:course:unit_activity_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

教师视角查询班级单元的活动列表（分页/按条件筛选）。 unit_ids 必须指定；可选过滤活动类型、发布状态、进行状态、名称等。 触发场景：课程页按单元展示活动清单。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID（API 字段: courseId）
- `category_id`（integer，required）：课程分类 ID（API 字段: categoryId）
- `sid`（integer，required）：机构 SID（API 字段: SID）
- `unit_ids`（string，required）：单元 ID 数组，例如 `[26361155]`（逗号分隔多个值，API 字段: unitIds）

**输出/结果用途（按描述）**

教师视角查询班级单元的活动列表（分页/按条件筛选）。 具体响应字段、类型及错误结构：目录未提供。

### classin-course-student_unit_list

- 技能 ID：`classin:course:student_unit_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

学生视角预加载班级单元列表（含活动数与发布状态）。 触发场景：学生进入课程页加载可见单元。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `category_id`（integer，required）：课程分类 ID，必填（API 字段: categoryId）

**输出/结果用途（按描述）**

学生视角预加载班级单元列表（含活动数与发布状态）。 具体响应字段、类型及错误结构：目录未提供。

### classin-course-student_unit_activity_list

- 技能 ID：`classin:course:student_unit_activity_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

学生视角查询单元内活动列表，含作业/测验/课堂等状态字段。 触发场景：学生进入单元查看活动清单或老师代查学生视图。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `category_id`（integer，required）：课程分类 ID，必填（API 字段: categoryId）
- `unit_ids`（string，required）：单元 ID 数组，必填，如 `[29360770]` 或 `29360770`（API 字段: unitIds）

**输出/结果用途（按描述）**

学生视角查询单元内活动列表，含作业/测验/课堂等状态字段。 具体响应字段、类型及错误结构：目录未提供。

### classin-course-class_activity_list

- 技能 ID：`classin:course:class_activity_list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

按班级与分类查询已发布的课堂活动（课节）列表，按未开始/进行中/已结束分组。 触发场景：「这个班有哪些课节」「列出课堂活动」；无单元也能查（不依赖 unitList）。 后续可用 bizId 作课节 classId，配合 classin-activity-video_list（--biz-type 1）。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID（API: courseId）
- `category_id`（integer，required）：课程分类 ID（API: categoryId）
- `sid`（integer，required）：机构 SID / schoolUid（API: SID）

**输出/结果用途（按描述）**

按班级与分类查询已发布的课堂活动（课节）列表，按未开始/进行中/已结束分组。 具体响应字段、类型及错误结构：目录未提供。

## 组合查询（2 项）

### classin-composite-rich_video_summary

- 技能 ID：`classin:composite:rich_video_summary`
- 操作类型：读
- 权限范围：`skill:classin:class:read`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

组合技能：有课程或课节/录播活动即可分段拿到视频 AI 内容总结或 AI 转写。 触发：「获取课节/课程/录播的 AI 内容总结」「获取 … 的 AI 转写 / 字幕转写 / 转写」； 「章节大纲」「字幕列表」。 默认只返回 data.cosUrl（不返回正文），用户明确要求输出内容时加 --include-content。 默认 chapter（AI 内容总结）；`--subtitle 1` 取 AI 转写（字幕总结）。 默认课程入口同时列出已结束直播课（bizType=1）与录播课（bizType=4）； 传 activityId 时自动识别类型并分流：直播→share richVideoSummary，录播→app/file richVideoSummary。 自包含完整 HTTP 工作流，不依赖其它原子技能目录。

**已公开的必填输入**

- `course_id`（integer，conditional）：班级 ID；仅课程入口时需要（API: courseId）
- `activity_id`（integer，conditional）：活动 ID；直播课可不传 course_id；录播可反查 course_id
- `class_id`（integer，conditional）：直播课节 classId/bizId（仅 bizType=1）
- `lesson_key`（string，conditional）：直播回放 lessonKey（仅 bizType=1）
- `file_id`（string，conditional）：视频/回放 FileId

**输出/结果用途（按描述）**

组合技能：有课程或课节/录播活动即可分段拿到视频 AI 内容总结或 AI 转写。 具体响应字段、类型及错误结构：目录未提供。

### classin-composite-list_class_homework

- 技能 ID：`classin:composite:list_class_homework`
- 操作类型：读
- 权限范围：`skill:classin:class:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

按班级查询单元下活动列表（默认筛作业 bizType=2；可扩展至 bizType 1—10）。 典型入参 course_id + sid；仅有班名时脚本内自动调班级列表解析 course_id。 本技能自包含完整工作流与 HTTP 调用，无需依赖其它原子技能目录。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

按班级查询单元下活动列表（默认筛作业 bizType=2；可扩展至 bizType 1—10）。 具体响应字段、类型及错误结构：目录未提供。

## 班级管理（10 项）

### classin-class-member-list

- 技能 ID：`classin:class:member:list`
- 操作类型：读
- 权限范围：`skill:classin:class:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定班级下的成员花名册（学生/旁听），返回实到成员列表。 触发场景：用户说「这个班有哪些学生」「查看班级成员」「班级花名册」「班里有多少人」。 返回：memberUid、userName、identity（1=学生 2=旁听）、status、courseNickname 等。 注意：本技能用于「某班成员列表/实到人数」；与 classin-class-lifecycle-member_list（我的班级列表）不同。 班级详情里的 studentNum 是容量上限，不能替代本技能。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `school_uid`（integer，required）：机构 UID，必填

**输出/结果用途（按描述）**

查询指定班级下的成员花名册（学生/旁听），返回实到成员列表。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-member-add_student

- 技能 ID：`classin:class:member:add_student`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

向指定班级批量添加学生，返回每个学生的添加结果。 触发场景：用户说「添加学生到班级」「把这些 UID 的学生加进去」。 注意：errno=163 表示学生已在班级中；errno=121202149 表示账号已注销。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `school_uid`（integer，required）：机构 UID，必填
- `student_uids`（string，required）：学生 UID 列表

**输出/结果用途（按描述）**

向指定班级批量添加学生，返回每个学生的添加结果。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-member_list

- 技能 ID：`classin:class:lifecycle:member_list`
- 操作类型：读
- 权限范围：`skill:classin:class:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询当前登录用户（教师或学生）的班级列表，支持按状态和身份筛选。 触发场景：用户说「我有哪些班级」「列出我的班级」「查看班级列表」。 返回：courseId、courseName、identity（1=学生 2=旁听 3=老师 192=班主任）、state 等。 注意：本技能用于「我的班级列表」，不能用于查询某班实到学生人数或花名册；若出现 studentNum / auditNum，均为容量上限，不是实到人数。

**已公开的必填输入**

目录未列必填参数；可选参数及身份上下文要求需补查执行文档。

**输出/结果用途（按描述）**

查询当前登录用户（教师或学生）的班级列表，支持按状态和身份筛选。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-end

- 技能 ID：`classin:class:lifecycle:end`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

将班级标记为结课状态（只读模式，操作不可逆）。 触发场景：用户明确说「将班级结课」「归档这个班级」并确认后执行。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填。结课不可逆，请确认后再调用。
- `school_uid`（integer，required）：机构 UID，必填

**输出/结果用途（按描述）**

将班级标记为结课状态（只读模式，操作不可逆）。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-edit

- 技能 ID：`classin:class:lifecycle:edit`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

修改班级的名称、封面、介绍等基本信息。 触发场景：用户说「修改班级名称」「更新封面」「改一下班级介绍」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `school_uid`（integer，required）：机构 UID，必填（API 字段: schoolUid）

**输出/结果用途（按描述）**

修改班级的名称、封面、介绍等基本信息。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-detail

- 技能 ID：`classin:class:lifecycle:detail`
- 操作类型：读
- 权限范围：`skill:classin:class:read`
- 限流：60 次/分钟

**用途、场景与限制（目录原文）**

查询指定班级的完整信息，包含基本信息、配置上限、课节统计及权限设置； 并解析下游 LMS 所需的机构 SID（data.schoolUid）。 触发场景：用户说「查看班级详情」「这个班的信息」「班级 {courseId} 的情况」； 或为课节列表 / 回放 / 视频总结链路准备 SID。 返回字段包括：courseName、courseType、courseState、teacherNum、studentNum、totalClassNum、schoolUid 等。 注意：studentNum / auditNum / maxSeatNum / maxClassNum 为机构版本配置的容量上限，不是班级实到人数；禁止据此回答「班里有多少学生」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID

**输出/结果用途（按描述）**

查询指定班级的完整信息，包含基本信息、配置上限、课节统计及权限设置； 并解析下游 LMS 所需的机构 SID（data.schoolUid）。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-create

- 技能 ID：`classin:class:lifecycle:create`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

在 ClassIn 平台创建新班级，返回班级 ID（courseId）。 触发场景：用户说「新建一个班级」「帮我创建班级」。 成功后 errno=1，data.courseId 为新班级 ID。

**已公开的必填输入**

- `course_name`（string，required）：班级名称，必填（API 字段: courseName）
- `school_uid`（integer，required）：机构 UID，必填（API 字段: schoolUid）

**输出/结果用途（按描述）**

在 ClassIn 平台创建新班级，返回班级 ID（courseId）。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-lifecycle-batch_create

- 技能 ID：`classin:class:lifecycle:batch_create`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：10 次/分钟

**用途、场景与限制（目录原文）**

在 ClassIn 平台按学科批量创建班级：传入一个班级名称前缀和一组学科 ID， 每个学科生成一个班级，班级名为「{名称前缀}-{学科名}」。 触发场景：中小学机构一次性为多个学科开班。 成功后 errno=1。 仅限「中小学校」类型机构（机构 type=2）；教培机构调用会返回 errno=100。 不能用于「一次创建多个任意名称的班级」——那种场景请循环调用 classin-class-lifecycle-create。

**已公开的必填输入**

- `course_name`（string，required）：班级名称前缀，最长 90 字符；最终班名为「前缀-学科名」（API 字段: courseName）
- `category_id`（integer，required）：班级分类 ID，必须属于本机构（API 字段: categoryId）
- `subject_ids`（string，required）：学科 ID 列表，逗号分隔；每个学科生成一个班级（API 字段: subjectIds）

**输出/结果用途（按描述）**

在 ClassIn 平台按学科批量创建班级：传入一个班级名称前缀和一组学科 ID， 每个学科生成一个班级，班级名为「{名称前缀}-{学科名}」。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-config-settings

- 技能 ID：`classin:class:config:settings`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

修改班级的功能开关，如禁言、AI 功能、邀请加入等。 触发场景：用户说「关闭班级禁言」「开启 AI 助教」「禁止学生修改昵称」。 所有开关字段均为可选，未传入的字段保持原值。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `school_uid`（integer，required）：机构 UID，必填（API 字段: schoolUid）
- `app_invite_state`（integer，required）：App 邀请加入：0=关闭，1=开启，必填（API 字段: appInviteState）

**输出/结果用途（按描述）**

修改班级的功能开关，如禁言、AI 功能、邀请加入等。 具体响应字段、类型及错误结构：目录未提供。

### classin-class-config-pin

- 技能 ID：`classin:class:config:pin`
- 操作类型：写
- 权限范围：`skill:classin:class:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

将指定班级置顶（isTop=1）或取消置顶（isTop=0）。 触发场景：用户说「把班级置顶」「取消置顶」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `is_top`（integer，required）：1=置顶，0=取消置顶，必填

**输出/结果用途（按描述）**

将指定班级置顶（isTop=1）或取消置顶（isTop=0）。 具体响应字段、类型及错误结构：目录未提供。

## 课程分类（4 项）

### classin-category-update

- 技能 ID：`classin:category:update`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

修改指定课程分类的名称。 触发场景：用户说「把课程分类改名为...」「编辑分类名称」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `category_id`（integer，required）：课程分类 ID，必填
- `name`（string，required）：新名称，必填

**输出/结果用途（按描述）**

修改指定课程分类的名称。 具体响应字段、类型及错误结构：目录未提供。

### classin-category-list

- 技能 ID：`classin:category:list`
- 操作类型：读
- 权限范围：`skill:classin:activity:read`
- 限流：120 次/分钟

**用途、场景与限制（目录原文）**

查询指定班级下的课程分类列表，返回 categoryId 供后续接口使用。 触发场景：用户问「查看班级的课程分类」「获取 categoryId」； 视频总结链路中在拿到 SID 后列出班级→课程再查课节。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填（API 字段: courseId）
- `sid`（integer，required）：机构 SID / schoolUid，必填（API 字段: SID）

**输出/结果用途（按描述）**

查询指定班级下的课程分类列表，返回 categoryId 供后续接口使用。 具体响应字段、类型及错误结构：目录未提供。

### classin-category-delete

- 技能 ID：`classin:category:delete`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：20 次/分钟

**用途、场景与限制（目录原文）**

删除指定的课程分类（不可逆操作，需用户二次确认）。 触发场景：用户说「删除这个课程分类」「移除分类」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `category_id`（integer，required）：课程分类 ID，必填

**输出/结果用途（按描述）**

删除指定的课程分类（不可逆操作，需用户二次确认）。 具体响应字段、类型及错误结构：目录未提供。

### classin-category-create

- 技能 ID：`classin:category:create`
- 操作类型：写
- 权限范围：`skill:classin:activity:write`
- 限流：30 次/分钟

**用途、场景与限制（目录原文）**

在指定班级下创建新的课程分类，返回新建的 categoryId。 触发场景：用户说「新建一个课程分类叫第一单元」「创建分类」。

**已公开的必填输入**

- `course_id`（integer，required）：班级 ID，必填
- `sid`（integer，required）：机构 SID / schoolUid，必填
- `name`（string，required）：分类名称，必填

**输出/结果用途（按描述）**

在指定班级下创建新的课程分类，返回新建的 categoryId。 具体响应字段、类型及错误结构：目录未提供。