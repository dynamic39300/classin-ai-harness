import type { RuntimeImageInput, RuntimeImageMediaType } from '@contracts/workbuddy/agent-runtime';

export const RUNTIME_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
export const RUNTIME_IMAGE_MAX_COUNT = 4;
export const RUNTIME_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const RUNTIME_IMAGE_MAX_TOTAL_BYTES = 20 * 1024 * 1024;

const mediaTypes = new Set<RuntimeImageMediaType>(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export type RuntimeImageDraft = Readonly<{
  id: string;
  file: File;
  name: string;
  mediaType: RuntimeImageMediaType;
  byteSize: number;
  previewUrl: string;
}>;

export type AppendRuntimeImagesResult = Readonly<{
  attachments: readonly RuntimeImageDraft[];
  error: string;
}>;

const megabytes = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export function appendRuntimeImageDrafts(
  current: readonly RuntimeImageDraft[],
  files: readonly File[],
): AppendRuntimeImagesResult {
  const attachments = [...current];
  let totalBytes = attachments.reduce((sum, attachment) => sum + attachment.byteSize, 0);
  let error = '';

  for (const file of files) {
    if (!mediaTypes.has(file.type as RuntimeImageMediaType)) {
      error ||= '仅支持 PNG、JPG、WebP 或 GIF 图片。';
      continue;
    }
    if (attachments.length >= RUNTIME_IMAGE_MAX_COUNT) {
      error ||= `每次最多添加 ${RUNTIME_IMAGE_MAX_COUNT} 张图片。`;
      continue;
    }
    if (file.size <= 0 || file.size > RUNTIME_IMAGE_MAX_BYTES) {
      error ||= `单张图片不能超过 ${megabytes(RUNTIME_IMAGE_MAX_BYTES)}。`;
      continue;
    }
    if (totalBytes + file.size > RUNTIME_IMAGE_MAX_TOTAL_BYTES) {
      error ||= `本次图片合计不能超过 ${megabytes(RUNTIME_IMAGE_MAX_TOTAL_BYTES)}。`;
      continue;
    }
    const previewUrl = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
    attachments.push({
      id: crypto.randomUUID(),
      file,
      name: file.name || `粘贴的图片.${file.type.split('/')[1] ?? 'png'}`,
      mediaType: file.type as RuntimeImageMediaType,
      byteSize: file.size,
      previewUrl,
    });
    totalBytes += file.size;
  }
  return { attachments, error };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export async function encodeRuntimeImageDrafts(images: readonly RuntimeImageDraft[]): Promise<readonly RuntimeImageInput[]> {
  return Promise.all(images.map(async ({ file, name, mediaType, byteSize }) => ({
    name,
    mediaType,
    byteSize,
    data: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
  })));
}

export function releaseRuntimeImageDrafts(images: readonly RuntimeImageDraft[]) {
  for (const image of images) if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
}
