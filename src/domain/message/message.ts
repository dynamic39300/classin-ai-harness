import type { AppRole } from '@domain/account/role';
import type { ClassAgentChannel, ClassAgentThreadBinding, ClassAgentTruthLabel } from '@domain/class-agent/class-agent';
import type { GuidedExplanationContentReference } from '@domain/workbuddy/guided-explanation';
import type { MessageReaction, MessageReplyReference, MessageResourceRef } from './im2-basic';
import { getMessageContentPreview, type MessageMediaAttachment, type MessageMentionRef } from './message-media';
import { getMessageObjectCardPreview, type MessageObjectCard } from './message-object-card';
import type { MessageDeliveryState } from './message-lifecycle';

export type MessageCategory = 'direct' | 'class' | 'system' | 'official';
export type MessageAuthorRole = AppRole | 'system' | 'official' | 'class-agent';

export type ClassAgentMessageMetadata = Readonly<{
  agentId: string;
  channel: ClassAgentChannel;
  visibilityLabel: string;
  truthLabel: ClassAgentTruthLabel;
}>;

export type MessageEntry = {
  id: string;
  authorRole: MessageAuthorRole;
  authorName: string;
  body: string;
  sentAt: string;
  kind: 'text' | 'emoji' | 'system' | 'retracted';
  retractedAt?: string;
  classAgent?: ClassAgentMessageMetadata;
  contentReference?: GuidedExplanationContentReference;
  replyTo?: MessageReplyReference;
  reactions?: readonly MessageReaction[];
  resources?: readonly MessageResourceRef[];
  attachments?: readonly MessageMediaAttachment[];
  mentions?: readonly MessageMentionRef[];
  objectCards?: readonly MessageObjectCard[];
  delivery?: MessageDeliveryState;
};

export type MessageNotice = {
  tag: string;
  body: string[];
  actionLabel: string;
  actionFeedback: string;
  actionTarget?: {
    kind: 'homework';
    homeworkId: string;
    view: 'detail' | 'correction' | 'result';
  } | {
    kind: 'open-course';
    courseId: string;
    view: 'detail' | 'preflight' | 'review';
  };
  metadata: Array<{ label: string; value: string }>;
  presentation?: 'open-course' | 'official-content';
  sourceLabel?: string;
  coverLabel?: string;
};

export type MessageThread = {
  id: string;
  category: MessageCategory;
  visibleTo: readonly AppRole[];
  titleByRole: Partial<Record<AppRole, string>>;
  subtitleByRole: Partial<Record<AppRole, string>>;
  avatarByRole: Partial<Record<AppRole, string>>;
  updatedAt: string;
  unreadByRole: Partial<Record<AppRole, number>>;
  classId?: string;
  memberCount?: number;
  peerId?: string;
  classAgentBinding?: ClassAgentThreadBinding;
  classAgentBindings?: readonly ClassAgentThreadBinding[];
  entries: MessageEntry[];
  olderEntries?: MessageEntry[];
  notice?: MessageNotice;
  /** Display-only integration provenance; does not grant access. */
  integration?: Readonly<{ label: string; detailsPath: string; teacherName: string; members?: readonly Readonly<{ id: string; name: string; roleLabel: string }>[]; capturedAt?: string }>;
};

export function prependOlderMessagePage(thread: MessageThread, pageSize = 6): MessageThread {
  if (!thread.olderEntries?.length || pageSize <= 0) return thread;
  const pageStart = Math.max(0, thread.olderEntries.length - pageSize);
  const page = thread.olderEntries.slice(pageStart);
  return {
    ...thread,
    entries: [...page, ...thread.entries],
    olderEntries: thread.olderEntries.slice(0, pageStart),
  };
}

export function prependMessageHistoryPage(
  thread: MessageThread,
  page: readonly MessageEntry[],
): MessageThread {
  if (!page.length) return thread;
  const existingIds = new Set(thread.entries.map(({ id }) => id));
  const uniquePage = page.filter(({ id }) => !existingIds.has(id));
  if (!uniquePage.length) return thread;
  const loadedIds = new Set(uniquePage.map(({ id }) => id));
  return {
    ...thread,
    entries: [...uniquePage, ...thread.entries],
    olderEntries: thread.olderEntries?.filter(({ id }) => !loadedIds.has(id)),
  };
}

export function updateMessageDelivery(
  thread: MessageThread,
  messageId: string,
  delivery: MessageDeliveryState,
): MessageThread {
  if (!thread.entries.some(({ id }) => id === messageId)) return thread;
  return {
    ...thread,
    entries: thread.entries.map((entry) => entry.id === messageId ? { ...entry, delivery } : entry),
  };
}

export type MessageContact = {
  id: string;
  name: string;
  relationship: string;
  visibleTo: readonly AppRole[];
  targetThreadId: string;
  agentId?: string;
};

export const MESSAGE_CATEGORY_LABELS: Record<MessageCategory, string> = {
  direct: '私聊',
  class: '班级消息',
  system: '系统通知',
  official: '官方公告',
};

const CATEGORY_ORDER: MessageCategory[] = ['direct', 'class', 'system', 'official'];

export function getMessageThreadTitle(role: AppRole, thread: MessageThread): string {
  return thread.titleByRole[role] ?? '消息';
}

export function getMessageThreadSubtitle(role: AppRole, thread: MessageThread): string {
  return thread.subtitleByRole[role] ?? '';
}

export function getVisibleMessageThreads(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): MessageThread[] {
  return threads.filter(({ visibleTo }) => visibleTo.includes(role));
}

