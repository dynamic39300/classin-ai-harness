import { describe, expect, it } from 'vitest';
import { getImAgentSessionBinding, getImAgentSessionTrail, removeImAgentSessionBinding, replaceMissingImAgentSessionBinding, rotateImAgentSessionBinding, saveImAgentSessionBinding } from './im-agent-session-binding';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('IM Agent Session binding', () => {
  it('isolates bindings by actor, tenant, thread and product scope', () => {
    const store = storage();
    const target = { actorRef: 'teacher-1', tenantRef: 'school-1', threadRef: 'thread-1', scope: 'ideal-full' as const };
    saveImAgentSessionBinding(target, 'tb-session-1', store);
    expect(getImAgentSessionBinding(target, store)).toBe('tb-session-1');
    expect(getImAgentSessionTrail(target, store)).toEqual(['tb-session-1']);
    rotateImAgentSessionBinding(target, 'tb-session-2', store);
    expect(getImAgentSessionBinding(target, store)).toBe('tb-session-2');
    expect(getImAgentSessionTrail(target, store)).toEqual(['tb-session-1', 'tb-session-2']);
    expect(getImAgentSessionBinding({ ...target, threadRef: 'thread-2' }, store)).toBeNull();
    expect(getImAgentSessionBinding({ ...target, actorRef: 'teacher-2' }, store)).toBeNull();
    removeImAgentSessionBinding(target, store);
    expect(getImAgentSessionBinding(target, store)).toBeNull();
  });

  it('fails closed for corrupt persisted values', () => {
    expect(getImAgentSessionBinding({ actorRef: 'a', tenantRef: 't', threadRef: 'x', scope: 'ideal-full' }, { getItem: () => '{bad' })).toBeNull();
  });

  it('replaces a missing active session without discarding earlier readable history', () => {
    const store = storage();
    const target = { actorRef: 'teacher-1', tenantRef: 'school-1', threadRef: 'thread-1', scope: 'ideal-full' as const };
    saveImAgentSessionBinding(target, 'tb-session-1', store);
    rotateImAgentSessionBinding(target, 'missing-session', store);

    replaceMissingImAgentSessionBinding(target, 'missing-session', 'tb-session-2', store);

    expect(getImAgentSessionBinding(target, store)).toBe('tb-session-2');
    expect(getImAgentSessionTrail(target, store)).toEqual(['tb-session-1', 'tb-session-2']);
  });
});
