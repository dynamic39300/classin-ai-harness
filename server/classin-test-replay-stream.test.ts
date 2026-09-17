// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { createServer } from 'node:http';
import { openClassInReplayStream } from './classin-test-replay-stream';
import { classInTestMiddleware } from './classin-test-middleware';

const grant = { url: 'https://playback.eeo.im/fixture/replay.mp4', size: 100 };
const movie = Buffer.alloc(grant.size); movie.write('ftyp', 4);
function response(start: number, end: number, status = 206, headers = {}, body = movie.subarray(start, end + 1)) {
  return new Response(body, { status, headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(end - start + 1), ETag: '"version-1"', ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${grant.size}` } : {}), ...headers } });
}
function fetcher(main: () => Response = () => response(0, 99, 200), probe: () => Response = () => response(0, 31)) {
  return vi.fn<typeof fetch>().mockImplementationOnce(async () => probe()).mockImplementationOnce(async () => main());
}
async function consume(body: Readable | null) {
  const chunks: Buffer[] = []; if (body) for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
describe('classroom replay streaming contract', () => {
  it.each([[undefined, 0, 99, 200], ['bytes=40-49', 40, 49, 206], ['bytes=90-', 90, 99, 206], ['bytes=-5', 95, 99, 206]] as const)('streams %s with exact identity and byte range', async (range, start, end, status) => {
    const read = fetcher(() => response(start, end, status));
    const result = await openClassInReplayStream(grant, range, new AbortController().signal, read);
    expect(result.status).toBe(status); expect(await consume(result.body)).toEqual(movie.subarray(start, end + 1));
    expect(result.headers['Content-Length']).toBe(String(end - start + 1));
    expect(result.headers['Cache-Control']).toBe('no-store');
    expect(read.mock.calls[0]?.[1]?.headers).toEqual({ 'Accept-Encoding': 'identity', Range: 'bytes=0-31' });
    expect(read.mock.calls[1]?.[1]?.headers).toEqual({ 'Accept-Encoding': 'identity', 'If-Match': '"version-1"', ...(range ? { Range: `bytes=${start}-${end}` } : {}) });
    expect(read.mock.calls.every(([, init]) => init?.redirect === 'error' && !init.credentials)).toBe(true);
  });
  it.each(['bytes=100-', 'bytes=0-1,4-5', 'bytes=-0'])('rejects invalid range %s before contacting the CDN', async (range) => {
    const read = fetcher(); const result = await openClassInReplayStream(grant, range, new AbortController().signal, read);
    expect(result).toMatchObject({ status: 416, headers: { 'Content-Range': 'bytes */100' }, body: null }); expect(read).not.toHaveBeenCalled();
  });
  it.each([{ ETag: '"changed"' }, { 'Content-Range': 'bytes 41-49/100' }, { 'Content-Length': '11' }, { 'Content-Type': 'text/html' }, { 'Content-Encoding': 'gzip' }])('rejects a changed or malformed main response %j before returning a stream', async (headers) => {
    await expect(openClassInReplayStream(grant, 'bytes=40-49', new AbortController().signal, fetcher(() => response(40, 49, 206, headers)))).rejects.toMatchObject({ code: 'upstream_error' });
  });
  it('rejects ignored range, weak ETag and non-MP4 probe', async () => {
    for (const probe of [() => response(0, 31, 200), () => response(0, 31, 206, { ETag: 'W/"weak"' }), () => response(0, 31, 206, {}, Buffer.alloc(32))]) {
      const read = fetcher(undefined, probe); await expect(openClassInReplayStream(grant, undefined, new AbortController().signal, read)).rejects.toThrow(); expect(read).toHaveBeenCalledTimes(1);
    }
    await expect(openClassInReplayStream(grant, 'bytes=40-49', new AbortController().signal, fetcher(() => response(0, 99, 200)))).rejects.toThrow();
  });
  it.each([9, 11])('fails mid-stream when actual byte count is %s instead of the declared 10', async (length) => {
    const result = await openClassInReplayStream(grant, 'bytes=40-49', new AbortController().signal, fetcher(() => response(40, 49, 206, {}, Buffer.alloc(length))));
    await expect(consume(result.body)).rejects.toMatchObject({ code: 'upstream_error' });
  });
  it('does not eagerly buffer a large media body and forwards client cancellation', async () => {
    let pulled = 0; const cancel = vi.fn(); const large = { ...grant, size: 128 * 1024 * 1024 };
    const body = new ReadableStream<Uint8Array>({ pull(controller) { pulled++; controller.enqueue(new Uint8Array(16 * 1024)); }, cancel });
    const read = fetcher(() => new Response(body, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(large.size), ETag: '"version-1"' } }), () => response(0, 31, 206, { 'Content-Range': `bytes 0-31/${large.size}` }));
    const controller = new AbortController();
    const result = await openClassInReplayStream(large, undefined, controller.signal, read);
    expect(pulled).toBeLessThanOrEqual(1);
    const iterator = result.body![Symbol.asyncIterator](); await iterator.next();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(pulled).toBeLessThan(12); expect(result.body!.readableLength).toBeLessThanOrEqual(64 * 1024);
    controller.abort(); await iterator.return?.();
    expect((read.mock.calls[1]?.[1]?.signal as AbortSignal).aborted).toBe(true); expect(cancel).toHaveBeenCalled();
  });
  it('aborts upstream when the HTTP client disconnects', async () => {
    const unavailable = async (): Promise<never> => { throw new Error('unused'); };
    let upstreamSignal: AbortSignal | undefined; let destroyed = false;
    const replayStream = vi.fn(async (_id: string, _ref: string, _range: string | undefined, signal: AbortSignal) => {
      upstreamSignal = signal;
      const body = new Readable({ read() { this.push(Buffer.alloc(1024)); }, destroy(error, callback) { destroyed = true; callback(error); } });
      return { status: 200 as const, headers: { 'Content-Type': 'video/mp4', 'Content-Length': '134217728' }, body };
    });
    const middleware = classInTestMiddleware({ scene: unavailable, detail: unavailable, submissionResource: unavailable, questionResource: unavailable, resource: unavailable, replayStream });
    const server = createServer((req, res) => { void middleware(req, res, () => res.writeHead(404).end()); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
      const url = `http://127.0.0.1:${address.port}/api/classin-test/replay-resource?activityId=1&replayRef=ref`;
      expect((await fetch(url + '&UID=other')).status).toBe(403); expect(replayStream).not.toHaveBeenCalled();
      const controller = new AbortController(); const result = await fetch(url, { signal: controller.signal });
      expect(result.status).toBe(200); expect(result.headers.get('content-type')).toBe('video/mp4');
      const reader = result.body!.getReader(); const first = await reader.read(); expect(Buffer.from(first.value!).includes(Buffer.from('requestId'))).toBe(false);
      controller.abort(); await reader.cancel().catch(() => {});
      await vi.waitFor(() => { expect(upstreamSignal?.aborted).toBe(true); expect(destroyed).toBe(true); });
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
  it('closes a failed response after headers instead of appending a JSON error to MP4 bytes', async () => {
    const unavailable = async (): Promise<never> => { throw new Error('unused'); };
    const body = new Readable({ read() {} });
    const middleware = classInTestMiddleware({ scene: unavailable, detail: unavailable, submissionResource: unavailable, questionResource: unavailable, resource: unavailable, replayStream: async () => ({ status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Length': '100' }, body }) });
    const server = createServer((req, res) => { void middleware(req, res, () => res.writeHead(404).end()); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address(); if (!address || typeof address === 'string') throw new Error('No port');
      body.push(movie.subarray(0, 32));
      const result = await fetch(`http://127.0.0.1:${address.port}/api/classin-test/replay-resource?activityId=1&replayRef=ref`);
      const reader = result.body!.getReader(); expect(Buffer.from((await reader.read()).value!)).toEqual(movie.subarray(0, 32));
      const next = reader.read(); const rejected = expect(next).rejects.toThrow();
      body.destroy(new Error('PRIVATE-UPSTREAM-FAILURE')); await rejected;
      expect(result.headers.get('content-type')).toBe('video/mp4');
    } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); }
  });
  it('times out pending upstream headers and aborts the fetch', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const read = vi.fn<typeof fetch>((_url, init) => new Promise((_resolve, reject) => {
        signal = init!.signal!; signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      }));
      const result = openClassInReplayStream(grant, undefined, new AbortController().signal, read);
      const rejected = expect(result).rejects.toMatchObject({ code: 'upstream_error' });
      await vi.advanceTimersByTimeAsync(15_000); await rejected; expect(signal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});
