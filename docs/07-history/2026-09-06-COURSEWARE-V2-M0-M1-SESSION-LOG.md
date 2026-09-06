---
title: 课件生成 V2 M0-M1 Session 日志
status: SNAPSHOT_COMPLETE
version: v1.0
date: 2026-09-06
timezone: Asia/Shanghai
primary_session: 01a07277-d076-7353-99bc-d082f47fecea
scope: DeepSeek Harness 架构、Courseware V1、Courseware V2 内容优先路线、M0 基础资料、M1 V1 基线
---

# 课件生成 V2 M0-M1 Session 日志

## 1. 日志用途与边界

这份日志用于后续查询和回溯以下问题：

- 用户最初怎样描述目标、纠偏优先级和授权 Review；
- Harness、Courseware V1、Courseware V2、M0 与 M1 如何逐步形成；
- 模型在各阶段给出了什么关键判断；
- 哪些判断已经成为仓库事实，哪些仍只是讨论、Agent 试评或待人工校准；
- 每个阶段实际生成了哪些文档、评价集、Session、Artifact 和 Git 提交。

本日志是**历史索引和摘要**，不是新的产品 Spec，也不替代当前事实源。发生冲突时，以 `AGENTS.md` 规定的事实优先级、当前 Decision Ledger、已审阅 Spec、实现与测试为准。

### 1.1 收录规则

- `USER_PROMPT_VERBATIM`：保留可以确认由用户直接输入的原文，包括原有错别字、标点和链接。
- `USER_GOAL_OBJECTIVE`：Goal 续跑消息只保留其中由用户提供的 `<objective>` 原文，不复制系统自动添加的运行规则。
- `MODEL_RESPONSE_SUMMARY`：提炼模型回复中的关键判断，不把摘要伪装成逐字转录。
- `VERIFIED_ARTIFACT`：当前仓库中仍能定位的实际文件或 Git 对象。
- `DISCUSSION_ONLY`：历史会话中的建议，未自动升级为项目事实。

下列内容不作为“用户 Prompt 原文”收录：Codex 自动注入的推荐插件清单、`AGENTS.md`/环境上下文、Goal 运行规则、浏览器 ambient state、子 Agent 通知、工具输出和模型内部推理。

### 1.2 来源 Session

| 关系 | Session ID | 会话标题/主题 | 本日志用途 |
| --- | --- | --- | --- |
| PRIMARY | `01a07277-d076-7353-99bc-d082f47fecea` | 推进 M0 阶段准备工作 | M0 完成、M1 执行与封版、评分解释、人工校准建议、Git 提交 |
| DIRECT_PREDECESSOR | `01a06d13-ca47-7d73-82b5-0e49ccda8abf` | AI Harness/课件 V2 方案与 M0 前置推进 | 内容优先路线、M0 资料地图、教材与纵向证据、用户 Review |
| DIRECT_PREDECESSOR | `01a07003-6f46-7a81-a6b7-8959fba39e1f` | DeepSeek Harness 架构盘点 | Harness 基本盘、课件生产链、V1 文档与跨 Session 记忆边界 |
| RELATED_DISCUSSION | `6a9c056f-af14-83ec-b40b-4c50076b1f62` | 课件生产流程解析 | Brief→Plan→SlideSpec→Render→QA→Revision 的讨论来源 |
| RELATED_DISCUSSION | `6a9c3d01-f510-83ec-a454-f0cb0066d15f` | 推进裸 Agent 基座 | Runtime、Session、Tool、Tracing 先于教育 Skill 的讨论来源 |

本机原始 Codex rollout 可在以下位置按 Session ID 查找：

- `/Users/wangxinlei/.codex/sessions/2026/09/06/rollout-2026-09-06T00-47-29-01a07277-d076-7353-99bc-d082f47fecea.jsonl`
- `/Users/wangxinlei/.codex/sessions/2026/09/05/rollout-2026-09-05T13-21-08-01a07003-6f46-7a81-a6b7-8959fba39e1f.jsonl`
- `/Users/wangxinlei/.codex/sessions/` 下文件名包含 `01a06d13-ca47-7d73-82b5-0e49ccda8abf` 的多段 rollout。

## 2. 一页结论

### 2.1 形成的产品路线

