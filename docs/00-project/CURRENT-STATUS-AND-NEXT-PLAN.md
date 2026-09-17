---
title: ClassIn TeachBuddy 当前状态与下一阶段计划
status: COPILOT_REAL_CONTEXT_M6_COMPLETE_AWAITING_USER_ACCEPTANCE
version: v0.37
date: 2026-09-17
---

# 当前状态与下一阶段计划

## 真实业务 Context 接入收口（2026-09-17）

用户授权的 M3～M6 连续目标模式已完成内部严格 Gate，当前等待晨间整体验收。21 类主动问题最终为 **15 PASS + 6 CONDITIONAL_PASS + 0 状态不明**；条件项是 B1 实时考勤、D1/D2/D5/E4 正式学情报告和 F1 完整 IM 分页，其可用范围均已真实闭环并在页面显示限制。独立在线 IM Reader、普通 IM 真实发送和成员级实时考勤继续按外部合同阻塞，不以模拟业务数据补齐。

P01～P10 最终为 **7 PASS + 2 CONDITIONAL_PASS + 1 BLOCKED_EXTERNAL**。当前真实时钟实际触发 P01、P04、P05、P07、P08、P09、P10；P02/P06 因业务条件不满足正确隐藏；P03 因缺成员级实时样本显示待核且没有动作。完整状态见[21题矩阵](../04-specs/features/copilot-real-context-integration/ACCEPTANCE-MATRIX.md)、[10条推荐矩阵](../04-specs/features/copilot-real-context-integration/TEACHING-DYNAMICS-COVERAGE.md)和[M6最终验收](../04-specs/features/copilot-real-context-integration/M6-FINAL-ACCEPTANCE-2026-09-17.md)。

真实 Thread 已完成 ClassIn API → 结构化 Context → DeepSeek → 页面纵向闭环；消息原文只保存在忽略的授权私有目录。最终门禁包括 165 个测试文件 / 1034 项测试、22 项 Harness、40 项 ClassIn 专项浏览器用例、三视口无溢出和 Sidecar axe 严重/致命问题为 0。生产构建只保留既有主 chunk 大小提示。

## 独立审阅台更新（2026-09-16）

用户已完成第一批四题反馈并确认核心方向约80%正确，可以继续沿当前轨道实施。该数字是方向共识，不是答案准确率或接口覆盖率。独立工具运行于 `http://127.0.0.1:4186`，规划和回答使用与当前 Demo 相同的 `deepseek-v4-flash`，不改变默认 Copilot。

四题初轮评价与建议已从审阅台读取并落实：A2补人数和后续课节间隔；C2补同班姓名、截止及提交时效；E2聚焦知识内容并接入真实ASR；F1凝练总结并增加明确的群聊快照与当前LMS核对模式。E2最新评价为匹配/相关基本满意、质量满意，并要求1、2、3点简洁组织及关键词加粗；原反馈与历史答案继续保留。

第二阶段现已开放 A1/A3/A4/B1/C1/E1 六题和开放式入口。六题均完成一次真实只读取数和DeepSeek回答；开放入口已验证课程级路由、选中课堂后的多工具路由，以及需要具体课堂但未选择时先澄清且不取数。B1仅以正式课后报告回答已结束课堂，未来课堂被硬性拒绝，不冒充成员级实时考勤。详见[第二阶段验收](../04-specs/features/classin-test-integration/review-lab/PHASE2-ACCEPTANCE-2026-09-16.md)。下一步是逐题审阅第二批答案，再决定第三批或默认Demo真实Adapter规格。

用户随后确认两阶段整体已验收，约85%符合预期，并要求按该框架逐步接入当前Copilot Demo。[真实业务Context接入计划](../04-specs/features/copilot-real-context-integration/README.md)包括产品PRD、技术Feature Spec、21题逐题验收矩阵和M0–M6里程碑。M0、M1已于2026-09-16通过用户验收。M2 已完成 B2 最近迟到/缺席和 B3 录播参与的真实 Context、DeepSeek 与浏览器验证；B1 课中成员级实时链路因缺少受支持登录会话正向样本保持 `BLOCKED_EXTERNAL`，P03 不生成模拟名单。当前停在 M2 用户验收 Gate，尚未进入 M3。详见[M2验收记录](../04-specs/features/copilot-real-context-integration/M2-ACCEPTANCE-2026-09-17.md)。

