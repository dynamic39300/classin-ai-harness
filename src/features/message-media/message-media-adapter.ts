import type {
  MessageCaptureFrame,
  MessageMediaAdapter,
  MessageMediaIngestResult,
  MessageMediaInput,
  MessageScreenSelection,
} from '@contracts/message/message-media';
import {
  MESSAGE_IMAGE_POLICY,
  type MessageImageMimeType,
  type MessageMediaAttachment,
  type MessageMediaDraft,
} from '@domain/message/message-media';

const ACCEPTED_TYPES = new Set<string>(MESSAGE_IMAGE_POLICY.acceptedMimeTypes);
let nextLocalMediaId = 1;

function createId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${nextLocalMediaId++}`;
  return `${prefix}-${suffix}`;
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function normalizeSelection(frame: MessageCaptureFrame, selection: MessageScreenSelection): MessageScreenSelection {
  const x = Math.max(0, Math.min(frame.width - 1, Math.round(selection.x)));
  const y = Math.max(0, Math.min(frame.height - 1, Math.round(selection.y)));
  return Object.freeze({
    x,
    y,
    width: Math.max(1, Math.min(frame.width - x, Math.round(selection.width))),
    height: Math.max(1, Math.min(frame.height - y, Math.round(selection.height))),
  });
}

function waitForImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('截图图像无法读取，请重试。'));
    image.src = source;
  });
}

async function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => {
    if (value) resolve(value);
    else reject(new Error('截图裁剪失败，请重试。'));
  }, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

type AdapterOptions = Readonly<{
  captureFixture?: Readonly<{ contentUrl: string; width: number; height: number }>;
}>;

function createAdapter(options: AdapterOptions, browserCapture: boolean): MessageMediaAdapter {
  const contentByRef = new Map<string, string>();

  const store = (contentUrl: string, prefix: string): string => {
    const ref = `${prefix}:${createId('content')}`;
    contentByRef.set(ref, contentUrl);
    return ref;
  };

  const resolveContent = (contentRef: string): string | null => contentByRef.get(contentRef)
    ?? (/^(?:data:|blob:|\/)/u.test(contentRef) ? contentRef : null);

  const ingestImages = async (
    inputs: readonly MessageMediaInput[],
    existing: readonly MessageMediaDraft[],
  ): Promise<MessageMediaIngestResult> => {
    const accepted: MessageMediaDraft[] = [];
    const rejected: string[] = [];
    let totalBytes = existing.reduce((total, item) => total + item.byteSize, 0);

    for (const input of inputs) {
      if (existing.length + accepted.length >= MESSAGE_IMAGE_POLICY.maxCount) {
        rejected.push(`最多添加 ${MESSAGE_IMAGE_POLICY.maxCount} 张图片。`);
        break;
      }
      if (!ACCEPTED_TYPES.has(input.mimeType)) {
        rejected.push(`${input.name} 不是支持的 PNG、JPEG、WebP 或 GIF 图片。`);
        continue;
      }
      if (input.byteSize > MESSAGE_IMAGE_POLICY.maxBytesPerImage) {
        rejected.push(`${input.name} 超过 8 MB。`);
        continue;
      }
      if (totalBytes + input.byteSize > MESSAGE_IMAGE_POLICY.maxTotalBytes) {
        rejected.push('图片总大小不能超过 20 MB。');
        continue;
      }
      try {
        const bytes = await input.read();
        const contentRef = store(bytesToDataUrl(bytes, input.mimeType), 'image');
        accepted.push(Object.freeze({
          id: createId('draft'),
          kind: 'image',
          name: input.name,
          mimeType: input.mimeType as MessageImageMimeType,
          byteSize: input.byteSize,
          contentRef,
          source: input.source,
        }));
        totalBytes += input.byteSize;
      } catch {
        rejected.push(`${input.name} 读取失败，请重新选择。`);
      }
    }
    return Object.freeze({ drafts: accepted, rejected });
  };

  const commit = async (drafts: readonly MessageMediaDraft[]): Promise<readonly MessageMediaAttachment[]> => {
    const resolved = drafts.map(({ contentRef }) => resolveContent(contentRef));
    if (resolved.some((contentUrl) => contentUrl === null)) throw new Error('图片草稿已失效，请重新添加。');
    return drafts.map((draft, index) => Object.freeze({
      ...draft,
      contentRef: store(resolved[index] ?? '', 'attachment'),
    }));
  };

  const captureScreen = async (): Promise<MessageCaptureFrame> => {
    if (options.captureFixture) {
      return Object.freeze({
        id: createId('capture'),
        contentRef: store(options.captureFixture.contentUrl, 'capture'),
        width: options.captureFixture.width,
        height: options.captureFixture.height,
        mimeType: 'image/png',
      });
    }
    if (!browserCapture || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('当前浏览器不支持屏幕截图，请使用上传图片。');
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      if (!video.videoWidth || !video.videoHeight) {
        await new Promise<void>((resolve) => video.addEventListener('loadedmetadata', () => resolve(), { once: true }));
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const bytes = await canvasToBytes(canvas);
      return Object.freeze({
        id: createId('capture'),
        contentRef: store(bytesToDataUrl(bytes, 'image/png'), 'capture'),
        width: canvas.width,
        height: canvas.height,
        mimeType: 'image/png',
      });
    } finally {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const cropCapture = async (frame: MessageCaptureFrame, selection: MessageScreenSelection): Promise<MessageMediaDraft> => {
    const source = contentByRef.get(frame.contentRef);
    if (!source) throw new Error('截图已失效，请重新截取。');
    const normalized = normalizeSelection(frame, selection);
    if (!browserCapture && options.captureFixture) {
      const bytes = dataUrlToBytes(options.captureFixture.contentUrl);
      return Object.freeze({
        id: createId('draft'),
        kind: 'image',
        name: '屏幕截图.png',
        mimeType: 'image/png',
        byteSize: bytes.byteLength,
        contentRef: store(options.captureFixture.contentUrl, 'image'),
        source: 'screenshot',
        width: normalized.width,
        height: normalized.height,
      });
    }
    const image = await waitForImage(source);
    const canvas = document.createElement('canvas');
    canvas.width = normalized.width;
    canvas.height = normalized.height;
    canvas.getContext('2d')?.drawImage(
      image,
      normalized.x,
      normalized.y,
      normalized.width,
      normalized.height,
      0,
      0,
      normalized.width,
      normalized.height,
    );
    const bytes = await canvasToBytes(canvas);
    return Object.freeze({
      id: createId('draft'),
      kind: 'image',
      name: '屏幕截图.png',
      mimeType: 'image/png',
      byteSize: bytes.byteLength,
      contentRef: store(bytesToDataUrl(bytes, 'image/png'), 'image'),
      source: 'screenshot',
      width: normalized.width,
      height: normalized.height,
    });
  };

  return Object.freeze({
    capabilities: Object.freeze({
      captureScreen: browserCapture
        ? typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)
        : Boolean(options.captureFixture),
      hideCurrentWindow: false,
    }),
    ingestImages,
    commit,
    captureScreen,
    cropCapture,
    resolveContent,
    releaseDrafts: (drafts: readonly MessageMediaDraft[]) => drafts.forEach((draft) => {
      if (draft.source !== 'emoji') contentByRef.delete(draft.contentRef);
    }),
    releaseAttachments: (attachments: readonly MessageMediaAttachment[]) => attachments.forEach((attachment) => contentByRef.delete(attachment.contentRef)),
    releaseCapture: (frame: MessageCaptureFrame) => { contentByRef.delete(frame.contentRef); },
    dispose: () => contentByRef.clear(),
  });
}

export function createMessageMediaInput(
  file: File,
  source: MessageMediaInput['source'],
): MessageMediaInput {
  return Object.freeze({
    name: file.name || `粘贴图片-${Date.now()}.png`,
    mimeType: file.type,
    byteSize: file.size,
    source,
    read: async () => new Uint8Array(await file.arrayBuffer()),
  });
}

export function createBrowserMessageMediaAdapter(): MessageMediaAdapter {
  return createAdapter({}, true);
}

export function createMemoryMessageMediaAdapter(options: AdapterOptions = {}): MessageMediaAdapter {
  return createAdapter(options, false);
}
