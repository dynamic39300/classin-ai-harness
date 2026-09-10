import type { AppRole } from '@domain/account/role';
import { CLASS_MEMBER_ROLE_LABELS, type ClassRecord } from '@domain/class/class';
import type { DirectoryClass } from '@domain/message/message-directory';
import type { MessageThread } from './message';

export type MessageGroupMember = Readonly<{
  id: string;
  name: string;
  displayName: string;
  roleLabel: string;
  relationship: string;
  currentUser: boolean;
}>;

export type MessageGroupProfile = Readonly<{
  threadId: string;
  classId: string;
  className: string;
  classCode: string;
  ownerName: string;
  memberCount: number;
  currentRoleLabel: string;
  members: readonly MessageGroupMember[];
  announcementTitle: string | null;
  announcementPreview: string | null;
  messagingStatus: 'normal' | 'muted' | 'read-only';
  messagingStatusLabel: string;
  updatedAt: string;
  truthLabel: 'SIMULATED';
}>;

export function projectMessageGroupProfile(
  role: AppRole,
  thread: MessageThread,
  classes: readonly ClassRecord[],
  directoryClasses: readonly DirectoryClass[],
  muted: boolean,
  readOnlyReason?: string,
): MessageGroupProfile | null {
  if (thread.category !== 'class' || !thread.classId || !thread.visibleTo.includes(role)) return null;
  const record = classes.find(({ id, visibleTo }) => id === thread.classId && visibleTo.includes(role));
  const directory = directoryClasses.find(({ id, visibleTo }) => id === thread.classId && visibleTo.includes(role));
  if (!record || !directory) return null;
  const currentRole = record.roleByAppRole[role];
  if (!currentRole) return null;
  const announcement = [...record.announcements].sort((left, right) => (
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ))[0] ?? null;
  return Object.freeze({
    threadId: thread.id,
    classId: record.id,
    className: record.name,
    classCode: directory.classCode,
    ownerName: directory.ownerName,
    memberCount: record.memberCount,
    currentRoleLabel: CLASS_MEMBER_ROLE_LABELS[currentRole],
    members: Object.freeze(record.members
      .filter(({ leftAt }) => leftAt === null)
      .map((member) => Object.freeze({
        id: member.id,
        name: member.name,
        displayName: member.classNickname ?? member.name,
        roleLabel: CLASS_MEMBER_ROLE_LABELS[member.role],
        relationship: member.relationship,
        currentUser: Boolean(member.isCurrentUser),
      }))),
    announcementTitle: announcement?.title ?? null,
    announcementPreview: announcement?.body.slice(0, 72) ?? null,
    messagingStatus: readOnlyReason ? 'read-only' : muted ? 'muted' : 'normal',
    messagingStatusLabel: readOnlyReason ?? (muted ? '当前班级已开启全体禁言' : '班级消息正常'),
    updatedAt: record.updatedAt,
    truthLabel: 'SIMULATED',
  });
}