用户已确认原需求计划没有问题，并补充要求：四阶段没有任务时必须有准确空态；现有约10条阶段推荐Prompt必须逐条覆盖且不重不漏。现已新增[四阶段与10条推荐覆盖矩阵](../04-specs/features/copilot-real-context-integration/TEACHING-DYNAMICS-COVERAGE.md)，将21类主动问题与10条系统推荐分开验收；原计划已批准，本次扩展细节待用户核对后进入M0。

F1已有20条未脱敏消息，默认最近5天为查询目标，实际范围如实展示。E2第二讲两个视频取得159段转写，接口、Context和页面原文一致；第一讲另一视频为《白鹭》，与课名冲突，不能混入数学课回顾。当前审阅台36项契约、11项既有浏览器回归、第二阶段专项浏览器验证及静态检查通过，这不等于答案全部正确或业务验收通过。详见[四题审阅共识](../04-specs/features/classin-test-integration/review-lab/USER-REVIEW-CONSENSUS-2026-09-16.md)和[ASR实测](../04-specs/features/classin-test-integration/review-lab/ASR-READ-VERIFICATION-2026-09-16.md)。不能将“接口定位约90%”或“方向约80%”当成答案准确率或全量数据充分性。

审阅台已修正 A2 重复补充建议：按已取得的信息判断增量；下节课学生人数已在返回和模型上下文中，归为可直接补入回答的信息。答案下方直接列接口及每条返回入口。

入口：[工具 README](../../tools/copilot-api-review-lab/README.md)、[第一阶段 PRD](../04-specs/features/classin-test-integration/review-lab/PRD.md)、[实现与验收记录](../04-specs/features/classin-test-integration/review-lab/ACCEPTANCE-2026-09-16.md)。以下项目扫描保留原时点事实；其中直接接入的跟进顺序由本节的“先独立逐题审阅”更新。

## 当前结论（2026-09-16）

项目已具备可运行的 ClassIn PC Demo、真实 Harness 和 IM Copilot 产品切片。用户已完成模拟 Copilot 与源项目最新代码对齐验收，后续开发继续在当前 V2 仓库推进；当前主线是审阅并收口真实 API 映射，再进入真实业务只读接入。默认消息组合继续以 **D-157** 为准，推进优先级以 **D-158** 为准。课件 V2 的 M1 基线保持完成，后续复审与 M2 启动暂列 `PENDING`。

本轮扫描覆盖决策、Feature/验收文档、当前组合根、测试配置与工程检查。基于分支 `codex/real-api-integration-v2`、HEAD `2911228` 及其未提交工作树；扫描开始时有 **70 个已跟踪修改文件、315 个未跟踪文件**，最近提交日期为 2026-09-11。因此 9 月 15 日交付主要仍是本地工作树事实。

本轮 Write Set：本进展文档、`docs/README.md` 的进展/研究入口、源项目对齐验收文档中四个截图链接，以及 `prototype/exports/progress-2026-09-16/` 的问题截图。交付物是状态归并、审阅队列、验证记录和建议跟进顺序；产品实现、锁定决策、用户批注与真实业务数据保持原有状态。验收条件是每项当前结论有来源、工程结果与用户验收分开、下一步具备依赖和完成条件、改动链接可解析。

### 各条路线的实际进展

