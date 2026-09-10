import type { TemporaryClassroomAdapter, TemporaryClassroomCommandResult } from '@contracts/message/temporary-classroom';
import type { AppRole } from '@domain/account/role';
import type { TemporaryClassroomRecord } from '@domain/message/message-object-card';

export class MemoryTemporaryClassroomAdapter implements TemporaryClassroomAdapter {
  private readonly records: readonly TemporaryClassroomRecord[];

  constructor(records: readonly TemporaryClassroomRecord[]) {
    this.records = records.map((record) => Object.freeze({ ...record, visibleTo: [...record.visibleTo] }));
  }

  enter(role: AppRole, classroomId: string): TemporaryClassroomCommandResult {
    const record = this.records.find(({ id }) => id === classroomId);
    if (!record) return Object.freeze({ status: 'not-found', classroomId, message: '临时教室已失效，请返回群聊获取最新邀请。' });
    if (!record.visibleTo.includes(role)) return Object.freeze({ status: 'forbidden', classroomId, message: '当前身份不在本次邀请范围内。' });
    if (record.status === 'ended') return Object.freeze({ status: 'ended', classroomId, message: '临时教室已结束，无法再次进入。' });
    return Object.freeze({ status: 'success', classroomId, message: '已进入临时教室演示；当前 Demo 不会启动真实上课客户端。' });
  }

  reset(): void {}
}

export function createMemoryTemporaryClassroomAdapter(records: readonly TemporaryClassroomRecord[]): TemporaryClassroomAdapter {
  return new MemoryTemporaryClassroomAdapter(records);
}
