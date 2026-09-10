import type { AppRole } from '@domain/account/role';
import type { ClassRecord } from '@domain/class/class';
import { getMessageEntryPreview, getMessageThreadTitle, type MessageEntry, type MessageThread } from './message';

export type MessageImportantReminder = Readonly<{
  id: string;
  threadId: string;
  sourceMessageId?: string;
  authorName: string;
  body: string;
  createdAt: string;
  expiresAt?: string;
  mentionsEveryone: true;
  truthLabel: 'fixed-demo' | 'read-only-business-data';
}>;

export type ClassAnnouncementProjection = Readonly<{
  id: string;
  classId: string;
  title: string;
  bodyPreview: string;
  authorName: string;
  createdAt: string;
  unread: boolean;
  canManage: boolean;
}>;

export type MessageMentionAttentionItem = Readonly<{
  id: string;
  threadId: string;
  messageId: string;
  classId: string;
  classLabel: string;
  authorName: string;
  sentAt: string;
  bodyPreview: string;
  mentionKind: 'direct' | 'everyone';
  read: boolean;
  unavailable: boolean;
}>;

export const MESSAGE_ATTENTION_ACTOR_IDS: Readonly<Record<AppRole, readonly string[]>> = Object.freeze({
  teacher: Object.freeze(['teacher-wang', 'teacher-001', 'member-wang']),
  'student-family': Object.freeze(['student-li-ming', 'student-001', 'member-li']),
});

export function projectClassAnnouncement(
  role: AppRole,
  thread: MessageThread,
  classes: ReadonlyArray<ClassRecord>,
): ClassAnnouncementProjection | null {
  if (thread.category !== 'class' || !thread.classId) return null;
  const record = classes.find(({ id, visibleTo }) => id === thread.classId && visibleTo.includes(role));
  const announcement = record?.announcements[0];
  if (!record || !announcement) return null;
  const classRole = record.roleByAppRole[role];
  return Object.freeze({
    id: announcement.id,
    classId: record.id,
    title: announcement.title,
    bodyPreview: announcement.body,
    authorName: announcement.authorName,
    createdAt: announcement.createdAt,
    unread: announcement.readByRole[role] === false,
    canManage: classRole === 'headmaster' || classRole === 'teacher',
  });
}

export function projectActiveImportantReminder(
  threadId: string,
  reminders: ReadonlyArray<MessageImportantReminder>,
  dismissedReminderIds: ReadonlySet<string>,
  now: Date,
): MessageImportantReminder | null {
  return reminders
    .filter((reminder) => reminder.threadId === threadId)
    .filter((reminder) => !dismissedReminderIds.has(reminder.id))
    .filter((reminder) => !reminder.expiresAt || new Date(reminder.expiresAt).getTime() > now.getTime())
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

function isDirectMention(entry: MessageEntry, actorIds: ReadonlySet<string>): boolean {
  return entry.mentions?.some((mention) => mention.kind === 'person' && mention.actorId && actorIds.has(mention.actorId)) ?? false;
}

function isEveryoneMention(entry: MessageEntry): boolean {
  return entry.mentions?.some(({ kind }) => kind === 'everyone') ?? false;
}

export function projectMentionAttentionItems(
  role: AppRole,
  threads: ReadonlyArray<MessageThread>,
  readItemIds: ReadonlySet<string>,
  actorIds: readonly string[] = MESSAGE_ATTENTION_ACTOR_IDS[role],
): MessageMentionAttentionItem[] {
  const acceptedActorIds = new Set(actorIds);
  const items: MessageMentionAttentionItem[] = [];
  for (const thread of threads) {
    if (thread.category !== 'class' || !thread.classId || !thread.visibleTo.includes(role)) continue;
    for (const entry of [...(thread.olderEntries ?? []), ...thread.entries]) {
      if (entry.authorRole === role || entry.authorRole === 'class-agent') continue;
      const direct = isDirectMention(entry, acceptedActorIds);
      const everyone = isEveryoneMention(entry);
      if (!direct && !everyone) continue;
      const id = `${role}:${thread.id}:${entry.id}`;
      items.push(Object.freeze({
        id,
        threadId: thread.id,
        messageId: entry.id,
        classId: thread.classId,
        classLabel: getMessageThreadTitle(role, thread),
        authorName: entry.authorName,
        sentAt: entry.sentAt,
        bodyPreview: entry.kind === 'retracted' ? '消息已撤回' : getMessageEntryPreview(entry),
        mentionKind: direct ? 'direct' : 'everyone',
        read: readItemIds.has(id),
        unavailable: entry.kind === 'retracted',
      }));
    }
  }
  return items.sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime());
}

export function getUnreadMentionCount(items: ReadonlyArray<MessageMentionAttentionItem>): number {
  return items.filter(({ read }) => !read).length;
}

export function captureNewMessageBoundary(thread: MessageThread, role: AppRole): string | null {
  const unread = thread.unreadByRole[role] ?? 0;
  if (unread <= 0 || thread.entries.length === 0) return null;
  return thread.entries[Math.max(0, thread.entries.length - unread)]?.id ?? null;
}

export function correctNewMessageBoundary(thread: MessageThread, messageId: string | null): string | null {
  if (!messageId) return null;
  if (thread.entries.some(({ id }) => id === messageId)) return messageId;
  return thread.entries[0]?.id ?? null;
}

export type DesktopNotificationRouteInput = Readonly<{
  permission: 'unsupported' | 'prompt' | 'granted' | 'denied' | 'failed';
  appVisible: boolean;
  activeThreadId: string | null;
  targetThreadId: string;
  muted: boolean;
  mentionKind: 'direct' | 'everyone' | null;
}>;

export function shouldDeliverDesktopNotification(input: DesktopNotificationRouteInput): boolean {
  if (input.permission !== 'granted') return false;
  if (input.appVisible && input.activeThreadId === input.targetThreadId) return false;
  if (input.muted && input.mentionKind === null) return false;
  return true;
}
