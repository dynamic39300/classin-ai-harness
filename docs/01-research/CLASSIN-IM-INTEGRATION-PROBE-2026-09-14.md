---
title: ClassIn 测试环境普通 IM 接入可行性探测
date: 2026-09-14；2026-09-16 追加真实客户端只读复核
status: READ_ONLY_HISTORY_VERIFIED — 已识别普通 IM 网关与历史读取协议；写入与生产接入合同仍待验证
scope: INT-0；私有 API 文档、已安装客户端静态证据、只读连通性
---

# ClassIn 测试环境普通 IM 接入可行性探测

## 结论

普通 IM 在原生客户端内存在明确的群发送、历史读取、成员读取与发送回执能力；本次未找到可由当前 V2 浏览器/服务端直接调用、并已验证鉴权的正式 HTTP 发送或 SDK 契约。因此 **INT-3 真实交付仍是待外部依赖，不能标记已接通**。这不阻塞有真实业务事实支撑的 INT-1 读取与 INT-2 草稿，但不能用它们替代最终发送验收。[S1][S3]

已确认两个易混淆的接口边界：`eeo_classchat /getChatList` 实际用于课堂内聊天；`push_gateway /ws/sendGroupMessage` 是通用业务推送，文档没有普通聊天持久化、教师发件身份或消息回读承诺。两者均不能直接充当普通班级群 IM Adapter。[S2][S3][S4]

2026-09-16 的追加实测改变了“尚未观察到普通 IM 运行时协议”这一部分判断：在当前已登录 ClassIn PC 测试客户端中，课程群页面通过 `chat-gateway-go` 建立独立 WebSocket，会话鉴权成功，并以 `requestChatMsg` 读取到真实消息对象。该证据证明普通 IM 历史读取协议在当前测试客户端中可用；它仍不是已经获得支持承诺的独立服务端 API，也不等于 V2 已接通消息发送、ACK、学生可见与断线恢复。

本子任务只写本报告和忽略目录内的私有证据；未发送消息、退出群、分享文件、修改成员、登录其他账号或修改产品实现。实现顺序沿用用户要求的 PRD → Spec → Tickets → Implementation。

## 2026-09-16 真实客户端追加复核

### 入口与运行条件

用户提供课程消息入口 `/client/lmsbleach/six/course/detail/{courseId}/teacher/chat?chatSessionId={courseId}`。普通无 Cookie 浏览器只能加载 Web 壳：客户端 API Mock 在读取 `allObjects` 时失败，路由落到 404，签名 WebSocket 握手返回 403。该结果说明此入口依赖 ClassIn PC 注入的身份、签名和原生能力，不能把公开 URL 当作匿名消息接口。

本轮随后附着本机已登录 ClassIn PC 的现有 CEF 调试目标，只执行页面重新加载和被动网络观察。没有读取或公开消息正文、成员姓名、UID、Cluster ID、Token、签名或媒体地址；没有调用任何写命令。

### 课程群映射 HTTP 接口

真实客户端在页面加载时调用：

```text
POST https://wdevlf001.eeo.im/chat-gateway-go/api/chatGroup/list
Content-Type: application/json

{ courseId, uid }
```

请求包含客户端生成的 `X-EEO-SIGN`、`X-EEO-TS`、`X-EEO-TOKEN`、`X-EEO-UID`、`X-APP-ID` 与客户端版本/设备头。本次 HTTP 200、`code=0`、`msg=ok`，`data.groups=[]`。空数组表示当前课程没有该接口返回的附加聊天分组，不能据此认定主课程群不存在；同一页面随后仍成功以主课程群 Cluster 读取历史。

课程入口将 `chatSessionId/courseId` 规范化为带类型的 Cluster 引用：

```json
{"id":"<courseId>","type":"group"}
```

用户私聊则使用 `type="friend"`。这是一手前端代码与本次运行时帧共同支持的映射；仍需服务所有方确认它是否是长期稳定合同。

### 普通 IM WebSocket 与历史读取

真实消息同步使用：

```text
wss://dynamic14.eeo.im/chat-gateway-go/ws
```

这条连接与 `push-gateway-ws-api/ws` 不同。后者仍是通知/业务推送；普通 IM 历史、当前会话和消息事件由 `chat-gateway-go/ws` 承载。本次握手返回 HTTP 101，随后 `auth` 帧返回 `status=authenticated`。

页面加载主课程群时观察到以下只读帧：

