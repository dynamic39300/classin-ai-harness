import { createHash } from 'node:crypto';
import type { ClassInResource } from '../src/contracts/classin-test/index.ts';
import { ClassInError, object, type ClassInTransport } from './classin-test-transport.ts';

const FILE_ORIGIN = 'https://wsevlf001.eeo.im/';
const LIMIT = 20 * 1024 * 1024;
type Grant = Readonly<{ activityId: string; resourceId: string; fileId: string; name: string; filePermission?: 0 }>;
export function validatedResourceUrl(path: unknown): string {
  if (typeof path !== 'string' || !/^upload\/files\/file01\/[a-zA-Z0-9_./-]+\.(pdf|png|jpe?g|mp4)$/i.test(path) || path.split('/').some((segment) => segment === '..' || segment === '.')) {
    throw new ClassInError('forbidden', '文件地址不在已验证的测试资源范围内。');
  }
  return new URL(path, FILE_ORIGIN).href;
}
export function resourceMime(bytes: Uint8Array, url: string): string {
  const data = Buffer.from(bytes);
  const extension = new URL(url).pathname.split('.').at(-1)?.toLowerCase();
  if (extension === 'pdf' && data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (extension === 'png' && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (['jpg', 'jpeg'].includes(extension ?? '') && data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (extension === 'mp4' && data.subarray(4, 8).toString() === 'ftyp') return 'video/mp4';
  throw new ClassInError('schema_error', '实际文件类型与附件信息不符，已停止预览。');
}
/** Called only after the owning activity has been re-read and checked. */
export async function readClassInResource(transport: ClassInTransport, grant: Grant, fetcher: typeof fetch = fetch): Promise<ClassInResource> {
  const metadata = object(await transport('/lms/app/file/getFiles', { lmsFileIds: JSON.stringify([Number(grant.resourceId)]), activityId: grant.activityId }));
  if (!Array.isArray(metadata.list) || metadata.list.length !== 1) throw new ClassInError('incomplete', '附件关系未完整返回。');
  const file = object(metadata.list[0]);
  if (String(file.lmsFileId) !== grant.resourceId || String(file.fileId) !== grant.fileId || file.isCloudFile !== true || file.isDel !== 0 || file.moderationState !== 0) throw new ClassInError('forbidden', '附件归属、删除状态或审核状态不满足读取条件。');
  if (grant.filePermission !== undefined && file.filePermission !== grant.filePermission) throw new ClassInError('forbidden', '答题附件权限已变化或无法核实，请刷新作业。');
  const down = object(await transport('/lms/app/file/getDownInfo', { fileId: grant.fileId }));
  if (down.src !== file.filePath) throw new ClassInError('incomplete', '下载地址与当前附件版本不一致，请刷新。');
  const url = validatedResourceUrl(down.src);
  return readValidatedTestFile(url, grant.name, fetcher);
}

/** Only for server callers that verified a fresh owning object and its file grant. */
export async function readValidatedTestFile(url: string, name: string, fetcher: typeof fetch = fetch): Promise<ClassInResource> {
  const parsed = new URL(url);
  if (parsed.origin !== new URL(FILE_ORIGIN).origin || parsed.search || parsed.hash || parsed.username || parsed.password || validatedResourceUrl(parsed.pathname.slice(1)) !== url) throw new ClassInError('forbidden', '文件地址不在已验证的测试资源范围内。');
  let response: Response;
  try { response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15000) }); }
  catch { throw new ClassInError('upstream_error', '教学附件暂时无法下载，请重试。'); }
  if (!response.ok || response.status !== 200 || !response.body) throw new ClassInError('upstream_error', `教学附件读取失败（HTTP ${response.status}）。`);
  if (Number(response.headers.get('content-length')) > LIMIT) { await response.body.cancel(); throw new ClassInError('unsupported', '附件超过本次20MiB读取上限。'); }
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const result = await reader.read(); if (result.done) break;
      total += result.value.length;
      if (total > LIMIT) throw new ClassInError('unsupported', '附件超过本次20MiB读取上限。');
      chunks.push(result.value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    if (error instanceof ClassInError) throw error;
    throw new ClassInError('upstream_error', '附件传输未完成，请重试。');
  } finally { reader.releaseLock(); }
  const bytes = Buffer.concat(chunks);
  return { bytes, mimeType: resourceMime(bytes, url), name, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export function resourceByteRange(header: string | undefined, length: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) throw new RangeError('Invalid range');
  const suffix = !match[1];
  const first = Number(suffix ? match[2] : match[1]); const last = match[2] ? Number(match[2]) : length - 1;
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || (suffix && first <= 0)) throw new RangeError('Invalid range');
  const start = suffix ? Math.max(0, length - first) : first;
  const end = suffix ? length - 1 : Math.min(last, length - 1);
  if (start >= length || start > end) throw new RangeError('Unsatisfiable range');
  return { start, end };
}
