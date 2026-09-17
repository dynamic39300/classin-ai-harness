# ClassIn 实时考勤接口与数据链路核验

日期：2026-09-16<br>
状态：`CONTRACT_VERIFIED / AUTHENTICATED_SAMPLE_PENDING`<br>
Write Set：仅本文档；不修改 API 映射审阅稿、应用或 Adapter；不执行业务写入。

## 结论

用户提供的 `POST https://dynamic14.eeo.im/saasajax/teaching.ajax.php?action=getClassInfo` 是“正式课节监课列表”接口，不是单课成员明细接口。Apifox 项目 `345136` 中与它配套的单课明细是接口 `3473563`：同一路径、`action=getClassMember`。两者组成“先发现课节，再读取该课节成员实时状态”的两步链路：

1. `getClassInfo` 按时间和状态筛选正式课节，返回课节、教师、助教和学生的监课快照；
2. 从结果取得 `classId`，调用 `getClassMember`，返回成员级到课、当前在教室、迟到、早退、累计时长和进出记录。

这条 API 链路在一手 Apifox 契约中存在，匿名请求也确认服务端会检查登录会话；但本轮没有取得已登录会话下的真实业务响应，因此当前结论是“契约已识别，可进入授权实测”，不是“真实课堂数据已经验收”。两个 Apifox 接口状态都是 `integrating`，响应字段仅存在于示例，正式 JSON Schema 仍为空。

数据库侧也有一个必须保留的差异：OceanBase 实时实例中存在 `eo_classroom` 数据库，但当前元数据里找不到用户给出的 `eeo_class_member_time` 和 `eeo_class_member_time_detail` 两张物理表；当前 `eo_classroom` 仅可见 `eeo_class_file`。与此同时，数仓确实保留了名为 `ods_ms_eo_classroom_eeo_class_member_time_di` 的同步表，以及另一条 `eo_os` 来源的同结构表。这证明 `eeo_class_member_time` 数据模型和 `eo_classroom` 来源血缘存在过，但不足以证明用户给出的两张生产物理表目前仍以该名称直连可查。

因此，首选实时读取方式应是已识别的 `getClassInfo → getClassMember` API；数据库方式要先由数据源负责人确认当前物理库表、迁库状态和授权访问方式。T-1 数仓视图可以做回放、校验和对账，不能代替课中实时状态。

## 1. API 链路

### 1.1 `getClassInfo`：正式课节监课列表

一手来源：Apifox 项目 `345136`、接口 `3473499`，名称“获取正式课节监课列表”。

```http
POST /saasajax/teaching.ajax.php?action=getClassInfo
Content-Type: application/x-www-form-urlencoded
```

Apifox 标记以下表单字段为必填：

| 字段 | 已知含义 | 当前契约缺口 |
|---|---|---|
| `startTimestamp` | 查询开始时间 | 单位、闭开区间未写入 schema |
| `endTimestamp` | 查询结束时间 | 单位、闭开区间未写入 schema |
| `classTimeStatus` | 课节时间状态 | 正式课节接口未登记枚举 |
| `classStatus` | 课节状态 | 枚举未登记 |
| `classType` | 课节类型 | 枚举未登记 |
| `sort` | 排序 | 枚举和默认值未登记 |

成功示例的顶层结构是 `error_info + data`；`data` 包含：

- `total`：匹配课节总数；
- `html[]`：课节数组，虽然字段名叫 `html`，内容是结构化对象；
- `userInfo`：示例中是用户信息映射，含账号等敏感字段，Adapter 不应原样透传或持久化。

单个 `html[]` 课节对象的关键字段包括：

- 课节定位：`id`、`clientClassId`、`courseId`、`schoolUid`；
- 课节说明：`name`、`courseName`、`category`、`hours.start/end`；
- 主讲：`teacherInfo`；助教：可选 `assTeacherInfo[]`；
- 学生快照：`attendance[]`；旁听/审计成员：`audits[]`；
- 实时状态：教师、助教和学生对象中的 `isOnClass`、`isInClass`、`platformType`；
- 监课辅助：`question.questionNum/unreadNum`、`lessonKey`、`screenshot`、`inRoomLink`。

接口示例同时出现 `isOnClass=1`、`isInClass=0`，说明两者不是同一个状态。按字段命名和两步接口组合，最稳妥的消费语义是：

- `isOnClass`：本课节是否已经产生到课/进入记录；
- `isInClass`：查询时是否仍在教室；

这一语义仍应在已登录真实样本中验证，不能仅凭名字锁定。

### 1.2 `getClassMember`：单课成员实时考勤

一手来源：Apifox 项目 `345136`、接口 `3473563`，名称“获取正式课节内人员出勤情况”。

```http
POST /saasajax/teaching.ajax.php?action=getClassMember
Content-Type: application/x-www-form-urlencoded

classId=<课节 ID>
```