| 帧类型 | 数据形状 | 本次结果 |
| --- | --- | --- |
| `auth` | `uid/token/authType` | 客户端会话鉴权成功；不公开值 |
| `chatWith` | `clusterId/oldClusterId` | 当前会话切换成功 |
| `requestChatMsg` | `clusterId/msgId/count/isForward` | 成功返回一条历史消息对象 |
| `chat:subscribeGlobalEvent` | `eventName` | 注册全局 IM 事件 |
| `chat:subscribeClusterEvent` | `eventName/clusterId` | 注册当前群消息、状态和成员事件 |

历史消息响应的白名单结构包括 `clusterId/msgId/localId/talkerUid/time/type/content/mentions/quoteMsgId/reactions/sentStatus/isDeleted/isUndone/isMentionMe` 等字段。本文件不保留正文和身份值。协议还提供三种历史读取形式：

- `requestChatMsg {clusterId,msgId,count,isForward}`；
- `queryChatMsgsByLimit {clusterId,limit,lastMsgId}`；
- `queryChatMsgs {clusterId,srcMsgId,destMsgId}`。

已识别的实时事件包括 `receiveChatMsg`、`responseChatMsgs`、`membersChanged`、`sessionUpdated`、`undoChatMsg`、`msgStatusChanged`、`msgSendSuccess`、`msgSendTimeout`、`msgSendFailure` 与 `msgReactionChanged`。这些名称说明客户端有相应状态机，不证明 V2 已实现同等语义。

### 已识别但未执行的写命令

当前部署的真实前端包声明以下桥命令：

- `sendTextMessage {clusterId,text,mentions,quoteMsgId,agentMention?}`；
- `sendImage`、`sendLocalFile`；
- `cancelChatMsg`、`resendMessage`、`deleteMessage`；
- `updateSvrIndex`、`setMessageToTop`、`addMsgReaction/removeMsgReaction`；
- `getMembers/getMemberInfo/findClusterInfo/findUserInfo/getSessionsLastMsg`。

本轮没有执行上述写命令，没有以静态声明代替发送、幂等、ACK、回读或学生端可见验收。后续若进入实现，优先建立受支持的客户端桥或服务端合同；不得把调试端口、当前客户端 Token 或签名提取后固化到 V2。

## 一手文档发现

2026-09-14 使用已登录私有部署的 Apifox CLI 2.2.9；先读取命令帮助，再执行 `endpoint list/get`、`environment list` 和 `schema get`。扫描主分支的 `345368 eeo_classchat`、`345136 eeocn`、`345112 eeo_core_business`、`345144 eeo_core_service_go`、`345384 client_base`、`345452 eeo_push_gateway`、`345527 class-claw`。这些是本次搜索范围，不构成“所有内部服务均不存在 IM HTTP 接口”的证明。

| 项目 / endpoint ID | 方法与路径 | 文档事实与接入限制 |
| --- | --- | --- |
| 345368 / **3492958** | POST `/getChatList` | form 必填 `schoolId,classId,startTime`；可选 `lastMsgId,groupId,msgNum,groupOrder,msgType`。返回 `CourseID,SID,CID,Cmd,SourceUID,Timestamp,GroupID,MsgMainID,MsgSubID,TargetMsgSubID,HandlerUID,Type,Option,Status,Data`。客户端实际路径为 `/classroomchat/getChatList`，明确属于 `ChatInClassEngineImpl`。[S2][S3] |
| 345452 / **3502953** | POST `/ws/sendGroupMessage` | JSON 引用 schema `368524 SendGroupMessageRequest` → `368521 GroupMessageRequestData`；`requestData[]` 中必填 `event,groupId,type,biz,data`。未记录普通聊天消息 ID、落库、历史读取、教师身份委托或幂等保证；未调用。[S4] |
| 345452 / **3496944** | POST `push-gateway-sendmsg-api/ws/sendMessage` | `requestData[]` 包含 `uid,biz,data`，另有 `appID,version`；批量上限 100。业务 ID 支持 ClassIn/Flowin，返回 schema 为空对象。属于业务推送形状；未调用。[S4] |
| 345452 / **3497875** | POST `push-gateway-sendmsg-api/ws/sendCommonMessage` | `uids,biz,data,version` 与可选 `appID`；批量上限 100。没有普通 IM 回读契约；未调用。[S4] |
| 345136 / **3473603** | POST `/api/classin.api.php?action=quitCluster` | 写接口，仅读文档。`clientCourseId` 描述为“群ID（课程ID）”，提供班级课程 ID 与官方班级群关联的历史线索；不能据此推导所有群 ID 或 Cluster 类型。旧文档列出 `UID,signKey,timeStamp,classIdentity,source,version`。[S5] |
| 345136 / **3477983** | POST `/api/cloud.api.php?action=imShareFile` | 写接口，仅读文档。form 包含 `imFileId,SID,UID,source,version`，属于文件分享辅助接口，未提供普通文本发送契约。[S5] |

