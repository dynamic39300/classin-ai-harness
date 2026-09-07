import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import type { ConversationRunEvent } from '@contracts/workbuddy/conversation-run';

export function runtimeSession(overrides: Partial<RuntimeSession> = {}): RuntimeSession {
  return { id: 'session-a', title: '英语教案', status: 'idle', updatedAt: '2026-09-04T10:00:00Z', events: [], artifacts: [], ...overrides };
}

export function runtimeEvent(summary: string, actor: 'teacher' | 'agent' = 'agent'): ConversationRunEvent {
  return { id: `${actor}-${summary}`, runRef: 'session-a', sequence: 1, occurredAt: '2026-09-04T10:00:00Z', updatedAt: '2026-09-04T10:00:00Z', actor,
    kind: actor === 'teacher' ? 'teacher_message' : 'goal_understood', state: 'completed', title: actor === 'teacher' ? '您' : 'TeachBuddy', summary, objectRefs: [], allowedCommands: [] };
}
