import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentRuntimeAdapter, RuntimeHealth, RuntimeImageInput, RuntimeScope, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { RuntimeHttpError } from './http-agent-runtime';

type Command =
  | { kind: 'send'; text: string; commandId: string; images?: readonly RuntimeImageInput[] }
  | { kind: 'cancel' }
  | { kind: 'approve'; artifactId: string; version: number; commandId: string };
type Operation = { status: 'pending'; command: Command } | { status: 'failed'; command: Command; error: string; rejected: boolean };
type ReadFailure = Readonly<{ message: string; status?: number }>;
const message = (error: unknown) => error instanceof Error ? error.message : '操作未完成，请重试。';

export function useAgentRuntime(adapter: AgentRuntimeAdapter, scope: RuntimeScope, activeId: string | null) {
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [history, setHistory] = useState<readonly RuntimeSession[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [snapshots, setSnapshots] = useState<Record<string, RuntimeSession>>({});
  const [readErrors, setReadErrors] = useState<Record<string, ReadFailure | undefined>>({});
  const [operations, setOperations] = useState<Record<string, Operation | undefined>>({});
  const [creation, setCreation] = useState<'idle' | 'pending'>('idle');
  const [createError, setCreateError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const mounted = useRef(false);
  const creating = useRef(false);
  const locks = useRef(new Map<string, number>());
  const cancellations = useRef(new Set<string>());
  const revisions = useRef(new Map<string, number>());
  const reconnect = useCallback(() => setRefresh((value) => value + 1), []);
  const publish = useCallback((session: RuntimeSession) => {
    if (!mounted.current) return;
    setSnapshots((current) => ({ ...current, [session.id]: session }));
    setReadErrors((current) => ({ ...current, [session.id]: undefined }));
    setHistory((current) => [session, ...(current ?? []).filter((item) => item.id !== session.id)]);
  }, []);

  useEffect(() => {
    mounted.current = true;
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
    return () => {
      mounted.current = false;
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, [reconnect]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const result = await adapter.health();
        if (!disposed) setHealth(result);
      } catch (error) {
        if (!disposed) setHealth({ status: 'offline', message: message(error) });
      } finally {
        if (!disposed) timer = setTimeout(() => void check(), 10_000);
      }
    }
    void check();
    return () => { disposed = true; clearTimeout(timer); };
  }, [adapter, refresh]);

  useEffect(() => {
    let disposed = false;
    void adapter.list(scope).then((result) => {
      if (disposed) return;
      setSnapshots((current) => {
        const restored = { ...current };
        for (const entry of result) {
          if (!restored[entry.id] || restored[entry.id]!.updatedAt < entry.updatedAt) restored[entry.id] = entry;
        }
        return restored;
      });
      // A slow list response must not overwrite a newer mutation's history row.
      setHistory((current) => [...(current ?? []).filter((item) => !result.some((entry) => entry.id === item.id)), ...result.map((entry) => {
        const newer = current?.find((item) => item.id === entry.id && item.updatedAt > entry.updatedAt);
        return newer ?? entry;
      })]);
      setHistoryError('');
    }).catch((error: unknown) => { if (!disposed) setHistoryError(message(error)); });
    return () => { disposed = true; };
  }, [adapter, scope, refresh]);

  useEffect(() => {
    if (!activeId) return;
    const id = activeId;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      const revision = revisions.current.get(id) ?? 0;
      let poll = true;
      try {
        if (locks.current.has(id)) return;
        const result = await adapter.read(scope, id);
        if (result.id !== id) throw new Error('会话不匹配，请重新选择会话。');
        if (disposed || revision !== (revisions.current.get(id) ?? 0)) return;
        publish(result);
        poll = result.status === 'running';
      } catch (error) {
        if (!disposed && revision === (revisions.current.get(id) ?? 0)) setReadErrors((current) => ({ ...current, [id]: {
          message: message(error),
          ...(error instanceof RuntimeHttpError && error.status !== undefined ? { status: error.status } : {}),
        } }));
      } finally {
        if (!disposed && poll) timer = setTimeout(() => void read(), 1500);
      }
    }
    void read();
    // Navigation only detaches this observer; backend cancellation is an explicit command.
    return () => { disposed = true; clearTimeout(timer); };
  }, [activeId, adapter, scope, publish, refresh]);

  async function execute(id: string, command: Command): Promise<boolean> {
    const cancelling = command.kind === 'cancel';
    let operationCompleted = false;
    if (cancelling ? cancellations.current.has(id) : locks.current.has(id)) return false;
    const operationRevision = (revisions.current.get(id) ?? 0) + 1;
    revisions.current.set(id, operationRevision);
    if (cancelling) cancellations.current.add(id);
    else locks.current.set(id, operationRevision);
    setOperations((current) => ({ ...current, [id]: { status: 'pending', command } }));
    try {
      const result = command.kind === 'send'
        ? await adapter.send(scope, id, command.text, command.commandId, command.images)
        : command.kind === 'cancel'
          ? await adapter.cancel(scope, id)
          : await adapter.approve(scope, id, command.artifactId, command.version, command.commandId);
      if (result.id !== id) throw new Error('会话不匹配，操作结果尚未确认。');
      // A concurrent cancel supersedes an in-flight send. Its later response must
      // not replace the stopped snapshot or clear the cancel operation state.
      if ((revisions.current.get(id) ?? 0) !== operationRevision) return false;
      publish(result);
      operationCompleted = true;
      if (mounted.current) setOperations((current) => ({ ...current, [id]: undefined }));
      return true;
    } catch (error) {
      if (mounted.current && (revisions.current.get(id) ?? 0) === operationRevision) setOperations((current) => ({ ...current, [id]: { status: 'failed', command, error: message(error),
        rejected: error instanceof RuntimeHttpError && error.status !== undefined && error.status >= 400 && error.status < 500 && error.status !== 408,
      } }));
      return false;
    } finally {
      if (cancelling) {
        cancellations.current.delete(id);
        // A confirmed cancel releases the superseded send so the teacher can
        // continue even if its HTTP response has not settled yet.
        if (operationCompleted) locks.current.delete(id);
      } else if ((revisions.current.get(id) ?? 0) === operationRevision && locks.current.get(id) === operationRevision) {
        locks.current.delete(id);
      }
      if ((revisions.current.get(id) ?? 0) === operationRevision) revisions.current.set(id, operationRevision + 1);
      if (mounted.current) reconnect();
    }
  }

  async function create(): Promise<RuntimeSession | null> {
    if (creating.current) return null;
    creating.current = true;
    setCreation('pending');
    setCreateError('');
    try {
      const result = await adapter.create(scope);
      if (!mounted.current) return null;
      publish(result);
      return result;
    } catch (error) {
      if (mounted.current) setCreateError(message(error));
      return null;
    } finally {
      creating.current = false;
      if (mounted.current) { setCreation('idle'); reconnect(); }
    }
  }

  return { health, history, historyError, session: activeId ? snapshots[activeId] : undefined,
    readError: activeId ? readErrors[activeId]?.message ?? '' : '', readErrorStatus: activeId ? readErrors[activeId]?.status : undefined,
    operation: activeId ? operations[activeId] : undefined,
    locked: activeId ? locks.current.has(activeId) : false,
    creation, createError, create, execute, reconnect,
    dismissRejected: (id: string) => setOperations((current) => current[id]?.status === 'failed' && current[id].rejected ? { ...current, [id]: undefined } : current),
  };
}
