---
title: TeachBuddy Runtime 验收记录
status: LIVE_MODEL_ACCEPTED
date: 2026-09-05
---

# 当前结论

产品入口、BFF 和固定版本 DeepSeek Harness 已形成可运行的本机链路。受控协议联调与真实 DeepSeek 模型验收均已通过。当前专用服务健康检查为 `ready`，实际使用 `deepseek-official` Provider 和 `deepseek-v4-flash` 模型；本记录仍不把一次模型验收解释为长期服务 SLA 或教学质量证明。

## 已验证证据

| 范围 | 证据 | 边界 |
| --- | --- | --- |
| 完整启动 | `npm run dev` 启动 Vite/BFF `127.0.0.1:4173` 和 Harness `127.0.0.1:3080`；HTTP health 返回 `unconfigured` | 缺凭据是明确状态，不回退模拟回复 |
| 固定官方运行时 | 发布包 `0.1.1-rc.2`，唯一 `teachbuddy` preset，cwd 固定 `.runtime/workspace` | `host.describe.version` 返回 `0.0.1`，不用于包版本校验 |
| 文本与上下文 | 受控联调通过两轮上下文传递，实际经过官方 Provider 和 Agent Loop | `PROTOCOL_FIXTURE_NOT_LIVE_MODEL` |
| 教学工具与审批 | 真实工具 Registry 创建草稿文件，BFF 审阅保存产生 Approval/Receipt，再读仍为 saved | 只保存本机，不发布 ClassIn |
| 工具约束 | 实际 Registry 拒绝禁止工具；不存在的 bash 工具也被拒绝 | 不等于宿主 JS 沙箱或生产多用户隔离 |
| 实际取消 | 受控慢响应被取消，Provider HTTP 流确认断开；最终联调耗时 39ms | 不是前端停止动画；不作为性能 SLA |
| 事件链 | 最终受控运行记录 8 次模型请求、252 帧 WebSocket 消息、13 个业务投影事件 | 前端通过 BFF 轮询观察，不声明前端使用 WebSocket |
| 真实进程重启 | 原进程停止后以相同 Home/patch 启动新进程；59 条既有官方事件完整恢复，BFF 历史、产物和原回执不变，随后继续上下文对话 | 真实固定包进程，受控模型响应；测试正常停机重启，不承诺宿主断电事务 |
| 浏览器 | 8/8 Chromium 用例通过，1440x900 与 390x844，覆盖文本、第二轮、刷新、历史、审阅、保存、下载、取消、离线和产品隔离 | 使用协议 Mock；截图已人工检查 |
| 前端模块 | 13 项测试通过，含离线刷新保留持久快照、scope 切换隔离及超时停止原因 | 不支持生产账号隔离 |
| 无凭据真实状态 | 配置凭据前，正常服务在 1440x900 与 390x844 均明确显示 unconfigured、禁用发送，运行时 axe 无违规且无脚本错误 | 未使用 HTTP Mock；与随后 ready 状态分别验收 |
| 真实模型文本 | 第一轮确认初二英语“一般过去时”和课程代号“海蓝星”；重启后的后续轮仍能准确回忆两项信息 | 实际 `deepseek-official/deepseek-v4-flash`，未使用 fixture 或 HTTP Mock |
| 真实模型任务 | 模型实际调用 `create_teaching_draft`，生成《海蓝星：初二英语〈一般过去时〉40分钟教案》，正文 3,885 字 | 草稿保存在本机，不代表 ClassIn 发布或教学质量已评估 |
| 真实保存与下载 | 审阅版本 1 后保存，重复相同命令保持同一 Receipt；浏览器下载 3,885 字 Markdown | Receipt 真值为 `local-runtime` |
| 真实模型取消 | 已观察到模型流式输出后执行停止，45ms 返回 stopped；既有历史和已保存产物保留 | 单次本机证据，不作为延迟 SLA |
| 真实模型重启恢复 | 完整停止并重启前端/BFF/Harness 后恢复 8 个投影事件、原产物和原 Receipt，再进行一轮真实上下文对话 | 正常停机重启，不承诺断电事务 |
| 真实模型浏览器 | 1440x900 与 390x844 均无横向溢出、运行时 axe 无违规、无页面错误；长标题两行收敛且完整值可访问 | 使用实际持久会话和产物，不拦截 TeachBuddy API |
| Session 文件库 | 真实模型生成 10,558-byte 自包含 HTML，Approval 前即进入“我的文件”；预览、下载、回到来源 Session、重启持久化和 Product Profile scope 隔离通过 | `.runtime/files` 是本机 Demo Adapter，不是 ClassIn Space、TeacherIn 或生产云存储 |
| HTML 安全预览 | 1440×900 与 390×844 实机预览通过；iframe 无权限 sandbox，并注入拒绝脚本、网络和同源访问的 CSP；窄屏详情严格收敛到 390px | 只允许 MD/HTML/TXT/JSON；不开放任意活动网页能力 |

