---
title: ClassIn IM 班级公告与消息提醒 Implementation Review
status: SELF_REVIEWED
version: v1.0
date: 2026-09-09
spec: IM-ANNOUNCEMENTS-AND-ATTENTION-FEATURE-SPEC.md
tickets: IM-ATTN-T01—T05
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
---

# ClassIn IM 班级公告与消息提醒 Implementation Review

## Review 结论

已按用户对余下阶段的整体授权完成“班级公告、重要提醒与 `@我的`”纵向模块，并完成实施方自审。班级群现在从 Class Domain 读取当前公告并在群内固定展示；重要提醒保持独立的接收与关闭语义；班级消息提供 `@我的` 聚合、逐项已读与原消息定位；普通群聊保留本次进入前的稳定新消息边界；桌面通知通过可替换 Adapter 表达显式权限、测试发送和站内降级。

本阶段把 104 项基线账本从 **32 MATCHED / 30 PARTIAL / 38 MISSING** 更新为 **37 MATCHED / 30 PARTIAL / 33 MISSING**，`ADAPTED=2`、`CONFLICT=2` 保持不变。浏览器通知只能证明本地前台能力，`ON-BUS-03` 因缺少 ClassIn PC Native、后台/离线和跨设备 Push 继续保持 `PARTIAL`。

## 功能自审记录

| 审阅 | Review ID | Feature | 可观察结果 | 对应基线 |
| --- | --- | --- | --- | --- |
| ✅ | `IR-ATTN-01` | 班级公告固定条 | “高二物理 3 班”在消息流上方展示公告标题、摘要与查看/管理动作；公告、重要提醒和普通置顶有独立标签。 | `ON-IA-13`、`ON-BUS-01` |
| ✅ | `IR-ATTN-02` | 公告事实与权限 | 公告通过 `ClassMessageBridge` 读取 Class Workspace 同一事实；教师进入管理路径，学生只能查看。 | `ON-GOV-01/06` |
| ✅ | `IR-ATTN-03` | 重要提醒 | 固定提醒展示发布者、`@所有人`、正文和原消息入口；关闭后只对当前 Actor 隐藏，普通置顶继续保留。 | `ON-IA-14` |
| ✅ | `IR-ATTN-04` | `@我的` 聚合 | 班级消息区域显示未读数，Focus Surface 区分“提到你”与“@所有人”，显示班级、发送者、时间与安全摘要。 | `ON-BUS-02` |
| ✅ | `IR-ATTN-05` | 逐项已读与定位 | 打开面板不清空；点击具体项后进入稳定 Thread、定位并短暂高亮原消息，该项才变为已读。 | `ON-BUS-02` |
| ✅ | `IR-ATTN-06` | 新消息边界 | 普通班级群用进入前最后已读 Message Reference 显示“以下为新消息”，不依赖 DOM 下标。 | `ON-IA-15` |
| ✅ | `IR-ATTN-07` | 桌面通知授权 | 消息设置显示能力与权限，只有用户操作才请求权限；允许测试通知，拒绝/不支持/失败时保留站内提醒。 | `ON-BUS-03` |
| ✅ | `IR-ATTN-08` | 通知路由 | 当前活动 Thread 不重复通知；免打扰抑制普通消息，直接提及和 `@所有人` 按当前已审阅策略穿透。 | `IM-ATTN-012` |
| ✅ | `IR-ATTN-09` | 入口与布局 | 一级消息和班级详情聊天复用同一状态；Focus Surface 打开时临时收起辅助面，关闭后恢复，900px 不形成第四栏。 | `IM-ATTN-014` |
| ✅ | `IR-ATTN-10` | 真值边界 | 公告使用本地 Class 事实；重要提醒为固定可重置样本；Browser/Memory 通知未被写成生产 Push 或 Native 能力。 | `IM-ATTN-013` |

## Ticket 完成情况

