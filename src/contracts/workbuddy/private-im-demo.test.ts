import { describe, expect, it } from 'vitest';
import { parsePrivateImDemoSnapshot } from './private-im-demo';

const valid = () => ({
  version: 'private-v1',
  capturedAt: '2026-09-08T00:00:00.000Z',
  dataWindow: '2026-09-01—2026-09-07（T-1）',
  truthLabel: 'read-only-business-data',
  source: 'dw-hunter-local',
  thread: {
    id: 'class-dw-expression-lab', classId: 'dw-expression-lab', title: '真实教学群',
    subtitle: '近期 21 位发言者', avatar: '教', updatedAt: '2026-09-07T12:00:00.000Z', memberCount: 21,
    entries: [{ id: 'local-1', authorRole: 'teacher', authorName: '教师别名', body: '请提交本次作业。', sentAt: '2026-09-07T12:00:00.000Z', kind: 'text' }],
  },
  context: {
    courseType: 1, courseStatus: 1, classCount: 0, messageCount: 86, activeSenderCount: 21,
    teachingTopics: ['作文习作'], interactionPatterns: ['教师布置差异化任务'], evidenceBoundary: '没有结构化评分时不生成个人诊断。',
  },
});

describe('private IM demo snapshot contract', () => {
  it('accepts the narrow local read-only projection', () => {
    expect(parsePrivateImDemoSnapshot(valid())?.thread.title).toBe('真实教学群');
  });

  it('rejects unexpected thread targets and oversized content', () => {
    expect(parsePrivateImDemoSnapshot({ ...valid(), thread: { ...valid().thread, id: 'other-thread' } })).toBeNull();
    expect(parsePrivateImDemoSnapshot({ ...valid(), thread: { ...valid().thread, entries: [{ ...valid().thread.entries[0], body: 'x'.repeat(2001) }] } })).toBeNull();
  });
});
