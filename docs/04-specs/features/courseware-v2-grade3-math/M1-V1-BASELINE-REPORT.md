---
title: 三年级数学课件生成 V2 M1 固定任务、量规与 V1 基线报告
status: COMPLETE_USER_AUTHORIZED
version: v1.0
date: 2026-09-06
milestone: M1
baseline: Courseware Generation Version 1
follow_up: PENDING
---

# M1 固定任务、量规与 V1 基线报告

## 1. 阶段结论

M1 的 8 个固定任务、Rubric v0.1、真实 Harness V1 运行快照、Agent 试评和 1440×900 视觉检查均已完成。当前结论为：

> **M1 COMPLETE_USER_AUTHORIZED; V1 content gate failed; M2 is technically unblocked and currently PENDING under D-158.**

这不是坏结果。M1 的目的就是在修改生成方法之前建立可复现比较基线。当前证据已经足以解释 V1 的主要失分，并能把教学内容、输入澄清、运行可靠性和视觉表达问题分开。用户于 2026-09-06 明确授权 M1 过程中所有需要审阅的事项默认确认，并在产出完成后统一复审最终结果；据此 M1 显式 Gate 已关闭，M2 已解锁但尚未启动。

首轮评分者为 Codex，角色是依据 M0 固定课程合同进行证据试评，不是教师或教研人员。以下分数不能解释为真实课堂效果。用户授权接受的是 M1 对照基线和阶段 Gate，不等于教师/教研专业量规已经完成校准。

> **后续状态（2026-09-16）**：用户当前暂不投入精力跟进课件路线，M1 最终复审、教师/教研校准和 M2 启动统一标记为 `PENDING`。M1 的完成状态、原始 Session、Artifact、失败、哈希和评分继续冻结，不因暂缓而回退或改写。

## 2. Write Set 与不变项

本轮新增：

- [固定任务集与 Rubric](../../../../evaluation/courseware-v2-grade3-math/m1/README.md)；
- [真实 V1 运行 Manifest](../../../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/manifest.json)；
- [逐 Case 试评数据](../../../../prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06-v1/evaluation.json)；
- 3 份 HTML Artifact、8 份 Session 投影和 1 份超时停止证据；
- 可复跑脚本 `scripts/run-courseware-v1-baseline.mjs`。

本轮没有修改 V1 Persona、`create_teaching_draft`、模型配置、BFF、产品页面或既有 Session/Artifact Interface，也没有自动批准任何 Artifact。第三方受限资料没有进入 Prompt 或产物。

## 3. 固定任务覆盖

| Case | 变化轴 | 预期 | 真实结果 | 处置结论 |
| --- | --- | --- | --- | --- |
| M1-C01 | 完整输入 | HTML Artifact | 268.3 秒，生成 1 份 Artifact | 处置符合；内容有阻断错误 |
| M1-C02 | 缺少课时长度 | 最少澄清 | 2.1 秒，无 Artifact | 停止正确；多问 3 项 |
| M1-C03 | 缺少班级画像 | 最少澄清 | 16.2 秒，无 Artifact | 停止正确；遗漏学情且提出默认猜测 |
| M1-C04 | 教师要求与范围冲突 | 指出冲突 | 18.3 秒，无 Artifact | 冲突识别正确；范围与年级事实不可靠 |
| M1-C05 | 修复有问题的旧课件 | HTML Artifact | 382.0 秒，生成 1 份 Artifact | 本轮内容最佳；仍未过视觉 Gate |
| M1-C06 | 加强操作活动 | HTML Artifact | 600 秒超时，停止，无 Artifact | 运行失败 |
| M1-C07 | 40 分钟内增加练习 | HTML Artifact | 221.0 秒，生成 1 份 Artifact | 图形答案错误且时间超额 |
| M1-C08 | 教材与课题不明确 | 最少澄清 | 12.2 秒，无 Artifact | 停止正确；编造教材单元位置 |

运行后复核 8/8 Session 均为终态；3/4 生成型任务成功，4/4 澄清型任务未生成 Artifact，1/4 生成型任务触发 10 分钟上限。成功生成型任务的中位耗时为 268.3 秒，澄清型任务的中位耗时为 14.2 秒。

## 4. Rubric v0.1

内容分沿既定六维和权重计算，每维使用 0–4 锚点：

