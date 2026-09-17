import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { appendFileSync, chmodSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ClassInErrorCode } from '../src/contracts/classin-test/index.ts';

export class ClassInError extends Error {
  readonly code: ClassInErrorCode;
  constructor(code: ClassInErrorCode, message: string) { super(message); this.code = code; }
}
export const TEST_SCOPE = Object.freeze({ uid: '632586', schoolId: '632586', classId: '591820', categoryId: '3153610' });
const ORIGIN = 'https://dynamic14.eeo.im';
function recordRead(path: string, started: number, outcome: string) {
  try {
    const dir = join(process.cwd(), '.runtime', 'private', 'classin-test');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = join(dir, 'reads.jsonl');
    if (existsSync(file) && statSync(file).size > 1_000_000) renameSync(file, join(dir, 'reads.previous.jsonl'));
    appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), operation: path, elapsedMs: Date.now() - started, outcome })}\n`, { mode: 0o600 });
    chmodSync(file, 0o600);
  } catch { /* Read access remains usable if local diagnostic storage is unavailable. */ }
}
const paths = new Set([
  '/api/classin.api.php?action=getLessonRecordInfo',
  '/api/exam.api.php?action=getAnswerMarkResult',
  '/lms/app/file/getFiles', '/lms/app/file/getDownInfo',
  '/lms/app/activity/homework/student/detail',
  '/question-bank-business-service/topic/batchGet',
  '/api/classin.api.php?action=getReportUrl', '/api/classin.api.php?action=getClassNotes',
  '/classroom/web/class/report/overallView', '/course-ai-assistant/app/course/checkAiTeachingAnalysisRecord',
  '/course-ai-assistant/app/file/richVideoSummary', '/course-ai-assistant/app/file/aiTeachingAnalysis',
  '/course-ai-assistant/admin/ai-teaching-analysis/report',
  '/course/app/member/course_list', '/course/app/getCourseMember',
  '/lms/app/category/list', '/lms/app/course/unitList', '/lms/app/course/unitActivityList',
  ...['class', 'homework', 'exam', 'recordClass', 'learningMaterials'].flatMap((kind) => ['get', 'students'].map((op) => `/lms/app/activity/${kind}/${op}`)),
]);
export type ClassInTransport = (path: string, fields: Record<string, unknown>, form?: boolean) => Promise<unknown>;
const md5 = (value: string | Buffer) => createHash('md5').update(value).digest('hex');
export function signedRequest(fields: Record<string, unknown>, form: boolean, uid: string, secret: string, ts: number) {
  const headers: Record<string, string> = { 'User-Agent': 'classin-test-adapter/1.0', 'X-EEO-UID': uid, 'X-EEO-TS': String(ts) };
  let body: string;
  if (form) {
    const values = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]));
    body = new URLSearchParams(values).toString();
    const signFields = { ...values, timeStamp: String(ts) };
    const signature = Object.entries(signFields).filter(([key, value]) => key !== 'key' && !key.includes('[') && Buffer.byteLength(value) <= 1024)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('&');
    headers['X-EEO-SIGN'] = md5(`${signature}&key=${secret}`);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    body = JSON.stringify(fields);
    const raw = Buffer.from(body); const index = Math.min(ts % 10, raw.length);
    headers['X-EEO-SIGN'] = md5(Buffer.concat([raw.subarray(0, index), Buffer.from(String(ts)), raw.subarray(index)]));
    headers['X-EEO-SIGN-VERSION'] = '1';
    headers['Content-Type'] = 'application/json';
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: ts + 300, jti: randomUUID(), iat: ts - 300, nbf: ts - 300, data: { uid: Number(uid) } })}`;
    headers['X-EEO-TOKEN'] = `${token}.${createHmac('sha256', secret).update(token).digest('base64url')}`;
  }
  return { body, headers };
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ClassInError('schema_error', '接口数据结构不符合已核对的合同。');
  return value as Record<string, unknown>;
}
export function unwrap(value: unknown) {
  const response = object(value);
  const success = response.error_info ? String(object(response.error_info).errno) === '1' : String(response.code) === '0';
  if (!success) throw new ClassInError('upstream_error', 'ClassIn 拒绝了本次读取，请检查测试账号权限或稍后重试。');
  return response.data;
}
export function createClassInTransport(enabled = process.env.CLASSIN_TEST_ENABLED === '1'): ClassInTransport {
  return async (path, fields, form = true) => {
    if (!enabled) throw new ClassInError('disabled', '测试连接未启用，请以 CLASSIN_TEST_ENABLED=1 启动 V2。');
    if (!paths.has(path)) throw new ClassInError('forbidden', '该接口不在已验证的读取范围内。');
    let secret: string;
    try {
      const config = object(JSON.parse(await readFile(join(homedir(), '.classin.token'), 'utf8')));
      const value = object(config.secrets)[TEST_SCOPE.uid];
      if (typeof value !== 'string' || !value.trim()) throw new Error();
      secret = value.trim();
    } catch { throw new ClassInError('unauthorized', '测试教师凭据不可用，请检查本机凭据配置。'); }
    const request = signedRequest(fields, form, TEST_SCOPE.uid, secret, Math.floor(Date.now() / 1000));
    const started = Date.now(); let outcome = 'success';
    try {
      const response = await fetch(`${ORIGIN}${path}`, { method: 'POST', ...request, redirect: 'error', signal: AbortSignal.timeout(12_000) });
      if (response.status === 401 || response.status === 403) throw new ClassInError('unauthorized', 'ClassIn 鉴权失败，请检查测试教师凭据或权限。');
      if (!response.ok) throw new ClassInError('upstream_error', `ClassIn 服务暂时无法读取（HTTP ${response.status}）。`);
      return unwrap(await response.json());
    } catch (error) {
      outcome = error instanceof ClassInError ? error.code : error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'upstream_error';
      if (error instanceof ClassInError) throw error;
      if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) throw new ClassInError('timeout', '读取 ClassIn 超时，请重试。');
      throw new ClassInError('upstream_error', '无法连接 ClassIn 测试服务，请稍后重试。');
    } finally { recordRead(path, started, outcome); }
  };
}
