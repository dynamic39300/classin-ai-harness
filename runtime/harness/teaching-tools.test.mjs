import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { apply, createTeachingDraftTool, draftFilename, teachingToolGuard, TOOL_NAME } from './teaching-tools.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'teachbuddy-draft-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const runtimeRoot = join(root, '.runtime');
  return { root, runtimeRoot, tool: createTeachingDraftTool(runtimeRoot) };
}

function execution(callId = 'call-1', sessionId = 'session-1', signal = new AbortController().signal) {
  return { callId, agent: { session: { id: sessionId } }, signal };
}

const args = { title: 'Lesson draft', content: 'Goal: compare two fractions.\nPractice: 1/2 and 2/3.' };

test('registers teaching tools and a guard that rejects unsupported names', () => {
  const definitions = [];
  const guards = [];
  apply({ tools: { guard: guard => guards.push(guard), register: tool => definitions.push(tool) } });
  assert.deepEqual(definitions.map(tool => tool.name), [TOOL_NAME, 'create_solution_image', 'read_classin_context']);
  assert.equal(guards.length, 1);
  for (const tool of ['bash', 'read', 'write', 'subagent', 'run_code', 'todo_write', 'future_tool']) {
    assert.equal(typeof guards[0]({ name: tool }), 'string');
  }
  assert.equal(teachingToolGuard({ name: TOOL_NAME }), undefined);
});

test('saves canonical draft JSON, preserves id, and leaves no temporary files', async t => {
  const { runtimeRoot, tool } = await fixture(t);
  const draft = await tool.execute(args, execution());
  assert.deepEqual(draft, {
    id: 'call-1', ...args, fileName: 'Lesson draft.md', format: 'markdown',
    mediaType: 'text/markdown; charset=utf-8', byteSize: Buffer.byteLength(args.content),
    version: 1, status: 'draft',
  });
  const directory = join(runtimeRoot, 'artifacts/session-1');
  const file = join(directory, 'call-1.json');
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), draft);
  assert.deepEqual(await readdir(directory), ['call-1.json']);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(tool.output.render(args, draft)[0].text), draft);
});

test('concurrent identical retries are idempotent; conflicting retries cannot overwrite', async t => {
  const { runtimeRoot, tool } = await fixture(t);
  const results = await Promise.all([tool.execute(args, execution()), tool.execute(args, execution())]);
  assert.deepEqual(results[0], results[1]);
  await assert.rejects(tool.execute({ ...args, content: 'different' }, execution()), /different draft/);
  assert.deepEqual(JSON.parse(await readFile(join(runtimeRoot, 'artifacts/session-1/call-1.json'), 'utf8')), results[0]);
});

test('the same call id is isolated between sessions', async t => {
  const { runtimeRoot, tool } = await fixture(t);
  await tool.execute(args, execution('call-1', 'session-1'));
  await tool.execute({ ...args, title: 'Other lesson' }, execution('call-1', 'session-2'));
  assert.equal(JSON.parse(await readFile(join(runtimeRoot, 'artifacts/session-2/call-1.json'), 'utf8')).title, 'Other lesson');
});

test('unsafe call ids are hashed; ids cannot select a filesystem path', async t => {
  const { runtimeRoot, tool } = await fixture(t);
  const callId = '../../escape/unsafe:id';
  const filename = draftFilename(callId);
  assert.match(filename, /^sha256-[a-f0-9]{64}\.json$/);
  const draft = await tool.execute(args, execution(callId));
  assert.equal(draft.id, filename.slice(0, -5));
  assert.match(draft.id, /^[a-zA-Z0-9_-]{1,120}$/);
  assert.equal(draft.sourceCallId, callId);
  assert.equal(JSON.parse(await readFile(join(runtimeRoot, 'artifacts/session-1', filename), 'utf8')).sourceCallId, callId);
  assert.notEqual(draftFilename(filename.slice(0, -5)), filename);
  for (const sessionId of ['../escape', '/tmp', '.', 'a/b', 'a\\b', '']) {
    await assert.rejects(tool.execute(args, execution('call-2', sessionId)), /path-safe/);
  }
});

