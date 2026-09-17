---
title: ClassIn 已提交作业图片读取合同
date: 2026-09-15
status: VERIFIED_FOR_ONE_AUTHORIZED_SUBMISSION_IMAGE
scope: 当前授权首讲作业的一名已提交学生；只读接口及一张图片
---

# 结论

当前授权首讲作业的已提交答图可以复用 LMS 文件读取链：教师签名读取正式提交 → 精确取得答图 `lmsFileId/fileId` → `getFiles` 核对附件关系和状态 → `getDownInfo` 核对相同路径 → 固定 `https://wsevlf001.eeo.im/` 读取实际图片。`getFiles` 本次只传 `activityId/lmsFileIds`，**不需要 studentUid**。答卷图片有独立附件关系，不是教师题干图片的附件 ID。[本次证据](#真实归属与附件关系)

实际答图为 **JPEG，900×1234，114,216 字节**，HTTP 200、零重定向、文件头 `FFD8FF`。上游 MIME 为 `application/octet-stream`。本次直接读取 API 返回关系对应的媒体，没有使用仓库生成源图片替代。[媒体验证](#媒体读取)

`isDownload=1`、答图 `filePermission=0` 是本次实际条件。Apifox 没有定义下载开关对“教师读取学生答卷”的独立语义，因此**本研究不能回答 isDownload=2 时教师是否仍可读取**，也不能把 filePermission=0 自动解释为所有人禁止预览。[权限缺口](#下载开关与权限边界)

## 范围与 Write Set

依据 [ClassIn 测试接入 PRD](../04-specs/features/classin-test-integration/PRD.md) R3/R5/R6、[Feature Spec 的作业提交合同](../04-specs/features/classin-test-integration/FEATURE-SPEC.md)、[既有提交读取记录](./CLASSIN-TEST-INTEGRATION-PROBE-2026-09-14.md)。仅研究已授权首讲作业中的指定正式提交；不读取其他学生正文或图片，不修改学生作答、作业开关、批阅或上传对象。

公开 Write Set 仅本文件。私有证据位于 `.runtime/private/classin-integration-int0-2026-09-14/submission-image/`，目录 0700，文件 0600。没有改产品代码。报告只保留字段、计数、验证结果和媒体哈希，原始响应、地址及票据不进入本报告。

## 当前 Apifox 定义

2026-09-15 使用已登录 Apifox CLI 2.2.9 只读取得下列项目 `345129` 的最新 endpoint 定义；原始定义分别保存为私有目录 `endpoint-<id>.json`。以下为 Apifox 一手字段，不以历史脚本成功替代。

| 接口 ID | 网关路径 | 当前声明请求 |
| --- | --- | --- |
| 3471031 | `/lms/app/activity/homework/get` | 表单 `activityId/courseId` |
| 3471069 | `/lms/app/activity/homework/students` | 表单 `activityId/courseId`，可选 `identity`，1 教师、2 学生 |
| 3499108 | `/lms/app/activity/homework/student/detail` | 表单 `activityId/studentUid/courseId` |
| 3486110 | `/lms/app/file/getFiles` | `lmsFileIds` 为 LMS 附件关系 ID 的 JSON 数组；可选 `activityId` 用于返回 `isDel` |
| 3495858 | `/lms/app/file/getDownInfo` | `fileId`，文档说明为云盘文件 ID |

前三个和 getFiles 在文档 path 中省略 `/lms` 前缀；getDownInfo 文档已包含该前缀，网关拼接不能重复加 `/lms`。getFiles/getDownInfo 声明 multipart/form-data；本次与现有 transport 一致使用签名 `application/x-www-form-urlencoded`，全部业务返回 `errno=1`。3499108 的表单字段列出必填 studentUid，但附带的 JSON schema/example 未同步该字段；本次按表单字段调用。

`getFiles` 文档说明它读取 LMS 附件关系及关联云盘数据，未提供本次全部返回字段的详尽 Schema。下述字段和值属于本次实测合同，不推导跨环境完整枚举。

## 真实归属与附件关系

读取使用当前授权教师凭据及仓库签名函数，固定 `dynamic14.eeo.im`、禁重定向；媒体请求没有附带该教师业务凭据。

1. 新鲜 homework/get 返回活动字段名 **`id`**，不是 `activityId`；同时存在 `bizId`。本次 `id/bizId/courseId/schoolUid/teacherUid/categoryId` 与授权作业、课程、机构、教师及分类全部一致。
2. 新鲜 homework/students 为 3 人数组，目标学生唯一存在，`stStatus=1/isDraft=0`。其 `stuHomeworkId` 与详情 `stu_homework_detail.stu_homework_id` 一致。读取名单没有替代具体答卷归属校验。
3. student/detail 的 `stu_homework_detail` 四归属字段 `student_uid/homework_id/course_id/school_uid` 分别与目标学生、homework/get.bizId、授权班级、机构一致。`status=1/is_del=0/is_draft=0`，符合当前正式提交读取条件。
4. 正式提交 `image` 是 **JSON 字符串**，解析为一项数组。不能把它按单 URL 或裸数组默认处理。

| `image[]` 字段 | 实际类型 | 使用边界 |
| --- | --- | --- |
| `fileId` | integer | 云盘原文件引用，与 getFiles.fileId 核对 |
| `lmsFileId` | integer | LMS 附件关系引用，与 getFiles.lmsFileId 核对 |
| `fileName` | string | 展示名，不能充当类型或权限证据 |
| `filePermission` | integer | 当前 0；完整语义未取得 |
| `fileSize` | integer | 当前 112；不能视为精确字节长度 |
| `uuid` | string | 不透明附件标识，不进入普通 Context |

教师题干 image 有 2 项，本次答卷 image 的 lmsFileId 与两项题干均不同。独立 submission-resource 请求应从**正式提交中的图片集合**签发精确附件读取资格；不能依赖题干资源列表，也不能仅凭浏览器送来的 fileId 获取任意云盘文件。

getFiles 用 `activityId` 和该一项 `lmsFileIds`，不传 studentUid，返回一项 list；两种文件 ID 完全匹配。当前状态为：

| 字段 | 本次值 |
| --- | --- |
| `isCloudFile` | true |
| `isDel` | 0 |
| `moderationState` | 0 |
| `transitionState` | 2 |
| `filePermission` | 0 |
| `fileType` | 4 |
| `fileExtension` | jpg |
| `fileSize` | 111 |

getDownInfo 返回 `data.src`，与该 getFiles 项的 `filePath` 完全相同；路径为 `upload/files/file01/…jpg`，无 scheme、authority、query 或 fragment。本次没有把 `getFiles` 成功本身视为学生归属证明；归属必须由前面的新鲜详情和分配名单提供。

## 媒体读取

基址采用[已由原生下载日志及实测确认的资源下载合同](./CLASSIN-RESOURCE-DOWNLOAD-RESOLUTION-2026-09-15.md)，没有猜测新主机。只接受合法相对路径，再使用固定 HTTPS 主机，禁止重定向，15 秒超时、20 MB 探测读取保护。

| 检查 | 结果 |
| --- | --- |
| 主机 / 协议 | `wsevlf001.eeo.im` / HTTPS |
| HTTP / 重定向 | 200 / 0 |
| 业务 Token、Cookie | 媒体请求未发送 |
| Content-Type | application/octet-stream |
| Content-Length / 实际字节 | 114216 / 114216 |
| 实际 magic | JPEG `FFD8FF` |
| JPEG SOF 尺寸 | 900×1234 |
| SHA-256 | `1c7bff0491ef07bdcbab19a72d5ffcb2f8f1561977920d6071a6155dac0d8d00` |

提交引用 `fileSize=112` 与 getFiles `fileSize=111` 不同，两者均不是实际字节 114216。可能涉及 KB 和不同舍入，但未取得正式单位合同；产品应使用 HTTP 长度、流式计数及上限校验，不把这两个字段强制相等，也不凭差值判定文件被替换。

初次研究脚本误用 PNG 断言，遇到真实 JPEG 后失败；随后按元数据和 JPEG magic 重读同一图片并保存。不是改造资源或改用替代图片。最终私有文件为 `answer.jpg`；本研究未进行图片答案识别、OCR 或内容正确性评价。

## 下载开关与权限边界

3471031 对 `isDownload` 只说明“是否允许下载附件：1 是，2 否”。它没有区分题干附件、学生答卷、预览、原图下载或教师/学生角色。3499108 的 image schema 只声明字符串，没有解释内部 filePermission；本次 getFiles 文档也没有给出 filePermission 枚举。

可确定的是：当前 `isDownload=1`、答图引用及元数据 `filePermission=0` 时，合法教师按上述完整链读取成功；无需新增 studentUid 到 getFiles，也无需变更任何开关。**未测试关闭开关、其他角色或撤销权限**；不能把成功样本升级为“老师永远不受下载开关限制”。生产实现若遇到未知/禁止条件，应明确 unavailable 或按后续正式权限合同处理，不自动放行。

## 产品实现建议与未验证项

建议独立提交图片读取 Interface：每次请求重新捕获 scene、确认活动和分配名单、读取正式提交四归属及提交记录 ID、只允许该提交当前 image 集合中的精确附件，再复用现有 getFiles/getDownInfo/固定主机/type-magic/大小校验。绑定 activityId/studentRef/submissionRef/附件引用，旧图片资格不能跨学生、跨活动或提交修改后继续使用。

页面只得到同源读取地址及安全尺寸/类型；供应商 filePath、shareKey/shareSign、UUID 和下载票据不进入页面或模型。图片内容属于学生作答事实，群消息 Context 不包含个人答图或答题正文；图片下载完成和 AI 已解读答案保持不同状态。

仍需实现测试：未知学生/非分配学生、非正式提交、四归属错误、学生之间附件串用、旧提交附件替换、删除/审核异常、下载路径不一致、JPEG/PNG 类型变化、超限/断流与恢复。真实浏览器显示、模型视觉读取及 isDownload=2 的教师合同尚未验证。

私有可复核文件：`homework-get.json`、`students.json`、`student-detail.json`、`getFiles.json`、`getDownInfo.json`、`answer.jpg`、`verification.json` 与五份 Apifox endpoint 定义。研究结果不直接把产品的图片读取或视觉理解能力标记为已完成。

## CI-008i 产品接入后的验证

上述研究之后，主线程按PRD R3/R5/R6 → Spec §16 → Ticket CI-008i接入独立submission-resource。每次下载前核对当前班级成员、已发布作业归属与bizId、完整活动名单、正式提交状态及stuHomeworkId；再核对具体答卷四归属和提交记录ID。图片引用绑定学生、作业、提交与文件关系；当前仅支持isDownload=1且答图引用/getFiles均filePermission=0的已验证条件，不推断其他值。失效图片引用不能用来读取其他学生或重建后的答卷。

2026-09-15 03:54真实V2与Chrome验证：

| 检查 | 结果 |
| --- | --- |
| 同源图片读取 | HTTP200、image/jpeg、114216字节，1705ms |
| 与原API文件一致 | SHA-256完全一致，使用实际媒体而非本地生成源 |
| 教师详情 | 对应学生“查看已提交内容”内点击“读取答题图片”才下载；naturalWidth900、naturalHeight1234 |
| 原图与关闭 | “打开答题原图”新页宽900；关闭后预览img移除 |
| 实际权限反例 | 换到另一未交学生、另一已交学生、失效引用、UID覆盖均403 |
| 页面检查 | 无pageerror、无横向溢出；私有截图人工核对 |

Context仍只有获授权的提交文字、评语和附件清单，不包含图片地址/版本引用。图片可见不意味着AI已识别答案；本票未增加OCR、评分、作答提交或教师批阅。真实测试环境未关闭权限开关；关闭/未知权限、草稿/删除/记录ID变化等由契约反例验证。实际文件权限检查增加后重新回读同一图片，未放宽下载路径或类型限制。

产品验收证据为private/submission-image/v2-verification.json、v2-answer.png及[整体回归清单](../04-specs/features/classin-test-integration/REGRESSION.md)。原始研究的“未实现”描述是当时的边界，当前教师图片显示以上述增量证据为准。
