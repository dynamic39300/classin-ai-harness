import type {
  MessageImageMimeType,
  MessageMediaAttachment,
  MessageMediaDraft,
  MessageMediaSource,
} from '@domain/message/message-media';

export type MessageMediaInput = Readonly<{
  name: string;
  mimeType: string;
  byteSize: number;
  source: Extract<MessageMediaSource, 'upload' | 'clipboard' | 'emoji'>;
  read: () => Promise<Uint8Array>;
}>;

export type MessageMediaIngestResult = Readonly<{
  drafts: readonly MessageMediaDraft[];
  rejected: readonly string[];
}>;

export type MessageCaptureFrame = Readonly<{
  id: string;
  contentRef: string;
  width: number;
  height: number;
  mimeType: MessageImageMimeType;
}>;

export type MessageScreenSelection = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export interface MessageMediaAdapter {
  readonly capabilities: Readonly<{
    captureScreen: boolean;
    hideCurrentWindow: boolean;
  }>;
  ingestImages(inputs: readonly MessageMediaInput[], existing: readonly MessageMediaDraft[]): Promise<MessageMediaIngestResult>;
  commit(drafts: readonly MessageMediaDraft[]): Promise<readonly MessageMediaAttachment[]>;
  captureScreen(): Promise<MessageCaptureFrame>;
  cropCapture(frame: MessageCaptureFrame, selection: MessageScreenSelection): Promise<MessageMediaDraft>;
  resolveContent(contentRef: string): string | null;
  releaseDrafts(drafts: readonly MessageMediaDraft[]): void;
  releaseAttachments(attachments: readonly MessageMediaAttachment[]): void;
  releaseCapture(frame: MessageCaptureFrame): void;
  dispose(): void;
}
