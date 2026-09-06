import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const projectRoot = resolve(new URL('../', import.meta.url).pathname);

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = option('--base-url', 'http://127.0.0.1:4173')?.replace(/\/$/, '');
const tasksPath = resolve(projectRoot, option('--tasks', 'evaluation/courseware-v2-grade3-math/m1/tasks.json'));
const outputDirectory = resolve(projectRoot, option('--output-dir', `prototype/courseware-v2-grade3-math/m1-v1-baseline/${new Date().toISOString().replace(/[:.]/g, '-')}`));
const requestedCase = option('--case');
const scope = option('--scope', 'ideal-full');
const pollIntervalMs = Number(option('--poll-ms', '2000'));
const timeoutMs = Number(option('--timeout-ms', '600000'));

if (!baseUrl || !Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 250
  || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1000) {
  throw new Error('Invalid runner arguments.');
}

const wait = (duration) => new Promise((accept) => setTimeout(accept, duration));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let value;
  try {
    value = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${init.method ?? 'GET'} ${path} returned non-JSON (${response.status}).`);
  }
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed (${response.status}): ${value?.error ?? text}`);
  return value;
}

const post = (path, body) => request(path, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function artifactExtension(format) {
  return { html: 'html', markdown: 'md', text: 'txt', json: 'json' }[format] ?? 'txt';
}

function evidenceSession(session) {
  return {
    ...session,
    artifacts: session.artifacts.map(({ content, ...artifact }) => ({
      ...artifact,
      contentSha256: sha256(content),
      contentBytes: Buffer.byteLength(content, 'utf8'),
    })),
  };
}

function latestAgentText(session) {
  return session.events
    .filter((event) => event.actor === 'agent' && typeof event.summary === 'string')
    .at(-1)?.summary ?? '';
}

async function waitForTerminal(sessionId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const session = await request(`/api/teachbuddy/sessions/${sessionId}?scope=${encodeURIComponent(scope)}`);
    if (session.status !== 'running') return session;
    await wait(pollIntervalMs);
  }
  await post(`/api/teachbuddy/sessions/${sessionId}/cancel`, { scope }).catch(() => undefined);
  throw new Error(`Session ${sessionId} exceeded ${timeoutMs}ms and cancellation was requested.`);
}

const rawSuite = JSON.parse(await readFile(tasksPath, 'utf8'));
const cases = requestedCase
  ? rawSuite.cases.filter((item) => item.id === requestedCase)
  : rawSuite.cases;
if (cases.length === 0) throw new Error(`No matching case in ${basename(tasksPath)}.`);

const health = await request('/api/teachbuddy/health');
if (health.status !== 'ready') throw new Error(`TeachBuddy runtime is not ready: ${health.message ?? health.status}`);

await mkdir(outputDirectory, { recursive: true });
const manifest = {
  schemaVersion: 1,
  suiteId: rawSuite.suiteId,
  suiteSha256: sha256(JSON.stringify(rawSuite)),
  baseline: rawSuite.baseline,
  scope,
  baseUrl,
  startedAt: new Date().toISOString(),
  runtimeHealthAtStart: health,
  cases: [],
};

for (const testCase of cases) {
  const caseDirectory = join(outputDirectory, testCase.id);
  await mkdir(caseDirectory);
  const caseStart = Date.now();
  const evidence = {
    id: testCase.id,
    axis: testCase.axis,
    expectedDisposition: testCase.expectedDisposition,
    promptSha256: sha256(testCase.prompt),
    startedAt: new Date().toISOString(),
  };
  process.stdout.write(`[${testCase.id}] creating session\n`);
  try {
    const created = await post('/api/teachbuddy/sessions', { scope });
    evidence.sessionId = created.id;
    const commandId = `m1-${testCase.id.toLowerCase()}-${Date.now().toString(36)}`;
    await post(`/api/teachbuddy/sessions/${created.id}/messages`, {
      scope,
      text: testCase.prompt,
      commandId,
    });
    const session = await waitForTerminal(created.id);
    const artifacts = [];
    for (const [index, artifact] of session.artifacts.entries()) {
      const filename = `${String(index + 1).padStart(2, '0')}-${artifact.id}.${artifactExtension(artifact.format)}`;
      await writeFile(join(caseDirectory, filename), artifact.content, 'utf8');
      artifacts.push({
        id: artifact.id,
        title: artifact.title,
        fileName: artifact.fileName,
        format: artifact.format,
        status: artifact.status,
        version: artifact.version,
        snapshot: filename,
        sha256: sha256(artifact.content),
        bytes: Buffer.byteLength(artifact.content, 'utf8'),
      });
    }
    await writeFile(join(caseDirectory, 'session.json'), `${JSON.stringify(evidenceSession(session), null, 2)}\n`);
    evidence.commandId = commandId;
    evidence.terminalStatus = session.status;
    evidence.observedDisposition = artifacts.length > 0 ? 'artifact' : 'clarification';
    evidence.dispositionMatched = evidence.observedDisposition === testCase.expectedDisposition;
    evidence.artifacts = artifacts;
    evidence.latestAgentText = latestAgentText(session);
  } catch (error) {
    evidence.terminalStatus = 'runner_error';
    evidence.observedDisposition = 'failure';
    evidence.dispositionMatched = false;
    evidence.error = error instanceof Error ? error.message : String(error);
    if (evidence.sessionId) {
      try {
        const failedSession = await request(`/api/teachbuddy/sessions/${evidence.sessionId}?scope=${encodeURIComponent(scope)}`);
        await writeFile(join(caseDirectory, 'session.json'), `${JSON.stringify(evidenceSession(failedSession), null, 2)}\n`);
        evidence.runtimeStatusAfterFailure = failedSession.status;
        evidence.latestAgentText = latestAgentText(failedSession);
      } catch (readError) {
        evidence.failureSnapshotError = readError instanceof Error ? readError.message : String(readError);
      }
    }
  }
  evidence.finishedAt = new Date().toISOString();
  evidence.durationMs = Date.now() - caseStart;
  manifest.cases.push(evidence);
  await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  process.stdout.write(`[${testCase.id}] ${evidence.terminalStatus}; ${evidence.observedDisposition}; ${evidence.durationMs}ms\n`);
}

manifest.finishedAt = new Date().toISOString();
manifest.summary = {
  total: manifest.cases.length,
  terminal: manifest.cases.filter((item) => item.terminalStatus !== 'runner_error').length,
  dispositionMatched: manifest.cases.filter((item) => item.dispositionMatched).length,
  artifactCases: manifest.cases.filter((item) => item.observedDisposition === 'artifact').length,
  clarificationCases: manifest.cases.filter((item) => item.observedDisposition === 'clarification').length,
  failures: manifest.cases.filter((item) => item.observedDisposition === 'failure').length,
};
await writeFile(join(outputDirectory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest.summary)}\nEvidence: ${outputDirectory}\n`);
