import type { TemporaryClassroomCard, TemporaryClassroomRecord } from '@domain/message/message-object-card';

export const TEMPORARY_CLASSROOM_RECORDS: readonly TemporaryClassroomRecord[] = Object.freeze([
  { id: 'temp-physics-review', status: 'live', visibleTo: ['teacher', 'student-family'] },
  { id: 'temp-english-reading', status: 'ended', visibleTo: ['student-family'] },
]);

export const LIVE_PHYSICS_TEMPORARY_CLASSROOM_CARD: TemporaryClassroomCard = Object.freeze({
  id: 'temporary-classroom-card-physics-review',
  kind: 'temporary-classroom',
  classroomId: 'temp-physics-review',
  title: '动量守恒 15 分钟答疑',
  hostName: '王老师',
  durationLabel: '15 分钟',
  capacityLabel: '1V6 · 4/6 人',
  participantLabel: '本次邀请：李明、周然等 4 位成员',
  status: 'live',
  statusLabel: '正在进行 · 剩余 12 分钟',
  timeLabel: '14:08—14:23',
  visibleTo: ['teacher', 'student-family'] as const,
  truthLabel: 'SIMULATED',
});

export const ENDED_ENGLISH_TEMPORARY_CLASSROOM_CARD: TemporaryClassroomCard = Object.freeze({
  id: 'temporary-classroom-card-english-reading',
  kind: 'temporary-classroom',
  classroomId: 'temp-english-reading',
  title: '阅读定位小组答疑',
  hostName: '陈老师',
  durationLabel: '15 分钟',
  capacityLabel: '1V6 · 6/6 人',
  participantLabel: '本次邀请：李明等 6 位成员',
  status: 'ended',
  statusLabel: '已结束',
  timeLabel: '09:05—09:20',
  visibleTo: ['student-family'] as const,
  truthLabel: 'SIMULATED',
});
