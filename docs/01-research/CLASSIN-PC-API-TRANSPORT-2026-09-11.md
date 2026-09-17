# ClassIn PC LMS 接口传输与权限证据

日期：2026-09-11。状态：静态源码研究；业务调用未验证。目标：[用户指定 LMS 页面](https://wsevlf001.eeo.im/client/lmsbleach/six/)。Write Set：仅本文；读取页面加载的公开 JavaScript，不执行其中的登录、签名、客户端桥或业务方法，不读取本地凭据。

## 最重要的边界

该页面加载的 `classin-api` 既包含真实客户端桥的包装，又包含明确名为 `ClassInMock` 的浏览器兜底实现。无原生客户端时，包装代码会懒加载 mock 并调用初始化。因此，浏览器看到教师角色、成员名单、班级详情或成功回调，不足以证明当前登录教师对服务器拥有相应权限。源码提供的是传输方式和候选能力证据，不能据此声称“老师都能调用”。[S1][S2]

## 一手文件

- [S1：客户端桥包装 classin-api-c63e0376](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-c63e0376.7324ddcf27d5116585e6.js)
- [S2：ClassInMock classin-api-ac309808](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-ac309808.ea47ceeb2fc8b578e422.js)
- [S3：nooskit 组件及 Fetch 封装](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-nooskit-5c821f99.3e367ae8acf803a88ba8.js)
- [S4：nooskit 空块](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-nooskit-97e4c2a1.ef74cc9905bab05c3e5d.js)

S4 仅为很小的 webpack chunk 注册，没有本次所需的传输合同。以下 S1/S2/S3 引用均指以上公开构建文件，证据时间限定为本次采集。

## 传输层与基地址

| 层 | 观察到的实现 | 可以得出的结论 |
|---|---|---|
| 原生桥包装 | `createClientApi` 对 `widget.*`、`cloudDisk.*`、`timeline.*` 等方法进行包装；存在 Qt/QWebChannel、Flutter `callHandler`、直接 widget 调用和父窗口消息转发分支 | 这些名字不是 HTTP 路由；独立 Node 或普通网页不能只拼 URL 重现原生能力 [S1] |
| 桥对象与权限上下文 | `getUserInfo` → `widget.userInfo`，`getClientInfo` → `widget.clientInfo`，`getSchoolInfo` → `widget.schoolInfo`；对象参数在部分桥分支转为 JSON 字符串，回调字符串尝试 JSON 解析 | 身份、机构和设备信息可能来自客户端；不能用本地硬编码替代 [S1] |
| 无客户端兜底 | 环境检测失败后载入 `ClassInMock`，`getMockData` 从 `allObjects` 寻找方法 | mock 方法并非该能力真实接入完成 [S1][S2] |
| nooskit Fetch | 单例封装接受 `baseURL`；GET/POST 使用 `baseURL + path`；PUT 直接使用传入 URL | 这里没有唯一 LMS baseURL 常量，最终 host 要追踪调用处；文件上传 URL 可能与业务 API 不同 [S3] |
| mock 主机信息 | `clientInfo().hosts` 优先读 `window.EEOConfig`，否则使用预置主机；另有可配置 token 刷新主机 | 这些是 mock 配置逻辑，不应作为生产基地址事实；不能默认所有相对路径均走用户提供的页面 host [S2] |

## 鉴权与签名依赖

S1 公开包装 `widget.generateHeaders`、`widget.generateSignKey`、`widget.getSignKey`、`widget.generateToken`。这说明上层能够请求客户端生成签名/令牌；没有证明外部调用方已获得签名权。[S1]

S2 的 mock 实现出现 `X-EEO-SIGN`、`X-EEO-TS`、`X-EEO-SIGN-VERSION`、`X-APP-ID` 以及 UID、Token 和客户端类型/版本等头字段，还包含以下认证路径：[S2]

- 相对路径 `POST /zero-usercenter/app/user/tokenExchange`，JSON body。
- 配置主机下 `POST /usercenter/v2/app/user/refresh-token`，JSON body。

这些只作为认证依赖记录，未访问。mock 初始化会从浏览器 Cookie 的测试配置键读取身份/密钥；公开包也含预置测试配置。本研究不复述其值，不执行初始化、签名或令牌交换。不能将该模拟认证逻辑直接迁入 TeachBuddy。[S2]

S3 另有 `genHeaders()` 向相对 `/api/echo.api.php?action=generate_sign` 发 POST；当 `location.host != location.hostname` 时加 `/remote` 前缀，响应读取 `data.HTTP_HEADERS`。该辅助方法自身不证明业务授权，也不证明页面主请求链必经它。[S3]

## HTTP 方法、编码与成功语义

| 方法/接口类型 | 源码行为 | 接入注意 |
|---|---|---|
| nooskit GET | `URLSearchParams` 编查询参数，`Content-Type: application/json`，返回 Fetch Response | 未见此层统一解析业务成功码 [S3] |
| nooskit POST | `JSON.stringify` body，JSON Content-Type，接受调用方头；新请求可取消前一请求 | POST 不能自动等同写操作；业务性质需看每个端点 [S3] |
| nooskit PUT | 二进制 body，`application/octet-stream`，直接目标 URL；旧实现使用 XMLHttpRequest PUT | 包中写有 `withCredentials`，但不是 Fetch 标准的 `credentials` 字段；不能据此确认跨域 Cookie 会发送 [S3] |
| 签名辅助 POST | form-urlencoded；手动拼接键值，数组用 `key[index]` | 此实现不是主 JSON 编码合同，不能把所有业务参数套用同一序列化方法 [S3] |
| 桥回调 | Mock 回调使用 `errCode: 0` / `-1`；未知 handler 甚至可返回“成功 (mock default)” | 这是 mock 桥协议，绝不是 LMS 业务成功证据 [S2] |
| Fetch 错误 | POST 被取消可回 `{aborted:true}`，异常可返回自建 `{ok:false,status:500,...}` 对象 | 自建 status 不等于服务器返回 HTTP 500；应用需区分网络错误、取消、HTTP 和业务 errno [S3] |

本次四个文件没有提供可统一适用于所有 LMS 业务路由的 `errno` 成功判定。具体业务是否 `errno=1` 或其他合同必须由主请求封装及逐接口响应核对，不能从桥回调 `errCode=0` 推导。[S1][S2][S3]

## 教师与学生权限

S1 可看到功能灰度与配置读取，如 TeacherIn、题库、Agent 等开关，还包装班级/成员/课堂信息方法；S2 可看到预置教师、学生角色、可用性字段，以及返回 true 的教师相关 mock 方法。这些是界面选择、客户端数据或模拟结果，均不是服务端 ACL。[S1][S2]

本子范围不能形成“仅教师可用”或“学生禁止”的 HTTP 接口全集：真实业务 endpoint 主要位于应用和懒加载块，S1 的桥导出也未统一声明角色限制。应将全量扫描中的能力分成 **教师页面使用、学生页面使用、共享使用、角色未明** 四种源码证据，并把 **服务端实际权限未验证** 作为独立字段；不要把页面分类升级为服务端授权。[S1][S2]

## 对真实接入的含义

后续需要逐条确定 host 来源、调用方法、签名提供者、最小业务 ID、请求/响应 schema 和服务端权限结果。首轮应使用明确的测试身份与脱敏对象验证只读端点；写接口继续经过项目规定的 ProposedAction、审批、领域校验和回执。已知浏览器模拟数据与默认成功回调必须排除在调用成功统计之外。[项目规范](../../AGENTS.md)

本轮只有静态源码检查；没有发出认证、签名或业务请求，没有运行浏览器中的包，也没有验证任何教师/学生服务端权限。

## 补充：主请求封装与跨模块前缀

追加审阅两个公开文件：

- [S5：主请求封装 main-35f5d893](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-35f5d893.cef4d2a43a71c1a35538.js)，模块 `629297`。
- [S6：云盘封装 main-6b47fa3c](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/main-6b47fa3c.10b44cb22c410ffa533c.js)，模块 `563526` / `563458`。

模块 `629297` 的 `createAxiosInstance`、`createAxiosInstanceV2`、`createAxiosInstancePm`、`createNoHeaderAxios` 共享工厂，Axios 默认 method 为 POST，返回函数最终显式调用 `A.post(path, mergedParams, config)`。因此即使路由含 `get` / `list`，其传输 method 仍是 POST；读写性质应独立分类。`createAxiosGetInstance` 默认并最终调用 GET。[S5]

POST 工厂的相对 basePrefix 拼接 `location.protocol + // + (EEOConfig.DYNAMIC 或 location.host)`；若命中海外 console→dynamic 映射且不在对应客户端条件下，则替换 host。request interceptor 还可能用 `window.__HOSTS__.dynamic` 替换旧 host。basePrefix 含 `http` 时按绝对地址处理。GET 工厂的相对基址直接拼 `location.origin`，不能沿用 POST 动态主机规则。[S5]

主 POST 工厂默认将数据变成 URLSearchParams；`paramsType=JSON` 保留 JSON；`LMS_FORM` 展平数组到 FormData；`STRING_FORM_DATA` 先把对象 JSON 字符串化，再根据 Content-Type 保留或转 FormData；另有文件表单与 QS 编码。请求先合并公共参数并移除 null/undefined，SID 字段若存在会数字化或回退上下文 SID。是否生成头依赖运行环境；V1/V2 的签名提供方不同，不能只凭相同路径互换鉴权。[S5]

GET 包装最终是 `i.get(path, mergedObject, extraConfig)`，静态源码没有在这层把业务参数统一包装成 `params`；实际 query 是否发送要检查调用方传入的是 Axios config 还是普通参数，不能从函数第二参数推断完整 query schema。[S5]

| 模块 | 导出名 | 字面 basePrefix | 传输 |
|---|---|---|---|
| 563526 | `Hs` / `BO` | `/cloudspace/api` | `.post` / `.postJson` / `.postJson2` 均 POST |
| 563526 | `hj` | `/clouddisk/api` | 同上 |
| 563526 | `Go` | `/coreapi` | 同上 |
| 563526 | `Ex` | `/coreapi/app` | 同上 |
| 563526 | `T1` / `Vp` | `/cloudspace/web` / `/clouddisk/web` | 同上 |
| 563526 | `j7` | `/mix/app` | 同上 |
| 563526 | `mP` / `mS` | `/zero-user-wx` | 同上；公共身份参数策略有区别 |
| 563526 | `B4` / `HV` | `/zero-usercenter` / `/usercenter` | 同上 |
| 563526 | `ZX` | `//question-bank-business-service` | 同上；保留源码双斜杠，不推断为独立 host |
| 563526 | `p2` | `/cloudspace/api` | V2 工厂返回函数，POST JSON |
| 169997 | `Rh` / `b6` | `/lms/app` | 分别主 V1/V2，POST JSON |

以上映射来自 S5/S6。云盘 `uR` 是动态 prefix 工厂；其 host 优先用客户端信息 `hosts.dynamic`，其次 `EEOConfig.DYNAMIC`，否则返回相对 prefix。`Go/T1/Vp` 直接使用底层工厂，不经过该 host 回调；底层初始主机按其 hostname 映射改写 location.origin。不能把所有表项简单加页面 host 后称为实际请求 URL。[S6]

**业务成功码得到进一步确认，但仅限云盘封装：**模块 `563458` 的 `.post` 在返回数据后要求 `data.error_info.errno === 1`，失败抛错；`.postJson` / `.postJson2` 返回 data，未执行同一 errno 检查。主模块 `629297` 主要返回 `response.data`，没有统一要求 `errno=1`。因此之前四文件“未提供统一 errno 合同”的结论仍成立，补充证据也不能把该码推广到全部接口。[S5][S6]
