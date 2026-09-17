// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { readClassroomResult, reportKey } from './classin-test-reports';
import { TEST_SCOPE, type ClassInTransport } from './classin-test-transport';
function reportTransport(fail = '', wrongClass = false): ClassInTransport {
  return vi.fn(async (path: string, fields: Record<string, unknown>) => {
    if (path === fail) throw new Error('fixture service unavailable');
    if (path.includes('getReportUrl')) return { newUrl: 'https://example.test/report?key=fixture-private-key', url: 'https://example.test/old?key=fixture-private-key' };
    if (path.includes('overallView')) {
      expect(fields.classUserKey).toBe('fixture-private-key');
      return { classInfo: { courseId: TEST_SCOPE.classId, classId: wrongClass ? '9999' : '1002', schoolUid: TEST_SCOPE.schoolId }, header: { duration: 2701 }, attendance: { actualNum: 0, shouldNum: 3, lateNum: 0 }, classRecords: { classPic: ['PRIVATE-IMAGE-URL'], blackboardImgs: [] } };
    }
    if (path.includes('getClassNotes')) { expect(fields.memberUid).toBe(TEST_SCOPE.uid); return { totalNum: '1', noteList: [{ noteId: 1, noteInfo: '有理数定义', addTime: '1789385400', noteUrl: 'PRIVATE-NOTE-URL' }] }; }
    return { hasRecord: true };
  });
}
describe('classroom result evidence', () => {
  it('uses scoped key exchange and retains actual zero attendance independently from AI readiness', async () => {
    const result = await readClassroomResult(reportTransport(), '1002');
    expect(result).toMatchObject({ status: 'available', attendance: { expected: 3, actual: 0 }, highlights: 1, aiAnalysis: 'available', durationSeconds: 2701 });
    expect(result.notes).toHaveLength(1); expect(result.notes[0].createdAt).toBe('2026-09-14T11:30:00.000Z');
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|fixture-private-key|classUserKey/);
  });
  it('isolates report failure from notes and AI status', async () => {
    const result = await readClassroomResult(reportTransport('/classroom/web/class/report/overallView'), '1002');
    expect(result.status).toBe('unavailable'); expect(result.attendance).toBeNull(); expect(result.notes).toHaveLength(1); expect(result.aiAnalysis).toBe('available');
  });
  it('does not expose a report for another class', async () => {
    const result = await readClassroomResult(reportTransport('', true), '1002');
    expect(result.attendance).toBeNull(); expect(result.durationSeconds).toBeNull();
  });
  it('rejects conflicting URL keys without making an arbitrary URL request', () => {
    expect(() => reportKey({ url: 'https://example.test?key=a', newUrl: 'https://example.test?key=b' })).toThrow();
    expect(() => reportKey({ url: 'https://example.test?secret=a' })).toThrow();
    expect(reportKey({ newUrl: 'https://example.test?key=a' })).toBe('a');
  });
});
