import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, Sparkles, Square } from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BusinessContextSnapshot, ImSidecarAgentServices, LearningContextCatalog, LearningContextSelection, MessageDraftArtifact, PersonalizedLearningArtifact, SendMessageReceipt } from '@contracts/workbuddy/business-context';
import type { WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import type { TeachingDynamicAction, TeachingDynamicsSnapshot, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { AgentRichResponse } from '@design-system/AgentRichResponse';
import { approveMessageSend, createMessageDraft, proposeMessageSend, reviseMessageDraft, validateMessageContext } from '@domain/workbuddy/im-message-draft';
import { buildLearningTeacherRequest, createPersonalizedLearningArtifact, deliveryTarget, revisePersonalizedLearningArtifact, validateLearningSelectionAgainstCatalog } from '@domain/workbuddy/personalized-learning-service';
import { createRuntimeContextEnvelope, teacherVisibleRuntimeText } from '@domain/workbuddy/runtime-context-envelope';
import { splitAnalysisProcessTurns } from '@domain/workbuddy/analysis-process';
import { AnalysisProcess, appendRuntimeImageDrafts, encodeRuntimeImageDrafts, needsFreshTextSession, releaseRuntimeImageDrafts, RUNTIME_IMAGE_ACCEPT, type RuntimeImageDraft, useAgentRuntime } from '@features/agent-runtime';
import { getImAgentSessionTrail, removeImAgentSessionBinding, replaceMissingImAgentSessionBinding, rotateImAgentSessionBinding, saveImAgentSessionBinding } from './im-agent-session-binding';
import { TeachingDynamics } from './TeachingDynamics';
import styles from './WorkBuddyImSidecar.module.css';

type Props = Readonly<{
  services: ImSidecarAgentServices;
  target: WorkBuddyImTarget;
  onLocateMessage: (messageId: string) => void;
  onInsertDirectReply?: (body: string, threadRef?: string) => void;
  onClose?: () => void;
}>;

type DeliveryState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'sending' }>
  | Readonly<{ status: 'inserted' }>
  | Readonly<{ status: 'sent'; receipt: SendMessageReceipt }>
  | Readonly<{ status: 'failed'; message: string }>;

type TeachingDynamicsPresentation = Readonly<{
  expanded: boolean;
  selectedStage: TeachingStageId | null;
}>;

function presentationStorageKey(threadRef: string) {
  return `teachbuddy:teaching-dynamics:${threadRef}`;
}

function loadPresentation(threadRef: string): TeachingDynamicsPresentation {
  try {
    const saved = window.sessionStorage.getItem(presentationStorageKey(threadRef));
    if (saved) {
      const value = JSON.parse(saved) as Partial<TeachingDynamicsPresentation>;
      return {
        expanded: true,
        selectedStage: value.selectedStage ?? null,
      };
    }
  } catch { /* The local preference must not block the teaching workflow. */ }
  return { expanded: true, selectedStage: null };
}

function savePresentation(threadRef: string, presentation: TeachingDynamicsPresentation) {
  try { window.sessionStorage.setItem(presentationStorageKey(threadRef), JSON.stringify({ selectedStage: presentation.selectedStage })); } catch { /* Keep the surface usable without storage. */ }
}

function nestedScrollerConsumesWheel(target: EventTarget | null, boundary: HTMLElement, deltaY: number) {
  if (!(target instanceof HTMLElement)) return false;
  for (let element: HTMLElement | null = target; element && element !== boundary; element = element.parentElement) {
    const overflowY = window.getComputedStyle(element).overflowY;
    if (!/(auto|scroll)/.test(overflowY) || element.scrollHeight <= element.clientHeight) continue;
    if (deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
    if (deltaY < 0 && element.scrollTop > 1) return true;
  }
  return false;
}

export function ImSidecarAgentSurface({ services, target, onLocateMessage, onInsertDirectReply, onClose }: Props) {
  const bindingTarget = useMemo(() => ({
    actorRef: services.actor.id,
    tenantRef: services.tenantRef,
    threadRef: target.threadId,
    scope: services.scope,
  }), [services.actor.id, services.scope, services.tenantRef, target.threadId]);
  const initialSessionTrail = useMemo(() => getImAgentSessionTrail(bindingTarget), [bindingTarget]);
  const initialBinding = initialSessionTrail.at(-1) ?? null;
  const [sessionRef, setSessionRef] = useState(initialBinding);
  const [sessionTrail, setSessionTrail] = useState<readonly string[]>(initialSessionTrail);
  const [recoveringBinding, setRecoveringBinding] = useState(false);
  const runtime = useAgentRuntime(services.runtime, services.scope, sessionRef);
  const [composerDraft, setComposerDraft] = useState('');
  const [imageDrafts, setImageDrafts] = useState<readonly RuntimeImageDraft[]>([]);
  const [imageError, setImageError] = useState('');
  const [snapshot, setSnapshot] = useState<BusinessContextSnapshot | null>(null);
  const [messageDraft, setMessageDraft] = useState<MessageDraftArtifact | null>(null);
  const [learningArtifact, setLearningArtifact] = useState<PersonalizedLearningArtifact | null>(null);
  const [delivery, setDelivery] = useState<DeliveryState>({ status: 'idle' });
  const [contextError, setContextError] = useState('');
  const [catalog, setCatalog] = useState<LearningContextCatalog | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [selection, setSelection] = useState<LearningContextSelection | null>(null);
  const [learningResultReady, setLearningResultReady] = useState(false);
  const [runtimeArtifactBaselineIds, setRuntimeArtifactBaselineIds] = useState<readonly string[]>([]);
  const [dynamics, setDynamics] = useState<TeachingDynamicsSnapshot | null>(null);
  const [dynamicsError, setDynamicsError] = useState('');
  const [dynamicsLoading, setDynamicsLoading] = useState(true);
  const [dynamicsUpdated, setDynamicsUpdated] = useState(false);
  const [presentation, setPresentation] = useState<TeachingDynamicsPresentation>(() => loadPresentation(target.threadId));
  const timelineRef = useRef<HTMLDivElement>(null);
  const presentationExpandedRef = useRef(presentation.expanded);
  const downwardWheelDistanceRef = useRef(0);
  const followLatestMessageRef = useRef(true);
  const suppressFollowLatestUntilRef = useRef(0);
  const recoveringMissingBindingRef = useRef(false);
  const imageDraftsRef = useRef(imageDrafts);
  const pendingImageSubmission = useRef<{ images: readonly RuntimeImageDraft[]; beforeTeacherEventId?: string } | null>(null);
  const direct = target.kind === 'direct';
  const activeSession = runtime.session;
  const logicalSessions = useMemo(() => {
    const byId = new Map((runtime.history ?? []).map((entry) => [entry.id, entry]));
    if (activeSession) byId.set(activeSession.id, activeSession);
    const refs = sessionTrail.length ? sessionTrail : activeSession ? [activeSession.id] : [];
    return refs.map((ref) => byId.get(ref)).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [activeSession, runtime.history, sessionTrail]);
  const pending = runtime.operation?.status === 'pending';
  const sendingRequest = pending && runtime.operation?.command.kind === 'send';
  const stopping = pending && runtime.operation?.command.kind === 'cancel';
  const running = runtime.session?.status === 'running';
  const canStop = Boolean(sessionRef) && (running || runtime.locked || sendingRequest || stopping);
  const lastAgentEvent = runtime.session ? [...runtime.session.events].reverse().find((event) => event.actor === 'agent' && event.summary.trim()) : undefined;
  const canSend = runtime.health?.status === 'ready' && !running && !pending && !runtime.locked && !recoveringBinding && runtime.creation !== 'pending'
    && (!sessionRef || Boolean(runtime.session)) && !runtime.readError && delivery.status !== 'sending';

  const loadDynamics = useCallback(async () => {
    try {
      const next = await services.teachingDynamics.list({ actorRef: services.actor.id, tenantRef: services.tenantRef, target });
      if (next.threadRef !== target.threadId) throw new Error('教学动态与当前会话不匹配，请刷新后重试。');
      setDynamics((current) => {
        if (current && current.version !== next.version && !presentationExpandedRef.current) setDynamicsUpdated(true);
        return next;
      });
      setDynamicsError('');
    } catch (error) {
      setDynamicsError(error instanceof Error ? error.message : '教学动态暂时无法读取。');
    } finally {
      setDynamicsLoading(false);
    }
  }, [services.actor.id, services.teachingDynamics, services.tenantRef, target]);

  useEffect(() => {
    let active = true;
    void services.businessContext.listLearningContext({ actorRef: services.actor.id, tenantRef: services.tenantRef, target })
      .then((nextCatalog) => { if (active) setCatalog(nextCatalog); })
      .catch((error) => { if (active) setCatalogError(error instanceof Error ? error.message : '学习上下文暂时无法读取。'); });
    return () => { active = false; };
  }, [services.actor.id, services.businessContext, services.tenantRef, target]);

  useEffect(() => {
    queueMicrotask(() => void loadDynamics());
    const refresh = () => void loadDynamics();
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
    };
  }, [loadDynamics]);

  useEffect(() => {
    presentationExpandedRef.current = presentation.expanded;
    savePresentation(target.threadId, presentation);
  }, [presentation, target.threadId]);

  useEffect(() => {
    if (!sessionRef || runtime.readErrorStatus !== 404 || recoveringMissingBindingRef.current) return;
    let disposed = false;
    const missingSessionRef = sessionRef;
    const priorSessionTrail = sessionTrail.filter((ref) => ref !== missingSessionRef);
    recoveringMissingBindingRef.current = true;
    setRecoveringBinding(true);
    void services.runtime.create(services.scope).then((created) => {
      if (disposed) return;
      try { replaceMissingImAgentSessionBinding(bindingTarget, missingSessionRef, created.id); } catch {
        setContextError('TeachBuddy 已恢复，但本机未能保存恢复信息。当前页面仍可继续使用。');
      }
      setSessionTrail([...new Set([...priorSessionTrail, created.id])]);
      setSessionRef(created.id);
    }).catch((error: unknown) => {
      if (disposed) return;
      const fallbackSessionRef = priorSessionTrail.at(-1) ?? null;
      try {
        if (fallbackSessionRef) replaceMissingImAgentSessionBinding(bindingTarget, missingSessionRef, fallbackSessionRef);
        else removeImAgentSessionBinding(bindingTarget);
      } catch { /* The readable in-memory history remains available for this page. */ }
      setSessionTrail(priorSessionTrail);
      setSessionRef(fallbackSessionRef);
      setContextError(error instanceof Error ? error.message : 'TeachBuddy 暂时无法恢复，请稍后重试。');
    }).finally(() => {
      if (!disposed) setRecoveringBinding(false);
      recoveringMissingBindingRef.current = false;
    });
    return () => { disposed = true; recoveringMissingBindingRef.current = false; };
  }, [bindingTarget, runtime.readErrorStatus, services.runtime, services.scope, sessionRef, sessionTrail]);

  useEffect(() => { imageDraftsRef.current = imageDrafts; }, [imageDrafts]);
  useEffect(() => {
    const submitted = pendingImageSubmission.current;
    if (!submitted || !runtime.session || runtime.session.status === 'running') return;
    const latestTeacher = [...runtime.session.events].reverse().find(({ kind }) => kind === 'teacher_message');
    if (!latestTeacher || latestTeacher.id === submitted.beforeTeacherEventId) return;
    pendingImageSubmission.current = null;
    if (runtime.session.status !== 'idle') return;
    releaseRuntimeImageDrafts(submitted.images);
    const ids = new Set(submitted.images.map(({ id }) => id));
    setImageDrafts((current) => current.filter(({ id }) => !ids.has(id)));
    setImageError('');
  }, [runtime.session]);
  useEffect(() => () => releaseRuntimeImageDrafts(imageDraftsRef.current), []);

  useEffect(() => {
    if (!onClose) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, [contenteditable="true"]')) return;
      onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  useLayoutEffect(() => {
    const timeline = timelineRef.current;
    if (timeline && followLatestMessageRef.current) timeline.scrollTo?.({ top: timeline.scrollHeight, behavior: 'auto' });
  }, [delivery, messageDraft, runtime.session]);

  function bindCreatedSession(id: string, previousRef: string | null) {
    try {
      if (previousRef) rotateImAgentSessionBinding(bindingTarget, id);
      else saveImAgentSessionBinding(bindingTarget, id);
    } catch {
      setContextError('已开始处理，但本机未能保存恢复信息。当前页面仍可继续使用。');
    }
    setSessionTrail((current) => previousRef
      ? [...new Set([...current, previousRef, id])]
      : [id]);
    setSessionRef(id);
  }

  async function submit(teacherRequestOverride?: string) {
    const teacherRequest = teacherRequestOverride?.trim() || composerDraft.trim() || (imageDrafts.length ? '请结合我附上的图片完成这项教学工作。' : '');
    if (!teacherRequest || !canSend) return;
    let images;
    try { images = await encodeRuntimeImageDrafts(imageDrafts); } catch {
      setImageError('图片读取失败，请移除后重新添加。');
      return;
    }
    setContextError('');
    setLearningResultReady(false);
    setSelection(null);
    let captured: BusinessContextSnapshot;
    try {
      captured = await services.businessContext.capture({
        actorRef: services.actor.id,
        tenantRef: services.tenantRef,
        target,
        use: 'private-assistance',
      });
      if (captured.threadRef !== target.threadId || captured.actorRef !== services.actor.id || captured.tenantRef !== services.tenantRef) {
        throw new Error('业务上下文与当前会话不匹配，请刷新后重试。');
      }
      setSnapshot(captured);
    } catch (error) {
      setContextError(error instanceof Error ? error.message : '当前业务上下文暂时无法读取，请重试。');
      return;
    }
    const recoveringTextSession = needsFreshTextSession(activeSession, imageDrafts.length);
    const previousRef = recoveringTextSession ? sessionRef : null;
    let id = recoveringTextSession ? null : sessionRef;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      bindCreatedSession(id, previousRef);
    }
    setMessageDraft(null);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
    followLatestMessageRef.current = true;
    if (imageDrafts.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: recoveringTextSession ? undefined : activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined };
    const completed = await runtime.execute(id, {
      kind: 'send',
      text: createRuntimeContextEnvelope(captured, teacherRequest),
      commandId: crypto.randomUUID(),
      ...(images.length ? { images } : {}),
    });
    if (completed) {
      setComposerDraft('');
    }
  }

  async function generateLearningArtifact(nextSelection: LearningContextSelection, teacherRequest: string) {
    if (!catalog || !canSend) return;
    const error = validateLearningSelectionAgainstCatalog(nextSelection, catalog);
    if (error) { setContextError(error); return; }
    setSelection(nextSelection);
    setContextError('');
    setLearningResultReady(false);
    let images;
    try { images = await encodeRuntimeImageDrafts(imageDrafts); } catch {
      setImageError('图片读取失败，请移除后重新添加。');
      return;
    }
    let captured: BusinessContextSnapshot;
    try {
      captured = await services.businessContext.captureLearningContext({ actorRef: services.actor.id, tenantRef: services.tenantRef, target, use: 'private-assistance', selection: nextSelection });
      setSnapshot(captured);
    } catch (cause) {
      setContextError(cause instanceof Error ? cause.message : '所选学习上下文暂时无法读取，请重试。');
      return;
    }
    const recoveringTextSession = needsFreshTextSession(activeSession, imageDrafts.length);
    const previousRef = recoveringTextSession ? sessionRef : null;
    let id = recoveringTextSession ? null : sessionRef;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      bindCreatedSession(id, previousRef);
    }
    setMessageDraft(null);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
    followLatestMessageRef.current = true;
    setRuntimeArtifactBaselineIds(runtime.session?.artifacts.map(({ id: artifactId }) => artifactId) ?? []);
    if (imageDrafts.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: recoveringTextSession ? undefined : activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined };
    const completed = await runtime.execute(id, { kind: 'send', text: createRuntimeContextEnvelope(captured, buildLearningTeacherRequest(nextSelection, catalog, teacherRequest), teacherRequest), commandId: crypto.randomUUID(), ...(images.length ? { images } : {}) });
    setLearningResultReady(completed);
    if (completed) {
      setComposerDraft('');
    }
  }

  function triggerTeachingAction(action: TeachingDynamicAction) {
    if (action.learningSelection) void generateLearningArtifact(action.learningSelection, action.teacherRequest);
    else void submit(action.teacherRequest);
  }

  function addImages(files: readonly File[]) {
    const result = appendRuntimeImageDrafts(imageDrafts, files);
    setImageDrafts(result.attachments);
    setImageError(result.error);
  }

  function removeImage(imageId: string) {
    const image = imageDrafts.find(({ id }) => id === imageId);
    if (image) releaseRuntimeImageDrafts([image]);
    setImageDrafts((current) => current.filter(({ id }) => id !== imageId));
    setImageError('');
  }

  async function reviewAsMessage() {
    if (!runtime.session || !lastAgentEvent) return;
    let draftContext = snapshot;
    if (!draftContext) {
      try {
        draftContext = await services.businessContext.capture({
          actorRef: services.actor.id,
          tenantRef: services.tenantRef,
          target,
          use: 'message-draft',
        });
        if (draftContext.threadRef !== target.threadId || draftContext.actorRef !== services.actor.id || draftContext.tenantRef !== services.tenantRef) {
          throw new Error('业务上下文与当前会话不匹配，请刷新后重试。');
        }
        setSnapshot(draftContext);
      } catch (error) {
        setContextError(error instanceof Error ? error.message : '当前业务上下文暂时无法读取，请重试。');
        return;
      }
    }
    const generatedRuntimeArtifact = [...runtime.session.artifacts].reverse().find(({ id: artifactId, format, content }) => !runtimeArtifactBaselineIds.includes(artifactId) && (format === 'markdown' || format === 'text') && content.trim());
    const draftBody = generatedRuntimeArtifact?.content ?? lastAgentEvent.summary;
    const draft = createMessageDraft({ sessionRef: runtime.session.id, snapshot: draftContext, body: draftBody });
    setMessageDraft(draft);
    setLearningArtifact(selection && catalog ? createPersonalizedLearningArtifact({ sessionRef: runtime.session.id, snapshot: draftContext, selection, catalog, body: draftBody }) : null);
    setDelivery({ status: 'idle' });
  }

  async function deliverDraft() {
    if (!messageDraft || delivery.status === 'sending') return;
    const learningDelivery = selection && catalog ? deliveryTarget(selection, catalog, direct ? 'direct' : 'class') : null;
    if (direct || learningDelivery?.kind === 'direct-composer') {
      onInsertDirectReply?.(messageDraft.body, learningDelivery?.kind === 'direct-composer' ? learningDelivery.threadRef : undefined);
      setDelivery({ status: 'inserted' });
      return;
    }
    if (!snapshot) return;
    setDelivery({ status: 'sending' });
    let currentContext: BusinessContextSnapshot;
    try {
      currentContext = selection ? await services.businessContext.captureLearningContext({
        actorRef: services.actor.id,
        tenantRef: services.tenantRef,
        target,
        use: 'message-draft',
        selection,
      }) : await services.businessContext.capture({
        actorRef: services.actor.id,
        tenantRef: services.tenantRef,
        target,
        use: 'message-draft',
      });
    } catch (error) {
      setDelivery({ status: 'failed', message: error instanceof Error ? error.message : '最新业务上下文暂时无法读取，请重试。' });
      return;
    }
    const validationError = validateMessageContext(snapshot, currentContext);
    if (validationError) {
      setDelivery({ status: 'failed', message: validationError });
      return;
    }
    const action = proposeMessageSend(messageDraft, services.actor, currentContext.id);
    if (!action) return;
    const approval = approveMessageSend(action, new Date().toISOString());
    try {
      const receipt = await services.messageDraft.execute(action, approval);
      if (receipt.status === 'success') setDelivery({ status: 'sent', receipt });
      else setDelivery({ status: 'failed', message: receipt.result });
    } catch (error) {
      setDelivery({ status: 'failed', message: error instanceof Error ? error.message : '消息暂时无法发送，请重试。' });
    }
  }

  const plannedDelivery = selection && catalog ? deliveryTarget(selection, catalog, direct ? 'direct' : 'class') : null;
  const personalDelivery = direct || plannedDelivery?.kind === 'direct-composer';
  const connectionProblem = runtime.health && runtime.health.status !== 'ready'
    ? runtime.health.status === 'unconfigured' ? 'TeachBuddy 尚未配置完成' : 'TeachBuddy 暂时无法连接'
    : '';

  return (
    <aside className={styles.sidecar} aria-label={`${TEACHBUDDY_BRAND.shortName} 私密协作窗口`} data-dismissible={onClose ? 'true' : 'false'} data-guide-integrated="true" data-surface="floating-assistant" id="workbuddy-im-sidecar">
      <TeachingDynamics
        snapshot={dynamics}
        expanded={presentation.expanded}
        selectedStage={presentation.selectedStage}
        loading={dynamicsLoading}
        error={dynamicsError || catalogError}
        updatedWhileCompact={dynamicsUpdated}
        disabled={!canSend}
        isActionDisabled={(action) => Boolean(action.learningSelection && !catalog)}
        onExpandedChange={(expanded) => {
          downwardWheelDistanceRef.current = 0;
          if (!expanded) suppressFollowLatestUntilRef.current = performance.now() + 400;
          setPresentation((current) => ({ ...current, expanded }));
          if (expanded) setDynamicsUpdated(false);
        }}
        onSelectedStageChange={(selectedStage) => setPresentation((current) => ({ ...current, selectedStage }))}
        onAction={triggerTeachingAction}
        onRetry={() => { void loadDynamics(); runtime.reconnect(); }}
        onClose={onClose}
      />

      <div
        aria-label="TeachBuddy 对话"
        className={styles.agentBody}
        onWheel={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest('textarea')) return;
          if (nestedScrollerConsumesWheel(event.target, event.currentTarget, event.deltaY)) return;
          if (!presentationExpandedRef.current) return;
          if (event.deltaY <= 0) {
            downwardWheelDistanceRef.current = 0;
            return;
          }
          const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? event.currentTarget.clientHeight : 1;
          downwardWheelDistanceRef.current += event.deltaY * multiplier;
          if (downwardWheelDistanceRef.current < 48) return;
          downwardWheelDistanceRef.current = 0;
          suppressFollowLatestUntilRef.current = performance.now() + 400;
          setPresentation((current) => current.expanded ? { ...current, expanded: false } : current);
        }}
        onScroll={(event) => {
          if (performance.now() < suppressFollowLatestUntilRef.current) return;
          const timeline = event.currentTarget;
          followLatestMessageRef.current = timeline.scrollHeight - timeline.clientHeight - timeline.scrollTop < 48;
        }}
        ref={timelineRef}
        role="region"
      >
        {connectionProblem ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{connectionProblem}{runtime.health?.message ? `：${runtime.health.message}` : ''}</p><button type="button" onClick={runtime.reconnect}><RefreshCw aria-hidden="true" size={14} />重试</button></div> : null}

        {recoveringBinding || (sessionRef && !runtime.session && !runtime.readError) ? <p className={styles.runtimeProgress} role="status">正在恢复当前对话…</p> : null}
        {logicalSessions.some(({ events }) => events.length) ? <ol className={styles.agentEvents} aria-label="TeachBuddy 会话消息">{logicalSessions.map((logicalSession) => {
          const turns = splitAnalysisProcessTurns(logicalSession.events);
          return turns.map((turn, turnIndex) => {
            const turnTeacher = turn.events.find(({ kind }) => kind === 'teacher_message');
            const turnStatus = turnIndex === turns.length - 1 ? logicalSession.status
              : turn.events.some(({ state }) => state === 'failed') ? 'failed'
                : turn.events.some(({ state }) => state === 'stopped' || state === 'cancelled') ? 'stopped' : 'idle';
            const turnSession = { id: logicalSession.id, status: turnStatus, events: turn.events, updatedAt: logicalSession.updatedAt } as const;
            const messages = turn.events.filter((event) => event.actor === 'teacher' || (event.actor === 'agent' && event.kind === 'process') || event.kind === 'error');
            return <Fragment key={`${logicalSession.id}:${turn.id}`}>{messages.map((event) => {
              const visible = event.actor === 'teacher' ? teacherVisibleRuntimeText(event.summary) : event.summary;
              return <Fragment key={`${logicalSession.id}:${event.id}`}><li data-actor={event.actor}><article><header><strong>{event.actor === 'teacher' ? '您' : event.actor === 'agent' ? 'TeachBuddy' : event.title}</strong></header>{event.actor === 'agent' ? <AgentRichResponse>{visible}</AgentRichResponse> : <p>{visible}</p>}</article></li>{event.id === turnTeacher?.id ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} /></li> : null}</Fragment>;
            })}{!turnTeacher ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} /></li> : null}</Fragment>;
          });
        })}</ol> : null}
        {activeSession?.status === 'running' && activeSession.events.length === 0 ? <AnalysisProcess session={activeSession} mode="compact" context={null} /> : null}

        {lastAgentEvent && runtime.session?.status === 'idle' && !messageDraft && (!selection || learningResultReady) ? (
          <div className={styles.agentResultActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => void reviewAsMessage()}>{selection ? '审阅沟通内容' : direct ? '作为回复草稿审阅' : '作为群消息草稿审阅'}</button>
          </div>
        ) : null}

        {messageDraft ? <section className={styles.directDraft} data-review-artifact="true" aria-label={personalDelivery ? '个性化沟通草稿' : '班级群消息草稿'}>
          <header><span>{learningArtifact?.title ?? (personalDelivery ? '个性化沟通草稿' : '群消息草稿')}</span><strong>{delivery.status === 'sent' ? '已发送' : delivery.status === 'inserted' ? '已插入' : `v${learningArtifact?.version ?? messageDraft.version} · 待你审阅`}</strong></header>
          {learningArtifact ? <dl className={styles.learningArtifactMeta}><div><dt>接收对象</dt><dd>{learningArtifact.recipientLabel}</dd></div><div><dt>交付方式</dt><dd>{learningArtifact.delivery === 'class-review' ? '当前班级群 · 确认后发送' : '学生私聊 · 插入输入框'}</dd></div></dl> : null}
          <label><span>确认或修改最终话术</span><textarea aria-label="消息草稿正文" value={messageDraft.body} disabled={delivery.status === 'sending' || delivery.status === 'sent'} onChange={(event) => { const body = event.target.value; setMessageDraft(reviseMessageDraft(messageDraft, body)); setLearningArtifact((current) => current ? revisePersonalizedLearningArtifact(current, body) : null); setDelivery({ status: 'idle' }); }} /></label>
          {delivery.status === 'failed' ? <p className={styles.inlineError} role="alert">{delivery.message}</p> : null}
          <footer><span>{personalDelivery ? '插入后仍需由你手动发送' : `将以${services.actor.name}身份发送到${target.classLabel}`}</span><button className={styles.primaryButton} type="button" disabled={!messageDraft.body.trim() || delivery.status === 'sending' || delivery.status === 'sent'} onClick={() => void deliverDraft()}>{delivery.status === 'sending' ? '正在复核并发送…' : direct ? '插入回复框' : personalDelivery ? `转到${catalog?.students.find(({ ref }) => ref === selection?.studentRef)?.label ?? '学生'}私聊并插入` : `确认并发送至${target.classLabel}`}</button></footer>
          {delivery.status === 'sent' && delivery.receipt.messageId ? <button className={styles.secondaryButton} type="button" onClick={() => onLocateMessage(delivery.receipt.messageId!)}><CheckCircle2 aria-hidden="true" size={14} />在群聊中查看</button> : null}
        </section> : null}

        {runtime.creation === 'pending' ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />正在准备 TeachBuddy…</p> : null}
        {sendingRequest ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />TeachBuddy 正在理解你的要求…</p> : null}
        {stopping ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />正在停止当前生成…</p> : null}
        {runtime.session?.status === 'stopped' ? <p className={styles.runtimeNotice} role="status">{runtime.session.error || '生成已停止，你可以继续发送要求。'}</p> : null}
        {runtime.session?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.session.error || '任务未完成，请重试或调整要求。'}</p></div> : null}
        {runtime.readError && runtime.readErrorStatus !== 404 ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.readError}</p><button type="button" onClick={runtime.reconnect}>重试恢复</button></div> : null}
        {runtime.operation?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.operation.error}</p><button type="button" onClick={() => { if (!sessionRef || runtime.operation?.status !== 'failed') return; const command = runtime.operation.command; if (command.kind === 'send' && command.images?.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined }; void runtime.execute(sessionRef, command).then((completed) => { if (selection) setLearningResultReady(completed); if (completed && command.kind === 'send') setComposerDraft(''); }); }}>{runtime.operation.command.kind === 'cancel' ? '重试停止' : '重试原请求'}</button></div> : null}
        {runtime.createError ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.createError}</p></div> : null}
        {contextError ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{contextError}</p></div> : null}
      </div>

      <WorkspaceComposer
        ariaLabel={`向 ${TEACHBUDDY_BRAND.shortName} 输入要求`}
        className={styles.runComposerDock}
        countThreshold={3_200}
        disabled={delivery.status === 'sending' || pending || running}
        hint={direct ? '可直接说你想如何回复或继续处理' : '可直接说你想提醒谁、说明什么'}
        imageAccept={RUNTIME_IMAGE_ACCEPT}
        imageAttachments={imageDrafts}
        imageError={imageError}
        maxLength={4_000}
        onSubmit={() => void submit()}
        onAddImages={addImages}
        onRemoveImage={removeImage}
        onValueChange={setComposerDraft}
        placeholder={direct ? '例如：结合当前对话，帮我拟一条专业回复…' : '告诉 TeachBuddy 你想完成什么…'}
        submitLabel="发送给 TeachBuddy"
        canSubmit={canSend}
        tools={<button type="button" aria-label="打开教学协作" title="教学协作" onClick={() => { setPresentation((current) => ({ ...current, expanded: true })); setDynamicsUpdated(false); }}><Sparkles aria-hidden="true" size={17} /><span>教学协作</span></button>}
        secondaryActions={canStop && sessionRef ? <button type="button" aria-label="停止生成" title="停止生成" disabled={stopping} onClick={() => void runtime.execute(sessionRef, { kind: 'cancel' })}><Square aria-hidden="true" size={14} />停止</button> : undefined}
        value={composerDraft}
      />
    </aside>
  );
}
