import type { ClassInReplay } from '../src/contracts/classin-test/index.ts';
import { createHash } from 'node:crypto';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';

function seconds(value: unknown): number {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isSafeInteger(n) || n < 0 || n >= 10_000_000_000) throw new ClassInError('schema_error', '回放时间或时长不符合已验证的秒单位。');
  return n;
}
function instant(value: unknown): string | null {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return null;
  return new Date(seconds(value) * 1000).toISOString();
}
async function replaySource(transport: ClassInTransport, classId: string) {
  const data = object(await transport('/api/classin.api.php?action=getLessonRecordInfo', {
    SID: TEST_SCOPE.schoolId, clientCourseId: TEST_SCOPE.classId, clientClassId: classId, memberUid: TEST_SCOPE.uid,
  }));
  if (String(data.lessonId) !== classId || String(data.teacherUid) !== TEST_SCOPE.uid) throw new ClassInError('forbidden', '回放课节或教师归属不一致。');
  return data;
}
function fileList(data: Record<string, unknown>) {
  const lesson = Array.isArray(data.lessonData) && data.lessonData.length === 0 ? {} : object(data.lessonData);
  const raw = Object.keys(lesson).length === 0 ? [] : lesson.fileList;
  if (!Array.isArray(raw) || raw.length > 100) throw new ClassInError('incomplete', '回放文件列表缺失或超出已验证范围。');
  const result = raw.map(object);
  if (result.some((f) => typeof f.FileId !== 'string' || !f.FileId) || new Set(result.map((f) => f.FileId)).size !== result.length) throw new ClassInError('incomplete', '回放文件引用缺失或重复。');
  return result;
}
function playbackGrant(data: Record<string, unknown>, file: Record<string, unknown>): { ref: string; url: string; size: number } | null {
  const permission = data.playbackDetail;
  if (!permission || typeof permission !== 'object' || Array.isArray(permission) || object(permission).canPlay !== 1 || data.showClassVideo !== 1 || data.avoidRecordReplay !== 0 || data.avoidRecordVideoRecorded !== 0) return null;
  if (!Array.isArray(file.Playset)) return null;
  const versions = file.Playset.map(object).filter((p) => String(p.Definition) === '0');
  const size = Number(file.Size);
  if (versions.length !== 1 || !Number.isSafeInteger(size) || size < 32 || size > 256 * 1024 * 1024) return null;
  const url = versions[0]!.Url;
  if (typeof url !== 'string' || !/^https:\/\/playback\.eeo\.im\/[a-zA-Z0-9_./-]+\.mp4$/.test(url) || new URL(url).pathname.split('/').some((s) => s === '.' || s === '..') || url.includes('/../') || url.includes('/./')) return null;
  return { ref: createHash('sha256').update(JSON.stringify([file.FileId, url, size])).digest('hex'), url, size };
}
/** Private server grant: never serialize its URL into UI, Context or diagnostic logs. */
export async function authorizeClassInReplay(transport: ClassInTransport, classId: string, ref: string) {
  if (!/^[a-f0-9]{64}$/.test(ref)) throw new ClassInError('forbidden', '回放引用无效，请重新读取课堂。');
  const data = await replaySource(transport, classId);
  const matches = fileList(data).map((file) => playbackGrant(data, file)).filter((grant) => grant?.ref === ref);
  if (matches.length !== 1) throw new ClassInError('forbidden', '回放文件或播放权限已变化，请刷新课堂后重试。');
  return matches[0]!;
}
export async function readClassInReplay(transport: ClassInTransport, classId: string): Promise<ClassInReplay> {
  try {
    const data = await replaySource(transport, classId);
    const raw = fileList(data);
    const ids = new Set<string>();
    const files = raw.map((value) => {
      const file = object(value);
      if (typeof file.FileId !== 'string' || !file.FileId || ids.has(file.FileId)) throw new ClassInError('incomplete', '回放文件引用缺失或重复。');
      ids.add(file.FileId);
      const code = String(file.Status);
      if (!/^\d{1,6}$/.test(code)) throw new ClassInError('schema_error', '回放状态码无法核实。');
      const startsAt = instant(file.StartTimestamp); const endsAt = instant(file.EndTimestamp);
      if (startsAt && endsAt && endsAt < startsAt) throw new ClassInError('schema_error', '录制时间顺序不正确。');
      return { playbackRef: playbackGrant(data, file)?.ref, statusCode: code, durationSeconds: file.Duration === undefined || file.Duration === null || file.Duration === '' ? null : seconds(file.Duration), startsAt, endsAt, createdAt: instant(file.CreateTimestamp) };
    });
    return { state: files.length ? 'files_returned' : 'empty', files,
      message: files.length ? `专用回放接口已返回 ${files.length} 个录制文件。以下为实际录制元数据；${files.some((f) => f.playbackRef) ? '可尝试读取回放，播放时会重新核对当前教师权限；不代表学生观看权限或已看完。' : '当前未取得可用的教师播放引用，请在ClassIn客户端核对。'}` : '专用回放接口本次未返回录制文件；不能据此判断录课关闭或永久无回放。' };
  } catch (error) {
    if (error instanceof ClassInError && error.code === 'forbidden') throw error;
    return { state: 'unavailable', files: [], message: '本次回放结果无法核实，请重试；不能把读取失败当作没有回放。' };
  }
}
