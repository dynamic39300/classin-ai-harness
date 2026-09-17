# ClassIn PC 测试页接口扫描（教师使用视角）

采集日期：2026-09-11。目标：[用户指定测试页面](https://wsevlf001.eeo.im/client/lmsbleach/six/)。部署版本 `v6.202609091558.six.14`，标题 ClassIn 6.1，HTML 配置 ENV=14。状态：**静态扫描完成；教师会话的服务端授权未验证**。

## 交付与口径

- [可搜索接口清单](./classin-pc-api-scan-2026-09-11/index.html)：按功能域筛选，搜索路径和参数，逐条跳到一手源码。
- [CSV](./classin-pc-api-scan-2026-09-11/interface-index.csv) / [JSON](./classin-pc-api-scan-2026-09-11/interface-index.json)：可继续补充联调结果。
- [教师入口与权限边界](./CLASSIN-PC-TEACHER-SURFACE-2026-09-11.md)、[传输与鉴权分析](./CLASSIN-PC-API-TRANSPORT-2026-09-11.md)。

本轮读取 HTML 引用的 75 个初始 JS，以及 Webpack runtime 列出的 732 个懒加载 JS，共 **807 个脚本**；全部获取成功，AST 解析错误为 0。提取到 426 处调用/配置证据，按“服务前缀原文 + HTTP 方法 + 路径原文”合并为 **350 条静态候选定义**，其中 336 条识别到请求调用，3 条为待补充的 API 路径调用，11 条为 URL 配置。

350 **不是已授权接口数，也不是归一化后的服务端 API 去重数**：不同包装器可能表达同一最终路径，运行时又可能更换主机或 app/web 前缀。本轮没有发出业务请求，因而教师真实成功、明确拒绝均无实测样本。之前的 173 项技能目录是另一平台的注册单元，不能与这里直接相减或推断新增接口数。

本轮 Write Set：本报告、上述两份专题报告、`classin-pc-api-scan-2026-09-11/` 的派生清单与扫描脚本。没有更改产品、Adapter、Spec 或锁定决策；没有读取浏览器凭据或保存业务数据；没有执行公开包中的 Mock 初始化、签名或 token 交换。

## 当前页面能看见哪些能力

以下分类按服务前缀/路径归纳，是教师集成的候选面，并非每项均限教师使用。

| 功能域 | 静态定义数 | 能力举例 |
|---|---:|---|
| Agent 与 AI | 86 | Agent 列表/详情/创建/草稿/发布、班级 Agent、AI 会话/消息、附件、学情报告任务 |
| 云盘与文件 | 70 | 个人/组织盘、文件夹、检索、上传、移动/复制/删除、共享授权、EDOC/EPPT |
| 课程分类、单元与活动 | 50 | 分类与单元、教师/学生活动列表、活动结束/发布/删除、复制到其他班级、TeacherIn 保存 |
| 身份、组织与设置 | 38 | 用户/机构上下文、组织树、教师/学生名单、设置、引导、关联授权 |
| 班级、课堂与课表 | 27 | 班级列表/详情/创建/编辑、成员/权限、结课、课程表、课堂公告 |
| 题库与试卷 | 25 | 试卷创建/读取/编辑/复制、试题批量创建/查询/更新、分类与学科 |
| 基础服务与其他 | 25 | 时间、灰度、签名辅助、上传临时令牌、短链等 |
| 待办 | 14 | 待办列表/详情/红点、状态、批量完成、将来待办 |
| 共创与 Flowin | 11 | 组织/个人内容集合、页面列表、新建/移动/复制/删除节点 |
| 外部云存储 | 3 | 代码可见的 Dropbox/OneDrive 文件列表或检索调用；独立外部授权 |
| 计量与权益 | 1 | 用量信息 |

候选方法统计：336 POST、1 GET、13 UNKNOWN。**HTTP POST 不等于业务写入**；这套封装大量使用 POST 获取列表和详情。参数键仅在调用处为对象字面量时提取，不是完整或必填 schema；未展开不能解读为无需参数。

## 教师最值得先核验的路径

下表把已识别前缀与路径组合为便于阅读的逻辑路径，未填实际服务 host。最终请求地址须遵循真实会话的主机路由与封装。原文前缀、参数键和源码偏移均保留在清单中。

| 教师任务 | 逻辑路径示例 | 本次证据 |
|---|---|---|
| 找到班级和所属机构 | `/course/app/member/course_list`、`/course/app/course/detail` | POST 包装调用 |
| 找课程分类和单元 | `/lms/app/category/list`、`/lms/app/course/unitList` | POST 包装调用 |
| 找单元内活动 | `/lms/app/course/unitActivityList` | POST 包装调用 |
| 读取课堂/作业 | `/lms/app/activity/class/get`、`/lms/app/activity/homework/get` | POST 包装调用 |
| 查教师课程、学生花名册 | `/course/app/user/teacher-courses`、`/coreapi/student/getStudentList` | POST 包装调用 |
| 读取/保存共创上下文 | `/lms/app/content/collection/getCollectionId`、`/lms/app/content/notice/mention/list` | POST 包装调用；仍需逐项确认副作用 |
| 创建分类、发布单元 | `/lms/app/category/create`、`/lms/app/unit/publish` | 仅发现，未执行 |
| 复制活动 | `/lms/app/copy/createActivityFromOtherCourse`、`/lms/app/copy/createActivityToOtherCourses` | 仅发现，未执行 |
| 创建/更新题目与试卷 | `/question-bank-business-service/topic/batchCreate`、`/question-bank-business-service/paper/create` | 仅发现，未执行 |
| 查询组织盘 | `/cloudspace/api/organization/disk/list` | POST 包装调用 |
| 创建内容文档 | `/clouddisk/api/onlinedoc/create`、`/cloudspace/api/eppt/create` | 仅发现；不能由容器创建推断完整内容写入 |
| 查看待办 | `/todocenter/todo/list/index`、`/todocenter/todo/todo-list/detail` | POST 包装调用 |
| AI 会话与学情生成 | `/agent-api/app/session/list`、`/agent-api/app/task/generateStudentReports` | 仅发现；后者为生成任务，未调用 |

上述原文的具体定位见 [接口 JSON](./classin-pc-api-scan-2026-09-11/interface-index.json)，每条带文件、模块 ID、行/列、偏移和一手 URL。主请求封装依据 [main-35f5d893](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-35f5d893.cef4d2a43a71c1a35538.js)，云盘包装依据 [main-6b47fa3c](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-6b47fa3c.10b44cb22c410ffa533c.js)。

## 为什么现在不能说“老师全部可调”

1. **教师和学生共用部署包。** 主路由明确含 teacher、student、studentView，AI 子树两端共用。老师界面使用某模块与接口仅限老师调用是两件事。
2. **任课教师与班主任不同。** 课程身份 manager=192 的展示含义是班主任；创建课堂存在机构服务状态与 `allowTeacherAddClass` 等门控，不能把 teacher、manager、administrator 混为一类。
3. **浏览器有模拟兜底。** 无原生客户端时可能加载 `ClassInMock`，部分未知桥调用直接回模拟成功；此类回调不计入业务验证成功。
4. **API 主机不一定是页面域名。** 当前 HTML 指定 `DYNAMIC=dynamic14.eeo.im`；请求封装还可能采用客户端 hosts、映射域名或运行时覆盖。不能将清单路径统一拼到 wsevlf001.eeo.im。
5. **签名、Cookie、机构和对象权限未实测。** 读取公开 JS 不提供任何业务授权。成功码也分封装：有的检查 `error_info.errno===1`，有的只返回 response.data，不能统一断言。

一手证据与代码位置集中在 [教师入口报告](./CLASSIN-PC-TEACHER-SURFACE-2026-09-11.md) 和 [传输报告](./CLASSIN-PC-API-TRANSPORT-2026-09-11.md)。

## 覆盖边界与仍未解决的问题

- **已覆盖**：此次 HTML 与 runtime 明确列出的全部 JS 资源；不是只扫描首屏已执行请求。
- **不能保证自动提取完备**：提取识别固定路径、部分字符串拼接、已知 Axios 工厂、显式 HTTP 方法及 URL 配置；完全运行时生成的地址、复杂数据流与别名、动态服务下发参数可能漏报。336 条 REQUEST_CALL 也表示静态模式识别，仍需逐条合同审查。
- **外部微应用尚未递归**：页面提供活动详情/创建、TeacherIn、题库、Flowin 等外挂入口，相关产品的独立 bundle 不在这 807 个文件中，不能把当前清单称为整个 ClassIn 的接口全集。
- **原生桥单列**：[客户端包导出清单](./classin-pc-api-scan-2026-09-11/client-package-exports.json) 共 243 个导出符号，含桥包装和辅助函数；它们不是 243 个 HTTP API。原生 IM、客户端窗口与课堂等方法的内部网络不可从这页穷尽。
- **IM 与 Agent 消息需区分**：发现 `/agent-api/.../message/list`、AI 对话路径，不能据此声称找到普通教师群聊的发送与历史协议。
- 本次没有连接用户已有登录浏览器，无法给出“当前教师账号已允许/拒绝”的逐项结论。用户是否已登录的问题已在会话中提出；不以等待时间替代授权或登录状态。

下一步应在老师测试会话内被动记录已访问页面的网络证据，先覆盖班级 → 分类 → 单元 → 活动，只保留脱敏路径、方法、状态码和响应结构；随后按具体功能补角色/对象范围。写操作仍先形成 ProposedAction，经审批与回执验证，不通过遍历所有 POST 验权。

## 复现与检查

[资源清单](./classin-pc-api-scan-2026-09-11/resource-manifest.json) 保存 807 个 URL、字节数、SHA-256；不提交完整上游 bundle，避免携带其中的预置测试配置。[extract.cjs](./classin-pc-api-scan-2026-09-11/extract.cjs) 只解析本地 JS AST，不执行站点代码；依赖本仓库 Babel parser/traverse。手工复核的跨模块前缀另保存在 [manual-transport-map.json](./classin-pc-api-scan-2026-09-11/manual-transport-map.json)。

在仓库根运行 `node docs/01-research/classin-pc-api-scan-2026-09-11/extract.cjs <已下载JS目录> <输出目录>`；JS 目录需包含上述 manual-transport-map.json。`render.py` 从提取 JSON 生成 CSV、JSON 索引和可搜索 HTML。当前扫描缓存位于 `/tmp/classin-pc-api-scan`，属于可清理临时资料，未来部署可能不再提供同一哈希资源。

验收结果：807 个资源引用与 SHA-256 清单齐全；350 个候选 ID 唯一、源码引用可定位、全部保留未验权/未执行业务标记；报告示例路径与索引核对通过。可搜索 HTML 在本机 Chrome 验证 350 行加载、路径检索、70 行云盘筛选，以及 390px 页面无整体横向溢出。默认 Playwright 内置浏览器缺失，改用已安装 Chrome 完成检查。以上浏览器检查只打开本地生成的报告，不加载测试站点或执行其代码。应用未修改，未运行应用构建/业务测试。