| 路线 | 当前完成事实 | 尚未关闭的事项 / 依据 |
| --- | --- | --- |
| ClassIn 基座与 M4.2–M4.5 | 教师/学生基座、班级 MVP、独立教师产品及 Demo 体验已在 8 月完成用户验收 | 属于历史产品基线；D-113/D-114 后导航与任务入口另有增量。[阶段记录](../04-specs/features/workbuddy-m4-demo-completion/README.md) |
| Harness 与文件产物 | 真实文本模型、工具、Session 恢复、文件归档，以及图片输入/解题图、限流和上下文超限恢复已有实现及范围证据 | 9 月 5 日导航与文件库仍缺最终用户验收记录；视觉模型容量仍有外部问题。[运行时](../04-specs/features/teachbuddy-agent-runtime/README.md)、[文件库](../04-specs/features/teachbuddy-session-files/TICKET-BREAKDOWN.md) |
| 默认 IM Copilot | PAR-01～07 完成：顶部四阶段、通用问题、引用给 AI、历史展示、草稿交付、提及与恢复已与源项目最新代码对齐；保留 V2 图片排序修复 | `PASS_USER_ACCEPTED`。2026-09-16 用户确认最新验收无问题；后续在当前 V2 仓库继续开发。默认仍使用固定业务数据和模拟消息传输。[对齐验收](../04-specs/features/workbuddy-im-collaboration/IM-COPILOT-SOURCE-PARITY-IMPLEMENTATION-REVIEW-2026-09-15.md) |
| 通用提问 | 六组 21 类内容已确认，两个 IM 入口共享首屏三问、帮助入口及对话；具备证据的问法才推荐 | 首条演示切片完成，不等于 21 类均通过真实数据和模型正确性验收。五类缺口及 F 组生产消息关联仍在。[实施合同](../04-specs/features/workbuddy-im-collaboration/COPILOT-GENERAL-QUESTION-GUIDANCE-IMPLEMENTATION.md) |
| ClassIn 真实测试接入 | 已有课程/单元/五类活动、提交与逐题读取、PDF、题图、回放和受限模型补查；D-156 范围曾完成 | D-157 已将其退出默认消息组合根，保留 `/teacher/classin-test` 核验入口。普通 IM 合同、真实学生收件、非空测验作答/批阅及媒体理解仍有缺口。[测试回归](../04-specs/features/classin-test-integration/REGRESSION.md) |
| IM 2.0 基础能力 | 七个实施阶段全部完成；消息媒体已用户验收，其余六个阶段完成自审 | 104 项覆盖为 74 matched、23 partial、3 adapted、2 missing、2 conflicts；27 项部分缺口/缺失/冲突仍保留，不能称为生产 IM 全量完成。[覆盖账本](../04-specs/features/workbuddy-im-collaboration/IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md) |
| 课件生成 V2 | M0 完成，M1 八个 Case 基线按用户授权关闭 | `PENDING`。M1 完成事实和证据不变；用户当前暂不投入精力，M1 后续复审、教师/教研校准和 M2 启动均暂缓。[M1 报告](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md) |
| 暂停路线 | 原产品路线 M5–M10 保持 `PARKED`；班级成员私聊切换提案保持暂停 | 前者需独立恢复决定；后者需联系人关系和权限合同。这里的 M5–M10 不指课件 V2 或 Copilot 各自的同名里程碑。[M5](../04-specs/features/workbuddy-m5-homework-correction/README.md)、[会话切换提案](../04-specs/features/workbuddy-im-collaboration/CLASS-SCOPED-CONVERSATION-RAIL-DESIGN-PROPOSAL.md) |

### 建议的审阅队列

当前只保留一个主动审阅主线：真实 API 映射。已完成的 Copilot 对齐不再重复开启审批；课件路线保持 `PENDING`。

| 顺序 | 阅读材料 | 本次需要审阅的具体结果 | 已有确认与剩余边界 |
| --- | --- | --- | --- |
| R1 / `COMPLETE_USER_ACCEPTED` | [模拟基线与源项目对齐验收](../04-specs/features/workbuddy-im-collaboration/IM-COPILOT-SOURCE-PARITY-IMPLEMENTATION-REVIEW-2026-09-15.md) | 两个入口的建议、提问、引用、历史、草稿交付和恢复 | 2026-09-16 用户确认无问题；通用提问和交付细节并入本次最终验收，不再单列等待 |
| R2 / `IN_REVIEW` | [模拟数据与真实 API 映射审阅稿](../04-specs/features/classin-test-integration/IM-COPILOT-REAL-API-INVENTORY-REVIEW-2026-09-15.md)，重点 §8、§10、§12–13 | 分级接入范围、建议数量随事实变化、普通 IM 继续模拟、缺失事实处理及 Mock 回退 | 当前唯一主动审阅主线；§2.3“模板不变、业务参数随真实 API 变化”已确认，其余批注完成后再统一收口 |
| R4 / 集中补验收 | [IM 基础能力覆盖](../04-specs/features/workbuddy-im-collaboration/IM-2-0-BASELINE-AND-INCREMENT-COVERAGE.md)、[导航](../04-specs/features/teachbuddy-navigation-migration/IMPLEMENTATION.md)、[删除旧 Mock 任务](../04-specs/features/teachbuddy-navigation-migration/REMOVE-LEGACY-MOCK-TASKS.md)、[文件库](../04-specs/features/teachbuddy-session-files/TICKET-BREAKDOWN.md) | 汇总尚缺用户签收的页面增量和六个自审模块；已验收媒体范围保持原状态 | 工程完成与产品签收分别记录；无需重复批准已授权实现 |
| R5 / `PENDING` | [M1 固定任务与基线报告](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md)、[V2 实施计划 §7 M2](../06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md) | 后续复核内容失分、图题错误、最少追问和课堂时间约束 | 当前暂缓；M1 Gate 和基线保持完成，待用户恢复该路线时再安排教师/教研校准与 M2 |

