import type { AppRole } from '@domain/account/role';
import type { DirectoryPerson } from './message-directory';

export type MessageContactCard = Readonly<{
  id: string;
  kind: 'contact';
  personId: string;
  name: string;
  identityLabel: string;
  relationship: string;
  organizationLabel: string;
  classInId: string;
  phoneMasked: string;
  emailMasked: string;
  targetThreadId?: string;
  truthLabel: 'SIMULATED';
}>;

export type TemporaryClassroomStatus = 'live' | 'ended';

export type TemporaryClassroomCard = Readonly<{
  id: string;
  kind: 'temporary-classroom';
  classroomId: string;
  title: string;
  hostName: string;
  durationLabel: string;
  capacityLabel: string;
  participantLabel: string;
  status: TemporaryClassroomStatus;
  statusLabel: string;
  timeLabel: string;
  visibleTo: readonly AppRole[];
  truthLabel: 'SIMULATED';
}>;

export type MessageObjectCard = MessageContactCard | TemporaryClassroomCard;

export type TemporaryClassroomRecord = Readonly<{
  id: string;
  status: TemporaryClassroomStatus;
  visibleTo: readonly AppRole[];
}>;

export function createMessageContactCard(
  person: DirectoryPerson,
  organizationLabel: string,
): MessageContactCard {
  return Object.freeze({
    id: `contact-card-${person.id}`,
    kind: 'contact',
    personId: person.id,
    name: person.name,
    identityLabel: person.identityLabel,
    relationship: person.relationship,
    organizationLabel,
    classInId: person.classInId,
    phoneMasked: person.phoneMasked,
    emailMasked: person.emailMasked,
    targetThreadId: person.targetThreadId,
    truthLabel: 'SIMULATED',
  });
}

export function getMessageObjectCardPreview(cards: readonly MessageObjectCard[] | undefined): string {
  if (!cards?.length) return '';
  const contacts = cards.filter((card): card is MessageContactCard => card.kind === 'contact');
  const classrooms = cards.filter((card): card is TemporaryClassroomCard => card.kind === 'temporary-classroom');
  if (contacts.length && classrooms.length) return `[名片 ${contacts.length} 张、临时教室 ${classrooms.length} 个]`;
  if (contacts.length) return contacts.length === 1 ? `[名片] ${contacts[0]?.name ?? ''}`.trim() : `[名片 ${contacts.length} 张]`;
  return classrooms.length === 1 ? `[临时教室] ${classrooms[0]?.title ?? ''}`.trim() : `[临时教室 ${classrooms.length} 个]`;
}

export function canOpenContactCardThread(card: MessageContactCard, role: AppRole, visibleThreadIds: ReadonlySet<string>): boolean {
  return Boolean(card.targetThreadId && visibleThreadIds.has(card.targetThreadId) && role);
}
