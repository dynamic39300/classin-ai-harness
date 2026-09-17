// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { readClassInResource, resourceByteRange, resourceMime, validatedResourceUrl } from './classin-test-resources';
import type { ClassInTransport } from './classin-test-transport';
import { classInTestMiddleware } from './classin-test-middleware';
const path = 'upload/files/file01/202609/resource.pdf';
const bytes = Buffer.from('%PDF-1.4\nfixture');
const grant = { activityId: '1001', resourceId: '2001', fileId: '3001', name: '数学资料.pdf' };
function transport(overrides: Record<string, unknown> = {}, down = path): ClassInTransport {
  return async (url) => url.endsWith('getFiles') ? { list: [{ lmsFileId: 2001, fileId: 3001, isCloudFile: true, isDel: 0, moderationState: 0, filePath: path, ...overrides }] } : { src: down };
}
describe('ClassIn resource download boundary', () => {
  it('reads the authorized original, validates magic and keeps upstream URLs private', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }));
    const resource = await readClassInResource(transport(), grant, fetcher);
    expect(resource.mimeType).toBe('application/pdf'); expect(Buffer.from(resource.bytes)).toEqual(bytes);
    expect(fetcher).toHaveBeenCalledWith(`https://wsevlf001.eeo.im/${path}`, expect.objectContaining({ redirect: 'error' }));
    expect(JSON.stringify(resource)).not.toContain('eeo.im');
  });
  it.each([{ fileId: 999 }, { lmsFileId: 999 }, { isDel: 1 }, { moderationState: 1 }, { isCloudFile: false }])('does not fetch a mismatched/deleted/unapproved attachment %j', async (change) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(readClassInResource(transport(change), grant, fetcher)).rejects.toMatchObject({ code: 'forbidden' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects changing resource versions before fetching', async () => {
    await expect(readClassInResource(transport({}, 'upload/files/file01/other.pdf'), grant)).rejects.toMatchObject({ code: 'incomplete' });
  });
  it('requires the current file permission when an answer image grant specifies it', async () => {
    for (const permission of [undefined, 1]) {
      const fetcher = vi.fn<typeof fetch>();
      await expect(readClassInResource(transport({ filePermission: permission }), { ...grant, filePermission: 0 }, fetcher)).rejects.toMatchObject({ code: 'forbidden' });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });
  it.each(['https://evil.test/x.pdf', '//evil.test/x.pdf', 'upload/files/file01/../x.pdf', 'upload/files/file01/%2e%2e/x.pdf', 'upload/files/file01/a.html', 'upload/files/file01/a.pdf?next=x'])('rejects unverified resource paths %s', (value) => {
    expect(() => validatedResourceUrl(value)).toThrow();
  });
  it('rejects oversized content and mismatched MIME bytes', async () => {
    await expect(readClassInResource(transport(), grant, async () => new Response(bytes, { headers: { 'content-length': String(21 * 1024 * 1024) } }))).rejects.toMatchObject({ code: 'unsupported' });
    expect(() => resourceMime(Buffer.from('<html>login</html>'), `https://wsevlf001.eeo.im/${path}`)).toThrow();
  });
  it('enforces the size limit even without content-length', async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(20 * 1024 * 1024 + 1)); controller.close(); } });
    await expect(readClassInResource(transport(), grant, async () => new Response(body))).rejects.toMatchObject({ code: 'unsupported' });
  });
  it('supports only satisfiable single byte ranges', () => {
    expect(resourceByteRange('bytes=2-5', 10)).toEqual({ start: 2, end: 5 });
    expect(resourceByteRange('bytes=2-', 10)).toEqual({ start: 2, end: 9 });
    expect(resourceByteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
    for (const value of ['bytes=20-', 'bytes=8-2', 'bytes=-0', 'bytes=0-1,3-5', 'bytes=-']) expect(() => resourceByteRange(value, 10)).toThrow();
  });
  it('serves binary 206/416 without serializing the file as a JSON envelope', async () => {
    const unavailable = async (): Promise<never> => { throw new Error('unused'); };
    const middleware = classInTestMiddleware({ scene: unavailable, detail: unavailable, submissionResource: unavailable, questionResource: unavailable, replayStream: unavailable, resource: async () => ({ bytes, mimeType: 'application/pdf', name: grant.name, sha256: 'hash' }) });
    const server = createServer((req, res) => { void middleware(req, res, () => { res.writeHead(404).end(); }); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
      const url = `http://127.0.0.1:${address.port}/api/classin-test/resource?activityId=1001&resourceId=2001`;
      const partial = await fetch(url, { headers: { Range: 'bytes=0-4' } });
      expect(partial.status).toBe(206); expect(await partial.text()).toBe('%PDF-');
      expect(partial.headers.get('cache-control')).toBe('no-store');
      expect((await fetch(url, { headers: { Range: 'bytes=999-' } })).status).toBe(416);
      expect((await fetch(url + '&UID=999')).status).toBe(403);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});
