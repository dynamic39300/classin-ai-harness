# ClassIn 回放元数据读取合同（2026-09-15）

## 研究问题

为 ClassIn 测试接入 PRD 的 R5「结果扩展」和 R6「持续使用」确认一条只读回放元数据合同：TeachBuddy 能否在不下载视频、不保存播放地址的前提下，区分“已有回放文件”“课节尚未产出回放”和“当前成员能否播放”，并把结果安全地投影到页面和 `ContextSnapshot`。

本次范围只包含已授权测试教师、课程 `591820`、已结束首讲课节 `1250723` 和联调短课 `1251032`。未调用写接口，未获取新身份，未下载或探测视频内容。原始响应保存在忽略提交的受限目录，本文不记录凭证、Cookie、签名、播放地址、播放票据、姓名或手机号。

## 结论

`eeocn` 项目 `345136` 的接口 `3489304` 是当前可用的回放元数据读取入口：

- `POST /api/classin.api.php?action=getLessonRecordInfo`
- `multipart/form-data`
- 最小业务参数为 `SID`、`clientCourseId`、`clientClassId`、`memberUid`

该接口已在两个授权课节上只读实测成功。首讲返回 1 个已处理文件，录制时长字段为 `1707`，录制区间为 2026-09-14 19:46:49 至 20:15:14，文件记录于 20:20:20 生成；联调短课返回 `lessonData=[]`，没有回放文件。两次响应都返回 `playbackDetail.canPlay=1` 和 `canShow=0`，因此：

1. `canPlay=1` 只说明成员播放权限没有被该字段阻止，不能单独证明回放文件存在；
2. `canShow=0` 按 Apifox 字段说明表示不展示播放次数文案，不能解释为“回放不可见”或“无回放”；
3. 是否已有回放至少要同时检查 `lessonData` 的实际形态、`fileList`、逐文件状态和播放集；
4. 接口没有正式的“录制完整性”字段。首讲的实际录制开始晚于课节计划开始，只能派生为“未覆盖完整计划时段”，不能声称文件损坏或转码不完整。

该接口的 Apifox 状态仍为 `developing`，状态枚举、时长单位和多个类型字段没有文档定义。当前结果可作为 **ClassIn 测试读取**，不能标记为生产就绪合同。

## 一手来源与方法

| 来源 | 用途 | 证据边界 |
| --- | --- | --- |
| Apifox `eeocn` 项目 `345136` / 接口 `3489304`，2026-09-15 只读导出 | 请求方式、参数、响应字段及字段说明 | 文档状态为 `developing`；Schema 与真实空结果形态存在差异 |
| `.runtime/private/classin-integration-int0-2026-09-14/replay-metadata/` 中的两份当次只读响应 | 已结束课节与无回放课节的真实形态 | 受限、忽略提交；本文只摘录脱敏元数据 |
| `.runtime/private/classin-target-import-2026-09-11/lesson1-replay-diagnosis-2026-09-14.json` | 核对首讲旧诊断响应的字段位置和稳定性 | 受限、忽略提交；没有复制播放地址 |
| [第一讲在线课堂回放诊断](./CLASSIN-LESSON1-REPLAY-DIAGNOSIS-2026-09-14.md) | 回放异步生成时间线与既有业务解释 | 历史研究证据；本次重新查询接口定义和业务响应，不把旧成功当本次通过 |
| [ClassIn 测试环境真实业务接入 PRD](../04-specs/features/classin-test-integration/PRD.md) | R5/R6 的读取、未知值和恢复边界 | 产品需求，不作为接口事实来源 |

业务请求通过仓库 `reference/classin-api/scripts/classin_api.py` 发往固定测试环境。脚本读取本机受限凭证并生成签名；本次未使用详细输出参数，也未把任何鉴权信息写入研究文档。

## Apifox 请求合同

| 项目 | 接口 | 文档状态 | 方法与路径 | Content-Type |
| --- | --- | --- | --- | --- |
| `eeocn` (`345136`) | `3489304`「获取课节直播/回放视频地址」 | `developing` | `POST /api/classin.api.php?action=getLessonRecordInfo` | `multipart/form-data` |

### 业务参数

| 参数 | Apifox 类型 | 必填 | 本次用途 |
| --- | --- | --- | --- |
| `SID` | `string` | 是 | 机构范围 |
| `clientCourseId` | `string` | 是 | 课程范围 |
| `clientClassId` | `string` | 是 | 课节范围 |
| `memberUid` | `string` | 是 | 当前查看成员 |

