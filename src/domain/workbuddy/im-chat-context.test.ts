import { describe, it, expect } from 'vitest';
import type { ImChatMessage } from '@contracts/workbuddy/im-chat-context';
import { selectImChatContext, referencedChatChanged } from './im-chat-context';
const message = (id: string, sentAt = '2026-09-15T01:00:00Z'): ImChatMessage => ({ id, sentAt, authorRole: 'student-family', authorName: '示例学生', body: '第二题怎么做？' });
const read = { threadRef: 'class-a', capturedAt: '2026-09-15T02:00:00Z', complete: true, messages: [message('old', '2026-09-12T02:00:00Z'), { ...message('question'), replyToId: 'old' }] };
describe('IM question message scope', () => {
  it('uses yesterday midnight in Shanghai and keeps older quoted notices as background', () => {
    const result = selectImChatContext(read, '最近两天', 'question');
    expect(result.from).toBe('2026-09-13T16:00:00.000Z');
    expect(result.messages.map(m => m.id)).toEqual(['old', 'question']);
    expect(result.complete).toBe(true);
    expect(selectImChatContext(read, '过去48小时').from).toBe('2026-09-13T02:00:00.000Z');
    expect(selectImChatContext(read, '最近5天').from).toBe('2026-09-10T02:00:00.000Z');
  });
  it('deduplicates and labels unavailable attachments or capacity truncation as partial', () => {
    expect(selectImChatContext({ ...read, messages: [...read.messages, ...read.messages] }).messages).toHaveLength(2);
    expect(selectImChatContext({ ...read, messages: [{ ...message('image'), hasUnreadMedia: true }] }).complete).toBe(false);
    const bounded = selectImChatContext({ ...read, messages: Array.from({ length: 125 }, (_, i) => message(String(i))) });
    expect(bounded.omittedCount).toBe(5);
    expect(bounded.complete).toBe(false);
  });
  it('blocks stale replies on deletion, withdrawal, edits or newer discussion', () => {
    const before = selectImChatContext(read, '', 'question');
    expect(referencedChatChanged(before, before)).toBe(false);
    for (const messages of [[message('new')], [{ ...message('question'), retracted: true }], [{ ...message('question'), body: '新的问题' }], [...read.messages, message('new')]]) {
      expect(referencedChatChanged(before, selectImChatContext({ ...read, messages }, '', 'question'))).toBe(true);
    }
  });
});
