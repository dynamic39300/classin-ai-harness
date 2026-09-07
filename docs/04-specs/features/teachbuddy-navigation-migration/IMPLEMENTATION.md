# 实施与验收

状态：IMPLEMENTED_PENDING_USER_REVIEW（2026-09-05）。流程：Discover → Scope → Specify → Implement → Verify → Record，工程步骤均已完成，用户页面 Review 尚未进行。

## Write Set

- `src/app/shell/Sidebar*`、`AppShell*`：一级 disclosure 与布局。
- `src/features/role-switch/ui/RoleSwitcher.module.css`：截图发现窄栏角色切换文字遮挡内容，按容器宽度压缩为有名称的图标命令，不改变角色切换行为。
- `src/features/ai-agent-workspace/`：Profile、Capability Registry、二级导航、班级 Shell、Surface 分流与对应测试。
- `src/features/agentin-market/`、`public/reference/agentin/`：参考市场 Module、固定头像和测试。
- `.gitignore`：仅对公开 AgentIn Demo 资源放行，其他本地 research capture 仍忽略。
- `tests/e2e/`、`tests/visual/`、相关 integration：导航兼容、新行为与视觉回归。
- 当前 Feature 文档、Decision Ledger、Current Status、本地 Tracker。
- V1 Workspace PRD、页面地图与 README：增加当前导航替代说明和新规格回链，不改写已封存的阶段验收事实。

不覆盖当前工作区已有 Harness、文件库、研究与架构记录的改动。参考工程只读。

## Tickets

1. NAV-01：一级展开与我的任务；无阻塞；DONE。
2. NAV-02：AgentIn 市场纵向入口；Blocked by NAV-01；DONE。
3. NAV-03：班级六入口与综合回归；Blocked by NAV-01、NAV-02；DONE。
4. NAV-04：恢复我的任务的新建与历史入口；Blocked by NAV-01；DONE，规格与 672 项单元/集成、43 项范围浏览器最终验证见 [任务历史入口恢复](TASK-HISTORY-RECOVERY.md)。
5. NAV-05：删除旧 Mock Task 产品表面；Blocked by NAV-04；DONE。NAV-04 中课程任务、课程工作流与固定 Run 页面部分被 D-114 替代，当前证据见 [删除旧 Mock Task 产品表面](REMOVE-LEGACY-MOCK-TASKS.md)。

每票独立记录在 `.scratch/teachbuddy-navigation-migration/issues/`。这是当前已授权范围的执行拆分，不新增产品决策。

## 验证记录

本表保留前三票的阶段验收；NAV-04 的增量结果是阶段证据，当前任务表面以 NAV-05 为准。

| 检查 | 结果 |
| --- | --- |
| `npm run check` | TypeScript、ESLint、101 个测试文件 / 668 项单元与集成测试通过；最终测试调整后 TypeScript、Lint 再次通过。 |
| `npm run build` | 生产构建通过；主 JS 约 1.46 MB 的既有大 chunk 提醒仍在，本次不扩大为拆包改造。 |
| `npm run test:harness` | 11 项通过；本轮未调用付费模型。 |
| `teachbuddy-navigation-migration.spec.ts` | 10 项 Chromium 验收通过：disclosure 不导航/不清输入、六项顺序、AgentIn 搜索/空态/推荐/不可用、班级参数/返回、工具/定时 Demo 操作、产品边界、三种视口。 |
| `teachbuddy-agent-runtime.spec.ts` | 8 项通过：协议模拟覆盖会话生成、轮询、多轮、刷新、保存/下载、来源文件回到会话、停止、离线/未配置、Profile 隔离及手机返回。不是本轮真实模型或服务器持久化实测。 |
| `workbuddy-capability-surfaces.spec.ts` | 最终完整复跑 15 项通过：技能、文件上下文与来源、工具安装/自定义工具、定时新建/启停/编辑/运行历史/删除、桌面紧凑布局。 |
| Shell/Class 范围回归 | 此处保留 NAV-01～03 的阶段结果；旧课程工作流覆盖已被 NAV-05 的真实工作台与旧 URL 回退覆盖替代。 |
| 可访问性 | AgentIn 及上述适用能力页/Shell/Class 的 axe serious/critical 均为 0；展开按钮键盘操作和图标可读名称有覆盖。 |
| 资源与 diff | 41 个 PNG 与参考源逐字节一致，来源 Manifest 随资源保留；资源不再被 research ignore 规则排除；`git diff --check` 通过。 |

浏览器独立用例合计 38 项通过（10 + 8 + 15 + 5），仅作为 NAV-01～03 阶段证据。NAV-05 已删除其中旧 `?workflow=demo` 产品行为，新的最终结果独立记录在删除规格中。

## 视觉验收

已人工查看两种入口在 1440×900、1000×768、390×844 的六张截图。头像正确加载；菜单、搜索和卡片无横向溢出；窄屏角色切换为带名称的图标命令；六个导航项可滚动到达。1000px 推荐区采用 2×2，窄屏采用单列目录。

截图保留于 `.scratch/teachbuddy-navigation-migration/screenshots/`：

- `agentin-ideal-1440.png`、`agentin-class-1440.png`
- `agentin-ideal-1000.png`、`agentin-class-1000.png`
- `agentin-ideal-390.png`、`agentin-class-390.png`

## 剩余边界

- AgentIn 只有固定目录、本地搜索和推荐轮换；年级/学科/排序、详情、添加、收藏详情与我创建的给出未开放反馈，不声称真实接通。
- 工具连接和定时任务沿用现有 Demo，未新增真实 MCP/OAuth 或后台调度；正式业务写回继续独立审批。
- 全仓历史像素基线未批量更新，未宣称整个 E2E/Visual 套件全部通过。受影响旧测试的入口已同步，本轮完整回归范围以上表为准。
- 班级/终局/独立产品的现有存储和真实 Harness 未重构；本轮没有新增生产 API。
- 页面验收入口：`http://127.0.0.1:4173/teacher/ai-agent/new`；AgentIn：`http://127.0.0.1:4173/teacher/ai-agent/agentin`。开发服务保持可用。
