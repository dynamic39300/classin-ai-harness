import type { TeachingDynamicsAdapter, TeachingDynamicsRequest } from '@contracts/workbuddy/teaching-dynamics';
import { createTeachingDynamicsSnapshot } from '@mocks/scenarios/workbuddy-im-teaching-dynamics';

export class FixedWorkBuddyImTeachingDynamicsAdapter implements TeachingDynamicsAdapter {
  constructor(private readonly now: () => Date) {}

  async list(request: TeachingDynamicsRequest) {
    if (!request.actorRef || !request.tenantRef || !request.target.threadId) {
      throw new Error('当前教学会话信息不完整，请刷新后重试。');
    }
    return createTeachingDynamicsSnapshot(request, this.now());
  }
}
