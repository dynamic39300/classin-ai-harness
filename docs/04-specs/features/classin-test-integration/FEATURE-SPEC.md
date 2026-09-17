---
title: 测试连接、业务现场与 Copilot
date: 2026-09-14
status: IMPLEMENTATION_AUTHORIZED
parent: PRD.md
---

# Feature Spec

## 0. D-156 当前实施合同（替代 §5/§6 对本阶段的限制）

- 组合根在教师消息面加载授权 Scene，以真实 teacher/tenant/class/course 创建仅教师可见的测试 Thread，使用既有 MessageWorkspace/WorkBuddyImSidecar。旧 Demo 线程、导航、群功能与附件交互不变。已存在消息不能因异步连接或刷新被覆盖。
- MessageWorkspace 通过可选附加会话与 Lifecycle Port 接入；新增会话生命周期与默认 Demo 分开。真实测试 Thread 的发送固定为 SIMULATED/sent，不设 delivered/read/count；通过教师显式发送或 Copilot 审阅确认生成稳定幂等键。按 actor/tenant/thread 保存本浏览器会话历史；写入失败不得报告成功。学生角色访问拒绝。
- 服务解析按当前 Thread 选择。真实班级使用已核验 BFF Context/Catalog/Dynamics 与原 HTTP Runtime；不会把物理场景 Context 注入数学班。Copilot 生成与发送继续使用原状态/审阅/版本复验/回执；刷新不重建 AI Session。
- 模拟补齐作为独立固定来源：实时出勤、测验练习/批阅、课堂分析/媒体内容示例、个性化回顾和改期预演。每项入口/上下文标注模拟，保留真实课题/日期来源，虚构学生用模拟别名。没有证据不能生成“已真实完成/已实际送达”回执。普通查询默认真实；模拟仅由明确模拟卡片或请求触发，不能将真实 API 错误偷偷替换为成功。
- 保留 `/teacher/classin-test` 核验页（旧只读合同仍有效），提供进入同一测试 Thread 的入口；消息页也提供真实数据核验/刷新入口，沿用既有视觉 Token，不建立新 Shell。
- 验收：原物理 URL 布局/功能；测试 Thread 真实读取与主题；四阶段模拟补齐卡片及来源隔离；教师普通发送与 Copilot 确认发送、取消/重复/刷新、学生不可见、断连重试；实际浏览器截图与回归。模型失败保持真实失败，不用预制答案冒充模型结果。

## 1. Interface 与所有权

ClassIn 拥有身份、班级、课程分类、单元、活动、学生结果和正式消息。服务端 `ClassInTestService` 为 Deep Module：隐藏凭据、签名、分页、字段映射、归属校验及供应商错误码。浏览器通过同源 `/api/classin-test/*` 读取标准化快照，禁止任意上游 URL/路径/UID 转发。

`ClassInScene` 合同包含 environment、teacher、schoolRef、class、course、units、activities、capturedAt、version、complete 和 capabilities。活动保留 activityId、bizId、unitId、categoryId 以及类型、发布状态、开始/截止（ISO8601），不按名称联表。学习详情按 activityId 获取，先验证该活动属于本次现场及目标课程。

`BusinessContextAdapter` 与 `TeachingDynamicsAdapter` 从相同 Scene 映射，复用已有 `ImSidecarAgentSurface`；source.kind=classin-api，truthLabel=read-only-business-data。环境、教师、班级进入独立会话标识，不读取 Demo Thread 的历史或草稿。

## 2. 配置和访问

本轮为本机单教师连接，不是多租户 SSO。启动显式 `CLASSIN_TEST_ENABLED=1`；服务端读取 `~/.classin.token` 的已授权 UID 条目，文件内容不进入浏览器、日志或版本库。固定测试主机 `https://dynamic14.eeo.im`，拒绝重定向。班级与课程限定现有授权目标；首次与每次现场读取都以教师班级列表验证成员身份。

BFF 只接受 loopback 连接和 loopback Host，Origin 存在时必须与请求 Origin 一致，禁止第三方站点 CORS；响应 no-store。拒绝浏览器提供身份覆盖和未知活动。配置关闭返回明确 disabled，不回退 Demo。网络错误不输出包含签名/上游正文的原始异常。

## 3. 取数与完整性

只接入已读取 Apifox 文档并实测的路径。班级分页以 total 与去重结果核对，限制最大页数。活动 offset/limit 实测未表现为常规分页，第一版只接受 pageTotal≤1 且与每个单元 activityCount 精确相符的结果；多页明确 incomplete，取得分页合同后再扩展。缺页、重复冲突、字段不合法返回 incomplete/schema_error，不能当空列表。列表正常返回空才能呈现空态。

