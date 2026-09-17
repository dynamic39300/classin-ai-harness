# Apifox 私有部署接入与首轮接口对应

2026-09-11；状态：文档访问成功、首轮字面匹配完成，业务鉴权未验证。

## 已完成

用户指定私有部署 https://apifox.eeo-inc.com 后，使用用户授权的新令牌登录成功。此前针对默认公有云的两次令牌拒绝不再作为该令牌在私有部署无效的证据。凭据由 CLI 保存在用户目录，不进入仓库。

当前账号可见 2 个团队、101 个项目。读取全部101个项目的 HTTP endpoint 目录得到4188条记录；这不是全公司完整系统清单，也不包括另行管理的全部 RPC/WebSocket 资源。列表查询不传分页参数时，当前CLI默认为全量；此次各返回均无 nextPage。

部分大输出经 subprocess 管道捕获出现截断，已改为 CLI 直接写临时文件并成功重新解析；最终所有项目成功。未导入、修改或执行业务接口。

## 与前端扫描对照

对原350条候选按 HTTP 方法以及原调用路径/服务前缀拼接路径进行字面匹配，保留大小写与查询串；不做无依据的前缀删减或模糊尾部匹配。

| 结果 | 数量 |
|---|---:|
| 唯一字面候选 | 128 |
| 多个字面候选 | 22 |
| 未找到字面对应 | 187 |
| 扫描方法未知，暂不匹配 | 13 |
| 合计 | 350 |

“唯一字面候选”仍需核对所属服务、版本、分支、host、实际请求合同；不等于已验证运行时路由相同。没有匹配也不意味着接口不存在：原始文档可能采用不同服务前缀、PHP action 参数独立建模，或属于其他产品/协议。项目名不自动等同于服务前缀。

数据文件：[项目及计数](./apifox-classin-match-2026-09-11/projects.json)、[对应CSV](./apifox-classin-match-2026-09-11/matches.csv)、[对应JSON](./apifox-classin-match-2026-09-11/matches.json)、[抽查合同](./apifox-classin-match-2026-09-11/contract-samples.json)。这些派生产物不含令牌、响应示例或真实学员数据。

## 三个重点接口的详情抽查

一手来源为上述私有部署的 CLI endpoint get 返回，项目/接口ID随文件保存，未猜测不可验证的网页详情URL。

### 班级列表

- 项目 `eeo_course_business`（345169），接口3496948：获取用户班级列表。
- POST `/app/member/course_list`，application/json。对应扫描 PCAPI-0208，扫描服务前缀 `/course`。
- 文档必填：states、page、pageSize、identitys、processing。
- states 描述：0正常、1班级解散、2离开班级；processing：1所有、2待处理。identitys 的具体角色枚举未由本次参数说明给出，不能凭其他枚举体系套用。
- 成功结构为 error_info、data；data 包含 list、total。list 字段包含 courseId/courseName、schoolUid/schoolName、identity/courseRole、state、setting/courseSetting 等。
- 之前无鉴权探测仅传分页参数，未达到当前文档必填要求。待ClassIn测试凭证就绪后，需按此合同重新准备参数；这次没有重试业务请求。

### 作业学生列表

- 项目 `lms`（345129），接口3471069：活动 - 作业 - 学生。
- POST `/app/activity/homework/students`，application/x-www-form-urlencoded。
- 表单必填 activityId（integer）、courseId（string）；identity 可选，文档描述1老师、2学生。这是该参数的视图语义，不是对调用者角色的授权证明。

### 单个学生作答详情

- 项目 `lms`（345129），接口3499108：活动 - 作业 - 学生作答详情。
- POST `/app/activity/homework/student/detail`，application/x-www-form-urlencoded。
- 表单必填 activityId、studentUid、courseId，类型均为integer。
- 同条文档还附有 JSON Schema，但其 required 只列 courseId/activityId。按实际Content-Type应优先核对表单参数，不能忽略studentUid；此处记录文档内部不一致，尚未实测。

上述详情证明 Apifox 能补齐静态扫描没有的请求类型、参数和响应模型。文档访问与ClassIn UID/secret业务身份仍是两套独立鉴权，不能据文档可读宣称教师可调用全部接口。


## 教师数据链路复核

本轮通过已登录的私有 Apifox CLI 读取接口详情；以下均为文档证据，未执行教师业务鉴权调用。

| 关系 | Apifox 项目 / 接口 ID | 文档路径（未拼接网关前缀） | 判断 |
| --- | --- | --- | --- |
| 用户→班级 | 345169 / 3496948 | POST /app/member/course_list | 已明确；需核对教师身份筛选及分页 |
| 班级→课程分类 | 345129 / 3496924 | POST /app/category/list | 必填 courseId（班级 ID）；课程分类对应 categoryId |
| 课程→单元→活动 | 345129 / 3471555 | POST /app/course/unitActivityList | 必填 courseId、SID、categoryId；unitIds 的 required 标志与“必须指定”描述冲突，须实测 |
| 班级→成员 | 345169 / 3493906 | POST /app/getCourseMember | JSON 必填 SID、clientCourseId、identity；identity 数组中 1=学生、2=旁听；本接口是 Apifox 补充发现，尚未证明当前 PC 页面直接使用 |

活动列表文档给出分类型进度统计：例如作业 studentTotal/submitTotal/correctTotal，录播 checkTotal/studentTotal，讨论 joinTotal/studentTotal。个人进度、作答内容需继续调用对应活动类型的详情/学生接口，不能把汇总统计当作每个学生的完整学习记录。

修正：/coreapi/student/getStudentList（345112 / 3470024）是机构学生搜索，参数没有 courseId，不能作为班级学生名单的证据。班级成员接口也不独立证明某教师实际给某学生上过课；后者需要结合教师任课、课堂与参与记录。

当前主要阻塞是缺少测试教师 UID 与匹配 secret。凭证只允许开始实测，接口所属环境、教师授权范围、字段完整性和分页结果均未验证。不能据此宣称能读取 LMS 所有数据。
