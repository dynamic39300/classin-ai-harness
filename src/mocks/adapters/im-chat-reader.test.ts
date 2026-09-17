import { expect, it } from 'vitest';
import { readFixedImChat } from './im-chat-reader';
import type { MessageThread } from '@domain/message/message';
const thread: MessageThread = {
  id: 'group', category: 'class', classId: 'class', visibleTo: ['teacher'], titleByRole: {}, subtitleByRole: {}, avatarByRole: {}, updatedAt: '2026-09-15', unreadByRole: {},
  entries: [{ id: 'new', body: '学生提问', authorRole: 'student-family', authorName: '示例学生', kind: 'text', sentAt: '2026-09-15T01:00:00Z' }],
  olderEntries: [{ id: 'old', body: '作业通知', authorRole: 'teacher', authorName: '示例老师', kind: 'text', sentAt: '2026-09-14T01:00:00Z' }],
};
const request = { actorRef: 'teacher', tenantRef: 'demo', use: 'private-assistance' as const, target: { kind: 'class' as const, threadId: 'group', classId: 'class', classLabel: '示例班' } };
it('reads older pages and current updates without mutating the timeline', () => {
  expect(readFixedImChat([thread], request, new Date()).messages.map(m => m.id)).toEqual(['old', 'new']);
  expect(thread.entries).toHaveLength(1);
  const changed = { ...thread, entries: [{ ...thread.entries[0]!, body: '问题修改' }] };
  expect(readFixedImChat([changed], request, new Date()).messages.at(-1)?.body).toBe('问题修改');
});
it('refuses a mismatched or inaccessible thread rather than falling back to another class', () => {
  expect(() => readFixedImChat([{ ...thread, visibleTo: ['student-family'] }], request, new Date())).toThrow();
  expect(() => readFixedImChat([thread], { ...request, target: { ...request.target, classId: 'another' } }, new Date())).toThrow();
});
