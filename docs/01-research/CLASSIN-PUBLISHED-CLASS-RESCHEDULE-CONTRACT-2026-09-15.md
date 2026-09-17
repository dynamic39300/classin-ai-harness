---
title: 已发布课堂改期合同核对
date: 2026-09-15
status: WAITING_CONTRACT
truth_label: CURRENT_APIFOX_AND_TEST_API_READS_NO_WRITE
---

# 已发布课堂改期合同核对

对应PRD R2/R3/R6 → Feature Spec §18 → CI-005c。2026-09-15 04:18（Asia/Shanghai）重新读取当前文档和专用联调短课。本次没有调用编辑接口；不能把历史失败或文档错误码称为本次失败。

| 一手来源 | 当前证据 | 结论 |
| --- | --- | --- |
| Apifox私有实例，项目345129，接口3471073 | POST /app/activity/class/update，released，表单；必填时间、教师及课堂配置；列29142开始时间非法、29183结束时间非法、29184活动已发布 | 接口存在，但已发布课堂支持范围尚未实测确认 |
| 同接口分配字段 | courseId为可选array；course为可选JSON字符串，描述“同创建接口”；studentUids/isAllStudent为历史兼容字段 | 暂不猜测数组编码、字段省略或整表替换的语义 |
| Apifox接口3471132 | POST /app/activity/class/updateConfig，仅isAllowCheck、activityId、courseId、SID、login_uid等 | 不能用于修改时间 |
| Apifox接口3471043及测试课堂students读取 | 独立学生列表有且仅有三名已授权学生，identity均为1 | 当前分配完整，但不据此推断编辑请求语义 |
| 测试课堂get与V2 scene | 专用短课已发布、未开始，19:30–19:45，15分钟；课程仍54活动 | 当前数据可继续用于上午回归 |

当前课堂get的isAllStudent=1，创建时course[].isAllStudent=0；现有三学生列表一致。该差异可能涉及顶层与分班字段语义，但未取得证据，不判断为服务端错误，也不宣称显式学生配置已按请求逐字段保留。实际分配以独立students接口为当前事实。

历史9月14日改期记录中另一课堂曾返回104，原时间未变；历史最终采用新建替换。此事实不能证明本次接口必然失败，也不能作为本票删除重建的依据。当前目标是同一对象的改期一致性验证，因此保留合同门槛。

下一步需要接口维护方确认已发布在线课堂的支持路径、班级/学生分配保留方式及编辑是否自动通知。确认后按Spec补单次变更和恢复动作；成功后分别核对源详情、V2 scene/version、教学动态、新Context和真实模型草稿，再恢复原时段。普通IM发送仍为独立未完成项。

原始文档、详情、名单及快照只在忽略目录`.runtime/private/classin-integration-int0-2026-09-14/reschedule/`，权限目录0700/文件0600；公共记录不包含凭据或学生原始资料。本轮无应用代码变化，沿用CI-010c全量949项Vitest和28项Playwright证据；仅检查文档差异及本次读取结果。