1. 先理解并稳定运行 Harness、Session、Tool、Artifact 和可观察事件。
2. 把当前“一次 Prompt 直接生成整份 HTML”锁定为 Courseware Generation V1。
3. 不先追求 PPT 视觉形式，也不立刻引入自由协作多 Agent 群；Courseware V2 采用内容优先路线。
4. 先用 M0 建立课程标准、教材、纵向衔接、教师用书边界、学生认知、课例、题目、课堂约束和资源治理。
5. 用 M1 固定任务和量规跑真实 V1 基线，使后续 V2 优化有可比对证据。
6. M2 才开始 Knowledge Pack 与 Instructional Rules；Renderer/PPTAgent 在内容达到可复核 Gate 后再系统优化。

### 2.2 当前已验证状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| Courseware V1 基线定义 | `LOCKED` | 自然语言输入 → 通用 Persona/Session → 单 Agent 生成完整 HTML → `create_teaching_draft` |
| M0 | `COMPLETE_USER_REVIEWED` | M0-A 至 M0-J，权重与加权完成度 100% |
| M1 | `COMPLETE_USER_AUTHORIZED` | 用户授权阶段内 Review 默认通过；Agent 试评基线已封版 |
| M2 | `UNBLOCKED_NOT_STARTED` | 已解锁，尚未开始 |
| 教师/教研校准 | `DEFERRED_NOT_REQUIRED_FOR_M1_CLOSE` | 不能由本次用户授权或 Agent 评分冒充完成 |
| Git commit | `VERIFIED_LOCAL` | `cf5c202 docs(courseware): complete M0 and M1 baseline` |
| Git push | `PENDING_REMOTE_CONFIGURATION` | 当前仓库没有 remote，尚未推送 |

### 2.3 M1 基线数字

- 8 个固定 Case：4 个生成型，4 个澄清型。
- 生成型成功 3/4；C06 在 10 分钟停止边界超时。
- 四个生成型 Case 得分：C01 `57.5`、C05 `72.5`、C06 `0`、C07 `43.75`。
- 包含超时 0 分的平均：`43.44`；仅三个成功 Artifact 的平均：`57.92`。
- 澄清型 4/4 没有生成 Artifact，但 0/4 同时满足最少追问、事实准确和不补猜。
- 0/3 成功 Artifact 通过完整视觉 Gate；两个 Artifact 存在阻断级数学题图错误。
- 这些分数是 `AGENT_BASELINE`，不是教师评价、教研结论或课堂效果。

## 3. 历史会话与模型回复摘要

### 3.1 DeepSeek Harness 架构盘点

**来源**：`01a07003-6f46-7a81-a6b7-8959fba39e1f`

`MODEL_RESPONSE_SUMMARY`：

- 当前链路被梳理为 React 教师工作台 → 本机 BFF/Adapter → Cordis 组合的 DeepSeek Harness → 本地 Session/Artifact 持久化。
- 暴露给 TeachBuddy 的能力保持窄接口：多轮文本、受控 `create_teaching_draft`、停止/恢复、Artifact 和教师确认后的本地保存。
- 课件生产被拆为理解、教学设计、页面蓝图、内容/活动/素材、Renderer、真实截图、教学/规则/视觉 QA、有限 Revision、Artifact Version 和 Teacher Review。
- 当前 V1 实际不是 Skill 链或多 Agent，而是通用 Persona 与 Session 历史驱动单 Agent 一次性生成完整 HTML。
- “新会话无法读取旧会话”被定位为跨 Session 检索未挂载，不等同于持久化失败，也不等同于完整长期记忆不存在。

`VERIFIED_ARTIFACT`：

- [`prototype/architecture/deepseek-harness-overview.html`](../../prototype/architecture/deepseek-harness-overview.html)
- [`docs/06-architecture/COURSEWARE-GENERATION-V1-BASELINE.md`](../06-architecture/COURSEWARE-GENERATION-V1-BASELINE.md)
- [`docs/06-architecture/DEEPSEEK-HARNESS-INTEGRATION.md`](../06-architecture/DEEPSEEK-HARNESS-INTEGRATION.md)

### 3.2 Courseware V2 内容优先路线与 M0 前置

**来源**：`01a06d13-ca47-7d73-82b5-0e49ccda8abf`

`MODEL_RESPONSE_SUMMARY`：

