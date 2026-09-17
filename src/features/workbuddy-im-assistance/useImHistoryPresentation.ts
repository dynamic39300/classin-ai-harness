import { useMemo, useState } from 'react';
import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { splitAnalysisProcessTurns } from '@domain/workbuddy/analysis-process';

type HistoryBoundary = Readonly<{ turns: readonly string[]; artifacts: readonly string[] }>;

/** Page-local visibility only. Runtime sessions and their context are never cleared. */
export function useImHistoryPresentation(sessions: readonly RuntimeSession[], initialSessionRefs: readonly string[]) {
  const [revealed, setRevealed] = useState(false);
  const [boundaries, setBoundaries] = useState<Readonly<Record<string, HistoryBoundary>>>({});

  // Capture each first restored snapshot once, before new submissions can start.
  const arriving = sessions.filter(({ id }) => initialSessionRefs.includes(id) && !boundaries[id]);
  if (arriving.length) {
    setBoundaries(current => ({ ...current, ...Object.fromEntries(arriving.map(session => [session.id, {
      turns: splitAnalysisProcessTurns(session.events).map(({ id }) => id),
      artifacts: session.artifacts.map(({ id }) => id),
    }])) }));
  }

  const visibleSessions = useMemo(() => revealed ? sessions : sessions.map(session => {
    if (!initialSessionRefs.includes(session.id)) return session;
    const boundary = boundaries[session.id];
    return { ...session,
      events: boundary ? splitAnalysisProcessTurns(session.events).filter(turn => !boundary.turns.includes(turn.id)).flatMap(({ events }) => events) : [],
      artifacts: boundary ? session.artifacts.filter(({ id }) => !boundary.artifacts.includes(id)) : [],
    };
  }), [sessions, initialSessionRefs, boundaries, revealed]);

  const hasPastTurns = sessions.some(session => (boundaries[session.id]?.turns.length ?? 0) > 0);
  const firstNewTurn = revealed && hasPastTurns ? sessions.flatMap(session => {
    const boundary = boundaries[session.id];
    if (initialSessionRefs.includes(session.id) && !boundary) return [];
    return splitAnalysisProcessTurns(session.events)
      .filter(turn => !boundary?.turns.includes(turn.id))
      .map(turn => ({ sessionRef: session.id, turnId: turn.id }));
  })[0] ?? null : null;

  return {
    firstNewTurn,
    visibleSessions,
    hasHiddenHistory: !revealed && sessions.some(session => initialSessionRefs.includes(session.id) && (session.events.length > 0 || session.artifacts.length > 0)),
    isReady: (sessionRef: string | null) => !sessionRef || !initialSessionRefs.includes(sessionRef) || Boolean(boundaries[sessionRef]),
    revealed,
    reveal: () => setRevealed(true),
  };
}
