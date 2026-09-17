---
title: ClassIn 测试课程学习资料生成、写入与回读报告
status: VERIFIED_TEST_ENVIRONMENT_WRITE
date: 2026-09-13
truth_label: AI_GENERATED_TEST_CONTENT
---

# ClassIn 测试课程学习资料生成、写入与回读报告

## 结果

测试班级 `591820` 的第 1–14 讲均已新增并发布一条“学习资料”活动。每条活动包含一份与单元主题对应的一页 A4 PDF，并分配给班级内三位测试学员。“无主题单元”没有创建资料。

| 讲次 | 资料主题 | 单元 ID | 活动 ID |
| ---: | --- | ---: | ---: |
| 1 | 有理数综合提高（一） | `53173128` | `54580393` |
| 2 | 有理数综合提高（二） | `53173129` | `54580394` |
| 3 | 数轴上的动点问题 | `53173130` | `54580395` |
| 4 | 整式综合提高（一） | `53173131` | `54580396` |
| 5 | 整式综合提高（二） | `53173132` | `54580397` |
| 6 | 定义新运算与数阵图 | `53173133` | `54580398` |
| 7 | 运算类新定义问题 | `53173134` | `54580399` |
| 8 | 图形初步综合提高 | `53173135` | `54580400` |
| 9 | 线段计算综合 | `53173136` | `54580401` |
| 10 | 角的计算综合 | `53173137` | `54580402` |
| 11 | 动射线与角度计算 | `53173138` | `54580403` |
| 12 | 一元一次方程综合提高 | `53173139` | `54580404` |
| 13 | 方程应用综合提高 | `53173140` | `54580405` |
| 14 | 数轴与新定义问题综合 | `53173141` | `54580406` |

## 内容与文件

每份资料使用统一结构：三个核心知识点、两道补充例题、逐步解答和方法小结。PDF 文件均为一页 A4，已检查中文字体、数学符号、页数、页面尺寸、文本层、文件摘要和抽样渲染结果。

生成内容保存在 [content.json](./classin-learning-materials-2026-09-13/content.json)，文件清单、大小和 SHA-256 保存在 [manifest.json](./classin-learning-materials-2026-09-13/manifest.json)，14 份 PDF 位于 [pdf 目录](./classin-learning-materials-2026-09-13/pdf/)。

## 实测接口链路

1. `/mix/app/getCosTempToken`：获取测试环境 COS 临时凭据；
2. COS `putObject`：上传 PDF，并下载后比对 SHA-256；
3. `/cloudspace/api/user/uploadFileMix`：把 COS 对象登记到教师个人云盘；
4. `/cloudspace/api/user/getTransStateByOriginId`：确认 PDF 转换状态为 `2`；
5. `/lms/app/file/uploadByFile`：使用 `bizType=5`、文档类型 `fileType=3` 和云盘 `originId` 建立 LMS 附件关系，取得 `lmsFileId`；
6. `/lms/app/activity/learningMaterials/create`：创建学习资料草稿；
7. `/lms/app/activity/learningMaterials/get`：回读单元、PDF 附件和活动配置；
8. `/lms/app/activity/learningMaterials/students`：确认三位测试学员均在活动范围；
9. `/lms/app/activity/release`：把活动发布为可见；
10. `/lms/app/course/unitActivityList`：按活动类型 `5` 聚合回读全部目标单元。

## 接口契约实测补充

Apifox 项目 `345129` 中的学习资料创建接口为 `3471098`，详情接口为 `3471040`，学生列表接口为 `3471026`。云盘项目 `345291` 的接口 `3500683` 说明了 `/api/user/uploadFileMix` 的完整参数。

云盘登记接口中的 `fileType=1` 表示文件已上传到 COS，不能使用 LMS 的附件类型枚举；同时需要正文参数 `UID`。进入 LMS 后，`/lms/app/file/uploadByFile` 再使用 `fileType=3` 表示文档。学习资料 `docs` 中同时保留云盘 `originId` 和 LMS `lmsFileId`。现有单元的 `unitName` 继续按测试环境的实测契约传普通名称，并附 `unitType=0`。

## 验收清单

- [x] 第 1–14 讲各生成一份 PDF；
- [x] 14 份 PDF 均为单页 A4；
- [x] 每份资料包含知识点、两道例题、解答过程和方法小结；
- [x] 内容分别对应所属单元主题；
- [x] COS 上传后下载文件与本地 SHA-256 一致；
- [x] 14 个云盘文件转换状态均为成功；
- [x] 每份 PDF 均建立有效的 `originId` 与 `lmsFileId` 关系；
- [x] 14 条学习资料活动均已发布并处于进行中；
- [x] 每个目标单元恰好包含一条本次新增的学习资料活动；
- [x] 每条活动均分配给三位测试学员；
- [x] 所有活动均允许下载 PDF；
- [x] 详情、学生列表和单元活动聚合接口均回读成功；
- [x] “无主题单元”未写入无语义资料。

完整业务请求、响应和回读结果保存在 `.runtime/private/classin-target-import-2026-09-11/`，权限为仅当前用户可读写，未写入凭证或学生个人信息到本报告。
