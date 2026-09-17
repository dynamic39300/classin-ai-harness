import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TeachingDynamicsRequest, TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { useTeachingDynamics } from './useTeachingDynamics';

const request: TeachingDynamicsRequest = { actorRef: 'teacher', tenantRef: 'school', target: { kind: 'class', classId: 'one', classLabel: '班级', threadId: 'one' } };
const snapshot: TeachingDynamicsSnapshot = { threadRef: 'one', currentStage: 'before', stages: [], capturedAt: '2026-09-17T00:00:00Z', version: 'v1', sourceRefs: [], truthLabel: 'fixed-demo' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const advance = (ms = 1) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('scoped teaching suggestion loading', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('keeps prior content during refresh, deduplicates reads, and requires retry after failure', async () => {
    const first = deferred<TeachingDynamicsSnapshot>(); const refresh = deferred<TeachingDynamicsSnapshot>();
    const list = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(refresh.promise).mockResolvedValue({ ...snapshot, version: 'v2' });
    const changed = vi.fn(); const failed = vi.fn(); const adapter = { list };
    const { result } = renderHook(() => useTeachingDynamics(adapter, request, changed, failed));
    await advance(6_001);
    expect(result.current.state).toEqual({ status: 'loading', snapshot: null, slow: true });
    act(() => window.dispatchEvent(new Event('focus')));
    expect(list).toHaveBeenCalledTimes(1);
    await act(async () => first.resolve(snapshot));
    expect(result.current.state).toEqual({ status: 'ready', snapshot });
    await advance(3_600_000);
    expect(result.current.state).toEqual({ status: 'refreshing', snapshot });
    await act(async () => refresh.reject(new Error('离线')));
    expect(result.current.state).toEqual({ status: 'failed', snapshot, error: '离线' });
    await advance(7_200_000);
    expect(list).toHaveBeenCalledTimes(2);
    await act(async () => result.current.retry());
    expect(result.current.state.status).toBe('ready');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
  });

  it('retries initial failure only once, stops automatic polling, and recovers manually', async () => {
    const list = vi.fn().mockRejectedValue(new Error('不可用')); const adapter = { list }; const failed = vi.fn();
    const { result } = renderHook(() => useTeachingDynamics(adapter, request, vi.fn(), failed));
    await advance(1_501);
    expect(list).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ status: 'failed', snapshot: null, error: '不可用' });
    expect(failed).toHaveBeenCalledTimes(1);
    await advance(7_200_000);
    act(() => window.dispatchEvent(new Event('focus')));
    expect(list).toHaveBeenCalledTimes(2);
    list.mockResolvedValue(snapshot);
    await act(async () => result.current.retry());
    expect(result.current.state.status).toBe('ready');
  });

  it('bounds a hanging adapter and ignores results arriving after timeout', async () => {
    const pending = deferred<TeachingDynamicsSnapshot>(); const adapter = { list: vi.fn(() => pending.promise) };
    const { result } = renderHook(() => useTeachingDynamics(adapter, request, vi.fn()));
    await advance(111_501);
    expect(result.current.state.status).toBe('failed');
    expect(adapter.list).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(snapshot));
    expect(result.current.state.status).toBe('failed');
  });

  it('does not allow a previous thread to replace the current thread snapshot', async () => {
    const old = deferred<TeachingDynamicsSnapshot>(); const next = { ...snapshot, threadRef: 'two' };
    const adapter = { list: vi.fn().mockReturnValueOnce(old.promise).mockResolvedValue(next) };
    const { result, rerender } = renderHook(({ input }) => useTeachingDynamics(adapter, input, vi.fn()), { initialProps: { input: request } });
    await advance();
    rerender({ input: { ...request, target: { ...request.target, threadId: 'two' } } });
    expect(result.current.state.snapshot).toBeNull();
    await advance();
    expect(result.current.state.snapshot).toEqual(next);
    await act(async () => old.resolve(snapshot));
    expect(result.current.state.snapshot).toEqual(next);
  });

  it('does not refresh on focus before expiry, pauses when hidden, and refreshes once on overdue return', async () => {
    const next = deferred<TeachingDynamicsSnapshot>();
    const list = vi.fn().mockResolvedValueOnce(snapshot).mockReturnValueOnce(next.promise).mockResolvedValue(snapshot);
    const adapter = { list };
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    renderHook(() => useTeachingDynamics(adapter, request, vi.fn()));
    await advance();
    await advance(1_800_000);
    for (let i = 0; i < 3; i++) act(() => window.dispatchEvent(new Event('focus')));
    await advance();
    expect(list).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await advance(7_200_000);
    act(() => window.dispatchEvent(new Event('focus')));
    expect(list).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await advance();
    expect(list).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve(snapshot));
    await advance(3_599_999);
    expect(list).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(list).toHaveBeenCalledTimes(3);
  });

  it('counts the hour from success and resets it after manual recovery, cancelling timers on unmount', async () => {
    const first = deferred<TeachingDynamicsSnapshot>();
    const adapter = { list: vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(snapshot) };
    const { result, unmount } = renderHook(() => useTeachingDynamics(adapter, request, vi.fn()));
    await advance(30_000);
    await act(async () => first.resolve(snapshot));
    await advance(3_570_000); // An hour from mount is still short of an hour from success.
    expect(adapter.list).toHaveBeenCalledTimes(1);
    await act(async () => result.current.retry());
    expect(adapter.list).toHaveBeenCalledTimes(2);
    await advance(30_000);
    expect(adapter.list).toHaveBeenCalledTimes(2);
    await advance(3_570_000);
    expect(adapter.list).toHaveBeenCalledTimes(3);
    unmount();
    await advance(7_200_000);
    act(() => window.dispatchEvent(new Event('focus')));
    expect(adapter.list).toHaveBeenCalledTimes(3);
  });
});
