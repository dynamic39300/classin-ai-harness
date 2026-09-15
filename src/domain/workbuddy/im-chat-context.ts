import type { ImChatContext, ImChatReadResult } from '@contracts/workbuddy/im-chat-context';

/** Select from the authorized read, not from the visible six-message viewport. */
export function selectImChatContext(read: ImChatReadResult, query = '', referenceId?: string): ImChatContext {
  const to = Date.parse(read.capturedAt);
  const twoDays = /两天|2天|48\s*小时/u.test(query);
  const from = twoDays ? /48\s*小时/u.test(query)
    ? to - 48 * 3600_000
    : Math.floor((to + 8 * 3600_000) / 86400_000) * 86400_000 - 8 * 3600_000 - 86400_000 : undefined;
  const messages = [...new Map(read.messages.map(message => [message.id, message])).values()]
    .filter(message => Number.isFinite(Date.parse(message.sentAt)) && Date.parse(message.sentAt) <= to)
    .sort((a, b) => Date.parse(a.sentAt) - Date.parse(b.sentAt));
  const windowMessages = messages.filter(message => from === undefined || Date.parse(message.sentAt) >= from);
  // Bound model input, explicitly reporting partial coverage; original quoted messages are background.
  const selected = windowMessages.slice(-120);
  const references = new Set(selected.flatMap(message => message.replyToId ? [message.replyToId] : []));
  if (referenceId) references.add(referenceId);
  const reference = messages.find(message => message.id === referenceId);
  if (reference?.replyToId) references.add(reference.replyToId);
  const selectedIds = new Set(selected.map(message => message.id));
  const background = messages.filter(message => references.has(message.id) && !selectedIds.has(message.id));
  const result = [...background, ...selected];
  return {
    capturedAt: read.capturedAt, from: from === undefined ? undefined : new Date(from).toISOString(),
    complete: read.complete && selected.length === windowMessages.length && result.every(message => !message.hasUnreadMedia && message.body.length <= 4000),
    omittedCount: windowMessages.length - selected.length,
    referenceId,
    messages: result.map(message => ({ ...message, body: message.retracted ? '消息已撤回' : message.body.slice(0, 4000) })),
  };
}

export function referencedChatChanged(before: ImChatContext | undefined, after: ImChatContext | undefined): boolean {
  if (!before?.referenceId) return false;
  if (!after) return true;
  const original = before.messages.find(message => message.id === before.referenceId);
  const current = after.messages.find(message => message.id === before.referenceId);
  if (!original || !current || current.retracted || original.body !== current.body) return true;
  // Conservative: new messages may affect a reply even without an explicit replyTo link.
  const previousIds = new Set(before.messages.map(message => message.id));
  return after.messages.some(message => !previousIds.has(message.id) && Date.parse(message.sentAt) >= Date.parse(original.sentAt));
}
