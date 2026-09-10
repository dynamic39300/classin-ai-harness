import { describe, expect, it } from 'vitest';
import { createMemoryMessageDirectoryAdapter } from './message-directory-adapter';

describe('memory message directory adapter', () => {
  it('saves remarks and keeps repeated commands idempotent', () => {
    const adapter = createMemoryMessageDirectoryAdapter();
    expect(adapter.saveRemark('teacher', 'person-li', '课代表').status).toBe('success');
    expect(adapter.saveRemark('teacher', 'person-li', '课代表').status).toBe('unchanged');
    expect(adapter.getSnapshot().people.find(({ id }) => id === 'person-li')?.remark).toBe('课代表');
  });

  it('creates one local friend request and resets it', () => {
    const adapter = createMemoryMessageDirectoryAdapter();
    expect(adapter.requestFriend('teacher', 'person-chen-research').status).toBe('success');
    expect(adapter.requestFriend('teacher', 'person-chen-research').status).toBe('unchanged');
    expect(adapter.getSnapshot().people.find(({ id }) => id === 'person-chen-research')?.friendState).toBe('pending');
    expect(adapter.reset().people.find(({ id }) => id === 'person-chen-research')?.friendState).toBe('recommended');
  });

  it('accepts incoming events only for the visible role', () => {
    const adapter = createMemoryMessageDirectoryAdapter();
    expect(adapter.resolveFriendEvent('student-family', 'friend-event-lin', 'accept').status).toBe('not-found');
    expect(adapter.resolveFriendEvent('teacher', 'friend-event-lin', 'accept').status).toBe('success');
    expect(adapter.getSnapshot().people.find(({ id }) => id === 'person-lin')?.friendState).toBe('friend');
  });
});
