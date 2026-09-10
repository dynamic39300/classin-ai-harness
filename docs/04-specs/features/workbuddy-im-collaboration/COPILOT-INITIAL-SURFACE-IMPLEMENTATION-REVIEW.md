---
title: TeachBuddy IM Copilot 教学动态实施验收
status: AUTOMATION_PASS_PENDING_USER_REVIEW
version: v1.2
date: 2026-09-09
requirements: IM-PRD-141—IM-PRD-153
tickets: IM-031—IM-035
---

# TeachBuddy IM Copilot 教学动态实施验收

## 1. 实施结论

经用户确认的 M2 方案已经按 `PRD → Feature Spec → Tickets → Implementation`完成一条可运行纵向切片。二级配置页、页面返回、正常连接说明、工程身份和上下文来源计数已从实际 Agent Sidecar 移除。

教师当前看到一个紧凑的“教学动态”入口：展开时最多显示两行四块快捷建议，收起时显示`教学动态｜4 项建议`。阶段仍在领域投影中决定优先级和有效期，页面不再展示阶段树。

用户第二轮视觉验收指出阶段树仍显松散，且顶部区域只需承担快捷引导。v1.2 改为四块紧凑建议，每块只保留范围、事实和动作；整块可点击并带绿色动作标签。固定演示时钟覆盖课堂进行中、作业催交、错题查看和解析制作四类入口。

## 2. 代码结构

| 层 | 实现 | 职责 |
| --- | --- | --- |
| Interface | `src/contracts/workbuddy/teaching-dynamics.ts` | 定义阶段、事项、动作、快照与 `TeachingDynamicsAdapter` Seam |
| Domain | `src/domain/workbuddy/teaching-dynamics.ts` | 固定阶段顺序、去重、优先排序，并投影最多四条前台建议 |
| Adapter / Scenario | `src/mocks/adapters/workbuddy-im-teaching-dynamics.ts`、`src/mocks/scenarios/workbuddy-im-teaching-dynamics.ts` | 用可重置时钟投影课前、课中、课后、总结；保留固定数据和 DW 派生数据真值边界 |
| Feature | `TeachingDynamics.tsx`、`ImSidecarAgentSurface.tsx` | 只编排投影、呈现状态和动作，不在 React 中判断课程/作业业务规则 |
| Composition | `src/app/App.tsx` | 通过现有服务组合注入 Business Context、Teaching Dynamics、Runtime 与 Message Draft Adapter |

## 3. 关键行为证据

- 事项按 `班级 → 课程 → 课次/作业/学生集合`引用生成；同一事项只进入一个阶段。
- 课前提醒在开课时退出，课中提醒在下课时退出，作业提醒在截止时间退出，不依赖教师勾选完成。
- “学习计划已同步”“已进入课堂”“当前无需处理”等确认事实不进入待办数字。
- DW T-1 数据只使用“待确认”“未见回执”等谨慎措辞，不推断实时缺勤或未完成。
- 事项动作一次点击自动捕获既定业务范围并向现有 Runtime 发送教师可读请求；没有下拉选择或第二次提交。
- 四个建议块整块均可点击，实心动作标签、Hover、按下和键盘焦点共同表达交互性；可访问名称同时包含动作、班级/学生、课程/课次和业务事实。
- 展开态使用`点一下，TeachBuddy 帮你起草要说的话`说明模块用途；每项按`范围 → 事实 → 动作`组织。
- 切换会话或本机 DW 快照补全群名后，事项范围随当前可见聊天名称刷新，同时保留该会话已有的 TeachBuddy 对话与草稿。
- AI 补问、生成、修改、草稿审阅、群聊发送与群转私聊继续使用原有对话和发送 Gate。
- 紧凑时的业务刷新只更新摘要和“有更新”提示，不自动展开、抢焦点或滚动。

## 4. 验证结果

| 检查 | 结果 |
| --- | --- |
| v1.2 TypeScript 与本次 Write Set ESLint | PASS |
| `npm run build` | PASS；仅保留仓库既有的 bundle size warning |
| Teaching Dynamics Domain / Adapter / Component / Sidecar tests | 9 tests PASS |
| `teachbuddy-im-personalized-services.spec.ts` | 6 Chromium flows PASS |
| Sidecar axe serious / critical | 0 |
| 1452×828 展开态实机自审 | PASS：四块建议在两行内完整可见，无横向溢出；课堂、作业、错题和解析动作可辨认 |
| Repository-wide TypeScript / ESLint | PASS |
| Repository-wide Vitest | 806 PASS / 1 BLOCKED：与本次 Write Set 无关的学生端沉浸消息深链仍断言旧“面包屑”导航，当前实现已使用“消息沉浸工作区导航” |

## 5. 真值与剩余 Gate

当前代码使用固定、脱敏、可重置 Scenario；DW 样本是只读派生快照，页面不宣称实时。生产实时缺勤、最新提交和正式课程目录仍需由 ClassIn 生产 Adapter 通过同一 `TeachingDynamicsAdapter`接入，再执行生产数据一致性、权限和延迟验收。

本轮自动化与实现自审完成，最终视觉与交互体验等待用户回家后整体审阅。M7—M10 未在本轮扩大范围。
