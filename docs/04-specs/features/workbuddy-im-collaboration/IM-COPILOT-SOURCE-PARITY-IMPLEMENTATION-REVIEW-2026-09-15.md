---
title: IM Copilot 模拟基线恢复与源项目对齐实施验收
status: PASS_USER_ACCEPTED
version: v1.1
date: 2026-09-16
decision: D-157; D-158
---

# 验收结论

V2 默认教师消息入口已恢复固定模拟组合，并与 `/Users/eeo/Documents/claudecode/classin-ai-harness` 2026-09-15 当前工作树的 IM Copilot 保持同一页面、内容和交互。真实 ClassIn Test Module、合同、服务、研究和 `/teacher/classin-test` 核验页仍在仓库中；默认消息页不装配 ClassIn Message extension，也不解析真实测试 Thread 服务。

2026-09-16，用户确认本次 Copilot 最新验收无问题，源项目与当前 V2 的代码同步结果验收完成。该 Gate 状态为 `PASS_USER_ACCEPTED`；后续开发在当前 V2 仓库继续，下一主线为真实 API 映射审阅与接入规格。

# 已实现范围

- 顶部淡蓝灰引导区、`AI 消息助手`身份、固定引导文案、四阶段与10项建议对齐；
- 首屏三问、六类紧凑问题入口和21条问题内容对齐；
- 群消息“引用给AI”、当前 Thread 重读与引用过期保护对齐；
- 页面级隐藏旧 AI 历史、查看历史和“以下为新消息”边界对齐；
- 消息正文原位预览、修改、直接发送、失败重试、私聊插入和家长草稿边界对齐；
- 富文本密度、提及强调和 `AI消息助手`自我介绍约束对齐；
- 保留 V2 图片产物按所属回合和时间插入的修复；
- 保留 V2 `model-rate-limited` 恢复，并合入源项目 `context-window-exceeded`、Transport 和 Harness 子进程清理修复。

# 组合根证据

`src/app/App.tsx` 只装配 `createFixedImChatReader`、`FixedWorkBuddyImBusinessContextAdapter`、`FixedWorkBuddyImTeachingDynamicsAdapter`、Mock message draft 和 Memory message lifecycle。浏览器契约额外监听 `/api/classin-test/*`，两个默认 IM 入口均没有发起真实测试接口请求。

完整迁入清单见 [SOURCE-PARITY-MANIFEST-2026-09-15.tsv](./SOURCE-PARITY-MANIFEST-2026-09-15.tsv)。67个源路径全部存在于 V2：53个逐字节一致，14个标记为 `merged-v2-retention`，只用于保留 V2 记录索引、图片排序、Runtime恢复、`classin-test`合同类型和独立核验能力。

# 自动化证据

| Gate | 结果 |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test -- --testTimeout=10000` | PASS，154个文件、1006个用例 |
| `npm run test:harness` | PASS，22个用例 |
| `npm run build` | PASS |
| `npm run test:e2e:copilot-parity` | PASS，23个 Chromium 用例 |
| ClassIn 独立核验页的入口与首屏合同 | PASS，2个 Chromium 用例 |

Vitest 默认5秒阈值的首次全仓并行运行有2个既有重交互用例超时；单文件复跑全部通过，统一10秒阈值后1006/1006通过。一次探索性全量 E2E 并行运行还暴露了默认5秒动画断言、共享本地计数、旧 WorkBuddy 流程和未处理新增 `/im-demo-context` 请求等仓库既有测试债；本次范围使用独立 Copilot parity 配置，不把这些旧契约误当成 D-157 行为。

# 双实例视觉证据

同一 Chrome、1440×1000、教师角色、空本地存储、相同 Runtime fixture 下，源项目 `4173` 与 V2 `4174` 首屏截图逐字节一致，SHA-256 均为：

`723b5042152c893d0bad11eb1833cac78c77e4300b55bc55dea98535cdc44f0f`

- [源项目首屏](../../../../prototype/exports/copilot-source-parity/source-im-copilot-1440x1000-2026-09-15.png)
- [V2首屏](../../../../prototype/exports/copilot-source-parity/v2-im-copilot-1440x1000-2026-09-15.png)
- [源项目问题面板](../../../../prototype/exports/copilot-source-parity/source-questions-open-1440x1000-2026-09-15.png)
- [V2问题面板](../../../../prototype/exports/copilot-source-parity/v2-questions-open-1440x1000-2026-09-15.png)

问题面板打开态的 DOM文本、可访问结构和逐元素计算布局一致；截图文件仅出现浏览器字体/焦点绘制的非确定性像素差异，两个哈希在重复采样时会互换，未发现几何、内容或样式差异。

# 当前边界

老师端模拟消息可写入本机 Memory Adapter，学生端不接收。真实 API 接入将在该基线经用户审阅后重新建立 Adapter Ticket；不得直接改写当前 Surface 文案和交互来适配接口字段。

# 运行服务恢复记录

2026-09-15 的一次预览只启动了 V2 Vite 服务（4174），而固定的 Harness 端口 3080 被源项目进程占用。V2 健康接口因此准确返回 `offline`，页面同时显示“AI 消息助手暂时无法连接”和旧会话恢复失败。停止源项目 Harness、从 V2 根目录运行 `npm run harness:teachbuddy` 后，4174 健康接口恢复为 `ready`。

恢复后使用临时会话执行真实模型探针，模型按要求回复“服务正常”，会话状态回到 `idle`，探针产生的本地数据随后清理。无头 Chrome 再次访问默认教师消息页，未出现连接失败或会话不可用文案。后续启动完整开发环境应使用 `npm run dev -- --host 127.0.0.1 --port 4174 --strictPort`；`npm run dev:ui` 只适用于已有本项目 Harness 的场景。
