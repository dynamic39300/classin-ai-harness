import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { useImHistoryPresentation } from './useImHistoryPresentation';

const initialRefs = ['existing'];
function session(turns: number): RuntimeSession {
  return { id: 'existing', title: '原有会话', status: 'idle', updatedAt: '2026-09-15T00:00:00Z', artifacts: [], events: Array.from({ length: turns }, (_, i) => ({
    id: `teacher-${i}`, runRef: 'existing', sequence: i, occurredAt: '2026-09-15T00:00:00Z', updatedAt: '2026-09-15T00:00:00Z', actor: 'teacher' as const, kind: 'teacher_message' as const, state: 'completed' as const, title: '教师', summary: `第${i}轮`, objectRefs: [], allowedCommands: [],
  })) };
}

it('captures asynchronously restored history once and shows new turns without changing the source', async () => {
  const old = session(2);
  const { result, rerender, unmount } = renderHook(({ sessions }) => useImHistoryPresentation(sessions, initialRefs), { initialProps: { sessions: [] as RuntimeSession[] } });
  rerender({ sessions: [old] });
  await waitFor(() => expect(result.current.isReady('existing')).toBe(true));
  expect(result.current.hasHiddenHistory).toBe(true);
  expect(result.current.visibleSessions[0]?.events).toHaveLength(0);
  const current = session(3);
  rerender({ sessions: [current] });
  expect(result.current.visibleSessions[0]?.events.map(({ id }) => id)).toEqual(['teacher-2']);
  expect(result.current.firstNewTurn).toBeNull();
  expect(old.events).toHaveLength(2);
  expect(current.events).toHaveLength(3);
  act(() => result.current.reveal());
  expect(result.current.visibleSessions[0]?.events).toHaveLength(3);
  expect(result.current.hasHiddenHistory).toBe(false);
  expect(result.current.firstNewTurn).toEqual({ sessionRef: 'existing', turnId: 'teacher-2' });
  rerender({ sessions: [session(4)] });
  expect(result.current.firstNewTurn).toEqual({ sessionRef: 'existing', turnId: 'teacher-2' });
  unmount();
  const refreshed = renderHook(() => useImHistoryPresentation([current], initialRefs));
  await waitFor(() => expect(refreshed.result.current.isReady('existing')).toBe(true));
  expect(refreshed.result.current.visibleSessions[0]?.events).toHaveLength(0);
  act(() => refreshed.result.current.reveal());
  expect(refreshed.result.current.firstNewTurn).toBeNull();
});

it('shows a newly created conversation immediately and does not offer empty history', () => {
  const { result } = renderHook(() => useImHistoryPresentation([session(1)], []));
  expect(result.current.visibleSessions[0]?.events).toHaveLength(1);
  expect(result.current.hasHiddenHistory).toBe(false);
  act(() => result.current.reveal());
  expect(result.current.firstNewTurn).toBeNull();
});
