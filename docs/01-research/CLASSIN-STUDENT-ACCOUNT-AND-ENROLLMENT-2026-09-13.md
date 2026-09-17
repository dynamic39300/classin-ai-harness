---
title: ClassIn 学生账号、机构学员与班级成员接口关系
date: 2026-09-13
status: DOCUMENTATION_VERIFIED_RUNTIME_PENDING
---

# 学生账号与加入班级

2026-09-13 通过已登录的 Apifox CLI 读取下列接口原始定义。路径除特别注明外均为 Apifox 文档路径，不假设已核实测试网关的全部服务前缀。本轮只查询接口文档，没有注册账号、发送验证码或添加班级成员。

## 三种不同的业务对象

- 用户账号：拥有用户 UID；用户注册接口需要手机号或邮箱、密码、验证码等。
- 机构学员：用户在某机构下的学生身份；新增机构学员接口可返回用户 UID 与学校学生 ID（studId）。
- 班级成员：已有用户与班级的学生关系；添加接口接收 UID，不负责通过邮箱完成普通账号注册。

## 已核对接口

| 对象或操作 | 项目 / 接口编号 | 文档路径 | 关键合同 |
| --- | --- | --- | --- |
| 用户注册 | 345322 / 3491510 | POST `/v2/app/user/register` | 表单；手机号或邮箱二选一，必填 password、verificationCode、statistics。不能凭教师 secret 省略验证码。 |
| 添加机构学员，可选代注册 | 345112 / 3496502 | POST `/student/v1/addOneStudent` | 表单参数定义包含 autoRegister：1 代注册，0 不代注册；成功响应包含 uid 和 studId。教培后台不传 catIds，中小学/高校条件必传；附带旧 JSON Schema 与表单定义有差异，实调前需核实。 |
| 按 UID 添加班级学生 | 345169 / 3497906 | POST `/app/course/addCourseStudent` | JSON 必填 schoolUid、courseId、studentUids。PC 已扫描的网关路径为 `/course/app/course/addCourseStudent`；结果需同时核对顶层与 studentArray 中逐人的 error_info。 |
| 加班同时补机构学生关系 | 345169 / 3496788 | POST `/course/addCourseStudent` | JSON 必填 sid、courseId、studentUid。文档明确：学生尚未与所属机构关联时，加班会同时建立机构学生身份关系。此路径的测试网关前缀及运行可用性尚未验证。 |
| Web 添加班级学生 | 345169 / 3494084 | POST `/web/addCourseStudent` | 接收 courseId 和 studentArray；逐人错误包含“用户 UID 不存在”“学生账号已注销”“课程下已存在此学生”。这进一步支持账号先存在的前置条件。 |
| 按邮箱或手机号查学生 | 345112 / 3499053 | POST `/student/v1/infos-by-account` | JSON 接收 accounts 数组，响应 students 与 errorStudents；其读取范围和测试网关前缀尚待核实，不能由无结果直接推断全局账号未注册。 |

## 可采用的流程

1. 已有可用的测试用户 UID：直接执行受支持的班级成员添加路径，并核对成员列表。若走 3496788，文档说明可同步补机构学生关系。
2. 尚无账号：先走正常用户注册（需要验证码），或通过支持 autoRegister 的机构添加接口代注册；取得有效 UID 后再加入班级。

因此“先有账号，再加入班级”可以分两步。机构学生身份可能在第一步或第二步建立，不一定需要单独第三次请求。

此前 `/coreapi/student/addStudent` 返回参数错误，不能据此判断用户账号是否存在、是否需要先注册，也不能据此认定教师角色权限不足。此查询澄清业务关系，没有解除当前创建接口和云盘服务的实调阻塞。