- 用户明确纠偏：高质量教育课件的核心先是课程依据、知识结构、题目、讲解方式、学生认知和教学组织，视觉形式是内容达到一定水平后的增益。
- 方案从“先接 PPTAgent/开源 Renderer”调整为“先完成内容内核，再让表达层增益”。
- 第一条切片被收窄为中国公立小学三年级数学正式课堂；之后锁定为人教版三年级上册《分数的初步认识》第一课时、普通中等水平班、40 分钟。
- M0 不只是收集链接，而是建立十类资料的全局地图，并用来源清单、证据提取、边界协调和用户 Review 逐项关闭。
- 用户提供并审验第三方教材候选下载地址；项目只提取必要事实与定位，不把来源不明副本作为授权证明或仓库资产。
- M0-B、M0-C-01 与纵向衔接材料经过显式用户 Review；后续 M0 Review 在当前主 Session 中由用户委托授权关闭。

`VERIFIED_ARTIFACT`：

- [`docs/06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md`](../06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md)
- [`docs/04-specs/features/courseware-v2-grade3-math/M0-FOUNDATION-MATERIAL-MAP.md`](../04-specs/features/courseware-v2-grade3-math/M0-FOUNDATION-MATERIAL-MAP.md)
- [`docs/04-specs/features/courseware-v2-grade3-math/M0-SCOPE-AND-INPUT-PACKET.md`](../04-specs/features/courseware-v2-grade3-math/M0-SCOPE-AND-INPUT-PACKET.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-B-CURRICULUM-EVIDENCE-PACK.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-B-CURRICULUM-EVIDENCE-PACK.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-C-TEXTBOOK-CONTENT-MAP.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C-TEXTBOOK-CONTENT-MAP.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-VERTICAL-ALIGNMENT-MAP.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-VERTICAL-ALIGNMENT-MAP.md)

### 3.3 当前主 Session：M0 完成

**来源**：`01a07277-d076-7353-99bc-d082f47fecea`

`MODEL_RESPONSE_SUMMARY`：

- 用户授权 M0 内所有 Review 节点默认通过，要求持续执行到整个阶段完成。
- M0-C 完成收口；M0-D/E/F/G/H/I/J 分别完成教师用书边界、误区、课例、题目、课堂约束、资源治理和输入完整性。
- M0-D 因正式同版教师用书正文不可合法公开获取，保持 `LIMITED_SOURCE`，没有用低信任教案站补洞。
- 第三方教材、平台视频/截图、公开课照片和无来源网络素材保持 `UNKNOWN_BLOCKED` 或禁止进入模型/成品；首版素材优先使用原创参数化几何图、操作材料和原创题。
- 最终固定六个学习目标、40 分钟 LessonFlow、课堂活动契约、评价输入和资源白名单/阻断清单。
- 验证记录为 16 份 M0 文档本地链接无失效、十项权重与完成度 100%、样板题复算通过、670 项测试通过、生产构建通过。

`VERIFIED_ARTIFACT`：

- [`docs/04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md`](../04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-D-E-PRIMARY-RESEARCH-PACK.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-D-E-PRIMARY-RESEARCH-PACK.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-F-G-I-PRIMARY-RESEARCH-PACK.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-F-G-I-PRIMARY-RESEARCH-PACK.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-H-CLASSROOM-CONTEXT-PROFILE.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-H-CLASSROOM-CONTEXT-PROFILE.md)
- [`docs/01-research/COURSEWARE-V2-GRADE3-MATH-M0-SOURCE-REGISTER.md`](../01-research/COURSEWARE-V2-GRADE3-MATH-M0-SOURCE-REGISTER.md)

### 3.4 当前主 Session：M1 真实 V1 基线

`MODEL_RESPONSE_SUMMARY`：

- M1 明确不改 Persona、Tool 或产品代码，只建设可复现评价基线，避免污染 V1 对照组。
- 固定 8 个 Case 与六维 100 分 Rubric，视觉作为独立最低可用 Gate。
- 8 个 Case 顺序运行，保存真实 Session、Artifact、响应、耗时、超时和哈希；C06 失败不重跑、不覆盖。
- 1440×900 浏览器检查发现页面超高、字体偏小、页数膨胀与数学题图错误。
- 初次到达显式用户 Gate 后，用户通过持久 Goal 授权所有 M1 Review 默认确认；M1 因此封版为 `COMPLETE_USER_AUTHORIZED`，但没有伪写教师/教研校准。
- 最终审计验证 8/8 Case、8/8 Session、3/3 Artifact、任务集和逐 Case prompt 哈希、Artifact 哈希、评分聚合、100% 权重、Review Receipt、项目状态与实施计划一致。

`VERIFIED_ARTIFACT`：

