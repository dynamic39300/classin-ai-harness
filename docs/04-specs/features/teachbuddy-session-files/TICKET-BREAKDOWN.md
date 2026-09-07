---
title: TeachBuddy Session 文件库 Ticket 拆分
status: IMPLEMENTED_PENDING_USER_REVIEW
triage: complete
version: v1.0
date: 2026-09-05
---

# TeachBuddy Session 文件库 Ticket 拆分

## 01 — Markdown 产物自动进入“我的文件”

**Blocked by:** None — can start immediately.

**What it delivers:** 教师在真实 Harness 对话中生成教学文稿后，无需审批或手动保存，即可在当前 Product Profile 的“我的文件”中按来源 Session 查看、下载并返回原对话；刷新和重启后仍然存在。

- [x] 建立 scope-aware `SessionFileLibrary` Interface 和本地 Demo Adapter。
- [x] Markdown Artifact 自动物化为文件，并通过目录与下载 API 暴露稳定文件引用。
- [x] “我的文件”合并服务器 Session 文件与既有演示文件，按 Session 标题分组。
- [x] 同一 Artifact 的同步、重试和审批不会产生重复文件。
- [x] 契约、BFF、页面集成和重启恢复测试通过。

## 02 — HTML 与多格式安全预览和下载

**Blocked by:** 01 — Markdown 产物自动进入“我的文件”。

**What it delivers:** 教师可以让 Harness 生成 Markdown、HTML、TXT 或 JSON 文件，在“我的文件”中查看正确格式、预览受支持内容并下载原始文件；HTML 不能取得 TeachBuddy 页面权限。

- [x] Artifact 与生成工具表达文件名、格式、MIME 和大小。
- [x] HTML、TXT、JSON 与 Markdown 使用一致的归档、列表和下载 Interface。
- [x] HTML 使用受限 sandbox 预览；不支持内联预览的格式提供安全下载降级。
- [x] 文件名、扩展名、内容类型、大小上限和路径输入均经过服务端校验。
- [x] 多格式契约、API、浏览器与安全负向测试通过。

## 03 — Session 文件生命周期与发布验收

**Blocked by:** 01、02。

**What it delivers:** 多文件和长期运行场景下，Session 分组、改名、版本、故障恢复和 Profile 隔离保持一致；完整 Demo 在桌面与窄屏可稳定验收。

- [x] 同一 Session 的多文件、同名文件和多版本可辨识且不覆盖。
- [x] Session 标题变化后分组同步，稳定 Session ID 与文件引用不变。
- [x] Manifest 缺失或局部损坏时保留有效文件并提供可恢复状态。
- [x] 空白、加载、离线、错误、权限拒绝与预览失败状态可操作。
- [x] 三个 Product Profile 数据隔离、真实 Harness、重启、类型检查、Lint、测试、构建和响应式浏览器验收通过。
