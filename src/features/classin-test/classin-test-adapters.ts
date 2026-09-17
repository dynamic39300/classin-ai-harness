import type { ClassInActivityDetail, ClassInScene } from '@contracts/classin-test';
import type { ClassInMessageDraftAdapter, BusinessContextAdapter, BusinessContextRequest, BusinessContextSnapshot, ImSidecarAgentServices, LearningContextCatalog } from '@contracts/workbuddy/business-context';
import type { TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { createHttpAgentRuntime } from '@features/agent-runtime';
import { simulationNotice } from './classin-simulated-messages';
import { threadRef } from '@domain/classin-test/projections';
export async function readClassIn<T>(operation: string, params = new URLSearchParams()): Promise<T> {
  const response = await fetch(`/api/classin-test/${operation}?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(50_000) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || '测试数据读取失败，请重试。');
  if (!payload.data || typeof payload.data !== 'object') throw new Error('测试接口响应不完整。');
  return payload.data as T;
}
export const readScene = () => readClassIn<ClassInScene>('scene');
export const readDetail = (activityId: string) => readClassIn<ClassInActivityDetail>('detail', new URLSearchParams({ activityId }));
export function createClassInAgentServices(scene: ClassInScene, simulatedDelivery?: ClassInMessageDraftAdapter, runtime = createHttpAgentRuntime()): ImSidecarAgentServices {
  function authorize(request: Omit<BusinessContextRequest, 'use'>) {
    if (request.actorRef !== scene.teacher.id || request.tenantRef !== scene.schoolRef || request.target.threadId !== threadRef(scene) || request.target.classId !== scene.class.id || request.target.kind === 'direct') throw new Error('目标不属于当前测试班级。');
  }
  const businessContext: BusinessContextAdapter = {
    async capture(request) {
      authorize(request);
      const params = new URLSearchParams({ use: request.use, query: request.query ?? '' });
      request.focusRefs?.forEach((ref) => params.append('focus', ref));
      if (request.referencedMessageId) params.set('referenceId', request.referencedMessageId);
      const snapshot = await readClassIn<BusinessContextSnapshot>('context', params);
      return snapshot;
    },
    async listLearningContext(request) { authorize(request); return readClassIn<LearningContextCatalog>('catalog'); },
    async captureLearningContext() { throw new Error('个人服务需要核验学生私聊身份；当前入口支持课程及任务查询。'); },
  };
  return { runtime, businessContext,
    teachingDynamics: { async list(request) { authorize(request); return readClassIn<TeachingDynamicsSnapshot>('dynamics'); } },
    messageDraft: simulatedDelivery ?? { async execute(action, approval) { return { id: `unavailable:${action.id}`, actionRef: action.id, approvalRef: approval.id, status: 'permission_denied', result: '真实班级 IM 发送尚未接通；草稿未发送。', executedAt: new Date().toISOString() }; } },
    deliveryNotice: simulatedDelivery ? simulationNotice : undefined,
    deliveryUnavailableReason: simulatedDelivery ? undefined : '真实班级 IM 发送尚未接通；可以审阅、编辑和复制草稿。', actor: scene.teacher, tenantRef: scene.schoolRef, scope: 'classin-test' };
}
