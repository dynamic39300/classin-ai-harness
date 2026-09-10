import { describe, expect, it } from 'vitest';
import { MESSAGE_DIRECTORY_SNAPSHOT } from '@mocks/scenarios/message-directory';
import {
  canOpenContactCardThread,
  createMessageContactCard,
  getMessageObjectCardPreview,
} from './message-object-card';
import { LIVE_PHYSICS_TEMPORARY_CLASSROOM_CARD } from '@mocks/scenarios/message-object-cards';

describe('message object cards', () => {
  it('creates a stable minimal contact snapshot', () => {
    const person = MESSAGE_DIRECTORY_SNAPSHOT.people[0]!;
    const card = createMessageContactCard(person, '物理教研组');
    expect(card).toMatchObject({ kind: 'contact', personId: person.id, name: '李明', truthLabel: 'SIMULATED' });
    expect(card).not.toHaveProperty('visibleTo');
  });

  it('projects readable previews for contact and classroom cards', () => {
    const contact = createMessageContactCard(MESSAGE_DIRECTORY_SNAPSHOT.people[0]!, '物理教研组');
    expect(getMessageObjectCardPreview([contact])).toBe('[名片] 李明');
    expect(getMessageObjectCardPreview([LIVE_PHYSICS_TEMPORARY_CLASSROOM_CARD])).toContain('动量守恒 15 分钟答疑');
  });

  it('opens a contact thread only when the stable target remains visible', () => {
    const contact = createMessageContactCard(MESSAGE_DIRECTORY_SNAPSHOT.people[0]!, '物理教研组');
    expect(canOpenContactCardThread(contact, 'teacher', new Set(['direct-wang-li']))).toBe(true);
    expect(canOpenContactCardThread(contact, 'teacher', new Set())).toBe(false);
  });
});
