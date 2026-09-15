// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { projectHarnessEvents } from './harness-event-projection.ts';

// Fixtures follow vendor/deepseek-harness at b150a551:
// packages/core/session/src/types.ts (SessionEventMap),
// packages/llm/llm/src/{types,message,assembler}.ts (StreamChunk and message blocks),
// packages/host/apiproxy/src/api-proxy.ts (session.history wrappers).
const SESSION = 'session-fixture';
const TIME = Date.UTC(2026, 8, 4);
const text = (value: string) => ({ type: 'text', text: value });
const event = (seq: number, type: string, data: unknown) => ({
  event: { seq, time: TIME + seq * 100, type, data },
});
const chunk = (seq: number, value: unknown, turn = 1, step = 1) =>
  event(seq, 'assistant/chunk', { turn, step, chunk: value });
const assistant = (seq: number, content: unknown[], turn = 1, step = 1, interrupted = false) => ({
  event: {
    ...event(seq, 'assistant/message', {
      turn, step,
      message: { id: `message-${seq}`, role: 'assistant', source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' }, content },
      ...(interrupted ? { interrupted: true } : {}),
    }).event,
    surfaceOp: 'append', sourceEventSeqs: [seq - 1],
  },
});
const end = (seq: number, reason: unknown, turn = 1) => event(seq, 'turn/end', { turn, reason });
const call = (seq: number, callId: string, turn = 1, step = 1) => event(seq, 'tool/call', {
  turn, step, callId, name: 'create_teaching_draft', arguments: '{"title":"Lesson"}',
});
const result = (seq: number, callId: string, isError = false, turn = 1, step = 1) => event(seq, 'tool/result', {
  turn, step,
  message: {
    id: `result-${seq}`, role: 'user', source: { kind: 'tool', callId },
    content: [{ type: 'tool-result', toolCallId: callId, content: [text('Draft created')], isError }],
  },
});
const project = (entries: unknown[]) => projectHarnessEvents(SESSION, entries);

describe('projectHarnessEvents', () => {
  it('keeps image-only teacher messages visible without exposing attachment ids', () => {
    const projection = projectHarnessEvents('session-image', [event(1, 'user/message', {
      id: 'message-image', role: 'user', source: { kind: 'user' },
      content: [{ type: 'image', attachment: { attachmentId: 'secret-ref', name: '课堂板书.png', mediaType: 'image/png' } }],
    })]);
    expect(projection.events).toContainEqual(expect.objectContaining({ kind: 'teacher_message', summary: '已附 1 张图片（课堂板书.png）' }));
    expect(JSON.stringify(projection)).not.toContain('secret-ref');
  });
  it('projects only human-source user text and ignores synthetic context, raw views and reasoning', () => {
    const human = event(2, 'user/message', {
      id: 'human-1', role: 'user', source: { kind: 'user' },
      content: [text('Design '), { type: 'image', attachment: { path: 'private' } }, text('a lesson')],
    });
    const projected = project([
      event(0, 'request/header', { header: { system: 'PRIVATE SYSTEM' } }),
      event(1, 'user/message', {
        role: 'user', source: { kind: 'plugin', plugin: 'context', form: 'instructions' }, content: [text('PRIVATE CONTEXT')],
      }),
      { ...human, view: { text: 'PRIVATE VIEW', reasoning: 'PRIVATE REASONING' } },
      event(3, 'user/message', { role: 'user', content: [text('MISSING SOURCE')] }),
      event(4, 'user/message', { role: 'system', source: { kind: 'user' }, content: [text('SYSTEM')] }),
      event(5, 'user/message', { role: 'user', source: { kind: 'goal' }, content: [text('CONTINUATION')] }),
      chunk(6, { type: 'reasoning-delta', index: 0, text: 'PRIVATE REASONING' }),
      assistant(7, [{ type: 'reasoning', text: 'PRIVATE REASONING' }]),
    ]);
    expect(projected.events).toEqual([{
      id: `${SESSION}:user:human-1`, runRef: SESSION, sequence: 2,
      occurredAt: new Date(TIME + 200).toISOString(), updatedAt: new Date(TIME + 200).toISOString(),
      actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: 'Design a lesson',
      objectRefs: [], allowedCommands: [],
    }]);
    expect(JSON.stringify(projected)).not.toMatch(/PRIVATE|CONTINUATION|SYSTEM|MISSING SOURCE/);
  });

  it('replaces streamed blocks and partial messages with the final text under one stable identity', () => {
    const entries = [
      event(0, 'turn/start', { turn: 1 }), event(1, 'step/start', { turn: 1, step: 1 }),
      chunk(2, { type: 'block-start', index: 0, blockType: 'reasoning' }),
      chunk(3, { type: 'reasoning-delta', index: 0, text: 'Hidden' }),
      chunk(4, { type: 'block-start', index: 1, blockType: 'text' }),
      chunk(5, { type: 'text-delta', index: 1, text: 'Hello' }),
      chunk(6, { type: 'text-delta', index: 1, text: ' wor' }),
    ];
    const partial = project(entries);
    expect(partial.status).toBe('running');
    expect(partial.events).toHaveLength(1);
    expect(partial.events[0]).toMatchObject({ summary: 'Hello wor', state: 'running' });
    entries.push(chunk(7, { type: 'block-end', index: 1, block: text('Hello world') }));
    expect(project(entries).events[0]?.summary).toBe('Hello world');
    const complete = project([
      ...entries,
      chunk(8, { type: 'usage', usage: { inputTokens: 10, outputTokens: 20 } }),
      chunk(9, { type: 'finish', reason: { kind: 'stop' }, replayState: { response: 'private' } }),
      assistant(10, [{ type: 'reasoning', text: 'Hidden' }, text('Hello world!')]),
      end(11, { kind: 'completed' }),
    ]);
    expect(complete.status).toBe('idle');
    expect(complete.events).toHaveLength(1);
    expect(complete.events[0]).toMatchObject({
      id: partial.events[0]?.id, occurredAt: partial.events[0]?.occurredAt, sequence: 5,
      updatedAt: new Date(TIME + 1000).toISOString(), summary: 'Hello world!', state: 'completed',
    });
    expect(JSON.stringify(complete)).not.toMatch(/Hidden|private/);
  });

  it('assembles interleaved blocks in first-seen order and ignores deltas after a block closes', () => {
    const projected = project([
      chunk(0, { type: 'block-start', index: 8, blockType: 'text' }),
      chunk(1, { type: 'text-delta', index: 3, text: 'B' }),
      chunk(2, { type: 'text-delta', index: 8, text: 'a' }),
      chunk(3, { type: 'block-end', index: 8, block: text('A') }),
      chunk(4, { type: 'text-delta', index: 8, text: 'LATE' }),
      chunk(5, { type: 'block-end', index: 8, block: text('LATE CLOSE') }),
      chunk(6, { type: 'block-start', index: 9, blockType: 'reasoning' }),
      chunk(7, { type: 'text-delta', index: 9, text: 'MALFORMED REASONING' }),
      chunk(8, { type: 'block-end', index: 9, block: { type: 'reasoning', text: 'HIDDEN' } }),
    ]);
    expect(projected.events).toHaveLength(1);
    expect(projected.events[0]?.summary).toBe('AB');
  });

  it('keeps distinct steps and turns even when their text and tool call IDs are identical', () => {
    const projected = project([
      assistant(0, [text('Same')]), call(1, 'reused'), result(2, 'reused'),
      assistant(3, [text('Same')], 1, 2), call(4, 'reused', 1, 2), result(5, 'reused', false, 1, 2),
      end(6, { kind: 'completed' }),
      event(7, 'turn/start', { turn: 2 }), assistant(8, [text('Same')], 2),
      call(9, 'reused', 2), result(10, 'reused', false, 2), end(11, { kind: 'completed' }, 2),
    ]);
    expect(projected.events.filter(row => row.actor === 'agent')).toHaveLength(3);
    expect(projected.events.filter(row => row.kind === 'capability_call')).toHaveLength(3);
    expect(new Set(projected.events.map(row => row.id)).size).toBe(6);
    expect(projected.status).toBe('idle');
  });

  it('does not render speculative tool-call chunks or final tool blocks as executed capabilities', () => {
    expect(project([
      chunk(0, { type: 'tool-call-delta', index: 0, id: 'call-1', name: 'create_teaching_draft', argumentsDelta: '{' }),
      chunk(1, { type: 'block-end', index: 0, block: { type: 'tool-call', id: 'call-1', name: 'create_teaching_draft', arguments: '{}' } }),
      assistant(2, [{ type: 'tool-call', id: 'call-1', name: 'create_teaching_draft', arguments: '{}' }]),
    ]).events).toEqual([]);
  });

  it('merges parallel tool results by call ID, retaining actual capability names and original positions', () => {
    const entries = [event(0, 'turn/start', { turn: 1 }), call(1, 'a'), call(2, 'b')];
    const running = project(entries).events;
    expect(running.map(row => row.state)).toEqual(['running', 'running']);
    const projected = project([...entries, result(3, 'b'), result(4, 'a', true), end(5, { kind: 'completed' })]);
    expect(projected.events).toHaveLength(2);
    expect(projected.events[0]).toMatchObject({
      id: running[0]?.id, sequence: 1, kind: 'capability_call', actor: 'tool',
      title: '生成教学文稿', state: 'failed', summary: '工具执行失败，请重试。',
      objectRefs: [{ type: 'capability', id: 'create_teaching_draft' }],
    });
    expect(projected.events[1]).toMatchObject({ id: running[1]?.id, sequence: 2, state: 'completed', summary: '教学文稿已生成，等待审阅。' });
    expect(projected.status).toBe('idle');
  });

  it.each([false, true])('preserves cancelled partial text with an interrupted final message: %s', (withFinal) => {
    const projected = project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'text-delta', index: 0, text: 'Partial answer' }),
      ...(withFinal ? [assistant(2, [text('Partial answer'), { type: 'reasoning', text: 'HIDDEN' }], 1, 1, true)] : []),
      end(3, { kind: 'aborted', reason: { kind: 'user' } }),
    ]);
    expect(projected.status).toBe('stopped');
    expect(projected).not.toHaveProperty('error');
    expect(projected.events).toHaveLength(1);
    expect(projected.events[0]).toMatchObject({ summary: 'Partial answer', state: 'stopped' });
  });

  it('stops pending tools without changing already completed work on cancellation', () => {
    const projected = project([
      assistant(0, [text('Preparing')]), call(1, 'a'), result(2, 'a'), call(3, 'b'),
      end(4, { kind: 'aborted', reason: { kind: 'parent' } }),
    ]);
    expect(projected.events.map(row => row.state)).toEqual(['completed', 'completed', 'stopped']);
    expect(projected.status).toBe('stopped');
  });

  it.each(['completed', 'aborted', 'blocked', 'max-tokens', 'interrupted', 'error'])('handles the official turn end reason %s without requiring output', kind => {
    const projected = project([event(0, 'turn/start', { turn: 1 }), end(1, {
      kind, reason: { kind: 'user' }, error: { code: 'UNKNOWN', message: 'PRIVATE FAILURE' },
    })]);
    expect(projected.status).toBe(kind === 'completed' ? 'idle' : (kind === 'error' || kind === 'max-tokens') ? 'failed' : 'stopped');
    expect(JSON.stringify(projected)).not.toContain('PRIVATE FAILURE');
  });

  it.each(['stop', 'tool-calls', 'max-tokens'])('does not treat the model finish %s as a completed turn', kind => {
    expect(project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'text-delta', index: 0, text: 'Response' }),
      chunk(2, { type: 'finish', reason: { kind } }),
    ]).status).toBe('running');
  });

  it('redacts both provider failure channels and deduplicates the error while retaining the delivered prefix', () => {
    const failure = { code: 'SECRET-CODE', message: 'Bearer TEST-SECRET /private/internal.ts https://internal.invalid', requestId: 'PRIVATE-ID', status: 500 };
    const entries = [
      event(0, 'turn/start', { turn: 1 }), chunk(1, { type: 'text-delta', index: 0, text: 'Delivered prefix' }),
      chunk(2, { type: 'finish', reason: { kind: 'error', failure } }),
    ];
    expect(project(entries).status).toBe('failed');
    const projected = project([...entries, end(3, { kind: 'error', error: failure })]);
    expect(projected.status).toBe('failed');
    expect(projected.error).toBe('生成未能完成，请稍后重试。');
    expect(projected.events.filter(row => row.kind === 'error')).toHaveLength(1);
    expect(projected.events[0]).toMatchObject({ summary: 'Delivered prefix', state: 'failed' });
    expect(JSON.stringify(projected)).not.toMatch(/SECRET|Bearer|private|internal|PRIVATE-ID/);
    const resumed = project([...entries, end(3, { kind: 'error', error: failure }), event(4, 'turn/start', { turn: 2 })]);
    expect(resumed.status).toBe('running');
    expect(resumed).not.toHaveProperty('error');
    expect(resumed.events.filter(row => row.kind === 'error')).toHaveLength(1);
  });

  it('classifies exhausted model context so the next submit can recover', () => {
    const failure = { code: 'CONTEXT_WINDOW_EXCEEDED', message: 'pi-ai detected context overflow for model PRIVATE' };
    const projected = project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'finish', reason: { kind: 'error', failure } }),
      end(2, { kind: 'error', error: failure }),
    ]);
    expect(projected.failureCode).toBe('context-window-exceeded');
    expect(projected.error).toContain('历史消息仍保留');
    expect(JSON.stringify(projected)).not.toContain('PRIVATE');
  });

  it('reports model transport failure without exposing provider details', () => {
    const failure = { code: 'TRANSPORT', message: 'Connection error. Bearer PRIVATE-KEY http://private.invalid' };
    const projected = project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'finish', reason: { kind: 'error', failure } }),
      end(2, { kind: 'error', error: failure }),
    ]);
    expect(projected.status).toBe('failed');
    expect(projected.error).toBe('AI 服务连接失败，请检查服务连接后重试。已输入的内容和历史消息仍保留。');
    expect(JSON.stringify(projected)).not.toMatch(/PRIVATE|Bearer|private/);
  });

  it('turns a vision permission rejection into a safe recovery instruction', () => {
    const projected = project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'finish', reason: { kind: 'error', failure: {
        code: 'AUTH', status: 403, message: 'key not allowed to access model deepseek-v4-flash-vision-exp',
      } } }),
    ]);
    expect(projected.error).toBe('当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。');
    expect(projected.failureCode).toBe('vision-permission');
    expect(JSON.stringify(projected)).not.toContain('deepseek-v4-flash-vision-exp');
    const resumed = project([
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'finish', reason: { kind: 'error', failure: {
        code: 'AUTH', status: 403, message: 'key not allowed to access model deepseek-v4-flash-vision-exp',
      } } }),
      event(2, 'turn/start', { turn: 2 }),
    ]);
    expect(resumed).not.toHaveProperty('failureCode');
  });

  it('redacts failed tool result content, error metadata and custom views', () => {
    const projected = project([
      call(0, 'a'),
      { ...event(1, 'tool/result', {
        turn: 1, step: 1, error: { name: 'SECRET-NAME', code: 'SECRET-CODE' }, meta: { secret: 'PRIVATE META' },
        message: {
          id: 'tool-message', role: 'user', source: { kind: 'tool', callId: 'a' },
          content: [{ type: 'tool-result', toolCallId: 'a', content: [text('SECRET FAILURE')], isError: false }],
        },
      }), view: { title: 'SECRET VIEW' } },
    ]);
    expect(projected.events[0]).toMatchObject({ state: 'failed', summary: '工具执行失败，请重试。' });
    expect(JSON.stringify(projected)).not.toMatch(/SECRET|PRIVATE/);
  });

  it.each([
    ['create_teaching_draft', '生成教学文稿', '教学文稿已生成，等待审阅。'],
    ['internal_tool_v2', '执行任务', '任务已完成。'],
  ])('uses product copy for %s and keeps raw tool content out of the timeline', (name, title, summary) => {
    const dispatched = event(0, 'tool/call', { turn: 1, step: 1, callId: 'a', name, arguments: '{"internal":"PRIVATE"}' });
    expect(project([dispatched]).events[0]).toMatchObject({ title, state: 'running', objectRefs: [{ type: 'capability', id: name }] });
    const projected = project([
      dispatched,
      event(1, 'tool/result', {
        turn: 1, step: 1,
        message: {
          id: 'tool-message', role: 'user', source: { kind: 'tool', callId: 'a' },
          content: [{ type: 'tool-result', toolCallId: 'a', isError: false,
            content: [text(JSON.stringify({ content: 'HUGE CONTENT '.repeat(10_000), internal: 'PRIVATE' }))] }],
        },
      }),
    ]);
    expect(projected.events[0]).toMatchObject({ title, summary, state: 'completed', objectRefs: [{ type: 'capability', id: name }] });
    expect(JSON.stringify(projected)).not.toMatch(/HUGE CONTENT|PRIVATE/);
  });

  it.each(['error', 'aborted'])('recovers a same-step provider %s retry without concatenating the failed attempt', kind => {
    // agent-loop/src/agent.ts retries inside step(), creating a fresh BlockAssembler.
    const entries = [
      event(0, 'turn/start', { turn: 1 }),
      chunk(1, { type: 'text-delta', index: 0, text: 'Failed attempt' }),
      chunk(2, { type: 'finish', reason: { kind, failure: { code: 'UNKNOWN', message: 'PRIVATE' } } }),
    ];
    expect(project(entries)).toMatchObject({ status: 'failed', error: '生成未能完成，请稍后重试。' });
    const retry = [
      ...entries,
      chunk(3, { type: 'block-start', index: 0, blockType: 'reasoning' }),
      chunk(4, { type: 'reasoning-delta', index: 0, text: 'HIDDEN' }),
    ];
    expect(project(retry)).toEqual({ events: [], status: 'running' });
    retry.push(chunk(5, { type: 'text-delta', index: 1, text: 'Successful retry' }));
    expect(project(retry)).toMatchObject({ status: 'running', events: [{ summary: 'Successful retry', state: 'running' }] });
    const completed = project([...retry, assistant(6, [text('Successful retry')]), end(7, { kind: 'completed' })]);
    expect(completed.status).toBe('idle');
    expect(completed).not.toHaveProperty('error');
    expect(completed.events).toHaveLength(1);
    expect(completed.events[0]).toMatchObject({ id: project(entries).events[0]?.id, summary: 'Successful retry', state: 'completed' });
  });

  it('treats an empty final message as authoritative and ignores late deltas', () => {
    const projected = project([
      chunk(0, { type: 'text-delta', index: 0, text: 'Discarded partial' }),
      assistant(1, []), chunk(2, { type: 'text-delta', index: 0, text: 'Late delta' }), end(3, { kind: 'completed' }),
    ]);
    expect(projected).toEqual({ events: [], status: 'idle' });
  });

  it('sorts and deduplicates overlapping history without mutating input or changing replay identities', () => {
    const first = chunk(1, { type: 'text-delta', index: 0, text: 'A' });
    const second = chunk(2, { type: 'text-delta', index: 0, text: 'B' });
    const entries = [second, first, structuredClone(first)];
    const before = structuredClone(entries);
    const projected = project(entries);
    expect(projected.events).toHaveLength(1);
    expect(projected.events[0]?.summary).toBe('AB');
    expect(project(entries)).toEqual(projected);
    expect(entries).toEqual(before);
    projected.events.length = 0;
    expect(project(entries).events).toHaveLength(1);
    expect(projectHarnessEvents('other-session', entries).events[0]?.id).not.toBe(project(entries).events[0]?.id);
  });

  it('ignores malformed unknown values and unsupported events without inventing status or throwing', () => {
    const invalid: unknown[] = [null, undefined, false, 0, 'raw', [], {}, { event: null },
      event(0, 'unknown/plugin', { anything: 'private' }),
      event(1, 'turn/end', { turn: 1, reason: 'completed' }),
      event(2, 'turn/end', { turn: 1, reason: { kind: 'future' } }),
      event(3, 'assistant/chunk', { turn: -1, step: 1, chunk: text('bad') }),
      chunk(4, { type: 'text-delta', index: 0, text: {} }),
      chunk(5, { type: 'text-delta', index: Number.NaN, text: 'bad' }),
      event(6, 'assistant/message', { turn: 1, step: 1, message: null }),
      event(7, 'tool/call', { turn: 1, step: 1, callId: {}, name: [] }),
      result(8, 'orphan'), event(9, 'tool/result', { turn: 1, step: 1, message: [] }),
      event(10, 'user/message', { role: 'user', source: { kind: 'user' }, content: [null, false, {}, { type: 'text', text: 42 }] }),
      { event: { seq: 11, time: 9e15, type: 'turn/start', data: { turn: 1 } } },
      { event: { seq: -1, time: TIME, type: 'turn/start', data: { turn: 1 } } },
      { event: { seq: 12, time: 'today', type: 'turn/start', data: { turn: 1 } } },
    ];
    expect(project(invalid)).toEqual({ events: [] });
    expect(project([])).toEqual({ events: [] });
    expect(project([...invalid, assistant(13, [text('Valid')]), end(14, { kind: 'completed' })])).toMatchObject({
      status: 'idle', events: [{ summary: 'Valid' }],
    });
  });
});
