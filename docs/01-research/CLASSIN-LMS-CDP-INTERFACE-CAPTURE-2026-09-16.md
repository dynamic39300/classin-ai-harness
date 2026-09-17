# ClassIn LMS 登录态页面接口采集报告

日期：2026-09-16<br>
状态：`AUTHENTICATED_CLIENT_CAPTURE_VERIFIED`<br>
范围：ClassIn 6.1 内嵌 LMS，Chrome `chrome://inspect/#devices` 通过 `127.0.0.1:7777` 连接；只读观察，不执行业务写入。

## 结论

本轮直接监听了用户在 ClassIn 6.1 内嵌 LMS 中的实际点击。采集范围为 2026-09-16 14:26:37–14:32:47（Asia/Shanghai），共记录：

- 917 个网络请求，其中 250 个 XHR、39 个 Fetch；
- 47 个不同的 XHR/Fetch Endpoint；
- 9 次主页面导航；
- 12 次 WebSocket 连接，来自推送网关和普通 IM 网关；
- 831 个可读取的文本/JSON 响应体。

除页面埋点与错误上报中 4 个随导航取消的 beacon 外，本轮业务请求都取得 HTTP 响应。Cookie、Token、签名、账号和响应中的个人字段已自动脱敏；受限运行目录中的授权测试轨迹仍可能保留课程、课节、机构等对象 ID，只用于接口归属核验，不作为可提交样本。本文不记录真实个人信息或会话凭据。

这次操作验证了课程首页、课程分类、单元、五类教学活动摘要、在线课堂详情、待办、公告、课程 Agent、AI 服务状态、班群映射和两类 WebSocket 的登录态真实调用。其中新增的高价值事实是：

1. `POST /classroom/app/classInfo/simpleInfo` 会以“当前时间到未来 24 小时”为窗口发现下一堂课，并返回 `courseId/classId/className/classBtime/classEtime/classStatus`；本轮四次都稳定返回同一目标课节。
2. `POST /lms/app/activity/class/get` 在点击在线课堂后成功返回活动与课堂的映射，包括 `activityId → bizId(classId)`、课节时间、学生总数和课堂/录制状态。
3. 本轮没有出现 `/saasajax/teaching.ajax.php?action=getClassInfo` 或 `action=getClassMember`。课程首页和课堂活动详情并不会自动拉取成员级实时考勤；要继续验证该链路，需要进入监课/实时考勤页面。
4. `unitActivityList.status.onClassTotal` 是活动目录摘要字段，且结束课堂样本返回 0；它不能代替成员实时在课明细。

## 1. 实际操作与请求时间线

| 时间（Asia/Shanghai） | 页面动作推断 | 直接触发的主要接口 | 结果 |
|---|---|---|---|
| 14:27:24–14:29:15 | 依次展开第 1、2、4、3 讲单元 | `/lms/app/course/unitActivityList`，每次指定一个 `unitIds` | 返回对应单元的 `activities[]` |
| 14:29:17 | 刷新课程主页 | 课程、成员、分类、单元、活动、公告入口、待办入口、Agent、班群、近期课堂等初始化接口 | 初始化成功；形成完整课程首页调用簇 |
| 14:29:24 | 打开/获取课程邀请入口 | `/course/app/course/get-invite-url` | 返回邀请二维码与公开课程链接定位 |
| 14:29:29 | 打开班级公告 | `/schedule-bff/api/class/announcement/list` | 成功，当前 `total=0` |
| 14:29:35 | 进入“待处理”页面 | `/todocenter/todo/search-options`、`/todo/v6/list/future/main`、`/todo/v6/list/main` | 成功返回当前课程和未来任务分桶 |
| 14:30:22–14:31:04 | 返回课程主页并多次刷新/重载 | 重复课程首页初始化调用簇 | 响应稳定；可区分页面初始化请求和后续点击请求 |
| 14:31:10 | 切换到另一课程分类 | `/lms/app/course/unitList`、`unitActivityList`、`content/collection/detail` | 该分类只有一个空单元，活动为空 |
| 14:31:11–14:31:18 | 返回 LMS 首页、重新进入课程并切回主分类 | `/course/app/member/course_list` 及课程首页初始化调用簇 | 成功恢复主分类及 15 个单元 |
| 14:31:31 | 展开第 2 讲 | `/lms/app/course/unitActivityList`，`unitIds=[53173129]` | 返回资料、在线课堂和单元练习 |
| 14:31:55 | 点击第 2 讲在线课堂 | `/lms/app/activity/class/get` | 成功返回 `activityId=54580414 → classId=1250728` 的课堂详情 |

