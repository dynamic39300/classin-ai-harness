import { createClientId } from '@shared/client-id';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  appendLocalMessage,
  markCategoryRead,
  markThreadRead,
  prependMessageHistoryPage,
  recallClassMessage,
  updateMessageDelivery,
  type MessageThread,
} from '@domain/message/message';
import { toggleMessageReaction } from '@domain/message/im2-basic';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';
import { loadPrivateImDemoContext, mergePrivateImDemoThread } from '@mocks/adapters/private-im-demo-context';
import { isVerifiedGuidedExplanationContentReference } from '@domain/workbuddy/guided-explanation';
import {
  MessageWorkspaceContext,
  type MessageWorkspaceActions,
  type MessageWorkspaceState,
  type MessageWorkspaceExtension,
} from './message-workspace-store';
import {
  mockConversationResourceRepository,
  mockMessageHistorySearch,
  mockMessageTranslationService,
} from '@mocks/adapters/message-im2-services';
import type { MessageMediaAdapter } from '@contracts/message/message-media';
import { createBrowserMessageMediaAdapter } from '@features/message-media/message-media-adapter';
import type { ClassRecord } from '@domain/class/class';
import type { DesktopNotificationAdapter } from '@contracts/message/message-attention';
import { captureNewMessageBoundary, type MessageImportantReminder } from '@domain/message/message-attention';
import { createBrowserDesktopNotificationAdapter } from '@features/message-attention/desktop-notification-adapter';
import { CLASS_RECORDS } from '@mocks/scenarios/classes';
import { MESSAGE_IMPORTANT_REMINDERS } from '@mocks/scenarios/message-attention';
import type { MessageDirectoryAdapter } from '@contracts/message/message-directory';
import { createMemoryMessageDirectoryAdapter } from '@features/message-directory/message-directory-adapter';
import type { TemporaryClassroomAdapter } from '@contracts/message/temporary-classroom';
import { createMemoryTemporaryClassroomAdapter } from '@features/message-object-card/temporary-classroom-adapter';
import { TEMPORARY_CLASSROOM_RECORDS } from '@mocks/scenarios/message-object-cards';
import type { MessageLifecyclePort } from '@contracts/message/message-lifecycle';
import {
  createSendingMessageDelivery,
  projectMessageDelivery,
  type MessageDeliveryState,
  type MessageSubmitRequest,
  type MessageSubmitResult,
} from '@domain/message/message-lifecycle';
import { createMemoryMessageLifecyclePort } from '@features/message-lifecycle/memory-message-lifecycle-port';
import type { MessageHistoryLoadState } from './message-workspace-store';

const INITIAL_MUTED_THREAD_IDS = new Set(
  MESSAGE_THREADS
    .filter(({ category, classId }) => category === 'class' && classId === 'english-2')
    .map(({ id }) => id),
);

export type MessageWorkspaceScenario =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
    status: 'ready';
    threads: ReadonlyArray<MessageThread>;
    mutedThreadIds?: ReadonlySet<string>;
  };

type MessageWorkspaceProviderProps = {
  children: ReactNode;
  scenario?: MessageWorkspaceScenario;
  mediaAdapter?: MessageMediaAdapter;
  classRecords?: ReadonlyArray<ClassRecord>;
  importantReminders?: ReadonlyArray<MessageImportantReminder>;
  notificationAdapter?: DesktopNotificationAdapter;
  directoryAdapter?: MessageDirectoryAdapter;
  temporaryClassroomAdapter?: TemporaryClassroomAdapter;
  lifecyclePort?: MessageLifecyclePort;
  extension?: MessageWorkspaceExtension;
};

const DEFAULT_SCENARIO: MessageWorkspaceScenario = {
  status: 'ready',
  threads: MESSAGE_THREADS,
  mutedThreadIds: INITIAL_MUTED_THREAD_IDS,
};

