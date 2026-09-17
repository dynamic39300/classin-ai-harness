---
title: ClassIn 测试课程录播课写入与回读报告
status: VERIFIED_TEST_ENVIRONMENT_WRITE
date: 2026-09-13
truth_label: AI_GENERATED_TEST_CONTENT
---

# ClassIn 测试课程录播课写入与回读报告

## 结果

测试班级 `591820` 已按每三讲一次的规则，在第 3、6、9、12 讲各新增并发布一节录播课。四段视频均为本次生成的原创中文测试微课，避免使用授权不清、主题不完全匹配或带非商业限制的网络视频。公开素材筛选证据见 [CLASSIN-RECORDED-VIDEO-SOURCES-2026-09-13.md](./CLASSIN-RECORDED-VIDEO-SOURCES-2026-09-13.md)。

| 讲次 | 单元主题 | 活动 ID | 视频时长 | 发布状态 | 学员数 |
| --- | --- | ---: | ---: | --- | ---: |
| 3 | 数轴上的动点问题 | `54580379` | 5:41 | 已发布、进行中、播放器就绪 | 3 |
| 6 | 定义新运算与数阵图 | `54580380` | 5:46 | 已发布、进行中、播放器就绪 | 3 |
| 9 | 线段计算综合 | `54580378` | 5:31 | 已发布、进行中、播放器就绪 | 3 |
| 12 | 一元一次方程综合提高 | `54580381` | 5:38 | 已发布、进行中、播放器就绪 | 3 |

视频统一为 1280×720、H.264 视频和 AAC 音频，每段包含 8 个讲解章节与一个结尾自测。教学脚本和画面字段见 [content.json](./classin-recorded-lessons-2026-09-13/content.json)。

## 写入链路

1. 按单元教学目标生成中文讲解、例题、进阶方法和自测内容；
2. 生成 MP4 后在本地校验时长、编码、分辨率和 SHA-256；
3. 调用 `/mix/app/getCosTempToken` 取得测试云盘上传权限；
4. 上传视频到测试 COS，并重新下载比对 SHA-256；
5. 调用 `/cloudspace/api/user/uploadFileMix`，使用 `appType=1` 登记个人云盘文件，并保存返回的 `originId`；
6. 调用 `/cloudspace/api/user/getTransStateByOriginId`，按 `originId` 确认四个文件均转换成功且生成预览；
7. 调用 `/lms/app/activity/recordClass/create` 建立草稿，`video[].fileId` 必须写入 `originId`；
8. 分别调用 `/lms/app/activity/recordClass/get` 和 `/lms/app/activity/recordClass/students` 验证视频、单元和三位学员；
9. 调用 `/lms/app/activity/release` 发布；
10. 再次回读详情、学生名单和 `/lms/app/course/unitActivityList` 聚合列表。

## 接口契约实测差异

Apifox 接口 `3471135` 将 `unitName` 描述为 JSON 字符串，例如 `{"name":"单元1","type":0}`。测试环境实测按该格式发送时，服务端会把整段 JSON 当作单元名称，并新建一个重复单元；额外发送未记录的 `unitId` 也不会改变结果。

把 `unitName` 直接传为现有单元的普通名称字符串，并附带 `unitType=0` 后，活动正确绑定到既有单元。两次探测生成的草稿活动和重复单元均已删除，并分别回读确认正式四节录播课只位于原有单元。

云盘登记接口同时返回 `userFileId` 和 `originId`。最初四条录播活动误把 `userFileId` 写入 `video[].fileId`；LMS 详情和发布接口接受了该值，但 PC 播放器按 `originId` 查询转换结果，因此页面持续显示“视频转换中”。进行中的活动又不能通过编辑接口沿用已过去的开始时间，接口返回错误码 `29142`。最终处理方式是先创建并验证绑定 `originId` 的替换活动，再删除旧活动。

播放器就绪的回归条件包括：录播详情中的 `video[].fileId` 等于云盘 `originId`；使用同一 ID 调用 `/cloudspace/api/user/getTransStateByOriginId` 返回 `transitionState=2`；活动已发布；三位测试学员仍在活动范围；单元活动列表只包含替换后的活动 ID。

## 验收清单

- [x] 第 3、6、9、12 讲各有且仅有一节本次新增录播课；
- [x] 四段视频时长均在 5–15 分钟；
- [x] 四段视频的标题、画面、旁白和例题对应各自单元主题；
- [x] COS 上传后下载文件与本地文件 SHA-256 一致；
- [x] 四个云盘文件转换状态均为成功；
- [x] 录播活动使用 `originId` 绑定视频，播放器同源转码查询均返回成功；
- [x] 四节录播课均已发布并处于进行中；
- [x] 每节录播课均绑定一个视频；
- [x] 每节录播课均分配给三位测试学员；
- [x] 允许倍速、允许拖动进度、允许结束后观看、播放次数不限；
- [x] 讨论、AI 章节总结和字幕列表配置已开启；
- [x] 详情接口、学生名单接口和单元活动聚合接口均回读成功；
- [x] 探测产生的草稿活动和重复单元已清理。
- [x] 四条错误绑定 `userFileId` 的旧录播活动已删除，列表中无重复活动。

完整请求、响应、对象校验值和回读结果保存在 `.runtime/private/classin-target-import-2026-09-11/`，文件权限为仅当前用户可读写，未提交凭证或学生个人信息。