时间来自服务端 Date.now，秒级 Unix 转为 ISO，展示采用 Asia/Shanghai。全零或缺失时间使用 null，不制造 1970 年日期。详情与名单按需拉取；列表路径并发去重，详情并发上限 4，请求超时 12 秒、整体现场 45 秒内结束。只读失败不无限重试，手动刷新恢复；数据版本依据内容，不以每次 capturedAt 制造版本冲突。

错误显式区分 disabled、unauthorized、forbidden、timeout、upstream_error、incomplete、schema_error、unsupported。界面保留已读内容时标明过期；生成前重新捕获，失败就保留输入且停止生成，不能消费旧快照冒充当前数据。

## 4. 业务规则

只为已发布、未取消且开始时刻在 now 到 now+24h 的课堂提供课前提醒动作；超过窗口仅显示下一课安排，无候选明确暂无即将开课。同一时刻多候选逐项显示、动作绑定 activityId。课堂在排定区间只陈述排课状态，实时到课未知。

作业/测验提醒绑定已发布活动的起止时间；未交、待批、已批由详情状态和活动分配名单定义。缺少名单时可以显示任务，但不生成未交学生名单。数据未生成、无权、无成绩与 0 分分别表达。

录播、资料、报告展示可用性，只有实际资源就绪时允许读取对应内容。原始 HTML 仅作为文本抽取，避免直接渲染执行。详细题目按问题分项注入，单 Context value 不超过 Envelope 上限；列表总览只保留名称、时间、类型和汇总。附件私有链接/票据不进入模型。

## 5. 生成与交付

测试连接页面使用专属 target 与服务端确认的 actor/tenant。查询使用实际事实；草稿注明绝对日期与实际分配范围。不存在普通 IM 历史时 recentMessages 为空并说明未接入，而不是使用演示历史。

普通 IM 的正式合同未取得前，发送动作显式不可用；所有执行尝试返回 unsupported/permission_denied 解释，不调用 Mock appendMessage。课内聊天与推送网关不替代普通 IM。教师仍可编辑、取消、复制草稿。

取得 IM 合同后才能实施发送：服务端生成稳定 ProposedAction，保存 artifact/version、context 依赖和审批；执行重新校验对象、时间、名单与群权限；逻辑请求持久化到本机受限运行目录。同请求重试不生成新键；响应丢失进入 outcome_unknown 先核实，绝不盲目重发。Receipt 区分接受、发送、送达、已读；学生端核验不能由服务端成功替代。这部分依赖票未通过时 INT-3 保持未完成。

## 6. 路由与状态

增加 `/teacher/classin-test` 入口，显示“ClassIn 测试环境”及最新读取时间；复用当前 Token、侧栏和 AI 消息助手，不修改 Demo 固定场景。入口先身份/范围加载，再现场就绪；提供手动刷新，错误可重试。课程单元列表列出活动种类、名称、开始及截止，点击查看真实详情；跳转不进入 Mock 编辑页。

桌面 1440×900 和窄视口确保列表、详情与 Composer 独立可滚动、按钮可达。原 Demo 教师/学生路由与独立 TeachBuddy 保持现有入口。

## 7. 验证合同

契约测试覆盖秒/毫秒、缺失字段、分页、空结果、取消、边界时钟、不同活动归属、跨课程/身份拒绝、凭据不泄漏；集成测试注入 transport 验证错误恢复且无写接口。真实 API 重测证据保存到忽略的私有目录，公开报告仅留字段、数量、错误码和耗时。

浏览器验证真实读取现场、主题日期、无 Mock 内容、刷新与 API 失败、生成输入/草稿状态；模型可用性单独记实测结果。INT-3 不满足时不能写“全链路通过”。[Tickets](./TICKETS.md)和[回归清单](./REGRESSION.md)记录每一项实际证据。

## 8. 2026-09-15 已实测合同扩展（先于扩展实现）

- 测验经纸卷结构中的 topicId/topicSource 读取 `question-bank-business-service/topic/batchGet`（Apifox 345268/3487332），只允许来源于授权活动的题目引用。当前已实测 10 题；逐题校验返回 ID 与题量，正文、选项、标准答案、解析独立表达。图片题保留“包含图片，文字上下文不完整”；不从资源路径猜题。群消息 Context 只包含任务要求与汇总，正确答案/解析只在教师私有查询中提供。
- 课堂报告 `/api/classin.api.php?action=getReportUrl` 使用当前教师 UID、SID、classId 与 identify=3 换取不透明 key，随后读 `/classroom/web/class/report/overallView`。前者原生客户端日志和本次实测覆盖；Apifox 的同名 cookie 路径返回未登录，记录为文档差异，不混称同一接口。只在服务端解析 URL 中 key，不重定向、不请求任意返回 URL。
- 教师笔记只读取当前授权教师 `memberUid`，由 `/api/classin.api.php?action=getClassNotes` 获取；按 totalNum 核对取全，其他学生私人笔记不在本批。
- ClassroomResult 允许各部分独立 available/unavailable；报告未生成不能使已读取课表变成失败。报告输出实际出勤、时长、笔记、高光/板书计数；不将未来课堂标为已授课。
- AI 授课分析有独立生成状态。实测其分数和学生互动描述与其他接口冲突，先展示可用性与证据差异，暂不把 AI 学生描述注入学习事实。AI生成内容不覆盖出勤、提交、得分等 ClassIn 事件。
- 新增独立 Playwright 配置复用 V2 4174 UI，避免回归启动第二个 Harness 占用 3080；窄视口只对测试连接页解除原 PC body 最小宽度。
- 实测 Runtime 对完整消息（含 Context）限制 12,000 字符。业务 Context 采用单个可追溯聚合来源，按请求选择当前任务/近期课堂/目标单元；全课程总数与目录始终保留。超过 7,800 字符的 Context 明确要求缩小到具体活动/题号，避免发送后才报通用字数错误；不能通过静默截断形成虚假的全量上下文。

