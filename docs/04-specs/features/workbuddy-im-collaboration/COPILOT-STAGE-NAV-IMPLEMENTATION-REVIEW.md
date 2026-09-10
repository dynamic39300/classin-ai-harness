---
title: TeachBuddy 教学阶段导航方案（二）实施验收
status: AUTOMATION_PASS_PENDING_USER_REVIEW
version: v0.1
branch: codex/copilot-stage-nav-v2
updated: 2026-09-10
---

# TeachBuddy 教学阶段导航方案（二）实施验收

## 实施结果

方案二已从方案一提交`9b8f985`建立独立分支。顶部教学动态改为圆点连线四阶段 Tab，下方使用单张阶段卡承载当前班级的课程、学生、任务事实和一键 Prompt。当前演示同时覆盖不同课程所处的课前、课中、课后与总结状态。

自动切换周期为 8 秒；鼠标停留时暂停，键盘焦点进入或老师手动切换后停止，只有老师明确点击播放按钮才继续。老师可以通过播放/暂停按钮控制轮播，减少动态偏好会关闭自动轮播。Tab 支持方向键、Home 和 End。

## 代码边界

- `TeachingDynamics.tsx`只编排阶段投影、Tab、轮播和动作；
- `TeachingDynamics.module.css`复用现有 ClassIn Token；
- `ImSidecarAgentSurface.tsx`按聊天保存展开、选中阶段和轮播偏好；
- `workbuddy-im-teaching-dynamics.ts`提供可重置的多课程、多阶段模拟数据；
- AI 生成、审阅与消息发送继续复用既有 Runtime 与发送 Gate。

## 自动化与视觉验收

- TypeScript：PASS；
- scoped ESLint：PASS；
- Teaching Dynamics / Adapter / Sidecar focused tests：PASS；
- Chromium personalized-services flows：PASS；
- `npm run build`：PASS，仅有仓库既有 bundle size warning；
- Sidecar 实机检查：四段导航和单卡无横向溢出，手动切换、暂停和内容动作可达。
