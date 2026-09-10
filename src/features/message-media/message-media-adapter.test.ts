import { describe, expect, it } from 'vitest';
import { MESSAGE_IMAGE_POLICY } from '@domain/message/message-media';
import { createMemoryMessageMediaAdapter } from './message-media-adapter';

const ONE_PIXEL_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const PNG_BYTES = Uint8Array.from(atob(ONE_PIXEL_PNG.split(',')[1] ?? ''), (value) => value.charCodeAt(0));

describe('MessageMediaAdapter', () => {
  it('accepts supported images and commits opaque attachment references', async () => {
    const adapter = createMemoryMessageMediaAdapter();
    const result = await adapter.ingestImages([{
      name: '实验图.png',
      mimeType: 'image/png',
      byteSize: PNG_BYTES.byteLength,
      source: 'upload',
      read: async () => PNG_BYTES,
    }], []);

    expect(result.rejected).toEqual([]);
    expect(result.drafts).toHaveLength(1);
    const attachments = await adapter.commit(result.drafts);
    expect(attachments[0]).toMatchObject({ kind: 'image', name: '实验图.png', source: 'upload' });
    expect(adapter.resolveContent(attachments[0]?.contentRef ?? '')).toMatch(/^data:image\/png/u);
    adapter.releaseDrafts(result.drafts);
    expect(adapter.resolveContent(result.drafts[0]?.contentRef ?? '')).toBeNull();
    expect(adapter.resolveContent(attachments[0]?.contentRef ?? '')).toMatch(/^data:image\/png/u);
    adapter.releaseAttachments(attachments);
    expect(adapter.resolveContent(attachments[0]?.contentRef ?? '')).toBeNull();
  });

  it('enforces count and per-image policy without reading rejected files', async () => {
    const adapter = createMemoryMessageMediaAdapter();
    let reads = 0;
    const tooLarge = await adapter.ingestImages([{
      name: '过大.png', mimeType: 'image/png', byteSize: MESSAGE_IMAGE_POLICY.maxBytesPerImage + 1, source: 'clipboard', read: async () => { reads += 1; return PNG_BYTES; },
    }], []);
    expect(tooLarge.rejected).toEqual(['过大.png 超过 8 MB。']);
    expect(reads).toBe(0);

    const existing = Array.from({ length: MESSAGE_IMAGE_POLICY.maxCount }, (_, index) => ({
      id: `draft-${index}`, kind: 'image' as const, name: `${index}.png`, mimeType: 'image/png' as const,
      byteSize: 1, contentRef: `/media/${index}.png`, source: 'upload' as const,
    }));
    const overCount = await adapter.ingestImages([{
      name: 'extra.png', mimeType: 'image/png', byteSize: 1, source: 'upload', read: async () => PNG_BYTES,
    }], existing);
    expect(overCount.rejected).toEqual(['最多添加 4 张图片。']);

    const nearTotal = [{
      id: 'existing-total', kind: 'image' as const, name: '已有.png', mimeType: 'image/png' as const,
      byteSize: MESSAGE_IMAGE_POLICY.maxTotalBytes, contentRef: '/media/existing.png', source: 'upload' as const,
    }];
    const overTotal = await adapter.ingestImages([{
      name: 'one-more.png', mimeType: 'image/png', byteSize: 1, source: 'upload', read: async () => PNG_BYTES,
    }], nearTotal);
    expect(overTotal.rejected).toEqual(['图片总大小不能超过 20 MB。']);
  });

  it('exposes deterministic capture and crop through the test adapter', async () => {
    const adapter = createMemoryMessageMediaAdapter({ captureFixture: { contentUrl: ONE_PIXEL_PNG, width: 800, height: 600 } });
    const frame = await adapter.captureScreen();
    const draft = await adapter.cropCapture(frame, { x: 100, y: 80, width: 320, height: 180 });
    expect(adapter.capabilities).toEqual({ captureScreen: true, hideCurrentWindow: false });
    expect(draft).toMatchObject({ source: 'screenshot', width: 320, height: 180 });
    adapter.releaseCapture(frame);
    expect(adapter.resolveContent(frame.contentRef)).toBeNull();
  });
});