最终 `npm run check`：99 个 Vitest 文件 / 658 项测试、TypeScript 和 ESLint 全部通过。`npm run build` 通过，保留主 JS chunk 大于 500 kB 的提示；没有为消除提示而扩大本次重构范围。最终浏览器复跑 8/8 通过，无失败或 flaky。

后端专项 22 项测试覆盖：缺凭据、作用域与持久恢复、相同命令防重、响应丢失后无人浏览的维护及超时、领取未入步的取消、队列删除及领取竞争、取消回执丢失、完整分页及异常分页不覆盖快照、明确拒绝的输入恢复、幂等审批、损坏会话不阻断维护、来源限制、32,000 字节上限、跨块 UTF-8 中文解码，以及 Session 文件目录/预览/下载/隔离。`SessionFileLibrary` 另有 6 项契约测试；教学工具与启动器的 11 项 Node 测试另行维护。

完成冷重启联调后已终止并清理 fixture，再以 `npm run dev` 恢复正常前端和专用 Harness。配置服务端凭据后，真实模型文本、工具、保存、下载、停止、刷新和完整服务重启恢复均已通过；最终健康状态为 `ready`。

## 复现

- 正常启动：`npm run dev`。
- 教师入口：`http://127.0.0.1:4173/teacher/ai-agent/new`；已有角色 Guard 可能要求先选择教师视角。
- 旧课程工作流：本验收当时通过工作台链接保留；该产品表面已于 2026-09-05 按 D-114 删除，当前只保留真实 Runtime。
- Harness 单元测试：`npm run test:harness`。
- 浏览器测试：`PLAYWRIGHT_JSON_OUTPUT_FILE=test-results/teachbuddy-agent-runtime/report.json npx playwright test tests/e2e/teachbuddy-agent-runtime.spec.ts --project=chromium --workers=1 --output=test-results/teachbuddy-agent-runtime --reporter=list,json`。
- 真实 Harness 协议联调：先停止正常 `npm run dev`，单独运行 `npm run dev:ui`，再运行 `npm run test:harness:integration`。要求 3080 空闲、4173 为本项目 BFF、固定包已在本机 pnpm 缓存中。脚本不下载包，不读取真实 Key，只启动 loopback 模型替身；完成后清理自己创建的会话和运行时。然后停止 `dev:ui` 并恢复 `npm run dev`。

本机生成证据位于 `.runtime/harness-protocol-fixture-report.json` 和 `test-results/teachbuddy-agent-runtime/report.json`，均不提交 Git。复现时应读新报告，不能把旧报告当作正在运行的证明。

## 真实模型 Gate

需要在未提交的项目 `.env` 中配置可用 `DEEPSEEK_API_KEY` 并重启。不要把密钥发进聊天或写入 `VITE_*`。

2026-09-05 以下项目已全部通过：

1. 正常专用服务 health 为 ready，模型请求实际成功，不使用本机响应替身。
2. 两轮中文教学对话，第二轮正确继承第一轮上下文。
3. 模型调用 `create_teaching_draft`，内容符合教师要求，完整显示并可下载。
4. 审阅当前版本、明确保存，刷新后产物与回执一致；重复保存不产生重复副作用。
5. 长响应期间停止，实际请求结束；刷新及服务重启后可恢复历史并继续输入。

真实验收会话为 `tb-9f682a55-0cf5-4580-8ff9-1a04b7ed7e95`。Harness 持久历史包含 `request/header` 和 `request/context`，记录 Provider `deepseek-official`、模型 `deepseek-v4-flash`、唯一教学工具 Schema 及实际 Tool Call；BFF 快照和本地 Artifact/Receipt 提供业务侧证据。密钥值不进入本记录、日志、浏览器或 Git。

## 保留边界

- ClassIn 业务事实仍来自 Demo；本切片只把教师主动输入文本送给模型。
- 三个 Product Profile 隔离不等于生产身份认证、租户隔离或独立教师账号级隔离；本机运行时面向单个操作者。
- 不包含真实支付、长期记忆、学生 Agent、生产发布、PPT 引擎或任意终端/文件工具。
- 正常服务需要本机持续运行；关闭进程或电脑休眠期间不承诺后台任务执行。
- 全仓旧视觉基线维护债不在本切片内；当前只验收受影响运行时界面。