### 作业提交内容（CI-008c，先验证合同再实现）

PRD R3/R5 延伸：Apifox345129/3499108 的表单字段 activityId/studentUid/courseId，经 `/lms/app/activity/homework/student/detail` 实测成功。提交记录的 student_uid、homework_id、course_id、school_uid 必须与已验证名单、活动 bizId、班级、机构逐项一致。仅对已提交且非草稿学生读取内容；未提交/草稿不展示未正式提交内容。并发不超过4。

教师详情展示已提交文字、教师批阅正文/评语、按类型统计的附件数量；不返回 share_key、资源票据或原始URL，不解释未定义的 correct/wrong 字段为正确率，不把 add_time 当作提交时间（未提交记录也有该字段）。单个提交读取失败显示未取得，不抹去活动及其他学生数据；对象归属错误整项拒绝。

仅在教师私有查询明确涉及作答/提交内容/批阅反馈时，将已提交内容按 student-personal 注入 Context。群消息草稿不包含个人答题正文及教师评语。图片附件只表示存在，未解读原图时明确内容未知，不能当逐题答案已读。

### 回归发现的 PNG 清理延迟（CI-010a）

属于 PRD R6 的可恢复性和当前图片基座回归。真实 PNG 已在约1秒产生，但渲染函数等待 browser.close 结束；日志出现退出耗时约14秒，全量测试曾超30秒。固定等待完整浏览器退出导致请求可用性依赖进程清理时长。

渲染使用仅绑定 loopback、由本次调用创建的 BrowserServer 管理专属子进程；先请求正常关闭，2秒未退出则仅终止该 BrowserServer 的子进程并等待清理。不得按进程名结束用户 Chrome。保留无外网、JavaScript禁用、公式溢出检查、PNG尺寸及现有两请求并发边界。不得通过增加测试超时掩盖等待。

本机回归调度：Vitest默认限制4个worker，避免与V2、Harness及浏览器争抢CPU；构建、单元集成测试、Playwright按顺序运行。保留原测试时限和断言。该限制不改变产品接口并发或模型预算。

### 研究与造题工具的静态检查（CI-010b）

PRD R6及工程完成定义要求仓库检查可执行。现有extract.cjs以CommonJS运行，ESLint按.cjs识别Node/commonjs环境并允许其require语法，其他规则继续启用；删除未用局部变量。两份渲染脚本改用绑定元素的浏览器求值，模板全角空格写成等价Unicode转义。不得执行上传、改造数据或改动题目内容；仅修复静态检查，不全局禁用检查。

## 9. 教学附件实际读取（CI-008d）

PRD R3/R5：读取当前授权活动实际引用的资料/图片/录播，不用本地生成源文件替代API资源。经Apifox345129/3486110、3495858及当前原生客户端日志核对，LMS关系查询返回fileId、isDel、moderationState、transitionState，下载查询返回相对src；原生下载基址为固定 https://wsevlf001.eeo.im/。本次PDF/PNG/MP4完整下载200、无重定向，PDF SHA-256与原生成清单一致（研究报告另存）。COS域名拼接404，不作为读取方式。

新增 ClassInReadPort.resource(activityId, resourceId)：先重读教师范围与活动详情，只接受该活动image/video/docs里的lmsFileId，再核对getFiles返回关系ID、云盘fileId、删除与审核状态；需要活动下载开关的作业/资料仅isDownload=1可读取。之后用fileId读getDownInfo，并要求其路径与getFiles.filePath一致。只允许upload/files/file01下安全相对路径和固定主机，拒绝重定向、外部URL、路径穿越及未知类型。返回PNG/JPEG/PDF/MP4字节，不给浏览器或模型上游地址/票据。