- [`evaluation/courseware-v2-grade3-math/m1/tasks.json`](../../evaluation/courseware-v2-grade3-math/m1/tasks.json)
- [`evaluation/courseware-v2-grade3-math/m1/rubric.json`](../../evaluation/courseware-v2-grade3-math/m1/rubric.json)
- [`docs/04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md`](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md)
- [`prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/manifest.json`](../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/manifest.json)
- [`prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/evaluation.json`](../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/evaluation.json)
- [`scripts/run-courseware-v1-baseline.mjs`](../../scripts/run-courseware-v1-baseline.mjs)

### 3.5 相关 ChatGPT 讨论：课件生产流水线

**来源**：`6a9c056f-af14-83ec-b40b-4c50076b1f62`

`DISCUSSION_ONLY`：可见记录中主要保留了模型回复，未取得对应的用户原始 Prompt，因此不将反推内容列为用户原文。

`MODEL_RESPONSE_SUMMARY`：

- 建议将一次性生成拆为 `CoursewareBrief → Instructional Plan → SlideSpec → Content/Activity/Asset → Renderer → Screenshot → QA → Revision → Artifact Version → Teacher Review`。
- `CoursewareBrief` 是稳定任务契约，Instructional Plan 负责教学而非视觉，SlideSpec 是可局部修订的页面蓝图。
- Renderer 应保持确定性和可替换，PPTAgent/Presenton/PptxGenJS 可作为 Adapter，而不是成为整个产品架构。
- QA 应拆为规则、教学和视觉三类，并基于真实渲染截图；Revision 最多自动执行有限轮次，仍不通过则交给教师。

### 3.6 相关 ChatGPT 讨论：裸 Agent 基座

**来源**：`6a9c3d01-f510-83ec-a454-f0cb0066d15f`

`MODEL_RESPONSE_SUMMARY`：

- 裸 Agent 第一阶段需要模型接入、Agent Loop、Session、Tool、错误/恢复和 Tracing 六类能力。
- 顺序建议为 Runtime → 稳定会话/状态/Tool → Skill 加载 → 教育 Skill → TeachBuddy 产品体验。
- 会话中的 OpenAI Agents SDK/LangGraph 选型建议属于历史讨论，当前项目实际使用 DeepSeek Harness/Cordis，不把该建议写成现状事实。

## 4. 用户 Prompt 原文

### 4.1 Harness 架构 Session 原文

#### H-01

```text
好，我现在新开了一个对话窗口，我和你探讨一下 DeepSeek Harness（DVC Harness / DBC Harness）现在的整个实现结构。

后续我们会在这个基础架构之上不断叠加新功能。为了使我们的架构设计得更加合理、更加适配实际的业务场景，我希望对当前架构的基本盘有一个清晰的理解，搞清楚各有哪些模块以及模块之间的关系。

当前各个模块的技术演进非常前沿且更新及时，我也希望能够及时了解到一些有效的设计方法（无论算法策略、AI 实践还是基础设施建设），而这些都非常依赖于我们对现状有清晰的了解。

你能帮我把整个 Harness 的结构盘点一下吗？

1. 具体的框架
2. 每个功能模块实现的作用
3. 我们可以持续迭代衍生、开放更新的一些方面

可以以图文结合的形式来进行表达。
```

#### H-02

```text
你说的几点我给你做一个反馈：

1. 先补充上下文：我觉得可以先缓一缓。因为我并没有接入真实的业务数据 API，所以我先用语言表达的方式告诉你一些所需要的信息和字段内容，好吧？我们先用这种方式跑通链路流程，后续我会接入业务的 API。
2. 结构化的产物和评价：我觉得这个可以按照我们产出的方式来进行反馈和评价，这个没有问题。
3. 记录真实的业务动作：今天我实现的业务动作包括两个，一个是课件的生成，一个是测验试卷的生成。
4. 根据场景增加基础设施：我觉得这一点说得非常关键，但基于当前 DeepSeek-Harness 的结构，我们需要根据实际的业务需求场景再酌情讨论是不是添加一些基建，以及包括哪些基建。等我们遇到了实际问题，我们俩再探讨，好吧？
5. 有道理，专业的 Agent 也是很必要的一个闭环

以上你看看我是不是说清楚了？你还有什么疑问吗？
```

#### H-03

