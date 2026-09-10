import type { AppRole } from '@domain/account/role';

export type DirectoryRelationView = 'new-friends' | 'classes' | 'friends' | 'organization';
export type DirectorySearchKind = 'all' | 'contact' | 'class' | 'open-course';
export type DirectoryFriendState = 'friend' | 'recommended' | 'pending' | 'accepted' | 'none';

export type DirectoryPerson = Readonly<{
  id: string;
  name: string;
  initial: string;
  identityLabel: string;
  relationship: string;
  organizationUnitId: string;
  classInId: string;
  phoneMasked: string;
  emailMasked: string;
  remark?: string;
  recommendationReason?: string;
  friendState: DirectoryFriendState;
  visibleTo: readonly AppRole[];
  targetThreadId?: string;
}>;

export type DirectoryClass = Readonly<{
  id: string;
  name: string;
  classCode: string;
  ownerName: string;
  memberCount: number;
  visibleTo: readonly AppRole[];
  memberRoles: readonly AppRole[];
  threadId?: string;
}>;

export type DirectoryOpenCourse = Readonly<{
  id: string;
  name: string;
  courseCode: string;
  subject: string;
  instructorName: string;
  scheduleLabel: string;
  statusLabel: string;
  visibleTo: readonly AppRole[];
}>;

export type DirectoryOrganizationUnit = Readonly<{
  id: string;
  name: string;
  parentId: string | null;
  visibleTo: readonly AppRole[];
}>;

export type DirectoryFriendEvent = Readonly<{
  id: string;
  personId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'ignored';
  direction: 'incoming' | 'outgoing';
  visibleTo: readonly AppRole[];
}>;

export type MessageDirectorySnapshot = Readonly<{
  people: readonly DirectoryPerson[];
  classes: readonly DirectoryClass[];
  openCourses: readonly DirectoryOpenCourse[];
  organizationUnits: readonly DirectoryOrganizationUnit[];
  friendEvents: readonly DirectoryFriendEvent[];
  identityByRole: Readonly<Record<AppRole, Readonly<{ name: string; inCode: string; qrLabel: string }>>>;
}>;

export type DirectorySearchResult =
  | Readonly<{ kind: 'contact'; id: string; title: string; subtitle: string; person: DirectoryPerson }>
  | Readonly<{ kind: 'class'; id: string; title: string; subtitle: string; classRecord: DirectoryClass }>
  | Readonly<{ kind: 'open-course'; id: string; title: string; subtitle: string; openCourse: DirectoryOpenCourse }>;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

export function getVisibleDirectoryPeople(snapshot: MessageDirectorySnapshot, role: AppRole): DirectoryPerson[] {
  return snapshot.people.filter(({ visibleTo }) => visibleTo.includes(role));
}

export function groupDirectoryFriends(snapshot: MessageDirectorySnapshot, role: AppRole): ReadonlyArray<Readonly<{
  initial: string;
  people: readonly DirectoryPerson[];
}>> {
  const groups = new Map<string, DirectoryPerson[]>();
  for (const person of getVisibleDirectoryPeople(snapshot, role).filter(({ friendState }) => friendState === 'friend')) {
    const initial = person.initial.toLocaleUpperCase();
    groups.set(initial, [...(groups.get(initial) ?? []), person]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([initial, people]) => Object.freeze({
      initial,
      people: [...people].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
    }));
}

export function projectFriendEvents(snapshot: MessageDirectorySnapshot, role: AppRole): ReadonlyArray<Readonly<{
  date: string;
  events: readonly Readonly<{ event: DirectoryFriendEvent; person: DirectoryPerson }>[];
}>> {
  const visiblePeople = new Map(getVisibleDirectoryPeople(snapshot, role).map((person) => [person.id, person]));
  const groups = new Map<string, Array<{ event: DirectoryFriendEvent; person: DirectoryPerson }>>();
  for (const event of snapshot.friendEvents
    .filter(({ visibleTo }) => visibleTo.includes(role))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())) {
    const person = visiblePeople.get(event.personId);
    if (!person) continue;
    const date = event.createdAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), { event, person }]);
  }
  return [...groups.entries()].map(([date, events]) => Object.freeze({ date, events }));
}

