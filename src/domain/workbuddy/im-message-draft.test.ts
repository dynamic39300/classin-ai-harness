import { describe, expect, it } from 'vitest';
import type { BusinessContextSnapshot } from '@contracts/workbuddy/business-context';
import { approveMessageSend, buildMessageDraftRuntimeRequest, createMessageDraft, extractMessageDraftBody, hasMarkedMessageDraftBody, proposeMessageSend, reviseMessageDraft, validateMessageContext } from './im-message-draft';

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

  it('asks the runtime to delimit exactly one sendable message', () => {
    const request = buildMessageDraftRuntimeRequest('请生成到课提醒。');
    expect(request).toContain('请生成到课提醒。');
    expect(request).toContain('<!--TEACHBUDDY_MESSAGE_BODY_START-->');
    expect(request).toContain('<!--TEACHBUDDY_MESSAGE_BODY_END-->');
    expect(request).toContain('不提供多个备选版本');
  });

  it('extracts only the marked message body', () => {
    const generated = `好的，王老师，提醒已经整理好。\n\n<!--TEACHBUDDY_MESSAGE_BODY_START-->\n同学们，课程已经开始，请尽快进入课堂。\n如遇技术问题，请及时联系我。\n<!--TEACHBUDDY_MESSAGE_BODY_END-->\n\n如果需要调整语气，请告诉我。`;
    expect(hasMarkedMessageDraftBody(generated)).toBe(true);
    expect(extractMessageDraftBody(generated)).toBe('同学们，课程已经开始，请尽快进入课堂。\n如遇技术问题，请及时联系我。');
    expect(hasMarkedMessageDraftBody('同学们，课程已经开始。')).toBe(false);
  });

  it('removes explanatory text around an unmarked message', () => {
    expect(extractMessageDraftBody(`好的，王老师！以下是可直接发送的提醒。\n\n---\n\n同学们，课程已经开始，请尽快进入课堂。\n如遇技术问题，请及时联系我。\n\n---\n\n提醒要点说明：\n- 说明了原因\n- 明确了下一步\n\n您可以直接发送到班级群。`)).toBe('同学们，课程已经开始，请尽快进入课堂。\n如遇技术问题，请及时联系我。');
  });

  it('keeps an already clean message unchanged', () => {
    expect(extractMessageDraftBody('同学们，请在今天 18:00 前提交作业，有困难可以随时联系我。')).toBe('同学们，请在今天 18:00 前提交作业，有困难可以随时联系我。');
  });
});