时间线中的“动作推断”由导航时间、请求参数变化和单一点击型 Endpoint 的相邻关系得出。重复初始化接口不等于用户重复点击每个模块。

## 2. 页面模块与核心接口

### 2.1 课程与教学活动主页

| 模块 | Endpoint | 已验证输入 | 已验证输出/用途 |
|---|---|---|---|
| 当前课程关系 | `POST /course/app/course/member/info` | `courseId` | 当前用户在课程中的身份、课程设置、机构信息、待办/通知计数 |
| 课程列表 | `POST /course/app/member/course_list` | `page/pageSize/states` | 登录用户可见课程列表 |
| 课程分类 | `POST /lms/app/category/list` | `SID/courseId` | 分类 `categoryId/name/orderId`；本样本有两个分类 |
| 单元列表 | `POST /lms/app/course/unitList` | `categoryId/courseId/SID/role` | `unitId/name/order/activityCount/publishFlag` |
| 单元活动 | `POST /lms/app/course/unitActivityList` | `categoryId/unitIds/courseId/SID/role` | 单元下 `activities[]`，覆盖在线课堂、作业、测验、录播和资料五类活动 |
| 教案/学案 | `POST /lms/app/content/collection/detail` | `type/courseId/categoryId/SID` | 教案和学案 Collection 列表 |
| 共创入口 | `POST /lms/app/content/collection/getCollectionId` | `courseId/SID/template/type` | Collection 定位、权限和只读状态；响应 Token 必须留在受控服务侧 |
| 通知列表 | `POST /lms/app/content/notice/list` | `courseId/SID/page` | 通知 `total/list` |
| 通知提及 | `POST /lms/app/content/notice/mention/list` | `uids/courseId` | 用户维度提及摘要 |

`unitActivityList` 的真实响应证明活动类型与摘要字段可直接用于课程目录投影：

- `type=1`：在线课堂，含 `bizId(classId)`、课节时间、`classStatus`、`studentTotal`、`onClassTotal`、录制状态；
- `type=2`：作业，含 `studentTotal/submitTotal/correctTotal`；
- `type=3`：测验，含提交、批阅和试卷定位；
- `type=4`：录播，含检查人数、待批数量和学生总数；
- `type=5`：学习资料，含查阅人数和学生总数。

### 2.2 课节发现与课堂详情

| Endpoint | 调用条件 | 本轮结果 | 能力边界 |
|---|---|---|---|
| `POST /classroom/app/classInfo/simpleInfo` | 课程主页初始化；请求 `startTime/endTime`，窗口为 24 小时 | 四次成功返回同一下一堂课：`courseId=591820`、`classId=1250728`、课节名称、开始/结束时间、`classStatus=1` | 已能在登录态发现目标课节；没有成员考勤字段 |
| `POST /lms/app/activity/class/get` | 点击在线课堂活动 | 成功返回活动 `54580414`，其 `bizId=1250728`，并返回 `studentTotal=3`、`liveState/openState/recordState` 等 | 是课堂活动详情，不是成员实时在课名单 |
| `POST /saasajax/teaching.ajax.php?action=getClassInfo` | 本轮未触发 | 无本轮运行证据 | 监课列表合同仍来自 Apifox 与匿名鉴权探测 |
| `POST /saasajax/teaching.ajax.php?action=getClassMember` | 本轮未触发 | 无本轮运行证据 | 成员实时考勤仍待监课页面登录态捕获 |

首轮 Adapter 可以把 `simpleInfo` 作为“未来 24 小时课节发现”的已验证候选，并用 `unitActivityList/activity/class/get` 完成课程、活动与 `classId` 的归属核验。成员实时状态仍必须由 `getClassMember` 或经确认的数据库服务取得。

### 2.3 待办、公告和课程入口

