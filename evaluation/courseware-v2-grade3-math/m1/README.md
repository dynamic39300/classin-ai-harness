---
title: 三年级数学课件生成 V2 M1 可复现评价集
status: ACCEPTED_M1_BASELINE_USER_AUTHORIZED
version: v1.0
date: 2026-09-06
---

# M1 可复现评价集

本目录冻结 M1 的八个教师任务和 Rubric v0.1。所有任务只消费 [M0 Readiness Report](../../../docs/04-specs/features/courseware-v2-grade3-math/M0-READINESS-REPORT.md)，不修改 V1 Persona、Tool、模型配置或产品代码，避免先改变方法再测基线。

## 文件

- `tasks.json`：8 个固定 Case；M1-C01/C05/C06/C07 应生成 HTML，M1-C02/C03/C04/C08 应先澄清或指出冲突；
- `rubric.json`：六维内容量规、阻断错误、响应处置检查和独立视觉 Gate；
- `runs/<run-id>/`：运行器生成的 Manifest、Session 投影和 Artifact 快照；
- `scripts/run-courseware-v1-baseline.mjs`：通过当前产品 BFF 创建真实 Harness Session、发送固定输入并保存证据。

## 评价边界

内容总分沿实施计划既定六维权重计算；视觉只判断最低可用，不进入内容分数。首轮由 Codex 按证据试评，明确标记 `AGENT_TRIAL`，不能冒充教师、教研人员或真实课堂效果。用户于 2026-09-06 授权 M1 过程 Review 默认确认，固定任务与 Rubric v0.1 据此接受为 M1 对照基线；教师/教研专业校准仍未完成，并继续作为后续质量 Gate。

运行产生的 Session 和 Artifact 是本机真实 Harness V1 输出，仍不代表真实 ClassIn 数据、正式发布、教学效果或第三方授权。运行器不自动批准 Artifact。

## 运行

```bash
node scripts/run-courseware-v1-baseline.mjs \
  --base-url http://127.0.0.1:4174 \
  --output-dir prototype/courseware-v2-grade3-math/m1-v1-baseline/2026-09-06
```

运行前应确认 `/api/teachbuddy/health` 为 `ready`。每个 Case 使用独立 Session 并顺序执行，避免并发改变基线。失败与澄清都是有效证据；不得为了凑齐 Artifact 而向 Session 追加隐藏信息。
