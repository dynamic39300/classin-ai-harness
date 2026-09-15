import type { BusinessContextRequest } from '@contracts/workbuddy/business-context';
import type { ImChatReadResult } from '@contracts/workbuddy/im-chat-context';
import type { MessageThread } from '@domain/message/message';

/** Reads all locally available pages, without changing the visible message viewport. */
export function readFixedImChat(threads: readonly MessageThread[], request: BusinessContextRequest, now: Date): ImChatReadResult {
  const thread = threads.find(item => item.id === request.target.threadId);
  if (!thread || !thread.visibleTo.includes('teacher') || (request.target.kind !== 'direct' && thread.classId !== request.target.classId)) throw new Error('当前无法读取该班级的群消息');
  return {
    threadRef: thread.id, capturedAt: now.toISOString(), complete: true,
    messages: [...(thread.olderEntries ?? []), ...thread.entries].flatMap(entry => {
      if (entry.authorRole !== 'teacher' && entry.authorRole !== 'student-family' && entry.authorRole !== 'class-agent') return [];
      return [{ id: entry.id, authorRole: entry.authorRole, authorName: entry.authorName, body: entry.body, sentAt: entry.sentAt,
        replyToId: entry.replyTo?.messageId, retracted: entry.kind === 'retracted',
        hasUnreadMedia: Boolean(entry.attachments?.length || entry.resources?.length || entry.objectCards?.length || entry.contentReference),
      }];
    }),
  };
}

/** Stable reader ownership so UI updates do not recreate the Runtime or reset input drafts. */
export function createFixedImChatReader() {
  let threads: readonly MessageThread[] | null = null;
  return {
    update(next: readonly MessageThread[] | null) { threads = next; },
    async read(request: BusinessContextRequest) {
      if (!threads) throw new Error('群消息尚未加载完成，请稍后重试');
      return readFixedImChat(threads, request, new Date());
    },
  };
}