| Ticket | 完成结果 | 主要证据 |
| --- | --- | --- |
| `IM-ATTN-T01` | 完成 | `message-attention.ts` 纯领域投影、设备通知契约与 Browser/Memory Adapter。 |
| `IM-ATTN-T02` | 完成 | Class 公告桥接、公告固定条、重要提醒与按 Actor dismissal。 |
| `IM-ATTN-T03` | 完成 | `@我的` 聚合、逐项已读、Thread 定位高亮和稳定阅读边界。 |
| `IM-ATTN-T04` | 完成本地能力，保留 Production Gate | 显式权限、测试通知、失败降级和免打扰/当前会话路由。 |
| `IM-ATTN-T05` | 完成 | 教师/学生与跨入口收口、自动化、Axe、三视口视觉、覆盖账本和本 Review。 |

## 架构与实现证据

- Domain：[message-attention.ts](../../../../src/domain/message/message-attention.ts) 统一派生公告、提醒、Mention、未读数、阅读边界和通知路由。
- Interface：[message-attention.ts](../../../../src/contracts/message/message-attention.ts) 隔离设备支持度、权限请求和通知发送。
- Adapter：[desktop-notification-adapter.ts](../../../../src/features/message-attention/desktop-notification-adapter.ts) 提供 Browser 与 Memory 实现。
- Store：[message-workspace-store.ts](../../../../src/features/message-workspace/message-workspace-store.ts) 保存稳定引用、按 Actor dismissal/read 与设备权限，不建立相互矛盾的页面布尔值。
- Integration：[MessageWorkspaceProvider.tsx](../../../../src/features/message-workspace/MessageWorkspaceProvider.tsx) 接入固定场景和可替换 Adapter；[App.tsx](../../../../src/app/App.tsx) 通过 Class Message Bridge 读取同一 Class 事实。
- UI：[MessageWorkspace.tsx](../../../../src/features/message-workspace/MessageWorkspace.tsx) 只编排 Projection 和用户命令；注意力 Focus Surface 与 TeachBuddy 辅助面互斥占用内容区。

## 自动化与视觉证据

| Gate | 结果 | 证据 |
| --- | --- | --- |
| ESLint | `PASS` | `npm run lint` |
| TypeScript | `PASS` | `npm run typecheck` |
| Domain / Adapter / Integration | `PASS` | 3 个文件、34 项 Vitest；覆盖公告/提醒分离、Mention、阅读边界、通知路由、dismiss、定位和设备设置。 |
| 浏览器关键链路与 Axe | `PASS` | Playwright `class announcements, important reminders and @mine stay distinct and locatable @a11y`。 |
| Production build | `PASS_WITH_WARNING` | `npm run build`；2402 modules，仅保留既有 Vite chunk-size warning。 |
| 1440 × 900 | `PASS` | 公告、重要提醒、置顶、阅读边界和 TeachBuddy 同屏，无文档溢出。截图：[desktop-attention](../../../../prototype/exports/im-announcements-attention/desktop-attention.png)。 |
| 900 × 720 | `PASS` | `@我的` 使用内容区 Focus Surface，辅助面临时收起，不形成第四栏或页面溢出。截图：[compact-mentions](../../../../prototype/exports/im-announcements-attention/compact-mentions.png)。 |
| 390 × 844 | `PASS` | 学生固定班级入口中的公告、提醒、置顶和 Composer 均可达，无横向/纵向页面溢出。截图：[narrow-student-attention](../../../../prototype/exports/im-announcements-attention/narrow-student-attention.png)。 |

Playwright 启动器仍会尝试启动已在 `127.0.0.1:3080` 运行的 DeepSeek Harness，并输出 `EADDRINUSE`；消息关键用例使用复用的前端服务并通过。该日志不影响本阶段普通 IM 能力，但应在最终全量测试基础设施收口时消除。

## 保留的 Production Gate

- `ON-BUS-03` 缺 ClassIn PC Native Notification Adapter、后台/离线 Push、跨设备同步、服务端路由与通知去重。
- 重要提醒创建规则没有线上证据，本阶段只实现固定接收、定位和关闭；不能据此声明教师可发布重要提醒。
- 教师/学生角色能验证当前入口边界；班主任、助教、家长与机构自定义角色仍需生产 Capability 和身份校验。
- 公告内容来自本地可重置 Class Store。未来真实 Class API 需经同一稳定接口接入，并处理公告失效、权限变化与部分读取失败。

## 阶段结果

本阶段状态为 `SELF_REVIEWED`。下一阶段直接进入“通讯录与对象发现”的 To Spec；全部剩余阶段完成后由用户统一进行最终 Review。
