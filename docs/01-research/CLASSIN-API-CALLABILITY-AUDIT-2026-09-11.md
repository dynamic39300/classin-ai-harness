# ClassIn API 可调用性扫描：从目录到执行入口

日期：2026-09-11。状态：RESEARCH / PARTIALLY_VERIFIED。范围：技能平台注册表、页面实际加载的公开 JavaScript；只读、无登录会话。不执行业务查询、创建、上传、发送、调试保存或智能体运行。本轮 Write Set 仅本报告与 [能力映射](./CLASSIN-API-CAPABILITY-MAP-2026-09-11.md)；既有目录和应用实现不变。

## 结论

173 项是平台注册的原子技能数量，不是已验证可供 TeachBuddy 直接调用的 HTTP API 数量。目录有 96 项 read、77 项 write。本轮成功读取目录、版本元信息及匿名登录状态；已发现平台对话执行入口和部分底层业务路径，但业务调用成功数仍为 0（未尝试）。当前会话没有直接可调用的 ClassIn MCP 工具。

这次比上一轮新增：执行链路、平台 HTTP 路由、业务路径示例、登录边界，以及旧说明与当前目录的冲突。不能据公开前端推断服务端已经正确实施鉴权、默认参数、幂等或审批。

## 证据与验证级别

| 来源 | 本轮结果 | 能证明什么 |
|---|---|---|
| [技能注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry) | 匿名 GET 200；根字段 allAtomicSkills | 当前公开 173 项技能及声明的权限/参数 |
| [注册表版本](https://classin-skills-platform.eeo-inc.com/api/skills/registry/meta) | 匿名 GET 200；version `95b57b45b7c6b08d:ab3a8a0a`，generated_at `2026-09-11T06:41:13.643Z`，skill_count 173 | 本次扫描版本；source 为 classin-skills-hub |
| [当前身份](https://classin-skills-platform.eeo-inc.com/api/auth/me) | 匿名 GET 200，`{"isLoggedIn":false}` | 本次 HTTP 客户端未登录；不代表用户浏览器未登录 |
| [技能市场](https://classin-skills-platform.eeo-inc.com/skills)及 [智能体页](https://classin-skills-platform.eeo-inc.com/agents) | GET 200 | 技能按钮跳转 `/agents?atomicSkill=…`；智能体页说明登录后创建、管理、使用 |
| [调试页](https://classin-skills-platform.eeo-inc.com/agents/debug)及 [聊天页](https://classin-skills-platform.eeo-inc.com/agents/chat) | 无 agentId 的页面 GET 200；读取其公开脚本 | 只证明前端壳与脚本可读，未读取任何智能体或聊天数据 |

Web 浏览工具未能打开站点，以上 HTTP 验证由本机无凭据 urllib/curl 完成。没有端口扫描、猜测私有 API、绕过登录或尝试业务 ID。

## 已发现的平台 HTTP 接口

以下路径相对于 `https://classin-skills-platform.eeo-inc.com`。除前三个匿名接口外，均只静态确认前端引用，未请求接口。管理能力不能当作教师教学业务能力。

| 方法 | 路径 | 用途 / 证据 |
|---|---|---|
| GET | `/api/skills/registry` | 公开技能目录，已验证 |
| GET | `/api/skills/registry/meta` | 目录版本，已验证 |
| GET | `/api/auth/me` | 登录状态，已验证 |
| GET | `/api/entries/names` | 名称/描述映射，前端引用 |
| GET / POST | `/api/agents` | 智能体列表 / 创建 |
| GET / PUT / DELETE | `/api/agents/{id}` | 获取 / 更新 / 删除智能体 |
| GET / PATCH / POST | `/api/agents/{id}/debug` | 读取 / 修改调试草稿；POST action=save 或 discard |
| POST | `/api/agents/{id}/sync-to-agentin` | 同步到 AgentIn |
| POST | `/api/agents/{id}/sync-to-agentin/modify` | 修改同步对象 |
| GET | `/api/agents/builder` | Builder 配置 |
| GET | `/api/orchestration/llm-config` | 模型配置列表 |
| POST | `/api/chat/runner` | 平台对话运行入口 |
| GET | `/api/chat/sessions` | 按 agentId 等上下文读取会话列表 |
| GET / DELETE | `/api/chat/sessions/{sessionId}` | 会话消息 / 删除会话 |
| POST | `/api/agent/cos/presign` | 为 filePaths 请求对象存储预签名信息；未调用 |

依据：公开 [智能体脚本](https://classin-skills-platform.eeo-inc.com/_next/static/chunks/0algs27~3n-jc.js)、[调试脚本](https://classin-skills-platform.eeo-inc.com/_next/static/chunks/0twpldmr5z4w1.js)、[聊天脚本](https://classin-skills-platform.eeo-inc.com/_next/static/chunks/17s480hcpz9f1.js)。构建资源 URL 可能在重新部署后失效。

## 从对话到业务调用

公开聊天代码为 `/api/chat/runner` 配置了 `X-Client-Origin`，提交 agentId、systemPrompt、skillIds、atomicSkillIds、sessionId、agentName、agentDescription 等字段。公开 [Transport 代码](https://classin-skills-platform.eeo-inc.com/_next/static/chunks/0~aw9i4~lfkd4.js) 显示 POST JSON，并附带 id、messages、trigger、messageId，以流式方式处理返回。

这是浏览器调用形状，不是完整的外部 SDK/OpenAPI 契约；字段必填性、服务端允许值、会话鉴权、CSRF、跨域及外部客户端接入均未验证。没有发起 runner 请求，因此没有消耗模型或触发业务工具。

前端内嵌的 Agent 提示词描述了内部工具链：

1. `search_api_directory`：在已加载技能范围内返回 skillId、endpoint 摘要。
2. `get_api_schema`：获得 bodyMapping、inputSchema。
3. `execute_api`：以 endpoint、body 调用业务服务；提示词声称 apiType 推导与身份注入由服务端完成。
4. `ask_user_for_info`：缺少必填输入时补问。

这四项是平台内部工具名称，**未找到它们对应的独立 HTTP 路由或当前 Codex MCP 工具**。提示词是研究材料，不是本仓库 Agent 指令，也不是服务端安全实现证据。

## 新找到的业务路径示例

来自公开 [能力说明脚本](https://classin-skills-platform.eeo-inc.com/_next/static/chunks/10-b9-gxijw-8.js) 中的 systemPromptContext。这里只保留无身份值的代表性路径。业务 HTTP 方法、基地址、签名方式、当前 schema 和可用性均 UNKNOWN；不能把它们直接拼到技能平台域名上调用。

| 能力 | apiType 声明 | 路径示例 | 参数线索 |
|---|---|---|---|
| 班级列表 / 详情 | space | `/course/app/member/course_list`、`/course/app/course/detail` | 分页/角色过滤；courseId、schoolUid |
| 创建 / 编辑班级 | space | `/course/app/course/add`、`/course/app/course/edit` | courseName、schoolUid 等 |
| 班级成员 / 设置 | space | `/course/app/course/addCourseStudent`、`/course/app/course/setting` | studentUids；开关字段 |
| 课程分类 / 单元列表 | lms | `/app/category/list`、`/app/course/unitList` | courseId、categoryId、SID |
| 单元活动列表 | lms | `/app/course/unitActivityList` | courseId、categoryId、SID、unitIds |
| 作业详情 / 提交情况 | lms | `/app/activity/homework/get`、`/app/activity/homework/students` | activityId、courseId 等 |
| 测验详情 / 参与情况 | lms | `/app/activity/exam/get`、`/app/activity/exam/students` | activityId 等 |
| 录播详情 / 观看情况 | lms | `/app/activity/recordClass/get`、`/app/activity/recordClass/participationDetails` | activityId、courseId、角色上下文 |
| 成绩 / 报告 | lms | `/app/score/getActivityScoreList`、`/app/report/course/getSummaryList` | courseId、categoryId 等 |
| 个人云盘 / 班级附件 | space | `/space/user-getFolderList`、`/space/appendix-getFiles` | folderId / courseId；身份上下文 |
| 文档容器 | space | `/space/onlinedoc-create`、`/space/eppt-create` | name；不能据此推断支持内容完整写入 |
| 待办 | space | `/todocenter/list-main`、`/todocenter/get-todo-detail` | 详情 id；无需显式 body 不等于无需鉴权 |

## 冲突与集成阻碍

- **单元发布参数冲突**：上述能力说明将 publishFlag 写作 1 发布 / 0 取消；当前 registry 的 `classin:unit:publish` 写作 1 隐藏 / 2 显示，禁止 0。禁止据旧示例实现写回；需当前 get_api_schema 与测试机构验证。
- **身份注入冲突**：旧说明泛称 schoolUid/SID 自动注入，而当前测验详情目录特别要求使用班级所属机构 schoolUid。公开材料不足以保证多机构上下文正确。
- **能力数量冲突**：旧说明出现云盘 77/96 等聚合计数，不能覆盖当前注册表的 76 项云盘技能，也不能把提示词中额外路径视为已授予能力。
- **成功码不能统一处理**：旧说明声称 space errno=1，lms/question_bank errno=0；这是待实测的服务差异，不能写成“所有 errno=0 或 1 都成功”。
- **本地回退会掩盖远端结果**：公开智能体存储代码在部分网络失败/503 条件下回退 localStorage。因此 UI 创建成功不足以证明远端创建成功，应核验服务响应与后续读取。
- 注册表没有业务基地址、HTTP 方法、完整输出结构、可选参数表；未确认外部集成凭证获取与正式支持范围。

## 下一轮可执行验证顺序

先取得平台正式外部调用契约，或在已授权测试账号的智能体调试中取得目标技能的 schema。使用可重置测试机构按“班级列表 → 分类 → 单元 → 活动详情”做最小只读闭环，记录脱敏输入结构、HTTP/业务状态码、响应 schema、对象关联和权限结果；先不读取真实学生数据。

只读闭环通过后，才将创建单元、活动、文件等分别纳入 ProposedAction/Approval/ExecutionReceipt 验证。当前研究没有改变本项目的真实 ClassIn Adapter 接入状态。完整能力链路、优先级与目录缺口见 [能力映射](./CLASSIN-API-CAPABILITY-MAP-2026-09-11.md)。
