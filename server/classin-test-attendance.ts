import { createHash } from 'node:crypto';
import type { ClassInHistoricalAttendance, ClassInHistoricalAttendanceLesson, ClassInHistoricalAttendanceStudent, ClassInScene } from '../src/contracts/classin-test/index.ts';
import { ClassInError, object, TEST_SCOPE, type ClassInTransport } from './classin-test-transport.ts';

function list(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new ClassInError('schema_error', '课堂成员出勤列表结构发生变化。');
  return value.map(object);
}

function binary(value: unknown, field: string): boolean {
  if (value !== 0 && value !== 1) throw new ClassInError('schema_error', `课堂成员${field}状态不是已验证的 0/1 枚举。`);
  return value === 1;
}

function nonNegativeInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new ClassInError('schema_error', `课堂成员${field}字段不完整。`);
  return parsed;
}

export async function readHistoricalAttendance(
  transport: ClassInTransport,
  scene: ClassInScene,
  limit = 5,
): Promise<ClassInHistoricalAttendance> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10) throw new ClassInError('unsupported', '历史出勤课次数量超出安全范围。');
  const ended = scene.activities
    .filter((activity) => activity.kind === 'classroom' && activity.published && !activity.cancelled && activity.process === 2 && activity.endsAt)
    .sort((left, right) => (right.endsAt ?? '').localeCompare(left.endsAt ?? ''))
    .slice(0, limit);
  if (!ended.length) throw new ClassInError('unsupported', '当前课程没有可核对的已结束课堂。');

  const lessons: ClassInHistoricalAttendanceLesson[] = [];
  for (const activity of ended) {
    const rows = list(await transport('/lms/app/activity/class/students', { activityId: activity.id, courseId: TEST_SCOPE.classId }));
    const expectedCount = activity.summary.studentTotal;
    if (expectedCount === undefined || rows.length !== expectedCount) throw new ClassInError('incomplete', `《${activity.name}》出勤名单未取全。`);
    const ids = rows.map((row) => String(row.studentUid));
    if (new Set(ids).size !== ids.length) throw new ClassInError('incomplete', `《${activity.name}》出勤名单存在重复成员。`);
    const students = rows.map((row): ClassInHistoricalAttendanceStudent => {
      const id = String(row.studentUid);
      if (!/^\d+$/.test(id)) throw new ClassInError('schema_error', '课堂成员缺少有效身份。');
      const member = scene.members.find((candidate) => candidate.id === id && candidate.identity === 1);
      if (!member) throw new ClassInError('forbidden', '课堂出勤成员不属于当前授权班级学生名单。');
      return {
        id,
        name: member.name,
        attended: binary(row.onClass, '到课'),
        late: binary(row.isLate, '迟到'),
        earlyLeave: binary(row.isEarly, '早退'),
        durationSeconds: nonNegativeInteger(row.classLength, '在课时长'),
      };
    });
    lessons.push({
      activity,
      expectedCount,
      attendedCount: students.filter((student) => student.attended).length,
      lateCount: students.filter((student) => student.late).length,
      earlyLeaveCount: students.filter((student) => student.earlyLeave).length,
      students,
    });
  }
  const capturedAt = new Date().toISOString();
  const version = createHash('sha256').update(JSON.stringify(lessons)).digest('hex').slice(0, 24);
  return {
    status: 'available',
    lessons,
    capturedAt,
    version,
    limitation: '仅聚合本次列出的已结束课堂；缺席、迟到、早退直接使用课堂成员接口字段，不从评论、时长或模型推断。请假状态当前接口未提供。',
  };
}
