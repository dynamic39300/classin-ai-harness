import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TeachingDynamicsAdapter, TeachingDynamicsRequest, TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';

export type TeachingDynamicsLoadState =
  | { status: 'loading'; snapshot: null; slow: boolean }
  | { status: 'ready' | 'refreshing'; snapshot: TeachingDynamicsSnapshot }
  | { status: 'failed'; snapshot: TeachingDynamicsSnapshot | null; error: string };

const initialState: TeachingDynamicsLoadState = { status: 'loading', snapshot: null, slow: false };
const READ_TIMEOUT_MS = 55_000;
const REFRESH_INTERVAL_MS = 60 * 60 * 1_000;

/** One scoped reader owns polling, bounded recovery and late-result isolation. */
export function useTeachingDynamics(adapter: TeachingDynamicsAdapter, request: TeachingDynamicsRequest, onVersionChanged: () => void, onInitialFailure: () => void = () => undefined) {
  const scope = JSON.stringify([request.actorRef, request.tenantRef, request.target.kind, request.target.classId, request.target.threadId]);
  const [stored, setStored] = useState({ scope, state: initialState });
  const latestRequest = useRef(request);
  const changed = useRef(onVersionChanged);
  const initialFailure = useRef(onInitialFailure);
  const retryRef = useRef<() => void>(() => undefined);
  useLayoutEffect(() => { latestRequest.current = request; changed.current = onVersionChanged; initialFailure.current = onInitialFailure; });

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let failed = false;
    let attempts = 0;
    let snapshot: TeachingDynamicsSnapshot | null = null;
    let lastSuccessAt: number | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const schedule = (callback: () => void, delay: number) => {
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer); return timer;
    };
    const cancel = (timer: ReturnType<typeof setTimeout> | undefined) => {
      if (timer !== undefined) { clearTimeout(timer); timers.delete(timer); }
    };
    const update = (state: TeachingDynamicsLoadState) => { if (active) setStored({ scope, state }); };
    const run = async (manual = false) => {
      if (!active || inFlight || (!manual && (failed || retryTimer !== undefined))) return;
      if (manual) { failed = false; attempts = 0; cancel(retryTimer); retryTimer = undefined; }
      cancel(refreshTimer); refreshTimer = undefined;
      inFlight = true;
      const currentRequest = latestRequest.current;
      update(snapshot ? { status: 'refreshing', snapshot } : initialState);
      const slowTimer = schedule(() => { if (!snapshot) update({ status: 'loading', snapshot: null, slow: true }); }, 6_000);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([
          Promise.resolve().then(() => adapter.list(currentRequest)),
          new Promise<never>((_, reject) => { timeout = schedule(() => reject(new Error('教学建议读取超时，请重试。')), READ_TIMEOUT_MS); }),
        ]);
        if (!active) return;
        if (next.threadRef !== currentRequest.target.threadId) throw new Error('教学动态与当前会话不匹配，请刷新后重试。');
        if (snapshot && snapshot.version !== next.version) changed.current();
        snapshot = next;
        lastSuccessAt = Date.now();
        attempts = 0;
        update({ status: 'ready', snapshot });
      } catch (error) {
        if (!active) return;
        if (!snapshot && ++attempts < 2) {
          update({ status: 'loading', snapshot: null, slow: true });
          retryTimer = schedule(() => { retryTimer = undefined; void run(); }, 1_500);
        } else {
          failed = true;
          if (!snapshot) initialFailure.current();
          update({ status: 'failed', snapshot, error: error instanceof Error ? error.message : '教学建议暂时无法读取，请重试。' });
        }
      } finally { cancel(slowTimer); cancel(timeout); inFlight = false; refreshWhenDue(); }
    };
    // Count from the last successful read, not from mount or each window focus.
    // Returning from a hidden tab only refreshes an expired snapshot.
    const refreshWhenDue = () => {
      cancel(refreshTimer); refreshTimer = undefined;
      if (!active || failed || inFlight || lastSuccessAt === null || document.visibilityState === 'hidden') return;
      const remaining = REFRESH_INTERVAL_MS - (Date.now() - lastSuccessAt);
      if (remaining > 0) refreshTimer = schedule(refreshWhenDue, remaining);
      else void run();
    };
    retryRef.current = () => { void run(true); };
    queueMicrotask(() => { void run(); });
    window.addEventListener('focus', refreshWhenDue);
    document.addEventListener('visibilitychange', refreshWhenDue);
    return () => {
      active = false;
      retryRef.current = () => undefined;
      window.removeEventListener('focus', refreshWhenDue);
      document.removeEventListener('visibilitychange', refreshWhenDue);
      timers.forEach(clearTimeout);
    };
  }, [adapter, scope]);

  const retry = useCallback(() => retryRef.current(), []);
  return { state: stored.scope === scope ? stored.state : initialState, retry };
}
