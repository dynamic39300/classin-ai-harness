import type { ClassInScene } from '@contracts/classin-test';
import type { ClassInMessageDraftAdapter, SendMessageReceipt } from '@contracts/workbuddy/business-context';
import type { MessageLifecyclePort } from '@contracts/message/message-lifecycle';
import type { MessageThread, MessageEntry } from '@domain/message/message';
import type { MessageDeliveryReceipt, MessageSubmitResult } from '@domain/message/message-lifecycle';
import type { MessageWorkspaceExtension, MessageAppendOptions } from '@features/message-workspace';
import { threadRef } from '@domain/classin-test/projections';

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
type Stored = { entries: MessageEntry[]; receipts: Record<string, { fingerprint: string; receipt: MessageDeliveryReceipt }> };
export const simulationNotice = '真实业务数据 · 消息发送仅老师端本机模拟 · 学生端不接收';
export function classInMessagesPath(scene: ClassInScene) {
  return `/teacher/messages?category=class&thread=${encodeURIComponent(threadRef(scene))}`;
}
export function createClassInMessageExtension(scene: ClassInScene, storage: StoragePort): MessageWorkspaceExtension {
  const id = threadRef(scene);
  const key = `classin:teacher-sim-messages:v1:${scene.teacher.id}:${scene.schoolRef}:${id}`;
  let saved: Stored = { entries: [], receipts: {} };
  const raw = storage.getItem(key);
  if (raw) {
    const value: Stored = JSON.parse(raw);
    if (!Array.isArray(value.entries) || !value.receipts || typeof value.receipts !== 'object'
      || value.entries.some((entry) => typeof entry.id !== 'string' || typeof entry.body !== 'string' || entry.authorRole !== 'teacher')
      || Object.values(value.receipts).some(({ receipt }) => receipt.threadId !== id || receipt.truthLabel !== 'SIMULATED' || receipt.deliveryStatus !== 'sent')) {
      throw new Error('本机模拟消息记录格式不完整，请先备份并清理该会话记录。');
    }
    saved = value;
  }
  let version = 1 + Object.keys(saved.receipts).length;
  const access = (role: string, target: string) => role === 'teacher' && target === id;
  const lifecyclePort: MessageLifecyclePort = {
    getConnection: () => ({ status: 'online', message: '老师端模拟消息', truthLabel: 'SIMULATED' }),
    async reconnect() { return this.getConnection(); },
    getThreadAccess: (role, target) => access(role, target) ? { mode: 'write', truthLabel: 'SIMULATED' } : { mode: 'unavailable', reason: '该测试会话只对老师端开放。', truthLabel: 'SIMULATED' },
    getCurrentThreadVersion: (target) => target === id ? version : 0,
    getInitialHistoryCursor: () => null,
    async syncThread(target) { return { threadId: target, threadVersion: target === id ? version : 0, truthLabel: 'SIMULATED' }; },
    async loadHistory({ role, threadId }) {
      if (!access(role, threadId)) throw new Error('该测试会话只对老师端开放。');
      return { entries: [], nextCursor: null, truthLabel: 'SIMULATED' };
    },
    async submit(request) {
      if (!access(request.actorRole, request.threadId)) return { status: 'failed', code: 'permission-denied', message: '该测试会话只对老师端开放。' };
      const fingerprint = JSON.stringify(request.content);
      const prior = saved.receipts[request.clientRequestId];
      if (prior) return prior.fingerprint === fingerprint
        ? { status: 'duplicate', receipt: prior.receipt }
        : { status: 'failed', code: 'version-conflict', message: '同一发送请求的内容已变化，请重新确认。' };
      if (request.expectedThreadVersion !== version) return { status: 'failed', code: 'version-conflict', message: '会话已更新，请同步后重试。', latestThreadVersion: version };
      const receipt: MessageDeliveryReceipt = { clientRequestId: request.clientRequestId, serverMessageId: `simulated:${request.clientRequestId}`, threadId: id, threadVersion: version + 1, acceptedAt: request.sentAt, deliveryStatus: 'sent', truthLabel: 'SIMULATED' };
      const entry: MessageEntry = { ...request.content, id: receipt.serverMessageId, authorRole: 'teacher', authorName: scene.teacher.name, sentAt: request.sentAt, delivery: { status: 'sent', clientRequestId: request.clientRequestId, attempt: 1, receipt } };
      const next = { entries: [...saved.entries, entry], receipts: { ...saved.receipts, [request.clientRequestId]: { fingerprint, receipt } } };
      try { storage.setItem(key, JSON.stringify(next)); }
      catch { return { status: 'failed', code: 'transient', message: '本机消息保存失败，尚未发送；请释放浏览器存储后重试。' }; }
      saved = next; version++;
      return { status: 'accepted', receipt };
    },
  };
  const thread: MessageThread = {
    id, category: 'class', visibleTo: ['teacher'], classId: scene.class.id,
    titleByRole: { teacher: scene.class.name }, subtitleByRole: { teacher: `${scene.course.name} · 真实数据` }, avatarByRole: { teacher: '测' },
    memberCount: scene.members.filter((member) => member.identity === 1).length,
    unreadByRole: { teacher: 0 }, updatedAt: saved.entries.at(-1)?.sentAt ?? scene.capturedAt, entries: saved.entries,
    integration: { label: simulationNotice, detailsPath: '/teacher/classin-test', teacherName: scene.teacher.name, capturedAt: scene.capturedAt, members: scene.members.map((member) => ({ id: member.id, name: member.name, roleLabel: member.identity === 1 ? '学生' : member.identity === 2 ? '旁听' : '测试班成员' })) },
  };
  return { threads: [thread], lifecyclePort, readEntries: (target) => target === id ? saved.entries : [], persist(threads) {
    const current = threads.find((candidate) => candidate.id === id);
    if (!current) return;
    // Submission commits before a success receipt. This hook only preserves later local edits/recalls.
    const entries = current.entries.filter((entry) => entry.authorRole === 'teacher' && entry.delivery?.status === 'sent');
    if (entries.length !== saved.entries.length || !entries.length) return;
    const next = { ...saved, entries };
    try { storage.setItem(key, JSON.stringify(next)); saved = next; } catch { /* The committed sends remain intact. */ }
  } };
}

