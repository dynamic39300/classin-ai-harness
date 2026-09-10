import { describe, expect, it } from 'vitest';
import { DW_DERIVED_IM_LEARNING_CATALOG, WORKBUDDY_IM_LEARNING_CATALOG } from '@mocks/scenarios/workbuddy-im-learning-evidence';
import { buildLearningTeacherRequest, createPersonalizedLearningArtifact, deliveryTarget, revisePersonalizedLearningArtifact, validateLearningSelection, validateLearningSelectionAgainstCatalog } from './personalized-learning-service';

describe('personalized learning service', () => {
  it('requires capability-specific evidence selectors', () => {
    expect(validateLearningSelection({ capability: 'wrong-question-practice', studentRef: 'student-001' })).toBe('请选择错题。');
    expect(validateLearningSelection({ capability: 'wrong-question-practice', studentRef: 'student-001', wrongQuestionRef: 'wrong-momentum-5' })).toBeNull();
  });

  it('keeps personal artifacts in direct composer', () => {
    expect(deliveryTarget({ capability: 'class-recap', studentRef: 'student-001', lessonRef: 'lesson-momentum-0808' }, WORKBUDDY_IM_LEARNING_CATALOG, 'class')).toEqual({ kind: 'direct-composer', threadRef: 'direct-wang-li' });
    expect(deliveryTarget({ capability: 'personalized-reminder', studentRef: 'all-pending', assignmentRef: 'homework-momentum-a', reminderReasonRef: 'homework-submission' }, WORKBUDDY_IM_LEARNING_CATALOG, 'class')).toEqual({ kind: 'class-review' });
  });

  it('builds a teacher-visible request without database details', () => {
    const request = buildLearningTeacherRequest({ capability: 'learning-summary', studentRef: 'student-001', periodRef: 'period-this-week' }, WORKBUDDY_IM_LEARNING_CATALOG);
    expect(request).toContain('个人学情总结');
    expect(request).toContain('李明');
    expect(request).not.toMatch(/SQL|数据库|表名/u);
  });

  it('rejects stale or cross-student business references', () => {
    expect(validateLearningSelectionAgainstCatalog({ capability: 'personalized-reminder', studentRef: 'all-pending', reminderReasonRef: 'homework-correction', assignmentRef: 'homework-correction' }, WORKBUDDY_IM_LEARNING_CATALOG)).toContain('不匹配');
    expect(validateLearningSelectionAgainstCatalog({ capability: 'class-recap', studentRef: 'student-001', lessonRef: 'missing-lesson' }, WORKBUDDY_IM_LEARNING_CATALOG)).toContain('已更新');
  });

  it('uses catalog-declared reminder compatibility for the DW-derived sample', () => {
    expect(validateLearningSelectionAgainstCatalog({ capability: 'personalized-reminder', studentRef: 'dw-student-001', reminderReasonRef: 'homework-submission', assignmentRef: 'dw-task-vocabulary' }, DW_DERIVED_IM_LEARNING_CATALOG)).toBeNull();
    expect(validateLearningSelectionAgainstCatalog({ capability: 'personalized-reminder', studentRef: 'dw-all-follow-up', reminderReasonRef: 'homework-correction', assignmentRef: 'dw-task-class-confirmation' }, DW_DERIVED_IM_LEARNING_CATALOG)).toContain('不匹配');
  });

  it('creates a versioned artifact with recipient, evidence and delivery facts', () => {
    const artifact = createPersonalizedLearningArtifact({
      sessionRef: 'session-1',
      snapshot: { id: 'snapshot-1', version: 'v1', actorRef: 'teacher-1', tenantRef: 'tenant-1', threadRef: 'class-physics-3', channel: 'class', use: 'private-assistance', sources: [], items: [{ key: 'learning-evidence-1', label: '课堂表现', value: '证据', sourceRef: 'fixture', sensitivity: 'student-personal' }], recentMessages: [], excludedSensitiveCount: 0, truthLabel: 'fixed-demo' },
      selection: { capability: 'learning-summary', studentRef: 'student-001', periodRef: 'period-this-week' },
      catalog: WORKBUDDY_IM_LEARNING_CATALOG,
      body: '阶段总结',
    });
    expect(artifact).toMatchObject({ recipientLabel: '李明', delivery: 'direct-composer', targetThreadRef: 'direct-wang-li', version: 1 });
    expect(artifact.evidenceLabels).toEqual(['课堂表现']);
    expect(revisePersonalizedLearningArtifact(artifact, '修改后')).toMatchObject({ body: '修改后', version: 2 });
  });
});
