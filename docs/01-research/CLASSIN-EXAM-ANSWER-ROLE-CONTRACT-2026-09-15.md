---
title: ClassIn 测验逐题作答教师角色与读取合同
date: 2026-09-15
status: VERIFIED_READ_ONLY_CANARY
scope: D-155 当前授权测试教师、目标课程与三名已分配测试学生
---

# 结论

当前测试端一手前端代码明确将 URL 角色 `teacher` 映射为 **`pageRole=1`**，`getAnswerMarkResult` 的 API 路径为 **`/api/exam.api.php?action=getAnswerMarkResult`**。已用当前测试教师完成一次三人读取、一次单人读取，两次业务状态均为 **`error_info.errno=1`**。此前仅缺教师角色枚举的合同缺口已解决；已作答内容、批阅图片和综合题仍无本次真实样本，不能据此宣称完整作答生命周期已验证。

## 一手来源与调用链

1. [当前 six 页面](https://wsevlf001.eeo.im/client/lmsbleach/six/) 配置版本 `v609.202609142017.six.14`。其 [main-7bb72fec](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-7bb72fec.5a1d8b1d015b079cc448.js) 的活动 URL 映射将测验详情指向 `/client/lms/desktop/exam/detail`。
2. [LMS 测验详情](https://wsevlf001.eeo.im/client/lms/desktop/exam/detail) 当前版本 `v6.202609141506.prod`。其 [ExamDetail chunk](https://wsevlf001.eeo.im/files/frontend/classin/lms/dist/p__desktop__exam__exam-detail__ExamDetail.571b9c41.async.js) 的学生行操作通过当前 origin 的 `/client/pages/qbank/pc/` 打开 `routerTo: "ExamMark"`，并带 `courseId`、`activityId`、`role`、`studentId`。
3. [当前 qbank PC 页面](https://wsevlf001.eeo.im/client/pages/qbank/pc/) 版本 `vth.202608241752.qbank.14`，载入 [pc-2026-8-24-17-57.js](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/pc-2026-8-24-17-57.js)。以下偏移为下载后 UTF-8 解码字符串的零基字符偏移，便于在压缩单行文件中复核：

| 位置 | 一手代码表达的合同 |
| --- | --- |
| 1,122,489 | 公共请求层 `_["pageRole"]="teacher"===window.AppRoot.urlGetData.role?1:2` |
| 1,206,470 | 另一公共请求封装同样 `r.pageRole="teacher"===s.urlGetData.role?1:2` |
| 1,620,736 | `_getAnswerMarkResult` 定义 `url_api:"/api/exam.api.php?action=getAnswerMarkResult"`；`studentIds` 为数值化 UID 数组的 `JSON.stringify`；响应只在 `case 1` 进入成功转换 |
| 1,032,817 | LMS 活动转换构建 `activityId:e.id`、`courseId:e.courseId`、**`examId:e.bizId`**，三者不可互换 |

该 PC JS SHA-256：`77ff88b3e43b3a3f3c25b9ee8fc226c5e28ed26781a9338ca4373d159bac0312`。上述文件可能随前端发布更新，本次私有快照可复核。

[批阅 mixin chunk](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/chunk-fefc9376-2026-8-24-17-57.js) 中 `mixin_getAnswerMarkResult` 传入 `examId:this.examInfo.examId, studentIds:[e.studentId]`；批量版本把选中学生的 UID 收集为数组。没有根据 `visitRole` 猜教师权限，也没有调用批阅或提交写接口。

## Apifox 文档与实际请求

内部 Apifox 项目 **345131**、接口 **3470597**，名称“获取作答批阅结果详情”；已下载原文位于 `.runtime/private/classin-integration-int0-2026-09-14/lms/endpoint-3470597.json`。`pageRole` 在文档中只有“用户角色”，本次用所属前端补齐枚举。Apifox 把错误表成功写成 200，但响应成功示例为 errno 1；前端成功判断与两次实际响应均为 **errno 1**，不可把 HTTP 200 或业务 errno 200 当成功证据。

实际请求固定测试网关 `https://dynamic14.eeo.im`，通过 `reference/classin-api/scripts/classin_api.py` 完成签名，未输出凭据。表单合同：

| 字段 | 取值来源与约束 |
| --- | --- |
| `UID` | 当前服务端授权测试教师，与签名账号一致 |
| `examId` | 当前 scope 内 LMS 测验 `get.data.bizId` |
| `studentIds` | JSON 编码的**数值 UID 数组**；仅当前测验分配名单与授权班级学生的交集；不省略以免默认读取全部考生 |
| `pageRole` | 固定 1，来源为上述当前教师前端 |

读取前重新调用 `/lms/app/activity/exam/get`（JSON）与 `/lms/app/activity/exam/students`（表单），确认所属课程、活动 bizId 与分配学生。实际 canary：活动 `54580428` → `examId=295579`、课程 `591820`。测试账号和学生精确关联仅保存在私有证据中。

## 实测结果与语义

- 三人请求返回精确三名授权学生；单人请求返回精确一名指定学生，没有额外名单扩散。
- 每人返回 10 条 `markingInfo`，题目 ID 集合与该测验 `paperInfo.paper[].topicInfos[]` 完全一致。
- 当前题型为单选、多选、判断、填空、问答各两题；本次没有综合题。
- 三名学生的 LMS 状态均 `stStatus=0`；返回的全部 30 条记录均 **`isAnswer=2`（未参与）**。单选等答案是空字符串；填空/问答是 `['']`。`score=0`、`judgeResult=0` 或 `[0]` 均属于未参与记录，**不是已提交零分、答错或已批阅证据**。
- 后端预建 `studentExamId` 并返回空答题槽，因此“存在学生测验 ID / markingInfo 数组”不能代表学生已进入或提交。
- 实际返回未包含文档 schema 标成 required 的 `sysJudge`、`judge`、`judgeImg` 等字段；实现必须允许未出现，不得补造这些状态。

Apifox 字段定义可用于后续归一化：`isAnswer` 为 0 未作答、1 已作答、2 未参与；`judgeResult` 为 0 待批阅、1 正确、2 错误、3 部分正确；`score` 与 `sp` 为乘 100 的数值。当前样本不验证非零得分换算、已批阅状态或部分正确统计。应优先保留答题/批阅状态，只有满足已参与且评分成立的条件才展示实际得分和正确率。

## 私有证据与可复核边界

证据目录 `.runtime/private/classin-integration-int0-2026-09-14/exam-answer-role/`（目录 0700、文件 0600）：

- `index.html`、`exam-index.html`、`qbank-index.html` 及所述 JS：当前前端快照；
- `fresh-exam.json`、`fresh-students.json`：当次活动归属和分配名单；
- `answer-mark-result.json`：三名学生的原始响应；
- `answer-mark-single-student.json`：单人过滤响应；
- `manifest.json`：本次下载与只读响应快照摘要。

本次只读取当前已授权对象，无写业务数据。产品仍应先完成 PRD → Spec → Tickets 契约更新，再纳入 BFF：服务端重新校验 activity→bizId、学生范围、返回 examId、返回学生集合与题目集合；对未参与、空答案、待批阅、无评分分别表达。已作答文本/图片、综合题子题、已批阅非零得分及异常鉴权反例保留待验证，不能用本次未参与样本替代。
