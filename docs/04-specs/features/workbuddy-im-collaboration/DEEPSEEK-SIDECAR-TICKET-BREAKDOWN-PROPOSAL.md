---
title: TeachBuddy IM Sidecar 同源 Runtime Ticket 拆分提案
status: IMPLEMENTED_TICKETS_01_05_TICKET_04_PARTIAL
date: 2026-09-08
source: DEEPSEEK-SIDECAR-FEATURE-SPEC.md
---

# TeachBuddy IM Sidecar 同源 Runtime Ticket 拆分提案

## 01 — 在 IM Sidecar 跑通同源 DeepSeek 私密对话

**Blocked by:** None — can start immediately.

**What it delivers:** 教师在班级群或 1v1 右侧提交自由要求后，由与“我的任务”相同的 TeachBuddy Runtime 真实处理；当前 Thread 使用稳定 Session，刷新可恢复，并可在主工作台继续同一 Session。上下文经唯一 Business Context Interface 形成最小 Context Snapshot，首版使用固定、脱敏 Adapter。

- [ ] 班级群和 1v1 都能提交自由文本并看到真实 Runtime 事件、停止、失败和恢复。
- [ ] Actor、Tenant、Thread、Product Scope 共同隔离 Session；切换 Thread 不串数据。
- [ ] Sidecar 与主工作台显示同一 Session，内部 Context Envelope 不冒充教师消息。
- [ ] 固定 Adapter 与只读 Stub 通过相同 Business Context 契约测试。
- [ ] DW Hunter 所需的只读、溯源、权限、时效、脱敏和最小化字段已进入接口，数据库细节未进入上层契约。

## 02 — 让班级消息产物通过现有审批链写回

**Blocked by:** 01 — 在 IM Sidecar 跑通同源 DeepSeek 私密对话.

**What it delivers:** 教师要求 TeachBuddy 拟写班级消息时，真实 Agent 生成版本化 Message Draft Artifact；教师编辑并确认后，系统复核最新事实，只以教师身份向目标群写入一条消息，并保留 Execution Receipt。

- [ ] Agent 文本完成不会直接追加群消息，消息型结果进入独立待审阅成果面。
- [ ] 编辑产生新 Artifact 版本，并使旧 Approval 失效。
- [ ] Context 过期、权限拒绝、写回失败和未知结果分别保留草稿与恢复动作。
- [ ] 幂等重试最多产生一条正式消息和一个可追溯 Receipt。
- [ ] 现有作业催交、课前通知与讲解消息 Gate 继续通过回归。

## 03 — 让 1v1 回复产物安全进入教师 Composer

**Blocked by:** 01 — 在 IM Sidecar 跑通同源 DeepSeek 私密对话.

**What it delivers:** 教师在 1v1 对话旁让同一 TeachBuddy 结合当前 Thread 拟写回复；真实 Agent 输出进入可编辑 Message Draft Artifact，教师选择后只插入当前回复框，不自动发送，也不调用班级群写回 Action。

- [ ] 1v1 只读取当前 Thread 的最小消息上下文，不混入班级群或其他联系人。
- [ ] 多轮修改保留同一 Session 与 Artifact 版本关系。
- [ ] “插入回复框”更新当前教师 Composer，消息时间线保持不变。
- [ ] 切换联系人、刷新、失败重试与紧凑 Overlay 均保持目标隔离和草稿恢复。
- [ ] 教师仍需执行现有发送命令，Agent 没有自动发送路径。

## 04 — 完成旧 Sidecar Runtime 收口与全链路验收

**Blocked by:** 02 — 让班级消息产物通过现有审批链写回; 03 — 让 1v1 回复产物安全进入教师 Composer.

**What it delivers:** 三个原固定任务变为同一 Agent 的 Prompt Templates，人工计时和确定性回答不再作为 TeachBuddy Runtime；Sidecar 的核心、空白、加载、离线、权限、过期、停止、恢复和完成状态通过桌面、紧凑宽度、键盘与视觉验收，并回写实施证据。

- [ ] 固定建议只预填要求，不自动运行、不伪装真实 Agent 事件。
- [ ] Runtime 离线或未配置时不回退 Mock 回复，并提供可执行的重连路径。
- [ ] Header、Context、滚动 Body 与 Composer 在桌面和 Overlay 中均无溢出、遮挡或不可达操作。
- [ ] 单元、契约、集成、E2E、a11y、生产构建和关键截图验收通过。
- [ ] Spec、决策、追踪矩阵与 Implementation Review 记录最终事实和剩余生产 Gate。

## 05 — 富文本 LUI 与本机真实 DW 上下文纵向切片

**Blocked by:** 01 — 在 IM Sidecar 跑通同源 DeepSeek 私密对话.

**What it delivers:** Agent 回答以语义化 LUI 呈现；保留在本机、被 Git 忽略的一组真实群名和近期聊天通过受校验的只读接口替换保留 Demo Thread，并由同一个 `BusinessContextAdapter` 注入 DeepSeek。

- [x] 基于官方 GitHub 仓库比较完整 AI UI Runtime、AI Elements 和 Markdown 渲染内核，记录 Star、依赖与架构取舍。
- [x] Agent 的标题、列表、引用、表格、任务列表和代码使用 Design System Token 渲染，不执行模型原始 HTML。
- [x] `.runtime/private` 精确数据不进入 Git；服务器只暴露固定文件、固定 Thread、`ideal-full` 和同源 GET。
- [x] 消息工作区用真实群名、近期消息和活跃概况替换保留 Demo Thread；无私有文件时保留去标识固定 Fixture。
- [x] 当前 Thread 最近消息、教学主题、互动模式、数据窗口和证据边界进入同一 Context Snapshot 和 DeepSeek 请求。
- [x] TypeScript、生产构建、Harness 和浏览器桌面/紧凑验收通过；新增契约测试已落库，Vitest runner 挂起限制已记录。

## 阻塞图

```text
01 同源 Runtime + Context Seam
 ├── 02 班级消息 Artifact 与审批写回
├── 03 1v1 回复 Artifact 与插入 Gate
└── 05 LUI + 本机真实 DW 上下文
       02 + 03 ──> 04 迁移收口与验收
```

## 实施结果

用户于 2026-09-08 确认四票粒度与阻塞关系。已发布到 TAPD：

1. [1145976096001080802](https://www.tapd.cn/tapd_fe/45976096/story/detail/1145976096001080802)
2. [1145976096001080803](https://www.tapd.cn/tapd_fe/45976096/story/detail/1145976096001080803)
3. [1145976096001080804](https://www.tapd.cn/tapd_fe/45976096/story/detail/1145976096001080804)
4. [1145976096001080805](https://www.tapd.cn/tapd_fe/45976096/story/detail/1145976096001080805)

截至 2026-09-08，01—03 已完成代码实现并通过真实 DeepSeek 浏览器主路径验收。04 已完成生产构建、Harness 原生测试、桌面实机和关键键盘语义验收；Vitest 与 ESLint 在当前本机环境中均停在运行器启动阶段，紧凑视口与完整 axe 回归尚未取得自动化通过证据，因此不关闭 04。详细证据与剩余 Gate 见 [DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md](./DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md)。