同源GET /api/classin-test/resource仅接受activityId/resourceId。单文件20MiB上限，15秒网络时限；校验实际文件magic，不能信任application/octet-stream。支持单段HTTP Range与正确206/416；no-store、nosniff、受限Content-Disposition。浏览器以此预览图片/播放视频/打开PDF，资源失败明确可重试，不显示转换成功或播放成功的假状态。范围切换重新校验权限，不用旧URL绕过当前活动归属。

学习资料PDF使用服务端PDF.js读取实际下载字节中的文字层（官方Node示例）；最多25页/60,000字符，超过或缺少文字层明确不可用，不静默截断或用生成源文补齐。PDF完整文字可以在教师详情查看，并按需进入Context；Context总预算仍7,800字符，过长请指定活动或问题。图片/OCR和视频转写不在本子票，附件可读不等于AI已理解全部内容。标准答案与私人作答沿用既有用途过滤。

实现固定依赖 `pdfjs-dist@6.3.289`，Node最低22.13.0，当前验证24.19.0；按[PDF.js官方Node示例](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs)使用getDocument/getTextContent，完成后销毁文档任务。只抽取文字，不执行PDF内脚本。上游Range尚未全面验证；当前同源Range在受限完整文件读取后切片，可能重复下载，20MiB范围外明确不可用。

## 10. 模型主动读取（CI-009a）

PRD R3/R5/R6：模型可按教师问题主动选择讲次/活动查询当前测试课程。RuntimeScope新增classin-test，与ideal-full Demo会话及本地产物分区分开；不迁移旧Demo会话获取新权限。创建及每轮发送先通过ClassInTestService重验教师课程现场。发送必须携带当前现场actor/tenant/thread和合法use的Context Envelope；服务器保存本轮businessRead授权，包含commandId、use与10分钟截止时间。模型输入、工具参数和资料文字均不能修改这些授权字段。

Harness新增read_classin_context(query, activityIds?)只读工具。参数仅自然语言查询（1–1000字符）及至多4个数字活动ID；会话ID来自exec.agent.session.id，不来自模型参数。工具读取同项目受限运行目录内的当前会话记录，要求scope=classin-test、运行中、未请求取消、本轮命令已登记且非拒绝/取消、授权未过期。工具经固定loopback4174的既有context Interface查询；不接受URL、UID、路径、use覆盖。请求50秒内结束、禁止重定向；返回的Context≤7800字符且use/教师/机构/班级须与授权匹配。请求返回后再查本轮授权，取消或换轮则丢弃结果。工具只提供证据，不发布、不制造学习事件。

按当前query/focus读取逻辑选择活动。结果给出来源/读取时间/完整性限制；过宽或缺失明确要求细化，不把工具错误当空结果。message-draft沿用投影过滤，不能由工具参数升级为private-assistance。普通Demo/独立会话即使提示模型调用此工具仍拒绝。Persona允许使用明确提供的真实测试证据和已授权工具结果，不能笼统否认所有ClassIn数据，也不能宣称取得工具未返回的数据。普通IM发送继续不可用。

验证：工具注册、非法参数、普通/停止/过期/取消/换轮会话、用途过滤、固定地址、服务错误、超大/错误归属返回；Runtime创建/发送授权；真实模型至少一次自主工具调用、工具结果和最终答案与测试API对应。新增scope导致历史测试入口对话不自动承继，新建会话有明确隔离。

实现补充：读取授权会话记录上限4MiB，O_NOFOLLOW拒绝符号链接；工具HTTP响应流上限40,000字节，最终Context仍≤7,800字符。Runtime错误保留测试鉴权401、归属403和读取不可用503语义。原试卷题序随过滤结果返回。当前固定4174为本机测试BFF入口；改端口需要同步验证配置，不能任意传入远程地址。

## 11. 测验逐题作答（CI-008e）

PRD R3/R5/R6。依据[教师角色研究与实测](../../../01-research/CLASSIN-EXAM-ANSWER-ROLE-CONTRACT-2026-09-15.md)，固定教师 pageRole=1；先重读 scope、活动详情、分配名单及当前试卷题目，再调用 `/api/exam.api.php?action=getAnswerMarkResult`。examId 必须是详情与活动列表一致的 bizId，studentIds 必须显式传数值 JSON 数组，只包含当前班级学生与该测验分配名单的交集；空交集不调用。不得由浏览器传 UID/pageRole/examId。

返回 examId、学生集合、每人题目集合、题源及题型必须与本次请求逐项一致；越界拒绝整次读取，缺失/重复/结构变化保留试卷详情但逐题结果显示不可用。学生作答不是参考答案。isAnswer=2 显示未参与，0 显示未作答，1 才允许显示答题文字；预建 studentExamId、空答题槽和 score=0 不能证明提交或实际零分。未参与/未作答不显示得分和批阅结论。已作答且所有 judgeResult 均为1/2/3才允许展示 score/100；待批阅仍无成绩。LMS汇总成绩也仅在stStatus=6已批阅且明确评分时显示，未参与的showGrade占位不显示。未知枚举、题型6综合题及未验证的对象答案结构局部不可用，不拼接猜测。

