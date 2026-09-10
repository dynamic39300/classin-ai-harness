import type { MessageImportantReminder } from '@domain/message/message-attention';

export const MESSAGE_IMPORTANT_REMINDERS: readonly MessageImportantReminder[] = Object.freeze([
  Object.freeze({
    id: 'reminder-physics-homework-deadline',
    threadId: 'class-physics-3',
    sourceMessageId: 'cp3-2',
    authorName: '王老师',
    body: '请大家课前准备好课堂练习单，作业仍在今天 18:00 截止。',
    createdAt: '2026-08-08T13:48:00+08:00',
    mentionsEveryone: true,
    truthLabel: 'fixed-demo',
  }),
]);
