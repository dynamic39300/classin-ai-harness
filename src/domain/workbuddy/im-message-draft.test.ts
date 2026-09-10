import { describe, expect, it } from 'vitest';
import type { BusinessContextSnapshot } from '@contracts/workbuddy/business-context';
import { approveMessageSend, createMessageDraft, proposeMessageSend, reviseMessageDraft, validateMessageContext } from './im-message-draft';

const snapshot = { id: 'context-1', threadRef: 'thread-1', channel: 'class' } as BusinessContextSnapshot;

describe('IM message draft', () => {
  it('invalidates prior approval evidence by creating a new artifact version after an edit', () => {
    const original = createMessageDraft({ sessionRef: 'session-1', snapshot, body: '初稿' });
    const action = proposeMessageSend(original, { id: 'teacher-1', name: '王老师' });
    expect(action).not.toBeNull();
    const approval = approveMessageSend(action!, '2026-09-08T00:00:00.000Z');
    const revised = reviseMessageDraft(original, '修订稿');
    expect(revised.version).toBe(2);
    expect(approval.artifactRef).toEqual({ id: original.id, version: 1 });
    expect(proposeMessageSend(revised, { id: 'teacher-1', name: '王老师' })?.artifactRef.version).toBe(2);
  });

  it('does not create a ClassIn send action for a direct-message draft', () => {
    const direct = createMessageDraft({ sessionRef: 'session-1', snapshot: { ...snapshot, channel: 'direct' }, body: '回复' });
    expect(proposeMessageSend(direct, { id: 'teacher-1', name: '王老师' })).toBeNull();
  });

  it('blocks delivery when the governed source version changed after generation', () => {
    const source = { kind: 'fixed-demo', owner: 'ClassIn', sourceRef: 'message-thread:thread-1', permissionScope: 'teacher:teacher-1:thread-1', capturedAt: '2026-09-08T00:00:00.000Z', freshness: 'current', version: 'v-1' } as const;
    const original = { ...snapshot, actorRef: 'teacher-1', tenantRef: 'school-1', sources: [source] } as BusinessContextSnapshot;
    const current = { ...original, id: 'context-2', sources: [{ ...source, version: 'v-2' }] } as BusinessContextSnapshot;
    expect(validateMessageContext(original, current)).toContain('业务事实已经变化');
    expect(validateMessageContext(original, { ...current, sources: [source] })).toBeNull();
  });
});
