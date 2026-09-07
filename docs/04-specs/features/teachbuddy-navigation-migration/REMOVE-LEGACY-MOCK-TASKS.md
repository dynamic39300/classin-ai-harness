# 删除旧 Mock Task 产品表面

状态：IMPLEMENTED_PENDING_USER_REVIEW，2026-09-05 用户确认删除纯前端历史 Task Demo；工程 Gate 已通过。

## Scope

- “我的任务”只展示当前 Product Profile 的真实 Harness Session，不再混入固定课程任务 Mock。
- 删除 `课程工作流`、`?workflow=demo` 纯前端新建页和 `/runs/:runId` 纯前端 Run 页面。
- 旧 URL 兼容重定向至同一 Profile 的真实新建任务，保留合法 `course` 参数，不恢复 Mock 页面。
- 能力页发起“使用、改编、定时执行”等动作时进入真实 Runtime，并将生成的任务意图预填到 Composer；不自动发送或创建 Session。
- “我的文件”如仍引用旧 Mock Run，回到来源时进入真实新建任务并预填来源说明；真实 Session 文件继续回到原 Session。
- 删除仅服务于旧 Mock Task 产品表面的样式、入口测试和视觉基线引用。

## Preserve

- 真实 `AgentRuntimeAdapter`、Session 历史与本机 `.runtime/files`。
- 技能、AgentIn、文件、工具连接和定时任务入口。
- 能力页当前仍需的 Mock Adapter、Domain Controller 与固定演示数据；它们不再作为“我的任务”历史或 Run 页面公开。
- 学生端、ClassIn 业务 Demo 与 Standalone 账号边界。

## Verify

- 首屏历史只含对话 Session，无“课程任务”和固定 Mock 标题。
- 页面无“课程工作流”入口；旧 query/deep link 重定向真实新建页。
- 能力动作可预填真实 Composer，且不发起写请求。
- 全局/班级/Standalone、桌面/手机均保持可达。

## Implementation

- `WorkBuddyTaskBar` 只依赖 `AgentRuntimeAdapter.list`，删除固定 `WORKBUDDY_HISTORY`、课程任务分组、改名/置顶菜单和对应 History Interface。
- `AiAgentWorkSurface` 只装配真实 `AgentRuntimeSurface`；能力动作通过路由 state 预填 Composer，不自动发消息。旧 Run 路由仍作为兼容入口存在，但立即 replace 到当前 Profile 的 `/new`。
- 删除旧课程任务的新建、单课件、方案包、测验、进展 Dock、上下文侧栏、打字欢迎语等 UI 文件及其专用 E2E/Visual 测试。
- Standalone 保留账号、会员、内容资源与文件能力；旧扣点课程任务和测验任务 E2E 被真实工作台/兼容跳转检查替代。

## Evidence

| 检查 | 结果 |
| --- | --- |
| `npm run check` | TypeScript、ESLint、100 个文件 / 670 项单元与集成测试通过。 |
| `npm run build` | 生产构建通过；保留既有大 chunk 提醒。 |
| `npm run test:harness` | 11 项 Harness 契约测试通过；未调用付费模型。 |
| TeachBuddy 专项 E2E | 41 项通过：Runtime 8、导航 10、真实任务历史 8、能力页 15。覆盖真实列表、旧 URL 回退、两 Profile × 两视口、刷新/关闭/重开、失败重试、空历史及能力动作预填。 |
| Standalone E2E | 8 项全套通过，旧任务流程用真实工作台和兼容跳转检查替代。 |
| 视觉与格式 | 人工检查两 Profile 的 1440px/390px 截图，无旧课程任务、遮挡或横向溢出；`git diff --check` 通过。 |

截图证据位于 `.scratch/remove-legacy-mock-tasks/history/`。全仓 129 项 E2E 也已执行：修正本次导致的紧凑技能入口旧断言后，TeachBuddy/Standalone 范围全部通过；仍有 10 项既有 Class 集合、Message Workspace 与 Role Switch 的视觉/滚动/对比度断言失败，不经过本次删除的任务路由，未在本票扩大修复。本次没有删除能力页、ClassIn 业务 Demo 或底层领域契约；这些能力不再从“我的任务”公开为固定 Run。
