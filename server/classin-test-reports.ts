import type { ClassInClassroomResult } from '../src/contracts/classin-test/index.ts';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';
function n(value: unknown) { const parsed = Number(value); if (value === null || value === undefined || value === '' || !Number.isSafeInteger(parsed) || parsed < 0) throw new ClassInError('schema_error', '课堂报告统计字段不完整。'); return parsed; }
function list(value: unknown) { if (!Array.isArray(value)) throw new ClassInError('schema_error', '课堂报告列表不完整。'); return value; }
export function reportKey(value: unknown): string {
  const data = object(value);
  const keys = [data.newUrl, data.url].filter((v): v is string => typeof v === 'string' && v.length > 0).map((url) => {
    try { return new URL(url).searchParams.get('key'); } catch { throw new ClassInError('schema_error', '课堂报告入口无法解析。'); }
  });
  if (!keys.length || keys.some((k) => !k) || new Set(keys).size !== 1) throw new ClassInError('schema_error', '课堂报告凭据缺失或相互冲突。');
  return keys[0]!;
}
export async function readClassroomResult(transport: ClassInTransport, classId: string): Promise<ClassInClassroomResult> {
  const report = async () => {
    const entry = await transport('/api/classin.api.php?action=getReportUrl', { SID: TEST_SCOPE.schoolId, UID: TEST_SCOPE.uid, clientClassId: classId, identify: 3, language: 'zh-CN' });
    const data = object(await transport('/classroom/web/class/report/overallView', { classUserKey: reportKey(entry), UID: TEST_SCOPE.uid }));
    const scope = object(data.classInfo);
    if (String(scope.courseId) !== TEST_SCOPE.classId || String(scope.classId) !== classId || String(scope.schoolUid) !== TEST_SCOPE.schoolId) throw new ClassInError('forbidden', '报告归属不一致。');
    const attendance = object(data.attendance); const records = object(data.classRecords); const header = object(data.header);
    return { durationSeconds: n(header.duration), attendance: { expected: n(attendance.shouldNum), actual: n(attendance.actualNum), late: n(attendance.lateNum) }, highlights: list(records.classPic).length, blackboards: list(records.blackboardImgs).length };
  };
  const notes = async () => {
    const data = object(await transport('/api/classin.api.php?action=getClassNotes', { SID: TEST_SCOPE.schoolId, clientClassId: classId, memberUid: TEST_SCOPE.uid, perpage: 100 }));
    const entries = list(data.noteList); if (entries.length !== n(data.totalNum)) throw new ClassInError('incomplete', '教师笔记未取全。');
    return entries.map((value) => { const item = object(value); return { id: String(item.noteId), text: typeof item.noteInfo === 'string' ? item.noteInfo.replace(/<[^>]*>/g, ' ').trim() : '', createdAt: Number(item.addTime) > 0 && Number(item.addTime) < 10_000_000_000 ? new Date(Number(item.addTime) * 1000).toISOString() : null }; });
  };
  const ai = async () => {
    const data = object(await transport('/course-ai-assistant/app/course/checkAiTeachingAnalysisRecord', { courseId: Number(TEST_SCOPE.classId), classId: Number(classId) }, false));
    if (typeof data.hasRecord !== 'boolean') throw new ClassInError('schema_error', 'AI 分析状态无法读取。');
    return data.hasRecord ? 'available' as const : 'not_generated' as const;
  };
  const [r, note, analysis] = await Promise.allSettled([report(), notes(), ai()]);
  return {
    status: r.status === 'fulfilled' ? 'available' : 'unavailable',
    message: r.status === 'fulfilled' ? '授课报告为课后数据；不能作为实时到课判断。AI 分析是生成内容，不能覆盖真实出勤和答题记录。' : '课后报告本次无法取得，可能尚未生成或权限不足；课表与活动数据仍可查看。',
    durationSeconds: r.status === 'fulfilled' ? r.value.durationSeconds : null,
    attendance: r.status === 'fulfilled' ? r.value.attendance : null,
    highlights: r.status === 'fulfilled' ? r.value.highlights : null,
    blackboards: r.status === 'fulfilled' ? r.value.blackboards : null,
    notes: note.status === 'fulfilled' ? note.value : [], notesMessage: note.status === 'fulfilled' ? '仅当前教师本人笔记' : '教师笔记本次未取全或无法取得',
    aiAnalysis: analysis.status === 'fulfilled' ? analysis.value : 'unavailable',
  };
}
