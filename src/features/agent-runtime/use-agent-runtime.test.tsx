import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeAdapter, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { useAgentRuntime } from './use-agent-runtime';

function session(status: RuntimeSession['status'], summary = ''): RuntimeSession {
  return {
    id: 'session-1',
    title: '教学消息',
    status,
    updatedAt: status === 'stopped' ? '2026-09-10T10:00:02.000Z' : '2026-09-10T10:00:01.000Z',
    artifacts: [],
    events: summary ? [{
      id: `event-${summary}`,
      runRef: 'session-1',
      sequence: 1,
      occurredAt: '2026-09-10T10:00:01.000Z',
      updatedAt: '2026-09-10T10:00:01.000Z',
      actor: 'agent',
      kind: 'process',
      state: 'completed',
      title: 'TeachBuddy',
      summary,
      objectRefs: [],
      allowedCommands: [],
    }] : [],
  };
}

describe('useAgentRuntime concurrent cancellation', () => {
  it('lets cancel supersede a pending send and accepts the next request before the stale response settles', async () => {
    let current = session('idle');
    let resolveFirstSend!: (value: RuntimeSession) => void;
    const firstSend = new Promise<RuntimeSession>((resolve) => { resolveFirstSend = resolve; });
    let sendCount = 0;
    const send = vi.fn(async () => {
      sendCount += 1;
      if (sendCount === 1) return firstSend;
      current = session('idle', '第二条要求已完成');
      return current;
    });
    const cancel = vi.fn(async () => {
      current = { ...session('stopped'), error: '生成已停止，你可以继续发送要求。' };
      return current;
    });
    const adapter: AgentRuntimeAdapter = {
      health: async () => ({ status: 'ready', message: 'ready' }),
      list: async () => [current],
      create: async () => current,
      read: async () => current,
      send,
      cancel,
      approve: async () => current,
    };

    const { result } = renderHook(() => useAgentRuntime(adapter, 'ideal-full', 'session-1'));
    await waitFor(() => expect(result.current.session?.status).toBe('idle'));

    let pendingSend!: Promise<boolean>;
    act(() => {
      pendingSend = result.current.execute('session-1', { kind: 'send', text: '第一条要求', commandId: 'send-1' });
    });
    await waitFor(() => expect(result.current.operation).toMatchObject({ status: 'pending', command: { kind: 'send' } }));

    await act(async () => {
      await result.current.execute('session-1', { kind: 'cancel' });
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(result.current.session?.status).toBe('stopped');

    await act(async () => {
      await result.current.execute('session-1', { kind: 'send', text: '第二条要求', commandId: 'send-2' });
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.current.session?.events[0]?.summary).toBe('第二条要求已完成');

    await act(async () => {
      resolveFirstSend(session('idle', '过期的第一条结果'));
      await pendingSend;
    });
    expect(result.current.session?.events[0]?.summary).toBe('第二条要求已完成');
  });

  it('keeps the pending send gated and allows stop to be retried after cancel fails', async () => {
    let current = session('idle');
    let resolveFirstSend!: (value: RuntimeSession) => void;
    const firstSend = new Promise<RuntimeSession>((resolve) => { resolveFirstSend = resolve; });
    const send = vi.fn(async () => firstSend);
    let cancelCount = 0;
    const cancel = vi.fn(async () => {
      cancelCount += 1;
      if (cancelCount === 1) throw new Error('停止请求暂时失败');
      current = { ...session('stopped'), error: '生成已停止，你可以继续发送要求。' };
      return current;
    });
    const adapter: AgentRuntimeAdapter = {
      health: async () => ({ status: 'ready', message: 'ready' }),
      list: async () => [current],
      create: async () => current,
      read: async () => current,
      send,
      cancel,
      approve: async () => current,
    };

    const { result } = renderHook(() => useAgentRuntime(adapter, 'ideal-full', 'session-1'));
    await waitFor(() => expect(result.current.session?.status).toBe('idle'));

    let pendingSend!: Promise<boolean>;
    act(() => {
      pendingSend = result.current.execute('session-1', { kind: 'send', text: '第一条要求', commandId: 'send-1' });
    });
    await waitFor(() => expect(result.current.locked).toBe(true));

    await act(async () => {
      expect(await result.current.execute('session-1', { kind: 'cancel' })).toBe(false);
    });
    expect(result.current.operation).toMatchObject({ status: 'failed', command: { kind: 'cancel' } });
    expect(result.current.locked).toBe(true);

    await act(async () => {
      expect(await result.current.execute('session-1', { kind: 'send', text: '不应并发发送', commandId: 'send-2' })).toBe(false);
      expect(await result.current.execute('session-1', { kind: 'cancel' })).toBe(true);
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(result.current.locked).toBe(false);
    expect(result.current.session?.status).toBe('stopped');

    await act(async () => {
      resolveFirstSend(session('idle', '过期的第一条结果'));
      await pendingSend;
    });
    expect(result.current.session?.status).toBe('stopped');
  });

  it('keeps the send lock when its stale response arrives before a failed cancel settles', async () => {
    let current = session('idle');
    let resolveSend!: (value: RuntimeSession) => void;
    const pendingAdapterSend = new Promise<RuntimeSession>((resolve) => { resolveSend = resolve; });
    let rejectCancel!: (reason: Error) => void;
    const pendingAdapterCancel = new Promise<RuntimeSession>((_resolve, reject) => { rejectCancel = reject; });
    let cancelCount = 0;
    const cancel = vi.fn(async () => {
      cancelCount += 1;
      if (cancelCount === 1) return pendingAdapterCancel;
      current = { ...session('stopped'), error: '生成已停止，你可以继续发送要求。' };
      return current;
    });
    const adapter: AgentRuntimeAdapter = {
      health: async () => ({ status: 'ready', message: 'ready' }),
      list: async () => [current],
      create: async () => current,
      read: async () => current,
      send: async () => pendingAdapterSend,
      cancel,
      approve: async () => current,
    };

    const { result } = renderHook(() => useAgentRuntime(adapter, 'ideal-full', 'session-1'));
    await waitFor(() => expect(result.current.session?.status).toBe('idle'));

    let pendingSend!: Promise<boolean>;
    act(() => {
      pendingSend = result.current.execute('session-1', { kind: 'send', text: '第一条要求', commandId: 'send-1' });
    });
    await waitFor(() => expect(result.current.locked).toBe(true));

    let pendingCancel!: Promise<boolean>;
    act(() => {
      pendingCancel = result.current.execute('session-1', { kind: 'cancel' });
    });
    await waitFor(() => expect(result.current.operation).toMatchObject({ status: 'pending', command: { kind: 'cancel' } }));

    await act(async () => {
      resolveSend(session('idle', '已过期的返回'));
      expect(await pendingSend).toBe(false);
    });
    expect(result.current.locked).toBe(true);

    await act(async () => {
      rejectCancel(new Error('停止请求暂时失败'));
      expect(await pendingCancel).toBe(false);
    });
    expect(result.current.locked).toBe(true);

    await act(async () => {
      expect(await result.current.execute('session-1', { kind: 'cancel' })).toBe(true);
    });
    expect(result.current.locked).toBe(false);
    expect(result.current.session?.status).toBe('stopped');
  });
});
