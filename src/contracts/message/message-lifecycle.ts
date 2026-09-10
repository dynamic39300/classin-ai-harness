import type { AppRole } from '@domain/account/role';
import type { MessageEntry } from '@domain/message/message';
import type {
  MessageConnectionSnapshot,
  MessageSubmitRequest,
  MessageSubmitResult,
  MessageThreadAccess,
} from '@domain/message/message-lifecycle';

export type MessageHistoryPage = Readonly<{
  entries: readonly MessageEntry[];
  nextCursor: string | null;
  truthLabel: 'SIMULATED';
}>;

export type MessageThreadSyncResult = Readonly<{
  threadId: string;
  threadVersion: number;
  truthLabel: 'SIMULATED';
}>;

export interface MessageLifecyclePort {
  getConnection(): MessageConnectionSnapshot;
  reconnect(): Promise<MessageConnectionSnapshot>;
  getThreadAccess(role: AppRole, threadId: string): MessageThreadAccess;
  getCurrentThreadVersion(threadId: string): number;
  submit(request: MessageSubmitRequest): Promise<MessageSubmitResult>;
  syncThread(threadId: string): Promise<MessageThreadSyncResult>;
  getInitialHistoryCursor(threadId: string): string | null;
  loadHistory(input: {
    role: AppRole;
    threadId: string;
    cursor: string;
    limit: number;
  }): Promise<MessageHistoryPage>;
}