逐题答案只输出经过纯文本处理的字符串/字符串数组。包含图片、链接或对象资源的答案说明媒体尚未解读，原始URL、签名、批阅图片与票据不出服务端；不计算正确率。当前真实样本仅三人均未参与，已作答/非零成绩的契约测试不能当作真实生命周期通过。

教师详情在每个学生下折叠展示逐题状态、可读答案与有依据的得分。私有查询涉及作答/批阅时才注入个人逐题结果，指定第N题时保留原题序并仅加入对应结果；群消息草稿完全排除个人答卷。上游故障不能被理解为无人参与，保留明确不可用状态。Write Set与验证见CI-008e。

## 12. 单学生提交变化验收（CI-008f）

PRD R3/R5/R6、已批准升级计划§6.7。只在用户已提供的三个自有测试学生账号内，选择首讲已发布作业的一名当前未提交学生，产生一次真实测试提交；保留另一名未提交学生和已审阅的原样本，禁止批量代交、覆写旧样本、伪造批阅或改动课堂时间。作答明确为测试模拟内容，答案须对应当前API题目，不将其描述为学生自然学习表现。

此为受限的一次验收脚本，不进入教师BFF/模型工具。先记录ProposedAction（活动/学生/原状态/提交正文及内容hash）、用户对升级计划的既有授权、范围策略与领域校验；提交前重读作业时间、分配名单、本人提交状态，任一变化停止。仅允许当前授权测试网关。按Apifox345326/3494998核对临时登录票据接口及共同签名字段；本次表单请求返回10000004而没有票据；核对本任务历史执行记录后，JSON签名请求成功并经学生端确认身份，使用该已实测编码且单独记录文档差异。票据只在内存，返回账号必须匹配已授权的测试账号，再由学生端userCheck和detail验证身份/任务。缺少合法学生身份时不冒用教师Authorization。

学生提交使用Apifox345129/3490902的web接口。限定一份文本答案；image/video/audio/docs为空数组，不伪造媒体和批改字段。每个动作有固定id、完整正文hash和本机受限执行记录；发送前持久化attempted，响应丢失或失败不自动重发，只用学生详情和教师接口核查。执行回执保留实际业务码、提交记录引用与前后集合，不记录票据、手机号、密码。真实BFF与AI私有查询须由“1已交/2未交”变为“2已交/1未交”，使用各接口的实际状态，不能靠本地改数。新提交只发生在本票允许对象上。

完成条件：文档、鉴权/权限/当前状态核对 → 单次提交回执 → 学生端/教师端同一记录回读 → V2页面与AI读取新集合；每层单独记录，不把接口成功直接等同UI/模型已更新。学生写入留在测试环境，不提供自动删除或撤回；如失败，明确实际状态与所需恢复方式。

CI-008f恢复合同：第一请求使用raw票据，提交返回通用错误104，原因尚待当前请求合同核对，原始attempt保留；教师version不变、学生端status=0且正文/附件为空均已回读。当前Apifox确认三个计数字段，旧PC一手前端说明空附件标记数为0，本任务既有web成功请求使用Bearer及三个0值。web具体必填差异仍UNKNOWN，不宣称根因已定位；允许操作者据这份实际成功格式显式发起同一action/hash的第2次请求（Bearer、correct/wrong/admire为0），作为有边界的连通性验证。零标记不等于实际得分或已批阅；必须有rejected-no-submission-readback-verified回执、提交前再次核对双端状态，且新attempt仍O_EXCL。这不允许未知结果重发，也不覆盖原attempt；只产生一次被接受的业务提交。任何新错误继续停止，不循环尝试。

## 13. 真实课前窗口验收（CI-005a）

PRD R2/R3/R6与升级计划§6.1授权准备专用短课。当前原有课表24小时内没有未来课；仅新增一项标为“联调短课”的有理数复习活动，安排2026-09-15 19:30–19:45（Asia/Shanghai），绑定原第1讲单元和三名已授权测试学生。原14讲及其他活动的ID、时间、分配和内容不变。短课保留供上午回归查看，不承诺实际开课或生成出勤/回放。

创建前按Apifox345129/3471037核对表单字段；categoryName/unitName必须由新鲜scope读取、唯一匹配到原categoryId/unitId（当前接口按名称定位，不假设传ID可绑定）。教师、学生集合、时间窗口和无冲突须再次校验。先保存ProposedAction、已批准计划授权、完整payload hash与旧场景；单次create前O_EXCL持久化attempt，响应丢失不重复创建，按唯一标识和回读核实。明确publishFlag=2、不评分、isAllStudent=0并显式指定当前三学生；录课参数不构成回放已生成证据。

