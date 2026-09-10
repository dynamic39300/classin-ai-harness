import { describe, expect, it } from 'vitest';
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
