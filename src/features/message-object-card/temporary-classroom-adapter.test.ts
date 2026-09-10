import { describe, expect, it } from 'vitest';
import { TEMPORARY_CLASSROOM_RECORDS } from '@mocks/scenarios/message-object-cards';
import { createMemoryTemporaryClassroomAdapter } from './temporary-classroom-adapter';

describe('memory temporary classroom adapter', () => {
  it('separates live, ended, forbidden and missing outcomes', () => {
    const adapter = createMemoryTemporaryClassroomAdapter(TEMPORARY_CLASSROOM_RECORDS);
    expect(adapter.enter('teacher', 'temp-physics-review').status).toBe('success');
    expect(adapter.enter('student-family', 'temp-english-reading').status).toBe('ended');
    expect(adapter.enter('teacher', 'temp-english-reading').status).toBe('forbidden');
    expect(adapter.enter('teacher', 'missing').status).toBe('not-found');
  });
});