test('raw-schema tools validate arguments and required runtime identity themselves', async t => {
  const { tool } = await fixture(t);
  for (const invalid of [null, [], {}, { ...args, title: ' ' }, { ...args, content: ' ' },
    { ...args, title: 'x'.repeat(201) }, { ...args, path: '/tmp/x' }, { ...args, fileName: '../x.md' },
    { ...args, format: 'pdf' }, { ...args, content: 'x'.repeat(120001) }]) {
    await assert.rejects(tool.execute(invalid, execution()), /Supply a title/);
  }
  await assert.rejects(tool.execute(args, { signal: new AbortController().signal, callId: 'x' }), /session id/);
  await assert.rejects(tool.execute(args, execution('')), /call id/);
});

test('emits explicit metadata for HTML, text, and JSON files', async t => {
  const { tool } = await fixture(t);
  for (const [format, content, extension, mediaType] of [
    ['html', '<!doctype html><title>Fractions</title>', 'html', 'text/html; charset=utf-8'],
    ['text', 'Fractions lesson', 'txt', 'text/plain; charset=utf-8'],
    ['json', '{"lesson":"fractions"}', 'json', 'application/json; charset=utf-8'],
  ]) {
    const draft = await tool.execute({ title: 'Fractions', content, format, fileName: `Requested.${extension}` }, execution(`call-${format}`));
    assert.equal(draft.fileName, `Requested.${extension}`);
    assert.equal(draft.format, format);
    assert.equal(draft.mediaType, mediaType);
    assert.equal(draft.byteSize, Buffer.byteLength(content));
  }
  await assert.rejects(tool.execute({ title: 'Broken JSON', content: '{', format: 'json' }, execution('bad-json')), /valid JSON/);
});

test('accepts the BFF content boundary and hashes ids beyond its length limit', async t => {
  const { tool } = await fixture(t);
  const callId = 'x'.repeat(121);
  const content = 'x'.repeat(120000);
  const draft = await tool.execute({ ...args, content }, execution(callId));
  assert.equal(draft.content.length, 120000);
  assert.match(draft.id, /^[a-zA-Z0-9_-]{1,120}$/);
  assert.equal(draft.sourceCallId, callId);
});

test('an already cancelled call creates no runtime files', async t => {
  const { root, tool } = await fixture(t);
  await assert.rejects(tool.execute(args, execution('call-1', 'session-1', AbortSignal.abort())), { name: 'AbortError' });
  assert.deepEqual(await readdir(root), []);
});

test('session directory and destination symlinks cannot redirect a draft write', async t => {
  const { root, runtimeRoot, tool } = await fixture(t);
  const outside = join(root, 'outside');
  await mkdir(outside);
  await mkdir(join(runtimeRoot, 'artifacts'), { recursive: true });
  await symlink(outside, join(runtimeRoot, 'artifacts/session-1'));
  await assert.rejects(tool.execute(args, execution()), /real directories/);
  assert.deepEqual(await readdir(outside), []);
  await mkdir(join(runtimeRoot, 'artifacts/session-2'));
  await symlink(join(outside, 'target'), join(runtimeRoot, 'artifacts/session-2/call-1.json'));
  await assert.rejects(tool.execute(args, execution('call-1', 'session-2')));
  assert.deepEqual(await readdir(outside), []);
});

test('solution images keep a bounded structured source and are idempotent', async t => {
  const { runtimeRoot } = await fixture(t);
  const { createSolutionImageTool } = await import('./teaching-tools.mjs');
  const tool = createSolutionImageTool(runtimeRoot);
  const source = { title: '解题步骤', steps: [{title:'第一步',explanation:'确认题意',formula:'x=1'},{title:'第二步',explanation:'代入验证'}], conclusion:'结果为1' };
  const first = await tool.execute(source, execution());
  assert.equal(first.fileName, 'solution.solution.json');
  assert.deepEqual(JSON.parse(first.content), source);
  assert.deepEqual(await tool.execute(source, execution()), first);
  await assert.rejects(tool.execute({...source,steps:[]}, execution('invalid')));
  assert.equal(teachingToolGuard({name:'create_solution_image'}), undefined);
});
