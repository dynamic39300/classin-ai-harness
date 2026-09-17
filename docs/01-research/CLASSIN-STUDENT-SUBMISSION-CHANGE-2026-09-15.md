# 单学生提交变化联调记录

日期：2026-09-15，Asia/Shanghai。范围来自升级计划§6.7、PRD R3/R5/R6、Spec§12和CI-008f。仅当前授权测试课程首讲作业、一名此前未提交的用户自有测试学生；保留已审阅样本与另一名未提交学生。本报告不记录学生手机号、密码或登录票据。

## 当前证据

- Apifox345326/3494998：`/zero-user-wx/mini/rpc/getLoginTicket`；文档为表单，当前表单实测返回10000004且没有票据。仅据本任务2026-09-13既有成功执行记录定位JSON编码差异，重新使用教师JSON签名后返回`code=0`和有效票据。票据返回手机号与当前班级名单匹配，票据仅在进程内使用。
- Apifox345129/3490916：`/lms/web/activity/homework/userCheck`；目标作业权限实测`errno=1`。
- Apifox345129/3490886：`/lms/web/activity/homework/student/detail`；由教师活动详情取得shareParam，不传studentUid覆盖，学生默认身份返回目标UID与activityId，`errno=1`、status=0、无正文与附件。原生学生身份与教师身份没有混用。
- 首讲四题按当前API正文及两张实际下载题图核对。模拟答案明确带测试标识：动点相遇10/3秒、相遇点8/3；气温3℃和−8℃、温差11℃；混合运算−16；分类结果a−b为−7或−1。图片未再上传，当前拟提交为纯文本解答。

## 第一次请求与停止

Apifox345129/3490902的submit按文档发送必填字段，Authorization为raw票据；返回业务104。该码为通用失败，**尚不能确定是鉴权错误**。执行器没有自动重发。保留attempted.json；教师BFF版本与待交集合不变，随后用Bearer票据只读回查学生详情仍status=0、正文/附件为空。此时没有完成新提交，不能把C14标为通过。

历史成功请求使用Bearer前缀，并携带correct/wrong/admire三个0值。两者与本次存在差异，但历史记录仅为查证线索；当前请求合同由独立的一手前端研究补齐后再决定受控恢复。原始动作和正文hash保持不变，恢复要先证实未产生提交、保存拒绝回执并重新做权限/时间/状态检查，不清除或覆盖第一次attempt。

## 私有证据

`.runtime/private/classin-integration-int0-2026-09-14/student-submission-change/`：before-detail.json、两张当前题图、proposed-action.json、auth-probe.json、auth-probe-json.json、execution-probe.json、attempted.json、after-attempt-detail.json、reconcile-after-rejection.json、rejection-1.json。目录0700、文件0600；无票据持久化。业务数据未进入模型工具的写权限范围。


## 受控恢复与最终结果

核对[当前请求合同研究](./CLASSIN-STUDENT-SUBMIT-AUTH-CONTRACT-2026-09-15.md)后，操作者显式发起第2次请求：同一action、同一正文hash；Authorization采用历史已接受的Bearer格式，并显式传文档中的correct/wrong/admire=0（无标记）。原attempt和拒绝回执保留。提交前再次核验学生身份、班级、活动时间和未交状态。该组合实测submit返回errno=1，**不能单独据此认定此前104由前缀或某一字段导致**。

学生端回读status=1、正文与提交HTML完全一致；教师BFF回读同一学生为已提交待批阅。待交集合由2人变1人，仅移出本次目标学生；已审阅的原提交记录逐字段保持不变。未新增附件、未批改、未变更活动时间。此为明确标记的模拟测试作答，不能作为真实学情样本。

实际V2浏览器核对2人已提交、1人未交，随后通过AI消息助手提问“请查询第1讲作业当前的提交情况：已交几人，谁还没交？”。真实模型11.345秒完成，正确回答2人已交、剩余1名未交学生，人员集合和截止时间与API一致；页面无pageerror和横向溢出。没有点击或调用ClassIn IM发送。

运行脚本的同一attempt重复执行保护已用禁止网络的替身核验：在任何取数/写入前拒绝。此次不是通用学生登录或代交能力，教师BFF与模型工具没有获得写权限。

最终证据增加：attempted-2.json、execution-receipt.json、after-detail.json、model-running.json、model-result.json、ui-model-verification.json、ui-model.png。实际提交成功后不再重发；第1次业务拒绝和第2次接受分别可追溯。脚本语法与重复保护检查通过；本轮没有修改产品代码，无需把既有914项Vitest/20项Playwright重复运行当作新业务闭环证据。
