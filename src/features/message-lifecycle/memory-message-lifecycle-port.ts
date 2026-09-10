import type {
  MessageHistoryPage,
  MessageLifecyclePort,
  MessageThreadSyncResult,
} from '@contracts/message/message-lifecycle';
import type { AppRole } from '@domain/account/role';
import type { MessageThread } from '@domain/message/message';
import type {
  MessageConnectionSnapshot,
  MessageDeliveryFailureCode,
  MessageDeliveryReceipt,
  MessageDeliveryStatus,
  MessageSubmitRequest,
  MessageSubmitResult,
  MessageThreadAccess,
} from '@domain/message/message-lifecycle';

type AccessMap = Readonly<Record<string, MessageThreadAccess>>;

export type MemoryMessageLifecycleOptions = Readonly<{
  connectionStatus?: 'online' | 'offline';
  accessByRoleThread?: AccessMap;
  failurePlanByThread?: Readonly<Record<string, readonly MessageDeliveryFailureCode[]>>;
  deliveryStatus?: MessageDeliveryStatus;
  now?: () => string;
}>;

export interface MemoryMessageLifecyclePort extends MessageLifecyclePort {
  setConnection(status: 'online' | 'offline'): void;
  planFailure(threadId: string, code: MessageDeliveryFailureCode): void;
  failNextHistoryLoad(threadId: string): void;
}

const SIMULATED = 'SIMULATED' as const;

function accessKey(role: AppRole, threadId: string): string {
  return `${role}:${threadId}`;
}

function failureMessage(code: MessageDeliveryFailureCode): string {
  if (code === 'offline') return '当前网络不可用，消息尚未发送。';
  if (code === 'transient') return '消息发送失败，请稍后重试。';
  if (code === 'version-conflict') return '会话已更新，请同步后重试。';
  if (code === 'permission-denied') return '你没有在此会话发送消息的权限。';
  return '当前会话仅供查看。';
}