Apifox 把 query 参数 `action` 标为非必填，但该 PHP 路由的实际入口依赖 `action=getLessonRecordInfo`。适配器必须显式携带该 action，不能根据文档中的“非必填”省略。

接口定义中的 `auth` 为空，项目公共参数又列出多种 PC 鉴权头但没有把它们标为本接口必填。由 Apifox 文档本身无法证明“教师 UID + secret”是所有客户端和角色都通用的正式鉴权合同。本次只证明仓库现有安全签名脚本能以已授权测试教师身份读取这两个所属课节。

## 响应字段合同

### 顶层与课节状态

| 字段 | 文档类型/形态 | 可安全使用的含义 | 未知或风险 |
| --- | --- | --- | --- |
| `error_info.errno`、`error_info.error` | 业务结果 | 判断请求是否被业务层正常处理 | 只代表接口调用结果，不代表已有回放 |
| `data.lessonId` | 课节 ID | 与请求的 `clientClassId` 做归属核对 | 响应不返回明确的 `clientCourseId` |
| `data.lessonStarttime`、`lessonEndtime` | 课节时间 | 计划/展示时段 | Apifox 未说明单位；实测为 Unix 秒形态 |
| `data.lessonStatus` | 原始状态 | 只保留原始值供诊断 | 无枚举说明 |
| `data.lessonData.lessonStatus` | 原始状态 | 有对象形态时保留原始值 | 与顶层同名字段的关系未定义；空结果时可能不存在 |
| `data.lessonData.vodList[]` | `string[]` | 只可统计数量 | 元素结构和用途未说明 |

### 回放文件

| 字段 | 用途 | 处理建议 |
| --- | --- | --- |
| `data.lessonData.fileList[]` | 回放文件集合 | 文件数量由数组长度派生，合同没有独立 `fileCount` |
| `Status`、`Message` | 文件处理状态和服务消息 | 原样保留；`Status` 是字符串且无公开枚举，不能硬编码完整状态机 |
| `Duration` | 文件时长 | 实测数值与约 28 分钟录制区间相符；Apifox 未声明单位，Adapter 需保留“单位由实测推断”的边界 |
| `StartTime`、`EndTime` | 实际录制起止 | 可用于展示录制覆盖区间 |
| `CreateTime` | 文件记录生成时间 | 可用于表达课后异步产出时间 |
| `StartTimestamp`、`EndTimestamp`、`CreateTimestamp` | 数字时间戳 | 真实响应存在，但 Apifox 当前 Schema 未列出，属于兼容性扩展字段 |
| `CIDExt`、`FileId`、`SourceType` | 文件归属/标识 | 仅服务端诊断使用；UI 和普通 Context 不需要保存不透明标识 |
| `Playset[]` | 可播放版本集合 | 只投影版本数量或 `hasPlayableVariant`；不把其中地址或票据放入 Context |
| `Playset[].Definition` | 清晰度/版本标识 | 无枚举说明，只保留原始值或统计数量 |

### 播放权限与计数

| 字段 | Apifox 说明 | 本次验证后的解释 |
| --- | --- | --- |
| `playbackDetail.canPlay` | `1` 可播、`0` 不可播 | 当前成员级权限信号；没有文件的短课也返回 `1`，所以不能作为 `hasReplay` |
| `playbackDetail.canShow` | `1` 展示次数文案、`0` 不展示 | 只控制播放次数文案展示；不能当回放可见性或文件存在性 |
| `playbackDetail.limitCount` | 限制次数 | 与 `canPlay` 联合展示限制信息；`0` 的“无限/未限制”语义未在文档中明确 |
| `playbackDetail.playCount` | 当前成员播放次数 | 与顶层 `playNum` 的口径关系未说明 |
| `playNum` | 播放次数 | 不与 `playbackDetail.playCount` 合并计算 |
| `showClassVideo` | 是否展示课堂视频 | 是配置信号，不能代替文件存在检查 |
| `avoidRecordReplay`、`avoidRecordVideoRecorded` | 防录制/回放限制配置 | 可作为阻断原因候选；不能单独证明某个文件已生成 |

### 归属字段

请求侧用 `SID + clientCourseId + clientClassId + memberUid` 限定机构、课程、课节和查看成员。响应侧可以用 `lessonId`、`teacherUid` 以及课程、机构、教师展示字段做一致性检查，但响应没有再次返回课程 ID、机构 UID 或请求成员 UID。因此，归属结论必须保留请求上下文，不能只靠响应对象重建。