Apifox 将 `classId` 标成非必填，但接口语义无法在缺少课节 ID 时确定目标，Adapter 应把它视为必填并在调用前校验。

成功示例返回 `data[]`。成员对象包含：

| 字段 | 可以支撑的判断 | 边界 |
|---|---|---|
| `studentUid`、`studId`、`identity` | 成员定位与角色区分 | 应只保留当前任务所需标识；身份枚举仍需核验 |
| `isOnClass` | 是否产生到课/进入记录 | 与 `isInClass` 的正式定义待真实样本确认 |
| `isInClass` | 查询时是否仍在教室 | 最适合当前在线快照；需要记录采样时间 |
| `isLate` | 服务端迟到判定 | 直接消费服务端结论，不在 Agent 内自行定义迟到阈值 |
| `isEarly` | 服务端早退判定 | 正在上课时可能尚未形成最终结论 |
| `classTime` | 累计在课时长 | 单位未在接口 schema 中说明；需实测确认是否为秒 |
| `timeList` | 进出教室时段明细 | Apifox 示例只给字符串；序列化格式和时区待核验 |
| `platformType` | 当前/最近终端类型 | 仅用于诊断，不应推断学习效果 |
| `nickname`、`username`、`account` | 展示或人工核对 | 属于个人数据，默认不进入 Agent 长期上下文 |

`getClassInfo` 的 `attendance[]` 只包含较轻的快照字段；迟到、早退、累计时长和进出明细要通过 `getClassMember` 获取。这是两接口之间最关键的职责边界。

### 1.3 鉴权与调用条件

Apifox 的 `auth` 对象为空，没有正式 security scheme。`getClassInfo` 仅以普通 Header 参数示例表达 `Cookie`，`getClassMember` 甚至没有登记该 Header。对两个 action 进行无凭据只读 POST，服务端均返回 HTTP 200 包裹的业务错误 `errno=101 / 未登录`，说明实际鉴权依赖已登录的 PHP/站点会话，而不是“只要知道 URL 就能调用”。

接入时应满足以下边界：

- 通过受支持的 ClassIn/监课登录上下文取得会话，不复制 Apifox 示例 Cookie；
- 业务成功不能只看 HTTP 200，要同时检查 `error_info.errno`；Apifox 成功示例使用 `errno=1`；
- 当前契约没有声明会话刷新、CSRF、租户/机构范围和错误枚举，需在真实 Adapter 前补齐；
- 本接口属于监课/教务视角，不应默认等同于每位教师都拥有的公开 API 权限。

## 2. OceanBase 与数仓链路

### 2.1 当前元数据核验

一手来源：`dw-conn-mcp` 2026-09-16 只读元数据查询。

| 检查项 | 结果 |
|---|---|
| OceanBase 原始数据实例 | 存在；知识库定义为实时、MySQL 兼容业务库镜像 |
| `eo_classroom` 数据库 | 存在 |
| `eo_classroom.eeo_class_member_time` | 当前元数据返回“表不存在” |
| `eo_classroom.eeo_class_member_time_detail` | 当前元数据返回“表不存在” |
| 对全部当前可见原始数据库枚举同名/近似表 | 未找到 `class_member_time` 或 `member_time_detail` |
| `eo_odsdb.ods_ms_eo_classroom_eeo_class_member_time_di` | 存在，字段完整 |
| `eo_odsdb.ods_ms_eo_os_eeo_class_member_time_di` | 存在，字段完整 |
| `eo_odsdb.ods_kafka_eo_os_eeo_class_member_time_f` | 存在，另含 `binlog_change_type/binlog_change_time` |
| `eo_pdviews.ods_ms_eo_os_eeo_class_member_time_di_view` | 存在；最新可见分区为 2026-09-15，即本次核验时为 T-1 |
| 任一 `eeo_class_member_time_detail` ODS/视图 | 未找到 |

这组事实最可能对应以下三种情况之一，但目前无法仅凭元数据判定是哪一种：

1. 表从 `eo_os` 迁到 `eo_classroom` 后又改名、归档或不再暴露给当前实时镜像；
2. 数据平台仍保留历史同步任务和血缘名，但源表已经调整；
3. `eeo_class_member_time_detail` 的明细已经折叠进主表 `time_list`，或只存在于业务服务内部。

需要数据源负责人确认当前生产物理表和 owner，不能将上述任一假设写成事实。

### 2.2 已确认的主表字段

一手来源：数仓知识库 `206-数据仓库-课堂-课节.md`，以及 `dw-conn-mcp` 对 ODS/视图的只读 `DESCRIBE`。

`eeo_class_member_time` 同步模型包含：

