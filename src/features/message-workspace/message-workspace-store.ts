import { createContext, useContext } from 'react';
import type { AppRole } from '@domain/account/role';
import type {
  ClassAgentMessageMetadata,
  MessageAuthorRole,
  MessageCategory,
  MessageThread,
} from '@domain/message/message';
import type { GuidedExplanationContentReference } from '@domain/workbuddy/guided-explanation';
import type { MessageTranslation } from '@contracts/message/im2-services';
import type { MessageMediaAdapter } from '@contracts/message/message-media';
import type { MessageMediaAttachment, MessageMentionRef } from '@domain/message/message-media';
import type { ClassRecord } from '@domain/class/class';
import type { DesktopNotificationPermission, DesktopNotificationResult } from '@contracts/message/message-attention';
import type { MessageDirectoryAdapter } from '@contracts/message/message-directory';
import type { MessageImportantReminder } from '@domain/message/message-attention';
import type { MessageObjectCard } from '@domain/message/message-object-card';
import type { MessageLifecyclePort } from '@contracts/message/message-lifecycle';
import type { MessageConnectionSnapshot, MessageSubmitResult } from '@domain/message/message-lifecycle';
import type { TemporaryClassroomAdapter } from '@contracts/message/temporary-classroom';
import type {
  MessageReactionEmoji,
  MessageReplyReference,
  MessageResourceKind,
  MessageResourceRef,
  MessageSearchFilters,
  MessageSearchResult,
} from '@domain/message/im2-basic';

export type MessageTranslationState =
  | { status: 'loading'; targetLocale: MessageTranslation['targetLocale'] }
  | { status: 'ready'; translation: MessageTranslation }
  | { status: 'error'; targetLocale: MessageTranslation['targetLocale']; message: string };

export type MessageHistoryLoadState = Readonly<{
  status: 'idle' | 'loading' | 'ready' | 'error';
  cursor: string | null;
  message?: string;
}>;

export type MessageAppendOptions = {
  role: AppRole;
  authorName: string;
  threadId: string;
  body: string;
  sentAt: string;
  kind?: 'text' | 'emoji';
  messageId?: string;
  authorRole?: MessageAuthorRole;
  classAgent?: ClassAgentMessageMetadata;
  contentReference?: GuidedExplanationContentReference;
  replyTo?: MessageReplyReference;
  resources?: readonly MessageResourceRef[];
  attachments?: readonly MessageMediaAttachment[];
  mentions?: readonly MessageMentionRef[];
  objectCards?: readonly MessageObjectCard[];
};

export type MessageWorkspaceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    threads: ReadonlyArray<MessageThread>;
    mutedThreadIds: ReadonlySet<string>;
    translationByMessageId: Readonly<Record<string, MessageTranslationState>>;
    classRecords: ReadonlyArray<ClassRecord>;
    importantReminders: ReadonlyArray<MessageImportantReminder>;
    dismissedReminderIds: ReadonlySet<string>;
    readMentionItemIds: ReadonlySet<string>;
    readBoundaryByRoleThread: Readonly<Record<string, string | null>>;
    desktopNotificationPermission: DesktopNotificationPermission;
    connection: MessageConnectionSnapshot;
    historyByThreadId: Readonly<Record<string, MessageHistoryLoadState>>;
  };

export type MessageWorkspaceActions = {
  readThread: (role: AppRole, threadId: string) => void;
  readCategory: (role: AppRole, category: MessageCategory) => void;
  loadOlderMessages: (role: AppRole, threadId: string) => Promise<void>;
  appendMessage: (options: MessageAppendOptions) => void;
  submitMessage: (options: MessageAppendOptions & { clientRequestId?: string }) => Promise<MessageSubmitResult>;
  retryMessage: (role: AppRole, threadId: string, messageId: string) => Promise<MessageSubmitResult | null>;
  syncAndRetryMessage: (role: AppRole, threadId: string, messageId: string) => Promise<MessageSubmitResult | null>;
  reconnect: () => Promise<MessageConnectionSnapshot>;
  togglePin: (threadId: string, messageId: string) => void;
  recallMessage: (role: AppRole, threadId: string, messageId: string, recalledAt: string) => void;
  toggleMute: (threadId: string) => void;
  toggleReaction: (threadId: string, messageId: string, actorId: string, emoji: MessageReactionEmoji) => void;
  searchMessages: (thread: MessageThread, filters: MessageSearchFilters) => Promise<readonly MessageSearchResult[]>;
  searchResources: (options: { threadId: string; classId?: string; query: string; kind: MessageResourceKind | 'all' }) => Promise<readonly MessageResourceRef[]>;
  translateMessage: (messageId: string, sourceBody: string, targetLocale: MessageTranslation['targetLocale']) => Promise<void>;
  clearTranslation: (messageId: string) => void;
  dismissReminder: (reminderId: string) => void;
  readMentionItem: (itemId: string) => void;
  requestDesktopNotificationPermission: () => Promise<DesktopNotificationPermission>;
  sendTestDesktopNotification: () => Promise<DesktopNotificationResult>;
};

export type MessageWorkspaceStore = {
  state: MessageWorkspaceState;
  actions: MessageWorkspaceActions;
  mediaAdapter: MessageMediaAdapter;
  directoryAdapter: MessageDirectoryAdapter;
  temporaryClassroomAdapter: TemporaryClassroomAdapter;
  lifecyclePort: MessageLifecyclePort;
};

export const MessageWorkspaceContext = createContext<MessageWorkspaceStore | null>(null);

export function useMessageWorkspaceStore(): MessageWorkspaceStore {
  const store = useContext(MessageWorkspaceContext);
  if (!store) throw new Error('useMessageWorkspaceStore must be used within MessageWorkspaceProvider');
  return store;
}

export function useMessageThreads(): ReadonlyArray<MessageThread> {
  const { state } = useMessageWorkspaceStore();
  return state.status === 'ready' ? state.threads : [];
}