真实响应同时含有 `teacherId` 和 `teacherUid`，两者数值不同。`teacherUid` 与本次授权教师匹配；`teacherId` 是另一套内部标识，不能当教师 UID 使用。本文不记录该内部标识的具体值。

## 两个课节的脱敏实测

### 已结束首讲 `1250723`

| 维度 | 实测结果 | 结论 |
| --- | --- | --- |
| 请求 | 业务成功，`lessonId` 与请求课节一致 | 读取链路和课节归属通过 |
| 课节时段 | 计划 2026-09-14 19:30:00 至 20:15:13 | 计划时长约 45 分钟 |
| `lessonData` | 对象，含 `lessonStatus`、`vodList`、`fileList` | 可按对象解析 |
| 文件数量 | `fileList.length = 1` | 已有一个回放文件记录 |
| 文件状态 | `Status="2"`，服务消息为成功 | 本次文件已处理成功；`2` 的通用枚举仍未知 |
| 文件时长 | `Duration=1707` | 按当前实测可展示为 28 分 27 秒，但单位来自实测解释，不是 Apifox 的正式声明 |
| 实际录制 | 2026-09-14 19:46:49 至 20:15:14 | 录制开始比计划开课晚约 16 分 49 秒 |
| 文件生成 | 2026-09-14 20:20:20 | 下课后约 5 分钟生成记录，符合异步产出 |
| 播放版本 | 1 个 | 存在可播放版本；实际地址未读取到文档或 Context |
| 成员权限 | `canPlay=1`、`canShow=0` | 当前教师成员可播；不展示次数文案 |
| 播放计数 | 顶层和成员计数均为 0 | 尚无已记录播放；两种计数口径不合并 |

该响应与 2026-09-14 的旧私有诊断在以下字段位置和值上吻合：`data.lessonData.fileList[]`、逐文件状态/时长/录制时间/生成时间、`data.playbackDetail`、`data.teacherUid`。这说明旧诊断所用字段位置仍可读取，但不提升接口的 `developing` 稳定性等级。

首讲不能标成“完整课堂回放”。接口只证明一个处理成功的文件覆盖了 19:46:49 至 20:15:14；计划课堂从 19:30:00 开始，前段没有被该文件覆盖。合同中也没有校验媒体内容连续性或音视频完整性的字段。

### 联调短课 `1251032`

| 维度 | 实测结果 | 结论 |
| --- | --- | --- |
| 请求 | 业务成功，`lessonId` 与请求课节一致 | 无回放不是请求失败 |
| `lessonStatus` | 原始值 `20` | Apifox 无枚举，只能原样保存；不能把数字直接映射成用户文案 |
| `lessonData` | 实际返回空数组 `[]` | Adapter 必须兼容数组形态，不能只按文档对象反序列化 |
| 文件数量 | 容错派生为 0 | 当前没有回放文件记录 |
| 成员权限 | `canPlay=1`、`canShow=0` | 权限字段存在不等于已有回放 |
| 视频配置 | `showClassVideo=1`，两个防录制字段为 0 | 配置允许也不等于文件已经生成 |

该空结果是 R6 所需的恢复和兼容性反例：一次成功响应可能没有对象形态的 `lessonData`，也没有 `fileList`。页面应显示“尚无回放文件”或按已知课节状态显示“尚未产出”，不能抛出解析错误，也不能因为 `canPlay=1` 显示播放入口。

## Apifox Schema 与实测差异

1. Apifox 把 `lessonData.lessonStatus`、`vodList`、`fileList` 建模在对象内，并标为必填；文档成功示例却允许空对象。
2. 联调短课真实响应进一步返回 `lessonData=[]`。因此运行时合同必须是 `object | [] | null/缺失`，再归一为可选文件列表。
3. 真实文件对象包含三个 `*Timestamp` 数字字段，当前 Apifox Schema 只列字符串时间字段。
4. `Duration` 的单位没有正式说明；状态字段没有枚举；`vodList` 的字符串含义未定义。
5. 顶层和嵌套层都有 `lessonStatus`，关系未定义。不能任选其一并假定语义等价。

## 建议的 Adapter 投影

页面和 `ContextSnapshot` 应消费归一化元数据，不直接消费原始响应：

