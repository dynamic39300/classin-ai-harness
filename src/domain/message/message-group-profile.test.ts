import { describe, expect, it } from 'vitest';
import { projectMessageGroupProfile } from './message-group-profile';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_DIRECTORY_SNAPSHOT } from '@mocks/scenarios/message-directory';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';

describe('message group profile', () => {
  it('projects visible class facts and messaging state from existing domains', () => {
    const thread = MESSAGE_THREADS.find(({ id }) => id === 'class-physics-3')!;
    const profile = projectMessageGroupProfile('teacher', thread, CLASS_RECORDS, MESSAGE_DIRECTORY_SNAPSHOT.classes, true);
    expect(profile).toMatchObject({
      className: '高二物理 3 班',
      classCode: 'PHY2303',
      ownerName: '王老师',
      memberCount: 30,
      currentRoleLabel: '班主任',
      messagingStatus: 'muted',
    });
    expect(profile?.members.map(({ displayName }) => displayName)).toContain('小吴');
    expect(profile?.announcementTitle).toBe('课前练习单提醒');
  });

  it('returns no profile for an invisible or non-class conversation', () => {
    const teacherOnly = MESSAGE_THREADS.find(({ id }) => id === 'class-physics-1')!;
    const direct = MESSAGE_THREADS.find(({ category }) => category === 'direct')!;
    expect(projectMessageGroupProfile('student-family', teacherOnly, CLASS_RECORDS, MESSAGE_DIRECTORY_SNAPSHOT.classes, false)).toBeNull();
    expect(projectMessageGroupProfile('teacher', direct, CLASS_RECORDS, MESSAGE_DIRECTORY_SNAPSHOT.classes, false)).toBeNull();
  });
});
