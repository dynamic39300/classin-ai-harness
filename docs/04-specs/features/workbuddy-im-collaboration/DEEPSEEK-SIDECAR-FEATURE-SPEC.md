---
title: TeachBuddy IM Sidecar 同源 Runtime 与业务上下文 Feature Spec
status: IMPLEMENTED_PENDING_AUTOMATED_REGRESSION
triage: implementation-review
version: v1.1
date: 2026-09-08
owner: ClassIn AI Native Product Design
decision: D-120
tracker: TAPD-1145976096001080801
---

# TeachBuddy IM Sidecar 同源 Runtime 与业务上下文 Feature Spec

## Problem Statement

教师在 ClassIn 消息现场看到的 TeachBuddy 与“TeachBuddy → 我的任务”体验不一致：主工作台已经运行真实 DeepSeek Agent，IM 右侧仍通过固定关键词、人工计时和 Mock Adapter 生成结果。教师无法在当前班级群或 1v1 对话旁进行真实多轮协作，也无法把同一任务带到主工作台继续。

下一阶段还需要使用 DW Hunter 读取 ClassIn 数据，向 Agent 提供更真实的班级、课程、作业、课堂和消息上下文。如果本次迁移把固定数据、数据库表或查询细节直接写进页面和 Prompt，后续接入会复制业务事实、泄露数据来源细节，并破坏权限、时效和跨 Thread 隔离。

## Solution

IM 右侧继续使用教师私密的 TeachBuddy 身份，并复用主工作台现有的 `teachbuddy` Agent Preset、DeepSeek Harness、Runtime Interface、事件模型和 `ideal-full` Product Scope。每个教师消息 Thread 稳定绑定一个 Runtime Session；教师可在 Sidecar 中连续对话，也可进入主工作台继续同一 Session。

Sidecar 页面只消费一个 `ImSidecarAgent` Interface。该 Deep Module 通过现有 Runtime Interface 运行 Agent，并通过唯一新增的 Business Context Interface 获取最小必要上下文。固定 Demo、后续 DW Hunter 只读查询和未来正式 ClassIn API 都在该 Interface 后转换为带来源、权限、时效、版本与真值证据的 Context Snapshot。

普通 Agent 回答只留在教师私密 Sidecar。需要进入群聊或 1v1 回复框的内容先成为可编辑 Message Draft Artifact，再经过已有 Proposed Action、教师 Approval、领域校验与 Execution Receipt，或经过“插入回复框”Gate。Agent 完成不能直接改变 ClassIn 消息事实。

## User Stories