create返回categoryId/unitId/activityId/classId后逐项比对；若异步尚未就绪，只读重试同一对象，不重发create。最终scene应仅增加这一活动，原对象逐字段相等；活动详情、名单、开始/结束及已发布状态均验证。真实服务时钟下课前事项必须指向该活动；实际模型由该快捷入口生成时间/课题/对象正确的草稿，编辑/取消可用，普通IM仍禁用且无发送。新增课堂数、活动数和验收链接写回清单。


### CI-005b：日期与星期证据一致

PRD R3/R6。CI-005a真实模型首稿将2026-09-15错误写成周三；API日期/时段与北京时间读取正确，当前Context未提供星期。为日期增加服务器根据Asia/Shanghai计算的星期证据，并明确提醒中星期只能复用同一日期证据。保留原dateLabel显示格式，不把模型首稿错误误报为接口排课错误。此修复减少模型自行推算，不保证所有生成零错误，教师审阅仍保留。验收覆盖UTC跨日的北京时间星期，以及同一真实课前快捷入口重新生成的日期/星期/时间。


## 14. 课堂专用回放结果（CI-008g）

PRD R3/R5/R6、C16。公开直播回放地址与教师私有课堂录制不是同一合同；此前首讲已生成回放的研究与V2仅查看webLiveReplayUrl存在覆盖缺口。先重核Apifox345136/3489304与当前授权首讲/未开始短课回读，再接入专用getLessonRecordInfo。只通过已验证当前课堂bizId查询，校验响应lessonId及teacherUid；teacherId不当作UID。返回URL/lessonCode/播放凭据不离开服务端。

ClassInActivityDetail增加独立replay结果，区分已返回录制文件、没有返回录制文件、本次查询失败/无法核实。文件状态依据新鲜合同解释；未知状态显示未知，不当作转换中或已生成；时长与录制起止来自各自字段，不能拿排课时长替代，文件Duration与起止差值可能不完全相等。showClassVideo、avoidRecordReplay、avoidRecordVideoRecorded及playbackDetail不静默推导为所有学生可播放。元数据已读取不能代表V2视频播放已接通或学生可见。

教师详情与私有/班级Context提供录制范围、时长和可用性限制，沿用真实时间与固定Asia/Shanghai。课堂未开始不声称已录制；空列表仅说明当前接口未返回文件，不能断言关闭录课。回放子接口失败局部可用，保留课堂与其他报告；归属错误拒绝该详情。Write Set与字段补充由CI-008g在实测后记录。

CI-008g实测合同：POST表单SID/clientCourseId/clientClassId/memberUid，使用当前教师签名；errno=1。首讲lessonData对象含fileList，未来短课lessonData=[]，两者均canPlay=1/canShow=0。因此不以这些标志或lessonStatus推导录制/播放事实。文件Status完整枚举未提供，本票保留状态码、不映射未知码为转码中；首讲Status='2'且Message='Operation succeeded'仅作为已观察到的成功文件证据。Duration与Start/End/CreateTimestamp为本次已验证秒单位。返回0文件不声称永久无回放；状态files_returned仅代表接口已返回元数据。最多100文件、唯一FileId；仅返回序号、秒数与时间、状态码，不返回Playset、FileId、名称或地址。文件ID只服务端用于去重。已验证归属之前不展示任何回放字段；失败明确unavailable而非empty。

回放起止和生成时间按秒精度进入UI与Context，dateLabel仅为回放显式开启秒显示，其他页面时间格式不变。补充文档释义：canShow控制播放次数文案，不表示视频是否可见；canPlay是当前请求成员的播放权限信号，不能证明文件存在或学生权限。Duration单位来自当前测试文件与既有实测交叉核对，文档未正式注明秒；本切片保留该已验证环境限制。

CI-008g实际模型复测发现把教师笔记当未录时段讲解内容、把排课开始当实际授课开始。修正Context相关性：教师笔记正文仅在私有问题明确涉及笔记/课堂内容/知识点/总结/回顾等时提供，普通回放时长查询只带报告与录制证据；UI仍完整显示本人笔记。回放证据必须说明未提供实际开讲时刻或内容时间轴，不能从笔记推断未录段的具体内容。验证相关与无关问题的笔记注入差异，以及真实模型不再补造未录段教学环节。


## 15. 课堂回放流式播放（CI-008h）

PRD R5/R6、C16。专用接口当前返回playback.eeo.im的HTTPS MP4，文件163168524字节；HEAD与两个32字节Range已验证总大小、206/Content-Range、ftyp与稳定ETag。本票将实际媒体接入V2，不能将元数据读取冒充播放完成。

服务端先重读当前教师课程、活动详情并逐项核对归属及课堂bizId，再读本人回放接口；要求canPlay=1、showClassVideo=1、avoidRecordReplay=0/avoidRecordVideoRecorded=0。仅当前接口返回的唯一Definition=0播放版本、无query/fragment/userinfo的固定HTTPS playback.eeo.im安全MP4路径可用，256MiB以内；其他保持可读元数据但不提供可播放引用。浏览器只持有对FileId/当前URL/Size生成的SHA-256引用，不获得上游地址或票据；同一引用若源文件或权限变化则拒绝，不能按数组索引播放另一文件。