| 模块 | Endpoint | 本轮结果 |
|---|---|---|
| 课程待办摘要 | `POST /todocenter/todo/list/course` | 成功返回课程级 `total/red_total/list` |
| 待办筛选 | `POST /todocenter/todo/search-options` | 成功返回可筛选课程 |
| 当前待办 | `POST /todocenter/todo/v6/list/main` | 当前课程 2 项，按逾期、当天、本周等分桶；任务内容含活动类型、活动 ID、课堂 ID、学生/提交摘要 |
| 未来待办 | `POST /todocenter/todo/v6/list/future/main` | 返回未来课程与任务分桶，可用于“接下来要上什么课/有哪些截止任务” |
| LMS 首页待办 | `POST /todocenter/todo/list/index` | 成功返回首页待办 |
| 红点 | `POST /todocenter/todo/red-dot/get` | 成功返回 `red_total` |
| 公告入口 | `POST /schedule-bff/api/class/announcement/entrance/detail` | 业务响应“班级公告不存在”，表示当前没有入口详情，不是网络失败 |
| 公告列表 | `POST /schedule-bff/api/class/announcement/list` | 成功，当前 `total=0` |
| 邀请入口 | `POST /course/app/course/get-invite-url` | 成功返回邀请定位；属于分享能力，不进入 Agent 长期上下文 |

### 2.4 Agent、AI 与普通 IM

| 能力 | Endpoint/协议 | 本轮结果 |
|---|---|---|
| 课程 Agent 列表 | `POST /agentin/app/course/agent/list` | 成功，返回“班级助教”和“AI学情”两个默认 Agent |
| Agent 详情 | `POST /agentin/app/course/publicagent/detail` | 成功返回能力、欢迎语、建议问题和知识信息等合同 |
| Agent 分类 | `POST /agentin/app/orchestration/get_category_list` | 成功返回身份默认分类与分类数据 |
| 课程 AI 状态 | `POST /course-ai-assistant/app/course/checkStatus` | 六次均返回“机构未开通AI助教服务”；这是当前测试机构的业务 Gate |
| 课程附加群组 | `POST /chat-gateway-go/api/chatGroup/list` | 18 次成功，当前 `groups=[]`；继续符合“没有附加分组，不代表课程主群不存在”的既有结论 |
| 普通 IM WebSocket | `wss://dynamic14.eeo.im/chat-gateway-go/ws` | 四次连接均鉴权成功；本轮只有鉴权、全局事件订阅和心跳，没有进入群会话或拉取历史消息 |
| 业务推送 WebSocket | `wss://dynamic14.eeo.im/push-gateway-ws-api/ws` | 八次连接及心跳成功；本轮没有捕获业务推送事件 |

## 3. 全量 XHR/Fetch Endpoint 清单

以下 47 个不同 Endpoint 均来自本轮实际网络事件。调用次数包含页面刷新和重复初始化。

### 3.1 课程、LMS、课堂与内容

| 调用次数 | Endpoint | 业务结果 |
|---:|---|---|
| 6 | `POST /course/app/course/member/info` | 成功 |
| 5 | `POST /course/app/member/course_list` | 成功 |
| 1 | `POST /course/app/course/get-invite-url` | 成功 |
| 4 | `POST /course/app/course/rechargeReminder` | 成功 |
| 6 | `POST /lms/app/category/list` | 成功 |
| 8 | `POST /lms/app/course/unitList` | 成功 |
| 35 | `POST /lms/app/course/unitActivityList` | 成功 |
| 1 | `POST /lms/app/activity/class/get` | 成功 |
| 8 | `POST /lms/app/content/collection/detail` | 成功 |
| 6 | `POST /lms/app/content/collection/getCollectionId` | 成功 |
| 10 | `POST /lms/app/content/notice/list` | 成功 |
| 8 | `POST /lms/app/content/notice/mention/list` | 成功 |
| 4 | `POST /classroom/app/classInfo/simpleInfo` | 成功，均返回一堂 24 小时窗内课节 |
| 19 | `POST /school/setting/batchGet` | 成功 |
| 6 | `POST newbee14 /apix/collection/page/level-list` | 成功 |
| 7 | `GET /sysshare/custom/clientCourseCover.json` | 成功，课程封面配置 |
| 7 | `GET /sysshare/custom/clientCourseHeadImg.json` | 成功，课程头像配置 |

### 3.2 待办与公告

| 调用次数 | Endpoint | 业务结果 |
|---:|---|---|
| 6 | `POST /todocenter/todo/list/course` | 成功 |
| 1 | `POST /todocenter/todo/list/index` | 成功 |
| 2 | `POST /todocenter/todo/red-dot/get` | 成功 |
| 1 | `POST /todocenter/todo/search-options` | 成功 |
| 1 | `POST /todocenter/todo/v6/list/main` | 成功 |
| 1 | `POST /todocenter/todo/v6/list/future/main` | 成功 |
| 6 | `POST /schedule-bff/api/class/announcement/entrance/detail` | 当前公告不存在 |
| 1 | `POST /schedule-bff/api/class/announcement/list` | 成功，列表为空 |

