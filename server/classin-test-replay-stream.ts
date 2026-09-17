import { Readable } from 'node:stream';
import { ClassInError } from './classin-test-transport.ts';
import { resourceByteRange } from './classin-test-resources.ts';

type Grant = Readonly<{ url: string; size: number }>;
export type ClassInReplayStream = Readonly<{ status: 200 | 206 | 416; headers: Record<string, string>; body: Readable | null }>;
const fail = () => new ClassInError('upstream_error', '课堂回放读取未完成，请重新打开播放器。');

async function request(fetcher: typeof fetch, grant: Grant, headers: Record<string, string>, signal: AbortSignal) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(grant.url, { headers: { 'Accept-Encoding': 'identity', ...headers }, redirect: 'error', signal: AbortSignal.any([signal, controller.signal]) });
    return { response, controller };
  } catch { controller.abort(); throw fail(); }
  finally { clearTimeout(timeout); }
}
async function* chunks(response: Response, expected: number, controller: AbortController, signal: AbortSignal) {
  const reader = response.body!.getReader(); let total = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      let next: Awaited<ReturnType<typeof reader.read>>;
      try { next = await reader.read(); } finally { clearTimeout(timeout); }
      if (next.done) break;
      total += next.value.byteLength;
      if (total > expected) throw fail();
      yield next.value;
    }
    if (total !== expected) throw fail();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); controller.abort(); }
}
function validResponse(response: Response, status: number, start: number, end: number, size: number): boolean {
  return response.status === status && Boolean(response.body) && response.headers.get('content-type')?.split(';')[0] === 'video/mp4' &&
    (!response.headers.get('content-encoding') || response.headers.get('content-encoding') === 'identity') &&
    response.headers.get('content-length') === String(end - start + 1) &&
    (status === 200 ? !response.headers.get('content-range') : response.headers.get('content-range') === `bytes ${start}-${end}/${size}`);
}
/** Caller has freshly checked the activity and member grant. URLs stay inside this server module. */
export async function openClassInReplayStream(grant: Grant, rangeHeader: string | undefined, signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<ClassInReplayStream> {
  const headers: Record<string, string> = { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Disposition': 'inline; filename="classroom-replay.mp4"' };
  let range;
  try { range = resourceByteRange(rangeHeader, grant.size); }
  catch { return { status: 416, headers: { ...headers, 'Content-Range': `bytes */${grant.size}`, 'Content-Length': '0' }, body: null }; }
  signal.throwIfAborted();
  const probe = await request(fetcher, grant, { Range: 'bytes=0-31' }, signal);
  const etag = probe.response.headers.get('etag');
  if (!validResponse(probe.response, 206, 0, 31, grant.size) || !etag || !/^"[\x21\x23-\x7e]{1,200}"$/.test(etag)) {
    probe.controller.abort(); await probe.response.body?.cancel().catch(() => {}); throw fail();
  }
  const prefix: Uint8Array[] = [];
  for await (const chunk of chunks(probe.response, 32, probe.controller, signal)) prefix.push(chunk);
  if (Buffer.concat(prefix).subarray(4, 8).toString() !== 'ftyp') throw new ClassInError('schema_error', '回放文件不符合已验证的MP4格式。');
  const start = range?.start ?? 0; const end = range?.end ?? grant.size - 1;
  const status = range ? 206 : 200;
  const main = await request(fetcher, grant, { 'If-Match': etag, ...(range ? { Range: `bytes=${start}-${end}` } : {}) }, signal);
  if (!validResponse(main.response, status, start, end, grant.size) || main.response.headers.get('etag') !== etag) {
    main.controller.abort(); await main.response.body?.cancel().catch(() => {}); throw fail();
  }
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${grant.size}`;
  headers['Content-Length'] = String(end - start + 1);
  return { status, headers, body: Readable.from(chunks(main.response, end - start + 1, main.controller, signal), { objectMode: false, highWaterMark: 64 * 1024 }) };
}