export function createMemoryMessageLifecyclePort(
  threads: ReadonlyArray<MessageThread>,
  options: MemoryMessageLifecycleOptions = {},
): MemoryMessageLifecyclePort {
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const threadVersionById = new Map(threads.map((thread) => [thread.id, Math.max(1, thread.entries.length)]));
  const receiptByRequestId = new Map<string, MessageDeliveryReceipt>();
  const historyByThreadId = new Map(threads.map((thread) => [thread.id, [...(thread.olderEntries ?? [])]]));
  const cursorState = new Map<string, { threadId: string; end: number }>();
  const initialCursorByThreadId = new Map<string, string | null>();
  const failurePlan = new Map(Object.entries(options.failurePlanByThread ?? {}).map(([id, plan]) => [id, [...plan]]));
  const historyFailures = new Set<string>();
  let cursorSequence = 0;
  let serverMessageSequence = 0;
  let connectionStatus = options.connectionStatus ?? 'online';
  let reconnecting = false;

  const createCursor = (threadId: string, end: number): string => {
    const token = `cursor_${++cursorSequence}`;
    cursorState.set(token, { threadId, end });
    return token;
  };

  for (const [threadId, history] of historyByThreadId) {
    initialCursorByThreadId.set(threadId, history.length ? createCursor(threadId, history.length) : null);
  }

  const getConnection = (): MessageConnectionSnapshot => Object.freeze({
    status: reconnecting ? 'reconnecting' : connectionStatus,
    message: reconnecting
      ? '正在重新连接消息服务…'
      : connectionStatus === 'online'
        ? '消息服务已连接'
        : '网络连接已中断，未发送消息会保留在当前会话。',
    truthLabel: SIMULATED,
  });

  const getThreadAccess = (role: AppRole, threadId: string): MessageThreadAccess => {
    const configured = options.accessByRoleThread?.[accessKey(role, threadId)];
    if (configured) return configured;
    const thread = threadById.get(threadId);
    if (!thread || !thread.visibleTo.includes(role)) {
      return Object.freeze({ mode: 'unavailable', reason: '当前账号无法访问此会话。', truthLabel: SIMULATED });
    }
    if (threadId === 'class-history-physics') {
      return Object.freeze({
        mode: 'read-only',
        reason: role === 'student-family'
          ? '你已退出该班级，历史消息、群资料和群文件仍可查看。'
          : '班级已结课，历史消息、群资料和群文件仍可查看。',
        truthLabel: SIMULATED,
      });
    }
    if (thread.category !== 'direct' && thread.category !== 'class') {
      return Object.freeze({ mode: 'read-only', reason: '该消息类型仅供查看。', truthLabel: SIMULATED });
    }
    return Object.freeze({ mode: 'write', truthLabel: SIMULATED });
  };

  return {
    getConnection,
    async reconnect() {
      reconnecting = true;
      await Promise.resolve();
      connectionStatus = 'online';
      reconnecting = false;
      return getConnection();
    },
    getThreadAccess,
    getCurrentThreadVersion(threadId) {
      return threadVersionById.get(threadId) ?? 0;
    },
    async submit(request: MessageSubmitRequest): Promise<MessageSubmitResult> {
      const duplicate = receiptByRequestId.get(request.clientRequestId);
      if (duplicate) return Object.freeze({ status: 'duplicate', receipt: duplicate });
      if (connectionStatus === 'offline') {
        return Object.freeze({ status: 'failed', code: 'offline', message: failureMessage('offline') });
      }
      const access = getThreadAccess(request.actorRole, request.threadId);
      if (access.mode !== 'write') {
        const code = access.mode === 'read-only' ? 'thread-read-only' : 'permission-denied';
        return Object.freeze({ status: 'failed', code, message: access.reason ?? failureMessage(code) });
      }
      const plannedFailure = failurePlan.get(request.threadId)?.shift();
      if (plannedFailure) {
        return Object.freeze({
          status: 'failed',
          code: plannedFailure,
          message: failureMessage(plannedFailure),
          latestThreadVersion: plannedFailure === 'version-conflict'
            ? threadVersionById.get(request.threadId) ?? 0
            : undefined,
        });
      }
      const currentVersion = threadVersionById.get(request.threadId) ?? 0;
      if (request.expectedThreadVersion !== currentVersion) {
        return Object.freeze({
          status: 'failed',
          code: 'version-conflict',
          message: failureMessage('version-conflict'),
          latestThreadVersion: currentVersion,
        });
      }
      const nextVersion = currentVersion + 1;
      threadVersionById.set(request.threadId, nextVersion);
      const receipt = Object.freeze({
        clientRequestId: request.clientRequestId,
        serverMessageId: `sim-message-${++serverMessageSequence}`,
        threadId: request.threadId,
        threadVersion: nextVersion,
        acceptedAt: options.now?.() ?? request.sentAt,
        deliveryStatus: options.deliveryStatus ?? 'read',
        readCount: request.threadId.startsWith('class-') ? 3 : 1,
        recipientCount: request.threadId.startsWith('class-') ? 29 : 1,
        truthLabel: SIMULATED,
      });
      receiptByRequestId.set(request.clientRequestId, receipt);
      return Object.freeze({ status: 'accepted', receipt });
    },
    async syncThread(threadId: string): Promise<MessageThreadSyncResult> {
      return Object.freeze({
        threadId,
        threadVersion: threadVersionById.get(threadId) ?? 0,
        truthLabel: SIMULATED,
      });
    },
    getInitialHistoryCursor(threadId) {
      return initialCursorByThreadId.get(threadId) ?? null;
    },
    async loadHistory({ role, threadId, cursor, limit }): Promise<MessageHistoryPage> {
      const access = getThreadAccess(role, threadId);
      if (access.mode === 'unavailable') throw new Error(access.reason ?? '当前会话不可用。');
      if (historyFailures.delete(threadId)) throw new Error('历史消息暂时无法加载，请重试。');
      const cursorValue = cursorState.get(cursor);
      if (!cursorValue || cursorValue.threadId !== threadId) throw new Error('历史游标已失效，请刷新会话。');
      const history = historyByThreadId.get(threadId) ?? [];
      const pageSize = Math.max(1, Math.min(50, limit));
      const start = Math.max(0, cursorValue.end - pageSize);
      const nextCursor = start > 0 ? createCursor(threadId, start) : null;
      return Object.freeze({
        entries: Object.freeze(history.slice(start, cursorValue.end)),
        nextCursor,
        truthLabel: SIMULATED,
      });
    },
    setConnection(status) {
      connectionStatus = status;
      reconnecting = false;
    },
    planFailure(threadId, code) {
      failurePlan.set(threadId, [...(failurePlan.get(threadId) ?? []), code]);
    },
    failNextHistoryLoad(threadId) {
      historyFailures.add(threadId);
    },
  };
}
