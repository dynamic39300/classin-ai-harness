---
title: 学生作业提交鉴权与空附件参数核对
date: 2026-09-15
status: PARTIAL_PRIMARY_SOURCE_VERIFIED
scope: CI-008f 单学生提交变化验收的只读合同研究
---

# 核对结论

当前 Apifox 的 Web 学生提交接口明确使用 `Authorization: {{ACCESS_TOKEN}}`，但没有说明该变量是否已包含 `Bearer `。本次查到的当前 Homework NX 学生端使用另一个 PC 提交接口，不能用它证明 Web 接口必须加 Bearer。本次未取得当前 Web 请求层的 Bearer 构造证据。

`errno=104` 只能确定为通用“操作失败请重试”，不能据此认定票据错误。Web 提交文档另列 `110144000`（请先登录）、`110144001`（请重新登录）、`110144002`（鉴权失败）。不能把“更换前缀后再次请求”描述为已定位的根因修复。[Apifox 接口 3490902](https://apifox.eeo-inc.com/project/345129/apis/api-3490902)、[当前 PC 通用错误文案](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-84781932.28032ba7c0d75741ab65.js)。

## Web 提交文档

源：Apifox 项目 345129，接口 3490902；本机导出 `lms/student-submit-definition.json`（位于受限且被 Git 忽略的本轮证据目录）。导出时间 `2026-09-14T17:54:20.708Z`，定义更新时间 `2024-09-05T07:08:16.000Z`，当前开发状态仍标为 `developing`。

| 项目 | 定义所证明的内容 |
| --- | --- |
| 方法与路径 | POST `/lms/web/activity/homework/student/submit` |
| 编码 | `application/x-www-form-urlencoded` |
| 必填 | activityId、description、image、video、audio、docs、info |
| 附件 | image/video/audio/docs 为 JSON 数组字符串；本次文本样本使用 `[]`，不构造不存在的文件 |
| info 例子 | `{"type":"postHomeworkDoInfo","role":"student"}` |
| 可选 | correct、wrong、admire，integer；定义没有将它们标为必填 |
| 鉴权 | Authorization 的示例为 `{{ACCESS_TOKEN}}`；签名公共头被禁用 |

因此，遗漏三个可选计数是否会触发当前服务端 104，文档不能证明。历史成功请求显式传零，最多是受控恢复的候选差异，不应改写为“接口规定必填”。同样，文档未规定 `belittle`，不能仅凭 PC 页面实现向 Web 请求追加字段。[Apifox 接口 3490902](https://apifox.eeo-inc.com/project/345129/apis/api-3490902)。

## 当前一手前端的参数语义与边界

从当前[Homework 学生页面](https://wsevlf001.eeo.im/client/lmsbleach/homework/student/detail)读取的配置为 `v202609141510.homework.14`，动态网关为 `dynamic14.eeo.im`。页面公开脚本及其 runtime 引用的懒加载脚本形成以下调用链：

1. `7201.39835379528ff4b6.chunk.js`，module 58040 的 `onSubmit`：用附件统计 `mE(files)` 构造 correct、wrong、admire、belittle；附加 studentUid/courseId，并生成 `info`。
2. `741.94f05c37ab0dc5ec.chunk.js` 的附件图标聚合器：累加 right/wrong/like/hate；初始值为四项零。空附件没有任何图标，因此计数零。**这些是附件批注图标计数，不能当作学习正确率或批阅成绩。**
3. `1131.9f4170827773ef94.chunk.js`，module 20038 的 `submitHomework` 调用 module 25942 的 `QI`，最终为 `homework.api.php?action=ReferHomeworkStudents`。同一模块的学生详情使用 `/lms/app/activity/homework/student/detail`。

来源：[提交构造](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-homework/dist/static/js/7201.39835379528ff4b6.chunk.js)、[图标计数](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-homework/dist/static/js/741.94f05c37ab0dc5ec.chunk.js)、[最终调用](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-homework/dist/static/js/1131.9f4170827773ef94.chunk.js)。

当前 PC `info` 还包含 `action:"error"`、`status:"<原状态>to1"`、`content:{messageChangeTo:"",contextChangeTo:"",imgListChangeTo:""}`。`action:"error"` 是当前源代码中的实际字面量，不能把它解读为接口提交失败。PC 使用 `stu_homework_id`、`content` 等字段，Web 文档则使用 activityId、description；二者不能直接混用。[提交构造](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-homework/dist/static/js/7201.39835379528ff4b6.chunk.js)。

## 本次研究完成边界

- 已核对 Web 文档、通用 104 文案、当前 PC 空附件计数及最终接口。
- 未找到当前 Web 前端设置 `Authorization: Bearer <ticket>` 的代码；Bearer 必需性仍为 UNKNOWN。
- 未取得 104 对应的服务端内部日志，不能确定是参数、存储、身份还是其他分支。
- 本研究没有签发票据、调用提交/草稿/批阅等写接口，也没有读取或输出账号凭据；只读取公开脚本与已有接口定义。
- 受控恢复如执行，须由 CI-008f 保留第一次失败回执、先回读确认没有落库，然后明确记录修改的请求字段及单次执行结果。成功后仍不能从多个同时变化的字段中断言唯一原因；学生、教师、BFF、模型四层回读分别验收。
