import { describe, expect, it } from 'vitest';
import type { ClassInActivityDetail } from '../src/contracts/classin-test/index.ts';
import { aggregateQuestionResults } from './classin-test-question-aggregation.ts';

const detail = (): ClassInActivityDetail => ({
  activity: { id: '10', bizId: '20', unitId: '30', categoryId: '40', name: '测验', kind: 'exam', startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-09-02T00:00:00.000Z', published: true, process: 2, summary: {} },
  capturedAt: '2026-09-03T00:00:00.000Z', version: 'detail-v1', description: '', fields: [], resources: [],
  questions: [{ id: 'q1', typeCode: 1, content: '题面', options: [], answers: ['A'], analysis: '', hasImage: false }],
  students: [
    { id: 's1', name: '甲', status: '已批阅', grade: null, progress: null, durationSeconds: null, examAnswers: { status: 'available', message: '', questions: [{ id: 'q1', position: 1, status: '已作答', answers: ['A'], marking: '正确', score: 1, hasMedia: false }] } },
    { id: 's2', name: '乙', status: '已批阅', grade: null, progress: null, durationSeconds: null, examAnswers: { status: 'available', message: '', questions: [{ id: 'q1', position: 1, status: '已作答', answers: ['B'], marking: '部分正确', score: 0, hasMedia: false }] } },
    { id: 's3', name: '丙', status: '未作答', grade: null, progress: null, durationSeconds: null, examAnswers: { status: 'available', message: '', questions: [{ id: 'q1', position: 1, status: '未参与', answers: [], marking: null, score: null, hasMedia: false }] } },
    { id: 's4', name: '丁', status: '已交卷待批阅', grade: null, progress: null, durationSeconds: null, examAnswers: { status: 'available', message: '', questions: [{ id: 'q1', position: 1, status: '已作答', answers: ['C'], marking: '待批阅', score: null, hasMedia: false }] } },
  ],
});

describe('aggregateQuestionResults', () => {
  it('keeps pending and non-participants out of the valid denominator', () => {
    const result = aggregateQuestionResults([detail()], '2026-09-03T00:00:00.000Z');
    expect(result.questions[0]).toMatchObject({ assignedCount: 4, validCount: 2, correctCount: 1, wrongCount: 0, partialCount: 1, pendingCount: 1, nonParticipantCount: 1 });
    expect(result.rule).toContain('未完全正确人数=错误人数+部分正确人数');
  });
  it('fails closed when a student answer set is incomplete', () => {
    const broken = { ...detail(), students: [{ ...detail().students[0]!, examAnswers: { status: 'available' as const, message: '', questions: [] } }] };
    expect(() => aggregateQuestionResults([broken], '2026-09-03T00:00:00.000Z')).toThrow('未完整读取');
  });
  it('keeps the source version stable when only the capture clock advances', () => {
    const first = aggregateQuestionResults([detail()], '2026-09-03T00:00:00.000Z');
    const second = aggregateQuestionResults([detail()], '2026-09-03T00:00:10.000Z');
    expect(second.capturedAt).not.toBe(first.capturedAt);
    expect(second.window.to).not.toBe(first.window.to);
    expect(second.version).toBe(first.version);
  });
});
