import { useEffect, useMemo, useState } from 'react';
import type { AgentRuntimeAdapter, RuntimeScope, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { createHttpAgentRuntime } from '@features/agent-runtime';

const runtime = createHttpAgentRuntime();
type HistoryState = Readonly<{
  scope: RuntimeScope | null;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  sessions: readonly RuntimeSession[];
  error: string;
}>;

export function useRuntimeTaskHistory(scope: RuntimeScope | null, loadKey: string | null, adapter: Pick<AgentRuntimeAdapter, 'list'> = runtime) {
  const [refresh, setRefresh] = useState(0);
  const request = useMemo(() => ({ scope, loadKey, adapter, refresh }), [scope, loadKey, adapter, refresh]);
  const [state, setState] = useState<HistoryState & { request: typeof request | null }>({ scope, status: 'idle', sessions: [], error: '', request: null });

  useEffect(() => {
    const { scope, loadKey, adapter } = request;
    if (!scope || loadKey === null) return;
    let disposed = false;
    void adapter.list(scope).then((sessions) => {
      if (!disposed) setState({ request, scope, status: 'ready', sessions: [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), error: '' });
    }).catch((error: unknown) => {
      if (!disposed) setState((current) => ({ request, scope, sessions: current.scope === scope ? current.sessions : [], status: 'failed', error: error instanceof Error ? error.message : '对话任务暂时无法加载。' }));
    });
    return () => { disposed = true; };
  }, [request]);

  const current = state.scope === scope ? state : { scope, status: 'idle' as const, sessions: [], error: '' };
  const loading = scope !== null && loadKey !== null && state.request !== request;
  return {
    scope,
    status: loading ? 'loading' as const : current.status,
    sessions: current.sessions,
    error: loading ? '' : current.error,
    reload: () => setRefresh((current) => current + 1),
  };
}