R2 的 21 类问题映射为 **8 类可接、11 类部分可接、2 类缺口**。这是接入准备度，不是当前默认产品的真实能力通过率；“把刚才内容整理成消息”也包含在可接项中，并不需要新增业务 API。

### 后续跟进安排（建议顺序，未创建定时任务）

| 顺序 / 建议负责方 | 下一项工作 | 依赖 | 可检查的完成条件 |
| --- | --- | --- | --- |
| F0 / Agent 后续修复 | 修复 1100×720 帮助面板分类文字裁切 | 不阻塞已完成的 Copilot 用户验收；随下一轮 UI 变更一起关闭 | 六类名称完整可见、问题区独立滚动、Composer 可达；两个入口补充文字裁切检查 |
| F1 / `DONE` | Copilot 对齐用户验收与记录 | 当前模拟基线与工程结果 | 已于 2026-09-16 完成，后续不再作为真实 API 开发前置等待 |
| F2 / Agent 文档整理 | 归并已确认批注、补齐证据链接和当前状态；按模块准备可复现变更清单 | 可与 R2 审阅并行 | D-157 默认组合与旧 D-156 记录不再混淆；缺失证据明确来源；交付能对应到文件清单和版本 |
| F3 / 用户收口范围，Agent 落盘规格 | 完成 R2 剩余范围审阅，形成新 PRD → Feature Spec → Tickets | 复用已验收 Copilot 基线和已确认的模板/参数原则 | 明确首批 8 类、11 类受限回答与 2 类缺口的具体契约，业务值允许差异清单、真实 Thread 失败策略和回退边界齐全 |
| F4 / Agent 研发与验证 | 按新票接通真实只读事实，先跑课程安排、作业状态、资料正文→消息草稿纵向闭环 | F3 | 真实 API→上下文→回答逐项对照；两入口的布局/固定文案一致；空值、错误、权限、跨班隔离与模拟交付可验证 |
| F5 / 平台接口与模型服务对接方，Agent 核验 | 取得普通 IM 的身份/群映射/历史/发送/ACK/回读合同；确认可用视觉模型容量或备选路由 | 可并行推进外部依赖 | 前者具备测试群与真实学生收件证据；后者实际完成图片→工具→追问链路。合同未齐时保留未完成，不阻塞已批准只读切片 |
| F6 / `PENDING` | 课件 V2 M1 复审与 M2：Knowledge Pack、Instructional Rules | 用户恢复课件路线后再启动 | M1 证据保持冻结；恢复时先确认复审与教研校准安排，再进入 M2，不与真实 API 主线抢占当前精力 |

当前只推进 F2–F4；F5 可并行收集外部依赖，F0 随下一轮 UI 修改处理，F6 保持 `PENDING`。上述没有约定交付日期，也没有创建自动跟进任务。

### 本轮工程验证与边界

| 检查（2026-09-16 当前工作树） | 结果 |
| --- | --- |
| `npm run check` | PASS：TypeScript、ESLint、154 个 Vitest 文件 / 1006 项测试；使用默认超时，Vitest 45.49 秒 |
| `npm run test:harness` | PASS：22 项 |
| `npm run build` | PASS；主 JS 约 2.04 MB（gzip 约 580 KB），仍有 chunk 大小提示 |
| `npm run test:e2e:copilot-parity -- --workers=2` | PASS：23 项 Chromium 用例，约 1 分钟；包括两入口、提问、引用、草稿交付、历史、停止/恢复及适用的 axe 检查 |
| 截图抽查与窄窗稳定帧复核 | 1440×900 的帮助/草稿主流程未见遮挡；1100×720 帮助分类文字裁切，见下方缺口，视觉验收不能记为全通过 |

日志在本机 `/tmp/teachbuddy-progress-20260916-{check,harness,build,e2e}.log`；浏览器输出单独保存在 `/tmp/teachbuddy-progress-20260916-e2e/`。这些是临时复核证据，长期交付应保留到对应验收记录或受治理的证据目录。

本轮没有重新调用真实 ClassIn API 或付费模型，没有发送真实 IM；真实 API、图片模型和双实例视觉一致性沿用注明日期的既有验收证据。全仓 E2E/视觉基线未在本轮全量运行，历史全量失败债务仍见[对齐验收](../04-specs/features/workbuddy-im-collaboration/IM-COPILOT-SOURCE-PARITY-IMPLEMENTATION-REVIEW-2026-09-15.md)，不能由当前范围通过推导全仓浏览器全部通过。