`class-claw` 的 `/session/send`、`/session/detail` 等是独立会话服务；本次没有把它或 Agent Runtime 的 `messages` 作为 ClassIn 普通 IM 能力。

`eeo_classchat` 的测试环境 base URL 仍是占位值 `http://test-cn.your-api-server.com`，因此不可单凭文档拼接服务域名。实际 `/classroomchat/` 前缀来自已安装客户端。`push_gateway` 的测试环境配置指向 `https://dynamic14.eeo.im/`，但这只确认部署入口，不能补齐消息语义或鉴权。[S2][S3][S4]

## 只读实测

全部业务请求使用现有 `reference/classin-api/scripts/classin_api.py`，固定测试入口 `https://dynamic14.eeo.im`，使用现有安全配置的测试教师签名，不打印请求头或凭据。课堂对象取自主代理当天回读的目标班级活动；目标 ID 只保留在私有回执中。[S6][S7]

| 探测 | 2026-09-14 结果 | 可证明与不可证明 |
| --- | --- | --- |
| 文档原路径 POST `/getChatList`，form | HTTP 404，约 108 ms | 原路径不能直接挂在统一测试网关根部；请求未到有效业务处理，不能判断成员权限或数据。 |
| 客户端路径 POST `/classroomchat/getChatList`，目标首讲 `schoolId,classId,startTime,msgNum=1` | 返回 `{"code":1,"msg":"OK","data":[]}`，约 369 ms | 已获得服务的 OK 响应，当前查询窗口无返回消息；没有实际消息样本，不能验证分页、字段或收件。它只证明课堂聊天读取，不证明普通群聊读取。 |
| 当前测试客户端聊天/课程缓存的 SQLite schema，只读 `mode=ro` | 两个文件均 `file is not a database` | 标准 SQLite 不能直接读；未尝试解密、提取密钥或修改缓存。不能将本地缓存设为权威接口。 |

接口成功码存在差异：现有通用脚本将 `code==0` 或 `error_info.errno==1` 视为成功，因此上述 `code=1,msg=OK` 响应使脚本退出码为 1。该退出码不能单独当作鉴权失败证据；若未来接入课堂聊天，应独立核对服务专属响应合同，不扩大成“所有 `code=1` 都成功”。[S2][S6][S7]

## 原生传输、身份与群映射

本机已安装客户端提供下列静态符号证据。符号证明客户端实现中存在相应职责，**不等同于外部可调用 API、稳定 ABI 或授权桥接合同**。原始符号片段和文件 SHA-256 保存在私有证据，未读取账号日志。[S3]

| 模块 | 观察到的符号 | 含义与限制 |
| --- | --- | --- |
| `libEeoChatEngine.dylib` | `ChatInGroup`、`GetForwardChatInGroup`、`GetBackwardChatInGroup`、`GroupChatRecvAckResponse`、`msgSendSuccess`、`msgSendFailure`、`msgSendTimeout`、`onSetGroupMsgPersonalReadCursor` | 普通群聊有独立发送、历史、ACK 与读游标；不能把 ACK 当全员已读。 |
| `libEeoContactsEngine.dylib` | `GetGroupInfo`、`GetGroupMemberList`、`GetBatchGroupInfo`、`requestOfficialGroupSnapshot`、`ClusterID` | 有官方群快照、群详情与成员能力；实际 Cluster 类型、目标群 ID、角色及成员仍须运行时契约确认。 |
| `libEeoCoreEngine.dylib` | `LBGateway`、`CheckIn`、`UserLogin`、`requestCheckIn`、`responseLogin` | 原生会话有独立建连/登录流程；不能假定用于 HTTP SignV2/JWT 的教师 secret 自动满足原生登录。 |
| `libchatbase.dylib` | `sendTextMessage`，邻近参数 `text,jsonMentions,quoteMsgId`；发送成功/失败/超时事件 | 支持文本、提及/引用的客户端内部调用线索；提及语义、长度、编码、签名、授权和消息 ID 合同未知。 |
| `plugins/libImPlugin.dylib` | `chatBridge`、`WebSocketServerWorker`、`ImMainPageWebView`、`MainWindow::onSendChatMessage` | 已有内嵌网页桥线索，但相邻内容主要是主界面/LMS/云盘，不能证明 V2 外部页面能接入。未连接其私有 WebSocket、注入页面或调用内部方法。 |