```text
我先不想进一步推进，还想再理解一下整体 DeepSeek-Harness 的结构。

你能把整个结构上面你给我列过的一个图形（流程图式的），帮我们形成一个 HTML 架构图吗？

这可以作为我们第一页讨论的 PPT。后续随着各个模块讨论的深入，我会进一步逐个展开：

1. 一方面结合行业内优秀实践的前沿案例、方法论，甚至一些论文的研究成果
2. 另一方面结合我们实际的业务场景需求，再因地制宜地进行改造，好吧？
```

#### H-04

```text
好，第一页 PPT 没有问题了，这是个全局的基础架构。

然后第二页我想让你帮我生成一下：如果我要模拟一个课件的生产流程，它会是怎样一个操作的链路图，以及涉及哪些功能模块？具体功能模块里要涉及一些具体的关键 feature（第一点、第二点、第三个 feature 分别是什么）。

你可以复用这张架构图，形成一条彩色的曲线来串联各个模块，并用不同的颜色标记每个环节的处理。

这可以作为我们的第二页或者第三页，如果你觉得需要更多的 PPT 页面去表达也可以，重点是把这个主题讲清楚
```

#### H-05

```text
好，接下来我们来探讨生成课件的。现在链路已经生成了 HTML 的课件，但是整个生成过程和方法是怎么做的？是使用 prompt，还是一系列 skill 的能力？
```

#### H-06

```text
好，我理解了。以上就是咱们第一版这套课件生成链路的基本方案，你可以作为咱们的 Version 1（最初期的版本）。

你把这个版本整理成一套详细的材料说明，然后落实到文档里边，后续我们会持续迭代。当前的水平我理解是一个 20 分的水平，我预计迭代之后能形成一个 75 分的水平，行吧？
```

#### H-07

```text
参考附件图片，我在跟他进行交流的时候，他竟然说自己没有记忆。

现在我们的 DeepSeek-Harness 这个底层的工程框架没有记忆能力吗？
```

### 4.2 Courseware V2 与 M0 前置 Session 原文

#### P-01

```text
1，/Users/wangxinlei/Documents/claudecode/classin-ai-harness/prototype/lui/LUI-DISCUSSION-AND-RESEARCH.md

2，/Users/wangxinlei/Documents/claudecode/classin-ai-harness/docs/06-architecture/COURSEWARE-GENERATION-V1-BASELINE.md

这两份文件是我刚才和大模型讨论的两个调研主题：

1，第一份文档是我对当前 Agent 聊天页面 UI 设计的梳理。我觉得当前的 UI 设计过于简单，只是非常基础的 Markdown 文字型信息流。经过调研，我们整理了市面上比较优秀的设计案例和思路，并做了一个设计 Demo。你可以查阅这些信息，我后续想对前端页面做个升级。

2，第二份文档是我们当前跑通的 DeepSeek-Harness 以及整个 WorkBuddy 在“课件生产”流程中的全链路过程。虽然已经跑通了，不过目前全链路的设计非常简单，基本只是基于 Prompt 生成。

在这个课件生产的过程中，我思考了一些点，很有启发：要基于老师的要求（人类的输入）输出高质量课件，决定因素到底是什么？我觉得主要有两点：

1. 业务规则输入：包括行业内的优秀经验和先验知识，这直接影响课件的产出质量。
2. Skill 的设计：它需要具备一定的规范逻辑与组织方式。这直接影响模型的思考，输出；

综合着两个维度，两部分信息输入给模型，我认为会对 PPT 课件的质量产生极大影响，但目前我还没有针对这两个维度的的一套很好的设计方法（当然，我也觉得其实还会有其他的维度，我这里没有想到。）

另外，从整个链路来看，单纯用 Prompt 的稳定性和质量显然不如一套 Skill 编排链路或多 Agent 架构。如何通过多 Agent 协同最终生成高质量课件，是一个很好的课题，但我目前缺乏成熟的技术架构设计思路。

以上文档里我也提到了，当前课件生成水平大概只有 20 到 30 分，我希望经过持续迭代，能提升到 75 到 80 分的水平。

以上是我的思路和想法，供你参考。我们可以借鉴教育行业成熟的技术方案，或者 GitHub 上高赞的经典案例，将它们迁移到我们的项目中。

补充：这两点之所以放在一起说，就是因为我想把这两点合并在一起推进：

1. 前端页面 UI 设计
2. 高质量课件生成链路的设计与架构

你理解我的意思后，看看我们接下来具体怎么实施
```

#### P-02