### 本轮发现的事实源与交付缺口

- **窄窗帮助分类文字不可见**：班级聊天在 1100×720、顶部建议展开时，帮助面板高度为 180px，六类名称被分类栏裁切。禁用动画、确认 opacity=1 后仍复现；分类文字边界 y=466～482.5 超出分类栏底边 y≈461.59。现有 E2E 只检查面板/输入区可达与外框溢出，未检测内部文字裁切。见[稳定帧截图](../../prototype/exports/progress-2026-09-16/narrow-help-label-clipping.png)；登记为 F0，本轮仅扫描，尚未修改产品代码。
- **状态文档滞后**：本文件此前停在 9 月 6 日；IM README、旧 Copilot 里程碑及 ClassIn 回归文档仍保留更早阶段的“当前”陈述。跨阶段状态统一从本节进入，再读具体证据。D-156 的混合工作区验收是阶段事实，不能描述 D-157 后的默认入口。
- **批注与页头不一致**：通用提问 v0.2 页头仍为待审阅、正文已确认且已进入六组 21 类实施；API 映射稿中模板/参数已获批注确认。待审阅队列按上述 R1–R5 执行，不机械累加旧 `PENDING` 标记。
- **源文档未完整迁入**：在通用提问三份文档中发现五个本仓缺失的研究文件：`CLASSIN-TEACHING-DATA-MAP-2026-09-15.md`、`CLASSIN-TEACHING-ACTIVITY-BUSINESS-DEEP-DIVE-2026-09-15.md`、`COPILOT-GENERAL-QUESTIONS-API-EVIDENCE-2026-09-15.md`、`COPILOT-GENERAL-QUESTIONS-DW-EVIDENCE-2026-09-15.md`、`COPILOT-18-QUESTIONS-VERIFICATION-MATRIX-2026-09-15.md`。其引用不能作为 V2 已具备完整证据包的证明；应核对源项目后补迁脱敏资料或建立明确来源指针。此次另修正对齐验收中的四个截图相对路径，截图文件已在本仓。
- **运行与发布未闭环**：9 月 15 日 V2 视觉路由仍有上游容量失败且无已验证 fallback，见[Gemini 验收补充](../05-engineering/acceptance/GEMINI-VISION-2026-09-10.md)。源/V2 共用 Harness 3080 还曾发生启动归属冲突；完整启动方式见对齐验收末节。本轮未重启现有服务，不能声称实时上游容量已恢复。
- **版本封存尚缺**：大量近期代码、规格和研究仍未提交，后续应按 Copilot 对齐、ClassIn 测试模块、研究证据及运行恢复等范围整理可审阅变更；保留已有工作，不混入凭据或受限原始样本。

## 历史基线（截至 2026-09-06，保留原阶段记录）

以下内容仅用于追溯 8 月 Demo 封版与 9 月初增量；其中旧的“当前路线”“没有真实 API”等描述以其记录时点理解。今日状态、默认入口和审阅顺序以上文为准。

> D-108 已锁定当前展示品牌：正式名称为 **ClassIn TeachBuddy**，界面简称 **TeachBuddy**，中文描述为 **AI 教学搭档**。下文 `WorkBuddyRun` 等 PascalCase 名称及 `workbuddy` 路径仍表示内部工程兼容标识；阶段验收原始名称仅用于历史追踪。

> **2026-09-05 课件生成 V2 计划**：按 D-116，下一阶段以中国公立小学三年级数学正式课堂为首条内容质量切片。先完成教材与课题范围、固定任务与 V1 基线、Knowledge Pack、Instructional Rules、结构化内容、Courseware Skill 和内容评价闭环；达到可复核的 60-70 分 Gate 后，再进入 PPTAgent / Renderer 表达层 Spike，并依据瓶颈决定是否引入专业 Agent。当前只批准计划，尚未开始功能实现。详细路线见 [课件生成 V2 内容优先实施计划](../06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md)。