1. As a teacher, I want the TeachBuddy beside a class chat to use the same Agent as My Tasks, so that I do not have to learn two different assistants.
2. As a teacher, I want the TeachBuddy beside a direct message to use the same Agent, so that I can ask follow-up questions in the current conversation.
3. As a teacher, I want my original request to appear immediately in the Sidecar, so that I can verify what the Agent is handling.
4. As a teacher, I want to see real connection, running, stopped, completed and failed states, so that I can distinguish actual execution from a canned demonstration.
5. As a teacher, I want to stop a running request, so that I retain control over an unhelpful or unnecessary generation.
6. As a teacher, I want a failed request to retain my input and offer the correct recovery action, so that I do not have to reconstruct my work.
7. As a teacher, I want returning to the same message Thread to restore the same Agent Session, so that my private collaboration remains continuous.
8. As a teacher, I want switching to another Thread to show a different Agent Session, so that one class or person never sees another conversation's context.
9. As a teacher, I want refreshing the page to recover the Thread Session binding, so that a browser refresh does not discard my work.
10. As a teacher, I want to open the same Session in the full TeachBuddy workspace, so that I can review long answers and multiple Artifacts with more space.
11. As a teacher, I want returning from the full workspace to preserve the IM target and draft, so that changing Surface does not restart the task.
12. As a teacher, I want the Sidecar to use the current class, conversation and recent messages when relevant, so that the answer reflects my working context.
13. As a teacher, I want to see a concise summary of which context sources were attached, so that I understand the basis of the answer without exposing student message history by default.
14. As a teacher, I want to refresh stale context before a sensitive action, so that I do not send a draft based on outdated facts.
15. As a teacher, I want a generated class message to remain private until I review it, so that DeepSeek never speaks publicly on my behalf.
16. As a teacher, I want to edit the final class message before approval, so that the final wording reflects my professional judgment.
17. As a teacher, I want one approval to produce at most one message receipt, so that retrying cannot duplicate a group message.
18. As a teacher, I want a generated direct-message reply to enter my Composer without being sent, so that I still make the final sending decision.
19. As a teacher, I want model completion, Artifact readiness and message delivery to appear as different states, so that I never confuse generation with business success.
20. As a teacher working across organizations, I want context isolated by Actor, Tenant, Thread and Product Scope, so that private teaching data never crosses boundaries.
21. As a product designer, I want fixed Demo data and future real data to use the same Business Context Interface, so that conversation scenarios can mature without redesigning the Sidecar.
22. As a data practitioner, I want a DW Hunter backed Adapter to remain read-only and to map query results into business terms, so that database details do not leak into the product contract.
23. As a data practitioner, I want context facts to retain source, permission, freshness and version evidence, so that an Agent result can be traced and rechecked.
24. As a security reviewer, I want credentials, SQL, internal instance names, table names and raw knowledge-base content excluded from Context Snapshots, so that operational details are not persisted or shown to users.
25. As an engineer, I want the page to depend on one Sidecar Agent Interface, so that Runtime, context capture and recovery logic are tested behind a stable seam.
26. As an engineer, I want Runtime and Business Context implementations to satisfy contract tests, so that fixed, DW Hunter and future ClassIn Adapters remain substitutable.
27. As an accessibility user, I want connection changes, Agent progress, failures and Artifact readiness announced without focus theft, so that the Sidecar remains operable with a keyboard and assistive technology.
28. As a teacher on a compact window, I want the same conversation and approval controls in the Sidecar Overlay, so that reduced width does not remove safety or recovery actions.
29. As a teacher, I want Agent answers rendered as readable headings, lists, callouts and tables, so that Markdown syntax never becomes interface chrome.
30. As a teacher validating a realistic scenario, I want the reserved DW demo Thread to use a real group title and real recent messages, so that the conversation and Agent task share the same evidence.
31. As a privacy reviewer, I want exact customer message text confined to a local ignored snapshot and a narrow same-origin endpoint, so that realistic validation does not publish private data in Git.

## Implementation Decisions

- The IM Sidecar and My Tasks use the same TeachBuddy Agent identity, Agent Preset, DeepSeek Harness, Runtime Interface and event vocabulary.
- The IM integration uses the existing `ideal-full` Product Scope. Thread identity is Session metadata and a binding key, not a new Runtime Scope.
- A binding is unique to Actor, Tenant, Thread and Product Scope. The binding stores stable references only; it does not persist message bodies or a copy of business context.
- The page consumes one `ImSidecarAgent` Interface with commands to open a target, submit a teacher request, stop, refresh context, start a new Session and continue in the full workspace.
- `ImSidecarAgent` is a Deep Module. It owns Session creation and recovery, Context Snapshot capture, Context Envelope construction, Runtime event projection, stale-target protection, Artifact classification and recoverable failures.
- The existing Agent Runtime Adapter remains the Runtime seam. The only new data-source seam is the Business Context Interface.
- A Business Context request declares Actor, Tenant, Thread Target and intended use. Its response contains business-semantic Context Items plus Context Source, permission scope, captured time, freshness, version and truth evidence.
- Context Snapshots and Runtime inputs exclude credentials, connection information, SQL, internal instance or database names, table names, complete database results and private knowledge-base content.
- A DW Hunter backed Adapter performs knowledge lookup and read-only data queries inside the Adapter boundary. It owns terminology resolution, source selection, permission checks, desensitization, minimum-field projection and mapping into the common Context Snapshot.
- The application does not use DW Hunter for business writes. Formal changes continue through the owning ClassIn domain Interface.
- The teacher-visible request and the internal Context Envelope are distinct fields. Every Surface displays only the teacher-authored text as a teacher message.
- The Sidecar projects accepted, running, tool, Artifact, stopped, failed and completed events from the actual Runtime. It never creates precise progress, delay or success events that the Runtime did not emit.
- Ordinary answers stay private. A message result becomes a versioned Message Draft Artifact before it can enter a message workflow.
- Class-group drafts use the existing Proposed Action, Approval, latest-fact validation, idempotency and Execution Receipt chain. Direct-message drafts use the existing insert-into-Composer command and still require the teacher to send.
- Runtime offline, Runtime unconfigured, context read failure, stale context, permission denial and unknown write result remain separate recovery states.
- Existing fixed scenarios remain available only as Prompt Templates while migration is in progress. They cannot present artificial timers or deterministic output as a real Runtime result.
- Agent response content is rendered by a project Design System LUI component. The component supports GFM structure, uses semantic Token and CSS Modules, skips model-supplied HTML, and does not own Runtime or business state.
- A reserved local DW demo Thread may be replaced at runtime by a validated `.runtime/private/im-demo-context.json` projection. The endpoint is GET-only, same-origin, no-store, limited to `ideal-full`, fixed to one known Thread ID and unavailable when the file is absent or invalid.
- Exact local message text and group title may enter the current `ContextSnapshot.recentMessages` and DeepSeek request for the user-authorized preview. They remain inside ignored local runtime storage and are not copied into repository fixtures, tests, docs, URLs or public logs.
- The local projection removes database identifiers and maps senders to session-local aliases before persistence. It carries a data window, truth label, teaching topics, interaction patterns and evidence boundary; the model must not infer scores, wrong-answer causes or personal diagnoses absent from that evidence.

