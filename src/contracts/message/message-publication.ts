import type { MessagePublicationSnapshot } from '@domain/message/message-publication';

export interface MessagePublicationAdapter {
  getSnapshot(): MessagePublicationSnapshot;
  reset(): MessagePublicationSnapshot;
}