> **2026-09-06 课件生成 V2 M0/M1**：M0-A 至 M0-J 已全部关闭，M0 加权进度为 100%，状态为 `COMPLETE_USER_REVIEWED`。M1 已冻结 8 个 Case 与 Rubric v0.1，并使用未改动的真实 Harness V1 完成首轮运行：3/4 生成型 Case 形成 HTML，1/4 在 10 分钟停止；4/4 澄清型 Case 无 Artifact，但没有一项同时满足最少追问、事实准确和不补猜。两个生成产物含阻断数学图形错误，三个均未通过视觉 Gate，四个生成型 Case 的 Agent 试评平均内容分为 43.44。该分数不是教师/教研评价或课堂效果。用户授权 M1 过程 Review 默认确认并在交付后统一复审，M1 当前为 `COMPLETE_USER_AUTHORIZED`，M2 已解锁但尚未启动。事实见 [M0 Readiness Report](../04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md) 与 [M1 V1 Baseline Report](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md)。

### H1. 当时的完成事实

> **2026-09-05 我的任务 Mock 清理**：按 D-114，“我的任务”现只展示当前 Profile 的真实 Harness Session。固定课程任务、课程工作流、旧 Run 页面及其专用 UI/测试已删除；旧 URL 只回退真实新建任务，能力动作改为预填真实 Composer。新建/关闭标签仍不删除 Session，技能、AgentIn、文件、工具连接和定时任务不受影响。工程 Gate 为 670 项单元/集成、11 项 Harness 契约、41 项 TeachBuddy 专项及 8 项 Standalone 浏览器测试通过；两 Profile 的 1440/390px 截图已人工检查。全仓 E2E 另有 10 项不经过本次任务路由的既有 Class/Message/Role Switch 断言失败，未在本票扩大修复。详细范围与证据见 [删除旧 Mock Task 产品表面](../04-specs/features/teachbuddy-navigation-migration/REMOVE-LEGACY-MOCK-TASKS.md)，待用户页面验收。NAV-04 的两类历史说明仅保留为阶段记录。

> **2026-09-05 TeachBuddy 导航增量**：按 D-113 完成终局与班级入口六项导航（我的任务、技能市场、AgentIn、我的文件、工具连接、定时任务）。一级 TeachBuddy 只展开/收起；我的任务保留现有真实 Harness 默认工作台。AgentIn 固定目录迁入，工具/定时 Demo 保留；班级来源参数、返回及存储隔离不变。规格、票据和 668 项单元/集成测试、38 项范围浏览器回归结果见 [导航迁移与验收记录](../04-specs/features/teachbuddy-navigation-migration/IMPLEMENTATION.md)。状态为 `IMPLEMENTED_PENDING_USER_REVIEW`；下文 M4.3 四入口是已封存阶段事实，不是当前菜单。

> **2026-09-05 Harness 工作区增量**：本文件主体保留 2026-08-25 的 M4.5 封版事实。分离后的 `classin-ai-harness` 已新增 TeachBuddy 文本运行入口、本机 BFF、固定 DeepSeek Harness Adapter、教学文稿工具和 Session 文件库，并完成真实 DeepSeek 文本、工具、保存、停止、重启恢复及 HTML 文件自动归档验收。最新状态以 [Harness 接入边界](../06-architecture/DEEPSEEK-HARNESS-INTEGRATION.md)、[运行时验收记录](../04-specs/features/teachbuddy-agent-runtime/ACCEPTANCE.md) 和 [Session 文件库 Spec](../04-specs/features/teachbuddy-session-files/FEATURE-SPEC.md) 为准。下面“没有模型 Runtime”只描述原封版基线，不描述新增代码。

