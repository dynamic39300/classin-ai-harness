---
title: TeachBuddy IM 四项个性化学情服务 Feature Spec
status: IMPLEMENTED_WITH_DW_DERIVED_SAMPLE
triage: ready-for-agent
version: v1
date: 2026-09-08
---

# TeachBuddy IM 四项个性化学情服务 Feature Spec

## Problem Statement

教师在 IM 中频繁处理课程安排、出勤、作业、课堂反馈与学习困难，但现有 Sidecar 只有自由对话和通用消息草稿，无法稳定选择学生、课次、错题或周期，也无法把个人学情安全地转到对应 1v1。若页面直接拼业务字段或让模型自由决定发送对象，后续 DW Hunter 与 ClassIn API 接入会把数据库结构、权限和隐私规则泄漏到 UI，并可能公开个人证据。

## Solution

建立 `PersonalizedLearningService` Deep Module，统一承载四项能力的选择、证据捕获、DeepSeek 请求、结构化 Artifact 与交付计划。页面先读取最小 `LearningContextCatalog`，教师完成显式选择后再捕获 `LearningContextSnapshot`。模型继续使用 Thread 绑定的同一 Session，产物必须经解析校验和教师审阅。班级提醒可走群消息审批；个人回顾、错题和学情总结默认转到目标学生 1v1 Composer。

## User Stories

1. 作为群聊中的教师，我能看到四项任务并按当前班选择学生，使生成对象清楚且不离开消息现场。（IM-PRD-124、125）
2. 作为 1v1 中的教师，当前学生自动锁定，使我不必重复选择且不会误发给其他学生。（IM-PRD-125）
3. 作为教师，我能按课程安排、出勤、提交或批改原因生成提醒，并在发送前查看对象和依据。（IM-PRD-126）
4. 作为教师，我能选择课次和学生，获得包含课堂要点、个人关注与下一步的回顾。（IM-PRD-127）
5. 作为教师，我能选择一条错题，获得基于原题、作答、判定和知识点的解释与再练。（IM-PRD-128）
6. 作为教师，我能选择学生与周期，获得基于课堂、作业、互动和反馈的阶段总结。（IM-PRD-129）
7. 作为教师，我只看到稳定业务名称和状态，不需要理解底层数据库或数仓口径。（IM-PRD-130）
8. 作为教师，我得到的是可编辑、对象明确的结构化产物；模型没有按契约返回时系统要求重试。（IM-PRD-131）
9. 作为群聊中的教师，我生成个人学情内容后能一键转到该学生私聊 Composer，内容不会默认进入群聊。（IM-PRD-132）
10. 作为教师，我能把多人提醒留在当前群待审，也能把单人提醒转入 1v1。（IM-PRD-133）
11. 作为教师，我能修改产物正文和结构化内容，Approval 总是绑定最新版本。（IM-PRD-134、139）
12. 作为教师，我在读取、生成、过期、权限和交付失败时能恢复，切换会话不会串数据。（IM-PRD-135）
13. 作为产品负责人，我能从 Snapshot 证据判断固定场景与真实只读数据，未取得的数据不会被伪造。（IM-PRD-136、137）
14. 作为教师，我继续看到真实 DeepSeek 执行和自己的原始输入，不会把内部 Context 当成自己说的话。（IM-PRD-138）
15. 作为验收人，我能在群聊和 1v1 分别验证四项任务，并证明至少一个群消息审批和一个群转私聊闭环。（IM-PRD-140）

## Implementation Decisions

1. Domain 新增 `LearningCapability`、`LearningContextSelection`、`LearningContextSnapshot`、`PersonalizedLearningArtifact` 和 `DeliveryPlan`；不依赖 React、DOM、Mock 或数据库。
2. `BusinessContextAdapter` 增加 `listLearningContext` 与 `captureLearningContext`。目录只含选择器 ViewModel；详细证据只能在教师提交后按选择捕获。
3. Adapter 同时提供两个版本化 Scenario：高二物理固定场景内部标记 `truthLabel=fixed-demo`；DW Hunter 行级查询派生的“表达与思辨体验班”经过去标识化与业务事实压缩，标记 `truthLabel=read-only-business-data`。学生、课次、任务、练习和周期证据均使用稳定 ref。
4. 四项能力使用统一状态 `selecting / capturing / generating / review / delivering / delivered / recoverable_failure`，能力差异通过配置和 Artifact sections 表达。
5. 请求 Envelope 包含版本、能力、选择、证据、输出 JSON Schema 和教师附加要求。Timeline 的教师事件仅投影教师可见文本。
6. Artifact 解析验证 capability、recipientRefs、title、body、sections；不匹配时不创建可交付 Artifact。纯文本只作为恢复证据。
7. `DeliveryPlan` 由 Domain 计算：多人提醒允许 `current-class-review`；单人提醒允许教师选 1v1；其余三项强制 `student-direct-composer`。
8. Message Workspace 提供按稳定 Thread ref 插入 Composer 的 Interface，并在群转私聊时切换 URL。它不读取 Artifact 内容或敏感度。
9. DW Hunter 接入只读，并在数据进入仓库前完成分区时效、消息结构核验、最小化、化名和语义改写。产品契约只保留业务语义与非敏感来源引用；原始 UID、群 ID、姓名、正文、SQL 和凭据不得进入 Fixture。
10. 当前 DW 场景是一次查询后的冻结派生快照，不在页面加载时访问数仓。群成员/课程身份关系尚未完成生产校验，单侧联系人记录没有回执时必须显示“待确认”，不能推断未读或未完成。

## Testing Decisions

1. Domain 单测覆盖四项选择校验、请求构建、Artifact 解析、版本修订和渠道计划。
2. Adapter 契约测试覆盖群聊目录、1v1 锁定、最小证据、来源/时效/真值，以及错误 ref 拒绝。
3. Component 测试覆盖四卡、配置、需要补充、生成、审阅、返回修改、解析失败与 Composer 插入。
4. Integration 测试使用真实 Runtime Interface，不以固定回答替换 DeepSeek；群消息发送继续验证 Action/Approval/Receipt 幂等和过期检查。
5. 浏览器验收在 1440×900 和 384px Sidecar 验证无溢出、独立滚动、键盘选择、焦点恢复和状态播报。
6. 真实 DeepSeek 至少逐项生成一次；群聊验证提醒发送与个人内容转 1v1，1v1 验证当前学生锁定和手动发送 Gate。

## Out of Scope

- 自动发送、定时批量触达、学生作答后的自动闭环或家长渠道。
- 正式学习诊断、风险标签、长期学生画像或无治理记忆。
- 生产 ClassIn 写回、生产权限后台和真实客户数据持久化。
- 在页面展示 SQL、数据库实例/表、DW Hunter 查询细节或原始敏感聊天。
- 把四项能力拆成四个 Agent、要求教师选择模型或暴露内部 Skill/MCP。

## Further Notes

- 产品来源：[Notion 原始需求](https://app.notion.com/p/3d4a5c3b026b8012b602edd0efc07fe0?pvs=204)。
- 研究事实与 DW 限制见 `docs/01-research/IM-PERSONALIZED-TEACHING-COMMUNICATION-RESEARCH.md`。
- 本 Spec 接受 D-120 的 `BusinessContextAdapter` Seam，并按 D-121 加深为目录/证据两阶段 Interface。用户已明确授权按标准流程连续实施，因此无需在 Spec 发布与票据拆分之间再次等待确认。