| 维度 | 权重 |
| --- | ---: |
| 知识与题目正确性 | 25 |
| 教学目标对齐 | 20 |
| 认知与难度递进 | 15 |
| 讲解、示例与反例质量 | 15 |
| 课堂活动与反馈 | 15 |
| 完整性与时间可执行性 | 10 |

数学概念/答案错误、把非平均分图判为单位分数、接受范围冲突、编造教材事实或冒充生产能力属于阻断错误。视觉不计入内容分，单独检查 1440×900 可读性、溢出、答案泄露和图形语义；四项全部满足才为 `PASS`。

量规完整字段、锚点与评分公式见 [rubric.json](../../../../evaluation/courseware-v2-grade3-math/m1/rubric.json)。当前状态为 `ACCEPTED_FOR_M1_COMPARISON_USER_AUTHORIZED`；后续教师/教研试评如需调整权重，必须形成新版本，不能覆盖本次 V1 对照基线。

## 5. 试评分数

| Case | 正确性 | 目标 | 递进 | 讲解/例反例 | 活动/反馈 | 完整/时间 | 加权内容分 | 阻断错误 | 视觉 Gate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| M1-C01 | 0 | 4 | 3 | 2 | 3 | 3 | 57.50 | 有 | `FAIL` |
| M1-C05 | 3 | 3 | 3 | 3 | 3 | 2 | 72.50 | 无 | `FAIL` |
| M1-C06 | 0 | 0 | 0 | 0 | 0 | 0 | 0.00 | 超时无产物 | `N/A` |
| M1-C07 | 0 | 3 | 3 | 2 | 2 | 1 | 43.75 | 有 | `FAIL` |

四个预期生成型 Case 的平均内容分为 **43.44**。该数字是首轮固定任务量规结果，不等同于项目文档中的 20/75 成熟度坐标，也不是对真实学生学习效果的测量。三个成功生成的 Artifact 中，课堂可直接使用的数量为 **0**。

澄清型任务在“是否停下来”这一层为 4/4，但同时满足最少追问、事实准确、保留未知和不自行假设的为 0/4。

## 6. 阻断证据

### 6.1 数学图形与答案脱节

- M1-C01 的跨外形页把三角形只分成两个等面积部分并涂其中一半，却标作 `1/4`，答案又宣称四个图都平均分成 4 份；
- M1-C07 的第一道平均分判断题画出圆的四分之一扇形，答案却写成“平均分，每份是 `1/2`”。

这两项都不是版式偏好，而是阻断课堂使用的数学错误。它们说明 V1 的 HTML/SVG 生成与答案校验没有共享同一结构化题目事实。

### 6.2 教材边界在澄清阶段被编造

- M1-C04 能识别教师要求过多，但把本项目明确排除的“几分之几”重新放回首课流程，并给出未受 M0 证据支持的年级归属；
- M1-C08 本应只保留未知并提问，却断言三年级上册分数位于“第七单元”，与已核验的 2022 年第 2 版第八单元冲突。

因此 V1 的“会追问”不能等同于“追问内容可靠”。

### 6.3 时间标签没有形成可计算约束

- M1-C07 的活动表在不含可选比较时约为 43 分钟，包含时约为 45 分钟，却宣称总时长 40 分钟；
- M1-C05 的必做活动合计 38 分钟，只有执行本应条件化的 2 分钟比较才达到 40 分钟。

V1 可以复述时间要求，但没有确定性地复算并约束 `LessonFlow`。

### 6.4 一次性完整 HTML 生成存在上限

M1-C06 在 600 秒内没有产生 Agent 正文或 Tool Artifact；运行器按正式边界请求停止，最终状态为 `stopped`。该失败不证明模型永远不能完成同类任务，但足以证明当前“一次生成整份 HTML”的首轮成功率不是 100%。

## 7. 内容问题与视觉问题分离

| 类型 | 主要证据 | 后续责任位置 |
| --- | --- | --- |
| 内容正确性 | C01/C07 图形与答案冲突 | M2 Knowledge/Rule，M3 QuestionSpec，M4 检查闭环 |
| 课程范围 | C04/C08 编造或错置教材事实 | M2 Knowledge Pack 与来源/UNKNOWN 规则 |
| 教学组织 | C07 时间总和超限；C02/C03 追问不最小 | M2 Instructional Rules，M3 Brief/LessonFlow |
| 运行可靠性 | C06 10 分钟超时无 Artifact | M3 分阶段状态与 Tool 契约，M5 Harness 纵向切片 |
| 视觉表达 | C01 13/15 屏、C05 3/10 屏超过单屏高度；C07 21 屏过度稀疏 | 内容 Gate 后的 SlideInstruction/Renderer，不用视觉改动掩盖内容错误 |