export function MessageWorkspaceProvider({
  children,
  scenario = DEFAULT_SCENARIO,
  mediaAdapter,
  classRecords = CLASS_RECORDS,
  importantReminders = MESSAGE_IMPORTANT_REMINDERS,
  notificationAdapter,
  directoryAdapter,
  temporaryClassroomAdapter,
  lifecyclePort,
  extension,
}: MessageWorkspaceProviderProps) {
  const [defaultMediaAdapter] = useState(() => mediaAdapter ?? createBrowserMessageMediaAdapter());
  const activeMediaAdapter = mediaAdapter ?? defaultMediaAdapter;
  const [defaultNotificationAdapter] = useState(() => notificationAdapter ?? createBrowserDesktopNotificationAdapter());
  const activeNotificationAdapter = notificationAdapter ?? defaultNotificationAdapter;
  const [defaultDirectoryAdapter] = useState(() => directoryAdapter ?? createMemoryMessageDirectoryAdapter());
  const activeDirectoryAdapter = directoryAdapter ?? defaultDirectoryAdapter;
  const [defaultTemporaryClassroomAdapter] = useState(() => temporaryClassroomAdapter ?? createMemoryTemporaryClassroomAdapter(TEMPORARY_CLASSROOM_RECORDS));
  const activeTemporaryClassroomAdapter = temporaryClassroomAdapter ?? defaultTemporaryClassroomAdapter;
  const initialThreads = scenario.status === 'ready' ? scenario.threads : [];
  const [defaultLifecyclePort] = useState(() => lifecyclePort ?? createMemoryMessageLifecyclePort(initialThreads));
  const activeLifecyclePort = useMemo<MessageLifecyclePort>(() => {
    const fallback = lifecyclePort ?? defaultLifecyclePort;
    if (!extension) return fallback;
    const ids = new Set(extension.threads.map((thread) => thread.id));
    const port = (id: string) => ids.has(id) ? extension.lifecyclePort : fallback;
    return {
      getConnection: () => fallback.getConnection(), reconnect: () => fallback.reconnect(),
      getThreadAccess: (role, id) => port(id).getThreadAccess(role, id),
      getCurrentThreadVersion: (id) => port(id).getCurrentThreadVersion(id),
      getInitialHistoryCursor: (id) => port(id).getInitialHistoryCursor(id),
      submit: (request) => port(request.threadId).submit(request),
      syncThread: (id) => port(id).syncThread(id),
      loadHistory: (request) => port(request.threadId).loadHistory(request),
    };
  }, [defaultLifecyclePort, extension, lifecyclePort]);
  const [threads, setThreads] = useState<ReadonlyArray<MessageThread>>(
    () => scenario.status === 'ready' ? scenario.threads : [],
  );
  const [mutedThreadIds, setMutedThreadIds] = useState<ReadonlySet<string>>(
    () => scenario.status === 'ready' ? scenario.mutedThreadIds ?? new Set<string>() : new Set<string>(),
  );
  const [translationByMessageId, setTranslationByMessageId] = useState<Readonly<Record<string, import('./message-workspace-store').MessageTranslationState>>>({});
  const [dismissedReminderIds, setDismissedReminderIds] = useState<ReadonlySet<string>>(() => new Set());
  const [readMentionItemIds, setReadMentionItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const [readBoundaryByRoleThread, setReadBoundaryByRoleThread] = useState<Readonly<Record<string, string | null>>>({});
  const [desktopNotificationPermission, setDesktopNotificationPermission] = useState(() => activeNotificationAdapter.getPermission());
  const [connection, setConnection] = useState(() => activeLifecyclePort.getConnection());
  const [historyByThreadId, setHistoryByThreadId] = useState<Readonly<Record<string, MessageHistoryLoadState>>>(() => (
    Object.fromEntries(initialThreads.map((thread) => [thread.id, Object.freeze({
      status: 'idle' as const,
      cursor: activeLifecyclePort.getInitialHistoryCursor(thread.id),
    })]))
  ));
  const threadsRef = useRef(threads);
  const threadVersionByIdRef = useRef(new Map(initialThreads.map((thread) => [
    thread.id,
    activeLifecyclePort.getCurrentThreadVersion(thread.id),
  ])));
  const requestByMessageIdRef = useRef(new Map<string, MessageSubmitRequest>());

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const previousExtensionPort = useRef<MessageLifecyclePort | undefined>(undefined);
  const previousExtensionIds = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!extension && previousExtensionIds.current.size === 0) return;
    const preserveHistory = previousExtensionPort.current === extension?.lifecyclePort;
    previousExtensionPort.current = extension?.lifecyclePort;
    if (extension && !preserveHistory) for (const thread of extension.threads) threadVersionByIdRef.current.set(thread.id, extension.lifecyclePort.getCurrentThreadVersion(thread.id));
    const ids = new Set([...(previousExtensionIds.current), ...(extension?.threads.map((thread) => thread.id) ?? [])]);
    previousExtensionIds.current = new Set(extension?.threads.map((thread) => thread.id) ?? []);
    setThreads((current) => {
      return [...current.filter((thread) => !ids.has(thread.id)), ...(extension?.threads ?? []).map((thread) => {
        const previous = current.find(({ id }) => id === thread.id);
        const entries = previous && preserveHistory ? previous.entries : extension?.readEntries?.(thread.id) ?? thread.entries;
        return { ...thread, entries, updatedAt: entries.at(-1)?.sentAt ?? thread.updatedAt };
      })];
    });
  }, [extension]);

  useEffect(() => { extension?.persist(threads); }, [extension, threads]);

  useEffect(() => {
    if (scenario !== DEFAULT_SCENARIO) return;
    let active = true;
    void loadPrivateImDemoContext().then((snapshot) => {
      if (active && snapshot) setThreads((current) => mergePrivateImDemoThread(current, snapshot));
    });
    return () => { active = false; };
  }, [scenario]);

  useEffect(() => () => {
    if (!mediaAdapter) defaultMediaAdapter.dispose();
  }, [defaultMediaAdapter, mediaAdapter]);

  useEffect(() => () => {
    if (!notificationAdapter) defaultNotificationAdapter.dispose();
  }, [defaultNotificationAdapter, notificationAdapter]);

  const readThread = useCallback<MessageWorkspaceActions['readThread']>((role, threadId) => {
    setThreads((current) => current.map((thread) => {
      if (thread.id !== threadId) return thread;
      const boundary = captureNewMessageBoundary(thread, role);
      if (boundary) {
        const key = `${role}:${threadId}`;
        setReadBoundaryByRoleThread((boundaries) => boundaries[key] === boundary
          ? boundaries
          : Object.freeze({ ...boundaries, [key]: boundary }));
      }
      return markThreadRead(role, thread);
    }));
  }, []);

  const readCategory = useCallback<MessageWorkspaceActions['readCategory']>((role, category) => {
    setThreads((current) => markCategoryRead(role, current, category));
  }, []);

  const loadOlderMessages = useCallback<MessageWorkspaceActions['loadOlderMessages']>(async (role, threadId) => {
    const currentHistory = historyByThreadId[threadId] ?? {
      status: 'idle' as const,
      cursor: activeLifecyclePort.getInitialHistoryCursor(threadId),
    };
    if (!currentHistory.cursor || currentHistory.status === 'loading') return;
    setHistoryByThreadId((current) => ({
      ...current,
      [threadId]: Object.freeze({ status: 'loading', cursor: currentHistory.cursor }),
    }));
    try {
      const page = await activeLifecyclePort.loadHistory({ role, threadId, cursor: currentHistory.cursor, limit: 6 });
      setThreads((current) => current.map((thread) => (
        thread.id === threadId ? prependMessageHistoryPage(thread, page.entries) : thread
      )));
      setHistoryByThreadId((current) => ({
        ...current,
        [threadId]: Object.freeze({ status: 'ready', cursor: page.nextCursor }),
      }));
    } catch (error) {
      setHistoryByThreadId((current) => ({
        ...current,
        [threadId]: Object.freeze({
          status: 'error',
          cursor: currentHistory.cursor,
          message: error instanceof Error ? error.message : '历史消息暂时无法加载，请重试。',
        }),
      }));
    }
  }, [activeLifecyclePort, historyByThreadId]);

  const appendMessage = useCallback<MessageWorkspaceActions['appendMessage']>((options) => {
    if (options.contentReference && !isVerifiedGuidedExplanationContentReference(options.contentReference)) return;
    setThreads((current) => current.map((thread) => thread.id === options.threadId
      ? appendLocalMessage(
        options.role,
        options.authorName,
        thread,
        options.body,
        options.sentAt,
        options.kind,
        options.messageId,
        options.authorRole,
        options.classAgent,
        options.contentReference,
        options.replyTo,
        options.resources,
        options.attachments,
        options.mentions,
        options.objectCards,
      )
      : thread));
  }, []);

  const updateDelivery = useCallback((threadId: string, messageId: string, delivery: MessageDeliveryState) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? updateMessageDelivery(thread, messageId, delivery) : thread
    )));
  }, []);

  const runSubmission = useCallback(async (
    messageId: string,
    request: MessageSubmitRequest,
    sending: MessageDeliveryState,
  ): Promise<MessageSubmitResult> => {
    let result: MessageSubmitResult;
    try {
      result = await activeLifecyclePort.submit(request);
    } catch {
      result = Object.freeze({ status: 'failed', code: 'transient', message: '消息服务暂时不可用，请重试。' });
    }
    const delivery = projectMessageDelivery(result, sending, request.sentAt);
    updateDelivery(request.threadId, messageId, delivery);
    if ('receipt' in result) {
      threadVersionByIdRef.current.set(request.threadId, result.receipt.threadVersion);
    }
    return result;
  }, [activeLifecyclePort, updateDelivery]);

  const submitMessage = useCallback<MessageWorkspaceActions['submitMessage']>(async (options) => {
    const clientRequestId = options.clientRequestId
      ?? createClientId('message-request');
    const existing = threadsRef.current.find((thread) => thread.id === options.threadId)?.entries.find((entry) => entry.delivery?.clientRequestId === clientRequestId);
    const messageId = existing?.id ?? options.messageId ?? `pending-${clientRequestId}`;
    if (activeLifecyclePort.getThreadAccess(options.role, options.threadId).mode !== 'write') return { status: 'failed', code: 'permission-denied', message: '当前账号无法在此会话发送消息。' };
    const attachments = extension?.threads.some((thread) => thread.id === options.threadId)
      ? options.attachments?.map((attachment) => ({ ...attachment, contentRef: activeMediaAdapter.resolveContent(attachment.contentRef) ?? attachment.contentRef }))
      : options.attachments;
    const sending = createSendingMessageDelivery(clientRequestId, options.sentAt);
    const request: MessageSubmitRequest = Object.freeze({
      clientRequestId,
      threadId: options.threadId,
      actorRole: options.role,
      authorName: options.authorName,
      expectedThreadVersion: threadVersionByIdRef.current.get(options.threadId)
        ?? activeLifecyclePort.getCurrentThreadVersion(options.threadId),
      sentAt: options.sentAt,
      content: Object.freeze({
        body: options.body,
        kind: options.kind ?? 'text',
        replyTo: options.replyTo,
        resources: options.resources,
        attachments,
        mentions: options.mentions,
        objectCards: options.objectCards,
      }),
    });
    requestByMessageIdRef.current.set(messageId, request);
    setThreads((current) => current.map((thread) => thread.id === options.threadId
      ? thread.entries.some((entry) => entry.delivery?.clientRequestId === clientRequestId) ? thread : appendLocalMessage(
        options.role,
        options.authorName,
        thread,
        options.body,
        options.sentAt,
        options.kind,
        messageId,
        options.authorRole,
        options.classAgent,
        options.contentReference,
        options.replyTo,
        options.resources,
        attachments,
        options.mentions,
        options.objectCards,
        sending,
      )
      : thread));
    return runSubmission(messageId, request, sending);
  }, [activeLifecyclePort, activeMediaAdapter, extension, runSubmission]);

  const retryMessage = useCallback<MessageWorkspaceActions['retryMessage']>(async (role, threadId, messageId) => {
    const thread = threadsRef.current.find(({ id }) => id === threadId);
    const entry = thread?.entries.find(({ id }) => id === messageId);
    if (!entry?.delivery || entry.delivery.status !== 'failed') return null;
    const previousRequest = requestByMessageIdRef.current.get(messageId);
    const request: MessageSubmitRequest = Object.freeze({
      clientRequestId: entry.delivery.clientRequestId,
      threadId,
      actorRole: role,
      authorName: entry.authorName,
      expectedThreadVersion: threadVersionByIdRef.current.get(threadId)
        ?? activeLifecyclePort.getCurrentThreadVersion(threadId),
      sentAt: entry.sentAt,
      content: previousRequest?.content ?? Object.freeze({
        body: entry.body,
        kind: entry.kind === 'emoji' ? 'emoji' : 'text',
        replyTo: entry.replyTo,
        resources: entry.resources,
        attachments: entry.attachments,
        mentions: entry.mentions,
        objectCards: entry.objectCards,
      }),
    });
    requestByMessageIdRef.current.set(messageId, request);
    const sending = createSendingMessageDelivery(request.clientRequestId, request.sentAt, entry.delivery.attempt + 1);
    updateDelivery(threadId, messageId, sending);
    return runSubmission(messageId, request, sending);
  }, [activeLifecyclePort, runSubmission, updateDelivery]);

  const syncAndRetryMessage = useCallback<MessageWorkspaceActions['syncAndRetryMessage']>(async (role, threadId, messageId) => {
    const sync = await activeLifecyclePort.syncThread(threadId);
    threadVersionByIdRef.current.set(threadId, sync.threadVersion);
    return retryMessage(role, threadId, messageId);
  }, [activeLifecyclePort, retryMessage]);

  const reconnect = useCallback<MessageWorkspaceActions['reconnect']>(async () => {
    setConnection(Object.freeze({
      status: 'reconnecting',
      message: '正在重新连接消息服务…',
      truthLabel: 'SIMULATED',
    }));
    const next = await activeLifecyclePort.reconnect();
    setConnection(next);
    return next;
  }, [activeLifecyclePort]);

  const recallMessage = useCallback<MessageWorkspaceActions['recallMessage']>((role, threadId, messageId, recalledAt) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? recallClassMessage(role, thread, messageId, recalledAt) : thread
    )));
  }, []);

  const toggleMute = useCallback<MessageWorkspaceActions['toggleMute']>((threadId) => {
    setMutedThreadIds((current) => {
      const next = new Set(current);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const toggleReaction = useCallback<MessageWorkspaceActions['toggleReaction']>((threadId, messageId, actorId, emoji) => {
    setThreads((current) => current.map((thread) => (
      thread.id === threadId ? toggleMessageReaction(thread, messageId, actorId, emoji) : thread
    )));
  }, []);

  const searchMessages = useCallback<MessageWorkspaceActions['searchMessages']>(async (thread, filters) => {
    return mockMessageHistorySearch.search({ thread, filters });
  }, []);

  const searchResources = useCallback<MessageWorkspaceActions['searchResources']>(async (options) => (
    mockConversationResourceRepository.search(options)
  ), []);

  const translateMessage = useCallback<MessageWorkspaceActions['translateMessage']>(async (messageId, sourceBody, targetLocale) => {
    setTranslationByMessageId((current) => ({ ...current, [messageId]: { status: 'loading', targetLocale } }));
    try {
      const translation = await mockMessageTranslationService.translate({ messageId, sourceBody, targetLocale });
      setTranslationByMessageId((current) => ({ ...current, [messageId]: { status: 'ready', translation } }));
    } catch {
      setTranslationByMessageId((current) => ({ ...current, [messageId]: { status: 'error', targetLocale, message: '翻译暂时不可用，请重试。' } }));
    }
  }, []);

  const clearTranslation = useCallback<MessageWorkspaceActions['clearTranslation']>((messageId) => {
    setTranslationByMessageId((current) => {
      const next = { ...current };
      delete next[messageId];
      return next;
    });
  }, []);

  const dismissReminder = useCallback<MessageWorkspaceActions['dismissReminder']>((reminderId) => {
    setDismissedReminderIds((current) => new Set([...current, reminderId]));
  }, []);

  const readMentionItem = useCallback<MessageWorkspaceActions['readMentionItem']>((itemId) => {
    setReadMentionItemIds((current) => new Set([...current, itemId]));
  }, []);

  const requestDesktopNotificationPermission = useCallback<MessageWorkspaceActions['requestDesktopNotificationPermission']>(async () => {
    const permission = await activeNotificationAdapter.requestPermission();
    setDesktopNotificationPermission(permission);
    return permission;
  }, [activeNotificationAdapter]);

  const sendTestDesktopNotification = useCallback<MessageWorkspaceActions['sendTestDesktopNotification']>(async () => (
    activeNotificationAdapter.notify({
      id: 'classin-message-test',
      title: 'ClassIn 消息通知',
      body: '桌面通知已连接；班级消息仍会保留在站内。',
      threadId: 'notification-settings',
    })
  ), [activeNotificationAdapter]);

  const state = useMemo<MessageWorkspaceState>(() => {
    if (scenario.status === 'loading') return { status: 'loading' };
    if (scenario.status === 'error') return { status: 'error', message: scenario.message };
    return {
      status: 'ready',
      threads,
      mutedThreadIds,
      translationByMessageId,
      classRecords,
      importantReminders,
      dismissedReminderIds,
      readMentionItemIds,
      readBoundaryByRoleThread,
      desktopNotificationPermission,
      connection,
      historyByThreadId,
    };
  }, [classRecords, connection, desktopNotificationPermission, dismissedReminderIds, historyByThreadId, importantReminders, mutedThreadIds, readBoundaryByRoleThread, readMentionItemIds, scenario, threads, translationByMessageId]);
  const actions = useMemo<MessageWorkspaceActions>(() => ({
    readThread,
    readCategory,
    loadOlderMessages,
    appendMessage,
    submitMessage,
    retryMessage,
    syncAndRetryMessage,
    reconnect,
    recallMessage,
    toggleMute,
    toggleReaction,
    searchMessages,
    searchResources,
    translateMessage,
    clearTranslation,
    dismissReminder,
    readMentionItem,
    requestDesktopNotificationPermission,
    sendTestDesktopNotification,
  }), [appendMessage, clearTranslation, dismissReminder, loadOlderMessages, readCategory, readMentionItem, readThread, recallMessage, reconnect, requestDesktopNotificationPermission, retryMessage, searchMessages, searchResources, sendTestDesktopNotification, submitMessage, syncAndRetryMessage, toggleMute, toggleReaction, translateMessage]);

  return <MessageWorkspaceContext.Provider value={{ state, actions, mediaAdapter: activeMediaAdapter, directoryAdapter: activeDirectoryAdapter, temporaryClassroomAdapter: activeTemporaryClassroomAdapter, lifecyclePort: activeLifecyclePort }}>{children}</MessageWorkspaceContext.Provider>;
}