同源GET replay-resource只接受activityId/replayRef，服务端专用Interface采用Node流，Domain合同不依赖DOM或Node流。支持完整200与单Range206、合法suffix/open range；无法满足返回416/bytes */size。先通过32字节ftyp读取核验MP4、Content-Range/总量/Content-Length/identity编码及强ETag，再以If-Match读取请求区间；源不支持精确区间、大小/版本改变、重定向、权限拒绝均失败关闭。零转发教师签名/Cookie给CDN。

响应开始前完成归属与HTTP合同检查；流中逐块核对总字节，不缓冲完整文件，用Node pipeline处理背压。请求取消/客户端断开应Abort底层fetch；取响应头和单次等待读块设15秒期限，等浏览器消费不算上游超时。响应开始后失败中止连接，不追加JSON。播放器仅用户点击后设置同源src；加载/失败/重试/卸载中止可见。实际Chrome解码、开始播放及seek通过才算播放验收，不声称已全程观看或生成转写。

## 16. 学生正式提交答题图片（CI-008i）

PRD R3/R5/R6、C14/C16/C17。先核对Apifox345129的3499108、3486110、3495858、3471031，并只读实测已有首讲答卷。image为JSON数组字符串；每项fileId/fileName/filePermission/fileSize/lmsFileId/uuid，区别于教师题干附件。当前答卷为JPEG且filePermission=0，作业isDownload=1；文档未说明关闭下载时教师读取答卷的规则，本票限定isDownload=1，不外推更多权限。

ClassInSubmission增加可选images列表，返回通用展示名和绑定activity/homework/student/lmsFileId/fileId/fileSize原值的SHA-256引用；不返回uuid、云盘ID、原文件名或地址。只为已核实数字ID、filePermission=0且png/jpg/jpeg的附件提供引用；其余仍显示附件数量与未支持提示，不编造图像内容。fileSize单位与舍入未定义：本次提交112、文件关系111、真实114216字节，不用这些原值作为精确字节数或20MiB阈值判断。教师提交正文、图片引用和标准答案不进入班级消息草稿；图片在教师主动展开并点击后请求，不自动发送给模型或执行OCR。

新增ClassInReadPort.submissionResource(activityId,studentId,imageRef)。每次请求重读教师课程范围与当前成员、活动详情和完整分配名单，要求已发布作业、活动归属及bizId一致、当前班级学生且被分配、已提交/已批阅而非草稿、isDownload=1；重读student/detail，四归属及is_del/is_draft/status必须一致。旧图片被移除、换学生、换活动、改为草稿或权限变化即拒绝。原提交正文的读取也仅限当前班级学生与分配名单交集，未知成员不读取个人答卷。

再按精确答卷图片引用取lmsFileId/fileId，用已验证getFiles(activityId,lmsFileIds)和getDownInfo(fileId)复核文件关系/删除/审核/版本与安全路径；不要求studentUid参与文件查询，不能由此跳过前述学生归属授权。复用20MiB实际字节限制、固定wsevlf001.eeo.im、禁止重定向和真实magic校验的媒体读取Module；只允许实际PNG/JPEG，不将未注明单位的fileSize与下载字节数强等值比较。

同源GET submission-resource只接受activityId/studentId/imageRef；沿用本机同源策略、no-store/nosniff，响应仅图片字节。教师详情在对应学生的“查看已提交内容”内显示图片加载、关闭、失败和重试；旧版缺少图片引用时继续显示计数。AI上下文明确只读了文字及附件清单，不能因UI成功显示图片而声称识别了图中答案或正确率。

本次名单同时返回stuHomeworkId，与提交详情stu_homework_id实测一致。图片版本引用还须绑定该提交记录ID；媒体请求要求名单与详情记录ID一致，避免仅按homework/student组合混用重建提交。该字段不进入浏览器。

答图引用与getFiles关系本次都为filePermission=0；本票要求两处均保持该已验证值，其他值或缺失明确拒绝，不推断其完整权限枚举。共享资源读取Module允许调用方附加这一精确状态条件，普通题干附件维持既有合同。

验收：实测API取得当前答题原图、与题干ID区分；V2对应学生图片naturalWidth>0并人工审图；未交学生/未知学生/旧引用/题干引用/越界归属/下载关闭/草稿/已删反例，以及fileSize不能当字节数的合同；群草稿无个人图片引用；回归原附件与回放、旧Demo。所有原始答卷和媒体只存private/submission-image/。

## 17. 刷新现场与已选详情一致（CI-010c）