三个 HTML 都没有脚本、外部资源或横向溢出，文件名和自包含约束为 3/3；但没有一份同时通过内容阻断与视觉 Gate。C01 的最小可见叶节点字号为 13.6px，且 13/15 屏高于 900px；C05 有 3/10 屏高于 900px；C07 的 21 屏都能装入视口，但包含错误数学图形并产生课堂节奏膨胀。

## 8. M1 Gate

| Gate | 状态 | 说明 |
| --- | --- | --- |
| 固定任务冻结 | `COMPLETE` | 8 个 Case、输入哈希和预期处置已保存 |
| V1 真实基线 | `COMPLETE_WITH_FAILURE_EVIDENCE` | 8 个 Session、3 个 Artifact、1 个超时停止事实可追溯 |
| Rubric v0.1 试评 | `COMPLETE_AGENT_TRIAL` | 六维评分、阻断规则、视觉 Gate 和分歧边界已执行 |
| 失分解释 | `COMPLETE` | 可区分内容、课程事实、教学组织、运行与视觉问题 |
| 教师/教研校准 | `DEFERRED_NOT_REQUIRED_FOR_M1_CLOSE` | 当前没有教师或教研人员样本；继续作为 M7 真实质量 Gate，不得伪装为已完成 |
| 用户 Review | `COMPLETE_BY_DELEGATED_AUTHORIZATION` | 用户授权 M1 过程中所有审阅默认确认，最终结果交付后统一复审 |

**阶段判定**：`M1 COMPLETE_USER_AUTHORIZED`。M2 的技术前置已经满足；当前项目优先级判定为 `FOLLOW_UP_AND_M2_PENDING`（D-158）。

## 9. 用户授权与 Review Receipt

用户于 2026-09-06 要求 M1 以目标模式全力推进，并授权执行过程中所有需要审阅的事项默认确认；用户将在产出完成后统一复审最终结果。依据该授权，本阶段记录以下 Receipt：

- [x] 接受 8 个固定任务作为后续 V1/V2 对照集；
- [x] 接受六维权重、0–4 锚点、阻断错误和独立视觉 Gate 作为 M1 Rubric v0.1；
- [x] 接受首轮 Agent 试评的基线结论，并保留“不是教师/教研评价”的边界；
- [x] 接受 M2 优先解决知识来源、题图答案一致性、时间约束与最少追问，不先优化视觉；
- [x] 接受真实教师/教研校准继续作为后续质量 Gate，而不是在 M1 被虚构为已完成。

本 Receipt 关闭 M1 Gate；用户最终复审若提出调整，应新增 Rubric 或任务集版本并保留本次基线，不静默改写原始评分和运行证据。

## 10. 验证记录

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| 固定任务真实运行 | `PASS_WITH_ONE_RECORDED_FAILURE` | 8 个独立 Session；C06 超时停止是基线结果，不是检查遗漏 |
| JSON、评分与哈希 | `PASS` | 4 份 JSON 可解析；4 个 Case 分数可复算；3 个 Artifact SHA-256 与 Manifest 一致 |
| 本地 Markdown 链接 | `PASS` | 9 个 M0/M1 当前事实文件无失效本地链接 |
| HTML 静态边界 | `PASS` | 3/3 自包含、无脚本、无外部资源、文件名正确、无横向溢出 |
| 1440×900 视觉检查 | `FAIL_AS_BASELINE_RESULT` | 0/3 通过完整视觉 Gate；失败已进入评分，不修改 V1 产物 |
| `node --check scripts/run-courseware-v1-baseline.mjs` | `PASS` | 运行器语法通过；C02 冒烟 Case 成功复现澄清流程 |
| `npm run test:harness` | `PASS` | 11/11 Harness 测试通过 |
| `npm run check` | `PASS` | TypeScript、ESLint、100 个测试文件共 670 项测试通过 |
| `npm run build` | `PASS_WITH_EXISTING_WARNING` | Vite 构建通过；保留大于 500 kB 的既有 chunk 提示 |
| `git diff --check` | `PASS` | 无空白或补丁格式错误 |

这些验证证明评价集、运行证据和当前工程 Gate 可复核；它们不把 Agent 试评分数升级为教师结论，也不证明真实课堂效果。
