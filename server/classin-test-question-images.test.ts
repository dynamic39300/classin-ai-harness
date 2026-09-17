// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import { questionImageRefs, readQuestionImage } from './classin-test-question-images';
import { classInTestMiddleware } from './classin-test-middleware';
import type { ClassInTransport } from './classin-test-transport';
const topic = { topicId: 9001, topicSource: 2, updatedAt: 1, sensitive: 0, permissions: ['check', 'download'], content: '<p><img src="/upload/files/file01/202609/q.png" width="600"></p>' };
const source = { paperInfo: { paper: [{ topicInfos: [{ topicId: 9001, topicSource: 0 }] }] } };
const ref = questionImageRefs('1001', topic, 0)[0]!.ref;
const request = { activityId: '1001', topicId: '9001', imageRef: ref };
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const transport = (value: unknown = topic): ClassInTransport => async () => ({ list: [value] });
describe('authorized exam question images', () => {
  it('reads current paper image without passing business credentials or URLs to the browser', async () => {
    const read = vi.fn(transport()); const download = vi.fn<typeof fetch>(async () => new Response(png));
    const file = await readQuestionImage(read, source, request, download);
    expect(file.mimeType).toBe('image/png'); expect(Buffer.from(file.bytes)).toEqual(png);
    expect(read).toHaveBeenCalledWith('/question-bank-business-service/topic/batchGet', { topicQuery: '[{"topicId":9001,"topicSource":0}]' });
    expect(download).toHaveBeenCalledWith('https://wsevlf001.eeo.im/upload/files/file01/202609/q.png', expect.objectContaining({ redirect: 'error' }));
    expect(download.mock.calls[0]?.[1]).not.toHaveProperty('headers');
    expect(JSON.stringify(questionImageRefs('1001', topic, 0))).not.toContain('upload/');
  });
  it.each([{ sensitive: 1 }, { sensitive: undefined }, { permissions: ['check'] }, { permissions: ['download'] }, { updatedAt: 2 }, { topicId: 9002 }, { topicSource: 1 }, { content: topic.content + 'new version' }])('rejects changed permissions, question or version before downloading %j', async (change) => {
    const download = vi.fn<typeof fetch>();
    await expect(readQuestionImage(transport({ ...topic, ...change }), source, request, download)).rejects.toMatchObject({ code: 'forbidden' });
    expect(download).not.toHaveBeenCalled();
  });
  it.each(['https://evil.test/a.png', '//evil.test/a.png', '/upload/files/file01/../a.png', '/upload/files/file01/%2e%2e/a.png', '/upload/files/file01/a.svg', '/upload/files/file01/a.png?x=y'])('does not grant unsafe or unsupported sources %s', (path) => {
    expect(questionImageRefs('1001', { ...topic, content: `<img src="${path}">` }, 0)).toEqual([]);
  });
  it('does not guess unquoted, ambiguous, excessive or missing image sources', () => {
    for (const content of ['<img src=/upload/files/file01/a.png>', '<img data-src="/upload/files/file01/a.png">', '<img src="/upload/files/file01/a.png" src="/upload/files/file01/b.png">', topic.content.repeat(11), 'x'.repeat(100_001)]) expect(questionImageRefs('1001', { ...topic, content }, 0)).toEqual([]);
  });
  it('does not mistake src text inside an attribute or an extra unquoted attribute for a valid image grant', () => {
    for (const content of ["<img alt=' src=\"/upload/files/file01/a.png\"'>", '<img src="/upload/files/file01/a.png" src=/upload/files/file01/b.png>']) expect(questionImageRefs('1001', { ...topic, content }, 0)).toEqual([]);
    expect(questionImageRefs('1001', { ...topic, content: '<img alt="a picture" src="/upload/files/file01/a.png" width="600" />' }, 0)).toHaveLength(1);
  });
  it('denies changed paper, duplicate topic references and another activity reference', async () => {
    const read = vi.fn(transport());
    await expect(readQuestionImage(read, { paperInfo: { paper: [{ topicInfos: [{ topicId: 9002, topicSource: 2 }] }] } }, request)).rejects.toMatchObject({ code: 'forbidden' });
    expect(read).not.toHaveBeenCalled();
    await expect(readQuestionImage(read, { paperInfo: { paper: [{ topicInfos: [{ topicId: 9001, topicSource: 2 }] }] } }, request)).rejects.toMatchObject({ code: 'forbidden' });
    expect(read).not.toHaveBeenCalled();
    expect(questionImageRefs('1001', topic, 2)).toEqual([]);
    await expect(readQuestionImage(read, { paperInfo: { paper: [...source.paperInfo.paper, ...source.paperInfo.paper] } }, request)).rejects.toMatchObject({ code: 'incomplete' });
    await expect(readQuestionImage(read, source, { ...request, activityId: '1002' })).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('rejects incomplete topic results and non-image bodies', async () => {
    await expect(readQuestionImage(async () => ({ list: [] }), source, request)).rejects.toMatchObject({ code: 'incomplete' });
    await expect(readQuestionImage(transport(), source, request, async () => new Response('<html>login</html>'))).rejects.toMatchObject({ code: 'schema_error' });
    await expect(readQuestionImage(transport(), source, request, async () => new Response(png, { status: 302 }))).rejects.toMatchObject({ code: 'upstream_error' });
  });
  it('serves image bytes on the same-origin route and refuses identity or URL overrides', async () => {
    const unavailable = async (): Promise<never> => { throw new Error('unused'); };
    const questionResource = vi.fn(async () => ({ bytes: png, mimeType: 'image/png', name: '题图.png', sha256: 'hash' }));
    const middleware = classInTestMiddleware({ scene: unavailable, detail: unavailable, submissionResource: unavailable, resource: unavailable, replayStream: unavailable, questionResource });
    const server = createServer((req, res) => { void middleware(req, res, () => res.writeHead(404).end()); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw Error('No port');
      const url = `http://127.0.0.1:${address.port}/api/classin-test/question-resource?activityId=1001&topicId=9001&imageRef=${ref}`;
      for (const suffix of ['&uid=2', '&url=https://evil.test/a.png']) expect((await fetch(url + suffix)).status).toBe(403);
      expect(questionResource).not.toHaveBeenCalled();
      const result = await fetch(url); expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toBe('no-store'); expect(result.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await result.arrayBuffer())).toEqual(png); expect(questionResource).toHaveBeenCalledWith('1001', '9001', ref);
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
});
