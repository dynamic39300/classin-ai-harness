# TeachBuddy Runtime Slice

Status (2026-09-05): 10 focused tests and actual packaged rc2 protocol-fixture
integration passed; scoped ESLint passed. Live model calls remain unverified:
the normal runtime reported `DEEPSEEK_API_KEY configured=false`. The fixture's
dummy key is not a live credential.
Write set: `runtime/harness/*`, `scripts/start-harness.mjs`, and
`scripts/test-harness-integration.mjs`. BFF, browser, domain contracts, formal
approval implementation, and ClassIn execution remain outside this slice.

## Launch

From the repository root:

```sh
node scripts/start-harness.mjs
```

The runtime requires Node 22.19+ (22.x) or Node 24+. If the invoking Node is
older, the launcher probes `TEACHBUDDY_NODE`, Codex's bundled Node, and the
usual Homebrew/local locations, then re-executes itself with a supported one.
The selected Node's directory leads the child's PATH, including npx/pnpm/dsh.
This machine has Codex's Node 24.19 at
`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`, so
the existing Node 22.14 can invoke the launcher without a global upgrade.

The launcher reads the repository `.env` without printing its contents, preserves
inherited environment precedence, and executes the official package:

```sh
npx --yes pnpm@11.7.0 dlx @deepseek-ai/dsh@0.1.1-rc.2 web --patch /absolute/repo/runtime/harness/cordis.patch.yml --no-open --port 3080
```

It fixes `DSH_HOME` to `.runtime/harness-home`, child cwd and `DSH_CWD` to
`.runtime/workspace`, and configuration root to `runtime/harness`. The Web host
is fixed by the final patch to `http://127.0.0.1:3080`. Missing credentials do not
block configuration inspection; model execution still requires server credentials.
`node scripts/start-harness.mjs --dump-config` inspects the packaged composition.
Do not start a second package acquisition while an existing npx installation runs.

When neither inherited environment nor project `.env` supplies `DEEPSEEK_API_KEY`,
the launcher checks only that variable in the original Harness user `.env`:
the incoming `DSH_HOME`, with official tilde/blank handling, or `~/.dsh`.
Only this key is carried into the isolated subprocess; unrelated user variables
are not forwarded. No secret is logged or copied to the repository. The isolated
runtime's official credential provider resolves it as an inherited `env` value.
The original managed `.credentials.yaml` is not copied or redirected; its path
remains outside this slice. Presence-only inspection on this machine found neither
the original user `.env` nor the managed document, so no credential was reused.
Official source: `packages/util/home-paths/src/index.ts` and
`packages/credentials/credentials-local/README.md` in the vendored rc2 source.

## Composition

`cordis.patch.yml` disables the original `agent-presets` row and mounts the
same official service as `teachbuddy-agent-presets`, with one system-trusted
root and `includeUserRoot: false`. This is intentional: rc2's launcher appends
a roots override for the literal id `agent-presets` after CLI overlays
(`vendor/deepseek-harness/apps/cli/src/profile-boot.ts:159`). Merely overriding
that row's roots cannot confine the preset roster.

The plugin's literal relative path resolves from the fixed web profile directory,
`.runtime/harness-home/profiles/web`, not from the patch file. The preset contains
only a complete teaching persona. It inherits one global draft tool and no shell,
filesystem, skills, subagents, or workflow tools. Code Runtime is disabled and
tool presentation is native. The host-level `ctx.tools.guard` rejects every name
except `create_teaching_draft`, including tools added later. This is an execution
gate, not just prompt wording or a hidden tool catalog. Permissions expose only
read-only/ask; generic file-reference discovery is disabled.

The stock runtime still needs host filesystem access for its configuration,
credentials, session logs, and storage. This slice confines model capabilities;
it does not sandbox trusted plugin JavaScript or create a multi-user server.
The BFF must allowlist routes, enforce session ownership, set `cwd` itself,
use the default `teachbuddy` preset (or select it explicitly), and exclude native file/directory, settings,
preset-authoring, and plugin-management methods from browser access.

