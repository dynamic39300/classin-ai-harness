import { getMessageEntryPreview, type MessageEntry, type MessageThread } from './message';

export const MESSAGE_REACTION_OPTIONS = ['👍', '❤️', '👏'] as const;

export type MessageReactionEmoji = typeof MESSAGE_REACTION_OPTIONS[number];

export type MessageReplyReference = Readonly<{
  messageId: string;
  authorName: string;
  bodyPreview: string;
}>;

export type MessageReaction = Readonly<{
  emoji: MessageReactionEmoji;
  actorIds: readonly string[];
}>;

export type MessageResourceKind = 'image' | 'document' | 'courseware' | 'link';
export type MessageResourceSource = 'conversation' | 'class-space';

export type MessageResourceRef = Readonly<{
  id: string;
  name: string;
  kind: MessageResourceKind;
  source: MessageResourceSource;
  sizeLabel: string;
  updatedAt: string;
  truthLabel: 'SIMULATED';
}>;

export const MESSAGE_RESOURCE_SELECTION_LIMIT = 10;

export type MessageResourceDraftResult = Readonly<{
  status: 'added' | 'duplicate' | 'limit-reached';
  resources: readonly MessageResourceRef[];
}>;

export type MessageSearchFilters = Readonly<{
  query: string;
  senderName?: string;
  from?: string;
  to?: string;
}>;

export type MessageSearchResult = Readonly<{
  messageId: string;
  authorName: string;
  bodyPreview: string;
  sentAt: string;
}>;

export function createReplyReference(entry: MessageEntry): MessageReplyReference | null {
  if (entry.kind === 'system') return null;
  return Object.freeze({
    messageId: entry.id,
    authorName: entry.authorName,
    bodyPreview: getMessageEntryPreview(entry).slice(0, 96),
  });
}

export function toggleMessageReaction(
  thread: MessageThread,
  messageId: string,
  actorId: string,
  emoji: MessageReactionEmoji,
): MessageThread {
  const target = thread.entries.find((entry) => entry.id === messageId);
  if (!target || target.kind === 'system' || target.kind === 'retracted') return thread;
  const reactions = target.reactions ?? [];
  const current = reactions.find((reaction) => reaction.emoji === emoji);
  const alreadySelected = current?.actorIds.includes(actorId) ?? false;
  const nextActors = alreadySelected
    ? current?.actorIds.filter((id) => id !== actorId) ?? []
    : [...(current?.actorIds ?? []), actorId];
  const nextReactions = reactions
    .filter((reaction) => reaction.emoji !== emoji)
    .concat(nextActors.length ? [{ emoji, actorIds: nextActors }] : []);
  return {
    ...thread,
    entries: thread.entries.map((entry) => entry.id === messageId
      ? { ...entry, reactions: nextReactions }
      : entry),
  };
}

export function searchThreadEntries(
  thread: MessageThread,
  filters: MessageSearchFilters,
): MessageSearchResult[] {
  const normalized = filters.query.trim().toLocaleLowerCase();
  const from = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return [...(thread.olderEntries ?? []), ...thread.entries]
    .filter((entry) => entry.kind !== 'system')
    .filter((entry) => !filters.senderName || entry.authorName === filters.senderName)
    .filter((entry) => {
      const sentAt = new Date(entry.sentAt).getTime();
      return Number.isFinite(sentAt) && sentAt >= from && sentAt <= to;
    })
    .filter((entry) => !normalized || entry.body.toLocaleLowerCase().includes(normalized))
    .map((entry) => Object.freeze({
      messageId: entry.id,
      authorName: entry.authorName,
      bodyPreview: entry.body.slice(0, 120),
      sentAt: entry.sentAt,
    }))
    .sort((left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime());
}

export function filterConversationResources(
  resources: readonly MessageResourceRef[],
  query: string,
  kind: MessageResourceKind | 'all',
): MessageResourceRef[] {
  const normalized = query.trim().toLocaleLowerCase();
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.id)) return false;
    seen.add(resource.id);
    if (kind !== 'all' && resource.kind !== kind) return false;
    return !normalized || resource.name.toLocaleLowerCase().includes(normalized);
  });
}

export function addMessageResourceDraft(
  current: readonly MessageResourceRef[],
  resource: MessageResourceRef,
  limit = MESSAGE_RESOURCE_SELECTION_LIMIT,
): MessageResourceDraftResult {
  if (current.some(({ id }) => id === resource.id)) {
    return Object.freeze({ status: 'duplicate', resources: current });
  }
  if (current.length >= limit) {
    return Object.freeze({ status: 'limit-reached', resources: current });
  }
  return Object.freeze({ status: 'added', resources: Object.freeze([...current, resource]) });
}

export function getMessageResourceFormat(resource: MessageResourceRef): string {
  const dot = resource.name.lastIndexOf('.');
  if (dot <= 0 || dot === resource.name.length - 1) return resource.kind === 'link' ? 'LINK' : 'FILE';
  return resource.name.slice(dot + 1).toLocaleUpperCase();
}
