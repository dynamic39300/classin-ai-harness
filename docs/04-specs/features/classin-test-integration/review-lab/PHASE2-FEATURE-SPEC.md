---
title: Copilot API 审阅台第二阶段 Feature Spec
status: COMPLETE_USER_ACCEPTED
date: 2026-09-16
---

# 范围与接口

Write Set 限于 `tools/copilot-api-review-lab/`、本目录第二阶段文档和项目状态入口。继续复用 `BusinessRead`、证据规范化、真实 function calling、私有运行存储和审阅页面。默认 Demo、生产 Adapter、发送链不改。

新增问题与工具：

| 问题 | 必要工具 | 确定性投影 |
| --- | --- | --- |
| A1 | `read_course_progress` | 当前班级各课程的单元/活动总量、已结束课堂、下一课堂；各课程分列 |
| A3 | `read_class_roster` | identity=1学生数；其他身份分别计数 |
| A4 | `read_lesson_companions` | 与选中课堂相同unitId的已发布作业、测验、录播、资料和其他课堂 |
| B1 | `read_class_report` | 已结束课堂的应到、实到、迟到及报告时间口径 |
| C1 | `read_activity` | 作业标题、说明、起止/截止、分配人数与附件元数据 |
| E1 | `read_class_report` + `read_replay_metadata` + `read_teacher_notes` | 报告、板书/高光计数、回放文件数量/状态/时长、笔记数量 |

`read_course_progress` 先核验教师班级，再读取该班全部课程分类；每个分类分别分页/完整性核对单元和活动。进度以已结束课堂及下一课堂表达，不从异构活动数量计算虚假的学习百分比。

`read_class_roster` 使用 `getCourseMember`，按当前已验证 identity 分类，返回计数及学生展示名；开放式回答默认只需要人数时不把完整名单输入模型。

`read_lesson_companions` 从已核验现场活动中过滤同一 unitId，保留 type、名称、时间、发布状态；不把单元外相似名称强行关联。

`read_replay_metadata` 调用 `getLessonRecordInfo` 并核对 lessonId。Context 仅保留文件数量、原始状态、时长、录制/生成时间和可播放版本数量，不保存 FileId、播放地址或票据。

# 开放式路由

新增 `OPEN` 页面入口。用户输入任意教师问题，可选择当前授权课程中的一个课堂或作业，也可留空。模型只看到现有只读工具定义，不获得任意 URL、shell 或写工具。执行器继续按工具种类和选中对象检查；需要课堂/作业而未选择时，计划器返回澄清文字且无工具执行。

开放入口不是全量问题已实现的声明。其状态显示“实验入口”，回答只基于本次实际获得的证据；工具目录外的需求明确说明当前未接入。

# 状态与验收

- 核心：计划中、取数中、回答中、已回答、部分成功、需补充对象、失败可重试；
- B1 已结束课堂可回答正式课后数据；正在上课不伪造成员实时名单；
- A1 分类为空、分页不全或对象越权均失败而非返回“无课程”；
- 回放空数组是“暂无文件”，与读取失败区分；
- 浏览器验证固定题、开放路由、对象切换、反馈保存及窄屏可达。