```text
这里不建议立刻上“自由协作的多 Agent 群”。课件生产是阶段明确、验收标准相对清晰的任务，先使用代码约束的工作流通常更稳定、更容易测试；Anthropic 也建议从简单、可组合的工作流开始，只在固定流程不足时增加 Agent 自主性。[Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)

第一版可以采用一个很合适的折中方案：

- Skill 规定教学设计与生成方法。
- 一组有状态工具强制执行 `Brief → Plan → Slides → Render → QA` 顺序。
- Harness 仍作为主 Agent 运行时。
- 工具产出的真实状态投影成 LUI 时间线事件。
- 后续把某个阶段替换为专业 Agent，不改变前端协议和产物模型。

这也符合 PPTAgent 的“先规划、再基于结构迭代编辑，并分别评价内容、设计和连贯性”的思路。[PPTAgent 论文](https://aclanthology.org/2025.emnlp-main.728/) DeepPresenter 进一步说明，评价应基于真正渲染出来的页面，而不仅是让模型检查自己的文本。[DeepPresenter](https://aclanthology.org/2026.findings-acl.1578/)

——以上这段我觉得你说的非常有见解。你帮我整理提炼一下观点，写入到我的 Project Notion 文档里边对应的相关位置，可以生成相应的 to-do，以便我后续跟进

[https://app.notion.com/p/honored-winner-xinlei/2-Action-Projects-3bda5c3b026b807b8a20eb704c3faac0?source=copy_link](https://app.notion.com/p/honored-winner-xinlei/2-Action-Projects-3bda5c3b026b807b8a20eb704c3faac0?source=copy_link)
```

#### P-03

```text
我非常认同你这套实施的顺序，还有上面提到的一些观点。

不过我想说的是，与其从 0 到 1 开始做，不如在各个 phase 阶段看看 GitHub 上有哪些非常优秀的案例，先搬过来拼凑成一条完整的链路。

我想先跑起来看效果，把水平从 30 分提升到 60-70 分。之后我们再看哪些环节需要人工做 artifact 输入和人工评价，或者再去针对性调优。这样借鉴别人成熟的方法和成功经验，会不会效率更高呢？而且，甚至在这个过程中，我们能够发现别人更好的一些思路，从而改善我们当前的设计链路。
```

#### P-04

```text
我看了你上面的思路，觉得有点偏离核心重点了。

生产教育行业的课件内容，最核心的应该是对教育行业业务的理解、知识点的梳理，包括 PPT 结构、相关题目的提炼以及讲解方式等素材和内容，思路的整理，最终形成一份 PPT。而你现在的思路其实偏向于优化呈现形式（比如 PPT 的格式怎么做体验更好），我并不觉得这是我们优先要关注的点，这样做反而舍本逐末了。

我觉得应该先把内核的内容做好，然后再靠调优相应的 PPTAgent 能力来提升品质。而且形式上的优化只是在做到七八十分之后，去提升剩下的 10 分或 15 分，并不是关键点。

你想一想，我们再探讨一下
```

#### P-05

```text
以上思路我非常认同。我觉得我们可以先选数学学科三年级课型（也就是正式上的公立校课程）
```

#### P-06

```text
你先把以上我们共识的实施计划形成一个详细的文档，里面要包含各个里程碑。接下来，我们再逐步来进行实施。
```

#### P-07

```text
好，接下来我们推进第一个阶段吧。你看看第一个阶段是什么？

1. 需要我来做什么？有什么输入？
2. 你觉得你可以做什么？
3. 包括我们可以做怎样的调研，参考一些行业内既有的成熟经验、GitHub 里面的优秀案例？
```

#### P-08

```text
好似
```

#### P-09

```text
是
```

#### P-10

```text
相关的教材，我在 GitHub 上找到了一个例子，是三年级数学的这本书，你可以查阅一下

[https://github.com/TapXWorld/ChinaTextbook/blob/master/%E5%B0%8F%E5%AD%A6/%E6%95%B0%E5%AD%A6/%E4%BA%BA%E6%95%99%E7%89%88/%E4%B9%89%E5%8A%A1%E6%95%99%E8%82%B2%E6%95%99%E7%A7%91%E4%B9%A6%20%C2%B7%20%E6%95%B0%E5%AD%A6%E4%B8%89%E5%B9%B4%E7%BA%A7%E4%B8%8A%E5%86%8C.pdf](https://github.com/TapXWorld/ChinaTextbook/blob/master/%E5%B0%8F%E5%AD%A6/%E6%95%B0%E5%AD%A6/%E4%BA%BA%E6%95%99%E7%89%88/%E4%B9%89%E5%8A%A1%E6%95%99%E8%82%B2%E6%95%99%E7%A7%91%E4%B9%A6%20%C2%B7%20%E6%95%B0%E5%AD%A6%E4%B8%89%E5%B9%B4%E7%BA%A7%E4%B8%8A%E5%86%8C.pdf)
```

