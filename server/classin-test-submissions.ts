import { createHash } from 'node:crypto';
import type { ClassInSubmission } from '../src/contracts/classin-test/index.ts';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';
import { readClassInResource } from './classin-test-resources.ts';

type SubmissionScope = Readonly<{ activityId: string; homeworkId: string; studentId: string; submissionId?: string }>;
const unavailable = (message: string): ClassInSubmission => ({ status: 'unavailable', message, text: '', teacherFeedback: '', attachments: [] });
async function submissionRecord(transport: ClassInTransport, scope: SubmissionScope) {
  const response = object(await transport('/lms/app/activity/homework/student/detail', { activityId: scope.activityId, studentUid: scope.studentId, courseId: TEST_SCOPE.classId }));
  const record = object(response.stu_homework_detail);
  const identities = { student_uid: scope.studentId, homework_id: scope.homeworkId, course_id: TEST_SCOPE.classId, school_uid: TEST_SCOPE.schoolId };
  if (Object.entries(identities).some(([key, value]) => String(record[key]) !== value)) throw new ClassInError('forbidden', '学生作业记录归属不一致，已停止读取。');
  if (scope.submissionId && String(record.stu_homework_id) !== scope.submissionId) throw new ClassInError('forbidden', '学生提交记录已变化，请刷新作业。');
  return record.is_del === 0 && record.is_draft === 0 && [1, 2].includes(Number(record.status)) ? record : null;
}
function attachments(value: unknown): unknown[] {
  const parsed: unknown = value ? typeof value === 'string' ? JSON.parse(value) : value : [];
  if (!Array.isArray(parsed) || parsed.length > 100) throw new ClassInError('schema_error', '学生作业附件结构无法核实。');
  return parsed;
}
function imageGrants(record: Record<string, unknown>, scope: SubmissionScope) {
  const grants = attachments(record.image).flatMap((entry, index) => {
    const file = object(entry);
    const numericId = (value: unknown) => (typeof value === 'number' || typeof value === 'string') && /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
    const extension = typeof file.fileName === 'string' ? /\.(png|jpe?g)$/i.exec(file.fileName)?.[1]?.toLowerCase() : undefined;
    if (!numericId(file.lmsFileId) || !numericId(file.fileId) || file.filePermission !== 0 || !extension) return [];
    const ref = createHash('sha256').update(JSON.stringify([scope.activityId, scope.homeworkId, scope.studentId, record.stu_homework_id, file.lmsFileId, file.fileId, file.fileSize])).digest('hex');
    return [{ ref, name: `答题图片${index + 1}.${extension}`, resourceId: String(file.lmsFileId), fileId: String(file.fileId), activityId: scope.activityId }];
  });
  if (new Set(grants.map((g) => g.resourceId)).size !== grants.length) throw new ClassInError('schema_error', '答题图片引用重复，无法确认当前附件。');
  return grants;
}
/** Scope is derived from a freshly verified activity and its assignment roster. */
export async function readHomeworkSubmission(transport: ClassInTransport, scope: SubmissionScope, text: (value: unknown) => string): Promise<ClassInSubmission> {
  try {
    const record = await submissionRecord(transport, scope);
    if (!record) return unavailable('作业记录已变化或不是正式提交，未读取答题正文；请刷新核对。');
    const counts = ['image', 'video', 'audio', 'docs'].map((kind) => ({ kind, count: attachments(record[kind]).length })).filter((entry) => entry.count > 0);
    const images = imageGrants(record, scope).map(({ ref, name }) => ({ ref, name }));
    return { status: 'available', message: '已读取正式提交文字和附件清单；答题图片可在当前权限允许时单独打开。AI尚未识别图中答案。', text: text(record.content),
      teacherFeedback: [text(record.th_content), text(record.comment)].filter(Boolean).join('\n'), attachments: counts, images };
  } catch (error) {
    if (error instanceof ClassInError && error.code === 'forbidden') throw error;
    return unavailable('本次未取得已提交内容，不能据此判断答案或批阅结果；请点击活动重试。');
  }
}
/** Caller has freshly verified the current member, homework assignment and download permission. */
export async function readHomeworkImage(transport: ClassInTransport, scope: SubmissionScope, imageRef: string, fetcher: typeof fetch = fetch) {
  if (!/^[a-f0-9]{64}$/.test(imageRef)) throw new ClassInError('forbidden', '答题图片引用无效。');
  const record = await submissionRecord(transport, scope);
  if (!record) throw new ClassInError('forbidden', '该答卷不再是可读取的正式提交。');
  const matches = imageGrants(record, scope).filter((grant) => grant.ref === imageRef);
  if (matches.length !== 1) throw new ClassInError('forbidden', '图片已变化或不属于当前学生的正式答卷。');
  const file = await readClassInResource(transport, { ...matches[0]!, filePermission: 0 }, fetcher);
  if (!['image/png', 'image/jpeg'].includes(file.mimeType)) throw new ClassInError('unsupported', '当前答卷附件不是已支持的图片格式。');
  return file;
}
