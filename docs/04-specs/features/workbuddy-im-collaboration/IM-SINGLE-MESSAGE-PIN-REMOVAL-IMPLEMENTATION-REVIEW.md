---
title: ClassIn IM 单条消息置顶移除 Implementation Review
status: IMPLEMENTED_SELF_REVIEWED
version: v1.0
date: 2026-09-10
decision: D-148
---

# ClassIn IM 单条消息置顶移除 Implementation Review

## 范围与结果

普通 IM 的单条消息置顶已经端到端移除。班级公告继续从 Class Domain 投影；重要提醒继续由 Attention Domain 管理展示、来源定位和按 Actor 关闭。两者不依赖本次移除的字段或命令。

## 影响审计

| 层级 | 审计结果 | 已执行变更 |
| --- | --- | --- |
| Domain | `MessageThread.pinnedMessageId` 是唯一置顶状态；`togglePinnedMessage` 是唯一纯领域命令；撤回逻辑只负责顺带清空该字段。 | 删除字段、命令、撤回耦合和对应单元测试。 |
| Store / Provider | `togglePin` 只在 React Memory Provider 内更新线程数组，没有进入 Port 或生产 Adapter。 | 删除 Action 类型、Provider callback、actions 暴露和 memo 依赖。 |
| 页面交互 | 教师班级消息动作条提供“置顶/取消置顶”，页面顶部按引用显示单条置顶 Banner。 | 删除动作、反馈文案、Pin 图标、Banner 与派生变量。 |
| 布局 | 会话 Grid 为置顶 Banner 预留独立行。 | 删除样式并收紧 Grid，时间线、Composer、只读条和反馈区依次上移。 |
| Mock / Fixture | 两个班级线程通过 `pinnedMessageId` 预置置顶内容。 | 删除两个初始字段；原消息仍保留在正常时间线。 |
| 服务端 / API / 数据库 | `server/`、`scripts/`、Contracts 和 Adapter 中没有置顶接口、持久化字段、事件或迁移。 | 无服务端代码或数据迁移；生产接口也不再预留该命令。 |
| 自动化 | Domain、Integration 和 E2E 仍验证旧置顶命令及反馈。 | 删除旧领域用例；Integration/E2E 增加“消息置顶按钮不存在”的回归断言。 |
| 文档 | 基线、公告提醒和生命周期文档把置顶描述为旧 Demo 升级资产。 | 以 `D-148` 统一改为已移除，并保留公告、重要提醒、免打扰等相邻能力。 |

## 保留边界

- 班级公告固定条、公告详情和管理入口保持原行为。
- 重要提醒的展示、查看原消息和按 Actor 关闭保持原行为。
- 私聊免打扰保持原行为；线上负向基线中的“无会话置顶”继续成立。
- TeachBuddy 任务列表的置顶和 AgentIn 收藏属于其他领域，不受影响。

## 验证 Gate

- 源码与普通 IM 测试不再出现 `pinnedMessageId`、`togglePinnedMessage`、`togglePin`、`pinnedBanner` 或“取消置顶”反馈。
- 教师班级群消息动作条没有“置顶/取消置顶”。
- 公告与重要提醒仍在适用班级群顶部显示，Composer 和时间线没有空白占位或错位。

| Gate | 结果 |
| --- | --- |
| TypeScript / ESLint | `PASS`。 |
| 相关 Domain / Attention / Workspace Integration | `PASS`，3 个文件、51 项。 |
| 全量 Vitest | `PASS`，130 个文件、807 项。 |
| Playwright / Axe | `PASS`，公告提醒与教师消息管理 2 条关键链路。 |
| Production Build | `PASS_WITH_EXISTING_CHUNK_WARNING`，2422 modules。 |
| 源码残留检查 | `PASS`，`src/tests/server/scripts` 中旧字段、命令、样式和反馈均为 0。 |
| 1440 × 900 视觉 | `PASS`，公告、重要提醒、时间线和 Composer 连续衔接，无置顶条或空白行；[验收截图](../../../../prototype/exports/im-single-message-pin-removal/desktop-1440x900.png)。 |
