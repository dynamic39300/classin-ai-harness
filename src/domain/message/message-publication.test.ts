import { describe, expect, it } from 'vitest';
import { OPEN_COURSE_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_PUBLICATION_SNAPSHOT } from '@mocks/scenarios/message-publication';
import { projectMessagePublicationThreads } from './message-publication';

const clock = new Date('2026-08-08T14:15:00+08:00');

describe('message publication projection', () => {
  it('keeps open-course business events in system and official content in official', () => {
    const threads = projectMessagePublicationThreads(OPEN_COURSE_RECORDS, MESSAGE_PUBLICATION_SNAPSHOT, clock);
    expect(threads.filter(({ id }) => id.startsWith('system-open-course')).every(({ category }) => category === 'system')).toBe(true);
    expect(threads.filter(({ id }) => id.startsWith('official-')).every(({ category }) => category === 'official')).toBe(true);
    expect(threads.filter(({ category }) => category === 'official')).toHaveLength(3);
  });

  it('projects scheduled, live, and ended actions from existing course facts', () => {
    const threads = projectMessagePublicationThreads(OPEN_COURSE_RECORDS, MESSAGE_PUBLICATION_SNAPSHOT, clock);
    expect(threads.find(({ id }) => id === 'system-open-course-open-math-live')?.notice?.actionTarget).toEqual({ kind: 'open-course', courseId: 'open-math-live', view: 'preflight' });
    expect(threads.find(({ id }) => id === 'system-open-course-open-reading')?.notice?.actionTarget).toEqual({ kind: 'open-course', courseId: 'open-reading', view: 'detail' });
    expect(threads.find(({ id }) => id === 'system-open-course-open-history')?.notice?.actionTarget).toEqual({ kind: 'open-course', courseId: 'open-history', view: 'review' });
  });

  it('preserves source visibility and official identity', () => {
    const threads = projectMessagePublicationThreads(OPEN_COURSE_RECORDS, MESSAGE_PUBLICATION_SNAPSHOT, clock);
    expect(threads.find(({ id }) => id === 'system-open-course-open-history')?.visibleTo).toEqual(['teacher']);
    expect(threads.find(({ id }) => id === 'official-update')?.notice).toMatchObject({ sourceLabel: 'ClassIn 助手 · 官方', presentation: 'official-content' });
  });
});
