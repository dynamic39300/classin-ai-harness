import { createHash } from 'node:crypto';
import type { ClassInActivityDetail, ClassInQuestionAggregation } from '../src/contracts/classin-test/index.ts';
import { ClassInError } from './classin-test-transport.ts';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
const definitive = new Set(['正确', '错误', '部分正确']);

/** Deterministic aggregation only. It never infers correctness from score, free text or media. */
export function aggregateQuestionResults(details: readonly ClassInActivityDetail[], capturedAt: string, exclusions: ClassInQuestionAggregation['excludedActivities'] = []): ClassInQuestionAggregation {
  const includedActivities: ClassInQuestionAggregation['includedActivities'][number][] = [];
  const questions: ClassInQuestionAggregation['questions'][number][] = [];
  for (const detail of details) {
    if (detail.activity.kind !== 'exam' || !detail.questions?.length) throw new ClassInError('unsupported', '逐题聚合只接受已核验试卷。');
    const assigned = detail.students.length;
    if (!assigned || detail.students.some((student) => student.examAnswers?.status !== 'available' || student.examAnswers.questions.length !== detail.questions!.length)) {
      throw new ClassInError('incomplete', `《${detail.activity.name}》逐题记录未完整读取。`);
    }
    includedActivities.push({ id: detail.activity.id, name: detail.activity.name, endsAt: detail.activity.endsAt, questionCount: detail.questions.length, assignedCount: assigned });
    detail.questions.forEach((question, index) => {
      const records = detail.students.map((student) => student.examAnswers!.questions[index]!);
      if (records.some((record) => record.id !== question.id || record.position !== index + 1)) throw new ClassInError('incomplete', '逐题记录与当前试卷版本不一致。');
      const markings = records.map((record) => record.marking?.split('、') ?? []);
      const count = (value: string) => markings.filter((values) => values.length === 1 && values[0] === value).length;
      const validCount = markings.filter((values) => values.length === 1 && definitive.has(values[0]!)).length;
      const unansweredCount = records.filter((record) => record.status === '未作答').length;
      const nonParticipantCount = records.filter((record) => record.status === '未参与').length;
      const pendingCount = records.filter((record, recordIndex) => record.status === '已作答' && (markings[recordIndex]!.length !== 1 || !definitive.has(markings[recordIndex]![0]!))).length;
      questions.push({ activityId: detail.activity.id, activityName: detail.activity.name, activityEndsAt: detail.activity.endsAt,
        topicId: question.id, position: index + 1, content: question.content, hasImage: question.hasImage,
        assignedCount: assigned, validCount, correctCount: count('正确'), wrongCount: count('错误'), partialCount: count('部分正确'),
        pendingCount, unansweredCount, nonParticipantCount });
    });
  }
  const from = includedActivities.map((activity) => activity.endsAt).filter((value): value is string => Boolean(value)).sort()[0] ?? null;
  const rule = '有效分母仅包含逐题判定为正确、错误或部分正确的记录；未完全正确人数=错误人数+部分正确人数。待批阅、未作答、未参与均排除，不从总分或媒体内容反推。';
  const contents = { status: 'available' as const, capturedAt, window: { from, to: capturedAt }, includedActivities, excludedActivities: [...exclusions], questions, rule };
  // capturedAt/window.to describe when this read happened. They are not a
  // business-object version and must not make an unchanged result look stale.
  return { ...contents, version: digest({ status: contents.status, from, includedActivities, excludedActivities: contents.excludedActivities, questions, rule }) };
}
