# 实施 Tickets

上游：[PRD](./PRD.md) → [Feature Spec](./FEATURE-SPEC.md)。2026-09-14 用户授权按推荐方案推进；先落盘本链路再改实现。每票 Verify 完成后才标 DONE，研究结论不能充当实现验收。

当前阶段按 D-156 / CI-011 验收；CI-006/CI-007 的正式 IM 依赖保留为后续范围，不能与老师端模拟交付混称。

| Ticket / 里程碑 | 依赖 | Objective / Interface | Write Set | Acceptance / Verification | 状态 |
| --- | --- | --- | --- | --- | --- |
| CI-001 / INT-0 | 无 | 盘点 LMS 文档、签名、班级/课程/活动和名单；私有实测 | docs/01-research/CLASSIN-TEST-INTEGRATION-PROBE-2026-09-14.md；.runtime/private/classin-integration-int0-2026-09-14/lms | 日期/路径/字段/计数/完整性/失败语义均有证据，禁假定全接口通用错误码 | DONE；多页未验证时失败关闭 |
| CI-002 / INT-0 | 无 | 普通 IM 身份、群映射、发送/历史/ACK 接入调研 | docs/01-research/CLASSIN-IM-INTEGRATION-PROBE-2026-09-14.md；private/im | 正式合同与实测可判定；不足列外部依赖 | DONE_DISCOVERY；发送合同待外部依赖 |
| CI-003 / INT-1 | CI-001 读取成功 | 本机 ClassInTestService 和 Scene 合同；鉴权、分页、归属、标准化 | server/classin-test*；src/contracts/classin-test*；vite.config.ts | 取全与越权反例、超时/业务错误、敏感信息隔离，单测/真实 smoke | DONE（限定已验证单页） |
| CI-004 / INT-1 | CI-003 | 测试教师现场，课程/单元/活动/详情，独立入口 | src/features/classin-test/**；src/app/App.tsx；src/app/router/**；对应 tests | 真实模式只使用真实源，原 Demo 回归，1440×900/窄屏操作可达 | DONE |
| CI-005 / INT-2 | CI-003、CI-004 | 同源业务 Context 和教学动态；复用 AI 消息助手 | src/features/classin-test/**；src/domain/classin-test/**；src/contracts/workbuddy/business-context.ts；必要的 ImSidecarAgentSurface 修改及测试 | 时间窗口边界、无课/取消/改期、focusRefs、生成证据与会话隔离 | DONE（当前读取/生成范围）；真实任务与课前窗口草稿通过；IM仍依赖CI-006 |
| CI-006 / INT-3 | 正式 IM API/SDK/桥接与测试群身份 | 接收合同、验证教师会话、目标群和学生成员 | 本票取得依赖后按 Spec 补精确 Write Set | 三者身份可证明；不得由课堂聊天或 push 替代 | WAITING_EXTERNAL |
| CI-007 / INT-3 | CI-005、CI-006 | 发送审批/幂等/重验/持久回执和回读 | CI-006 通过后限定真实传输模块及生命周期 | 未确认零写入、双击/重启/响应丢失、三学生客户端收到 | BLOCKED_BY_CI-006 |
| CI-008 / INT-4 | CI-001、CI-003 | 五类活动的详情/结果按需读取，缺失语义 | server/classin-test*；src/features/classin-test/**；domain/classin-test/**；相应测试 | 名单与参与分开，分数空与零分分开；无报告/媒体不补造 | PARTIAL：五类详情、题目、课后报告已接入；活动图片/视频/PDF读取已接入；逐题状态已接入；已提交作业图片支持教师查看；测验14张题干图已核验；实际测验作答/批阅及媒体识别仍未完成 |
| CI-009 / INT-4 | CI-005、CI-008 | 扩展受限查询；按意图引用对象和细节 | runtime/harness/teaching-tools.mjs 及 guard 测试（需要时）；server/classin-test*；相关 Context 测试 | 当前教师/课程范围内查询，未知对象拒绝，学生明细按用途过滤 | DONE（当前限定课程）：受限Context及模型主动查询均已接入，真实跨讲次查询通过 |
| CI-010 / INT-5 | 各实现票 | 回归、性能、运行说明与缺口 | tests/e2e/classin-test-integration.spec.ts；本目录 REGRESSION.md；必要测试及运行脚本 | npm 检查、构建、浏览器验收，实测与模拟测试分别记；外部缺口明确 | PARTIAL：当前切片检查通过；INT-3等未完成项见REGRESSION |

## 通用任务包

Context 为本目录 PRD/Spec、D-155、升级计划和对应研究报告。Scope 为当前授权测试教师/目标数学课程的纵向读取、生成与最终交付，保留既有用户修改；全站生产接入和迁移不在本批。原真实 IM 目标依赖 CI-006；D-156 新阶段通过 CI-011 教师端模拟闭环验收，不把模拟记为 CI-007 真实交付完成。CI-008 的独立只读工作可在发送依赖未解决时推进，INT-3 总验收仍保留缺口。

每票记录顺序：确认上游需求 → 写明契约/Write Set → 改实现 → 执行测试 → 更新状态与 REGRESSION。发现合同变化先修 Spec/Ticket 再改代码。

## 2026-09-15 扩展子票

CI-008a：依赖 Spec §8 及 Apifox345268/3487332 实测，接入授权试卷题目。Write Set：现有 classin-test service/transport/contracts/feature/projections 和测试。验收：10题完整、题ID关联、图片题未知、答案只教师可见、未知题源不任意读。

CI-008b：依赖课堂报告重测。Write Set：`server/classin-test-reports.ts`、现有 classin-test 合同/service/transport/projections/UI/测试。验收：教师key不出服务端，教师本人笔记、实际出勤与AI分析分开，未来课/未生成/失败局部可见。

CI-008c：依赖 Spec §8 作业提交内容、Apifox3499108 及三学生实测。Write Set：`server/classin-test-submissions.ts`及对应测试、现有 classin-test service/transport/contracts/UI/projections与测试、本回归清单。验收：四项归属核对、只读取正式提交、不泄漏草稿/资源票据、失败局部呈现、群草稿排除个人正文。状态 DONE：25项相关合同测试通过、真实接口1.3秒回读及浏览器展开已验证；测验逐题答卷不在本子票实现范围。

CI-010 Write Set 补充 `playwright.classin.config.ts`、TeachingDynamics 的可选测试连接引导参数及测试；不改旧 Demo 指引默认值。全仓 lint 暴露此前研究 CJS/造数脚本错误，先记录基线；后由CI-010b按脚本运行环境修复，最终全仓lint通过。

CI-004 入口恢复：允许 `src/features/role-switch/ui/RoleSelectPage.tsx` 增加由组合根显式传入的教师目标路由。首次打开测试链接选择教师后返回测试现场；学生选择仍进入学生页面，不改变普通 Demo 默认首页。

## 本轮验证记录

2026-09-15：真实接口53活动/15单元（含空默认单元）/3学生。测验题库读取10题；首讲报告实际2713秒、应到3实到0、4教师笔记/36高光/2板书。真实提醒完整生成与审阅8.8秒，确认实际发送禁用并可取消。当前数据窗口为真实时间，没有挪动课堂、代交作业或造学习事件。

CI-010a：PRD R6 → Spec“PNG清理延迟” → 本票。Write Set：server/solution-image-renderer.ts及其测试、server/render-browser-cleanup.ts及测试、图片Feature Spec、本回归文档。先重现正常关闭拖延导致已生成图片请求超时，再验证2秒后仅终止自有子进程；不增加原测试超时。状态 DONE：两项故障替身先红后绿，6项相关测试及880项全量通过。

CI-010a Write Set补充 vite.config.ts 的test.maxWorkers=4；验证普通npm run test在此默认配置下通过，重跑期间不同时启动构建和E2E。

CI-010b：PRD R6 → Spec“工具静态检查”。Write Set：eslint.config.js、docs/01-research/classin-pc-api-scan-2026-09-11/extract.cjs、scripts/classin-test-data/render-{exam-subjective,homework}-images.mjs。验收：全仓lint、脚本语法检查通过；不运行造数上传。状态 DONE。

CI-008d之前的回归基线：TypeScript、全仓ESLint、构建、140文件/880项Vitest及19项Playwright通过；测试环境最后读取53活动/3学生成功。完整里程碑仍未完成，不能由当前切片通过推导INT-3交付通过。

CI-008d：PRD R3/R5 → Spec §9。Write Set：server/classin-test-resources.ts、server/classin-pdf-text.ts、现有service/transport/middleware/contracts/domain/classin-test及对应测试；src/features/classin-test资源预览UI；package.json/package-lock.json新增PDF.js；本研究/回归文档。验收：活动关系验证、20MiB/类型/重定向/Range反例、真实PDF文本与SHA核对、实际图片显示及MP4可解码、资料Context不使用本地源文。状态 DONE：活动/资源权限反例通过；14份实际PDF均为1页且文字可提取；作业PNG浏览器宽1200px；4段MP4均在Chrome解码并开始播放；首讲PDF进入Context，未使用本地源文。最终142文件/901项Vitest、19项Playwright、类型/lint/构建通过。

CI-009a：PRD R3/R5/R6 → Spec §10。Write Set：server/classin-runtime-authorization.ts及测试、server/teachbuddy-runtime.ts及测试、server/session-file-library.ts；RuntimeScope与ImSidecar服务合同、classin-test-adapters；runtime/harness/classin-read-tool.mjs及测试、teaching-tools及测试、presets/teachbuddy/agent.cordis.yml；本回归文档。验收：独立scope、每轮绑定/撤销、工具用途不可升级、真实模型主动补查与原Demo回归。状态 DONE：真实UI自主补查第9讲测验1次、18.053秒完成，与题库数据一致；新scope提醒生成/审阅/取消通过。907项Vitest、21项Harness及19项Playwright通过。

CI-009a Write Set补充：src/domain/workbuddy/runtime-context-envelope.ts仅将alias导入改为等价相对导入，以便Node契约测试和浏览器共享同一Envelope实现；不改变消息格式。Harness要求工具output.schema，返回evidence字符串并按JSON Context渲染。

CI-009a实测修正：模型第一次取得第2题时因结果仅标试题ID又补查全卷。Write Set补充src/domain/classin-test/projections.ts及对应契约测试，在过滤后仍保留原试卷题序，以减少无必要重复查询，不变更题目/评分。当前Harness输出Schema只支持type/properties/required等结构关键字，长度约束由执行器保留校验。
CI-009a过程可观测性：server/harness-event-projection.ts及对应测试，为新只读工具显示“读取测试课程数据/已读取测试课程证据”，成功状态不使用发送措辞，原始工具返回和凭据不进入过程时间线。

CI-009a最终回归（2026-09-15 01:50）：npm run check通过（143文件/907项Vitest，41.84秒）；21项Harness测试；构建通过；19项Playwright（40.5秒）。新classin-test会话的真实作业提醒21.739秒到审阅，用途message-draft，截止9月16日19:30、1已交/2未交均与API一致；发送禁用，取消成功。整体目标保留INT-3、真实近期课堂窗口及学习事件变化等未完成项。

CI-008e：PRD R3/R5/R6 → Spec §11 → 本票。Write Set：server/classin-test-exam-answers.ts及测试、现有classin-test service/transport/contracts、教师详情UI、Context投影及对应契约/E2E测试、本回归文档。验收：教师角色/归属/学生与题目集合反例；未参与不呈现0分；个人答案用途隔离；实际首讲三学生10题读取与浏览器核对。状态 DONE（已验证读取范围）：7份测验均3人×10题，全部未参与且不呈现占位0分；实际浏览器30条状态、无pageerror/溢出；914项Vitest、20项Playwright、类型/lint/构建通过。已作答图片与实际批阅仍待真实事件样本，不据未参与数据宣称完备。

CI-008f：PRD R3/R5/R6 → Spec §12 → 本票。依赖当前学生登录/提交文档重核与真实权限验证。Write Set：一次验收脚本scripts/classin-test-data/verify-student-submission-change.py、本机private/student-submission-change/的动作与回执（忽略不提交）、研究记录和本回归文档；若读取投影发现问题，先更新精确Write Set再修产品代码。验收：一名已授权且未交学生的一次真实文本提交，原样本保留，教师名单/BFF/AI更新；不批量、不自动重试、不伪造批阅。状态 DONE（单样本）：第二次受控请求errno=1，学生/教师/真实UI及AI均核对2已交、1未交；原样本不变。首次104拒绝与双端未提交回读留证，未归因未经证明的参数问题。重复attempt在网络调用前拒绝；无IM写入。

CI-005a：PRD R2/R3/R6 → Spec §13 → 本票。Write Set：scripts/classin-test-data/verify-upcoming-class.py；private/upcoming-class/动作与回执；对应研究和回归文档。验收：只新增2026-09-15 19:30–19:45专用短课，原活动保持不变；真实时钟下出现课前事项，正确三学生/时间/主题，真实模型草稿/审阅/取消且零IM发送。状态 DONE（单案例）：API一次创建成功、54活动/15课堂、三学生和原53项逐字段核对，真实快捷入口草稿/审阅/取消通过；不伪造now或实际授课。


CI-005b：PRD R3/R6 → Spec §13 日期与星期证据 → 本票。Write Set：src/domain/classin-test/projections.ts、server/classin-test-service.test.ts、研究/回归文档、private/upcoming-class/浏览器验证。日期星期由固定Asia/Shanghai计算注入Context；不改课表、UI日期格式或消息发送权限。验收：UTC跨日历法合同、真实模型重测与人工审阅。状态 DONE（确定日历证据＋当前真实案例）：18项相关合同通过，真实草稿21.209秒输出星期二及正确时段；最终915项Vitest、20项Playwright、类型/lint/构建通过。

CI-005最终验证（2026-09-15 02:53）：npm run check通过144文件/915项Vitest（42.49秒），构建通过，20项Playwright通过（48.3秒）；原Mock与真实入口均回归。没有修改Harness，沿用其21项已通过合同。截图人工核对可操作、无遮挡。


CI-008g：PRD R3/R5/R6 → Spec §14 → 本票。依赖专用回放文档和首讲/未来短课只读实测。Write Set：server/classin-test-replay.ts及测试；现有classin-test service/transport/contracts/domain投影及对应测试；ClassInTestPage只增回放结果显示；tests/e2e/classin-test-integration.spec.ts；研究/回归文件与private/replay-metadata/。验收：响应归属、生成/空/未知/失败分开、票据/URL隔离、真实首讲录制文件与未来课堂区别、UI与实际模型可核对；不生成录制或假播放。状态 DONE（元数据读取）：首讲1文件/1707秒与未来短课空列表、UI和模型均核对；真实模型20.098秒完成并保留讲授内容未知。923项Vitest、21项Playwright、类型/lint/构建通过。回放实际播放仍未接入V2；canShow仅表示播放次数文案。


CI-008h：PRD R5/R6 → Spec §15 → 本票。依赖已通过的真实HTTPS MP4/Range探测。Write Set：server/classin-test-replay-stream.ts及测试；server/classin-test-replay.ts及测试、service/middleware/对应测试；ClassInReadPort保持无Node依赖，server专用Service扩展；src/contracts/classin-test回放可播放引用；ClassInReplayPreview.tsx/ClassInTestPage及浏览器测试；研究、回归文档、private/replay-stream/。验收：范围/归属/版本/媒体类型/重定向反例、206/416与中止背压、真实解码/播放/seek、既有读取和Demo回归。状态 DONE（限定当前回放版本）：真实Chrome5.255秒加载、1920×1080/1707.066秒，开始播放及跳到600秒继续播放通过，关闭后播放器移除；实际416/403边界通过。944项Vitest、22项Playwright、类型/Lint/构建通过；未整片观看或生成学生观看事件。

CI-008i：PRD R3/R5/R6 → Spec §16 → 本票。Write Set：server/classin-test-submissions.ts及测试、classin-test-service/middleware及对应测试；src/contracts/classin-test；ClassInSubmissionImagePreview.tsx、ClassInTestPage及对应E2E；Context投影相关测试；本PRD/Spec/Tickets/REGRESSION、CLASSIN-SUBMISSION-IMAGE-READ-CONTRACT-2026-09-15.md及private/submission-image/。复用已验证教学附件下载Module，不改上传/提交/批阅。验收：精确个人答卷权限、真实图片下载及UI展示、未知与失败语义、群用途隔离和原界面回归。状态 DONE（当前已验证JPEG答卷）：对应学生图片实际200/114216字节/900×1234，SHA-256与API原图一致，原图新页与关闭通过；其他学生/旧引用/身份覆盖403。949项Vitest、23项Playwright、类型/Lint/构建通过；未识别图片内容或改写学习结果。

CI-008i Write Set补充：server/classin-test-resources.ts及测试，增加仅供答卷调用方启用的filePermission精确状态条件；普通附件行为不变。

CI-010c：PRD R1/R5/R6 → Spec §17 → 本票。Write Set：src/features/classin-test/ClassInTestPage.tsx、tests/e2e/classin-test-integration.spec.ts、本Spec/Tickets/REGRESSION及private/refresh-consistency/。验收：刷新同一已选详情、列表与详情错误分开、旧响应不覆盖新选择、AI输入/草稿保留，真实只读复核；不修改API合同或测试数据。状态 DONE：刷新详情最小用例先红后绿；实际UI详情重新读取、编辑草稿保留/取消通过；949项Vitest、28项Playwright、类型/Lint/构建通过。普通IM相关恢复仍依赖CI-006/007。

CI-005c：PRD R2/R3/R6 → Spec §18 → 本票。当前Write Set仅Spec/Tickets/REGRESSION、CLASSIN-PUBLISHED-CLASS-RESCHEDULE-CONTRACT-2026-09-15.md及private/reschedule/读取证据。Discover完成：最新Apifox编辑/配置/学生合同及专用短课详情、分配已读取；未确认已发布课堂编辑与分配保留语义。状态 WAITING_CONTRACT：零修改请求，原时段保持；不能计入真实改期验收。取得合同后先补脚本Write Set和动作/恢复验收，再执行，不删除重建。

CI-008j：PRD R3/R5/R6 → Spec §19 → 本票。Write Set：server/classin-test-question-images.ts及测试、classin-test-resources.ts（复用受限下载）、service/middleware及相应测试；src/contracts/classin-test、ClassInQuestionImagePreview.tsx、ClassInTestPage及E2E；研究/回归文档和private/exam-images/。验收：授权试卷题干图片原图一致、媒体/权限反例、真实浏览器与原功能回归，未接入图片识别。状态 DONE（已验证题干预览）：首次联调暴露查询源0/返回源2差异，按70题一致实测修正并留证；7份测验14张图逐字节等于原图，实际UI显示/打开/关闭及403反例通过。最终971项Vitest、29项Playwright、类型/Lint/构建通过；AI图片识别与学生图片答案不在本票完成范围。

## D-156 校准 Tickets（2026-09-15）

- CI-011a / DONE：PRD 校准 → Spec §0 → 原消息工作区加入测试班并按 Thread 接入服务。Write Set：app/App/router、features/classin-test、message-workspace Provider/store/展示、workbuddy-im-assistance Provider/store/sidecar、message/domain 合同。验收：异步连接不丢历史、物理 Demo 不串真实数学、全 Shell 功能保留、核验页可往返、失败重试。
- CI-011b / DONE：教师端模拟消息 Lifecycle 与 Copilot 审批。Write Set：features/classin-test 模拟传输及适配器、message-lifecycle 可复用组合合同、对应测试。验收：教师手动/审批发送、稳定幂等与内容冲突拒绝、存储失败明确、刷新恢复、学生不可见、仅 simulated/sent，无真实 IM 请求。
- CI-011c / DONE：未接入能力显式模拟。Write Set：domain/classin-test 模拟投影、classin-test adapters、BusinessContext/Sidecar 可选展示合同及测试。验收：四阶段入口及主题对应，真实 0/空/失败不覆盖、模拟来源可辨、原图文/学习服务交互保留。
- CI-011d / DONE：整体验收和证据。Write Set：相关单元/集成/E2E、playwright.classin.config.ts、本目录 REGRESSION.md、PROJECT-BRIEF/AGENTS 的 D-156 指针。运行检查/构建/浏览器按序，实际 API/模型/模拟消息分别记录，完成清单供用户整体审阅。

CI-011a Write Set 精化：保留 AppShell/Topbar/ImmersiveMessageWorkspaceFrame 原布局，添加可选连接工具；MessageGroupProfile 对测试会话展示真实班级名册与模拟 IM 关系标签，不将教师假定为班主任，班级入口返回实际数据核验页。CI-011d 添加 classin-messages-hybrid.spec.ts 的契约验收。

CI-011c 补充 Runtime Envelope 的来源 kind 字段，确保真实与模拟来源进入模型后仍可区分。CI-011b 的图片消息保存已解析的本机 data URI，超过浏览器会话存储容量时失败可重试，不显示已发送。角色切换移除附加会话，保留隔离存储。

CI-011d 回归修复：新增异步班级连接触发消息 Action 对象重建，旧服务据此重建 HTTP Runtime，导致过期绑定恢复重复创建会话。组合根固定 Runtime 实例，真实/演示服务依旧按各自 scope 隔离；数据刷新只更新业务 Adapter。原两项恢复 E2E 的“只创建一次”断言保持不变。

CI-011b 最终边界：消息键复用共享 createClientId，兼容 HTTP 环境没有 randomUUID 的情况；新增浏览器反例验证两次发送跨刷新不重号。

CI-011 最终验收：D-156 范围全部完成。真实API 54活动/3学生、真实模型提醒10.437秒和模拟到课示例8.605秒、教师端文本/图片/Copilot模拟发送与刷新验证通过。全量979 Vitest /33 Playwright通过；最后角色隔离收尾的8项单元与4项E2E复测通过，类型/lint/构建通过。不同身份的附加Port替换不继承旧消息，同一身份切回老师端从Port恢复最新本机记录；模拟数据不对学生端提供。详见REGRESSION当前验收段，原CI-006/CI-007仍是后续真实IM任务。
