# ClassIn 测试接入 INT-0 实测

时间：2026-09-14 23:30–23:50 Asia/Shanghai；当前授权测试教师。凭据只读本机配置，原始响应保存在被忽略的 `.runtime/private/classin-integration-int0-2026-09-14/lms`（目录 0700、文件 0600）。无业务写入。

## FACT：文档与连通性

文档来自当前私有 Apifox `https://apifox.eeo-inc.com` 的 endpoint get；上游固定测试网关 `https://dynamic14.eeo.im`。LMS 下表路径均加 `/lms`，course 项目路径加 `/course`。表单 SignV2 与 JSON JWT/JsonSign 复用已核查的 [ClassIn Skill](../../reference/classin-api/SKILL.md)。成功码：LMS error_info.errno=1，course code=0；不可推广到课堂聊天。

| Apifox 项目 / ID | 路径 | 请求/结果 |
| --- | --- | --- |
| 345169 / 3496948 | /app/member/course_list | JSON states/page/pageSize/identitys/processing；当前教师可见 1 个正常班级 |
| 345169 / 3493906 | /app/getCourseMember | JSON SID/clientCourseId/identity=[1,2]；3 名学生；保留 identity，丢弃手机、邮箱、头像 |
| 345129 / 3496924 | /app/category/list | FORM courseId；2 个课程分类，限定目标数学课程 |
| 345129 / 3471141 | /app/course/unitList | FORM courseId/categoryId/sort；14 个主题单元＋1 个空默认单元 |
| 345129 / 3471555 | /app/course/unitActivityList | FORM courseId/categoryId/SID/unitIds(JSON数组)/offset/limit/sort；53 活动：14课堂、14作业、7测验、4录播、14资料 |
| 345129 / 3471071、3471043 | /app/activity/class/get、students | FORM；首讲详情及活动分配 3 人；报告不是实时出勤 |
| 345129 / 3471031、3471069 | /app/activity/homework/get、students | FORM；3 人分配，列表提交 1、批阅 1；正文与图片资源引用存在 |
| 345129 / 3471127、3471053 | /app/activity/exam/get、students | get JSON；students FORM；分配 3 人；paperInfo 含卷结构和题目引用，不能当已取得全部题干 |
| 345129 / 3471030、3471061 | /app/activity/recordClass/get、students | FORM；视频资源与 3 人学习记录；转换状态另行核对 |
| 345129 / 3471040、3471026 | /app/activity/learningMaterials/get、students | FORM；PDF 资源引用与 3 人记录 |

抽样详情与学生列表单次 144–479 ms；这不是全链路性能保证。所有 get 带 courseId/activityId，单独不要求 courseId 的 students 也先通过同课程活动查权。

## 字段与语义

- courseId/clientCourseId 在这些入口代表班级；categoryId 是班级下课程；unitId → activityId → bizId，不能互换。
- 单元 activityCount/activityNum 与去重活动数核对完整性。当前各非空单元 pageTotal=1；实测 offset=0/2、limit=2 均返回首单元全部4活动，不能按 offset 自增假定分页生效。第一版对完整已验证单页提供支持；pageTotal>1 或单元计数不符明确 incomplete，直到分页合同补实测。
- 作业 stStatus：0未提交、1已提交、2已批阅；isDraft=1 为草稿。不要用 state=0 推断未提交。
- 测验 stStatus：0未作答、3作答中、6已批阅、9已交卷；未评分时 showGrade/rate 不可强制转为0分。
- 录播 learnState：0未开始、1进行中、2已完成；learnRate 百分比、duration 秒。其他未解释枚举保持未知。
- 学生名单接口缺少姓名时，以班级 memberUid 关联，不能按数组顺序关联。班级成员与各活动分配分别留存。
- 私密 shareSign/shareKey/shareParam、资源内部路径和文件票据不进入公开日志或 AI Prompt。

## UNKNOWN / 阻塞

普通 IM 的正式接入合同仍缺失，详见 [IM 报告](./CLASSIN-IM-INTEGRATION-PROBE-2026-09-14.md)。无法以此次读取成功宣称消息交付完成。

后续已补实测题目 batchGet（345268/3487332，首卷10题）、正式报告和教师笔记，见 Feature Spec §8 与 CLASSIN-INT4-REPORT-REPROBE-2026-09-15.md。资源下载/回放就绪仍需按需补实测。DW 新令牌已更新本地 MCP 配置并通过 initialize/tools/list、list_apis、get_my_permissions；本轮没有运行数仓 SQL，DW 不参与实时课堂权威数据链。
## 2026-09-15 补充：学生作业内容

Apifox345129/3499108 当前定义为表单 activityId/studentUid/courseId，实际网关 `/lms/app/activity/homework/student/detail`。以本课程首讲作业分别读取三名已分配学生，三次 errno=1；记录归属与名单、bizId、班级、机构吻合。1份正式提交含23字符文字、1张图片附件，2份未提交正文及附件为空；教师批阅正文/评语均为空。未提交也存在 add_time，不能当成提交时间；correct/wrong 等未定义字段不用于推导正确率。附件是 fileId/lmsFileId/uuid 等引用，原图尚未解读。

完整原始响应在受限 `.runtime/private/classin-integration-int0-2026-09-14/lms/homework-answer-{0,1,2}.json`，当前接口定义保存在同目录 endpoint-3499108.json；公开记录不保存账号或资源票据。该发现支持 CI-008c 的正文/附件计数读取，不等于测验逐题作答或图片答案已读。
