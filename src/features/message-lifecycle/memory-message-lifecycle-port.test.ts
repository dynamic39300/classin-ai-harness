import { describe, expect, it } from 'vitest';
import type { MessageThread } from '@domain/message/message';
import { createMemoryMessageLifecyclePort } from './memory-message-lifecycle-port';

const thread: MessageThread = {
  id: 'class-test', category: 'class', visibleTo: ['teacher'], titleByRole: { teacher: '测试班' },
  subtitleByRole: {}, avatarByRole: {}, updatedAt: '2026-08-08T14:00:00+08:00',
  unreadByRole: { teacher: 0 }, entries: [],
  olderEntries: [
    { id: 'old-1', authorRole: 'teacher', authorName: '王老师', body: '1', sentAt: '2026-08-01T10:00:00+08:00', kind: 'text' },
    { id: 'old-2', authorRole: 'teacher', authorName: '王老师', body: '2', sentAt: '2026-08-02T10:00:00+08:00', kind: 'text' },
    { id: 'old-3', authorRole: 'teacher', authorName: '王老师', body: '3', sentAt: '2026-08-03T10:00:00+08:00', kind: 'text' },
  ],
};

const request = {
  clientRequestId: 'request-1', threadId: 'class-test', actorRole: 'teacher' as const,
  authorName: '王老师', expectedThreadVersion: 1, sentAt: '2026-08-08T14:15:00+08:00',
  content: { body: 'hello', kind: 'text' as const },
};

describe('memory message lifecycle port', () => {
  it('returns the same receipt for an idempotent duplicate request', async () => {
    const port = createMemoryMessageLifecyclePort([thread]);
    const first = await port.submit(request);
    const duplicate = await port.submit(request);
    expect(first.status).toBe('accepted');
    expect(duplicate.status).toBe('duplicate');
    if (first.status === 'accepted' && duplicate.status === 'duplicate') {
      expect(duplicate.receipt).toEqual(first.receipt);
    }
  });

  it('requires sync before retrying a version conflict', async () => {
    const port = createMemoryMessageLifecyclePort([thread]);
    port.planFailure('class-test', 'version-conflict');
    const failed = await port.submit(request);
    expect(failed).toMatchObject({ status: 'failed', code: 'version-conflict' });
    const sync = await port.syncThread('class-test');
    const retried = await port.submit({ ...request, expectedThreadVersion: sync.threadVersion });
    expect(retried.status).toBe('accepted');
  });

  it('keeps offline submissions pending until an explicit retry', async () => {
    const port = createMemoryMessageLifecyclePort([thread], { connectionStatus: 'offline' });
    expect(await port.submit(request)).toMatchObject({ status: 'failed', code: 'offline' });
    expect((await port.reconnect()).status).toBe('online');
    expect(await port.submit(request)).toMatchObject({ status: 'accepted' });
  });

  it('pages history with opaque cursors and no overlap', async () => {
    const port = createMemoryMessageLifecyclePort([thread]);
    const cursor = port.getInitialHistoryCursor('class-test');
    expect(cursor).toBeTruthy();
    const first = await port.loadHistory({ role: 'teacher', threadId: 'class-test', cursor: cursor!, limit: 2 });
    const second = await port.loadHistory({ role: 'teacher', threadId: 'class-test', cursor: first.nextCursor!, limit: 2 });
    expect(first.entries.map(({ id }) => id)).toEqual(['old-2', 'old-3']);
    expect(second.entries.map(({ id }) => id)).toEqual(['old-1']);
    expect(second.nextCursor).toBeNull();
  });
});
