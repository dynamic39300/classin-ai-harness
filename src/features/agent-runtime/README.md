# TeachBuddy Runtime Frontend

Implements `src/contracts/workbuddy/agent-runtime.ts` for the runtime feature spec at
`docs/04-specs/features/teachbuddy-agent-runtime/README.md`.

## Ownership

- HTTP transport, response validation, session observation, command recovery, and the runtime Surface live here.
- `AiAgentWorkSurface.tsx` supplies `profile.id` as scope and the profile's new-task path.
- Default/root and `/new` display the runtime. `session` selects a persistent server session. Legacy `workflow=demo` and Run routes are normalized back to the real blank task by the workspace router.
- Capability navigation intents enter the course workflow with their navigation state intact. The course workflow includes a return-to-conversation link.
- Existing run/capability implementations, server, contracts, and application configuration are outside this frontend write set.

## Behavior

First send creates a session and places its ID in the URL before sending. Sessions and artifacts come from the server; browser state only owns drafts, pending command recovery, and panel selection. Running sessions poll every 1.5 seconds. Focus, online events, explicit reconnect, and a 10-second health check support recovery. Navigation detaches observation without canceling backend work. Stale read responses cannot replace a newer mutation or another selected session.

Network failures retain the original command and commandId for explicit retry. Definite HTTP client rejections can return to editing/review; unknown outcomes never automatically issue another write. Reload restores server facts, not browser-only command retry state. Model reasoning is not supplied by this contract or rendered by the Surface.

Artifact content is escaped React text, including Markdown and HTML-like strings. Downloads use a local `text/markdown` Blob and a sanitized `.md` filename. Approval binds the displayed artifact ID and version; receipts explicitly identify local storage, not ClassIn publication. No model selector or credential entry is provided.

## Verification

- `npx vitest run src/features/agent-runtime`: 14 tests passed (adapter and component behavior, including persisted timeout reasons and complete compact-title access).
- Scoped ESLint passed for this directory and `AiAgentWorkSurface.tsx`.
- Browser transport substitute verified two turns, refresh restoration, cancel, history selection, artifact review/save/download, demo entry/return, and unconfigured/offline send gating.
- Runtime-scoped axe passed after removing the nested main landmark and making scrollable document content keyboard-focusable.
- Desktop 1440x900 and narrow-screen 390x844 verified by the reusable 8-case E2E suite. On narrow screens the runtime owns the viewport and a profile-specific return link; hidden background controls cannot receive keyboard focus. The existing PC Shell is unchanged outside this runtime.
- Actual local HTTP health returned `offline`; sending was correctly disabled. No real-model generation or real Harness artifact creation was verified by this frontend task.
- Full typecheck and cross-application suites are coordinated by the main task. The reusable browser E2E is owned by the separate E2E task; the exploratory script is in `.codex-tmp`.

Offline reload restores the latest persisted BFF snapshot from the session list while displaying a separate live-read error; sending remains disabled until reconnect succeeds. Cross-layer evidence and remaining live-model acceptance are tracked in `docs/04-specs/features/teachbuddy-agent-runtime/ACCEPTANCE.md`.
