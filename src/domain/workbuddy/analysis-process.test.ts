import { describe, expect, it } from 'vitest';
import type { ConversationRunEvent } from '@contracts/workbuddy/conversation-run';
import { projectAnalysisProcess, splitAnalysisProcessTurns } from './analysis-process';

function event(overrides: Partial<ConversationRunEvent> = {}): ConversationRunEvent {
  return {
    id: 'event-1', runRef: 'session-1', sequence: 1,
    occurredAt: '2026-09-08T10:00:00.000Z', updatedAt: '2026-09-08T10:00:01.000Z',
    actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '您', summary: '请整理课堂反馈', objectRefs: [], allowedCommands: [],
    ...overrides,
  };
}

describe('projectAnalysisProcess', () => {
  it('uses actual events and time while waiting for the first runtime event', () => {
    const projection = projectAnalysisProcess({
      session: { id: 'session-1', status: 'running', events: [event()] },
      now: Date.parse('2026-09-08T10:00:05.000Z'),
    });
    expect(projection).toMatchObject({ status: 'running', elapsedMs: 5000, defaultExpanded: true });
    expect(projection?.steps.map(({ label, state }) => ({ label, state }))).toEqual([
      { label: '已接收要求', state: 'completed' },
      { label: '正在理解你的要求', state: 'running' },
    ]);
  });

  it('projects governed context and capability evidence without inventing model reasoning', () => {
    const projection = projectAnalysisProcess({
      session: { id: 'session-1', status: 'running', events: [
        event(),
        event({ id: 'tool-1', sequence: 2, actor: 'tool', kind: 'capability_call', state: 'running', title: '教学文稿工具', summary: '正在创建文稿', objectRefs: [{ type: 'capability', id: 'draft-tool' }], detail: {
          capabilityLabel: '教学文稿工具', purpose: '把当前回答形成可审阅文稿', inputSummary: '课堂反馈要求', outputSummary: '', elapsedLabel: '', contextLabels: ['当前群聊'], excludedSensitiveCount: 2,
        } }),
      ] },
      now: Date.parse('2026-09-08T10:00:05.000Z'),
      context: { snapshotRef: 'ctx-1', label: '已核对当前会话上下文', summary: '最近 6 条消息，数据截至 9 月 8 日', evidenceLabels: ['当前教学群', '最近消息 6 条'], excludedSensitiveCount: 1 },
    });
    expect(projection?.steps.map(({ label }) => label)).toEqual(['已接收要求', '已核对当前会话上下文', '教学文稿工具']);
    expect(projection?.steps[2]).toMatchObject({ state: 'running', evidenceLabels: ['当前群聊', 'capability'] });
    expect(projection?.steps[2]?.detailLines).toContain('已排除 2 项敏感信息');
  });

  it('freezes elapsed time and collapses after completion', () => {
    const projection = projectAnalysisProcess({
      session: { id: 'session-1', status: 'idle', events: [
        event(),
        event({ id: 'agent-1', sequence: 2, actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary: '完整回答', occurredAt: '2026-09-08T10:00:03.000Z', updatedAt: '2026-09-08T10:00:08.000Z' }),
      ] },
      now: Date.parse('2026-09-08T12:00:00.000Z'),
    });
    expect(projection).toMatchObject({ status: 'completed', elapsedMs: 8000, defaultExpanded: false });
    expect(projection?.steps[1]).toMatchObject({ label: '回答已生成', summary: 'TeachBuddy 已形成当前轮次的回答。' });
  });

  it.each([
    ['failed', 'failed'],
    ['stopped', 'stopped'],
  ] as const)('preserves %s terminal state', (sessionStatus, projectedStatus) => {
    const projection = projectAnalysisProcess({ session: { id: 'session-1', status: sessionStatus, events: [event()] } });
    expect(projection?.status).toBe(projectedStatus);
  });

  it('keeps one auditable process per teacher turn', () => {
    const turns = splitAnalysisProcessTurns([
      event(),
      event({ id: 'agent-1', sequence: 2, actor: 'agent', kind: 'process' }),
      event({ id: 'teacher-2', sequence: 3, summary: '第二轮要求' }),
      event({ id: 'agent-2', sequence: 4, actor: 'agent', kind: 'process' }),
    ]);
    expect(turns.map(({ id, events }) => ({ id, count: events.length }))).toEqual([
      { id: 'event-1', count: 2 },
      { id: 'teacher-2', count: 2 },
    ]);
  });
});
