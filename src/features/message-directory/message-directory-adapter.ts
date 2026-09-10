import type { AppRole } from '@domain/account/role';
import type { DirectoryCommandResult, MessageDirectoryAdapter } from '@contracts/message/message-directory';
import type { MessageDirectorySnapshot } from '@domain/message/message-directory';
import { MESSAGE_DIRECTORY_SNAPSHOT } from '@mocks/scenarios/message-directory';

const cloneSnapshot = (snapshot: MessageDirectorySnapshot): MessageDirectorySnapshot => structuredClone(snapshot);

export function createMemoryMessageDirectoryAdapter(
  initial: MessageDirectorySnapshot = MESSAGE_DIRECTORY_SNAPSHOT,
): MessageDirectoryAdapter {
  let snapshot = cloneSnapshot(initial);

  const result = (status: DirectoryCommandResult['status'], message: string): DirectoryCommandResult => ({
    status,
    message,
    snapshot: cloneSnapshot(snapshot),
  });

  const findVisiblePerson = (role: AppRole, personId: string) => snapshot.people.find(({ id, visibleTo }) => (
    id === personId && visibleTo.includes(role)
  ));

  return {
    getSnapshot: () => cloneSnapshot(snapshot),
    saveRemark(role, personId, remark) {
      const person = findVisiblePerson(role, personId);
      if (!person) return result('not-found', '联系人当前不可用。');
      const normalized = remark.trim().slice(0, 24);
      if ((person.remark ?? '') === normalized) return result('unchanged', '备注没有变化。');
      snapshot = {
        ...snapshot,
        people: snapshot.people.map((item) => item.id === personId ? { ...item, remark: normalized || undefined } : item),
      };
      return result('success', normalized ? '备注已保存到本地演示目录。' : '备注已清除。');
    },
    requestFriend(role, personId) {
      const person = findVisiblePerson(role, personId);
      if (!person) return result('not-found', '联系人当前不可用。');
      if (person.friendState === 'friend' || person.friendState === 'accepted') return result('unchanged', '你们已经是好友。');
      if (person.friendState === 'pending') return result('unchanged', '好友申请正在等待处理。');
      const eventId = `friend-event-outgoing-${role}-${personId}`;
      snapshot = {
        ...snapshot,
        people: snapshot.people.map((item) => item.id === personId ? { ...item, friendState: 'pending' } : item),
        friendEvents: snapshot.friendEvents.some(({ id }) => id === eventId)
          ? snapshot.friendEvents
          : [...snapshot.friendEvents, {
            id: eventId,
            personId,
            createdAt: '2026-09-09T20:00:00+08:00',
            status: 'pending',
            direction: 'outgoing',
            visibleTo: [role],
          }],
      };
      return result('success', '好友申请已记录在本地演示目录，未发送到 ClassIn。');
    },
    resolveFriendEvent(role, eventId, resolution) {
      const event = snapshot.friendEvents.find(({ id, visibleTo }) => id === eventId && visibleTo.includes(role));
      if (!event) return result('not-found', '好友事件当前不可用。');
      if (event.direction !== 'incoming') return result('forbidden', '发出的申请不能在这里处理。');
      if (event.status !== 'pending') return result('unchanged', '这条好友申请已经处理。');
      snapshot = {
        ...snapshot,
        people: snapshot.people.map((person) => person.id === event.personId
          ? { ...person, friendState: resolution === 'accept' ? 'friend' : 'none' }
          : person),
        friendEvents: snapshot.friendEvents.map((item) => item.id === eventId
          ? { ...item, status: resolution === 'accept' ? 'accepted' : 'ignored' }
          : item),
      };
      return result('success', resolution === 'accept'
        ? '已在本地演示目录中接受好友申请。'
        : '已在本地演示目录中忽略好友申请。');
    },
    reset() {
      snapshot = cloneSnapshot(initial);
      return cloneSnapshot(snapshot);
    },
  };
}
