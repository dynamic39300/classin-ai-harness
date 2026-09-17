---
title: ClassIn 测试 14 资源相对下载路径解析
date: 2026-09-15
status: VERIFIED_FOR_THREE_AUTHORIZED_TEST_RESOURCES
scope: 只读源码、原生日志与授权测试资料下载；未修改业务数据或应用代码
---

# 结论

测试 14 当前授权样本的 `upload/files/file01/...` 使用 **`https://wsevlf001.eeo.im/`** 作为下载基址。它有原生客户端真实请求及成功完成日志支持；本次按相同规则读取 PDF、作业 PNG 和录播 MP4 均返回 HTTP 200、零重定向、完整字节。读取不需要 Cookie、业务鉴权 Header 或 COS 临时凭据。PDF 和 PNG 的 SHA-256 分别与仓库对应生成资料清单一致。[原生证据与本次验证](#一手证据)

这是三个已授权测试资源的实际结果，不能外推为任意环境、任意资源的公共下载合同。COS 上传配置中的 `Domain/Bucket/Region` 不能替代已经证实的下载基址。`getDownInfo` 或 `downloadSourceFile` 成功只表示取得了下载描述，仍应验证实际文件读取。[接口样本](#接口与实测)

## 范围与 Write Set

上游为 D-155、[接入 PRD](../04-specs/features/classin-test-integration/PRD.md) R3/R5、[Feature Spec](../04-specs/features/classin-test-integration/FEATURE-SPEC.md) §4/7、CI-008。研究只解决已经归属校验的资料如何读取；不执行上传、登记、编辑、发布或发送，不研究其他账号的私人资源。

公开交付仅本文件。原始字节和脱敏验证元数据保存在被忽略目录 `.runtime/private/classin-integration-int0-2026-09-14/resource-download-resolution/`，目录权限 0700，文件权限 0600。研究没有公开完整资源路径、签名 URL、凭据或学生信息。未修改应用和测试代码，因此本研究不构成产品下载功能验收。

## 一手证据

### 当前公开客户端

2026-09-15 读取 [ClassIn six 入口](https://wsevlf001.eeo.im/client/lmsbleach/six/)，内嵌配置 `__version=v609.202609142017.six.14`、`ENV=14`、`DYNAMIC=dynamic14.eeo.im`。旧 [resource-manifest](./classin-pc-api-scan-2026-09-11/resource-manifest.json) 的构建版本为 `v6.202609091558.six.14`；本轮以当前页面重新发现的脚本为准。

当前入口仍引用 [classin-api-c63e0376.7324ddcf27d5116585e6.js](https://wsevlf001.eeo.im/files/frontend/classin/lms-bleach-six/dist/static/js/classin-api-c63e0376.7324ddcf27d5116585e6.js)。SHA-256 为 `0cb773758f6578f9aabaa76b5b14af33f8d7cfcdef4622c1de2525c45ff553e8`。该脚本的下载导出映射为：

| Web 导出 | 桥接方法 |
| --- | --- |
| `downloadFiles` | `cloudDisk.downloadFiles` |
| `downloadFileByUrl` | `cloudDisk.downloadFileByUrls` |
| `downloadFilesWithCbk` | `cloudDisk.downloadFilesWithCbk` |

定位：第 1 行，字符偏移约 17,262–17,350；上文约 16,000 处 `G` 工厂按运行平台调用 native bridge，同时保留浏览器 Mock 分支。该源码证明下载封装存在原生边界；浏览器 Mock 返回成功不能作为下载完成证据。本轮未取得 C++ URL 拼接实现，实际基址由下述 native 请求和字节读取确认。

### 原生客户端实际下载

来源：本机 `~/Library/Application Support/ClassIn/log/ClassIn_20260914_193716_220995_9001.xlog`。仅定向提取下载请求、完成状态与下载域名，未复制整份日志。

| 本地时间（UTC+8） | 原生日志位置 | 脱敏结果 |
| --- | --- | --- |
| 2026-09-14 19:45:49.630 | `EeoNetworkAccessManager.cpp / createRequest / 103` | 请求 `https://wsevlf001.eeo.im/upload/files/file01/<redacted>.pdf` |
| 2026-09-14 19:45:49.631 | `FileDownloader.cpp / startDownload / 159` | 开始上述 PDF 下载 |
| 2026-09-14 19:45:50.222 | `FileDownloader.cpp / emitFinished / 712` | `normal`，72,290 字节，596 ms |
| 2026-09-14 20:38:45.452 | `EeoNetworkAccessManager.cpp / createRequest / 103` | 同主机另一 PDF 请求 |
| 2026-09-14 20:38:45.838 | `FileDownloader.cpp / emitFinished / 712` | `normal`，71,193 字节，390 ms |

日志中的上述 URL 没有 query。它支持当前测试环境下载主机的选择，不证明所有 native 下载都无签名。

## 接口与实测

本次既有受限样本位于 `.runtime/private/classin-integration-int0-2026-09-14/lms/`，按 `learningMaterials`、`homework`、`recordClass` 区分：

| 接口 | 定义定位 | 当前返回 |
| --- | --- | --- |
| `/lms/app/file/getDownInfo` | Apifox 345129 / 3495858；表单 `fileId` | `data.src` 为相对路径，无 query |
| `/cloudspace/api/appendix/downloadSourceFile` | Apifox 345291 / 3500787；`UID`、`originId` | `data.filePath` 为相同相对路径，附 `n` query |

具体输入仍依赖前置 `/lms/app/file/getFiles` 的合法附件关系；不能把 LMS 附件 ID、云盘 `originId` 和 `userFileId` 混为一谈。以上接口响应证据分别保存在 `*-getDownInfo.json`、`*-cloud-download.json`，元数据在 `*-getFiles.json`。

本次以固定主机加 `src` 请求完整文件；HTTP 客户端禁用重定向，未发送鉴权 Header/Cookie。另对完整 `filePath`（保留 `n` 参数）重复读取，三项均与无 query 版本 SHA-256 相同。

| 文件 | HTTP / 重定向 | Content-Length / 实际字节 | 文件识别 | 源文件比对 |
| --- | --- | --- | --- | --- |
| 第 1 讲学习资料 PDF | 200 / 0 | 72,290 / 72,290 | `%PDF-1.4` | 与 [PDF 清单](./classin-learning-materials-2026-09-13/manifest.json) 第 1 讲 SHA-256 相同 |
| 第 1 讲作业题图 PNG | 200 / 0 | 72,649 / 72,649 | 标准 PNG signature | 与 [作业图片清单](./classin-homework-images-2026-09-13/lesson-01-manifest.json) 第 1 题 SHA-256 相同 |
| 录播 MP4 样本 | 200 / 0 | 6,321,537 / 6,321,537 | ISO BMFF `ftypisom` | 与带 `n` 的接口下载版本 SHA-256 相同；未核对本地原视频源 |

三个上游 `Content-Type` 均为 `application/octet-stream`。类型判断需要合法附件元数据及 magic/解析器，不能把该 MIME 当失败，也不能直接信任文件名。PDF 另以 `Range: bytes=0-15` 读取，返回 206、16 字节和一致的 PDF 文件头；PNG/MP4 Range 未测。

完整哈希：

| 文件 | SHA-256 |
| --- | --- |
| PDF | `934567861dcc6a9ce29430f4295f10edfafdb9a0201bbb1155f7b9e210cbe202` |
| PNG | `e68ab1e70ad16f27ea43933b23bd59659403fb5e3c20c7967fd6644e96f6db29` |
| MP4 | `daa8fec61db3424d5040bb8a100dc25b428940cb85627542d65689091edb06c7` |

验证元数据为私有目录中的 `verification.json`；对应文件为 `learningMaterials.pdf`、`homework.png`、`recordClass.mp4`。本轮读取完整字节，但未执行 PDF 全文抽取、图片语义识别、视频解码或转录。元数据可用与教学内容已被模型理解仍需分别标记。

## 可执行接入建议（RECOMMENDATION）

1. 继续由服务端现有 `ClassInTestService` 按教师、班级、课程、活动核验归属，再从活动附件取得合法文件引用。浏览器只提交活动/附件引用，不接收任意 URL 或供应商原始路径。
2. 使用已实测的 `getDownInfo` 取得 `src`；现有样本可在测试 14 Adapter 内使用固定 `https://wsevlf001.eeo.im/` 解析。`downloadSourceFile` 的 `filePath` 也已验证，保留其 query 原样，不能把 `n` 自行解释成签名算法。
3. 只接受当前合同的相对 `upload/files/file01/` 路径，拒绝 scheme、authority、反斜杠、路径穿越和编码绕过；解析后再次校验 HTTPS、固定主机和允许路径。拒绝重定向，不跟随任意供应商返回地址。未来出现其他路径前缀应单独核实合同。
4. 文件 HTTP 请求不要附带 ClassIn 业务 Token 或 COS 凭据。使用超时、流式字节上限和长度校验；本研究的 40 MB 读取上限仅是研究保护，产品上限需在 Spec 中确定。内部保留下载哈希和读取时间，面向模型只提供经许可抽取的内容及来源引用，不提供原始下载路径。
5. PDF/PNG 下载可用已取得源哈希强校验；视频只验证可读取的 MP4 字节，播放器/解析器验收后才声称可播放/可解读。失效、404、大小异常、类型不匹配和解析失败保持各自的 unavailable 状态，不从旧生成源文件回填冒充当前业务文件读取。

## 尚未确认

- Native C++ 内部基址配置/选择算法及各环境映射没有取得；不能推导测试 13、生产或其他资源目录的主机。
- `n` 的服务端语义与所有文件下载权限/过期机制没有取得；本次匿名字节读取成功不证明这些资源具有长期公共分发授权。
- 跨教师拒绝、附件权限变更、撤销/过期、异常重定向及断流恢复需在产品实现阶段验证。本研究没有对其他身份或未经授权资源作探测。
- 当前结论解除三类授权样本“相对路径无法读取”的技术阻碍，不代表 CI-008 的媒体内容理解、CI-009 的模型自主读取或全部里程碑已经完成。

## 产品接入后验证补记（2026-09-15 01:24）

CI-008d已按PRD→Spec→Tickets实现受限附件读取。14份资料的实际PDF均解析出1页、424–518字符文字，首讲资料正文进入同源Context；未使用原生成文本回填。作业PNG在真实页面显示为1200px宽。4段录播均通过同源路由在Chrome解码并开始播放，分辨率1280×720，时长分别341.20、346.15、330.80、338.44秒；未全程观看或转写。此前研究阶段未解析/未解码的限制已在这些具体样本解除，媒体语义理解仍未实现。

PDF解析使用[PDF.js官方Node示例](https://github.com/mozilla/pdf.js/blob/master/examples/node/getinfo.mjs)中的getDocument/getPage/getTextContent模式，固定pdfjs-dist6.3.289。私有browser目录保存各样本结果与截图。142文件/901项Vitest及19项Playwright通过，不能据此推导普通IM交付闭环完成。
