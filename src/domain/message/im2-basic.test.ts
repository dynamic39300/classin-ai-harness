import { describe, expect, it } from 'vitest';
import type { MessageThread } from './message';
import { MESSAGE_UNICODE_EMOJI } from './message-emoji';
import {
  addMessageResourceDraft,
  createReplyReference,
  filterConversationResources,
  getMessageResourceFormat,
  searchThreadEntries,
  toggleMessageReaction,
  type MessageResourceRef,
} from './im2-basic';

const THREAD: MessageThread = {
  id: 'thread-1',
  category: 'class',
  visibleTo: ['teacher', 'student-family'],
  titleByRole: { teacher: '测试班' },
  subtitleByRole: {},
  avatarByRole: {},
  updatedAt: '2026-09-09T10:00:00+08:00',
  unreadByRole: {},
  entries: [
    { id: 'message-1', authorRole: 'student-family', authorName: '李明', body: '请问今天的作业是什么？', sentAt: '2026-09-08T09:00:00+08:00', kind: 'text' },
    { id: 'message-2', authorRole: 'teacher', authorName: '王老师', body: '请完成动量守恒练习单。', sentAt: '2026-09-09T09:00:00+08:00', kind: 'text' },
  ],
  olderEntries: [
    { id: 'message-0', authorRole: 'teacher', authorName: '王老师', body: '上周作业已经批改。', sentAt: '2026-09-01T09:00:00+08:00', kind: 'text' },
  ],
};

describe('IM 2.0 basic message domain', () => {
  it('creates a stable reply snapshot and toggles one actor reaction idempotently', () => {
    expect(createReplyReference(THREAD.entries[0]!)).toEqual({ messageId: 'message-1', authorName: '李明', bodyPreview: '请问今天的作业是什么？' });
    const selected = toggleMessageReaction(THREAD, 'message-1', 'teacher', '👍');
    expect(selected.entries[0]?.reactions).toEqual([{ emoji: '👍', actorIds: ['teacher'] }]);
    const cleared = toggleMessageReaction(selected, 'message-1', 'teacher', '👍');
    expect(cleared.entries[0]?.reactions).toEqual([]);

    expect(MESSAGE_UNICODE_EMOJI).toContain('🎉');
    const extended = toggleMessageReaction(THREAD, 'message-1', 'teacher', '🎉');
    expect(extended.entries[0]?.reactions).toEqual([{ emoji: '🎉', actorIds: ['teacher'] }]);
  });

  it('does not add reactions to system or retracted messages', () => {
    const restricted = {
      ...THREAD,
      entries: [
        { ...THREAD.entries[0]!, id: 'system', kind: 'system' as const },
        { ...THREAD.entries[1]!, id: 'retracted', kind: 'retracted' as const },
      ],
    };
    expect(toggleMessageReaction(restricted, 'system', 'teacher', '🎉')).toBe(restricted);
    expect(toggleMessageReaction(restricted, 'retracted', 'teacher', '🎉')).toBe(restricted);
  });

  it('combines keyword, sender and date filters across loaded and older entries', () => {
    expect(searchThreadEntries(THREAD, { query: '作业', senderName: '王老师', from: '2026-09-01', to: '2026-09-08' }))
      .toEqual([{ messageId: 'message-0', authorName: '王老师', bodyPreview: '上周作业已经批改。', sentAt: '2026-09-01T09:00:00+08:00' }]);
  });

  it('filters resource type and removes duplicate stable references', () => {
    const resources: MessageResourceRef[] = [
      { id: 'r1', name: '练习单.pdf', kind: 'document', source: 'conversation', sizeLabel: '1 MB', updatedAt: '2026-09-09T09:00:00+08:00', truthLabel: 'SIMULATED' },
      { id: 'r1', name: '练习单.pdf', kind: 'document', source: 'class-space', sizeLabel: '1 MB', updatedAt: '2026-09-09T09:00:00+08:00', truthLabel: 'SIMULATED' },
      { id: 'r2', name: '板书.png', kind: 'image', source: 'conversation', sizeLabel: '500 KB', updatedAt: '2026-09-09T09:00:00+08:00', truthLabel: 'SIMULATED' },
    ];
    expect(filterConversationResources(resources, '练习', 'document').map(({ id }) => id)).toEqual(['r1']);
  });

  it('keeps resource drafts unique and enforces the explicit selection limit', () => {
    const resources = Array.from({ length: 10 }, (_, index) => ({
      id: `r-${index}`,
      name: `资料-${index}.pdf`,
      kind: 'document' as const,
      source: 'conversation' as const,
      sizeLabel: '1 MB',
      updatedAt: '2026-09-09T10:00:00+08:00',
      truthLabel: 'SIMULATED' as const,
    }));
    expect(addMessageResourceDraft(resources.slice(0, 1), resources[0]!).status).toBe('duplicate');
    expect(addMessageResourceDraft(resources, { ...resources[0]!, id: 'r-10' }).status).toBe('limit-reached');
    const added = addMessageResourceDraft(resources.slice(0, 2), resources[2]!);
    expect(added.status).toBe('added');
    expect(added.resources).toHaveLength(3);
    expect(getMessageResourceFormat(resources[0]!)).toBe('PDF');
  });
});
