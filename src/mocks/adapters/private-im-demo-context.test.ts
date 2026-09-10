import { describe, expect, it } from 'vitest';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import type { PrivateImDemoSnapshot } from '@contracts/workbuddy/private-im-demo';
import { mergePrivateImDemoThread } from './private-im-demo-context';

describe('private IM demo context adapter', () => {
  it('replaces only the reserved local demo thread', () => {
    const snapshot = {
      version: 'private-v1', capturedAt: '2026-09-08T00:00:00.000Z', dataWindow: 'T-1',
      truthLabel: 'read-only-business-data', source: 'dw-hunter-local',
      thread: {
        id: 'class-dw-expression-lab', classId: 'dw-expression-lab', title: '本机群名', subtitle: '本机快照', avatar: '本',
        updatedAt: '2026-09-07T12:00:00.000Z', memberCount: 21,
        entries: [{ id: 'private-1', authorRole: 'teacher', authorName: '教师别名', body: '本机消息原文', sentAt: '2026-09-07T12:00:00.000Z', kind: 'text' }],
      },
      context: { courseType: 1, courseStatus: 1, classCount: 0, messageCount: 1, activeSenderCount: 1, teachingTopics: [], interactionPatterns: [], evidenceBoundary: '只使用可验证证据。' },
    } satisfies PrivateImDemoSnapshot;
    const merged = mergePrivateImDemoThread(MESSAGE_THREADS, snapshot);

    expect(merged.find(({ id }) => id === snapshot.thread.id)?.titleByRole.teacher).toBe('本机群名');
    expect(merged.find(({ id }) => id === snapshot.thread.id)?.entries[0]?.body).toBe('本机消息原文');
    expect(merged.find(({ id }) => id === 'class-physics-3')).toBe(MESSAGE_THREADS.find(({ id }) => id === 'class-physics-3'));
  });
});