## Testing Decisions

- A good test observes teacher-visible behavior and public Interface results. It does not assert hook layout, component state variables, Prompt serialization, database schema or private Adapter methods.
- The highest test seam is the `ImSidecarAgent` Interface. Integration tests replace that Interface and verify Thread isolation, teacher input projection, real event mapping, stop, retry, context refresh, Artifact review and continuation in the full workspace.
- Agent Runtime contract tests verify Session create/read/send/cancel behavior, scope isolation, idempotent commands and preservation of teacher-visible input.
- Business Context contract tests run the same suite against the fixed Adapter and a representative read-only stub, verifying minimum fields, evidence, permission failures, freshness and exclusion of operational details.
- Message workflow tests verify that Agent completion alone cannot append a MessageThread entry, that edits create a new Artifact version, that approval binds the current version and Context Snapshot, and that a Receipt appends at most one message.
- Browser tests cover class chat, direct message, Thread switching, refresh recovery, Sidecar-to-workspace continuation, offline recovery, compact Overlay, keyboard operation and status announcements.
- Visual checks use the existing desktop and compact message-workspace baselines and verify that Header, Context, scrollable body and Composer remain reachable without horizontal overflow.
- Existing Runtime Surface, WorkBuddy IM assistance and message-workspace tests are prior art; tests are extended at their public boundaries instead of duplicating internal fixtures.

## Out of Scope

- A continuously refreshed production ClassIn/DW Adapter, production identity joins, row-level authorization and database writes. This implementation only consumes one user-authorized read-only local DW projection.
- Production OAuth, row-level authorization, retention policy administration, audit consoles and cross-device Session synchronization.
- Allowing DeepSeek or DW Hunter to send, modify or delete ClassIn business data directly.
- Migrating the public class Agent or student Agent conversations from their current Adapter to this private teacher Runtime.
- Changing AgentIn catalog behavior or TeacherIn work publishing semantics.
- Selecting a permanent model provider or model version.
- Building the complete teaching Case Library.

## Further Notes

- The user approved the same-Agent and context-seam direction on 2026-09-08.
- DW Hunter was selected as the next-stage read-only context source. Its knowledge base is online authority and must not be copied into repository documentation or an unmanaged Agent memory.
- The first implementation sequence is To Spec, then To Tickets, then Implementation. Ticket publication and implementation start only after the ticket breakdown is approved.
- Decision D-120 is the architecture source of truth for this feature.
- Published to ClassIn TAPD as [1145976096001080801](https://www.tapd.cn/tapd_fe/45976096/story/detail/1145976096001080801) with the `ready-for-agent` label.
- Implementation and live DeepSeek acceptance evidence are recorded in [DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md](./DEEPSEEK-SIDECAR-IMPLEMENTATION-REVIEW.md). The production build and native Harness tests pass; the local Vitest and ESLint runners currently stall before producing test or lint results, so automated regression remains open.
