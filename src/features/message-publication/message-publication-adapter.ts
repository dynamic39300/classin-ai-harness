import type { MessagePublicationAdapter } from '@contracts/message/message-publication';
import type { MessagePublicationSnapshot } from '@domain/message/message-publication';
import { MESSAGE_PUBLICATION_SNAPSHOT } from '@mocks/scenarios/message-publication';

function clone(snapshot: MessagePublicationSnapshot): MessagePublicationSnapshot {
  return Object.freeze({
    officialContents: Object.freeze(snapshot.officialContents.map((item) => Object.freeze({ ...item, body: Object.freeze([...item.body]), visibleTo: Object.freeze([...item.visibleTo]), unreadByRole: Object.freeze({ ...item.unreadByRole }) }))),
  });
}

export function createFixedMessagePublicationAdapter(
  initial: MessagePublicationSnapshot = MESSAGE_PUBLICATION_SNAPSHOT,
): MessagePublicationAdapter {
  const baseline = clone(initial);
  return {
    getSnapshot: () => clone(baseline),
    reset: () => clone(baseline),
  };
}
