import { createHash } from 'node:crypto';
import type { ClassInActivityDetail, ClassInHistoricalAttendance, ClassInLearningRecord, ClassInLearningSummary, ClassInScene } from '../src/contracts/classin-test/index.ts';
import { ClassInError } from './classin-test-transport.ts';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
export function shanghaiWeek(iso: string) {
  const now = new Date(iso); if (!Number.isFinite(now.getTime())) throw new ClassInError('schema_error', '业务时钟无效。');
  const local = new Date(now.getTime() + 8 * 3600_000); const weekday = (local.getUTCDay() + 6) % 7;
  const from = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - weekday) - 8 * 3600_000);
  const end = new Date(from.getTime() + 7 * 86400_000);
  return { from: from.toISOString(), end: end.toISOString(), to: iso };
}

function classify(kind: string, status: string, startsAt: string | null, endsAt: string | null, now: number): ClassInLearningRecord['state'] {
  if (startsAt && Date.parse(startsAt) > now) return 'future';
  if (kind === 'homework') {
    if (['已提交待批阅', '已批阅'].includes(status)) return 'complete';
    return endsAt && Date.parse(endsAt) < now ? 'overdue' : 'incomplete';
  }
  if (kind === 'exam') {
    if (['已交卷待批阅', '已批阅'].includes(status)) return 'complete';
    return endsAt && Date.parse(endsAt) < now ? 'overdue' : 'incomplete';
  }
  if (kind === 'recording') return status === '已完成' ? 'complete' : 'incomplete';
  return 'unknown';
}

export function buildLearningSummary(scene: ClassInScene, details: readonly ClassInActivityDetail[], attendance: ClassInHistoricalAttendance): ClassInLearningSummary {
  const students = scene.members.filter((member) => member.identity === 1).map((member) => ({ id: member.id, name: member.name, records: [] as ClassInLearningRecord[] }));
  if (!students.length) throw new ClassInError('incomplete', '当前班级没有可核验学生。');
  const now = Date.parse(scene.capturedAt); const period = shanghaiWeek(scene.capturedAt);
  for (const lesson of attendance.lessons.filter(({ activity }) => activity.endsAt && Date.parse(activity.endsAt) >= Date.parse(period.from))) {
    for (const student of students) {
      const row = lesson.students.find((item) => item.id === student.id);
      if (!row) throw new ClassInError('incomplete', '课堂出勤未覆盖当前学生名单。');
      student.records.push({ activity: lesson.activity, state: 'observed', status: row.attended ? `到课${row.late ? '、迟到' : ''}${row.earlyLeave ? '、早退' : ''}` : '缺席（请假未知）', grade: null, progress: null, durationSeconds: row.durationSeconds });
    }
  }
  for (const detail of details) {
    for (const student of students) {
      const row = detail.students.find((item) => item.id === student.id);
      if (!row) throw new ClassInError('incomplete', `《${detail.activity.name}》未覆盖当前学生名单。`);
      student.records.push({ activity: detail.activity, state: classify(detail.activity.kind, row.status, detail.activity.startsAt, detail.activity.endsAt, now), status: row.status,
        grade: row.grade, progress: row.progress, durationSeconds: row.durationSeconds });
    }
  }
  const futureSchedule = scene.activities.filter((activity) => activity.kind === 'classroom' && activity.published && !activity.cancelled && activity.startsAt && Date.parse(activity.startsAt) > now && Date.parse(activity.startsAt) < Date.parse(period.end)).sort((left, right) => (left.startsAt ?? '').localeCompare(right.startsAt ?? ''));
  const activities = new Map<string, ClassInLearningRecord['activity']>(); for (const student of students) for (const record of student.records) activities.set(record.activity.id, record.activity);
  const byKind = { classroom: 0, homework: 0, exam: 0, recording: 0, material: 0 };
  for (const activity of activities.values()) byKind[activity.kind] += 1;
  const contents = { status: 'available' as const, capturedAt: scene.capturedAt, version: '', period: { from: period.from, to: period.to, timeZone: 'Asia/Shanghai' as const, label: '当前自然周截至读取时刻' },
    students, futureSchedule, coverage: { studentCount: students.length, activityCount: activities.size, byKind },
    limitations: ['当前为真实活动受限聚合，不是正式学情报告；只覆盖列出的课堂、作业、测验和录播。', 'PDF学习资料活动没有学生完成状态，未纳入完成/未完成统计；录播课另有独立进度状态，已纳入。', '课堂请假状态当前接口未提供；课堂到课/缺席只属于出勤事实，不属于学习任务完成/未完成分类。'] };
  // The current read clock is evidence metadata. The semantic state already
  // changes when a deadline crossing changes a record or the future schedule.
  const { capturedAt: _capturedAt, period: resultPeriod, ...semanticContents } = contents;
  void _capturedAt;
  return { ...contents, version: digest({ ...semanticContents, period: { ...resultPeriod, to: undefined }, version: undefined }) };
}