## Draft Contract

`create_teaching_draft({ title, content })` uses `exec.agent.session.id` and
`exec.callId`; callers cannot pass a path. It returns and stores:

```json
{"id":"call-1","title":"Lesson","content":"Teaching content","version":1,"status":"draft"}
```

Path: `.runtime/artifacts/<sessionId>/<filename>`. Session ids must match
`[A-Za-z0-9][A-Za-z0-9_-]{0,127}`. `draftFilename(callId)` uses `<callId>.json`
for ids matching `[A-Za-z0-9_-]{1,120}` except the reserved `sha256-` prefix;
otherwise it uses `sha256-<full sha256 of UTF-8 callId>.json`. The artifact `id`
is the filename without `.json`, matching the BFF identifier constraint. When
hashing changes it, `sourceCallId` retains the original runtime id. The title
limit is 200 JavaScript characters and content limit is 120000 JavaScript
characters, matching `server/teachbuddy-runtime.ts`.

Files are mode 0600 and new directories 0700. Writes sync a temporary file,
publish via an exclusive hard link, then sync the containing directory.
Identical retries succeed; different content under the same session/call id
fails without overwriting. Existing directory and destination symlinks are
rejected. Trusted host processes must not swap directory ancestors during a
write; kernel isolation against hostile local processes is outside this slice.

Cancellation is checked before work and before publication, and forwarded to
file writing. Cancellation after atomic publication does not undo the durable
draft. A cancelled tool result must therefore not imply that no file exists;
the BFF can reconcile by session/call id. A process crash may leave hidden `.tmp`
files; consumers should enumerate only `.json` artifacts.

Draft creation has no publication side effects and does not request an additional
tool approval. A saved draft is not an Approval or ExecutionReceipt. Formal
business writes remain behind the BFF/domain ProposedAction approval workflow.

## HTTP Integration Evidence

- `packages/host/apiproxy/src/api/sessions.ts`: create, prompt, history, cancel.
  Cancel preserves queued inbox work; clearing a queue is separate.
- `packages/client/connection/README.md`: POST commands and two downlink-only
  WebSockets, `/api/events.mux` and `/api/events.host`; no network SSE fallback.
- `packages/host/apiproxy/src/api/events.ts`: session events, queue/projection
  frames, status, and approvals. Reconnect needs history refetch; `since` is ignored.
- `packages/host/apiproxy/src/api-proxy.ts:1349`: pending Web approvals replay on
  browser reconnect. Respond with the original rpcId through `/api/respond`.
  The README's claim that the pending table contains only questions is stale.
- `packages/interaction/user-approval/README.md`: one-shot asked/decided audit
  events are tool approvals, not domain execution receipts. Pending answerers
  are process memory, not a durable workflow across host restart.
- `packages/fs/fs-sandbox/README.md`: built-in read-only/workspace-write modes
  allow unrestricted reads; they are not a draft-only filesystem policy.
- `packages/core/tools/src/index.ts:314`: optional Agent identity, required
  cancellation signal, raw ToolDefinition and monotonic ToolGuard contracts.

All above package paths are relative to `vendor/deepseek-harness`, inspected at
`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` (`0.1.1-rc.2`). This remains a
Developer Preview integration pinned to that version, not a stable versioned API.

## Verification

```sh
node --test runtime/harness/*.test.mjs
node --check scripts/start-harness.mjs
```

Focused tests cover persistence, idempotency/conflicts, session isolation,
untrusted ids/arguments, cancellation, symlinks, guard registration, and a stubbed
launcher process proving environment precedence, credential non-disclosure,
version pinning, and isolated paths.

### Reproduce the Protocol Fixture

Run commands from the repository root. Prerequisites:

- Root npm dependencies are already installed, and the BFF uses its default
  `.runtime` storage and `http://127.0.0.1:3080` Harness endpoint.
