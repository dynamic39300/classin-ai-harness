import type { ClassInScene } from '../src/contracts/classin-test/index.ts';
import { RUNTIME_CONTEXT_START, RUNTIME_CONTEXT_END } from '../src/shared/runtime-context-format.ts';
import { threadRef } from '../src/domain/classin-test/projections.ts';
import { ClassInError } from './classin-test-transport.ts';

export type ClassInRuntimeGrant = Readonly<{
  commandId: string; use: 'private-assistance' | 'message-draft'; expiresAt: number;
  actorRef: string; tenantRef: string; threadRef: string;
}>;
export function authorizeClassInRuntime(scene: ClassInScene, text: string, commandId: string, now = Date.now()): ClassInRuntimeGrant {
  let envelope;
  try {
    if (!text.startsWith(`${RUNTIME_CONTEXT_START}\n`)) throw new Error('Missing context');
    const end = text.indexOf(`\n${RUNTIME_CONTEXT_END}\n`);
    if (end < 0) throw new Error('Incomplete context');
    envelope = JSON.parse(text.slice(RUNTIME_CONTEXT_START.length + 1, end));
  } catch { throw new ClassInError('forbidden', '测试会话需要重新读取当前课程上下文。'); }
  if (!envelope || envelope.actorRef !== scene.teacher.id || envelope.tenantRef !== scene.schoolRef || envelope.threadRef !== threadRef(scene)
    || envelope.truthLabel !== 'read-only-business-data' || !['private-assistance', 'message-draft'].includes(envelope.use)) {
    throw new ClassInError('forbidden', '测试会话的身份、课程或数据用途不匹配。');
  }
  return { commandId, use: envelope.use, actorRef: scene.teacher.id, tenantRef: scene.schoolRef, threadRef: threadRef(scene), expiresAt: now + 600_000 };
}
