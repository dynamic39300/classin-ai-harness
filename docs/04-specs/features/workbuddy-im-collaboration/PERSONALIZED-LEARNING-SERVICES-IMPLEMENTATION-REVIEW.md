# TeachBuddy IM 四项个性化学情服务实施验收

状态：`PASS_WITH_DW_DERIVED_SAMPLE`
日期：2026-09-08

## 实施结果

| 范围 | 结果 | 证据 |
| --- | --- | --- |
| 四项入口 | PASS | 高二物理固定场景、DW 派生“表达与思辨体验班”以及李明/林悦 1v1 Sidecar 均显示个性化提醒、课堂回顾、错题解析与再练、个人学情总结 |
| 上下文 Seam | PASS | `BusinessContextAdapter.listLearningContext` 与 `captureLearningContext` 分离目录标签和详细证据；固定场景标记 `fixed-demo`，DW 派生场景保留来源、权限、T-1 时效、版本并标记 `read-only-business-data` |
| 上下文约束 | PASS | Adapter 校验课次、学生、作业、错题与周期引用及其归属关系；教师与教师私聊返回不可用状态，不泄露学生目录；群聊中的敏感能力只提供具有稳定私聊目标的学生 |
| 同源 Runtime | PASS | 四项能力均在对应 Thread 绑定的既有 `ideal-full` Session 中调用真实 DeepSeek；Timeline 只显示教师可见要求，不显示 Context Envelope |
| 个性化提醒 | PASS | 1v1 生成李明订正提醒；群聊生成 6 人待提交提醒并经教师 Approval 后写入高二物理 3 班 |
| 课堂回顾 | PASS | 生成课堂要点、李明个人关注和下一步，接收学生在 1v1 中锁定 |
| 错题解析与再练 | PASS | 基于第 5 题原题、标准答案、学生错误和知识点生成分步解释及一道新练习 |
| 个人学情总结 | PASS | 基于本周课堂、作业和互动生成进展、困难和建议，未形成诊断标签 |
| 群转私聊 | PASS | 固定场景可转到李明私聊；DW 场景真实 DeepSeek 生成 569 字 Markdown 文稿后，结构化复核优先使用 Runtime Artifact 正文并转到林悦私聊 Composer，均未自动发送 |
| 自动化浏览器验收 | PASS | Playwright 3/3：覆盖固定班群课堂回顾、DW 派生学情总结和 Runtime Artifact 正文、两类群转学生私聊 Composer，以及教师与教师私聊隐藏学生学情服务 |
| 生产构建 | PASS | `npm run typecheck`、`npm run build` 通过；`npm run test:harness` 11/11 通过；`git diff --check` 通过 |
| Vitest / ESLint | INFRA_PENDING | 两个命令均在启动后长时间无结果且不退出；本轮未以超时冒充通过。类型、构建、Harness 契约、Playwright 和真实 DeepSeek 浏览器路径已独立通过 |
| DW Hunter 真实行级数据 | PASS_WITH_LIMITS | 用户刷新令牌后 `dw-conn-mcp` 初始化返回 200。核验最新分区为 2026-09-07；选取一个 7 天内 96 条消息、14 位发送者的教学群，以及同群参与者关联的一条近 30 天 16 条消息联系人会话。真实标识和正文已在临时链中去除，仓库只保留稳定业务事实投影 |
| DW 身份关系 | PRODUCTION_GATE | 群成员视图在 Impala 存在日期类型兼容问题，Hive/StarRocks 查询超过网关时限；联系人投影只出现单侧发送记录。当前可验证真实消息模式和共享参与者关系，生产 Adapter 仍须补齐机构、课程、教师与学生授权校验 |

## 真实 DeepSeek 样例验收

1. 错题解析：识别李明把向左的 `-1 m/s` 当成正值，给出 `4=-1+v` 的分步解释，并生成不同数值的新练习。
2. 个性化提醒：按机械波订正反馈生成不责备的补充要求与截止时间。
3. 课堂回顾：按 8月8日动量守恒课堂生成要点、符号判断关注和重做第 5 题的行动。
4. 学情总结：按本周证据生成 3/4 提交、92 分表现、方向判断困难和两项下一步。
5. 多人提醒：按动量守恒作业 6 人待提交事实生成群提醒，教师点击确认后显示持久发送回执。
6. 上下文差异：切换到 8月7日“机械波基础”后，输出改为介质、波速与 `v=fλ` 证据，证明课次选择会改变注入上下文和产物。
7. 结构化复核：产物区明确展示接收对象、交付方式、依据标签和版本；教师修改正文后形成新版本，再决定插入或发送。
8. DW 派生学情总结：真实 DeepSeek 使用故事要素、情节顺序、Problem–Solution、新词复习和独立造句事实生成 569 字 Markdown；明确把缺少学生回执作为待确认信息。Runtime 生成文稿时，复核区使用文稿正文而非“已保存”说明，随后成功插入林悦私聊 Composer。

## 数据接入 Gate

当前同时存在高二物理 `fixed-demo` 和一次真实查询派生的 `read-only-business-data` 冻结快照。后者证明了 DW 数据到真实 DeepSeek 再到教师审阅/私聊 Composer 的纵向切片，但页面加载不会实时访问数仓。生产化前仍需完成：

- 提供可在查询时限内完成的群成员、机构、课程、教师与学生关系视图；
- 把冻结投影替换为生产只读 Adapter，并处理鉴权过期、分区落后、解析失败、来源冲突和权限撤销；
- 接入真实作业、原题、学生作答、判定和知识点后，才能把 DW 场景中的“练习关注点”升级为可核验错题；
- 继续保证原始标识、正文、SQL 和凭据不进入仓库、URL、日志或无治理长期记忆。

## 可复查入口

本地预览（DW 派生场景）：`http://127.0.0.1:4174/teacher/messages?category=class&thread=class-dw-expression-lab`

固定物理场景：`http://127.0.0.1:4174/teacher/messages?category=class&thread=class-physics-3`

TAPD 父需求：`1145976096001080806`；子需求：`1145976096001080807` 至 `1145976096001080812`。
