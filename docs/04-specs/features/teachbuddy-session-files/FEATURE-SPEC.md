---
title: TeachBuddy Session 文件库 Feature Spec
status: IMPLEMENTED_PENDING_USER_REVIEW
triage: complete
version: v1.0
date: 2026-09-05
---

# TeachBuddy Session 文件库 Feature Spec

## Problem Statement

教师在 TeachBuddy 对话中生成教案、研究整理、互动练习等产物后，只能在当前对话或临时下载中看到结果。“我的文件”页面仍主要展示固定演示数据，刷新或重启后也没有一条统一、可追溯的文件目录读取链路。教师因此无法把“我的文件”理解为自己与 AI 协作成果的稳定入口，也无法从文件回到来源任务。

现有 Harness 已保留 Session 和 ArtifactDraft，但 Artifact 只以运行时 JSON 存在，尚未成为带文件名、格式、MIME、来源和版本的用户文件。Agent 执行工作目录还混合着临时脚本和缓存，不能直接暴露给教师。

## Solution

TeachBuddy 建立独立的 Session 文件库。Agent 成功生成文件型 Artifact 后，系统自动把它物化为本机 Demo 文件，并登记到来源 Session 的 Manifest；“我的文件”通过统一 Interface 读取这些文件，按 Session 名称分组，提供预览、下载和返回来源对话。

界面显示可变化的 Session 名称，底层使用稳定的 Session ID 和 Product Profile scope。Session 改名不会移动或丢失文件。文件生成后立即进入“我的文件”，无需教师先执行 Approval；教师确认保存、业务写回或正式发布继续产生独立的治理状态和 Receipt，不重复创建文件。

本地 Session 文件库是当前 Demo 的 Adapter，不取代未来 ClassIn Space、TeacherIn 或独立教师个人文件服务的生产所有权。

## User Stories

1. As a teacher, I want every file generated in a TeachBuddy conversation to appear automatically in My Files, so that I do not need to remember a separate save step.
2. As a teacher, I want generated files grouped by their source Session, so that I can understand which task produced each result.
3. As a teacher, I want the group heading to use the Session title, so that the file library matches the language I use in my task history.
4. As a teacher, I want Session renames reflected in My Files, so that renamed tasks do not leave stale groups behind.
5. As a teacher, I want a generated file to remain visible after refreshing or restarting the Demo, so that My Files behaves as persistent storage.
6. As a teacher, I want to preview Markdown, HTML, text and JSON outputs, so that I can inspect a result before downloading it.
7. As a teacher, I want HTML previews isolated from the surrounding product, so that generated markup cannot change the TeachBuddy interface or run scripts with product privileges.
8. As a teacher, I want downloaded files to keep their intended name and extension, so that I can use them outside TeachBuddy without manual renaming.
9. As a teacher, I want to return from a file to its source Session, so that I can continue the conversation that produced it.
10. As a teacher, I want several files from one Session to remain together, so that a lesson plan and its interactive exercise form one understandable body of work.
11. As a teacher, I want files with the same display name to remain distinct, so that later generations do not silently overwrite earlier results.
12. As a teacher, I want versions and generation time shown in the file list, so that I can distinguish revisions.
13. As a teacher, I want a draft Artifact visible before approving business actions, so that review and storage are not confused with publication.
14. As a teacher, I want approval to update the file's governance status without creating a duplicate, so that My Files remains clean.
15. As a teacher, I want normal chat messages excluded from My Files, so that the library contains reusable outputs rather than conversation noise.
16. As a teacher, I want uploaded input references excluded unless an Agent explicitly creates a new output file, so that source materials are not misrepresented as AI-generated work.
17. As a teacher using the ClassIn integrated experience, I want its files isolated from the class MVP experience, so that private task history cannot leak across product spaces.
18. As a teacher using the standalone product, I want its files isolated from ClassIn and TeacherIn data, so that the personal product remains an independent workspace.
19. As a teacher, I want loading, empty, offline and recoverable failure states in My Files, so that I know whether the library is empty or temporarily unavailable.
20. As a teacher, I want an unsupported file format to download safely even when inline preview is unavailable, so that the file is still usable.
21. As a teacher, I want a partial or corrupt index to fail locally and recover without deleting valid files, so that one bad entry does not erase my library.
22. As a product reviewer, I want internal truth and local Adapter metadata retained outside the normal UI, so that Demo evidence remains auditable without exposing engineering labels to teachers.
23. As an engineer, I want Agent execution files separated from user-visible files, so that caches, prompts and temporary scripts never appear in My Files.
24. As an engineer, I want model-provided names treated as untrusted metadata, so that generated output cannot escape its Session directory or overwrite system files.
25. As an engineer, I want materialization to be idempotent for the same Artifact ID and version, so that retries and runtime reconciliation do not duplicate files.
26. As an engineer, I want the browser to request stable file references rather than local paths, so that filesystem structure never becomes a public API.
27. As a future production integrator, I want the UI and BFF to depend on a storage Interface, so that a Space or personal-file Adapter can replace the local Demo Adapter.

