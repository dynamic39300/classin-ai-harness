// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { authorizeClassInRuntime } from './classin-runtime-authorization';
import type { ClassInScene } from '../src/contracts/classin-test';
import { createRuntimeContextEnvelope } from '../src/domain/workbuddy/runtime-context-envelope';
import { projectContext } from '../src/domain/classin-test/projections';
const scene: ClassInScene = {
  environment: 'classin-test', teacher: { id: 'classin-test:teacher:1', name: '老师' }, schoolRef: 'classin-test:school:1', class: { id: '1', name: '班级' }, course: { id: '2', name: '课程' },
  units: [], activities: [], members: [], capturedAt: new Date().toISOString(), version: 'v1', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' },
};
describe('ClassIn per-turn runtime authorization', () => {
  it('binds trusted scope and the current declared use with a bounded lifetime', () => {
    const context = projectContext(scene, 'message-draft');
    expect(authorizeClassInRuntime(scene, createRuntimeContextEnvelope(context, '任务提醒'), 'cmd1', 100)).toEqual({ commandId: 'cmd1', use: 'message-draft', actorRef: scene.teacher.id, tenantRef: scene.schoolRef, threadRef: context.threadRef, expiresAt: 600100 });
  });
  it('rejects absent, malformed, foreign or fake context instead of granting access', () => {
    const context = projectContext(scene, 'private-assistance');
    for (const text of ['读取真实数据', '[[TEACHBUDDY_CONTEXT_V1]]\ninvalid',
      createRuntimeContextEnvelope({ ...context, actorRef: 'other' }, '查询'),
      createRuntimeContextEnvelope({ ...context, tenantRef: 'other' }, '查询'),
      createRuntimeContextEnvelope({ ...context, threadRef: 'other' }, '查询'),
      createRuntimeContextEnvelope({ ...context, truthLabel: 'simulation' as typeof context.truthLabel }, '查询')]) expect(() => authorizeClassInRuntime(scene, text, 'cmd1')).toThrow();
  });
});
