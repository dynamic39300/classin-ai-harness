---
title: 学生测验开始、保存、交卷与教师批阅合同
date: 2026-09-15
status: DOCUMENTED_SIGNED_FLOW_STUDENT_TOKEN_UNVERIFIED
scope: D-155 单测试学生测验结果验收前置研究；无业务写入
---

# 结论

当前 Apifox 与当前 qbank PC 前端能对应出“开始/继续 → 读取本人作答 → 保存 → 交卷 → 教师批阅”的接口。**它们采用客户端签名身份；本次没有找到使用学生登录票据 `Authorization` 调用这些测验接口的正式合同。** 作业 Web 登录票据已能用于作业，不足以证明能用于测验。不得拿教师 secret 对学生 UID 签名，也不得把 pageRole/visitRole 当作取得身份的方式。

本研究只读取 Apifox 定义和公开前端资源，没有签发票据、开始考试、保存答案、交卷、记录查看或批阅。当前目标映射为 LMS activity `54580428` → exam bizId `295579` → course `591820`；来源为[本轮既有教师逐题读取核验](./CLASSIN-EXAM-ANSWER-ROLE-CONTRACT-2026-09-15.md)，本研究没有重测其业务状态。

## 当前文档与调用链

2026-09-15 通过已登录 Apifox CLI 2.2.9 读取项目 345129/345131 的当前定义。下表 `/api/exam.api.php` 的完整调用由 query `action` 区分，不能将 activityId 当 examId。

