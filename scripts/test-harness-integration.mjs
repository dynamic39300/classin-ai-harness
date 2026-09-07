import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { CONTEXT_REPLY, DRAFT, DRAFT_CALL_ID, EVIDENCE, FIRST_REPLY, PROBE_TOOL, startModelFixture } from '../runtime/harness/model-fixture.mjs';
import { draftFilename } from '../runtime/harness/teaching-tools.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runtimeRoot = join(root, '.runtime');
const workspace = join(runtimeRoot, 'workspace');
const bffBase = 'http://127.0.0.1:4173/api/teachbuddy';
const hostBase = 'http://127.0.0.1:3080';
const scope = 'ideal-full';

function supported(version) {
  const [major, minor] = version.trim().split('.').map(Number);
  return major >= 24 || (major === 22 && minor >= 19);
}

if (!supported(process.versions.node)) {
  const candidate = join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node');
  assert.ok(supported(execFileSync(candidate, ['-p', 'process.versions.node'], { encoding: 'utf8' })));
  const result = spawnSync(candidate, [fileURLToPath(import.meta.url)], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

async function cachedRuntime() {
  const cache = join(homedir(), 'Library/Caches/pnpm/dlx');
  for (const group of await readdir(cache)) {
    const manifest = join(cache, group, 'pkg/node_modules/@deepseek-ai/dsh/package.json');
    if (!existsSync(manifest)) continue;
    const path = realpathSync(manifest);
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (value.version === '0.1.1-rc.2') return { version: value.version, bin: realpathSync(join(cache, group, 'pkg/node_modules/.bin/dsh')) };
  }
  throw new Error('The pinned rc2 package must already be cached; this test never installs packages.');
}

function listening(port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve(false) : reject(error));
  });
}

