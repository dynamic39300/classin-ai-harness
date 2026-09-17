# ClassIn API 能力链路与 TeachBuddy 缺口

日期：2026-09-11。状态：RESEARCH / RECOMMENDATION。Write Set：仅本文档；不修改产品决策、应用或 Adapter，不执行业务接口，不读取凭据。

## 结论与证据边界

公开技能注册表本次可匿名读取，仍有 **173 项声明能力：96 读、77 写**，与[已归档完整清单](./CLASSIN-SKILLS-CATALOG-2026-09-11.md)数量一致。注册表覆盖班级、课程分类、单元、活动、学生完成情况、成绩报告、题库和文件空间，足以作为 TeachBuddy 业务上下文和课程对象写回的候选目录；**目录声明不等于当前账号有权调用，更不等于业务调用成功**。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

本次只重新 GET 注册表并统计、分析元数据。响应字节 SHA-256：`2412038ba94bb1b0f56d27618428359f6259c95ece1fab50a5c0cbf80cb18165`。注册表没有结构化响应契约、完整可选参数、实际调用端点和 HTTP 方法。下文链路均为依据声明组合的接入候选，尚未验证响应、权限或跨步引用。执行入口的额外调查见[可调用性审计](./CLASSIN-API-CALLABILITY-AUDIT-2026-09-11.md)。

## 对 TeachBuddy 最有价值的只读链路

以下技能 ID 均来自[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)，箭头表示建议的对象发现顺序，不表示已执行。

| 目标 | 目录中的候选链路 | 关键边界 |
|---|---|---|
| 找到教师业务上下文 | `classin:user:identity:get` → `classin:class:lifecycle:member_list` → `classin:class:lifecycle:detail` → `classin:category:list` → `classin:course:unit_list` → `classin:course:unit_activity_list` | 账号身份不等于班内角色；班级详情的 `schoolUid` 用于下游 SID，不能取登录用户自己的机构代替 |
| 班级花名册 | 班级详情 → `classin:class:member:list` | `studentNum` / `auditNum` 是容量上限；人数和名单必须来自成员查询，不能由容量推断 |
| 作业提醒与个性化反馈 | `classin:composite:list_class_homework` 或单元活动列表 → `classin:activity:homework:get` → `classin:activity:homework:students` → 按需 `classin:activity:homework:student_detail` | 可支持发现未交作业和生成草稿；目录未见正式 IM 发送链路 |
| 课前与课中动态 | `classin:course:class_activity_list` → `classin:activity:class:get` → `classin:activity:class:students` | 课节列表不依赖单元存在；参与情况并不能证明实时更新时延、考勤结算规则或事件推送能力 |
| 课后内容回顾 | `classin:course:class_activity_list` → `classin:activity:video_list` → `classin:file:rich_video_summary`；也可候选 `classin:composite:rich_video_summary` | 直播回放与录播分流；默认返回 `cosUrl`，正文需要显式选项；这是内容总结/字幕，不能当作授课分析或 LMS 学情报告 |
| 学情与错题分析 | 活动详情 → `classin:report:activity:base` / `classin:report:activity:type_info` → `classin:exam:answer_mark_result`；配合 `classin:score:activity:student` | 逐题答案和汇总不同；选择/判断答案是从 1 起的 optionId，要映射题目选项后再解释 |
| 教学资源检索 | `classin:question_bank:subject:subject_list` / `classin:question_bank:category:list` → `classin:question_bank:topic:list` → `classin:question_bank:topic:batch_get`；云盘 `search` / `file_info` | 学科、知识点和题目可提供内容证据；权限和来源限制不能由搜索命中推断解除 |
| 教师待办 | `classin:todo:list:overview` / `classin:todo:list:pending` → `classin:todo:item:detail` | 待办完成操作改变待办状态，不证明关联作业、教学或沟通业务已经完成 |

## “课程目标 → 课程对象”的写回候选

目录声明提供 `classin:category:create`、`classin:unit:create`，以及 8 种活动创建：`class`、`homework`、`record_class`、`learning_materials`、`discuss`、`answer_sheet`、`clock`、`scorm`。云盘提供上传、备课包创建和加文件，以及 EPPT/EDOC 创建或转换。可以据此研究“生成资源 → 保存文件 → 在指定分类/单元创建活动”的纵向闭环，但各步对象 ID、文件结构、转换完成条件和失败补偿仍需正式契约验证。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