| 步骤 | 方法与接口 | 关键字段 / 限制 | 一手定义 |
| --- | --- | --- | --- |
| 活动查看记录 | POST `/app/activity/exam/look`（LMS 服务路径） | activityId；这是记录行为的写接口，研究阶段未调用 | [345129/3477881](https://apifox.eeo-inc.com/project/345129/apis/api-3477881) |
| 考试基础信息 | POST `/api/exam.api.php?action=getExamInfo` | uid、examId、courseId | [345131/3473979](https://apifox.eeo-inc.com/project/345131/apis/api-3473979) |
| 开始/补考/继续 | POST `/api/exam.api.php?action=examineeOperation` | UID、examId、operation：1开始，2补考，3继续；preActivityClient=1 表示支持前置活动的新客户端 | [345131/3470589](https://apifox.eeo-inc.com/project/345131/apis/api-3470589) |
| 读取考题 | POST `/api/exam.api.php?action=getExamTopicList` | UID、topicIds、CITopicIds；题目 ID 从当前试卷取得 | [345131/3470602](https://apifox.eeo-inc.com/project/345131/apis/api-3470602) |
| 读取已有作答 | POST `/api/exam.api.php?action=getExamineeAnswer` | examId、studentIds 为 JSON 数值 UID 数组；必须限定本人，不省略读取所有学生 | [345131/3470598](https://apifox.eeo-inc.com/project/345131/apis/api-3470598) |
| 多设备检测 | POST `/api/exam.api.php?action=answerMonitor` | UID、examId、answerTime、deviceModel；可能返回 logout、另一个设备信息，不应视为纯查询保证 | [345131/3470590](https://apifox.eeo-inc.com/project/345131/apis/api-3470590) |
| 保存/交卷 | POST `/api/exam.api.php?action=submitPaper` | isExamEnd=2保存、1交卷；isAuto=0手动、1自动；answerInfo、eqUpTopics、answerTime、deviceModel | [345131/3470581](https://apifox.eeo-inc.com/project/345131/apis/api-3470581) |
| 教师批阅 | POST `/api/exam.api.php?action=reviewPapers` | examId、studentId、markingInfo、reviewTopics；学生必须已交卷；仅合法任课教师 | [345131/3470617](https://apifox.eeo-inc.com/project/345131/apis/api-3470617) |
| 教师结果回读 | POST `/api/exam.api.php?action=getAnswerMarkResult` | 当前教师 pageRole=1，限定 studentIds | [既有实测合同](./CLASSIN-EXAM-ANSWER-ROLE-CONTRACT-2026-09-15.md) |

Apifox 上述原生考试接口主要标为 `multipart/form-data`，公共鉴权使用 X-EEO-SIGN / X-EEO-TS / X-EEO-UID，部分历史定义仍列 signKey/timeStamp。它们没有列出学生 Authorization 票据方式。文档中旧示例和最新头生成逻辑存在差异，应以当前本人客户端合同进一步核验，不能依赖旧示例中的简化签名推导。

## 当前前端已证明的行为

当前[qbank PC 页面](https://wsevlf001.eeo.im/client/pages/qbank/pc/)载入以下脚本；本次重新下载并计算 SHA-256，内容与本轮已有私有快照一致：

| 脚本 | SHA-256 |
| --- | --- |
| pc-2026-8-24-17-57.js | 77ff88b3e43b3a3f3c25b9ee8fc226c5e28ed26781a9338ca4373d159bac0312 |
| chunk-fefc9376-2026-8-24-17-57.js | c128813b6d7c4fb16152934b05e95dfeba816fab8e230b0d9cf9df3a5d4352bb |
| chunk-78afcb22-2026-8-24-17-57.js | 3addc5854162d8855b446a07f78fa084f34896fe009236511dba2797a59f2ed4 |

公共请求层的 pageRole 为 teacher→1、其他→2；visitRole 仅在 apiRole 表示 AuditorTeacher/AuditorStudent 时设置203/215，普通学生分支不设置这两个旁听/监课值。当前有 generateHeaders 能力时会移除旧 signKey/timeStamp，再调用客户端生成头。TeacherIn 专用 X-EEO-TOKEN 分支的存在也不能证明作业学生票据能用于该分支。[公共请求层](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/pc-2026-8-24-17-57.js)。

`_getStudentExam` 实际调用 getExamineeAnswer；`_updateStudentExam` 调用 examineeOperation，只有页面算出的状态为1/2/3时才进行开始/补考/继续。开始接口成功 startTime 按秒转换为毫秒。保存/交卷的成功判断为 errno=1，不能照文档错误表中的“200请求成功”判断业务成功。[考试 mixin](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/chunk-fefc9376-2026-8-24-17-57.js)。

页面输入变化通过约1秒 debounce 保存（isExamEnd=2）；提交通过同一 submitPaper 请求但 isExamEnd=1。独立验收脚本不应复制自动保存循环，须让每个真实事件都可审计。页面的 answerTime 使用进入作答时的服务器时间；answerMonitor 文档明确毫秒，而 submitPaper 的历史示例为十位秒数，存在文档差异，需跟当前服务器时间函数/合法客户端实发请求核对。[作答页面](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/chunk-78afcb22-2026-8-24-17-57.js)。

## 五题型作答编码

answerInfo 整体为 JSON 数组字符串，每项携带真实 topicId、topicSource；题目来源必须沿当前试卷引用保留。

| 题型 | answer 值 | 约束 |
| --- | --- | --- |
| 1 单选 | `"3"` | optionId，不是字母 C |
| 2 多选 | `"1,2,3"` | 当前前端按数值排序并用逗号连接 |
| 3 判断 | `"1"` | 使用返回的 optionId；示例1正确、2错误，仍须核对本题选项 |
| 4 填空 | `["第一空","第二空"]` | 数组位置对应各空，不拼成单个字符串 |
| 5 问答 | `["完整解题过程"]` | 文档支持文本数组；图片编码不能仅凭文本题例子推断 |

当前前端对1/2/3去掉空选项并 join，其余保留数组；eqUpTopics 是 JSON 问答题 topicId 数组，当前实现收集所有问答题，也会递归收集综合题内问答题。不会向答案请求附加参考答案或题目正确率。[提交文档](https://apifox.eeo-inc.com/project/345131/apis/api-3470581)、[实际组包](https://wsevlf001.eeo.im/files/frontend/classin/qbank-pc/dist/static/js/chunk-fefc9376-2026-8-24-17-57.js)。

## 教师批阅合同与未解决差异

reviewPapers 文档将 judge 定义为1正确/2错误/3部分正确，填空/问答可能为数组；score 为分数×100，问答题要求传分数。markingInfo、reviewTopics 需要指向当前试卷的实际题目。文档同时出现“问答 judge 为数组”和“示例 judge 为标量1”的冲突，因此不能未经当前教师客户端核对就写入主观题批阅。judgeImg 有 imgAdd/imgDelete 图片批注结构，也存在对象/数组描述差异；本轮不生成或写入批阅图片。[批阅定义](https://apifox.eeo-inc.com/project/345131/apis/api-3470617)。

## 缺失合同与下一步条件

1. **学生身份通道未完成**：当前项目345129/345131按 web 路径检索未发现测验 Web token 端点。本结果仅覆盖这两个项目的检索，不声称全公司不存在。需要合法学生客户端生成头的接入方式，或接口所有者明确支持的学生票据鉴权合同；不要通过教师签名冒充学生。
2. **普通学生角色需本人实测**：getExamineeAnswer 文档把 visitRole 标为必填监课/旁听，而当前普通学生前端省略它。应使用本人身份与显式单 UID 验证，不能猜203/215补足。
3. **时间/设备字段需实发核对**：answerTime 秒/毫秒历史不一致；deviceModel 的 isClassRoom 当前检测请求明确整数0/1，某提交路径仍直接使用状态值。登录被另一端替换时应停止，不自动抢占重登。
4. **提交和批阅仍未实测**：本轮已证明文档、当前源码与参数编码，不证明可用票据实际贯通。获得合法身份后仍须 PRD→Spec→Tickets 明确单样本、ProposedAction、审批与回执，再逐层验证开始、保存、提交、教师读取和非零得分，不能将空答题槽当学习事件。

## 追加：本人登录与客户端签名能力的直接链路核对

2026-09-15 限定读取用户服务项目345322、零用户服务345326的直接相关登录定义。未调用任何登录、票据、token交换或刷新接口，未读取用户提供的密码或本机凭据。如下是当前定义，不是连通性结论。

| 候选链路 | 文档明确返回 / 要求 | 能否证明可用于学生测验 |
| --- | --- | --- |
| 345322/3497980 `/v2/app/user/login` | 接受 mobile/email、password/verificationCode；响应含本人 uid、bgToken（token/refreshToken/expires/expTime）、iceToken、familyJwt；没有 secret 字段。请求仍声明 X-EEO-SIGN、TS、DEVICE-MAP；requestBody是JSON但Content-Type头示例为form，需核对初次登录的合法头生成与编码 | 找到正规的本人账号登录定义；未证明登录前签名如何生成，也未证明返回bgToken在当前测验接口中的消费方式 |
| 345322/3494708 `/v2/web/mini/accountPwd` | account/passwd，强制腾讯图形验证verifyType/verifyToken；返回uid、login_ticket、到期时间等 | 返回的是小程序票据，没有客户端签名secret或bgToken；不能直接外推原生测验签名 |
| 345326/3494998 `/zero-user-wx/mini/rpc/getLoginTicket` | 内部RPC；给定uid返回login_ticket及账号展示信息 | 不是密码登录，也没有证明可将该ticket换为原生测验鉴权材料 |
| 345326/3498294 `/app/user/tokenExchange` | JSON token+uid；交换token须由服务端分配的appsecret生成，返回bgToken | token字段不是任意login_ticket；不能把老师secret、普通密码或公开Mock配置当该学生的appsecret |
| 345322/3497981 `/v2/app/user/refresh-token` | 使用已有refreshToken/uid，返回新token等；说明正常用户认证时X-EEO-TOKEN与X-EEO-UID必须同时传，本刷新接口则不应传这两个头 | 明确原生token身份存在；刷新接口不能作为首次取得本人身份的替代，不能单靠该备注声称测验接口已接通 |
| 345322/3497973 `/v2/web/auth/loginInAppWeb` | 统一登录页面返回jwt、业务domain、单独分配X-APP-ID，种植用户cookie；响应没有签名secret | 网站登录态不等于原生generateHeaders能力 |

来源：[客户端登录](https://apifox.eeo-inc.com/project/345322/apis/api-3497980)、[小程序密码登录](https://apifox.eeo-inc.com/project/345322/apis/api-3494708)、[小程序票据](https://apifox.eeo-inc.com/project/345326/apis/api-3494998)、[原生token交换](https://apifox.eeo-inc.com/project/345326/apis/api-3498294)、[原生token刷新](https://apifox.eeo-inc.com/project/345322/apis/api-3497981)、[Web登录态](https://apifox.eeo-inc.com/project/345322/apis/api-3497973)。另只读核对345326/3495280 `/sign/getJwt`，定义未提供可证明测验签名能力的响应结构，因此未把它延伸为身份替代路径。

当前 first-party classin-api 封装把 `generateHeaders` 直接映射为 `G("widget.generateHeaders")`、generateToken映射为 `G("widget.generateToken")`。这证明网页依赖原生客户端桥调用；没有在该公开封装中提供“用学生密码或login_ticket在外部脚本生成同等请求头”的正式实现。[实际桥封装](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-c63e0376.7324ddcf27d5116585e6.js)。

同页另一个公开 classin-api bundle 确实包含签名、tokenExchange与initSignConfig，但其实现明确为 `ClassInMock`，变量含 `_mockUid`、`_mockAppSecret`，同时提供simulateNotice等模拟操作。它不是“已登录学生客户端返回的身份材料”，不能从中取默认身份或密钥当真实学生凭据，也不能用公开Mock分支的成功请求认定本人登录链路完成。[Mock桥实现](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-ac309808.ea47ceeb2fc8b578e422.js)。

结论更新：缺少的并非“是否存在密码登录API”，该定义已经找到；缺少的是**合法初次客户端登录的头生成合同，以及本人bgToken/原生桥到当前测验请求的已验证映射**。在该连接缺口补齐前，继续保留测验写入未接通，不通过猜测签名、改UID、使用Mock身份或绕过图形验证来建立学习事件。
