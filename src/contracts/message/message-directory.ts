import type { AppRole } from '@domain/account/role';
import type { MessageDirectorySnapshot } from '@domain/message/message-directory';

export type DirectoryCommandResult = Readonly<{
  status: 'success' | 'unchanged' | 'not-found' | 'forbidden';
  message: string;
  snapshot: MessageDirectorySnapshot;
}>;

export interface MessageDirectoryAdapter {
  getSnapshot(): MessageDirectorySnapshot;
  saveRemark(role: AppRole, personId: string, remark: string): DirectoryCommandResult;
  requestFriend(role: AppRole, personId: string): DirectoryCommandResult;
  resolveFriendEvent(role: AppRole, eventId: string, resolution: 'accept' | 'ignore'): DirectoryCommandResult;
  reset(): MessageDirectorySnapshot;
}