#### P-11

```text
所以接下来还需要我输入什么东西呢？你觉得是一些人类的信息、人类的判断，以及典型的什么样的参考、优秀的例子呢？或者还有我没有想到的其他东西？
```

#### P-12

```text
我觉得先不要推进 M1，我们先聚焦 M0。我提供的这些材料范围非常广泛，而且要求的深度和精度其实也挺高的。

我觉得我们是不是可以做一些行业内的调研？找找行业内相关的资料，或者 GitHub 上也有一些物料和知识资源，对吧？这种方式会给我很大的辅助。

我们可以把 M0 里面要涉及的一系列资料、信息和数据整理成一个明确的清单，然后逐个研究、各个击破。我希望我们俩一起讨论协作来完成，如何？
```

#### P-13

```text
我觉得你的思路非常清楚。对这个 M0 阶段我们要完成的所有信息输入和资料组织，就像你列的 M0 资料地图一样，形成一个全局概念。

然后我们各个击破，形成一个又一个的里程碑，比如哪个里程碑完成、M0 基础资料建设进行中、完成度百分之多少等。我们用这种方式来各个击破地完成建设，行吗？

按这个思路来，可能大量资料需要你去调研，从网络上搜索，给我链接和相关信息；我来给你下载，进行人工审核和整理。但这里离不开你的先导性工作，行吧？

接下来我们按这个意思实施：你可以先沉淀一个地图性的文档，我们按照这个文档计划逐个推进；你觉得怎么样
```

#### P-14

```text
好，接下来继续推进，是不是对应的 M0B 剩下的 50%？
```

#### P-15

```text
全部同意！
```

#### P-16

```text
继续推进
```

#### P-17

```text
review完成，确认！
```

#### P-18

```text
**人教版数学二年级下册——确认下载地址没问题**\
**人教版数学五年级下册——确认下载地址没问题**
你可以从 GitHub 上下载，我已经审验完成了，请继续推进？\
```

### 4.3 当前 M0/M1 主 Session 原文

#### C-01

```text
/goal 确认，我已经review完成！

现在时间比较晚了，我准备睡觉了，所以请你继续推进， &#x20;

目标：完成接下来我们所有M0阶段的的准备工作。如果在执行过程中有需要我审阅确认的，你默认我审阅通过，都进行确认，直到把我们这一部分、这个阶段的里程碑全部完成。

你明白我的意思了吗？接下来请你开始吧。
```

#### C-02

```text
接下来继续推进
```

#### C-03（由 Goal 续跑机制携带的用户目标原文）

```text
请你把M1阶段，以目标模式推进产出！今天过程中，如果有需要我审阅的东西，一律可以默认确认。你经过研讨、有了产出之后，我再来审阅你最后的结果，好吧？

以目标模式全力推进完成！
```

#### C-04

```text
1. V1 生成成功率为 3/4；内容平均分 43.44——
```

#### C-05

```text
你觉得需要我辅助你做一轮人工评估吗？
```

#### C-06

```text
git commit & push
```

#### C-07

```text
你帮我把在这个会话 session 里面所有相关的一些历史 session 聊天内容、我的 prompt 原文，以及大模型所回复我的一些信息摘要和产出物提炼，全都生成一个 session 日志，保存到我们当前的项目目录之下，以备我们后续查询和回溯使用
```

### 4.4 相关裸 Agent Chat 原文

```text
你还在听吗？你继续在推进吗？
```

该 Prompt 对应的模型回复讨论了裸 Agent 六项基础能力和 Runtime→Skill→教育能力的实施顺序；它是方向讨论，不是当前仓库技术栈决策。

## 5. M1 Case 与产物索引

