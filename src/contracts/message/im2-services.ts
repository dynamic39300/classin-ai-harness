import type { MessageThread } from '@domain/message/message';
import type {
  MessageResourceKind,
  MessageResourceRef,
  MessageSearchFilters,
  MessageSearchResult,
} from '@domain/message/im2-basic';

export type HistorySearchRequest = Readonly<{
  thread: MessageThread;
  filters: MessageSearchFilters;
}>;

export interface MessageHistorySearch {
  search(request: HistorySearchRequest): Promise<readonly MessageSearchResult[]>;
}

export type ResourceSearchRequest = Readonly<{
  threadId: string;
  classId?: string;
  query: string;
  kind: MessageResourceKind | 'all';
}>;

export interface ConversationResourceRepository {
  search(request: ResourceSearchRequest): Promise<readonly MessageResourceRef[]>;
}

export type MessageTranslation = Readonly<{
  messageId: string;
  sourceBody: string;
  targetLocale: 'zh-CN' | 'en';
  translatedBody: string;
  truthLabel: 'SIMULATED';
}>;

export interface MessageTranslationService {
  translate(request: Readonly<{
    messageId: string;
    sourceBody: string;
    targetLocale: MessageTranslation['targetLocale'];
  }>): Promise<MessageTranslation>;
}
