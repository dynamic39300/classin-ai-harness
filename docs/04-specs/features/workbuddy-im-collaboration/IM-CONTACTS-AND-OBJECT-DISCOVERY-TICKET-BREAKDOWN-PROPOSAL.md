---
title: ClassIn IM 通讯录与对象发现 Ticket Breakdown Proposal
status: IMPLEMENTED_SELF_REVIEWED
version: v1.1
date: 2026-09-09
review_gate: PASSED_BY_DELEGATED_AUTHORITY_2026-09-09
publication_status: PUBLISHED_LOCAL
---

# ClassIn IM 通讯录与对象发现 Ticket Breakdown Proposal

## 依赖图

```text
IM-DIR-T01 目录 Domain、Interface 与固定 Adapter
  ├─→ IM-DIR-T02 四类关系目录与最小资料
  ├─→ IM-DIR-T03 三类对象发现与业务入口
  └─→ IM-DIR-T04 本地关系动作与身份分享

T02 + T03 + T04
  └─→ IM-DIR-T05 跨角色验证、账本与交付记录
```

## Ticket 总览

| Ticket | 端到端交付 | Blocked by | 状态 |
| --- | --- | --- | --- |
| `IM-DIR-T01` | 稳定目录 Snapshot、Projection、Command Result 与可重置 Adapter | None | implemented-self-reviewed |
| `IM-DIR-T02` | 通讯录入口 → 四类目录 → 组织路径/好友分组 → 最小资料 | T01 | implemented-self-reviewed |
| `IM-DIR-T03` | 联系人/班级/公开课搜索 → 结果资料 → 既有 Thread/业务路由 | T01 | implemented-self-reviewed |
| `IM-DIR-T04` | 备注、好友请求/处理、推荐好友、设置入口和身份分享反馈 | T01 | implemented-self-reviewed |
| `IM-DIR-T05` | 教师/学生、焦点/响应式、自动化、账本和 Implementation Review | T02–T04 | implemented-self-reviewed |

## 完成条件

### IM-DIR-T01
- [x] Domain 纯函数完成角色过滤、分组、组织路径和搜索。
- [x] Adapter 隔离固定 Snapshot 与未来生产目录，命令幂等且可 Reset。
- [x] 单元与契约测试通过。

### IM-DIR-T02
- [x] 消息私聊区可打开通讯录并切换四类关系。
- [x] 新好友、字母好友、班级和组织层级可浏览，资料可打开和返回。
- [x] Dialog 的 Escape、焦点约束和触发器恢复可用。

### IM-DIR-T03
- [x] 三类搜索按名称和稳定业务标识命中。
- [x] 联系人进入已有 Thread，班级/公开课进入既有页面。
- [x] 找不到和无权限有明确结果，不构造错误对象。

### IM-DIR-T04
- [x] 本地备注、好友申请、接受/忽略和推荐好友形成可重置闭环。
- [x] 好友设置不补造未知功能。
- [x] QR/In 口令明确为固定 Demo 身份分享。

### IM-DIR-T05
- [x] 教师/学生角色隔离、草稿保留和入口返回通过 Integration/E2E。
- [x] Lint、TypeScript、Build、Axe 与三视口视觉通过。
- [x] 104 项覆盖账本和 Production Gate 准确回写。