| Case | 预期 | 实际 | 内容分 | 关键发现 | 证据 |
| --- | --- | --- | ---: | --- | --- |
| M1-C01 | Artifact | Artifact | 57.5 | 三角形被二等分却标为 `1/4`；页面高度与小字号问题 | `prototype/.../M1-C01/` |
| M1-C02 | Clarification | Clarification | — | 正确问课时，但额外追问三个已可确定事项 | `prototype/.../M1-C02/session.json` |
| M1-C03 | Clarification | Clarification | — | 漏问学生水平，并提出可自行猜默认值 | `prototype/.../M1-C03/session.json` |
| M1-C04 | Clarification | Clarification | — | 识别冲突，但重新引入越界内容与错误年级判断 | `prototype/.../M1-C04/session.json` |
| M1-C05 | Artifact | Artifact | 72.5 | 无关键内容阻断；部分页面超高，时间含可选项才到 40 分钟 | `prototype/.../M1-C05/` |
| M1-C06 | Artifact | Failure/timeout | 0 | 10 分钟停止，无 Artifact；保留失败现场 | `prototype/.../M1-C06/session.json` |
| M1-C07 | Artifact | Artifact | 43.75 | 四分之一圆图答案写成一半；21 页；时间超过 40 分钟 | `prototype/.../M1-C07/` |
| M1-C08 | Clarification | Clarification | — | 把已核验的第八单元错误补猜成第七单元 | `prototype/.../M1-C08/session.json` |

完整相对路径根目录：`prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/`。

## 6. 用户人工评估建议

当前建议不是重新打开 M1 Gate，而是为 M2 校准评价尺子：

1. 用户盲评 C01、C05、C07；C06 只确认超时事实。
2. 六个维度独立评分：知识正确性、目标对齐、认知递进、讲解/例题/反例、活动反馈、完整性/时间。
3. 额外判断是否存在一票否决问题、是否达到可上课程度。
4. 对比 Agent 与用户分数，记录分歧原因。
5. 现有结果继续保存为 `AGENT_BASELINE`，人工结果新建为 `HUMAN_CALIBRATION`，不能覆盖原始基线。
6. 用户可以评价产品交付可用性；具体教法与课堂有效性仍需要教师/教研样本。

当前状态：`RECOMMENDED_NOT_STARTED`。

## 7. 验证、提交与未完成事项

### 7.1 已验证

- M0：本地链接、十项权重、加权完成度、Review 清单和题目复算通过。
- M1：8/8 Case、8/8 Session、3/3 Artifact、prompt/Artifact 哈希、评分重算和 Review Receipt 一致。
- 工程：TypeScript、ESLint、100 个测试文件/670 项测试、11 项 Harness 测试和生产构建通过；构建保留既有大 chunk 提示。
- 视觉：3 个成功 HTML 已在 1440×900 检查；该检查不证明课堂有效性或生产发布就绪。
- Git：课件相关 38 个文件已提交为 `cf5c202`。

### 7.2 仍未完成

- Git push：未配置 remote，需用户提供目标仓库 URL。
- 人工校准：尚未执行，不影响 M1 已授权关闭，但会提升 M2 优化依据的可信度。
- 教师/教研校准：后续质量 Gate；不能用产品负责人 Review 或 Agent 试评替代。
- M2 Knowledge Pack 与 Instructional Rules：已解锁，尚未启动。
- 正式同版教师用书：保持 `LIMITED_SOURCE`。
- 第三方材料复制、模型输入与再分发许可：未确认项保持 `UNKNOWN_BLOCKED`。

## 8. 后续检索关键词

`TeachBuddy`、`DeepSeek Harness`、`Cordis`、`Courseware V1`、`Courseware V2`、`M0`、`M1`、`M2`、`分数的初步认识`、`三年级数学`、`Knowledge Pack`、`Instructional Rules`、`CoursewareBrief`、`SlideSpec`、`Renderer`、`PPTAgent`、`Agent Baseline`、`Human Calibration`、`LIMITED_SOURCE`、`UNKNOWN_BLOCKED`、`cf5c202`。

## 9. 快速入口

- [当前项目状态](../00-project/CURRENT-STATUS-AND-NEXT-PLAN.md)
- [Decision Ledger](../00-project/DECISION-LEDGER.md)
- [Courseware V2 切片入口](../04-specs/features/courseware-v2-grade3-math/README.md)
- [M0 Readiness Report](../04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md)
- [M1 V1 Baseline Report](../04-specs/features/courseware-v2-grade3-math/M1-V1-BASELINE-REPORT.md)
- [M1 Task/Rubric 说明](../../evaluation/courseware-v2-grade3-math/m1/README.md)
- [M1 Manifest](../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/manifest.json)
- [M1 Evaluation](../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/evaluation.json)
