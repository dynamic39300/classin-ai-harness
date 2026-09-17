// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readHomeworkSubmission, readHomeworkImage } from './classin-test-submissions';
import { plain } from './classin-test-service';
import { ClassInError, TEST_SCOPE, type ClassInTransport } from './classin-test-transport';
const scope = { activityId: '1001', homeworkId: '1002', studentId: '8001' };
const record = { student_uid: 8001, homework_id: 1002, course_id: TEST_SCOPE.classId, school_uid: TEST_SCOPE.schoolId,
  status: 1, is_draft: 0, is_del: 0, content: '<p>答案是1。</p>', th_content: '<p>过程完整</p>', comment: '',
  image: '[{"uuid":"PRIVATE-RESOURCE","fileName":"PRIVATE-NAME"}]', docs: '[]', audio: '[]', video: '[]',
  stu_homework_share_key: 'PRIVATE-SHARE', correct: 10, wrong: 0, add_time: 100 };
const transport = (overrides: Record<string, unknown> = {}) => vi.fn<ClassInTransport>(async () => ({ stu_homework_detail: { ...record, ...overrides } }));
describe('ClassIn submitted homework reads', () => {
  it('returns only approved text and attachment counts, not tokens or invented accuracy/date', async () => {
    const result = await readHomeworkSubmission(transport(), scope, plain);
    expect(result).toMatchObject({ status: 'available', text: '答案是1。', teacherFeedback: '过程完整', attachments: [{ kind: 'image', count: 1 }] });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|correct|wrong|add_time/);
  });
  it.each(['student_uid', 'homework_id', 'course_id', 'school_uid'])('rejects mismatched %s', async (field) => {
    await expect(readHomeworkSubmission(transport({ [field]: 999 }), scope, plain)).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('withholds answers when a submission changes back to draft or is deleted', async () => {
    for (const update of [{ is_draft: 1 }, { is_del: 1 }, { status: 0 }]) {
      const result = await readHomeworkSubmission(transport(update), scope, plain);
      expect(result.status).toBe('unavailable'); expect(result.text).toBe(''); expect(result.attachments).toEqual([]);
    }
  });
  it('makes provider failure and malformed attachments explicitly unavailable', async () => {
    const failed: ClassInTransport = async () => { throw new ClassInError('timeout', 'timeout'); };
    for (const t of [failed, transport({ image: '{bad-json' })]) expect((await readHomeworkSubmission(t, scope, plain)).status).toBe('unavailable');
  });
  it('reads only the current submitted image and does not interpret fileSize as a byte count', async () => {
    const image = { fileId: 2001, lmsFileId: 3001, fileSize: 112, filePermission: 0, fileName: 'PRIVATE.jpg', uuid: 'PRIVATE-UUID' };
    const path = 'upload/files/file01/fixture/answer.jpg';
    const read = vi.fn<ClassInTransport>(async (url) => url.endsWith('getFiles') ? { list: [{ lmsFileId: 3001, fileId: 2001, fileSize: 111, filePermission: 0, filePath: path, isCloudFile: true, isDel: 0, moderationState: 0 }] } : url.endsWith('getDownInfo') ? { src: path } : { stu_homework_detail: { ...record, image: JSON.stringify([image]) } });
    const submitted = await readHomeworkSubmission(read, scope, plain); const ref = submitted.images![0]!.ref;
    expect(ref).toMatch(/^[a-f0-9]{64}$/); expect(JSON.stringify(submitted)).not.toMatch(/PRIVATE|fileId|lmsFileId|uuid|https:/);
    const bytes = Buffer.alloc(114216); bytes.set([255, 216, 255]);
    const fetcher = vi.fn<typeof fetch>(async () => new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } }));
    const result = await readHomeworkImage(read, scope, ref, fetcher);
    expect(result.bytes.length).toBe(114216); expect(result.mimeType).toBe('image/jpeg');
    expect(read).toHaveBeenCalledWith('/lms/app/file/getFiles', { activityId: '1001', lmsFileIds: '[3001]' });
    expect(fetcher.mock.calls[0]?.[1]?.headers).toBeUndefined();
    for (const change of [{ image: '[]' }, { image: JSON.stringify([{ ...image, fileId: 999 }]) }, { is_draft: 1 }, { is_del: 1 }, { student_uid: 999 }]) {
      const altered = transport(change); await expect(readHomeworkImage(altered, scope, ref, fetcher)).rejects.toMatchObject({ code: 'forbidden' });
      expect(altered.mock.calls.some(([url]) => url.includes('/file/'))).toBe(false);
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(readHomeworkImage(read, { ...scope, submissionId: 'changed-record' }, ref, fetcher)).rejects.toMatchObject({ code: 'forbidden' });
  });
  it('keeps unsupported image counts without exposing a fabricated readable reference', async () => {
    for (const image of [{ uuid: 'PRIVATE' }, { fileId: 1, lmsFileId: 2, fileName: 'PRIVATE.svg', filePermission: 0 }, { fileId: 1, lmsFileId: 2, fileName: 'PRIVATE.jpg', filePermission: 1 }]) {
      const result = await readHomeworkSubmission(transport({ image: JSON.stringify([image]) }), scope, plain);
      expect(result).toMatchObject({ status: 'available', attachments: [{ kind: 'image', count: 1 }], images: [] });
    }
  });
});