**不能把创建等同安全草稿：**`classin:unit:create` 声明未指定发布状态时默认对学生可见；`classin:unit:publish` 表示显示/隐藏且不能改回草稿。活动创建也声明多项开关存在脚本默认值。在 TeachBuddy 中，默认值必须纳入教师审阅的 ProposedAction 内容，不能因为技能说明“不要追问”就绕过已有审批和领域校验。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)、[项目 Agent 规范](../../AGENTS.md)

建议第一条真实验证切片先打通已授权只读业务上下文；第二步验证沙箱中的单个资源保存与单个活动创建，取得回执后再扩大为课程方案包。这是研究建议，不变更当前模拟业务的项目基线。[项目简报](../00-project/PROJECT-BRIEF.md)

## 读写与权限声明

统计按 `invocation.auth_scope` 分组；下表是技能要求的范围，不是当前会话实际持有的授权。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

| 范围前缀 `skill:classin:` | 读 | 写 |
|---|---:|---:|
| `activity` | 47 | 14 |
| `space` | 22 | 54 |
| `question_bank` | 16 | 0 |
| `class` | 5 | 7 |
| `todo` | 4 | 2 |
| `user` | 1 | 0 |
| `file` | 1 | 0 |
| **合计** | **96** | **77** |

技能分类不等于权限范围：成绩、报告、课程分类和单元多项使用 activity 范围，两个 composite 使用 class 读范围。不能仅按业务名称授权。注册表仅标记 5 项 `isDestructive=true`，但 `classin:space:org:disk_delete` 同样是删除操作且标记为 false，因此该布尔值不能成为唯一风险判据。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

写回必须继续遵守项目既有 `ProposedAction → 策略 → 教师审批 → 领域校验 → ExecutionReceipt`。读取学生作答也只应投影当前任务所需内容；身份、机构、班级范围和数据新鲜度仍由真实服务确认。[项目 Agent 规范](../../AGENTS.md)、[决策记录 D-019](../00-project/DECISION-LEDGER.md)

## 目录缺口与不能宣称的能力

以下“未见”仅限本次 173 项技能 ID 与描述，不能据此断言 ClassIn 平台没有对应服务。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

| 缺口 | 对当前场景的影响 |
|---|---|
| 未见 IM 历史、消息发送、交付/已读回执、撤回与订阅接口 | AI 消息助手可形成基于事实的候选草稿；不能从本目录证明能够正式发送或闭环确认 |
| 未见 `classin:activity:exam:create` 或 AI 口语卡创建 | `answer_sheet:create` 不能替代全部测验；目录明确 bizType 3 为测验、7 为答题卡、10 为 AI 口语卡 |
| 未见按教学目标生成完整课件/课程内容的通用生成接口 | EPPT/EDOC 创建、转换和文件上传不证明 AI 内容生成、TeacherIn 内容契约兼容或可编辑内容写入 |
| 未见事件订阅、Webhook、统一变更游标与数据时效保证 | 四阶段教学动态最多能研究按需读取；尚不能承诺实时触发 |
| 未提供幂等键、版本前提、事务、撤销、统一错误和回执合同 | 不能宣称多活动课程包能原子发布，或失败可自动重试而不重复创建 |
| 未提供完整租户/角色矩阵与授权确认方式 | scope 字符串不足以确认某老师能读到某班、某学生，或具备创建/发布权限 |

另外，`classin:class:config:settings` 描述称全部开关可选，但 required_params 把 `app_invite_state` 列为必填；这属于待澄清冲突，不能擅自补一个值执行。部分创建入参同时出现 `course_id` 与 `course`，名称分类与 ID 分类的使用也不一致，需要逐接口读取正式 schema 后再适配。[一手注册表](https://classin-skills-platform.eeo-inc.com/api/skills/registry)

## 验证记录

- 已重新读取一手注册表，核对总数、读写计数、权限范围及关键技能描述；与现有完整清单数量一致。
- 已将能力存在、链路推导、权限未知和实际调用成功分开表述。
- 未执行业务接口，未获取真实学生数据，未读取凭据；未修改应用，因此本次不运行应用测试或浏览器验收。
- 后续需要执行文档、正式 schema 和明确测试身份/对象，才能把本研究中的候选链路升级为调用验证结果。