export function findClassMessageThreadId(
  role: AppRole,
  classId: string,
  threads: ReadonlyArray<MessageThread>,
): string | null {
  return getVisibleMessageThreads(role, threads)
    .find((thread) => thread.category === 'class' && thread.classId === classId)?.id ?? null;
}

export function findDirectMessageThreadId(
  role: AppRole,
  peerId: string,
  threads: ReadonlyArray<MessageThread>,
): string | null {
  return getVisibleMessageThreads(role, threads)
    .find((thread) => thread.category === 'direct' && thread.peerId === peerId)?.id ?? null;
}

export function getLastMessageEntry(thread: MessageThread): MessageEntry | undefined {
  return thread.entries.at(-1);
}

export function getMessageEntryPreview(entry: MessageEntry | undefined): string {
  if (!entry) return '';
  if (entry.kind === 'retracted') return '消息已撤回';
  return getMessageContentPreview(entry) || getMessageObjectCardPreview(entry.objectCards);
}

export function filterMessageThreads(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
  category: MessageCategory,
  query: string,
): MessageThread[] {
  const normalized = query.trim().toLocaleLowerCase();
  return getVisibleMessageThreads(role, threads)
    .filter((thread) => thread.category === category)
    .filter((thread) => {
      if (!normalized) return true;
      const searchable = [
        getMessageThreadTitle(role, thread),
        getMessageThreadSubtitle(role, thread),
        getMessageEntryPreview(getLastMessageEntry(thread)),
        thread.notice?.body.join(' ') ?? '',
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(normalized);
    })
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function countUnreadByCategory(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): Record<MessageCategory, number> {
  const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0])) as Record<MessageCategory, number>;
  for (const thread of getVisibleMessageThreads(role, threads)) {
    counts[thread.category] += thread.unreadByRole[role] ?? 0;
  }
  return counts;
}

export function countUnreadMessages(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
): number {
  return Object.values(countUnreadByCategory(role, threads))
    .reduce((total, count) => total + count, 0);
}

export function markThreadRead(role: AppRole, thread: MessageThread): MessageThread {
  if ((thread.unreadByRole[role] ?? 0) === 0) return thread;
  return {
    ...thread,
    unreadByRole: { ...thread.unreadByRole, [role]: 0 },
  };
}

export function markCategoryRead(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
  category: MessageCategory,
): MessageThread[] {
  return threads.map((thread) => (
    thread.category === category && thread.visibleTo.includes(role)
      ? markThreadRead(role, thread)
      : thread
  ));
}

export function isWritableMessageThread(thread: MessageThread): boolean {
  return thread.category === 'direct' || thread.category === 'class';
}

export function appendLocalMessage(
  role: AppRole,
  authorName: string,
  thread: MessageThread,
  body: string,
  sentAt: string,
  kind: 'text' | 'emoji' = 'text',
  messageId?: string,
  authorRole: MessageAuthorRole = role,
  classAgent?: ClassAgentMessageMetadata,
  contentReference?: GuidedExplanationContentReference,
  replyTo?: MessageReplyReference,
  resources?: readonly MessageResourceRef[],
  attachments?: readonly MessageMediaAttachment[],
  mentions?: readonly MessageMentionRef[],
  objectCards?: readonly MessageObjectCard[],
  delivery?: MessageDeliveryState,
): MessageThread {
  const content = body.trim();
  if (!(getMessageContentPreview({ body: content, resources, attachments }) || getMessageObjectCardPreview(objectCards)) || !isWritableMessageThread(thread)) return thread;
  return {
    ...thread,
    updatedAt: sentAt,
    unreadByRole: { ...thread.unreadByRole, [role]: 0 },
    entries: [
      ...thread.entries,
      {
        id: messageId ?? `local-${role}-${thread.entries.length + 1}`,
        authorRole,
        authorName,
        body: content,
        sentAt,
        kind,
        classAgent,
        contentReference,
        replyTo,
        resources,
        attachments,
        mentions,
        objectCards,
        delivery,
      },
    ],
  };
}

export function canRecallClassMessage(role: AppRole, entry: MessageEntry, now: Date): boolean {
  if (entry.authorRole !== role || entry.kind === 'system' || entry.kind === 'retracted') return false;
  if (role === 'teacher') return true;
  const sentAt = new Date(entry.sentAt).getTime();
  return Number.isFinite(sentAt) && now.getTime() - sentAt < 24 * 60 * 60 * 1000;
}

export function recallClassMessage(
  role: AppRole,
  thread: MessageThread,
  messageId: string,
  recalledAt: string,
): MessageThread {
  if (thread.category !== 'class') return thread;
  const now = new Date(recalledAt);
  const target = thread.entries.find(({ id }) => id === messageId);
  if (!target || !canRecallClassMessage(role, target, now)) return thread;
  return {
    ...thread,
    entries: thread.entries.map((entry) => entry.id === messageId
      ? { ...entry, body: '消息已撤回', kind: 'retracted', retractedAt: recalledAt, attachments: undefined, objectCards: undefined }
      : entry),
  };
}

export function formatMessageListTime(iso: string, now: Date): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const clock = `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  const sameDay = value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
  if (sameDay) return clock;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = value.getFullYear() === yesterday.getFullYear()
    && value.getMonth() === yesterday.getMonth()
    && value.getDate() === yesterday.getDate();
  if (isYesterday) return '昨天';
  return `${value.getMonth() + 1}/${value.getDate()}`;
}
