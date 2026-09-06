---
title: 三年级数学课件生成 V2 首条切片
status: M1_COMPLETE_USER_AUTHORIZED
version: v1.2
date: 2026-09-06
---

# 三年级数学课件生成 V2 首条切片

## 当前范围

首条样板锁定为人教版小学数学三年级上册《分数的初步认识》第一课时，面向普通公立校中等水平班级，课堂时长 40 分钟。用户提供的候选教材副本已核验为 2022 年 8 月第 2 版、ISBN `978-7-107-36924-7`；第八单元自教材页 89 起，“几分之一”位于教材页 90-91。

## 阶段状态

| 阶段 | 状态 | 事实源 |
| --- | --- | --- |
| M0-A 范围与教材身份 | `COMPLETE_USER_REVIEWED` | [M0 范围与输入包](./M0-SCOPE-AND-INPUT-PACKET.md) |
| M0 基础资料建设 | `COMPLETE_USER_REVIEWED_100_PERCENT` | M0-A 至 M0-J 全部 Gate 已关闭；见 [M0 Readiness Report](./M0-READINESS-REPORT.md) |
| M1 固定任务、评价与 V1 基线 | `COMPLETE_USER_AUTHORIZED` | 8 个固定 Case、真实 V1 运行、Rubric 试评与 Review Receipt 已关闭；见 [M1 V1 Baseline Report](./M1-V1-BASELINE-REPORT.md) |
| M2 Knowledge Pack 与 Instructional Rules | `UNBLOCKED_NOT_STARTED` | M1 Gate 已依据用户委托授权关闭 |

M0 的范围、课程标准、教材纵向关系、教师教学建议、学生误区假设、课例模式、评价题型、课堂约束、素材治理和输入完整性已全部关闭。正式同版教师用书保持 `LIMITED_SOURCE`，第三方教材与平台资源在许可未明时保持 `UNKNOWN_BLOCKED`；这些边界不会阻断使用原创材料进入 M1，但也不表示相关资料已取得或获准模型输入/再分发。

M1 已冻结并运行 8 个真实 Harness V1 Case：3/4 生成任务成功、1/4 在 10 分钟停止，4/4 缺失/冲突输入正确停在无 Artifact 的澄清阶段；但澄清质量 0/4 完全通过，两个 Artifact 含阻断数学图形错误，三个 Artifact 均未通过视觉 Gate。四个生成型 Case 平均内容分为 43.44；这是 Agent 试评基线，不是教师评价或真实课堂效果。用户授权 M1 过程 Review 默认确认，M1 已关闭并解锁 M2；最终结果仍供用户统一复审。

## 相关资料

- [课件生成 V2 内容优先实施计划](../../../06-architecture/COURSEWARE-GENERATION-V2-IMPLEMENTATION-PLAN.md)
- [M0 范围与输入包](./M0-SCOPE-AND-INPUT-PACKET.md)
- [M0 基础资料建设地图](./M0-FOUNDATION-MATERIAL-MAP.md)
- [M0-B 课程标准证据包](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-B-CURRICULUM-EVIDENCE-PACK.md)
- [M0-C 教材内容地图](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C-TEXTBOOK-CONTENT-MAP.md)
- [M0-C-02 纵向教材来源盘点](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-VERTICAL-SOURCE-INVENTORY.md)
- [M0-C-02 二下前置证据](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-G2B-PREREQUISITE-EVIDENCE.md)
- [M0-C-02 五下发展证据](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-G5B-PROGRESSION-EVIDENCE.md)
- [M0-C-02 纵向对齐地图](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-C02-VERTICAL-ALIGNMENT-MAP.md)
- [M0-D/E 一手研究包](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-D-E-PRIMARY-RESEARCH-PACK.md)
- [M0-D Teacher Guide Notes](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-D-TEACHER-GUIDE-NOTES.md)
- [M0-E Misconception Map](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-E-MISCONCEPTION-MAP.md)
- [M0-F/G/I 一手研究包](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-F-G-I-PRIMARY-RESEARCH-PACK.md)
- [M0-H Classroom Context Profile](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-H-CLASSROOM-CONTEXT-PROFILE.md)
- [M0 Readiness Report](./M0-READINESS-REPORT.md)
- [M1 固定任务、量规与 V1 基线报告](./M1-V1-BASELINE-REPORT.md)
- [M1 可复现评价集](../../../../evaluation/courseware-v2-grade3-math/m1/README.md)
- [M0 课程事实与资料来源登记](../../../01-research/COURSEWARE-V2-GRADE3-MATH-M0-SOURCE-REGISTER.md)
- [课件生成 V1 基线](../../../06-architecture/COURSEWARE-GENERATION-V1-BASELINE.md)
