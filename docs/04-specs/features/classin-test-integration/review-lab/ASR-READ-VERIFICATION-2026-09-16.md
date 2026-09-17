---
title: 课堂 AI 转写真实读取验证
status: REAL_READ_VERIFIED
date: 2026-09-16
---

# 结论与证据边界

用户提供“课堂回放 → AI转写”的截图后，已通过现有测试教师凭据只读取得第一讲、第二讲真实转写。第一讲数学视频开头与截图逐段吻合；不是OCR重建，也不是由AI授课分析生成的对白。ASR为机器转写，原文可能有误识别；不等于人工校正逐字稿或完整授课覆盖。

本次 CEF 7777 监听在20:12捕获课堂详情请求，没有捕获原生面板的转写正文。另查客户端已有原生日志发现 richVideoSummary 的请求合同，并结合已保存技能目录的 subtitle 参数说明，主动进行只读验证。不能将主动验证写成浏览器直接捕获到了ASR请求。原生日志仅就地读取相关合同，不复制含凭据日志。

# 已验证链路

1. 验证活动属于当前测试班级/课程，课堂详情的 bizId 确定 classId。
2. `POST /api/classin.api.php?action=getLessonRecordInfo`，参数 `SID / clientCourseId / clientClassId / memberUid`。核对返回 `lessonId`，从 `lessonData.fileList[].FileId` 取得对应回放文件。
3. 对每个文件调用 `POST /course-ai-assistant/app/file/richVideoSummary`，JSON参数：`bizType=1, subtitle=1, classId, courseId, fileId, isRetry=false, schoolId`。此次通过 dynamic14 测试域读取，HTTP 200，业务 errno=1；原生日志出现的域为 wdevlf001。
4. 响应直接返回 `data.language / data.content / data.cosUrl`。当前实现使用响应内的 content，不需要再下载视频或读取任意资源URL。仅本次验证额外读取服务返回的COS JSON，四个文件的逐段文字与时间数组均与直接响应一致。

`chapter=1` 是内容总结，`subtitle=1` 是本次所需转写，两者不能混用。`isRetry=false` 不触发重新生成。

# 真实字段

| 字段 | 实际用途 |
| --- | --- |
| `data.content.children[].desc` | 每段原始转写文字，保持错字、停顿和原始措辞 |
| `data.content.children[].metadata.times[0/1]` | `HH:mm:ss` 视频相对起止时间，不是绝对开课时间 |
| `data.content.children[].children` | 子节点；接口内空数组与COS文件中的null存在表示差异 |
| `data.content.desc / summary / metadata` | 根节点包装，此次主要正文在children中 |
| `data.language` | 返回语言字段，原值保留 |
| `data.cosUrl` | 正文资源位置，带访问参数；不写入可提交文档或模型Context |
| COS JSON `summaryType` | 此次为2；不外推完整枚举 |
| COS JSON `fileId` | 包含课程、LMS activity与文件组合标识；与请求对象对照 |

独立工具保留每个文件的 `fileId / segments / sourceRef / status`，每段包含原文、相对起止时间及原树位置。私有 trace 中保留完整content树；Context投影不改写desc。文件级失败、无正文和空数组分别可见。接口结构或文件范围未知时明确失败，不伪造空课堂。

# 四个文件实测

| 课节 | 文件（按本次返回顺序） | 转写段数 | 首末片段时间 | 内容核对 |
| --- | --- | --- | --- | --- |
| 第一讲，有理数综合提高（一） | 1 | 167 | 00:00:01–00:27:14 | 数学讲解；开头的讲解文字及起始时间与截图对应 |
| 第一讲 | 2 | 161 | 00:00:05–00:37:58 | 《白鹭》语文课，主题与课节标题冲突，不能并入数学回顾 |
| 第二讲，有理数综合提高（二） | 1 | 94 | 00:00:04–00:22:31 | 数学讲解；部分语句和算式识别含混 |
| 第二讲 | 2 | 65 | 00:00:04–00:22:32 | 数学讲解，与另一文件内容存在重叠；不能按159段推断两次授课 |

段数是返回片段数，非发言人数或知识点数。视频时间轴分别独立；不累加为总课时，也不声称完整覆盖计划课堂。第一讲主题冲突说明“对象归属匹配”仍不足以证明所有文件内容正确；该异常保留供后续数据治理讨论，不自动修改真实业务对象。

私有实测在 `.runtime/private/asr-capture-2026-09-16/probe/`：回放元数据、逐文件定位响应和COS JSON；权限受限，不提交。监听记录保存在同目录的capture/。生产稳定性、其他角色权限、更多课节与未生成状态未在本轮泛化验证。

# 接入独立审阅台

`read_class_transcript` 已加入模型可选工具。计划器优先为课堂内容回顾选择转写与相关笔记；实际选择保留原生function calls。执行器仅使用选中课堂的真实回放文件，最多10个；旧快照缺少新工具时不偷偷补取。回答需区分原始ASR与AI生成分析，不能凭含混转写补造算式、教学效果或学生掌握情况。主Demo未改动。

验证及实际DeepSeek新回答见[本轮验收](./ACCEPTANCE-2026-09-16.md)与[审阅共识](./USER-REVIEW-CONSENSUS-2026-09-16.md)。
