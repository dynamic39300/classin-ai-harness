# ClassIn 第一讲在线课堂回放诊断（2026-09-14）

## 结论

测试班级 `591820` 的第一讲在线课堂（LMS 活动 `54580408`、课节 `1250723`）已成功生成云端回放。用户截图中的“无回放视频”发生在回放文件生成之前，属于课后异步处理窗口，不是录课开关遗漏或录制永久失败。

## 证据时间线

| 时间（Asia/Shanghai） | 证据 |
| --- | --- |
| 19:30:00 | 课节计划开始 |
| 19:39:12 | PC 日志弹出云端录课准备提示；提示可“立即录课”，否则在 10 分钟准备期后自动开始 |
| 19:46:45 | PC 日志执行 `componentrecord::startRecord`，上报云端录制状态为 1 |
| 19:46:49 | 回放文件记录的实际录制开始时间 |
| 20:15:13 | 课堂结束，LMS 更新为 `processFlag=2`、`classStatus=3` |
| 20:15:14 | 回放文件记录的实际录制结束时间 |
| 20:18:01 | PC 调用 `getLessonRecordInfo`；此时 `lessonData=[]`、`playbackDetail.canShow=0`，因此页面显示无回放 |
| 20:20:20 | 服务端创建回放文件；文件状态 `2`，消息 `Operation succeeded`，时长 1707 秒（28 分 27 秒） |
| 20:21 后 | LMS 详情变为 `relVideoFlag=1`；再次调用 `getLessonRecordInfo` 已返回 1 个可播放文件 |

## 配置核对

- `recordState=1`：已开启录课，配置正确。
- `recordType=0`：录教师/教室画面所用的当前录制类型。
- `openState=0`：未公开回放。它影响公开回放地址，不能解释本次录制文件缺失。
- `showClassVideo=1`、`avoidRecordReplay=0`、`avoidRecordVideoRecorded=0`：没有命中隐藏课堂视频或禁用录制回放的限制。
- 当前 `/classroom/app/class/getWebLiveUrl` 返回空 URL，与 `openState=0` 一致；教师课堂回放页实际通过 `getLessonRecordInfo` 读取文件列表。

## 接口对应

| 用途 | Apifox 项目 / 接口 | 路径与关键结果 |
| --- | --- | --- |
| LMS 课堂详情 | `lms` (`345129`) / `3471071` | `POST /app/activity/class/get`；读取 `recordState`、`openState`、`relVideoFlag`、课堂状态 |
| 课节直播/回放视频 | `eeocn` (`345136`) / `3489304` | `POST /api/classin.api.php?action=getLessonRecordInfo`；读取 `lessonData.fileList`、文件状态、时长和播放集 |
| 公开直播回放地址 | `eeo_classroom_business` (`345171`) / `3496332` | `POST /app/class/getWebLiveUrl`；当前返回空 URL |
| 直播回放文件详情 | `eeo_webcast_service` (`345139`) / `3472097` | `POST /saasajax/webcast.ajax.php`；使用 `lessonKey` 查询回放流详情 |

## 后续课堂建议

进入教室后应在云端录课提示中点击“立即录课”，并确认录制状态已点亮。本课实际在 19:46:49 才开始录制，因此 19:30 至 19:46:48 的课堂内容不在回放内。下课后等待异步生成完成，再刷新课堂回放页；本次处理约在下课后 5 分钟完成。

完整接口响应保存在忽略提交的 `.runtime/private/classin-target-import-2026-09-11/lesson1-replay-diagnosis-2026-09-14.json`，不在本文记录播放 URL。