export function createSimulatedClassInDraftAdapter(scene: ClassInScene, submit: (options: MessageAppendOptions & { clientRequestId?: string }) => Promise<MessageSubmitResult>): ClassInMessageDraftAdapter {
  return { async execute(action, approval): Promise<SendMessageReceipt> {
    const result = (status: SendMessageReceipt['status'], message: string, messageId?: string): SendMessageReceipt => ({ id: `sim-receipt:${action.id}`, actionRef: action.id, approvalRef: approval.id, status, result: message, executedAt: new Date().toISOString(), messageId });
    if (action.threadRef !== threadRef(scene) || action.actorRef !== scene.teacher.id || approval.approvedBy !== scene.teacher.id) return result('permission_denied', '目标或老师身份不匹配，未发送。');
    if (approval.actionRef !== action.id || approval.artifactRef.id !== action.artifactRef.id || approval.artifactRef.version !== action.artifactRef.version || !action.body.trim()) return result('stale_context', '草稿已变化，请重新确认。');
    const clientRequestId = `copilot:${scene.teacher.id}:${action.artifactRef.id}:${action.artifactRef.version}`;
    const sent = await submit({ role: 'teacher', authorName: scene.teacher.name, body: action.body, threadId: action.threadRef, sentAt: new Date().toISOString(), clientRequestId, messageId: `simulated:${clientRequestId}` });
    if (sent.status === 'failed') return result(sent.code === 'permission-denied' ? 'permission_denied' : sent.code === 'version-conflict' ? 'stale_context' : 'recoverable_failure', sent.message);
    return result('success', '已模拟发送，仅保存在本机老师端；学生端不接收。', `simulated:${clientRequestId}`);
  } };
}