### 3.3 Agent、AI、IM

| 调用次数 | Endpoint | 业务结果 |
|---:|---|---|
| 6 | `POST /agentin/app/course/agent/list` | 成功 |
| 8 | `POST /agentin/app/course/publicagent/detail` | 成功 |
| 6 | `POST /agentin/app/orchestration/get_category_list` | 成功 |
| 6 | `POST /course-ai-assistant/app/course/checkStatus` | 机构未开通 AI 助教服务 |
| 18 | `POST /chat-gateway-go/api/chatGroup/list` | 成功，附加群组为空 |

### 3.4 身份、机构、版本与基础能力

| 调用次数 | Endpoint | 业务结果 |
|---:|---|---|
| 5 | `POST /api/classin.api.php?action=getMySchoolList` | 成功 |
| 4 | `POST /usercenter/v2/app/user-info/getUserInfoByUid` | 成功；个人字段已脱敏 |
| 4 | `POST /zero-usercenter/app/user/identity` | 成功 |
| 4 | `POST /zero-usercenter/app/category/list` | 成功 |
| 4 | `POST /zero-usercenter/app/user/guidance/task` | 成功 |
| 4 | `POST /zero-usercenter/app/experiment/group` | 成功 |
| 2 | `POST /coreapi/app/getSchoolInfos` | 成功 |
| 1 | `POST /coreapi/app/getDepartmentUpdateVersion` | 当前身份不是中小学部门老师 |
| 2 | `POST /coreapi/app/getVersionMultilingual` | 成功 |
| 4 | `POST /coreapi/app/getStorageReminderMsg` | 成功 |
| 4 | `POST /mix/app/gray/v2/batchGetGrayVal` | 成功 |
| 1 | `POST /zero-user-wx/public/checkDisplay` | 成功 |
| 1 | `POST /zero-user-wx/public/info` | 成功 |
| 6 | `GET /assets/data/jsons/.../arealocation_zh-CN.json` | 成功，地区静态配置 |
| 4 | `POST /saasajax/server.ajax.php?action=getNServeTime` | 成功，服务器时间 |

### 3.5 观测与埋点

| 调用次数 | Endpoint | 说明 |
|---:|---|---|
| 19 | `POST errmon.eeo.cn/api/60/envelope/` | Sentry 错误/会话上报；4 个 beacon 随导航结束，非业务接口失败 |
| 16 | `POST et.eeo.cn/sa.gif` | 页面分析埋点，不进入产品业务合同 |

## 4. 对 API 映射稿的影响

本轮可以新增或提升以下证据：

- `classInfo/simpleInfo`：从静态候选提升为 `CALL`，用于登录态 24 小时窗课节发现；
- `activity/class/get`：增加“用户实际点击课堂详情”的客户端 `CALL` 证据；
- `unitList/unitActivityList/category/list`：增加 ClassIn 内嵌 LMS 登录态真实页面调用证据；
- `todo/v6/list/main` 与 `future/main`：证明当前/未来任务可以按时间桶返回活动 ID、课堂 ID、学生与提交摘要；
- `chatGroup/list + chat WebSocket`：再次确认主课程页面会自动完成 IM 鉴权，但没有进入群会话时不会拉取历史；
- 实时考勤：课节发现现在有 `CALL`，成员明细仍是 `DOC / AUTHENTICATED_SAMPLE_PENDING`。

## 5. 后续捕获入口

下一轮如果目标是实时考勤，应保持同一 `127.0.0.1:7777` 监听方式，在 ClassIn 内进入监课、课堂人员或实时考勤页面，并至少触发：

1. 正在进行或临近开始的目标课节；
2. 课节成员列表；
3. 刷新一次成员状态；
4. 若页面存在，打开单成员进出明细。

验收目标是捕获 `getClassInfo/getClassMember` 或实际替代 Endpoint，确认登录会话、请求参数、业务成功码、字段单位、刷新频率和跨课节权限。未出现这些 Endpoint 前，不能把本轮 `simpleInfo` 或活动摘要字段描述为实时考勤已接通。

本轮没有调用写接口，没有修改 ClassIn 业务数据，也没有把 Cookie、Token、签名或成员个人信息写入本文档。
