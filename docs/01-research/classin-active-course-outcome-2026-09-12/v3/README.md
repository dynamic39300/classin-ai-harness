# v3 查询与结果索引

[业务报告](../../CLASSIN-ACTIVE-COURSE-TEACHING-CHAIN-ANALYSIS-2026-09-13.md) · [质量与指标边界](./QUALITY.md)

本目录保存只读 SELECT 查询及无身份字段的聚合结果。窗口固定为 2026-09-05 至 2026-09-11；不要直接复用到其他日期。每个 JSON 标注实际成功引擎、返回行数与截断标志。

## 复跑顺序

1. v3mapping_quality、v3frame：确认总体和映射；v3frame_check 独立复核。
2. v3coverage_2–6、v3coverage_other、v3combinations：课程配套及组合；v3org_2、v3org_3_optimized：机构所有/部分/无覆盖。
3. v3events_2–6：本周使用；v3feedback_2–3：同周提交后的批阅事件。
4. v3hw_started_summary、v3hw_due：本周开始作业的主表汇总；v3hw_bounds：验证扫描边界。
5. v3hw_student_current、v3hw_due_reconcile：明细质量与逐作业对账；v3hw_verified_chain：主报告采用的闭环。
6. v3hw_week_students：去重学生规模；v3materials_summary：资料主表累计查看；v3hw_score_distribution：只作评分语义排查。

学生查询使用已查证的 homework_id 范围优化。更换窗口或快照前先重算 v3hw_bounds，并修改后续范围；不得仅改日期留下旧边界。查询不含 SET、不调整超时、不写表。主表汇总与学生明细不相等时，沿用对账门禁，不能用汇总填补明细。

## 成功查询

| 查询 | 聚合结果 | 成功引擎 | 返回行数 |
| --- | --- | --- | ---: |
| [v3frame.sql](./v3frame.sql) | [结果](./v3frame.json) | starrocks_warehouse | 1 |
| [v3frame_check.sql](./v3frame_check.sql) | [结果](./v3frame_check.json) | starrocks_warehouse | 1 |
| [v3mapping_quality.sql](./v3mapping_quality.sql) | [结果](./v3mapping_quality.json) | impala_warehouse | 1 |
| [v3coverage_2.sql](./v3coverage_2.sql) | [结果](./v3coverage_2.json) | starrocks_warehouse | 1 |
| [v3events_2.sql](./v3events_2.sql) | [结果](./v3events_2.json) | starrocks_warehouse | 2 |
| [v3coverage_3.sql](./v3coverage_3.sql) | [结果](./v3coverage_3.json) | starrocks_warehouse | 1 |
| [v3events_3.sql](./v3events_3.sql) | [结果](./v3events_3.json) | starrocks_warehouse | 3 |
| [v3coverage_4.sql](./v3coverage_4.sql) | [结果](./v3coverage_4.json) | starrocks_warehouse | 1 |
| [v3events_4.sql](./v3events_4.sql) | [结果](./v3events_4.json) | starrocks_warehouse | 1 |
| [v3coverage_5.sql](./v3coverage_5.sql) | [结果](./v3coverage_5.json) | starrocks_warehouse | 1 |
| [v3events_5.sql](./v3events_5.sql) | [结果](./v3events_5.json) | starrocks_warehouse | 1 |
| [v3coverage_6.sql](./v3coverage_6.sql) | [结果](./v3coverage_6.json) | starrocks_warehouse | 1 |
| [v3events_6.sql](./v3events_6.sql) | [结果](./v3events_6.json) | starrocks_warehouse | 2 |
| [v3coverage_other.sql](./v3coverage_other.sql) | [结果](./v3coverage_other.json) | impala_warehouse | 9 |
| [v3combinations.sql](./v3combinations.sql) | [结果](./v3combinations.json) | impala_warehouse | 1 |
| [v3org_2.sql](./v3org_2.sql) | [结果](./v3org_2.json) | starrocks_warehouse | 1 |
| [v3org_3_optimized.sql](./v3org_3_optimized.sql) | [结果](./v3org_3_optimized.json) | impala_warehouse | 1 |
| [v3feedback_2.sql](./v3feedback_2.sql) | [结果](./v3feedback_2.json) | starrocks_warehouse | 1 |
| [v3feedback_3.sql](./v3feedback_3.sql) | [结果](./v3feedback_3.json) | starrocks_warehouse | 1 |
| [v3hw_started_summary.sql](./v3hw_started_summary.sql) | [结果](./v3hw_started_summary.json) | starrocks_warehouse | 1 |
| [v3hw_due.sql](./v3hw_due.sql) | [结果](./v3hw_due.json) | impala_warehouse | 3 |
| [v3hw_student_current.sql](./v3hw_student_current.sql) | [结果](./v3hw_student_current.json) | impala_warehouse | 3 |
| [v3hw_due_reconcile.sql](./v3hw_due_reconcile.sql) | [结果](./v3hw_due_reconcile.json) | impala_warehouse | 2 |
| [v3hw_verified_chain.sql](./v3hw_verified_chain.sql) | [结果](./v3hw_verified_chain.json) | impala_warehouse | 1 |
| [v3hw_week_students.sql](./v3hw_week_students.sql) | [结果](./v3hw_week_students.json) | impala_warehouse | 1 |
| [v3materials_summary.sql](./v3materials_summary.sql) | [结果](./v3materials_summary.json) | starrocks_warehouse | 1 |
| [v3hw_score_distribution.sql](./v3hw_score_distribution.sql) | [结果](./v3hw_score_distribution.json) | impala_warehouse | 2 |
| [v3hw_bounds.sql](./v3hw_bounds.sql) | [结果](./v3hw_bounds.json) | starrocks_warehouse | 1 |

## 样本与旧查询

sample-feedback-quality.json 是诊断样本的脱敏聚合，不是总体估计；样本重现入口和对照见 QUALITY.md。

目录中早期 v3org_3、v3hw_summary、v3feedback_sample 失败记录只保留 NOT_VERIFIED 标记，不能引用为业务结果。其中机构查询已由 v3org_3_optimized 成功替代，反馈样本已由本轮 10 份作业聚合替代。

## 当前交付状态

已完成课程配套的可关联总体全量统计、本周使用和批阅事件、作业到期分组及逐活动对账后的学生反馈闭环。正确率、测验最终完成、录播看完、反馈效果等仍是明确的数据/语义缺口，未冒充已完成指标。完整结果与约束一起交付。