- 定位：`school_uid`、`course_id`、`class_id`、`client_class_id`、`member_uid`；
- 角色：`identity`；知识库登记 `1=学生、2=旁听、3=老师、4=助教、193=机构校长、194=校长助理`；
- 考勤状态：`is_on`、`is_late`、`is_early`；
- 时长与明细：`stayin_time`、`time_list`、`add_time`；
- 终端：`platform_type`；
- 展示信息：`member_account`、`member_nickname`。

知识库将 `time_list` 定义为 PHP 序列化的用户行为时间列表，包含 `in`、`out`、`platform_type`、`os_type` 等项。这个字段可以解释多次进出和累计停留，但解析必须封装在 Adapter 内，并以实际序列化版本验证；页面和 Agent 不应直接理解 PHP 序列化字符串。

### 2.3 两种数据源能回答什么

| 问题 | 实时 API | OceanBase 主表（待确认物理名） | T-1 数仓视图 |
|---|---|---|---|
| 当前谁在教室 | `isInClass`，最直接 | 候选 `is_on` 或 `time_list` 最新事件，语义需核验 | 不可用于“当前” |
| 谁已经到过 | `isOnClass` | `is_on`、`stayin_time>0` 或 `time_list`，需以服务端口径为准 | 可做课后/历史对账 |
| 谁迟到 | `isLate` | `is_late` | 可做历史对账 |
| 谁早退 | `isEarly` | `is_early` | 可做课后最终结果 |
| 累计在课时长 | `classTime` | `stayin_time` | 可做课后/历史分析 |
| 多次进出 | `timeList` | `time_list` | 可做课后解释 |
| 应到名单/分母 | 结合 `getClassInfo.attendance/audits`，仍需核验包含范围 | 不能只用有停留记录的主表；需关联课节学生名单 | 适合课后对账，不适合课中触发 |

“未出现成员停留记录”不等于业务上的“缺勤”：还要处理旁听、插班、请假、软删除、临时名单变化和采样时刻。课中产品文案宜使用“尚未进入课堂”，最终“迟到/早退/缺勤”优先消费业务服务已经给出的状态。

## 3. 对实时考勤 Adapter 的建议

建议先实现一个只读 `LiveAttendanceReader`，接口只暴露规范化结果：

```ts
type LiveAttendanceSnapshot = {
  classId: string;
  observedAt: string;
  source: 'classin-monitor-api';
  expectedCount: number | null;
  enteredCount: number;
  currentlyInRoomCount: number;
  lateCount: number;
  earlyLeaveCount: number;
  members: ReadonlyArray<{
    memberRef: string;
    role: 'student' | 'auditor' | 'teacher' | 'assistant' | 'unknown';
    hasEntered: boolean | null;
    currentlyInRoom: boolean | null;
    late: boolean | null;
    earlyLeave: boolean | null;
    durationSeconds: number | null;
  }>;
};
```

实现顺序：

1. 使用 `getClassInfo` 找到授权时间窗内的正式课节并取得 `classId`；
2. 使用 `getClassMember` 取得成员明细；
3. 在 Adapter 内完成字段归一、采样时间、身份投影和个人数据最小化；
4. 用 T-1 数仓视图做课后对账，不把它放进课中实时读取主路径；
5. 在已授权测试课堂中验收 `isOnClass/isInClass`、`classTime` 单位、`timeList` 格式、迟到/早退形成时机，以及断线重连后的状态。

在这些验收完成前，真值标签应是：

- `API_CONTRACT_VERIFIED`：接口和字段已从一手 Apifox 契约确认；
- `AUTHENTICATED_SAMPLE_PENDING`：本轮未读取已登录真实课堂样本；
- `DATABASE_PHYSICAL_TABLE_PENDING`：用户给出的生产物理表名与当前元数据不一致；
- `WAREHOUSE_T1_VERIFIED`：历史对账视图存在且最新分区为 T-1。

## 4. 证据与可复核入口

1. ClassIn 一手接口：`https://dynamic14.eeo.im/saasajax/teaching.ajax.php?action=getClassInfo`。2026-09-16 无凭据 POST 返回业务层“未登录”，未返回任何课堂数据。
2. Apifox 项目 `345136`：
   - `3473499`：`getClassInfo`，获取正式课节监课列表；
   - `3473563`：`getClassMember`，获取正式课节内人员出勤情况；
   - `3498644`：内部 `getClassMemberTimeList` 候选，状态 `developing`，仅登记 `SID/courseId/classId`，没有响应示例，本轮不纳入实时主链路。
3. 数据仓库知识库：`010-全局查询指南.md`、`100-原始数据.md`、`206-数据仓库-课堂-课节.md`。
4. `dw-conn-mcp` 只读元数据：原始数据库枚举、目标表 `DESCRIBE`、ODS/视图 `DESCRIBE`、最新分区聚合。

本轮未调用写接口，未修改业务数据，未保存或输出真实成员身份、账号、Cookie 或数据库连接信息。