## Implementation Decisions

- `SessionFileLibrary` is the single high-level Module and testing Seam for materializing, listing and reading generated files.
- The Module owns filename normalization, MIME and extension validation, byte limits, atomic writes, Manifest consistency, idempotence and safe file references. Pages and Harness projections do not own these rules.
- The local Adapter stores user-visible files separately from the Agent execution workspace. The stable directory identity is Product Profile scope plus Session ID; a mutable title never becomes a path component.
- A Manifest is a local query index and audit record, not a file shown to the teacher. Valid file content remains independently readable if the index is rebuilt.
- Session group titles are projected from the latest Session snapshot. The Manifest may cache a title for offline recovery, but the Session snapshot is authoritative when available.
- A generated Artifact is materialized before Approval. Approval or local save updates governance metadata and Receipt references but does not control visibility and does not create a second physical file.
- The Artifact contract gains a stable filename, format, MIME type, byte size and source Session reference while retaining existing title, content, version and status semantics.
- The first production path supports Markdown, HTML, plain text and JSON. The Interface can represent additional allowlisted binary files from future trusted tools, but the text generation tool cannot claim it generated binary data.
- HTML previews run in a sandboxed document with scripts, top navigation, product origin access and arbitrary network capabilities disabled. Generated HTML is never injected into the application DOM.
- Downloads are served by the local BFF with a validated file reference, allowlisted content type and safe `Content-Disposition`; the browser never supplies or receives a filesystem path.
- The file catalog is scope-aware. `ideal-full`, `classin-mvp` and `standalone-teacher` reuse the Interface but have isolated Adapter namespaces and cannot enumerate one another's files.
- Existing curated Demo files may continue to appear alongside generated Session groups. Generated files are server facts and do not get converted into localStorage fixtures.
- Unsupported previews, missing files, malformed Manifest entries and temporary server failures produce explicit recoverable UI states. A corrupt entry cannot prevent valid groups from loading.
- Local filesystem persistence is a Demo Adapter. It does not change ClassIn Space, TeacherIn, personal-file service or formal publication ownership.

## Testing Decisions

- Tests assert external behavior at the highest practical Seam: `materialize → list → read`. They do not assert private helper calls or duplicate the Adapter implementation.
- `SessionFileLibrary` contract tests cover scope isolation, normalized names, same-name distinct files, idempotent retry, versions, atomic recovery, invalid references, byte limits and malformed Manifest entries.
- Runtime/BFF integration tests prove that a generated Artifact is materialized before Approval, catalogued under the source Session, downloaded with the correct headers, and remains one file after approval.
- Existing runtime tests are prior art for profile isolation, durable Session snapshots, idempotent commands and restart recovery.
- Existing file-library projection tests are prior art for grouping, filtering, sorting and stable references; fixture behavior remains covered while live Session groups are added.
- Browser tests exercise a complete real page path: create or restore a Session, generate a file, open My Files, preview or download it, and return to the source Session.
- HTML tests use observable sandbox restrictions and rendered content; they do not rely only on string matching the generated markup.
- Release verification includes type checking, lint, focused unit and integration tests, production build, desktop and narrow viewport checks, and a real Harness smoke test when a model credential is available.

## Out of Scope

- Production ClassIn Space, TeacherIn, cloud object storage or standalone account storage integration.
- Cross-device synchronization, collaboration ACLs, organization sharing, public links and production identity authentication.
- Treating every Agent workspace file, cache, log, tool trace or uploaded input as a user Artifact.
- Arbitrary local path browsing, arbitrary executable files, active HTML scripts or unsandboxed generated applications.
- PDF/image/video generation in the current text-only Harness tool. Future trusted tools may register those formats through the same Interface.
- Deletion, trash retention, bulk move, manual folders and full document editing.
- Changing ClassIn business writeback, TeacherIn publication or formal Approval policies.

## Further Notes

- The user approved the `SessionFileLibrary` Seam, three-ticket vertical breakdown and repository-local Markdown tracker on 2026-09-05.
- Display copy uses TeachBuddy. Existing `WorkBuddy` type, route and storage identifiers remain compatibility names where already established.
- The implementation should prefer a small deep Interface over exposing Manifest structure or filesystem operations to the page.
- 2026-09-05 implementation evidence: `npm run check` passed 99 Vitest files / 658 tests; `npm run test:harness` passed 11/11; the scoped runtime browser suite passed 8/8 at 1440×900 and 390×844; `npm run build` passed with only the existing large-chunk warning.
- A real `deepseek-official/deepseek-v4-flash` run generated a 10,558-byte self-contained HTML exercise. It was catalogued before Approval, persisted under `.runtime/files/ideal-full/<sessionId>/`, rendered in a scriptless/networkless iframe, downloaded with the intended filename, and remained isolated from other Product Profile scopes.
