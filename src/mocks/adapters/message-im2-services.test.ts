import { describe, expect, it } from 'vitest';
import { mockConversationResourceRepository } from './message-im2-services';

describe('mock conversation resource repository', () => {
  it('isolates resources by thread and class before applying search filters', async () => {
    const physics = await mockConversationResourceRepository.search({
      threadId: 'class-physics-3', classId: 'physics-3', query: '', kind: 'all',
    });
    const english = await mockConversationResourceRepository.search({
      threadId: 'class-english-2', classId: 'english-2', query: '', kind: 'all',
    });
    expect(physics.map(({ id }) => id)).toEqual([
      'res-momentum-sheet', 'res-collision-board', 'res-unit-review', 'res-homework-guide',
    ]);
    expect(english.map(({ id }) => id)).toEqual(['res-reading-locator', 'res-reading-map']);
    expect(physics.some(({ id }) => english.some((resource) => resource.id === id))).toBe(false);
  });

  it('does not fall back to a global resource collection for an unknown scope', async () => {
    await expect(mockConversationResourceRepository.search({
      threadId: 'missing-thread', classId: 'missing-class', query: '', kind: 'all',
    })).resolves.toEqual([]);
  });

  it('keeps direct-conversation resources separate from class-space resources', async () => {
    const resources = await mockConversationResourceRepository.search({
      threadId: 'direct-wang-li', query: '订正', kind: 'document',
    });
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({ id: 'res-direct-correction', source: 'conversation' });
  });
});
