export const MESSAGE_IMAGE_POLICY = Object.freeze({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const,
  maxCount: 4,
  maxBytesPerImage: 8 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
});

export type MessageImageMimeType = typeof MESSAGE_IMAGE_POLICY.acceptedMimeTypes[number];
export type MessageMediaKind = 'image' | 'video';
export type MessageMediaSource = 'upload' | 'clipboard' | 'screenshot' | 'emoji' | 'fixture';

export type MessageMediaDraft = Readonly<{
  id: string;
  kind: 'image';
  name: string;
  mimeType: MessageImageMimeType | 'image/svg+xml';
  byteSize: number;
  contentRef: string;
  source: Exclude<MessageMediaSource, 'fixture'>;
  width?: number;
  height?: number;
}>;

export type MessageMediaAttachment = Readonly<{
  id: string;
  kind: MessageMediaKind;
  name: string;
  mimeType: string;
  byteSize: number;
  contentRef: string;
  source: MessageMediaSource;
  width?: number;
  height?: number;
  durationSeconds?: number;
  posterRef?: string;
}>;

export type MessageMentionRef = Readonly<{
  id: string;
  kind: 'person' | 'everyone';
  label: string;
  actorId?: string;
}>;

export function getMessageMediaPreview(attachments: readonly MessageMediaAttachment[] | undefined): string {
  if (!attachments?.length) return '';
  const imageCount = attachments.filter(({ kind }) => kind === 'image').length;
  const videoCount = attachments.filter(({ kind }) => kind === 'video').length;
  if (imageCount && videoCount) return `[图片 ${imageCount} 张、视频 ${videoCount} 个]`;
  if (imageCount) return imageCount === 1 ? '[图片]' : `[图片 ${imageCount} 张]`;
  return videoCount === 1 ? '[视频]' : `[视频 ${videoCount} 个]`;
}

export function getMessageContentPreview(options: {
  body: string;
  attachments?: readonly MessageMediaAttachment[];
  resources?: readonly { name: string }[];
}): string {
  return options.body.trim()
    || getMessageMediaPreview(options.attachments)
    || options.resources?.map(({ name }) => name).join('、')
    || '';
}

export function reconcileMessageMentions(
  body: string,
  mentions: readonly MessageMentionRef[],
): readonly MessageMentionRef[] {
  return mentions.filter(({ label }) => body.includes(`@${label}`));
}