| 范围 | 工程状态 | 用户 Review Gate |
| --- | --- | --- |
| ClassIn PC 教师/学生产品基座 | 已迁入根 `src/` 单应用并持续可运行 | 已通过既有阶段验收 |
| M4 课程生产与 M4.1 ConversationRun | Goal → Context → Plan → Artifact → Action → Approval → Receipt → Evaluation 已实现 | M4.1 与阶段收尾已确认通过 |
| Evaluation Module | 单课件、方案包对象和 WorkBuddy IM 每次执行均保留关联完整证据链的模拟 EvaluationEvent；失败/重试历史可恢复 | 随阶段一至四收尾通过技术验收 |
| 能力管理页面 | Skills、Tools、Files、Schedules、Settings 已实现；Content 按 D-051 Dormant | 2026-08-24 用户确认五个可见页面验收完成 |
| TeachBuddy IM | 作业催交、课前准备通知、沉浸消息工作台和显式审批发送已实现 | 2026-08-24 用户确认 v0.19 验收完成 |
| 班级多 Agent 渠道 | 公开结构化 `@Agent`、教师/学生隔离私聊、授权重验、目标撤销与可恢复失败已实现 | 随 IM v0.19 验收通过 |
| M4.2 IM AI 入口地图与 Case 矩阵 | M4.2-01～16 已完成：五个 P0 Case、最终发送话术、真实题号 Context、Agent 私聊发现/历史/响应、共享消息编辑与 WorkBuddy 统一体验均已闭环 | 2026-08-24 用户验收通过 |
| 一级 WorkBuddy 测验活动草稿（纳入 M4.2 扩展交付） | PRD、Spec、Tickets 与纵向闭环已完成：连续生成并审阅试卷、确认后交互填写参数、draft-only 写回、课程详情逐题编辑、独立发布及学生可见性 | 2026-08-24 用户验收通过 |
| M4.3 ClassIn 内嵌 MVP 入口 | D-098～D-101 已实施：Demo 双入口共存，终局/MVP 独立 Product Module、Shell/导航、配置、Route 与 Data Space；MVP 左栏将原新建任务入口改名为“我的任务”，页面流程不变，并保留 Skills/Tools/Files、隐藏 Schedules/Settings；Launch Context、返回链路与跨 Experience 隔离均通过工程 Gate | 2026-08-25 用户完成页面验收，`COMPLETE_USER_ACCEPTED` |
| M4.4 独立教师 ClassIn TeachBuddy Web 产品 | 第三套独立 Product Module 已完成：独立官网、教师个人账号、完整任务/能力工作台、AI 点数预占/结算/释放、模拟会员订单、无 ClassIn Context 执行及 ClassIn 价值转化；不挂载 ClassIn 业务 Provider，不共享终局/MVP 私有数据；内容资源统一采用 TeacherIn 兼容格式，为未来受治理接入内部内容生态保留零格式转换路径 | 2026-08-25 用户完成方案与页面 Review，`COMPLETE_USER_ACCEPTED` |
| M4.5 全局 Demo 体验收口 | IA、UI、交互、引导和 Demo Release Gate；不改变 M4.2～M4.4 已验收的底层功能和业务逻辑 | 2026-08-25 用户确认阶段体验验收完成，`COMPLETE_USER_ACCEPTED` |
| TeachBuddy Session 文件库增量 | `SessionFileLibrary`、本地 `.runtime/files` Adapter、MD/HTML/TXT/JSON、按 Session 分组、安全预览、下载及回到来源对话已实现；生成后自动留存与 Approval/正式发布分离 | 工程 Gate 与真实模型验收通过，`IMPLEMENTED_PENDING_USER_REVIEW` |
| M5–M10 | M5 规格已就绪；后续生产交付路线保留 | `PARKED`，待 M4.5 后独立恢复 |

既有 ClassIn 业务对象仍为固定、脱敏、可重置的 Demo 数据；TeachBuddy 文本 Runtime 与 Session 文件库已接入真实 DeepSeek 和本机持久化，但仍没有真实 ClassIn API、生产授权、跨设备存储或长期记忆。

### H2. 阶段一到阶段四收尾

1. 阶段一——实现审计与稳定化：硬性 Standards/Spec 缺口已修复；终局双轴复审均 all-clear；静态、单元/集成、关键 E2E 和范围视觉复验已完成。
2. 阶段二——能力页与 IM v0.19 Review Gate：五个可见能力页面及 IM v0.19 已于 2026-08-24 完成用户验收。
3. 阶段三——事实源与 Evaluation 收口：旧 workspace 决策已标为被 D-023 替代；单课件、方案包和 IM 已接入 EvaluationEvent；完整证据链失败关闭，失败/重试历史不被覆盖，也不把执行成功解释为教学效果。
4. 阶段四——三渠道 Case Library 与下一阶段：Case 已分渠道盘点并给出优先级；后续路线经用户修订为先进入 M4.2–M4.5 Demo 完善阶段，M5–M10 暂停。

### H3. 已封存基线

#### H3.1 已完成的技术 Gate

- `npm run check`：TypeScript、ESLint、72 个 Vitest 文件 / 490 项测试全部通过；
- `npm run build`：生产构建通过；保留已知的约 1.23 MB 主 JS chunk 提醒；
- 关键浏览器回归：消息工作台与 M4.1 共 41 项 Chromium E2E 全部通过；
- 能力页与 IM 范围视觉：39 项通过、3 项 Dormant Module 按设计跳过；更新并稳定复跑本轮受影响的 2 张 IM 发送证据快照；
- Standards/Spec 双轴终局复审：均无剩余硬 finding；文本、代码与样式 diff whitespace 校验通过。

