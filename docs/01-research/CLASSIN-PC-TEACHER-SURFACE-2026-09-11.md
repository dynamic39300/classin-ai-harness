# ClassIn PC 外部测试页：教师入口与权限边界

- 日期：2026-09-11
- 状态：静态一手代码证据；未验证登录教师会话的服务端授权
- 目标页面：[ClassIn PC 测试页](https://wsevlf001.eeo.im/client/lmsbleach/six/)
- Write Set：仅本文；不修改产品、Adapter、锁定决策，不执行业务读写请求。
- 方法：检查目标部署 HTML 所引用的公开 JavaScript 与 Webpack 懒加载资源。以下是部署产物事实，不代表生产集成许可或完整可调用 API 合同。

## 结论

此页面的部署代码同时包含教师、学生和班主任相关能力。API 出现在公开包内，只能证明页面具备相应客户端调用代码；不能证明当前教师账号有调用权限，也不能证明当前页面已实际执行该请求。需要逐个接口补充教师会话、所属班级、机构开关及服务端成功/拒绝证据，才能确认“我们能调用哪些”。

## 路由与功能面

主路由将 `course/detail/:courseId` 分成 `teacher`、`student`、`studentView` 三个入口。教师与学生分别装载不同页面组件；两者都声明 category、group 和 AI 子树，因此 AI 接口和共享模块不能仅凭打包归属标为教师专属。AI 子路由含 `ai/aiassistant`、`ai/evaluate`、`ai/agent/:agentId`，并包含会话参数 `:sessionId`。[主路由与常量源码](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-3bddc121.f06dd302f53bf18f225c.js)

| 代码中的功能面 | 静态入口 | 教师判定边界 |
| --- | --- | --- |
| 班级课程内容 | `course/detail/:courseId/teacher/category` | 明确教师入口；对象权限仍取决于班级身份 |
| 班级分组/共创入口 | `course/detail/:courseId/teacher/group`、其 `/:nodeId` 子路由 | 同包存在学生对应入口，需按具体操作区分 |
| AI 助教、学情与 Agent 会话 | 教师及学生入口下共同声明 `ai` 子树 | 不可全量标教师专属，也不证明机构已开通 |
| 消息 | `/personalChat` | 全局路由，具体会话权限未知 |
| 待办 | `/todo/*` | 全局路由；常量另有 unhandled、later-handle、todo、handled |
| 课程表、成长 | `/curriculum`、`/growing` | 全局路由，角色投影需进一步动态确认 |
| 云空间 | `/im/cloudSpace/*`、`/hd/cloudSpace/*`、`/room/cloudSpace/*` | 同时承载 IM、HD、课堂嵌入场景 |
| 文件、目录与课堂报告 | `file/im`、`file/room`、`folder/im`、`folder/room`、`report/classroom` | 子窗口/课堂上下文不等于当前教师工作台已可用 |
| 外挂资源应用 | 常量含 teacherin、flowin、exam-pc、camin、nobook、Google、OneDrive、Dropbox | 只能证明入口常量存在；未递归扫描各外部应用 API |

以上入口均来自同一[主路由与常量源码](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-3bddc121.f06dd302f53bf18f225c.js)。

## 角色不能混用

当前产物定义的课程身份枚举为 `outsider=0`、`student=1`、`auditor=2`、`teacher=3`、`teacherAssistant=4`、`manager=192`；其中 manager 的展示名是“班主任”。同一文件还存在另一组 `student="0" / teacher="1" / manager="255"` 映射，以及包含 `administrator="255"` 的其他枚举。因此不能把数值 1、3、192、255 脱离接口上下文解读，也不能把课程 manager 直接称为机构管理员。[角色枚举源码](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-76296ffa.b71d3d2876af2190a3f0.js)

共享角色判断把 `teacher` 与 `manager` 归入教师侧，把 `student`、`auditor`、`outsider` 归入学生侧；主入口导航也使用 manager/teacher 列表分流。这解释了为什么“教师页面中看得到某能力”仍需区分普通任课教师与班主任。[角色判断](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-7bb72fec.3f9121969b2851d36fa4.js)、[导航分流](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-3bddc121.f06dd302f53bf18f225c.js)

## 已发现的权限条件实例

`useCanCreateClassroomActivity` 首先获取机构服务状态。班主任返回该服务状态对应的许可；其他身份还读取课程设置，并要求 `allowTeacherAddClass`。异常返回 `canCreate:false`。这是一条明确的“同样进入教师侧，能否创建课堂仍不同”的代码证据；前端条件本身不能替代服务端鉴权。[创建课堂许可检查](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-2538b009.cc914dd8fc96ff3676d4.js)

创建活动组件又检查 `isTeacher && !isManagerTeacher` 与 `courseSetting.allowTeacherAddClass`，不允许时显示禁止提示。另有设置组件使用 `isManagerTeacher`、`isLeaveClass` 限制可见操作。因此能力清单应至少记录：机构、班级、具体角色、是否离班、机构/课程功能开关、对象状态。[创建活动组件](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/72292.556856140c7677e17968.chunk.js)、[班级设置组件](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/56481.fd57f3271ac6a1effcdb.chunk.js)

## 客户端桥接与扫描覆盖边界

部署既包含 `ClassInMock`，也包含 QWebChannel 和大量客户端方法包装。初始化代码调用 `getClientInfo`、`getUserInfo`、`getSchoolInfo` 后再准备页面上下文。因此普通浏览器打开相同 URL、模拟桥返回成功和原生 ClassIn 教师会话运行，是不同的证据层级。不能用 Mock 返回值证明业务接口已授权或真实调用成功。[Mock 产物](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-ac309808.ea47ceeb2fc8b578e422.js)、[客户端 API 包](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-c63e0376.7324ddcf27d5116585e6.js)、[初始化组件](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/7183.c5bc54fdb397e3cc2765.chunk.js)

本次没有读取登录凭据，没有收集真实教师/学生业务数据，没有调用创建、发布、删除、发送等业务接口。HTTP 字符串提取不覆盖原生 bridge 内部网络、运行时下发地址、外部微应用的所有请求或服务端隐藏接口；“所有接口”只能表述为本次部署可见调用面的静态候选集合。

后续对候选接口进行验证时，应分别保存“代码发现”“教师只读成功”“教师明确拒绝”“写操作仅发现未执行”状态；每次验证限定已授权模拟班级和脱敏结果。此为研究建议，不改变现有模拟 Adapter 边界。
