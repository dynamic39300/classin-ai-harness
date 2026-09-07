# 我的任务：新建与历史入口恢复

状态：PARTIALLY_SUPERSEDED_BY_D-114。本文保留 2026-09-05 NAV-04 的阶段验收证据；其中“课程任务”目录、课程工作流入口与固定 Run 页面已按 [删除旧 Mock Task 产品表面](REMOVE-LEGACY-MOCK-TASKS.md)移除。当前行为以 D-114 和该文档为准。

## Discover

- 对比 `202608-Classin-AI-IM` 与 `classin-ai-buddy` 的 `AiAgentWorkspaceLayout`、`WorkBuddyTaskBar` 及页面 PRD：两者在 new/Run 页面保留任务标签、新建与全部任务选择器，能力页不展示任务栏。
- 当前 Harness 工程在 `runtimeActive` 时隐藏整个任务栏。浏览器最小复现：进入我的任务，任务栏数量为 0，只有无文字的“历史会话”“新建会话”图标；查找明确的历史任务入口失败。
- Runtime 图标仅访问本机 Session，原课程 Run 仍在 WorkBuddy History Interface 中。恢复入口不能把两种 ID、执行协议或存储合并为一个伪造的 Run。
- 参考工程只读对标。本次不导入其他工程的浏览器存储、对话或业务数据；不同目录、端口与 Profile 的记录不会自动共享。

## Scope / Spec

1. 两套 ClassIn TeachBuddy 的我的任务在 new、真实 Session、课程 Run 上都保留任务栏。能力页继续不展示。
2. 常驻可见“新建任务”“历史任务”命令；历史不再只依赖悬停箭头。原标签切换、关闭、课程 Run 重命名/置顶行为保留。
3. 同一选择器按“对话任务”“课程任务”区分两个目录；支持标题搜索。对话任务读取当前 Profile 的 Runtime list；课程任务继续读取已过滤的 History Interface。
4. 选择对话任务回到原 session 深链并恢复；选择课程任务回到原 Run。班级入口保留 course 与返回班级。
5. 新建进入独立的新任务输入页，不删除旧任务，不自动停止后台任务；真实会话仍在提交时创建。已有右上方会话图标保留兼容。
6. 真实列表的加载、失败与重试独立展示；服务离线时仍能打开课程历史，不能把请求失败表述为“没有历史”。
7. 手机完整保留任务栏和搜索选择器，原全屏 Runtime 不得遮住新入口；旧课程 Run 使用同一窄屏容器并提供返回教师工作台/班级命令。打开/关闭选择器不清空当前未提交输入。
8. 不新增生产 API、不迁移存储、不改变审批/文件归档，不扩大独立 C 端的目录权限。

## Write Set

- `AiAgentWorkspaceLayout`、`WorkBuddyTaskBar` 和样式：挂载、常驻命令、Runtime 目录与选择。
- `use-runtime-task-history`：通过既有 Runtime Adapter 读取列表的局部 UI Hook，无写入和模型执行。
- `AiAgentWorkSurface`、`AgentRuntimeSurface` 和样式：集成任务栏的手机容器适配，旧产物浮层不遮挡任务标题/关闭命令，Standalone 原行为保留。
- 范围内单元/浏览器测试；本文件、导航规格与当前状态记录。

## Verify

修复前最小 Playwright 检查已失败：`Task bar count: 0`，`历史任务` 按钮不存在。

可复跑的回归入口：

```sh
npx playwright test tests/e2e/teachbuddy-task-history.spec.ts --workers=1
```

该用例修复前在 `entry regression` 断言失败，修复后覆盖两种历史恢复、新建/关闭不删除旧记录、未发送输入、搜索/空态/失败重试、课程参数和窄屏。增强的坐标断言另捕获旧课程 Run 的命令右边界为 621px、超过 390px 视口；对应布局已修复，不依赖 Playwright 自动横向滚动掩盖越界。

Hook 单元测试检查惰性读取、排序、重开刷新、失败重试及丢弃另一 Profile 的过期响应。使用既有 `AgentRuntimeAdapter.list`，没有第二套数据协议。

## Record

| 检查 | 最终结果 |
| --- | --- |
| `npm run check` | TypeScript、ESLint、102 个文件 / 672 项单元与集成测试通过。 |
| `npm run build` | 生产构建通过；保留既有约 1.47 MB 主 JS chunk 提醒，不扩大为拆包改造。 |
| 新增历史入口 E2E | 7 项通过：首屏命令、输入保留、两 Profile × 两视口的历史恢复/刷新/关闭/新建、搜索无匹配、失败重试及空列表；390px 课程进展输入可达。 |
| 原 Runtime / 导航 E2E | 8 + 10 项通过，覆盖真实会话协议模拟、文件来源回跳、停止/多轮、六入口与产品边界。 |
| 原 Shell E2E | 完整 18 项通过，保留当前标签选择器、重命名、关闭不删除、课程草稿找回和可访问性检查。新建默认真实入口，旧模拟首页通过显式课程工作流进入。 |
| 本机只读检查 | 使用实际列表与读取接口，抽查已有会话打开和刷新恢复；检查时 16 条 Session，前后 ID 列表一致，浏览器页面错误为 0；未发送生成请求。另验证两个旧课程入口在 390px 的历史命令和返回行为。 |
| 视觉与格式 | 检查两 Profile 的 1440/390px 历史选择器及窄屏课程进展；修复旧产物面板遮住关闭按钮的问题。`git diff --check` 通过。 |

浏览器范围最终共 43 项绿色证据（7 + 8 + 10 + 18）。中途发现旧测试未等待课程工作流路由提交，已补用户可见状态等待；新建按钮的旧 32px 图标位置假设更新为固定命令区及尺寸稳定检查。未批量更新全仓视觉快照，也不宣称所有历史套件全部通过。

证据目录：`.scratch/teachbuddy-task-history/history-final/`、`shell-final/`、`final/`；本机只读截图 `live-history.png`。早期 red/green/regression 目录仅用于定位过程，不作为最终通过证据。

本次没有迁移任何存储，也没有导入参考工程的真实历史。课程任务沿用既有 Demo 及其持久化边界；新建/关闭标签不等于删除历史。用户页面验收尚未进行。
