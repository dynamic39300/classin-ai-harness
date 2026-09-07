import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeAdapter, RuntimeScope, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { useRuntimeTaskHistory } from './use-runtime-task-history';

const session = (id: string, updatedAt = '2026-09-05T01:00:00Z'): RuntimeSession => ({
  id, title: id, updatedAt, status: 'idle', events: [], artifacts: [],
});

describe('runtime task history', () => {
  it('loads lazily and sorts recent sessions without mutating the adapter response', async () => {
    const items = [session('older'), session('newer', '2026-09-05T02:00:00Z')];
    const adapter = { list: vi.fn<AgentRuntimeAdapter['list']>().mockResolvedValue(items) };
    const initialProps: { key: string | null } = { key: null };
    const { result, rerender } = renderHook(({ key }: { key: string | null }) => useRuntimeTaskHistory('ideal-full', key, adapter), { initialProps });
    expect(adapter.list).not.toHaveBeenCalled();
    rerender({ key: 'selector' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(adapter.list).toHaveBeenCalledWith('ideal-full');
    expect(result.current.sessions.map(({ id }) => id)).toEqual(['newer', 'older']);
    expect(items.map(({ id }) => id)).toEqual(['older', 'newer']);
  });

  it('discards late responses from another scope and does not leak cached sessions', async () => {
    let resolveFirst!: (items: readonly RuntimeSession[]) => void;
    const adapter = { list: vi.fn<AgentRuntimeAdapter['list']>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce([session('class-task')]) };
    const { result, rerender } = renderHook(({ scope, key }: { scope: RuntimeScope | null; key: string | null }) => useRuntimeTaskHistory(scope, key, adapter), {
      initialProps: { scope: 'ideal-full', key: 'selector' },
    });
    rerender({ scope: 'classin-mvp', key: 'selector' });
    await waitFor(() => expect(result.current.sessions[0]?.id).toBe('class-task'));
    await act(async () => resolveFirst([session('global-task')]));
    expect(result.current.sessions.map(({ id }) => id)).toEqual(['class-task']);
    rerender({ scope: null, key: null });
    expect(result.current.sessions).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(adapter.list).toHaveBeenCalledTimes(2);
  });

  it('can retry a failed list without creating a session', async () => {
    const adapter = { list: vi.fn<AgentRuntimeAdapter['list']>()
      .mockRejectedValueOnce(new Error('暂时无法读取'))
      .mockResolvedValueOnce([session('restored')]) };
    const { result } = renderHook(() => useRuntimeTaskHistory('ideal-full', 'selector', adapter));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.error).toBe('暂时无法读取');
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.error).toBe('');
    expect(result.current.sessions[0]?.id).toBe('restored');
    expect(adapter.list).toHaveBeenCalledTimes(2);
  });

  it('refreshes when history is reopened and leaves the old list visible during loading', async () => {
    let resolveNext!: (items: readonly RuntimeSession[]) => void;
    const adapter = { list: vi.fn<AgentRuntimeAdapter['list']>().mockResolvedValueOnce([session('first')])
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; })) };
    const initialProps: { key: string | null } = { key: 'selector' };
    const { result, rerender } = renderHook(({ key }: { key: string | null }) => useRuntimeTaskHistory('ideal-full', key, adapter), { initialProps });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ key: null });
    rerender({ key: 'selector' });
    expect(result.current.status).toBe('loading');
    expect(result.current.sessions[0]?.id).toBe('first');
    await act(async () => resolveNext([session('second')]));
    expect(result.current.sessions[0]?.id).toBe('second');
  });
});