```ts
type ReplayMetadataSnapshot = {
  classId: string;
  ownershipVerified: boolean;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  rawLessonStatus?: string;
  files: Array<{
    rawStatus?: string;
    statusMessage?: string;
    durationValue?: number;
    recordedStartAt?: string;
    recordedEndAt?: string;
    createdAt?: string;
    playableVariantCount: number;
  }>;
  access: {
    canPlay?: boolean;
    showPlayCount?: boolean;
    limitCount?: number;
    playCount?: number;
  };
  availability: "available" | "absent" | "unknown";
  coverage: "covers-scheduled-window" | "partial-scheduled-window" | "unknown";
  observedAt: string;
  truthLabel: "classin-test-read";
};
```

归一规则建议：

- `lessonData` 不是普通对象时，归一为空文件列表并记录 Schema 偏差；
- `available` 至少要求文件列表非空、存在播放版本且当前成员 `canPlay=1`；逐文件状态无正式枚举，暂不把 `Status="2"` 写成跨环境常量；
- `canPlay=0` 应显示权限/次数限制状态，而不是删除文件元数据；
- 文件为空时，即使 `canPlay=1` 也为 `absent`；
- `coverage` 只比较计划与实际录制时间范围，且明确是时间覆盖推导，不是媒体完整性检测；
- 不把 `Playset[].Url`、`FileId`、请求签名、Cookie 或其它不透明票据写入页面状态、浏览器存储或 Agent Context；
- 展示更新时间和失败分类，避免旧成功响应掩盖刷新、鉴权或上游错误。

## 仍然未知

- `Status="2"`、顶层/嵌套 `lessonStatus`、`lessonType`、`userType`、`SourceType` 的正式枚举；
- `Duration` 的正式单位，以及字符串时间和数字时间戳的时区保证；
- `vodList` 与 `fileList` 的业务分工；
- `playNum` 与 `playbackDetail.playCount` 的统计对象和刷新时机；
- `limitCount=0` 是否在所有环境都表示不限次数；
- 多段录制、多清晰度、多文件失败与部分成功时的排序和主文件选择；
- 文件 `Status` 成功但播放版本为空、或有播放版本但 `canPlay=0` 时的正式用户文案；
- 教师、助教、学生三类成员在同一课节上的 `canPlay`、`canShow` 和播放次数限制差异；
- 生产环境是否维持相同字段形态。当前结论仅适用于已授权 ClassIn 测试读取。

## 实现验收点

- 首讲显示：已发现 1 个回放文件、实际录制时段、时长、生成时间和“仅覆盖部分计划课堂”提示；
- 联调短课显示：尚无回放文件，不因 `lessonData=[]` 崩溃，不因 `canPlay=1` 出现播放入口；
- `canShow=0` 只隐藏播放次数文案，不隐藏文件元数据；
- 页面不暴露播放地址、票据、内部文件标识或鉴权信息；
- 刷新失败、鉴权失败和业务成功但无文件是三个不同状态；
- 所有数据标记为 `ClassIn 测试读取`，并显示采集时间。

## CI-008g 产品接入及真实模型验证

按PRD R3/R5/R6 → Spec §14 → CI-008g接入。V2由已验证课堂bizId调用专用接口，核对lessonId与teacherUid，输出files_returned/empty/unavailable三种元数据读取结果。只返回时长、状态码及录制/生成时间；不输出FileId、Playset、播放地址或lessonCode。Status完整枚举未知，不从状态码构造转码/播放承诺；课堂回放播放尚未接入V2。现有独立录播活动的播放验证不等同课堂回放播放。

真实BFF首讲返回1文件、1707秒，未来短课返回empty。教师详情展示录制起止至秒，未开始与失败使用不同文案；AI Context保留录制与排课范围的区别。首版Context用分钟导致精度丢失，现已为回放明确保留秒精度，其他页面日期格式不变。

首个秒精度模型回答将无时间轴的教师笔记推断为未录时段的教学内容。已保留失败证据并修正Context：纯回放问题不注入无关笔记正文，明确元数据没有实际开讲时刻或教学内容时间轴；笔记只在私有相关问题中按需提供。修复后的同问题真实模型20.098秒完成，正确答出1文件、1707秒、19:46:49–20:15:14，并明确不能断定开头是否已开讲或具体讲了什么。生成内容仍需教师审阅，不将此单样本验证泛化为任意回答不会出错。

真实页面和模型记录在受限replay-metadata/的bff-*.json、ui-verification.json、model-result.json和ui-model.png；失败/中间版本分别加minute-precision-及before-relevance-fix-前缀。无消息发送、课堂改期或学习事件写入。最终自动化结果见[整体回归](../04-specs/features/classin-test-integration/REGRESSION.md)。
