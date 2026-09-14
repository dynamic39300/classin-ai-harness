// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
import { createHarnessRpc, createTeachBuddyRuntime, maintainRuntime, runtimeMiddleware } from './teachbuddy-runtime.ts';
import type { SessionFileContent, SessionFileGroup } from '../src/contracts/workbuddy/session-files.ts';

const roots: string[] = [];
const RUN_WINDOW = 10 * 60_000 + 20_000;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((fulfilled, rejected) => { resolve = fulfilled; reject = rejected; });
  return { promise, resolve, reject };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'teachbuddy-runtime-'));
  roots.push(root);
  const calls: { method: string; payload: Record<string, unknown>; rpcId?: string }[] = [];
  const events: unknown[] = [];
  let running = false;
  let configured = true;
  let losePromptResponse = false;
  let stage: 'executing' | 'claimed' | 'queued' | 'unknown' = 'executing';
  let turn = 0;
  let id = '';
  let queuedMessage: { id: string; role: string; source: { kind: string; rpcId?: string }; content: unknown } | undefined;
  const append = (type: string, data: Record<string, unknown>) => {
    const entry = { event: { seq: events.length, time: Date.now(), type, data,
      ...(['user/message', 'assistant/message', 'tool/result'].includes(type) ? { surfaceOp: 'append' } : {}) } };
    events.push(entry);
    return entry;
  };
  const claim = (enter = true) => {
    if (!queuedMessage) throw new Error('No queued message');
    running = true;
    append('turn/start', { turn: ++turn });
    append('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [] });
    if (enter) {
      append('step/start', { turn, step: 1 });
      append('user/message', queuedMessage);
    }
    queuedMessage = undefined;
  };
  const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string): Promise<unknown> => {
    calls.push({ method, payload, rpcId });
    if (method === 'host.describe') return { cwd: join(root, 'workspace'), version: '0.1.1-rc.2' };
    if (method === 'agentPreset.list') return { presets: [{ id: 'teachbuddy' }] };
    if (method === 'credentials.describe') return { credentials: { DEEPSEEK_API_KEY: { configured } } };
    if (method === 'session.create') {
      const createdId = String(payload.sessionId);
      if (!createdId.startsWith('tb-model-default-restore-')) id = createdId;
      return { sessionId: createdId };
    }
    if (method === 'session.history') return { events: structuredClone(events), hasMore: false };
    if (method === 'session.list') return { items: [{ sessionId: id, running }] };
    if (method === 'session.models') return {
      current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, routable: true,
      groups: [{ id: 'deepseek-official', name: 'DeepSeek', models: [
        { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash' },
        { id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek Vision' },
      ] }, { id: 'company-gateway', name: 'Company gateway', models: [
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'tokenhub/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
      ] }], failures: [],
    };
    if (method === 'session.selectModel') return { selected: { provider: payload.provider, model: payload.model } };
    if (method === 'session.prompt') {
      if (stage === 'unknown') throw new Error('transport lost before an observable admission');
      const content = Array.isArray(payload.content) ? payload.content.map((part) => {
        if (!part || typeof part !== 'object' || !('type' in part) || part.type !== 'image') return part;
        return { type: 'image', attachment: { attachmentId: `attachment-${rpcId}`, mediaType: 'mediaType' in part ? part.mediaType : '', name: 'name' in part ? part.name : undefined } };
      }) : payload.content;
      const message = { id: `message-${rpcId}`, role: 'user', source: { kind: 'user', rpcId }, content };
      queuedMessage = message;
      // Official agent/src/inbox.ts: insertion, turn/start, claim deletion, then step entry.
      append('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [message] });
      if (stage !== 'queued') claim(stage === 'executing');
      if (losePromptResponse) throw new Error('transport lost');
      return { accepted: true };
    }
    if (method === 'session.updateQueue') {
      expect(payload.action).toEqual({ kind: 'remove' });
      expect(payload.itemId).toBe(queuedMessage?.id);
      append('agent/inbox/spliced', { target: 'next-turn', start: 0, removedCount: 1, inserted: [], outcome: 'canceled' });
      queuedMessage = undefined;
      return { accepted: true };
    }
    if (method === 'session.cancel') {
      running = false;
      append('turn/end', { turn, reason: { kind: 'aborted', reason: { kind: 'user' } } });
      return { accepted: true };
    }
    throw new Error(`Unexpected RPC ${method}`);
  };
  return {
    root, calls, events, rpc, append, claim, adapter: createTeachBuddyRuntime({ root, rpc }),
    unconfigure() { configured = false; },
    loseResponse() { losePromptResponse = true; },
    setStage(value: typeof stage) { stage = value; },
    finish(kind = 'completed') { running = false; append('turn/end', { turn, reason: { kind } }); },
  };
}

describe('TeachBuddy runtime governance', () => {
  it('refuses missing credentials without falling back to a simulated run', async () => {
    const f = fixture(); f.unconfigure();
    expect((await f.adapter.health()).status).toBe('unconfigured');
    await expect(f.adapter.create('ideal-full')).rejects.toThrow('凭据');
    expect(f.calls.some((call) => call.method === 'session.create')).toBe(false);
  });

  it('owns durable sessions and isolates product scopes', async () => {
    const f = fixture();
    const session = await f.adapter.create('ideal-full');
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    expect((await restarted.list('ideal-full'))[0]?.id).toBe(session.id);
    expect(await restarted.list('standalone-teacher')).toEqual([]);
    await expect(restarted.read('classin-mvp', session.id)).rejects.toThrow('工作区');
    await expect(restarted.cancel('classin-mvp', session.id)).rejects.toThrow('工作区');
    await expect(restarted.read('ideal-full', '../outside')).rejects.toThrow('不存在');
  });

  it('serializes duplicate sends, reconciles lost receipts and never sends an uncertain prompt twice', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.loseResponse();
    const first = await f.adapter.send('ideal-full', session.id, '编写教案', 'command-1');
    expect(first.status).toBe('running');
    const reconciled = await f.adapter.send('ideal-full', session.id, '编写教案', 'command-1');
    expect(reconciled.status).toBe('running');
    expect(f.calls.filter((call) => call.method === 'session.prompt')).toHaveLength(1);
    await expect(f.adapter.send('ideal-full', session.id, '不同内容', 'command-1')).rejects.toThrow('不一致');
    await expect(f.adapter.send('ideal-full', session.id, '下一条', 'command-2')).rejects.toThrow('正在执行');
    await f.adapter.cancel('ideal-full', session.id);
    expect(f.calls.filter((call) => call.method === 'session.cancel')).toHaveLength(1);
    const read = await f.adapter.read('ideal-full', session.id);
    expect(read.status).not.toBe('running');
    expect(read.events.filter((event) => event.kind === 'teacher_message')).toHaveLength(1);
  });

  it('pins new text sessions independently of the host default', async () => {
    const f = fixture();
    const session = await f.adapter.create('ideal-full');
    expect(f.calls.find(({ method }) => method === 'session.selectModel')?.payload).toEqual({
      sessionId: session.id, provider: 'deepseek-official', model: 'deepseek-v4-flash',
    });
  });

  it('refuses an absent configured image route before admitting the prompt', async () => {
    const f = fixture();
    const adapter = createTeachBuddyRuntime({ root: f.root, rpc: (method, payload, id) => method === 'session.models'
      ? Promise.resolve({ current: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }, groups: [] })
      : f.rpc(method, payload, id) });
    const session = await adapter.create('ideal-full');
    const data = 'iVBORw0KGgo=';
    await expect(adapter.send('ideal-full', session.id, '', 'missing-route', [{ name: 'test.png', mediaType: 'image/png', data, byteSize: 8 }])).rejects.toThrow('识图模型');
    expect(f.calls.some(({ method }) => method === 'session.prompt')).toBe(false);
    expect((await adapter.read('ideal-full', session.id)).error).toContain('识图模型');
  });

  it('validates image bytes, selects the configured Gemini route across providers without modality metadata, and admits image-only prompts', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZxQAAAABJRU5ErkJggg==';
    const image = { name: '../课堂板书.png', mediaType: 'image/png' as const, byteSize: Buffer.from(data, 'base64').length, data };
    await f.adapter.send('ideal-full', session.id, '', 'image-only', [image]);
    expect(f.calls.find(({ method, payload }) => method === 'session.selectModel' && payload.provider === 'company-gateway')?.payload).toMatchObject({ provider: 'company-gateway', model: 'gemini-2.5-pro' });
    expect(f.calls.filter(({ method }) => method === 'session.selectModel').at(-1)?.payload).toMatchObject({ sessionId: expect.stringMatching(/^tb-model-default-restore-/), model: 'deepseek-v4-flash' });
    expect(f.calls.find(({ method }) => method === 'session.prompt')?.payload.content).toEqual([{ type: 'image', mediaType: 'image/png', data, name: '课堂板书.png' }]);
    expect((await f.adapter.read('ideal-full', session.id)).events).toContainEqual(expect.objectContaining({ kind: 'teacher_message', summary: '已附 1 张图片（课堂板书.png）' }));
    await expect(f.adapter.send('ideal-full', session.id, '', 'image-only', [{ ...image, name: '另一张.png' }])).rejects.toThrow('不一致');
    await expect(f.adapter.send('ideal-full', session.id, '', 'bad-image', [{ ...image, data: 'bm90LWEtcG5n', byteSize: 9 }])).rejects.toThrow('内容不正确');
    f.append('assistant/chunk', { turn: 1, step: 1, chunk: { type: 'finish', reason: { kind: 'error', failure: {
      code: 'AUTH', status: 403, message: 'key not allowed to access model deepseek-v4-flash-vision-exp',
    } } } });
    f.finish('error');
    expect(await f.adapter.read('ideal-full', session.id)).toMatchObject({
      status: 'failed', failureCode: 'vision-permission',
      error: '当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。',
    });
  });

  it('returns a running snapshot after prompt admission starts instead of waiting for the model turn to finish', async () => {
    const f = fixture();
    const promptStarted = deferred<void>();
    const promptFinished = deferred<void>();
    const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string) => {
      const result = await f.rpc(method, payload, rpcId);
      if (method === 'session.prompt') {
        promptStarted.resolve();
        await promptFinished.promise;
      }
      return result;
    };
    const adapter = createTeachBuddyRuntime({ root: f.root, rpc });
    const session = await adapter.create('ideal-full');
    const sending = adapter.send('ideal-full', session.id, '识别图片并生成解析图', 'slow-model-turn');
    await promptStarted.promise;
    try {
      const outcome = await Promise.race([
        sending.then(() => 'returned'),
        new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 25)),
      ]);
      expect(outcome).toBe('returned');
      expect(await sending).toMatchObject({ status: 'running' });
    } finally {
      promptFinished.resolve();
      await sending;
    }
  });

  it('maintains a lost prompt response after BFF restart and enforces its deadline without a browser', async () => {
    vi.useFakeTimers();
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.loseResponse();
    expect((await f.adapter.send('ideal-full', session.id, 'Run', 'lost')).status).toBe('running');
    await vi.advanceTimersByTimeAsync(0);
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    const stop = maintainRuntime(restarted);
    try {
      await vi.advanceTimersByTimeAsync(10 * 60_000 + 20_000);
      expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(1);
      expect((await restarted.list('ideal-full'))[0]?.status).toBe('stopped');
      expect((await restarted.list('ideal-full'))[0]?.error).toContain('10 分钟');
      expect((await restarted.read('ideal-full', session.id)).error).toContain('10 分钟');
      const reads = f.calls.filter(call => call.method === 'session.history').length;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(f.calls.filter(call => call.method === 'session.history')).toHaveLength(reads);
      expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(1);
    } finally { stop(); }
  });

  it('settles a claimed but unentered cancelled prompt and permits a new command after restart', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.setStage('claimed');
    await f.adapter.send('ideal-full', session.id, 'Cancel before step', 'claimed');
    const stopped = await f.adapter.cancel('ideal-full', session.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.events).toContainEqual(expect.objectContaining({ kind: 'teacher_message', state: 'cancelled', summary: 'Cancel before step' }));
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    expect((await restarted.send('ideal-full', session.id, 'Cancel before step', 'claimed')).status).toBe('stopped');
    f.setStage('executing');
    expect((await restarted.send('ideal-full', session.id, 'Next', 'next')).status).toBe('running');
    expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(2);
  });

  it('loads every official beforeSeq history page instead of replacing the transcript with its tail', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    for (let i = 0; i < 205; i++) f.append('user/message', {
      id: `history-${i}`, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: `Message ${i}` }],
    });
    const cursors: unknown[] = [];
    const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string) => {
      if (method !== 'session.history') return f.rpc(method, payload, rpcId);
      cursors.push(payload.beforeSeq);
      const before = typeof payload.beforeSeq === 'number' ? payload.beforeSeq : f.events.length;
      const cut = Math.max(0, before - 100);
      return { events: f.events.slice(cut, before), hasMore: cut > 0 };
    };
    const read = await createTeachBuddyRuntime({ root: f.root, rpc }).read('ideal-full', session.id);
    expect(read.events).toHaveLength(205);
    expect(read.events[0]?.summary).toBe('Message 0');
    expect(cursors).toEqual([undefined, 105, 5]);
  });

  it('retains a known rejection across reads and restarts without replaying the same command', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    const remote = createHarnessRpc();
    const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
      const request: unknown = JSON.parse(String(init?.body));
      if (!request || typeof request !== 'object' || !('rpcId' in request)) throw new Error('Missing rpcId');
      return Response.json({ rpcId: request.rpcId, result: { ok: false, error: { code: 'model-unavailable', message: 'PRIVATE PROVIDER' } } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const rpc = (method: string, payload: Record<string, unknown>, rpcId?: string) => method === 'session.prompt'
      ? remote(method, payload, rpcId) : f.rpc(method, payload, rpcId);
    const adapter = createTeachBuddyRuntime({ root: f.root, rpc });
    expect((await adapter.send('ideal-full', session.id, 'Keep this input', 'refused')).status).toBe('running');
    await vi.waitFor(async () => expect((await adapter.read('ideal-full', session.id)).status).toBe('failed'));
    const read = await adapter.read('ideal-full', session.id);
    expect(read.status).toBe('failed');
    expect(read.error).toContain('模型');
    expect(read.events).toContainEqual(expect.objectContaining({ kind: 'teacher_message', state: 'failed', summary: 'Keep this input' }));
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc });
    await expect(restarted.send('ideal-full', session.id, 'Keep this input', 'refused')).rejects.toMatchObject({ status: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(await restarted.read('ideal-full', session.id))).not.toContain('PRIVATE');
    const recovered = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    await recovered.send('ideal-full', session.id, 'New attempt', 'new-attempt');
    const next = await recovered.read('ideal-full', session.id);
    expect(next.error).toBeUndefined();
    expect(next.events.filter(event => event.kind === 'teacher_message').map(event => [event.summary, event.state])).toEqual([
      ['Keep this input', 'failed'], ['New attempt', 'completed'],
    ]);
  });

  it('removes a durable queued prompt by message ID after a cold restart without starting a model turn', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.setStage('queued');
    await f.adapter.send('ideal-full', session.id, 'Queued', 'queued');
    let attached = false;
    const rpc = (method: string, payload: Record<string, unknown>, rpcId?: string) => {
      if (method === 'session.create') attached = true;
      if (method === 'session.updateQueue') expect(attached).toBe(true);
      return f.rpc(method, payload, rpcId);
    };
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc });
    const stopped = await restarted.cancel('ideal-full', session.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.events).toContainEqual(expect.objectContaining({ summary: 'Queued', state: 'cancelled' }));
    expect(f.calls.filter(call => call.method === 'session.updateQueue').map(call => call.payload)).toEqual([
      { sessionId: session.id, itemId: 'message-queued', action: { kind: 'remove' } },
    ]);
    expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(0);
    await restarted.send('ideal-full', session.id, 'Queued', 'queued');
    expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(1);
  });

  it('rechecks a queue removal race and cancels the now executing turn', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.setStage('queued');
    await f.adapter.send('ideal-full', session.id, 'Racing', 'racing');
    const remote = createHarnessRpc();
    vi.stubGlobal('fetch', async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      return Response.json({ rpcId: request.rpcId, result: { ok: false, error: { code: 'queue-item-not-found' } } });
    });
    const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string) => {
      if (method === 'session.updateQueue') {
        f.claim();
        return remote(method, payload, rpcId);
      }
      return f.rpc(method, payload, rpcId);
    };
    const stopped = await createTeachBuddyRuntime({ root: f.root, rpc }).cancel('ideal-full', session.id);
    expect(stopped.status).toBe('stopped');
    expect(stopped.events.filter(event => event.kind === 'teacher_message')).toHaveLength(1);
    expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(1);
  });

  it('recovers a lost cancellation response from persisted intent and terminal facts', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    await f.adapter.send('ideal-full', session.id, 'Stop me', 'stop-me');
    f.append('assistant/chunk', { turn: 1, step: 1, chunk: { type: 'text-delta', index: 0, text: 'Partial answer' } });
    const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string) => {
      const response = await f.rpc(method, payload, rpcId);
      if (method === 'session.cancel') throw new Error('lost response');
      return response;
    };
    await expect(createTeachBuddyRuntime({ root: f.root, rpc }).cancel('ideal-full', session.id)).rejects.toThrow('lost response');
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc });
    await restarted.maintain();
    const restored = (await restarted.list('ideal-full'))[0];
    expect(restored?.status).toBe('stopped');
    expect(restored?.events).toContainEqual(expect.objectContaining({ summary: 'Partial answer', state: 'stopped' }));
    expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(1);
    const calls = f.calls.length;
    await restarted.maintain();
    expect(f.calls).toHaveLength(calls);
  });

  it('keeps cancellation admission running until the official turn end arrives', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    await f.adapter.send('ideal-full', session.id, 'Slow stop', 'slow-stop');
    const rpc = async (method: string, payload: Record<string, unknown>, rpcId?: string) =>
      method === 'session.cancel' ? { accepted: true } : f.rpc(method, payload, rpcId);
    const adapter = createTeachBuddyRuntime({ root: f.root, rpc });
    expect((await adapter.cancel('ideal-full', session.id)).status).toBe('running');
    f.finish('aborted');
    await adapter.maintain();
    expect((await adapter.list('ideal-full'))[0]?.status).toBe('stopped');
  });

  it('reconciles a cold interrupted turn before step entry without resubmitting its lost prompt', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.setStage('claimed'); f.loseResponse();
    await f.adapter.send('ideal-full', session.id, 'Interrupted', 'interrupted');
    // session-persistence.inspect supplies this cold-recovery closer without attaching an agent.
    f.finish('interrupted');
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    await restarted.maintain();
    const restored = await restarted.send('ideal-full', session.id, 'Interrupted', 'interrupted');
    expect(restored.status).toBe('stopped');
    expect(restored.events).toContainEqual(expect.objectContaining({ summary: 'Interrupted', state: 'cancelled' }));
    expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(1);
    expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(0);
  });

  it('bounds background reconciliation for an entirely unobserved prompt but never authorizes replay', async () => {
    vi.useFakeTimers();
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.setStage('unknown');
    await f.adapter.send('ideal-full', session.id, 'Unknown', 'unknown');
    const stop = maintainRuntime(f.adapter);
    try {
      await vi.advanceTimersByTimeAsync(RUN_WINDOW);
      const calls = f.calls.length;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(f.calls).toHaveLength(calls);
      expect(f.calls.filter(call => call.method === 'session.cancel')).toHaveLength(0);
      const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
      expect((await restarted.send('ideal-full', session.id, 'Unknown', 'unknown')).status).toBe('failed');
      await expect(restarted.send('ideal-full', session.id, 'Another', 'another')).rejects.toThrow('尚未确认');
      expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(1);
    } finally { stop(); }
  });

  it('does not keep polling a terminal model failure', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    await f.adapter.send('ideal-full', session.id, 'Fail', 'fail');
    f.finish('error');
    await f.adapter.maintain();
    expect((await f.adapter.list('ideal-full'))[0]?.status).toBe('failed');
    const calls = f.calls.length;
    await f.adapter.maintain();
    expect(f.calls).toHaveLength(calls);
  });

  it('continues maintaining valid sessions when another stored JSON file is corrupt', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.loseResponse();
    await f.adapter.send('ideal-full', session.id, 'Still running', 'running');
    writeFileSync(join(f.root, 'sessions', 'aaa-corrupt.json'), '{');
    await f.adapter.maintain();
    expect((await f.adapter.list('ideal-full'))[0]?.status).toBe('running');
  });

  it('finds an old durable admission beyond the first page when reconciling a lost response', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    f.loseResponse();
    await f.adapter.send('ideal-full', session.id, 'First', 'first');
    f.finish();
    const boundary = f.events.length;
    for (let i = 0; i < 100; i++) f.append('user/message', {
      id: `later-${i}`, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Later' }],
    });
    const rpc = (method: string, payload: Record<string, unknown>, rpcId?: string): Promise<unknown> => {
      if (method !== 'session.history') return f.rpc(method, payload, rpcId);
      return Promise.resolve(payload.beforeSeq === undefined
        ? { events: f.events.slice(boundary), hasMore: true }
        : { events: f.events.slice(0, boundary), hasMore: false });
    };
    const read = await createTeachBuddyRuntime({ root: f.root, rpc }).read('ideal-full', session.id);
    expect(read.status).toBe('idle');
    expect(read.error).toBeUndefined();
    expect(read.events.filter(event => event.kind === 'teacher_message')).toHaveLength(101);
    expect(read.events.filter(event => event.summary === 'First')).toHaveLength(1);
  });

  it('rejects a non-progressing history page without overwriting the durable snapshot', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    await f.adapter.send('ideal-full', session.id, 'Preserve', 'preserve');
    await f.adapter.read('ideal-full', session.id);
    const path = join(f.root, 'sessions', `${session.id}.json`);
    const before = readFileSync(path, 'utf8');
    const rpc = (method: string, payload: Record<string, unknown>, rpcId?: string) => method === 'session.history'
      ? Promise.resolve({ events: f.events.slice(2), hasMore: true }) : f.rpc(method, payload, rpcId);
    await expect(createTeachBuddyRuntime({ root: f.root, rpc }).read('ideal-full', session.id)).rejects.toThrow('分页');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('serializes simultaneous duplicate commands and does not replay them after restart', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    await Promise.all([
      f.adapter.send('ideal-full', session.id, 'Once', 'once'),
      f.adapter.send('ideal-full', session.id, 'Once', 'once'),
    ]);
    const restarted = createTeachBuddyRuntime({ root: f.root, rpc: f.rpc });
    await restarted.send('ideal-full', session.id, 'Once', 'once');
    expect(f.calls.filter(call => call.method === 'session.prompt')).toHaveLength(1);
  });

  it('saves only the reviewed artifact version with durable approval and an idempotent receipt', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    const directory = join(f.root, 'artifacts', session.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'draft-1.json'), JSON.stringify({ id: 'draft-1', title: '教案', content: '# 实际生成的教案', version: 1 }));
    const read = await f.adapter.read('ideal-full', session.id);
    expect(read.artifacts[0]?.status).toBe('draft');
    expect(read.artifacts[0]?.fileRef).toMatch(/^sf-[a-f0-9]{40}$/);
    expect(read.artifacts[0]?.fileName).toBe('教案.md');
    expect((await f.adapter.files.list('ideal-full', [{ sessionId: session.id, sessionTitle: read.title }]))[0]?.files).toHaveLength(1);
    await expect(f.adapter.approve('ideal-full', session.id, 'draft-1', 2, 'approval-1')).rejects.toThrow('版本');
    const saved = await f.adapter.approve('ideal-full', session.id, 'draft-1', 1, 'approval-1');
    expect(saved.artifacts[0]?.status).toBe('saved');
    expect(saved.artifacts[0]?.receipt?.id).toBe('approval-1');
    const repeat = await f.adapter.approve('ideal-full', session.id, 'draft-1', 1, 'approval-2');
    expect(repeat.artifacts[0]?.receipt?.id).toBe('approval-1');
    const savedDir = join(f.root, 'saved', 'ideal-full', session.id);
    expect(readdirSync(savedDir)).toEqual(['draft-1.json']);
    const persisted = JSON.parse(readFileSync(join(savedDir, 'draft-1.json'), 'utf8'));
    expect(persisted.approval.decision).toBe('approved');
    expect(persisted.receipt.truthLabel).toBe('local-runtime');
    expect((await createTeachBuddyRuntime({ root: f.root, rpc: f.rpc }).read('ideal-full', session.id)).artifacts[0]?.status).toBe('saved');
    expect((await f.adapter.files.list('ideal-full', []))[0]?.files[0]?.status).toBe('saved');
  });

  it('serves scoped file metadata, preview content and attachment downloads', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    const directory = join(f.root, 'artifacts', session.id);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'html-1.json'), JSON.stringify({
      id: 'html-1', title: '互动练习', fileName: '互动练习.html', format: 'html',
      mediaType: 'text/html; charset=utf-8', content: '<h1>互动练习</h1>', byteSize: 24, version: 1,
    }));
    await f.adapter.read('ideal-full', session.id);
    const middleware = runtimeMiddleware(f.adapter);
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing port');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const catalogResponse = await fetch(`${base}/api/teachbuddy/files?scope=ideal-full`);
      const catalog = await catalogResponse.json() as SessionFileGroup[];
      const file = catalog[0].files[0];
      expect(file).toMatchObject({ sessionId: session.id, name: '互动练习.html', format: 'html' });
      const preview = await (await fetch(`${base}/api/teachbuddy/files/${file.id}?scope=ideal-full`)).json() as SessionFileContent;
      expect(preview.content).toBe('<h1>互动练习</h1>');
      const download = await fetch(`${base}/api/teachbuddy/files/${file.id}/download?scope=ideal-full`);
      expect(download.headers.get('content-disposition')).toContain("filename*=UTF-8''");
      expect(download.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await download.text()).toBe('<h1>互动练习</h1>');
      expect((await fetch(`${base}/api/teachbuddy/files/${file.id}?scope=standalone-teacher`)).status).toBe(404);
    } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  });

  it('serves only the validated local private IM projection in the ideal scope', async () => {
    const f = fixture();
    const directory = join(f.root, 'private');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'im-demo-context.json'), JSON.stringify({
      version: 'private-v1', capturedAt: '2026-09-08T00:00:00.000Z', dataWindow: 'T-1',
      truthLabel: 'read-only-business-data', source: 'dw-hunter-local',
      thread: {
        id: 'class-dw-expression-lab', classId: 'dw-expression-lab', title: '本机教学群', subtitle: '本机快照', avatar: '教',
        updatedAt: '2026-09-07T12:00:00.000Z', memberCount: 21,
        entries: [{ id: 'private-1', authorRole: 'teacher', authorName: '教师别名', body: '真实消息正文', sentAt: '2026-09-07T12:00:00.000Z', kind: 'text' }],
      },
      context: { courseType: 1, courseStatus: 1, classCount: 0, messageCount: 1, activeSenderCount: 1, teachingTopics: ['作文习作'], interactionPatterns: ['教师布置作业'], evidenceBoundary: '没有结构化评分时不生成个人诊断。' },
    }));
    const middleware = runtimeMiddleware(f.adapter);
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing port');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const response = await fetch(`${base}/api/teachbuddy/im-demo-context?scope=ideal-full`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ truthLabel: 'read-only-business-data', thread: { title: '本机教学群' } });
      expect((await fetch(`${base}/api/teachbuddy/im-demo-context?scope=classin-mvp`)).status).toBe(404);
    } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  });

  it('enforces JSON and same-origin at the HTTP carrier', async () => {
    const f = fixture();
    const middleware = runtimeMiddleware(f.adapter);
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing port');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const cross = await fetch(`${base}/api/teachbuddy/sessions`, { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{"scope":"ideal-full"}' });
      expect(cross.status).toBe(403);
      const simple = await fetch(`${base}/api/teachbuddy/sessions`, { method: 'POST', body: '{"scope":"ideal-full"}' });
      expect(simple.status).toBe(415);
      const valid = await fetch(`${base}/api/teachbuddy/sessions`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{"scope":"ideal-full"}' });
      expect(valid.status).toBe(200);
      const unsafe = await fetch(`${base}/api/teachbuddy/host.pickDirectory?scope=ideal-full`);
      expect(unsafe.status).toBe(404);
    } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
  });

  it('decodes a Chinese UTF-8 character split between HTTP body chunks without replacement', async () => {
    const f = fixture(); const session = await f.adapter.create('ideal-full');
    const middleware = runtimeMiddleware(f.adapter);
    const firstChunk = deferred<void>();
    const server = createServer((request, response) => {
      request.once('data', () => firstChunk.resolve());
      middleware(request, response, () => { response.writeHead(404); response.end(); });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing port');
    const body = Buffer.from(JSON.stringify({ scope: 'ideal-full', text: '中文教学', commandId: 'utf8' }));
    const split = body.indexOf(Buffer.from('中')) + 1;
    const received = deferred<number>();
    const request = httpRequest({
      hostname: '127.0.0.1', port: address.port, path: `/api/teachbuddy/sessions/${session.id}/messages`,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    }, response => {
      response.resume();
      response.on('end', () => received.resolve(response.statusCode ?? 0));
      response.on('error', received.reject);
    });
    request.on('error', error => { received.reject(error); firstChunk.reject(error); });
    try {
      request.write(body.subarray(0, split));
      await firstChunk.promise;
      request.end(body.subarray(split));
      expect(await received.promise).toBe(200);
      expect(f.calls.find(call => call.method === 'session.prompt')?.payload.content).toEqual([{ type: 'text', text: '中文教学' }]);
    } finally {
      request.destroy();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
});
