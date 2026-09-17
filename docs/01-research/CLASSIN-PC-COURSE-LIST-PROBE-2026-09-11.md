# 班级列表首次调用验证

日期：2026-09-11。用户授权：选择一个接口进行实际调用。范围：单次班级列表只读请求，无业务写入。入口与契约来源见 [静态接口扫描](./CLASSIN-PC-API-SCAN-2026-09-11.md)，候选 ID `PCAPI-0208`。

调用前重新读取用户给出的 PC 测试页面，确认当前 `EEOConfig.DYNAMIC=dynamic14.eeo.im`。使用该主机发起请求；尚未连接用户浏览器中的教师登录态，未使用 Cookie、Token、UID、签名或公开包的预置身份。

```http
POST https://dynamic14.eeo.im/course/app/member/course_list
Content-Type: application/json
Accept: application/json

{"page":1,"pageSize":1}
```

服务返回 HTTP 200、application/json，业务错误为：

```json
{"error_info":{"errno":102,"error":"无权限(could't find auth handler)"}}
```

上方仅展示响应的 error_info 字段，不是完整响应。没有保存业务 data 内容、响应头或凭据。

结论：请求已到达返回业务 JSON 的服务，但本次无认证请求被拒绝。**不能把 HTTP 200 记作班级数据读取成功，也不能据此判断老师角色没有权限。** 该错误尚不足以确定只缺 Token、只缺签名，或认证路由还有其他要求。未验证分页参数有效性、教师角色和返回业务数据结构；不使用预置测试身份重试。

下一步：通过用户明确的老师测试登录会话或正式授权凭证，核对实际请求头/签名提供者及主机路由，再复测同一只读接口。保持单页最小数据，并仅记录脱敏结构与状态。

## 后续：同事提供的鉴权 Skill

用户将参考工具放入当前仓库后，已阅读 [SKILL.md](../../reference/classin-api/SKILL.md) 与 [调用脚本](../../reference/classin-api/scripts/classin_api.py)。脚本从本机 `~/.classin.token` 读取默认账号凭证，为 JSON 请求生成身份 Token 和请求签名，默认目标正是本次测试网关。它可作为同一班级列表接口的鉴权调用工具，但是否通过网关以及账号的班级权限仍须实际响应验证。

本机只检查凭证文件是否存在，结果为不存在；因此没有执行鉴权请求，也没有尝试匿名替代、预置身份或自行构造凭证。需要由开发将测试账号对应凭证配置到本机指定文件后再复测。凭证不写入仓库或聊天，不启用会打印请求头的 verbose 模式。