export function projectDirectoryClasses(snapshot: MessageDirectorySnapshot, role: AppRole): DirectoryClass[] {
  return snapshot.classes
    .filter(({ visibleTo }) => visibleTo.includes(role))
    .sort((left, right) => Number(right.memberRoles.includes(role)) - Number(left.memberRoles.includes(role))
      || left.name.localeCompare(right.name, 'zh-CN'));
}

export function projectOrganization(
  snapshot: MessageDirectorySnapshot,
  role: AppRole,
  selectedUnitId?: string,
): Readonly<{
  current: DirectoryOrganizationUnit;
  breadcrumbs: readonly DirectoryOrganizationUnit[];
  childUnits: readonly DirectoryOrganizationUnit[];
  people: readonly DirectoryPerson[];
}> | null {
  const visibleUnits = snapshot.organizationUnits.filter(({ visibleTo }) => visibleTo.includes(role));
  const current = visibleUnits.find(({ id }) => id === selectedUnitId)
    ?? visibleUnits.find(({ parentId }) => parentId === null);
  if (!current) return null;
  const byId = new Map(visibleUnits.map((unit) => [unit.id, unit]));
  const breadcrumbs: DirectoryOrganizationUnit[] = [];
  let cursor: DirectoryOrganizationUnit | undefined = current;
  while (cursor) {
    breadcrumbs.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return Object.freeze({
    current,
    breadcrumbs,
    childUnits: visibleUnits.filter(({ parentId }) => parentId === current.id),
    people: getVisibleDirectoryPeople(snapshot, role)
      .filter(({ organizationUnitId }) => organizationUnitId === current.id)
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN')),
  });
}

export function searchDirectoryObjects(
  snapshot: MessageDirectorySnapshot,
  role: AppRole,
  query: string,
  kind: DirectorySearchKind = 'all',
): DirectorySearchResult[] {
  const term = normalize(query);
  if (!term) return [];
  const results: DirectorySearchResult[] = [];
  if (kind === 'all' || kind === 'contact') {
    for (const person of getVisibleDirectoryPeople(snapshot, role)) {
      if (!normalize([person.name, person.classInId, person.phoneMasked, person.emailMasked, person.relationship, person.remark ?? ''].join(' ')).includes(term)) continue;
      results.push(Object.freeze({ kind: 'contact', id: person.id, title: person.name, subtitle: `${person.identityLabel} · ${person.relationship}`, person }));
    }
  }
  if (kind === 'all' || kind === 'class') {
    for (const classRecord of snapshot.classes.filter(({ visibleTo }) => visibleTo.includes(role))) {
      if (!normalize([classRecord.name, classRecord.classCode, classRecord.ownerName].join(' ')).includes(term)) continue;
      results.push(Object.freeze({ kind: 'class', id: classRecord.id, title: classRecord.name, subtitle: `班级号 ${classRecord.classCode} · ${classRecord.memberCount} 人`, classRecord }));
    }
  }
  if (kind === 'all' || kind === 'open-course') {
    for (const openCourse of snapshot.openCourses.filter(({ visibleTo }) => visibleTo.includes(role))) {
      if (!normalize([openCourse.name, openCourse.courseCode, openCourse.subject, openCourse.instructorName].join(' ')).includes(term)) continue;
      results.push(Object.freeze({ kind: 'open-course', id: openCourse.id, title: openCourse.name, subtitle: `公开课 ID ${openCourse.courseCode} · ${openCourse.instructorName}`, openCourse }));
    }
  }
  const order: Record<DirectorySearchResult['kind'], number> = { contact: 0, class: 1, 'open-course': 2 };
  return results.sort((left, right) => order[left.kind] - order[right.kind] || left.title.localeCompare(right.title, 'zh-CN'));
}