PRD R1/R5/R6、C06/C14/C20。手动“刷新真实数据”同时负责当前课程现场和已打开活动的更新，不能只更新列表/页眉而把旧提交名单继续作为当前结果展示。不引入定时轮询或新的业务API。

点击后暂停展示该活动的旧详情，关闭其媒体预览；先取得新鲜scene，成功且活动仍在授权课程时重新读取同一activityId详情。没有选活动则只刷新现场；活动已离开当前范围则清空旧详情并提示重新选择。详情失败单独显示可重试状态，不因列表成功刷新而恢复旧详情；现场失败允许保留先前已成功读取的详情，但页眉必须标记旧数据。

整个刷新过程保留AI输入、对话和草稿。异步结果按当前选择序号处理：刷新期间老师选择另一活动，或者旧详情延迟返回时，不能覆盖新的选择；失败不能让详情永久处于加载态。继续使用已有scene/detail接口与服务端权限/内容版本校验，归属由服务端确定。

验收先复现“详情已打开→源提交状态变化→点击刷新→旧详情仍显示”。浏览器覆盖新详情、只刷新现场、详情失败/现场失败、刷新期间切换活动和旧响应竞态；真实环境仅刷新读取，不为该回归新增学生提交。全量检查及原消息助手回归通过后记完成。

## 18. 专用短课改期验证的合同门槛（CI-005c）

PRD R2/R3/R6、C06/C11。验证目标为同一专用短课真实改期后，现场、详情、教学动态及新草稿均使用新时间；结束后恢复原19:30–19:45。只限CI-005a创建的短课，原14讲及其他活动不变。此票不建立全站课堂编辑功能，不替代INT-3的发送前复核。

执行前必须确认已发布课堂支持的正式编辑路径、表单中班级与学生分配字段的表示及保留语义。仅在这些合同明确后编写单次动作脚本，持久化ProposedAction、既有授权、原始快照、请求hash和恢复动作；写前重核身份、三学生、对象未开课和时间无冲突。未知响应不重发，先回读；不得用删除重建替代同一对象改期。

本次Apifox研究发现update列有29184“活动已发布”，courseId被定义为array而course为JSON字符串；尚未证实已发布课堂的正确合同。updateConfig只有报告可见性字段，不支持改期。当前读取还发现isAllStudent=1与创建请求course[].isAllStudent=0不同，三名分配学生仍正确；不能据此自行推断该标志保留语义。合同门槛尚未满足，本次不发修改请求，不宣称已实测改期失败或成功。待合同明确再补可执行Write Set和验收。

## 19. 测验题干原图（CI-008j）

PRD R3/R5/R6。老师在V2查看真实测验时，可按需读取该试卷题目的图片题干、打开原图与关闭；加载和失败/重试状态明确。图片显示不等于模型已识别图片；保留hasImage与文字不完整提示，Context不添加图片地址或声称已理解图中内容。本票不接入学生图片答案或改写题目。

Apifox345268/3487332的topic/batchGet返回题干HTML；首讲9、10题已实测为相对/upload/files/file01/下PNG，两图HTTP200、1200×760，0重定向。沿用已验证wsevlf001测试资源基址，禁止把原始HTML直接渲染。只从明确、唯一src属性提取符合固定路径的PNG/JPEG，限制每题10张及题干长度；未知格式保持未支持。题库sensitive必须为0、permissions包含check和download，条件缺失不生成可读引用。

服务端图片请求重新核验当前教师/课程→已发布测验→详情四项归属与bizId→当前paperInfo中的topicId/topicSource→batchGet同一题和来源→权限/审核状态→图片版本引用。引用绑定activityId、topicId、topicSource、updatedAt、原始题干与图片位置；改卷/改题或引用错配时拒绝。浏览器只接收不可反解引用与通用题图名称，不能传URL、身份或任意题库ID。复用固定资源域下载Module的20MiB、15秒、禁止重定向、实际文件签名和失败处理；媒体响应no-store/nosniff。题图不假冒LMS附件关系，不调用不存在的lmsFileId。

验收：真实题图与API原图字节/SHA一致、可解码、UI原图与关闭；未知/其他活动、未发布、错误题源、改卷/旧引用、删除权限、sensitive、非法src与伪装文件等反例；Context不泄漏引用或图片地址；原作业附件/答卷/回放与Demo回归。

CI-008j真实联调修正：首次按查询与返回topicSource相等校验，V2两张首讲题图均没有可读引用。重新核对7份试卷70题（14张题图），全部是paperInfo查询源0 → batchGet返回源2，权限条件均符合。两个同名字段不要求相等；本票只接受这个已验证组合，查询仍严格使用当前试卷引用0，不能改成返回值2发送。引用同时绑定查询源0与返回源2，其他组合拒绝，未来新题源另核合同。这不是对完整枚举含义的推断。保留首次失败证据，增加该真实组合的回归后重新验证。
