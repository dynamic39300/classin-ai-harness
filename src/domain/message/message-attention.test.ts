import { describe, expect, it } from 'vitest';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { MESSAGE_IMPORTANT_REMINDERS } from '@mocks/scenarios/message-attention';
import {
  captureNewMessageBoundary,
  correctNewMessageBoundary,
  getUnreadMentionCount,
  projectActiveImportantReminder,
  projectClassAnnouncement,
  projectMentionAttentionItems,
  shouldDeliverDesktopNotification,
} from './message-attention';

const physics = MESSAGE_THREADS.find(({ id }) => id === 'class-physics-3')!;

describe('message attention domain', () => {
  it('projects one Class-owned announcement with role permissions', () => {
    expect(projectClassAnnouncement('teacher', physics, CLASS_RECORDS)).toMatchObject({
      id: 'announcement-physics-1',
      canManage: true,
      unread: false,
    });
    expect(projectClassAnnouncement('student-family', physics, CLASS_RECORDS)).toMatchObject({
      id: 'announcement-physics-1',
      canManage: false,
      unread: true,
    });
  });

  it('isolates important-reminder dismissal from the source message', () => {
    expect(projectActiveImportantReminder(physics.id, MESSAGE_IMPORTANT_REMINDERS, new Set(), new Date('2026-08-08T14:20:00+08:00'))?.id)
      .toBe('reminder-physics-homework-deadline');
    expect(projectActiveImportantReminder(physics.id, MESSAGE_IMPORTANT_REMINDERS, new Set(['reminder-physics-homework-deadline']), new Date('2026-08-08T14:20:00+08:00')))
      .toBeNull();
    expect(physics.entries.some(({ id }) => id === 'cp3-2')).toBe(true);
  });

  it('projects direct and everyone mentions for the correct actor without duplicates', () => {
    const teacher = projectMentionAttentionItems('teacher', MESSAGE_THREADS, new Set());
    const student = projectMentionAttentionItems('student-family', MESSAGE_THREADS, new Set());
    expect(teacher.find(({ messageId }) => messageId === 'cp3-4')).toMatchObject({ mentionKind: 'direct', read: false });
    expect(student.find(({ messageId }) => messageId === 'cp3-2')).toMatchObject({ mentionKind: 'everyone', read: false });
    expect(new Set(teacher.map(({ id }) => id)).size).toBe(teacher.length);
  });

  it('keeps read mention items visible while removing them from the unread count', () => {
    const initial = projectMentionAttentionItems('teacher', MESSAGE_THREADS, new Set());
    const target = initial.find(({ messageId }) => messageId === 'cp3-4')!;
    const next = projectMentionAttentionItems('teacher', MESSAGE_THREADS, new Set([target.id]));
    expect(next.find(({ id }) => id === target.id)?.read).toBe(true);
    expect(getUnreadMentionCount(next)).toBe(getUnreadMentionCount(initial) - 1);
  });

  it('captures and corrects the stable new-message boundary', () => {
    expect(captureNewMessageBoundary(physics, 'teacher')).toBe(physics.entries.at(-1)?.id);
    expect(captureNewMessageBoundary(physics, 'student-family')).toBe(physics.entries.at(-3)?.id);
    expect(correctNewMessageBoundary(physics, 'missing-message')).toBe(physics.entries[0]?.id);
  });

  it('routes desktop notifications around active and muted conversations', () => {
    expect(shouldDeliverDesktopNotification({ permission: 'granted', appVisible: true, activeThreadId: physics.id, targetThreadId: physics.id, muted: false, mentionKind: null })).toBe(false);
    expect(shouldDeliverDesktopNotification({ permission: 'granted', appVisible: false, activeThreadId: null, targetThreadId: physics.id, muted: true, mentionKind: null })).toBe(false);
    expect(shouldDeliverDesktopNotification({ permission: 'granted', appVisible: false, activeThreadId: null, targetThreadId: physics.id, muted: true, mentionKind: 'direct' })).toBe(true);
    expect(shouldDeliverDesktopNotification({ permission: 'denied', appVisible: false, activeThreadId: null, targetThreadId: physics.id, muted: false, mentionKind: 'direct' })).toBe(false);
  });
});
