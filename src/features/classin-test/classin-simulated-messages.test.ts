import { describe, expect, it, vi } from 'vitest';
import type { ClassInScene } from '@contracts/classin-test';
import type { MessageSubmitRequest } from '@domain/message/message-lifecycle';
import { createClassInMessageExtension, createSimulatedClassInDraftAdapter } from './classin-simulated-messages';
import { threadRef } from '@domain/classin-test/projections';
import { approveMessageSend } from '@domain/workbuddy/im-message-draft';
const scene: ClassInScene = { environment: 'classin-test', teacher: { id: 'test-teacher', name: '测试老师' }, schoolRef: 'test-school', class: { id: 'test-class', name: '数学测试班' }, course: { id: 'test-course', name: '有理数' }, units: [], activities: [], members: [], capturedAt: '2026-09-15T01:00:00Z', version: 'one', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' } };
function memoryStorage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }
const request = (version = 1): MessageSubmitRequest => ({ clientRequestId: 'send-1', threadId: threadRef(scene), actorRole: 'teacher', authorName: '测试老师', sentAt: scene.capturedAt, expectedThreadVersion: version, content: { kind: 'text', body: '请复习有理数。' } });
describe('teacher-only ClassIn simulated delivery', () => {
  it('persists accepted sends, restores idempotency, never creates delivery/read evidence', async () => {
    const storage = memoryStorage(); const extension = createClassInMessageExtension(scene, storage);
    const result = await extension.lifecyclePort.submit(request());
    expect(result).toMatchObject({ status: 'accepted', receipt: { deliveryStatus: 'sent', truthLabel: 'SIMULATED' } });
    if ('receipt' in result) { expect(result.receipt.readCount).toBeUndefined(); expect(result.receipt.recipientCount).toBeUndefined(); }
    const restored = createClassInMessageExtension(scene, storage);
    expect(restored.threads[0]?.entries).toHaveLength(1);
    expect(await restored.lifecyclePort.submit(request())).toMatchObject({ status: 'duplicate' });
    expect(await restored.lifecyclePort.submit({ ...request(2), content: { kind: 'text', body: 'changed' } })).toMatchObject({ status: 'failed', code: 'version-conflict' });
    expect(restored.lifecyclePort.getCurrentThreadVersion(threadRef(scene))).toBe(2);
  });
  it('isolates actor, school, class and students, including duplicate request lookup', async () => {
    const storage = memoryStorage(); const extension = createClassInMessageExtension(scene, storage);
    await extension.lifecyclePort.submit(request());
    expect(extension.threads[0]?.visibleTo).toEqual(['teacher']);
    expect(await extension.lifecyclePort.submit({ ...request(), actorRole: 'student-family' })).toMatchObject({ status: 'failed', code: 'permission-denied' });
    expect(await extension.lifecyclePort.submit({ ...request(), threadId: 'class-physics-3' })).toMatchObject({ status: 'failed', code: 'permission-denied' });
    await expect(extension.lifecyclePort.loadHistory({ role: 'student-family', threadId: threadRef(scene), cursor: 'any', limit: 5 })).rejects.toThrow('老师端');
    expect(createClassInMessageExtension({ ...scene, schoolRef: 'other' }, storage).threads[0]?.entries).toHaveLength(0);
  });
  it('does not acknowledge or advance a failed storage write, and retry works', async () => {
    const store = memoryStorage(); const setItem = vi.fn(store.setItem).mockImplementationOnce(() => { throw new Error('quota'); });
    const extension = createClassInMessageExtension(scene, { ...store, setItem });
    expect(await extension.lifecyclePort.submit(request())).toMatchObject({ status: 'failed', code: 'transient' });
    expect(extension.lifecyclePort.getCurrentThreadVersion(threadRef(scene))).toBe(1);
    expect(await extension.lifecyclePort.submit(request())).toMatchObject({ status: 'accepted' });
  });
  it('checks approvals and uses artifact/version idempotency for Copilot retries', async () => {
    const extension = createClassInMessageExtension(scene, memoryStorage());
    const submit = vi.fn(async (options) => extension.lifecyclePort.submit({ clientRequestId: options.clientRequestId, threadId: options.threadId, actorRole: options.role, authorName: options.authorName, expectedThreadVersion: extension.lifecyclePort.getCurrentThreadVersion(options.threadId), sentAt: options.sentAt, content: { kind: 'text', body: options.body } }));
    const adapter = createSimulatedClassInDraftAdapter(scene, submit);
    const action = { id: 'action-1', kind: 'send-class-message' as const, artifactRef: { id: 'draft', version: 1 }, contextSnapshotRef: 'ctx', threadRef: threadRef(scene), actorRef: scene.teacher.id, actorName: scene.teacher.name, body: '有理数课堂提醒' };
    const approval = approveMessageSend(action, scene.capturedAt);
    expect(await adapter.execute(action, { ...approval, approvedBy: 'other' })).toMatchObject({ status: 'permission_denied' });
    expect(submit).not.toHaveBeenCalled();
    expect(await adapter.execute(action, { ...approval, artifactRef: { id: 'draft', version: 2 } })).toMatchObject({ status: 'stale_context' });
    expect(await adapter.execute(action, approval)).toMatchObject({ status: 'success', result: expect.stringContaining('学生端不接收') });
    expect(await adapter.execute(action, approval)).toMatchObject({ status: 'success' });
    expect(extension.lifecyclePort.getCurrentThreadVersion(threadRef(scene))).toBe(2);
  });
});
