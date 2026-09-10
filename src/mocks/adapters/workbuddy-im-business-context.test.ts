import { describe, expect, it } from 'vitest';
import { buildLearningTeacherRequest } from '@domain/workbuddy/personalized-learning-service';
import { createRuntimeContextEnvelope } from '@domain/workbuddy/runtime-context-envelope';
import { WORKBUDDY_IM_LEARNING_CATALOG } from '@mocks/scenarios/workbuddy-im-learning-evidence';
import { createTeachingDynamicsSnapshot, TEACHING_DYNAMICS_DEMO_NOW } from '@mocks/scenarios/workbuddy-im-teaching-dynamics';
import { FixedWorkBuddyImBusinessContextAdapter } from './workbuddy-im-business-context';

describe('fixed WorkBuddy IM business context adapter', () => {
  it('returns minimum business semantics and excludes system messages', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-09-08T00:00:00.000Z'));
    const snapshot = await adapter.capture({
      actorRef: 'teacher-1', tenantRef: 'school-1', use: 'private-assistance',
      target: { classId: 'class-1', classLabel: '高二物理 3 班', threadId: 'thread-1', memberCount: 30, recentMessages: [
        { authorRole: 'system', authorName: '系统', body: '内部通知' },
        { authorRole: 'student-family', authorName: '李明', body: '明天交吗？' },
      ] },
    });
    expect(snapshot).toMatchObject({ actorRef: 'teacher-1', tenantRef: 'school-1', threadRef: 'thread-1', channel: 'class', truthLabel: 'fixed-demo', excludedSensitiveCount: 1 });
    expect(snapshot.items.map((item) => item.key)).toEqual(['conversation-label', 'member-count']);
    expect(snapshot.recentMessages).toEqual([{ authorRole: 'student-family', authorName: '李明', body: '明天交吗？' }]);
    expect(JSON.stringify(snapshot)).not.toContain('database');
  });

  it('keeps the source version stable until governed business facts change', async () => {
    let now = new Date('2026-09-08T00:00:00.000Z');
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => now);
    const request = { actorRef: 'teacher-1', tenantRef: 'school-1', use: 'private-assistance' as const, target: { classId: 'class-1', classLabel: '高二物理 3 班', threadId: 'thread-1', recentMessages: [{ authorRole: 'student-family' as const, authorName: '李明', body: '明天交吗？' }] } };
    const first = await adapter.capture(request);
    now = new Date('2026-09-08T00:05:00.000Z');
    const refreshed = await adapter.capture(request);
    const changed = await adapter.capture({ ...request, target: { ...request.target, recentMessages: [...request.target.recentMessages, { authorRole: 'teacher' as const, authorName: '王老师', body: '明天交。' }] } });
    expect(refreshed.sources[0]?.version).toBe(first.sources[0]?.version);
    expect(refreshed.sources[0]?.capturedAt).not.toBe(first.sources[0]?.capturedAt);
    expect(changed.sources[0]?.version).not.toBe(first.sources[0]?.version);
  });

  it('injects the resettable physics teaching fixture into the AI context', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-08-09T14:40:00+08:00'));
    const snapshot = await adapter.capture({
      actorRef: 'teacher-001', tenantRef: 'classin-demo-school', use: 'private-assistance',
      target: { kind: 'class', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3', memberCount: 30, recentMessages: [] },
      focusRefs: ['lesson-wave-0808', 'task-plan-wave-0808', 'homework-momentum-a', 'wrong-question-set-physics-recent', 'period-this-week'],
    });

    expect(snapshot.truthLabel).toBe('fixed-demo');
    expect(snapshot.sources).toContainEqual(expect.objectContaining({ sourceRef: 'fixed-teaching-context:physics-im-context-2026-08-09-v2', version: 'physics-im-context-2026-08-09-v2' }));
    expect(snapshot.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'lesson-wave-0808:lesson-outline', value: expect.stringContaining('波速由介质决定') }),
      expect.objectContaining({ key: 'task-plan-wave-0808:task-overview', value: expect.stringContaining('3 份作业和 1 次测验') }),
      expect.objectContaining({ key: 'homework-momentum-a:homework-missing', value: expect.stringContaining('李明、周然、陈晨') }),
      expect.objectContaining({ key: 'wrong-question-set-physics-recent:wrong-6', value: expect.stringContaining('新波长1m') }),
      expect.objectContaining({ key: 'period-this-week:class-next', value: expect.stringContaining('错题卡') }),
    ]));
    expect(snapshot.items.every(({ value }) => value.length <= 240)).toBe(true);
  });

  it('keeps every physics suggestion within the runtime input limit while retaining scoped evidence', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => TEACHING_DYNAMICS_DEMO_NOW);
    const target = { kind: 'class' as const, classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3', memberCount: 30, recentMessages: [] };
    const dynamics = createTeachingDynamicsSnapshot({ actorRef: 'teacher-001', tenantRef: 'classin-demo-school', target }, TEACHING_DYNAMICS_DEMO_NOW);
    const actions = dynamics.stages.flatMap(({ items }) => items.flatMap(({ action }) => action ? [action] : []));

    expect(actions).toHaveLength(10);
    for (const dynamicAction of actions) {
      const request = { actorRef: 'teacher-001', tenantRef: 'classin-demo-school', use: 'private-assistance' as const, target, focusRefs: dynamicAction.contextRefs, query: dynamicAction.teacherRequest };
      const snapshot = dynamicAction.learningSelection
        ? await adapter.captureLearningContext({ ...request, selection: dynamicAction.learningSelection })
        : await adapter.capture(request);
      const taskRequest = dynamicAction.learningSelection
        ? buildLearningTeacherRequest(dynamicAction.learningSelection, WORKBUDDY_IM_LEARNING_CATALOG, dynamicAction.teacherRequest)
        : dynamicAction.teacherRequest;
      const envelope = createRuntimeContextEnvelope(snapshot, taskRequest, dynamicAction.teacherRequest);

      expect(envelope.length, `${dynamicAction.label} should leave room for runtime generation instructions`).toBeLessThanOrEqual(3_800);
      expect(envelope).toContain('fixed-teaching-context:physics-im-context-2026-08-09-v2');
    }
  });

  it('retrieves a compact course-plan context for a freeform schedule question', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => TEACHING_DYNAMICS_DEMO_NOW);
    const teacherRequest = '我们接下来要上的课程都有什么？分别列出课程名称和时间。';
    const snapshot = await adapter.capture({
      actorRef: 'teacher-001', tenantRef: 'classin-demo-school', use: 'private-assistance', query: teacherRequest,
      target: { kind: 'class', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3', memberCount: 30, recentMessages: [] },
    });
    const envelope = createRuntimeContextEnvelope(snapshot, teacherRequest);

    expect(envelope.length).toBeLessThanOrEqual(4_000);
    expect(envelope).toContain('8月10日19:00电磁感应导入');
    expect(envelope).toContain('8月16日15:00阶段复习与测评');
    expect(envelope).not.toContain('wrong-question-set-physics-recent');
  });

  it('separates selector labels from selected learning evidence', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-09-08T00:00:00.000Z'));
    const target = { kind: 'direct' as const, classId: 'direct:direct-wang-li', classLabel: '李明', threadId: 'direct-wang-li', recentMessages: [] };
    const catalog = await adapter.listLearningContext({ actorRef: 'teacher-1', tenantRef: 'school-1', target });
    expect(catalog.lockedStudentRef).toBe('student-001');
    expect(catalog.students).toHaveLength(1);
    expect(JSON.stringify(catalog)).not.toContain('1×4');

    const snapshot = await adapter.captureLearningContext({
      actorRef: 'teacher-1', tenantRef: 'school-1', target, use: 'private-assistance',
      selection: { capability: 'wrong-question-practice', studentRef: 'student-001', wrongQuestionRef: 'wrong-momentum-5' },
    });
    expect(snapshot.items.some(({ label, value }) => label === '学生作答' && value.includes('未把向左速度记为负值'))).toBe(true);
    expect(snapshot.sources.at(-1)).toMatchObject({ kind: 'fixed-demo', sourceRef: 'learning-scenario:wrong-question-practice' });
  });

  it('rejects a student outside the direct conversation scope', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-09-08T00:00:00.000Z'));
    const target = { kind: 'direct' as const, classId: 'direct:direct-wang-li', classLabel: '李明', threadId: 'direct-wang-li', recentMessages: [] };
    await expect(adapter.captureLearningContext({
      actorRef: 'teacher-1', tenantRef: 'school-1', target, use: 'private-assistance',
      selection: { capability: 'learning-summary', studentRef: 'student-003', periodRef: 'period-this-week' },
    })).rejects.toThrow('权限范围');
  });

  it('projects the DW-derived sample without row identifiers or raw messages', async () => {
    const adapter = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-09-08T03:00:00.000Z'));
    const target = { kind: 'class' as const, classId: 'dw-expression-lab', classLabel: '表达与思辨体验班', threadId: 'class-dw-expression-lab', memberCount: 14, recentMessages: [] };
    const catalog = await adapter.listLearningContext({ actorRef: 'teacher-1', tenantRef: 'school-1', target });
    expect(catalog).toMatchObject({ truthLabel: 'read-only-business-data', version: 'dw-derived-im-2026-09-07-v1' });
    expect(catalog.students.find(({ ref }) => ref === 'dw-student-001')).toMatchObject({ label: '林悦', directThreadRef: 'direct-dw-lin' });

    const snapshot = await adapter.captureLearningContext({
      actorRef: 'teacher-1', tenantRef: 'school-1', target, use: 'private-assistance',
      selection: { capability: 'learning-summary', studentRef: 'dw-student-001', periodRef: 'dw-period-30-days' },
    });
    expect(snapshot).toMatchObject({ truthLabel: 'read-only-business-data' });
    expect(snapshot.sources.every(({ kind }) => kind === 'dw-hunter')).toBe(true);
    expect(snapshot.items.some(({ label, value }) => label === '阶段进展' && value.includes('Problem–Solution'))).toBe(true);
    expect(JSON.stringify(snapshot)).not.toMatch(/clusterid|sourceuid|msgdata|数据库/u);
  });
});