全仓旧视觉基线仍有独立维护债务：此前全量结果为 51 通过、3 跳过、90 失败，绝大部分是约 1% 的既有像素漂移；M4.1 视觉套件也在首帧出现约 2% 的既有漂移。未静默批量更新这些与本阶段无关的基线，仅更新并复验了本轮直接受影响的范围快照。

#### H3.2 产品 Gate 结论

封存所需产品 Gate 已完成：

- 五个可见能力页面完成用户 Review Gate；Content 继续按 D-051 保持 Dormant；
- WorkBuddy IM 与班级多 Agent 渠道 v0.19 完成用户 Review Gate。

已在 `codex/workbuddy-m3-shell` 分支以提交 `4c43c49` 封存并推送能力页面、IM v0.19、Evaluation 和阶段收尾基线。

### H4. 当时的路线：M4.2–M4.5

正式顺序：

1. **M4.2 — IM AI 入口地图与业务 Case 矩阵**：以角色、渠道、入口、AI 身份和 L1/L2/L3 能力层次补齐 Demo 场景表达；
2. **M4.3 — ClassIn 内嵌 MVP 入口与角色引导**：先理顺 ClassIn 内部的 WorkBuddy、班级 Agent、权限、入口和 MVP 能力范围；
3. **M4.4 — 独立 To-Teacher / To-C 产品入口**：再从内部已验证能力抽取外部获客与独立价值闭环；
4. **M4.5 — 全局 IA、UI、交互与 Demo Release Gate**：在结构稳定后统一收口体验和发布质量。

M4.3 先于 M4.4，避免外部产品入口在内部能力和角色体系未稳定时形成第二套模型。完整范围、依赖和 Gate 见 [M4.2–M4.5 Demo 完善路线](../04-specs/features/workbuddy-m4-demo-completion/README.md)。

M5–M10 保持 `PARKED`，已有文档和实现基础不删除；只有在 M4.5 完成后，经用户独立确认才恢复。

M4.2 最终工程证据：`npm run check` 84 个测试文件 / 555 项测试全通过；production build 通过；讲题最终话术、发送前预览、批准后链接、文件库、PA-01/DA-01、Agent 私聊授权目录/隔离历史/两阶段响应与新消息锚点，以及测验生成→试卷审阅→活动参数→草稿写回→课程详情编辑/发布的关键 E2E/a11y 均通过；受影响范围视觉基线通过并经人工复核。用户已于 2026-08-24 完成 M4.2 页面验收并授权版本封存。

M4.3 工程证据：`npm run check` 85 个测试文件 / 561 项测试与 production build 通过；131 项 Chromium E2E 均有绿色证据（最新并发全量 121 项通过，10 项拥塞失败随后逐项单 worker 复跑全部通过）；班级详情 1440×900、MVP WorkBuddy 1440×900/1024×640 及终局 WorkBuddy 精确视觉回归通过。用户已于 2026-08-25 完成页面验收并授权继续进入 M4.4。

M4.4 最终工程证据：PRD、Feature Spec、14 项 Tickets、实现追踪和双轴 Review 已闭环；全量 TypeScript/ESLint、92 个 Vitest 文件 / 585 项测试与 production build 通过；139 项 Chromium E2E/a11y 均有绿色证据（本轮并发全量 138 项通过，唯一既有消息转场时序用例在并发下读到首帧 `0s`，随后单 worker 精确复跑 1/1 通过）；Standalone 官网、注册、独立工作台、手动 Context、任务扣点、刷新恢复、零余额阻断、模拟会员到账、ClassIn 连接价值、账号级 Workspace 隔离、内容/文件资源独立闭环、独立测验保存和未登录 Guard 均有浏览器证据；1440×900 七个产品状态与 1024×640 工作台共 8 张基线稳定复跑通过。用户已于 2026-08-25 完成 M4.4 方案与页面 Review 并确认无问题；M4.4 可封存，M4.5 已具备正式启动条件。

M4.4 的内容生态关系已按 D-107 锁定：Standalone 与 ClassIn 在产品运行、账号和数据层继续隔离，但内容资源从生产起即遵循 TeacherIn 内容契约。未来连接动作只需要建立身份、权限、对象映射与受控写入，不需要再次转换内容格式；当前 Demo 仍不代表真实 TeacherIn API 已接通。项目总结统一引用 [TeacherIn 内容兼容与独立产品边界](../06-architecture/TEACHERIN-CONTENT-COMPATIBILITY.md)。
