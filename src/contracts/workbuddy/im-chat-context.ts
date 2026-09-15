export type ImChatMessage = Readonly<{
  id: string;
  sentAt: string;
  authorRole: 'teacher' | 'student-family' | 'class-agent';
  authorName: string;
  body: string;
  replyToId?: string;
  retracted?: boolean;
  hasUnreadMedia?: boolean;
}>;
export type ImChatReadResult = Readonly<{
  threadRef: string;
  capturedAt: string;
  messages: readonly ImChatMessage[];
  complete: boolean;
}>;
export type ImMessageReference = Readonly<{ id: string; authorName: string; sentAt: string; preview: string; requestId: string }>;
export type ImChatContext = Readonly<{
  capturedAt: string;
  from?: string;
  complete: boolean;
  omittedCount: number;
  messages: readonly ImChatMessage[];
  referenceId?: string;
}>;
