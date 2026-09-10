import { describe, expect, it } from 'vitest';
import {
  groupDirectoryFriends,
  projectDirectoryClasses,
  projectFriendEvents,
  projectOrganization,
  searchDirectoryObjects,
} from './message-directory';
import { MESSAGE_DIRECTORY_SNAPSHOT } from '@mocks/scenarios/message-directory';

describe('message directory domain', () => {
  it('keeps role visibility while grouping friends and classes', () => {
    const groups = groupDirectoryFriends(MESSAGE_DIRECTORY_SNAPSHOT, 'teacher');
    expect(groups.map(({ initial }) => initial)).toEqual(['L', 'Z']);
    expect(groups.flatMap(({ people }) => people.map(({ name }) => name))).toEqual(['李明', '张老师']);
    expect(projectDirectoryClasses(MESSAGE_DIRECTORY_SNAPSHOT, 'student-family').map(({ name }) => name)).toContain('初三英语 2 班');
    expect(projectDirectoryClasses(MESSAGE_DIRECTORY_SNAPSHOT, 'student-family').map(({ name }) => name)).not.toContain('高二物理 1 班');
  });

  it('sorts new-friend events by date and resolves visible people', () => {
    const groups = projectFriendEvents(MESSAGE_DIRECTORY_SNAPSHOT, 'teacher');
    expect(groups[0]?.date).toBe('2026-09-09');
    expect(groups[0]?.events[0]?.person.name).toBe('林老师');
  });

  it('projects an organization breadcrumb without leaking hidden units', () => {
    const physics = projectOrganization(MESSAGE_DIRECTORY_SNAPSHOT, 'teacher', 'org-physics');
    expect(physics?.breadcrumbs.map(({ name }) => name)).toEqual(['ClassIn 教学机构（演示）', '教学中心', '物理教研组']);
    expect(physics?.people.map(({ name }) => name)).toEqual(['李明', '林老师', '张老师']);
  });

  it('searches contacts, class codes and open-course ids as distinct objects', () => {
    expect(searchDirectoryObjects(MESSAGE_DIRECTORY_SNAPSHOT, 'teacher', '139****0317')).toMatchObject([{ kind: 'contact', title: '张老师' }]);
    expect(searchDirectoryObjects(MESSAGE_DIRECTORY_SNAPSHOT, 'teacher', 'PHY2303')).toMatchObject([{ kind: 'class', title: '高二物理 3 班' }]);
    expect(searchDirectoryObjects(MESSAGE_DIRECTORY_SNAPSHOT, 'student-family', 'OC-READ-0808')).toMatchObject([{ kind: 'open-course', title: '高效阅读公开课' }]);
  });
});
