import type { PrivateImDemoSnapshot } from '@contracts/workbuddy/private-im-demo';
import { parsePrivateImDemoSnapshot } from '@contracts/workbuddy/private-im-demo';
import type { MessageThread } from '@domain/message/message';

let pending: Promise<PrivateImDemoSnapshot | null> | undefined;

export function loadPrivateImDemoContext(
  request: typeof fetch = fetch,
): Promise<PrivateImDemoSnapshot | null> {
  pending ??= request('/api/teachbuddy/im-demo-context?scope=ideal-full', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }).then(async (response) => {
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('本机真实消息上下文暂时不可用。');
    return parsePrivateImDemoSnapshot(await response.json());
  }).catch(() => null);
  return pending;
}

export function resetPrivateImDemoContextCache() {
  pending = undefined;
}

export function mergePrivateImDemoThread(
  threads: ReadonlyArray<MessageThread>,
  snapshot: PrivateImDemoSnapshot,
): ReadonlyArray<MessageThread> {
  const replacement: MessageThread = {
    id: snapshot.thread.id,
    category: 'class',
    visibleTo: ['teacher'],
    titleByRole: { teacher: snapshot.thread.title },
    subtitleByRole: { teacher: snapshot.thread.subtitle },
    avatarByRole: { teacher: snapshot.thread.avatar },
    updatedAt: snapshot.thread.updatedAt,
    unreadByRole: { teacher: 1 },
    classId: snapshot.thread.classId,
    memberCount: snapshot.thread.memberCount,
    entries: snapshot.thread.entries.map((entry) => ({ ...entry })),
  };
  const found = threads.some(({ id }) => id === replacement.id);
  return found
    ? threads.map((thread) => thread.id === replacement.id ? replacement : thread)
    : [replacement, ...threads];
}