班级到群的当前证据：目标班级列表能够返回真实教师关系与 `forbidChat/switchChat` 设置；旧群退出 API 将 `clientCourseId` 注解为群 ID。它们尚未提供目标普通 IM 群的权威快照和实际成员回读。V2 不能把 `forbidChat=0`、`switchChat=1` 或已知班级 ID 单独作为“当前教师可向此群发送”的最终授权。[S5][S7]

## 可行的下一步集成路径

优先向 ClassIn IM/PC 模块维护方取得 **测试环境受支持的 SDK 或客户端桥接合同**，由本机/服务端 Adapter 接入其登录会话及普通 IM 的发送、群快照、历史读取。已安装客户端的模块和上述具体符号可直接用于定位负责人及接口。另一可行路径是正式服务端 IM API，由服务所有方提供教师身份委托与普通消息落库/回读合同；现有 `push_gateway` 文档不满足该条件。

进入 INT-3 实现前，Spec/Tickets 应逐项取得以下证据：

1. **身份和环境**：测试会话建立方式、教师 UID 绑定、会话有效期、并发登录影响、dynamic14/测试 IM 地址及授权范围。凭据只由服务端/受支持客户端会话持有。
2. **目标映射**：班级课程 ID → 官方群 Cluster 类型及 ID → 当前成员和教师可发送权限；以真实目标班级及三个测试学生核对，不能靠名称或硬编码类型推定。
3. **发送与消息身份**：普通文本/提及的请求定义、服务分配的稳定消息 ID、时间、发件人、失败码；确认幂等能力和响应丢失后的结果查询方式。
4. **回读与同步**：正/反向分页、游标、撤回/删除、重连增量与权限错误。历史回读命中消息后，再用三个学生客户端验证同一消息可见；发送 ACK 不代替学生可见证据。
5. **执行约束**：教师确认后重验草稿依赖、排课/成员/权限；持久化逻辑请求与消息引用；结果未知时先核实，避免盲目重发。Copilot 与普通 IM 共用同一真实传输实现。

未取得这些契约期间，产品只可标为“真实测试数据读取/草稿，普通 IM 发送未接通”。让教师在原生客户端手动发送可以作为过渡操作，但不满足 V2 API 真实交付闭环，也不能使 C12/C13 通过。[S1]

## 证据索引与复现

- **S1**：[测试环境升级方案](../06-architecture/CLASSIN-TEST-INTEGRATION-UPGRADE-PLAN-2026-09-14.md)，尤其 4.6、INT-0/INT-3 与 C12/C13。
- **S2**：私有 [Apifox](https://apifox.eeo-inc.com) 项目 345368，`apifox endpoint get 3492958 --project 345368`；`environment list --project 345368`。完整快照：私有目录 `endpoint-345368-3492958.json`、`chat-env.json`。
- **S3**：本机 `/Applications/ClassIn.app/Contents/Library/` 下上述五个模块的静态字符串。私有目录 `native-evidence-manifest.json` 保存哈希；`*-selected-symbols.json`、`*-bridge-context.json`、`*-bridge-mapping.json` 保存针对性证据。
- **S4**：同一私有 Apifox 项目 345452，endpoint 3502953/3496944/3497875，schema 368524/368521，`push-env.json`。未调用任何写接口。
- **S5**：同一私有 Apifox 项目 345136，endpoint 3473603/3477983。只读取定义；`quitCluster` 与 `imShareFile` 均未执行。
- **S6**：[调用脚本](../../reference/classin-api/scripts/classin_api.py) 与 [调用规范](../../reference/classin-api/SKILL.md)。
- **S7**：受控目录 `.runtime/private/classin-integration-int0-2026-09-14/im/` 中 `probe-summary.json`、`read-chat-list-direct.*`、`read-classroomchat-list.*`、`native-test-db-schema.json`；主代理相邻 `lms/classes.json`、`lms/activities.json` 提供目标关联。目录权限 0700、文件 0600，不提交私有响应。

复现 Apifox 较大响应时，将 CLI stdout 直接写入权限 0600 的文件再解析；本次 `capture_output` 曾得到截断 JSON，已对完整 eeocn 列表改为直接文件输出并成功解析 376 项。不要把截断列表当作“未找到接口”的完整证据。

本报告完成了文档查找、原生静态归因与只读路径探测；普通 IM 正式鉴权、目标群快照、发送、分页回读、去重、学生可见及权限恢复仍未验证。未以假传输或静态符号替代这些验收。
