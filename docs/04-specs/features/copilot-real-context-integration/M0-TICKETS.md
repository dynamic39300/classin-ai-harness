---
title: M0 合同与接入基座 Tickets
status: COMPLETE_USER_ACCEPTED
milestone: M0
date: 2026-09-16
---

# M0 目标

在不改变已验收模拟 IM Copilot 的前提下，把 ClassIn 真实测试班作为独立教师 Thread 接回消息工作区，并冻结后续里程碑复用的工具路由、证据、失败、四阶段空态与推荐去重合同。

# Tickets

| Ticket | 交付 | Write Set | 完成条件 |
| --- | --- | --- | --- |
| RC-000 | 决策与范围冻结 | 决策账本、本目录状态 | 记录逐里程碑实施与验收 Gate；M0 状态可追踪 |
| RC-001 | Copilot Context 合同 | `src/contracts/classin-test/` | 21题 ID、工具 ID、Route Receipt、Evidence、Failure 类型可编译并有契约测试 |
| RC-002 | 工具目录 | `src/domain/classin-test/` | 每个工具声明数据所有者、证据级别和首个里程碑；未知工具不被静默接受 |
| RC-003 | 四阶段状态合同 | Teaching Dynamics contract/domain/UI | 四阶段始终存在；空、已确认、未知三种语义不混淆；Top N 只统计可操作项 |
| RC-004 | P01–P10稳定键 | Teaching Dynamics fixture/projection/domain | 十条班群推荐逐一绑定稳定 Key；同一 Context 版本按 Key+对象去重 |
| RC-005 | 真实测试 Thread 接线 | `src/app/App.tsx`、ClassIn test Feature | 教师加载真实测试 Thread；学生不可见；关闭/错误时模拟 Thread 正常可用 |
| RC-006 | 按 Thread 路由 Adapter | App composition | 模拟 Thread 使用固定 Mock；测试 Thread 使用 ClassIn Context Adapter；身份、租户、对象不匹配被拒绝 |
| RC-007 | 本机消息隔离 | 既有 ClassIn lifecycle + 集成测试 | 测试 Thread 使用教师/机构/Thread 命名空间；只产生 `SIMULATED` 老师端发送回执 |
| RC-008 | 自动验证 | 单元、类型、Lint、消息工作区回归 | 范围测试、typecheck、lint 和适用浏览器回归通过 |
| RC-009 | M0验收记录 | `M0-ACCEPTANCE-2026-09-16.md` | 记录配置、真实联调样本、失败恢复、遗留风险和用户验收清单 |

# 实施边界

- M0 不承诺21题已经接入模型；M1开始逐题迁入工具和回答合同。
- 真实业务数据只读；普通 IM 发送继续是老师端本机模拟，并显示真值标签。
- 真实测试 Thread 不注入任何模拟任务、学生、成绩、出勤、报告或媒体内容；真实 API 没有事项时显示阶段空态，证据不足时显示未知。
- 测试接口不可用时不把真实 Thread 替换成固定数据，也不影响原模拟班级。
- 浏览器不能提交 Token、真实学生私有样本或受限运行文件。

# M0 用户验收入口

完成 RC-000～009 后停止进入 M1。用户只需在主 Demo 检查：原模拟班级、真实测试班 Thread、两者各问一次、四阶段空/已核/待核状态、模拟发送提示，以及刷新后的隔离恢复。

实施结果与验收清单见 [M0验收记录](./M0-ACCEPTANCE-2026-09-16.md)。用户已验收通过，M1已解锁。