- The pinned package is already cached by pnpm. The script currently discovers
  macOS caches under `~/Library/Caches/pnpm/dlx/*/pkg/node_modules`; it is not a
  cross-platform package installer or a source-build test.
- Node 22.19+ (22.x) or 24+ is available. Under an older Node the test re-executes
  Codex's bundled Node at the path listed above; otherwise invoke a supported
  Node explicitly. Unlike the production launcher, this fallback is not a
  general Node-location search.
- Port 3080 is free. Stop the authoritative normal runtime gracefully first;
  the script refuses an occupied port instead of killing an unrelated process.
- `.runtime/workspace/.env` must not exist. The test checks presence only and
  refuses to run if it exists; it does not delete or inspect that file.

Keep the existing BFF on 4173. If it is not running, start only UI/BFF in a
separate terminal, not `npm run dev` (which also starts the normal Harness):

```sh
npm run dev:ui -- --host 127.0.0.1 --port 4173 --strictPort
```

Then run the integration test once:

```sh
node scripts/test-harness-integration.mjs
```

The test never installs packages. It uses
the cached package's executable shim, which supplies pnpm's dependency search
paths; invoking the resolved JavaScript entry alone cannot resolve all plugins.
It selects supported Node, preserves the original HOME, and uses a temporary
DSH_HOME under `.runtime`. The subprocess has an allowlisted environment, a
dummy key, and a loopback model URL. It does not read or write `.env` files or
load real credentials. The production launcher is intentionally not used here.

Evidence label: `PROTOCOL_FIXTURE_NOT_LIVE_MODEL`. Actual rc2 execution verified:

- Single teaching preset, teaching persona, and draft-only production catalog.
- BFF create/list/send/read, first text, and retained context on the second turn.
- Real registry execution of `create_teaching_draft`, hashed unsafe call id, and
  durable JSON; BFF approval produces a persisted local save receipt.
- A test-only registered forbidden probe and an absent `bash` call both receive
  the global guard's denial. The forbidden probe body is never executed.
- A real process restart with the same Home and patch restores all 59 prior
  official events, BFF history, the saved artifact, and its original receipt;
  a subsequent turn retains context without synthesizing a local snapshot.
- Six turns in actual history, official mux/host WebSocket frames, and
  cancellation of an open model HTTP response. Final passing run: 8 model
  requests, 252 frames, cancellation completed in 39 ms (not a performance SLA).

The package manifest confirms `0.1.1-rc.2`; `host.describe.version` reports the
upstream hardcoded `0.0.1`, so it is not a package version check. The machine-readable
report is `.runtime/harness-protocol-fixture-report.json`, written on success
after cleanup. A later failed invocation does not replace that report; require
the current command's exit code 0 and printed `passed: true`, not merely an
existing report file.

The test uses BFF scope `ideal-full` with newly created `tb-<UUID>` sessions.
In `finally` it closes its WebSockets, terminates its owned runtime process group
(SIGTERM, then SIGKILL after 10 seconds if necessary), and closes the loopback
model server. It deletes only its created ids from `.runtime/sessions/<id>.json`,
`.runtime/artifacts/<id>`, and `.runtime/saved/ideal-full/<id>`, plus its temporary
`.runtime/harness-fixture-*` DSH_HOME. Other sessions and the normal
`.runtime/harness-home` are untouched. Success additionally verifies 3080 is free.
The recorded run and subsequent read-only inspection confirmed no fixture process,
created session/artifact/save path, or temporary fixture Home remained.

The script leaves the existing BFF running and does not restart the normal
Harness automatically. After it exits, the parent task can resume normal service:

```sh
node scripts/start-harness.mjs
```

A passing
fixture is protocol/tool evidence, not evidence of live DeepSeek model quality,
ClassIn publication, production security, or persistence of the Harness's native
interactive approval waiters. BFF local-save receipts are separately verified
across the normal runtime process restart above.
