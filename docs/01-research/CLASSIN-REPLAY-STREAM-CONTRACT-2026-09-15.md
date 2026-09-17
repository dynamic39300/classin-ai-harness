---
title: ClassIn 首讲课堂回放流式读取合同
date: 2026-09-15
status: VERIFIED_BOUNDED_STREAM_AND_BROWSER_PLAYBACK
scope: PRD R5/R6、C16；媒体合同研究及CI-008h实现后的只读播放验收
---

# 结论

当前授权首讲 `getLessonRecordInfo` 返回的唯一回放版本支持原生 HTTP 字节范围读取。对响应中的真实 HTTPS 地址执行一次 HEAD 和两个 32 字节 GET：HEAD 返回 200，两个 GET 均返回正确 206，文件总长度与元数据 `Size=163168524` 一致，首段含 `ftyp/isom`。三次请求没有重定向，没有发送 Cookie、ClassIn 业务凭据或 Referer。媒体正文累计只读取 **64 字节**，未下载整段回放。[本次受限证据](#证据与实测)

上述初始研究只证明当前版本的 HEAD/首段/尾段读取。后续已按 Spec §15 → Ticket CI-008h 实现同源流式播放并完成真实 Chrome 解码、开始播放、跳到600秒继续播放和关闭验收，详见文末增量记录；没有验证整片完整性或所有进度位置。

## 上游合同与 Write Set

依据 [接入 PRD](../04-specs/features/classin-test-integration/PRD.md) R5/R6、[Feature Spec §14](../04-specs/features/classin-test-integration/FEATURE-SPEC.md)、[回放元数据合同](./CLASSIN-REPLAY-METADATA-CONTRACT-2026-09-15.md)。课堂回放与独立录播活动是不同数据合同；旧小附件的 20 MiB 全量读取边界不能直接扩大到本文件。

`getLessonRecordInfo` 的机构、课程、课节、当前教师请求范围和 `lessonId/teacherUid` 核验仍适用。`canPlay=1` 是当前请求成员权限信号，不能代替文件存在性；`canShow=0` 只控制次数文案。对本次唯一文件观察到成功状态和唯一 `Definition="0"`，不外推完整状态或清晰度枚举。

本任务公开 Write Set 仅本文件；私有 Write Set 为 `.runtime/private/classin-integration-int0-2026-09-14/replay-stream/`。没有修改产品代码或调用业务写接口；没有主动记录播放次数，CDN 读取是否影响其他统计未核实。

## 证据与实测

来源响应：`.runtime/private/classin-integration-int0-2026-09-14/replay-metadata/class-1250723-response.json`。

实际字段位置：`data.lessonData.fileList[0].Size` 为文件总大小；`Playset[0]` 只有 `Definition` 和 `Url`，**没有 Size**。本次只从这个真实响应取 URL，不构造或硬编码媒体对象地址。解析确认 scheme 为 HTTPS，主机为 `playback.eeo.im`，无用户信息、fragment 或 query。完整路径不进入本研究文档、日志输出或验证 JSON。

HTTP 客户端禁用重定向，使用正常 TLS 证书验证、15 秒请求超时及 `Accept-Encoding: identity`。GET 只在响应为 206、Content-Length 为 32 且 Content-Range 符合请求时读取 32 字节，否则关闭响应并不读取正文。没有添加 416 或第三次 Range 探测。

| 请求 | 状态 | Content-Length | Content-Range | 实际读取正文 | 耗时 |
| --- | --- | --- | --- | --- | --- |
| HEAD | 200 | 163168524 | 未返回 | 0 B | 207 ms |
| GET `bytes=0-31` | 206 | 32 | `bytes 0-31/163168524` | 32 B | 137 ms |
| GET `bytes=-32` | 206 | 32 | `bytes 163168492-163168523/163168524` | 32 B | 132 ms |

三次均为 `Content-Type: video/mp4`，均没有 `Content-Encoding` 或 `Location`；零重定向。HEAD 返回 `Accept-Ranges: bytes`，两个 206 响应未返回 Accept-Ranges。因此不能要求每个 206 都附带 Accept-Ranges 才认可有效范围响应。

三次 ETag 完全相同且无 `W/` 前缀；完整 ETag 仅保存在私有验证 JSON，不能把其字符串当作媒体 MD5。Last-Modified 均为 `Mon, 14 Sep 2026 11:50:04 GMT`。这些是 HTTP 资源校验字段，不能替代业务响应的录制时间或文件生成时间。首段偏移 4–7 为 `ftyp`，major brand 为 `isom`；尾部只验证范围可读，不推断 `moov` 位置、编码和完整可播放性。

私有目录权限 0700，文件权限 0600：

- `verification.json`：来源响应 hash、脱敏主机/协议、请求范围、允许的响应头、读取字节数、分段 SHA-256、耗时。
- `prefix-32.bin` 和 `suffix-32.bin`：两个各 32 字节样本。

没有整文件 hash，也没有媒体正文之外的额外下载。

## RFC 9110 核对

以下为协议摘要，区别于上述真实服务验证：

- Byte Range 使用从 0 开始、含端点区间；可请求 `start-end`、`start-` 或末尾 `-length`。Range 修改 GET 语义，服务端可忽略 Range，因此收到 200 不能冒充 206。[§14.1.2、§14.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.1.2)
- 单段 206 必须包含描述实际范围的 Content-Range；Content-Length（若返回）表示本次正文长度，不能填写整文件长度。[§15.3.7.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.7.1)
- 416 表示请求范围不能满足或范围集合被拒绝；字节范围 416 应带 `Content-Range: bytes */<当前总长>`。它不能用于代替鉴权失败。[§15.5.17](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.17)
- If-Range 可用于校验版本；验证条件不满足时忽略 Range，返回完整表示。不能使用弱 ETag 作为 If-Range。[§13.1.5](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.5)

本次未请求 416、If-Range 或多段 Range，上述语义需要在实现测试中验证，不能写成 playback.eeo.im 已实测行为。

## Node.js 官方流合同

核对 [Node.js v24 Streams 文档](https://nodejs.org/docs/latest-v24.x/api/stream.html)：

- `pipeline` 管理流转发及背压；手动 `write()` 返回 false 时需要等待 `drain`。`highWaterMark` 是暂停继续取数的阈值，不是严格内存硬上限。[Buffering](https://nodejs.org/docs/latest-v24.x/api/stream.html#buffering)、[drain](https://nodejs.org/docs/latest-v24.x/api/stream.html#event-drain)
- Promise `pipeline(..., { signal })` 被中止时销毁参与流并以 AbortError 结束；`addAbortSignal` 同样将 abort 关联到底层流销毁。[pipeline](https://nodejs.org/docs/latest-v24.x/api/stream.html#streampipelinesource-transforms-destination-options)、[addAbortSignal](https://nodejs.org/docs/latest-v24.x/api/stream.html#streamaddabortsignalsignal-stream)
- `finished(..., { signal })` 只取消完成等待，不会中止底层流，不能单独承担浏览器断开后的上游取消。[finished](https://nodejs.org/docs/latest-v24.x/api/stream.html#streamfinishedstream-options-callback)
- pipeline 错误可能销毁 HTTP socket；应先验证业务与上游响应再开始管道，不能假定管道失败后仍可补写 JSON 错误响应。[pipeline 注意事项](https://nodejs.org/docs/latest-v24.x/api/stream.html#streampipelinesource-transforms-destination-callback)

## 下一票实现建议（RECOMMENDATION）

1. 同源播放请求只提交已授权课堂的业务引用和受控文件/版本选择。每次 HEAD/GET/Range 都重新检查教师会话、课程活动归属与新鲜回放权限；从该次合法响应选择文件，禁止让浏览器提供上游 URL。旧元数据成功不能作为永久播放授权。
2. 上游只允许精确主机 `playback.eeo.im`、HTTPS、标准端口，无 userinfo/fragment，禁重定向。使用原始返回的合法路径，不复用 `wsevlf001.eeo.im` 附件基址，不附带业务 Token/Cookie。任何未来新主机需单独核实。
3. 首版明确支持单段闭区间、开放尾区间及 suffix。完成业务校验后才计算 206/416；无效语法、未知单位、多段请求应有独立明确策略，不能把所有不支持输入都解释成真实资源越界。范围整数必须安全、范围实际长度与 Content-Range/Length/文件 Size 一致。
4. 采用有背压的上游→服务端→浏览器管道，禁止 `arrayBuffer()`、全量 Buffer 拼接或先下载后切片。每请求设置有限缓冲与并发、字节计数和中止控制；浏览器提前关闭、上游超时或异常长度须终止上游。网络总字节数与常驻内存是不同限制，不能靠扩大 20 MiB 旧上限解决大回放。
5. 请求 identity 编码并校验响应未变换表示。验证成功后只发送允许的 Content-Type、Content-Length、Content-Range、Accept-Ranges 和合法校验字段，并沿用 no-store/nosniff。对于带 Range 却返回 200 的上游，首版可取消读取并明确失败；若支持 If-Range 条件不满足返回 200，应作为单独完整流式分支，不可改标 206。
6. 发送响应头前出现错误可输出脱敏错误状态；开始媒体输出后出错则关闭流，不能混入 JSON。清理 timer、abort/close listener 与请求计数，区分正常完成和客户端中止。页面仍显示录制范围限制，播放入口不暗示完整课堂已被覆盖。

## 验收缺口

初始探测没有覆盖真实浏览器播放/seek、完整视频解码、moov 检查、断流和慢消费者压测、权限撤销、跨教师拒绝或异常响应。CI-008h随后补充了下列验证；整片完整性、真实权限撤销及慢消费者压力测试仍未覆盖，C16仍为部分完成。

## CI-008h 实现后的增量验证

实现依据：[Spec §15与Ticket CI-008h](../04-specs/features/classin-test-integration/TICKETS.md)。服务端每个媒体请求重读授权范围、课堂归属和当前成员的回放权限；浏览器只持有活动ID和不可透明解析的版本引用。先校验32字节MP4头、当前Size和强ETag，再以If-Match读取对应完整/部分流，实际返回ETag必须相同。支持200/206/416，保留15秒响应头/待取块超时、字节长度检查及Node pipeline背压；关闭或错误中止上游，不先缓冲163MB文件。

2026-09-15 03:30，真实V2页面的Chrome结果：

| 项目 | 结果 |
| --- | --- |
| 视频元数据就绪 | 点击后5,255ms；1920×1080，1707.066秒 |
| 实际播放 | currentTime到1.022秒，paused=false |
| 进度跳转 | 设为600秒后继续到601.022秒，paused=false，media error为空 |
| 关闭与版式 | 关闭后video元素移除；无pageerror、无页面横向溢出；截图人工核对 |
| 浏览器媒体请求 | 四次同源206，范围起点为0、162136064、32768、64782336；每次重新授权，准备耗时742–1866ms |

浏览器Range请求可声明读取文件剩余部分；上表的Content-Length不是实际下载量。未将整段视频下载到磁盘，浏览器先探测尾部、再播放和跳转，关闭后请求释放；不把此次短时播放说成已看完或学生已观看。媒体路径和录制画面只留受限目录。

契约测试覆盖精确Range、忽略Range的200拒绝、版本改变、错误类型/长度/编码、非MP4、未读完与超出长度、背压、响应头超时、客户端断开、输出开始后错误关闭，以及课堂归属和权限撤销反例。实际测试环境的权限开关没有修改；该反例只由受控响应验证。私有证据：replay-stream/browser-playback.json、playback.png、bff-probe.json、bff-boundaries.json；完整检查结果以[回归清单](../04-specs/features/classin-test-integration/REGRESSION.md)为准。