async function run() {
  assert.equal(await listening(3080), false, 'Port 3080 is occupied; stop the authoritative runtime before this test.');
  assert.equal(await listening(4173), true, 'Start the existing BFF/Vite on 4173 before this test.');
  assert.equal(existsSync(join(workspace, '.env')), false, 'Fixture cwd must not contain an .env file.');
  const installed = await cachedRuntime();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Protocol fixture exceeded 120 seconds')), 120000);
  timeout.unref();
  const interrupt = () => controller.abort(new Error('Protocol fixture interrupted'));
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  const createdIds = new Set();
  const sockets = [];
  const frames = [];
  let fixture;
  let child;
  let childExit;
  let home;
  let logs = '';
  let report;

  async function waitFor(label, operation, budget = 15000) {
    const deadline = Date.now() + budget;
    while (Date.now() < deadline) {
      controller.signal.throwIfAborted();
      if (fixture?.evidence.errors.length) throw new Error(fixture.evidence.errors.join('; '));
      const value = await operation();
      if (value) return value;
      await delay(60, undefined, { signal: controller.signal });
    }
    throw new Error(`Timed out: ${label}`);
  }

  async function rpc(method, payload) {
    const rpcId = randomUUID();
    const response = await fetch(`${hostBase}/api/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json', Origin: hostBase },
      body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    });
    assert.equal(response.status, 200, method);
    const envelope = await response.json();
    assert.equal(envelope.rpcId, rpcId);
    assert.equal(envelope.result.ok, true, `${method}: ${JSON.stringify(envelope.result.error)}`);
    return envelope.result.value;
  }

  async function bff(path, body) {
    const response = await fetch(`${bffBase}${path}${body ? '' : `${path.includes('?') ? '&' : '?'}scope=${scope}`}`, {
      method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify({ scope, ...body }) } : {}),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    });
    const value = await response.json();
    assert.equal(response.status, 200, JSON.stringify(value));
    return value;
  }

  async function openStream(path) {
    const socket = new WebSocket(`ws://127.0.0.1:3080/api/${path}`);
    sockets.push(socket);
    socket.addEventListener('message', event => {
      const envelope = JSON.parse(event.data);
      frames.push(envelope);
    });
    await once(socket, 'open', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) });
  }

  async function send(id, marker) {
    await bff(`/sessions/${id}/messages`, { text: `${EVIDENCE} ${marker}`, commandId: randomUUID() });
  }

  async function settled(id, predicate) {
    return waitFor('BFF session settled', async () => {
      const session = await bff(`/sessions/${id}`);
      if (session.status === 'failed') throw new Error(`BFF session failed: ${session.error}`);
      return session.status !== 'running' && predicate(session) ? session : false;
    });
  }

  async function stopRuntime() {
    for (const socket of sockets.splice(0)) socket.close();
    if (!child) return;
    let forced = false;
    if (child.exitCode === null && child.signalCode === null) {
      process.kill(-child.pid, 'SIGTERM');
      const ended = await Promise.race([
        childExit.then(() => true), delay(10000, false, { ref: false }),
      ]);
      if (!ended) { forced = true; process.kill(-child.pid, 'SIGKILL'); }
    }
    const [code, signal] = await childExit;
    const result = { pid: child.pid, code, signal, forced };
    child = undefined;
    childExit = undefined;
    return result;
  }

  async function startRuntime(overlay) {
    assert.equal(child, undefined, 'Stop the owned runtime before restarting it.');
    assert.equal(await listening(3080), false, 'Do not replace an unrelated runtime.');
    logs = '';
    // Both boots reuse the same home, package, patches, and allowlisted env.
    // Neither boot invokes the production launcher or reads real credentials.
    child = spawn(installed.bin, ['web', '--patch', join(root, 'runtime/harness/cordis.patch.yml'),
      '--patch', overlay, '--no-open', '--port', '3080'], {
      cwd: workspace, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: `${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`,
        HOME: homedir(), DSH_HOME: home, DSH_CWD: workspace,
        DSH_TELEMETRY_DISABLED: '1', DSH_TOOLS_MODE: 'native', DSH_PERMISSION_MODE: 'read-only',
        DEEPSEEK_API_KEY: 'protocol-fixture-not-a-real-key', DEEPSEEK_BASE_URL: fixture.url,
        TEACHBUDDY_HARNESS_CONFIG_ROOT: join(root, 'runtime/harness'),
      },
    });
    childExit = once(child, 'exit');
    child.stdout.on('data', data => { logs = (logs + data).slice(-12000); });
    child.stderr.on('data', data => { logs = (logs + data).slice(-12000); });
    await waitFor('runtime boot', async () => {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Runtime boot failed: ${logs}`);
      if (!await listening(3080)) return false;
      const response = await fetch(`${hostBase}/api/host.describe`, {
        method: 'POST', headers: { 'content-type': 'application/json', Origin: hostBase },
        body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'host.describe', payload: {} }),
        signal: AbortSignal.timeout(2000),
      });
      return response.status === 200;
    }, 30000);
    const host = await rpc('host.describe', {});
    assert.equal(host.cwd, workspace);
    const roster = await rpc('agentPreset.list', {});
    assert.deepEqual(roster.presets.map(preset => preset.id), ['teachbuddy']);
    assert.equal((await bff('/health')).status, 'ready');
    await openStream('events.mux');
    await openStream('events.host');
    return host;
  }

  async function fullHistory(id) {
    const history = await rpc('session.history', { sessionId: id, maxMessages: 100 });
    assert.equal(history.hasMore, false, 'The fixture must compare complete history, not a truncated tail.');
    return history.events.map(entry => entry.event);
  }

  try {
    console.log(`${EVIDENCE}: starting cached runtime with a loopback model fixture`);
    await mkdir(workspace, { recursive: true });
    home = await mkdtemp(join(runtimeRoot, 'harness-fixture-'));
    fixture = await startModelFixture();
    const overlay = join(home, 'fixture.patch.json');
    await writeFile(overlay, JSON.stringify([
      { id: 'session-title-llm', disabled: true },
      { id: 'llm-deepseek', config: { baseURL: fixture.url, thinking: 'disabled' } },
      { insert: [{ id: 'protocol-fixture-probe', name: join(root, 'runtime/harness/model-fixture.mjs') }] },
    ]));
    const host = await startRuntime(overlay);
    const session = await bff('/sessions', {});
    assert.match(session.id, /^tb-[a-zA-Z0-9_-]+$/);
    createdIds.add(session.id);
    const id = session.id;
    assert.ok((await bff('/sessions')).some(item => item.id === id));

    await send(id, '[fixture:text] The lesson topic is fractions.');
    const first = await settled(id, value => value.events.some(event => event.actor === 'agent' && event.summary === FIRST_REPLY));
    assert.ok(first.events.some(event => event.kind === 'teacher_message'));
    console.log(`${EVIDENCE}: first text and domain events passed`);

    await send(id, '[fixture:context] Recall the earlier lesson topic.');
    await settled(id, value => value.events.some(event => event.summary === CONTEXT_REPLY));
    assert.equal(fixture.evidence.contextObserved, true);

    await send(id, '[fixture:draft] Create a teaching draft for the lesson.');
    const draftSession = await settled(id, value => value.artifacts.length === 1 && value.events.some(event => event.summary.includes('draft tool confirmed')));
    const artifact = draftSession.artifacts[0];
    assert.equal(artifact.content, DRAFT.content);
    assert.equal(artifact.id, draftFilename(DRAFT_CALL_ID).slice(0, -5));
    assert.equal(artifact.status, 'draft');
    assert.ok(draftSession.events.some(event => event.kind === 'capability_call' && event.state === 'completed'));
    const stored = JSON.parse(await readFile(join(runtimeRoot, 'artifacts', id, `${artifact.id}.json`), 'utf8'));
    assert.equal(stored.sourceCallId, DRAFT_CALL_ID);
    const approvalId = randomUUID();
    const approved = await bff(`/sessions/${id}/artifacts/${artifact.id}/approve`, { version: 1, commandId: approvalId });
    assert.equal(approved.artifacts[0].status, 'saved');
    assert.equal(approved.artifacts[0].receipt.id, approvalId);
    const saved = JSON.parse(await readFile(join(runtimeRoot, 'saved', scope, id, `${artifact.id}.json`), 'utf8'));
    assert.equal(saved.approval.decision, 'approved');
    assert.equal(saved.receipt.truthLabel, 'local-runtime');
    assert.equal((await bff(`/sessions/${id}`)).artifacts[0].status, 'saved');
    console.log(`${EVIDENCE}: real draft registry/file and BFF approval receipt passed`);

    // Capture only API/file observations. Never seed or rewrite session state:
    // cold history must come from the restarted Harness's own persistence.
    const beforeRestart = await bff(`/sessions/${id}`);
    const durableHistory = await fullHistory(id);
    assert.equal(durableHistory.filter(event => event.type === 'turn/end').length, 3);
    const requestsBeforeRestart = fixture.evidence.requests;
    const firstProcess = await stopRuntime();
    assert.equal(firstProcess.forced, false, 'The persistence check requires a graceful shutdown.');
    assert.ok(firstProcess.code === 0 || firstProcess.signal === 'SIGTERM', 'Runtime shutdown failed.');
    assert.equal(await listening(3080), false, 'First runtime must exit before the second boot.');
    await startRuntime(overlay);
    const restartedPid = child.pid;
    assert.notEqual(restartedPid, firstProcess.pid, 'Recovery must run in a new OS process.');

    const restoredHistory = await fullHistory(id);
    assert.deepEqual(restoredHistory, durableHistory, 'Cold Harness history must retain every raw event unchanged.');
    const restored = await bff(`/sessions/${id}`);
    assert.equal(restored.id, id);
    assert.equal(restored.status, beforeRestart.status);
    assert.deepEqual(restored.events, beforeRestart.events, 'BFF must recover the complete conversation.');
    assert.deepEqual(restored.artifacts, beforeRestart.artifacts, 'Saved artifact and original receipt must survive.');
    assert.deepEqual(JSON.parse(await readFile(join(runtimeRoot, 'artifacts', id, `${artifact.id}.json`), 'utf8')), stored);
    assert.deepEqual(JSON.parse(await readFile(join(runtimeRoot, 'saved', scope, id, `${artifact.id}.json`), 'utf8')), saved);
    assert.equal(fixture.evidence.requests, requestsBeforeRestart, 'Recovery reads must not fabricate new model turns.');
    assert.ok((await bff('/sessions')).some(item => item.id === id));

    const priorReplies = restored.events.filter(event => event.actor === 'agent' && event.summary === CONTEXT_REPLY).length;
    const frameBoundary = frames.length;
    fixture.evidence.contextObserved = false;
    await send(id, '[fixture:context] After the runtime restart, recall the earlier lesson topic.');
    const resumed = await settled(id, value => value.events.filter(event => event.actor === 'agent'
      && event.summary === CONTEXT_REPLY).length === priorReplies + 1);
    assert.equal(fixture.evidence.contextObserved, true, 'The new model request must include the original conversation.');
    assert.equal(fixture.evidence.requests, requestsBeforeRestart + 1);
    assert.deepEqual(resumed.events.slice(0, restored.events.length), restored.events);
    assert.deepEqual(resumed.artifacts, restored.artifacts);
    const resumedHistory = await fullHistory(id);
    assert.deepEqual(resumedHistory.slice(0, durableHistory.length), durableHistory);
    assert.equal(resumedHistory.filter(event => event.type === 'turn/end').length, 4);
    await waitFor('resumed turn on reconnected WebSocket', () => frames.slice(frameBoundary).some(frame =>
      frame.payload.type === 'session/event' && frame.payload.sessionId === id
      && frame.payload.event.type === 'turn/end' && frame.payload.event.data.reason.kind === 'completed'));
    console.log(`${EVIDENCE}: process restart, cold history, original receipt, and continued context passed`);

    await send(id, '[fixture:guard] Attempt both forbidden protocol probes.');
    const denied = await settled(id, value => value.events.some(event => event.summary.includes('both forbidden calls')));
    assert.equal(fixture.evidence.guardObserved, true);
    assert.equal(fixture.evidence.unsupportedToolObserved, true);
    assert.ok(denied.events.some(event => event.kind === 'capability_call' && event.state === 'failed'));

    await send(id, '[fixture:cancel] Delay the response until explicitly cancelled.');
    await waitFor('delayed model response', () => fixture.evidence.delayedStarted);
    const cancelStarted = Date.now();
    await bff(`/sessions/${id}/cancel`, {});
    await settled(id, value => value.status === 'stopped');
    await waitFor('provider HTTP stream aborted', () => fixture.evidence.delayedAborted);
    const cancellationMs = Date.now() - cancelStarted;
    assert.ok(cancellationMs < 10000);
    const raw = await fullHistory(id);
    assert.equal(raw.filter(event => event.type === 'turn/end').length, 6);
    assert.ok(raw.some(event => event.type === 'tool/call' && event.data.name === PROBE_TOOL));
    assert.ok(raw.some(event => event.type === 'turn/end' && ['aborted', 'interrupted'].includes(event.data.reason.kind)));
    await waitFor('WebSocket cancellation event', () => frames.some(frame => frame.payload.type === 'session/event'
      && frame.payload.sessionId === id && frame.payload.event.type === 'turn/end'
      && ['aborted', 'interrupted'].includes(frame.payload.event.data.reason.kind)));
    assert.ok(frames.some(frame => frame.payload.type === 'host/session-status' && frame.payload.running));
    assert.ok(frames.some(frame => frame.payload.type === 'session/event' && frame.payload.event.type === 'assistant/chunk'));
    report = { evidence: EVIDENCE, passed: true, packageVersion: installed.version,
      hostDescribeVersion: host.version, fixtureKeyConfigured: true, modelRequests: fixture.evidence.requests,
      twoTurnContext: true, realDraftTool: true, bffApprovalReceipt: true, actualRegistryGuard: true,
      runtimeRestart: { beforePid: firstProcess.pid, afterPid: restartedPid, graceful: true,
        sameHomeAndPatch: true, coldHistoryEvents: restoredHistory.length, fullHistoryRestored: true,
        bffHistoryRestored: true, savedArtifactAndReceiptUnchanged: true, continuedContext: true },
      absentBashDenied: true, cancellationMs, providerRequestAborted: true,
      websocketFrames: frames.length, domainEvents: denied.events.length, cleanupSessionIds: [...createdIds] };
  } finally {
    await stopRuntime();
    await fixture?.close();
    // These ids were returned by this run's BFF creates. No other sessions,
    // artifacts, receipts, settings, or user credentials are touched.
    for (const id of createdIds) {
      await rm(join(runtimeRoot, 'sessions', `${id}.json`), { force: true });
      await rm(join(runtimeRoot, 'artifacts', id), { recursive: true, force: true });
      await rm(join(runtimeRoot, 'saved', scope, id), { recursive: true, force: true });
    }
    if (home) await rm(home, { recursive: true, force: true });
    clearTimeout(timeout);
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
  assert.equal(await listening(3080), false, 'Fake-model runtime was not stopped');
  report.fixtureStopped = true;
  report.realRuntimeRestart = 'parent-owned';
  await writeFile(join(runtimeRoot, 'harness-protocol-fixture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

run().catch(error => {
  console.error(`${EVIDENCE}: FAIL: ${error.message}`);
  process.exitCode = 1;
});
