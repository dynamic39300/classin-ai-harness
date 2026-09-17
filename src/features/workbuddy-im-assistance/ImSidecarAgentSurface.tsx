import type { GeneralQuestion } from '@contracts/workbuddy/general-question-guidance';
import type { ImMessageReference } from '@contracts/workbuddy/im-chat-context';
import { activateGeneralQuestion, buildGeneralQuestionRequest, ENTRY_QUESTION_GUIDANCE, projectGeneralQuestions } from '@domain/workbuddy/general-question-guidance';
import { referencedChatChanged } from '@domain/workbuddy/im-chat-context';
import { GeneralQuestionHelp, GeneralQuestionWelcome } from './GeneralQuestionGuidance';
import { readImQuestionDraft, saveImQuestionDraft } from './im-question-draft';
import { isSolutionImage } from '@features/agent-runtime/solution-image';
import { AlertTriangle, LoaderCircle, RefreshCw, Square, X } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeArtifact } from '@contracts/workbuddy/agent-runtime';
import type { BusinessContextSnapshot, ImSidecarAgentServices, LearningContextCatalog, LearningContextSelection, MessageDraftArtifact, PersonalizedLearningArtifact, SendMessageReceipt } from '@contracts/workbuddy/business-context';
import type { ConversationRunEvent } from '@contracts/workbuddy/conversation-run';
import type { WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import type { TeachingDynamicAction, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { TEACHBUDDY_IM_ASSISTANT_LABEL } from '@contracts/workbuddy/product-brand';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { AgentRichResponse } from '@design-system/AgentRichResponse';
import { approveMessageSend, buildMessageDraftRuntimeRequest, createMessageDraft, extractMessageDraftBody, hasMarkedMessageDraftBody, proposeMessageSend, reviseMessageDraft, validateMessageContext } from '@domain/workbuddy/im-message-draft';
import { formatImAssistantIdentity } from '@domain/workbuddy/im-assistant-identity';
import { projectImMessageDeliveryIntent, type ImMessageDeliveryIntent, type ImMessageRequestSource } from '@domain/workbuddy/im-message-delivery-intent';
import { projectTeachingStage } from '@domain/workbuddy/teaching-dynamics';
import { buildLearningTeacherRequest, createPersonalizedLearningArtifact, deliveryTarget, revisePersonalizedLearningArtifact, validateLearningSelectionAgainstCatalog } from '@domain/workbuddy/personalized-learning-service';
import { createRuntimeContextEnvelope, teacherVisibleRuntimeText } from '@domain/workbuddy/runtime-context-envelope';
import { splitAnalysisProcessTurns, type AnalysisProcessTurn } from '@domain/workbuddy/analysis-process';
import { createClientId } from '@shared/client-id';
import { AnalysisProcess, appendRuntimeImageDrafts, encodeRuntimeImageDrafts, needsFreshTextSession, releaseRuntimeImageDrafts, RUNTIME_IMAGE_ACCEPT, type RuntimeImageDraft, useAgentRuntime } from '@features/agent-runtime';
import { getImAgentSessionTrail, removeImAgentSessionBinding, replaceMissingImAgentSessionBinding, rotateImAgentSessionBinding, saveImAgentSessionBinding } from './im-agent-session-binding';
import { TeachingDynamics } from './TeachingDynamics';
import { useTeachingDynamics } from './useTeachingDynamics';
import { useImHistoryPresentation } from './useImHistoryPresentation';
import { SolutionImagePreview } from '@features/agent-runtime/SolutionImagePreview';
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

type DeliveryIntentProjection = Readonly<{
  sessionRef: string;
  baselineAgentEventId: string | null;
  intent: ImMessageDeliveryIntent;
}>;

type SidecarTimelineItem =
  | Readonly<{ kind: 'event'; event: ConversationRunEvent }>
  | Readonly<{ kind: 'solution-image'; artifact: RuntimeArtifact }>;

function timelineTimestamp(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assignSolutionImagesToTurns(
  turns: readonly AnalysisProcessTurn[],
  artifacts: readonly RuntimeArtifact[],
): readonly (readonly RuntimeArtifact[])[] {
  const buckets = turns.map(() => [] as RuntimeArtifact[]);
  if (!turns.length) return buckets;

  for (const artifact of artifacts) {
    const artifactTime = timelineTimestamp(artifact.createdAt);
    let targetTurn = artifactTime === null ? turns.length - 1 : 0;
    if (artifactTime !== null) {
      turns.forEach((turn, index) => {
        const turnStart = timelineTimestamp(turn.events[0]?.occurredAt ?? '');
        if (turnStart !== null && turnStart <= artifactTime) targetTurn = index;
      });
    }
    buckets[targetTurn]?.push(artifact);
  }
  return buckets;
}

function buildTurnTimeline(
  events: readonly ConversationRunEvent[],
  artifacts: readonly RuntimeArtifact[],
): readonly SidecarTimelineItem[] {
  return [
    ...events.map((event) => ({ kind: 'event' as const, event })),
    ...artifacts.map((artifact) => ({ kind: 'solution-image' as const, artifact })),
  ].sort((left, right) => {
    const leftTime = timelineTimestamp(left.kind === 'event' ? left.event.occurredAt : left.artifact.createdAt);
    const rightTime = timelineTimestamp(right.kind === 'event' ? right.event.occurredAt : right.artifact.createdAt);
    if (leftTime !== null && rightTime !== null && leftTime !== rightTime) return leftTime - rightTime;
    if (leftTime === null && rightTime !== null) return 1;
    if (leftTime !== null && rightTime === null) return -1;
    if (left.kind === 'event' && right.kind === 'event') return left.event.sequence - right.event.sequence;
    if (left.kind !== right.kind) return left.kind === 'event' ? -1 : 1;
    return left.kind === 'solution-image' && right.kind === 'solution-image'
      ? left.artifact.id.localeCompare(right.artifact.id)
      : 0;
  });
}

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
  const draftKey = JSON.stringify(bindingTarget);
  const [composerDraft, setComposerDraft] = useState(() => readImQuestionDraft(services.businessContext, draftKey).text);
  const [reference, setReference] = useState<ImMessageReference | null>(() => target.aiReference ?? readImQuestionDraft(services.businessContext, draftKey).reference);
  const [referenceRequest, setReferenceRequest] = useState(target.aiReference?.requestId);
  if (target.aiReference?.requestId !== referenceRequest) {
    setReferenceRequest(target.aiReference?.requestId);
    if (target.aiReference) setReference(target.aiReference);
  }
  const [questionNotice, setQuestionNotice] = useState('');
  const [preparingRequest, setPreparingRequest] = useState(false);
  const submitLock = useRef(false);
  const lastQuestionClick = useRef({ id: '', at: 0 });
  const mounted = useRef(true);
  const [chatHeight, setChatHeight] = useState(320);

  const [imageDrafts, setImageDrafts] = useState<readonly RuntimeImageDraft[]>(() => readImQuestionDraft(services.businessContext, draftKey).images);
  const [imageError, setImageError] = useState('');
  const [snapshot, setSnapshot] = useState<BusinessContextSnapshot | null>(null);
  const [messageDraft, setMessageDraft] = useState<MessageDraftArtifact | null>(null);
  const [draftEditing, setDraftEditing] = useState(false);
  const [learningArtifact, setLearningArtifact] = useState<PersonalizedLearningArtifact | null>(null);
  const [delivery, setDelivery] = useState<DeliveryState>({ status: 'idle' });
  const deliveryLock = useRef(false);
  const [acceptedAgentEventId, setAcceptedAgentEventId] = useState<string | null>(null);
  const [deliveryIntentProjection, setDeliveryIntentProjection] = useState<DeliveryIntentProjection | null>(null);
  const [contextError, setContextError] = useState('');
  const [interruptedSessionRef, setInterruptedSessionRef] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<LearningContextCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [selection, setSelection] = useState<LearningContextSelection | null>(null);
  const [learningResultReady, setLearningResultReady] = useState(false);
  const [runtimeArtifactBaselineIds, setRuntimeArtifactBaselineIds] = useState<readonly string[]>([]);
  const [dynamicsUpdated, setDynamicsUpdated] = useState(false);
  const [presentation, setPresentation] = useState<TeachingDynamicsPresentation>(() => loadPresentation(target.threadId));
  const timelineRef = useRef<HTMLDivElement>(null);
  const presentationExpandedRef = useRef(presentation.expanded);
  const followLatestMessageRef = useRef(true);
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
  const historyPresentation = useImHistoryPresentation(logicalSessions, initialSessionTrail);
  const { visibleSessions, hasHiddenHistory } = historyPresentation;
  const historyScrollAnchor = useRef<{ height: number; top: number; focusTimeline: boolean } | null>(null);
  const activeTurnVisible = Boolean(activeSession && (!initialSessionTrail.includes(activeSession.id) || visibleSessions.find(({ id }) => id === activeSession.id)?.events.length));
  const pending = runtime.operation?.status === 'pending';
  const sendingRequest = pending && runtime.operation?.command.kind === 'send';
  const stopping = pending && runtime.operation?.command.kind === 'cancel';
  const running = runtime.session?.status === 'running';
  const canStop = Boolean(sessionRef) && (running || runtime.locked || sendingRequest || stopping);
  const lastAgentEvent = runtime.session ? [...runtime.session.events].reverse().find((event) => event.actor === 'agent' && event.summary.trim()) : undefined;
  const lastTeacherEvent = runtime.session ? [...runtime.session.events].reverse().find((event) => event.actor === 'teacher' && event.kind === 'teacher_message') : undefined;
  const canSend = runtime.health?.status === 'ready' && !draftEditing && !preparingRequest && !running && !pending && !runtime.locked && !recoveringBinding && runtime.creation !== 'pending'
    && (!sessionRef || Boolean(runtime.session)) && historyPresentation.isReady(sessionRef) && !runtime.readError && delivery.status !== 'sending';

  const { state: dynamicsState, retry: retryDynamics } = useTeachingDynamics(
    services.teachingDynamics,
    { actorRef: services.actor.id, tenantRef: services.tenantRef, target },
    () => { if (!presentationExpandedRef.current) setDynamicsUpdated(true); },
    () => setPresentation(current => ({ ...current, expanded: false })),
  );
  const dynamics = dynamicsState.snapshot;

  useEffect(() => {
    let active = true;
    void services.businessContext.listLearningContext({ actorRef: services.actor.id, tenantRef: services.tenantRef, target })
      .then((nextCatalog) => { if (active) setCatalog(nextCatalog); })
      .catch((error) => { if (active) setCatalogError(error instanceof Error ? error.message : '学习上下文暂时无法读取。'); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [services.actor.id, services.businessContext, services.tenantRef, target, catalogRetry]);

  const retryCatalog = () => { setCatalogLoading(true); setCatalogError(''); setCatalogRetry(value => value + 1); };

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
        setContextError(`${TEACHBUDDY_IM_ASSISTANT_LABEL}已恢复，但本机未能保存恢复信息。当前页面仍可继续使用。`);
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
      setContextError(error instanceof Error ? error.message : `${TEACHBUDDY_IM_ASSISTANT_LABEL}暂时无法恢复，请稍后重试。`);
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
  useEffect(() => {
    saveImQuestionDraft(services.businessContext, draftKey, { text: composerDraft, reference, images: imageDrafts });
  }, [composerDraft, reference, imageDrafts, services.businessContext, draftKey]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!target.aiReference) return;
    window.requestAnimationFrame(() => timelineRef.current?.closest('aside')?.querySelector<HTMLTextAreaElement>('textarea[aria-label^="向 "]')?.focus());
  }, [target.aiReference]);
  useEffect(() => {
    const node = timelineRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setChatHeight(node.clientHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
    const anchor = historyScrollAnchor.current;
    if (timeline && anchor && historyPresentation.revealed) {
      historyScrollAnchor.current = null;
      timeline.scrollTo?.({ top: Math.max(0, timeline.scrollHeight - anchor.height + anchor.top - 120), behavior: 'auto' });
      if (anchor.focusTimeline) timeline.focus({ preventScroll: true });
      return;
    }
    if (timeline && followLatestMessageRef.current) timeline.scrollTo?.({ top: timeline.scrollHeight, behavior: 'auto' });
  }, [delivery, messageDraft, runtime.session, historyPresentation.revealed]);

  function revealHistory(focusTimeline = false) {
    const timeline = timelineRef.current;
    if (!hasHiddenHistory || !timeline) return;
    historyScrollAnchor.current = { height: timeline.scrollHeight, top: timeline.scrollTop, focusTimeline };
    followLatestMessageRef.current = false;
    historyPresentation.reveal();
  }

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

  async function submit(teacherRequestOverride?: string, requestSource: ImMessageRequestSource = 'freeform', contextRefs: readonly string[] = []) {
    const teacherRequest = teacherRequestOverride?.trim() || composerDraft.trim() || (imageDrafts.length ? '请结合我附上的图片完成这项教学工作。' : '');
    if (!teacherRequest || !canSend || submitLock.current) return;
    submitLock.current = true;
    setPreparingRequest(true);
    try {
    const deliveryIntent = projectImMessageDeliveryIntent(teacherRequest, requestSource, lastAgentEvent?.summary);
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
        focusRefs: contextRefs,
        referencedMessageId: reference?.id ?? (/再|刚才|短|回复|讲解|这道|这个|他|这位/u.test(teacherRequest) ? snapshot?.chatContext?.referenceId : undefined),
        query: teacherRequest,
      });
      if (captured.threadRef !== target.threadId || captured.actorRef !== services.actor.id || captured.tenantRef !== services.tenantRef) {
        throw new Error('业务上下文与当前会话不匹配，请刷新后重试。');
      }
      if (!mounted.current) return;
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
    setDraftEditing(false);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
    setDeliveryIntentProjection({
      sessionRef: id,
      baselineAgentEventId: lastAgentEvent?.id ?? null,
      intent: deliveryIntent,
    });
    followLatestMessageRef.current = true;
    if (imageDrafts.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: recoveringTextSession ? undefined : activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined };
    if (!teacherRequestOverride?.trim()) setComposerDraft('');
    setReference(null);
    setQuestionNotice('');
    const completed = await runtime.execute(id, {
      kind: 'send',
      text: deliveryIntent === 'draft'
        ? createRuntimeContextEnvelope(captured, buildMessageDraftRuntimeRequest(buildGeneralQuestionRequest(teacherRequest)), teacherRequest)
        : createRuntimeContextEnvelope(captured, buildGeneralQuestionRequest(teacherRequest), teacherRequest),
      commandId: createClientId(),
      ...(images.length ? { images } : {}),
    });
    if (!completed) return;
    } finally { submitLock.current = false; if (mounted.current) setPreparingRequest(false); }
  }

  async function generateLearningArtifact(nextSelection: LearningContextSelection, teacherRequest: string, contextRefs: readonly string[] = []) {
    if (!catalog || !canSend || submitLock.current) return;
    const error = validateLearningSelectionAgainstCatalog(nextSelection, catalog);
    if (error) { setContextError(error); return; }
    submitLock.current = true; setPreparingRequest(true);
    try {
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
      captured = await services.businessContext.captureLearningContext({ actorRef: services.actor.id, tenantRef: services.tenantRef, target, use: 'private-assistance', focusRefs: contextRefs, query: teacherRequest, selection: nextSelection });
      if (!mounted.current) return;
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
    setDraftEditing(false);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
    setDeliveryIntentProjection({
      sessionRef: id,
      baselineAgentEventId: lastAgentEvent?.id ?? null,
      intent: projectImMessageDeliveryIntent(teacherRequest, 'teaching-dynamic'),
    });
    followLatestMessageRef.current = true;
    setRuntimeArtifactBaselineIds(runtime.session?.artifacts.map(({ id: artifactId }) => artifactId) ?? []);
    if (imageDrafts.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: recoveringTextSession ? undefined : activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined };
    const completed = await runtime.execute(id, { kind: 'send', text: createRuntimeContextEnvelope(captured, buildMessageDraftRuntimeRequest(buildLearningTeacherRequest(nextSelection, catalog, teacherRequest)), teacherRequest), commandId: createClientId(), ...(images.length ? { images } : {}) });
    if (mounted.current) setLearningResultReady(completed);
    } finally { submitLock.current = false; if (mounted.current) setPreparingRequest(false); }
  }

  function triggerTeachingAction(action: TeachingDynamicAction) {
    if (action.learningSelection) void generateLearningArtifact(action.learningSelection, action.teacherRequest, action.contextRefs);
    else void submit(action.teacherRequest, 'teaching-dynamic', action.contextRefs);
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

  function getCurrentDraftBody() {
    if (!runtime.session || !lastAgentEvent) return '';
    const currentTurnStartedAt = lastTeacherEvent ? Date.parse(lastTeacherEvent.occurredAt) : Number.NaN;
    const generatedRuntimeArtifact = [...runtime.session.artifacts].reverse().find(({ id: artifactId, format, content, createdAt }) => {
      const artifactCreatedAt = Date.parse(createdAt);
      return !runtimeArtifactBaselineIds.includes(artifactId)
        && (format === 'markdown' || format === 'text')
        && content.trim()
        && Number.isFinite(currentTurnStartedAt)
        && Number.isFinite(artifactCreatedAt)
        && artifactCreatedAt >= currentTurnStartedAt;
    });
    const draftSource = hasMarkedMessageDraftBody(lastAgentEvent.summary)
      ? lastAgentEvent.summary
      : generatedRuntimeArtifact?.content ?? lastAgentEvent.summary;
    return formatImAssistantIdentity(extractMessageDraftBody(draftSource));
  }

  const currentDraftBody = getCurrentDraftBody();
  const mentionLabels = useMemo(() => ['所有人', ...(catalog?.mentionLabels ?? []), ...(catalog?.students.filter(({ isAggregate }) => !isAggregate).map(({ label }) => label) ?? [])], [catalog]);

  async function reviewAsMessage(sendImmediately = false) {
    if (!runtime.session || !lastAgentEvent || !currentDraftBody || deliveryLock.current) return;
    if (messageDraft && !sendImmediately) { setDraftEditing(true); return; }
    deliveryLock.current = true;
    if (sendImmediately) setDelivery({ status: 'sending' });
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
        setDelivery({ status: 'idle' });
        deliveryLock.current = false;
        return;
      }
    }
    const draftBody = currentDraftBody;
    const draft = createMessageDraft({ sessionRef: runtime.session.id, snapshot: draftContext, body: draftBody });
    setMessageDraft(draft);
    setDraftEditing(!sendImmediately);
    setLearningArtifact(selection && catalog ? createPersonalizedLearningArtifact({ sessionRef: runtime.session.id, snapshot: draftContext, selection, catalog, body: draftBody }) : null);
    if (sendImmediately) {
      try { await sendPreparedDraft(draft, draftContext); } finally { deliveryLock.current = false; }
    } else {
      setDelivery({ status: 'idle' });
      deliveryLock.current = false;
    }
  }

  async function deliverDraft() {
    if (!messageDraft || !snapshot || deliveryLock.current) return;
    deliveryLock.current = true;
    try { await sendPreparedDraft(messageDraft, snapshot); } finally { deliveryLock.current = false; }
  }

  async function sendPreparedDraft(draft: MessageDraftArtifact, draftContext: BusinessContextSnapshot) {
    if (parentDraft) return;
    const learningDelivery = selection && catalog ? deliveryTarget(selection, catalog, direct ? 'direct' : 'class') : null;
    if (direct || learningDelivery?.kind === 'direct-composer') {
      onInsertDirectReply?.(draft.body, learningDelivery?.kind === 'direct-composer' ? learningDelivery.threadRef : undefined);
      setDelivery({ status: 'inserted' });
      setAcceptedAgentEventId(lastAgentEvent?.id ?? null);
      setDraftEditing(false);
      setLearningArtifact(null);
      return;
    }
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
        focusRefs: draftContext.focusRefs,
        referencedMessageId: draftContext.chatContext?.referenceId,
        query: lastTeacherEvent ? teacherVisibleRuntimeText(lastTeacherEvent.summary) : undefined,
      });
    } catch (error) {
      setDelivery({ status: 'failed', message: error instanceof Error ? error.message : '最新业务上下文暂时无法读取，请重试。' });
      return;
    }
    if (referencedChatChanged(draftContext.chatContext, currentContext.chatContext)) {
      setDelivery({ status: 'failed', message: '原问题有更新，请核对回复。草稿已保留，可重新提问整理后再发送。' });
      return;
    }
    const validationError = validateMessageContext(draftContext, currentContext);
    if (validationError) {
      setDelivery({ status: 'failed', message: validationError });
      return;
    }
    const action = proposeMessageSend(draft, services.actor, currentContext.id);
    if (!action) { setDelivery({ status: 'failed', message: '消息为空或发送目标不可用。' }); return; }
    const approval = approveMessageSend(action, new Date().toISOString());
    try {
      const receipt = await services.messageDraft.execute(action, approval);
      if (receipt.status === 'success') {
        setDelivery({ status: 'sent', receipt });
        setAcceptedAgentEventId(lastAgentEvent?.id ?? null);
        setDraftEditing(false);
        setLearningArtifact(null);
        if (receipt.messageId) onLocateMessage(receipt.messageId);
      } else setDelivery({ status: 'failed', message: receipt.result });
    } catch (error) {
      setDelivery({ status: 'failed', message: error instanceof Error ? error.message : '消息暂时无法发送，请重试。' });
    }
  }

  function cancelMessageReview() {
    if (delivery.status === 'sending') return;
    setMessageDraft(null);
    setDraftEditing(false);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
  }

  function convertAdviceToMessage() {
    const request = direct
      ? '请根据刚才的建议，整理成一条可以直接回复给对方的消息。'
      : '请根据刚才的建议，整理成一条可以直接发送到当前班级群的消息。';
    void submit(request);
  }

  const plannedDelivery = selection && catalog ? deliveryTarget(selection, catalog, direct ? 'direct' : 'class') : null;
  const personalDelivery = direct || plannedDelivery?.kind === 'direct-composer';
  const priorAgentEvent = lastTeacherEvent && runtime.session
    ? [...runtime.session.events].reverse().find(event => event.actor === 'agent' && event.sequence < lastTeacherEvent.sequence && event.summary.trim())
    : undefined;
  const restoredDeliveryIntent = lastTeacherEvent
    ? projectImMessageDeliveryIntent(teacherVisibleRuntimeText(lastTeacherEvent.summary), 'freeform', priorAgentEvent?.summary)
    : 'none';
  const activeDeliveryProjection = deliveryIntentProjection?.sessionRef === runtime.session?.id ? deliveryIntentProjection : null;
  const currentDeliveryIntent = activeDeliveryProjection
    ? lastAgentEvent && lastAgentEvent.id !== activeDeliveryProjection.baselineAgentEventId
      ? activeDeliveryProjection.intent
      : 'none'
    : restoredDeliveryIntent;
  const connectionProblem = runtime.health && runtime.health.status !== 'ready'
    ? runtime.health.status === 'unconfigured' ? `${TEACHBUDDY_IM_ASSISTANT_LABEL}尚未配置完成` : `${TEACHBUDDY_IM_ASSISTANT_LABEL}暂时无法连接`
    : '';

  const hasAnswer = logicalSessions.some(session => session.events.some(event => event.actor === 'agent' && event.kind === 'process' && event.summary.trim()));
  const questions = projectGeneralQuestions(catalog?.questionGuidance ?? ENTRY_QUESTION_GUIDANCE, hasAnswer);
  const hasVisibleConversation = visibleSessions.some(session => session.artifacts.length || session.events.some(event => event.actor === 'teacher' || event.actor === 'agent'));
  const showWelcome = !direct && !recoveringBinding && historyPresentation.isReady(sessionRef)
    && !runtime.readError && !historyPresentation.revealed && !hasVisibleConversation
    && (!sessionRef || Boolean(runtime.session)) && initialSessionTrail.every(id => logicalSessions.some(session => session.id === id));
  const isTeachingActionDisabled = (action: TeachingDynamicAction) => Boolean(action.learningSelection && !catalog);
  const recommendationsReady = Boolean(presentation.expanded && canSend && dynamics && dynamicsState.status !== 'failed'
    && projectTeachingStage(dynamics, presentation.selectedStage ?? dynamics.currentStage, true).items
      .some(item => item.action && !isTeachingActionDisabled(item.action)));
  // A parent relationship is not established by a class chat. Keep that draft copy-only.
  const lastExplicitAudience = [...(runtime.session?.events ?? [])].reverse().filter(event => event.actor === 'teacher' && event.kind === 'teacher_message').map(event => teacherVisibleRuntimeText(event.summary)).find(text => /家长|班级群|发给学生|回复同学/u.test(text));
  const parentDraft = Boolean(lastExplicitAudience && /家长/u.test(lastExplicitAudience));
  function focusComposer() { window.requestAnimationFrame(() => timelineRef.current?.closest('aside')?.querySelector<HTMLTextAreaElement>('textarea[aria-label^="向 "]')?.focus()); }
  function askQuestion(question: GeneralQuestion) {
    const now = Date.now();
    if (lastQuestionClick.current.id === question.id && now - lastQuestionClick.current.at < 350) return false;
    lastQuestionClick.current = { id: question.id, at: now };
    const result = activateGeneralQuestion(question, { text: composerDraft, hasAttachments: imageDrafts.length > 0, hasReference: Boolean(reference), busy: running || Boolean(pending) || preparingRequest || submitLock.current, reviewing: draftEditing || Boolean(currentDeliveryIntent === 'draft' && lastAgentEvent && acceptedAgentEventId !== lastAgentEvent.id), sending: delivery.status === 'sending', canSend: Boolean(canSend) });
    if (result.kind === 'blocked') { setQuestionNotice(result.message); return false; }
    if (result.kind === 'append') { setComposerDraft(result.text); setQuestionNotice(result.message); focusComposer(); }
    else { void submit(question.text, 'freeform', question.contextRefs); focusComposer(); }
    return true;
  }
  return (
    <aside className={styles.sidecar} aria-label={`${TEACHBUDDY_IM_ASSISTANT_LABEL}私密协作窗口`} data-dismissible={onClose ? 'true' : 'false'} data-guide-integrated="true" data-question-guidance={!direct ? "true" : "false"} data-surface="floating-assistant" id="workbuddy-im-sidecar">
      <TeachingDynamics
        snapshot={dynamics}
        expanded={presentation.expanded}
        selectedStage={presentation.selectedStage}
        loading={dynamicsState.status === 'loading' || dynamicsState.status === 'refreshing'}
        slow={dynamicsState.status === 'loading' && dynamicsState.slow}
        error={dynamicsState.status === 'failed' ? dynamicsState.error : ''}
        updatedWhileCompact={dynamicsUpdated}
        contextPrefix={target.kind === 'class' ? target.classLabel : undefined}
        disabled={!canSend}
        isActionDisabled={isTeachingActionDisabled}
        onExpandedChange={(expanded) => {
          setPresentation((current) => ({ ...current, expanded }));
          if (expanded) setDynamicsUpdated(false);
        }}
        onSelectedStageChange={(selectedStage) => setPresentation((current) => ({ ...current, selectedStage }))}
        onAction={triggerTeachingAction}
        onRetry={retryDynamics}
        onClose={onClose}
      />

      <div
        aria-label={`${TEACHBUDDY_IM_ASSISTANT_LABEL}对话`}
        className={styles.agentBody}
        tabIndex={0}
        onWheel={(event) => { if (event.deltaY < 0 && event.currentTarget.scrollTop <= 8) revealHistory(); }}
        onScroll={(event) => {
          const timeline = event.currentTarget;
          followLatestMessageRef.current = timeline.scrollHeight - timeline.clientHeight - timeline.scrollTop < 48;
        }}
        ref={timelineRef}
        role="region"
      >
        {connectionProblem ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{connectionProblem}{runtime.health?.message ? `：${runtime.health.message}` : ''}</p><button type="button" onClick={runtime.reconnect}><RefreshCw aria-hidden="true" size={14} />重试</button></div> : null}

        {recoveringBinding || (sessionRef && !runtime.session && !runtime.readError) ? <p className={styles.runtimeProgress} role="status">正在恢复当前对话…</p> : null}
        {!direct ? <GeneralQuestionWelcome questions={ENTRY_QUESTION_GUIDANCE.questions} onQuestion={askQuestion} disabled={delivery.status === 'sending'} eligible={showWelcome} recommendationsReady={recommendationsReady} /> : null}
        {hasHiddenHistory ? <button className={styles.historyEntry} type="button" onClick={event => revealHistory(event.detail === 0)} aria-label="查看历史消息"><span aria-hidden="true">↑</span> 查看历史<span className={styles.historyHint}>向上滚动也可查看</span></button> : null}
        {visibleSessions.some(({ events, artifacts }) => events.length || artifacts.some(isSolutionImage)) ? <ol className={styles.agentEvents} aria-label={`${TEACHBUDDY_IM_ASSISTANT_LABEL}会话消息`}>{visibleSessions.map((logicalSession) => {
          const turns = splitAnalysisProcessTurns(logicalSession.events);
          const solutionImages = logicalSession.artifacts.filter(isSolutionImage);
          if (!turns.length) return solutionImages.map((artifact) => <li className={styles.solutionImageItem} key={`${logicalSession.id}:${artifact.id}`}><SolutionImagePreview artifact={artifact} scope={services.scope} sessionId={logicalSession.id} /></li>);
          const imagesByTurn = assignSolutionImagesToTurns(turns, solutionImages);
          return turns.map((turn, turnIndex) => {
            const turnTeacher = turn.events.find(({ kind }) => kind === 'teacher_message');
            const turnStatus = turnIndex === turns.length - 1 ? logicalSession.status
              : turn.events.some(({ state }) => state === 'failed') ? 'failed'
                : turn.events.some(({ state }) => state === 'stopped' || state === 'cancelled') ? 'stopped' : 'idle';
            const turnSession = { id: logicalSession.id, status: turnStatus, events: turn.events, updatedAt: logicalSession.updatedAt } as const;
            const messages = turn.events.filter((event) => event.actor === 'teacher' || (event.actor === 'agent' && event.kind === 'process') || event.kind === 'error');
            const timeline = buildTurnTimeline(messages, imagesByTurn[turnIndex] ?? []);
            return <Fragment key={`${logicalSession.id}:${turn.id}`}>{historyPresentation.firstNewTurn?.sessionRef === logicalSession.id && historyPresentation.firstNewTurn.turnId === turn.id ? <li className={styles.newMessageDivider}><span>以下为新消息</span></li> : null}{timeline.map((item) => {
              if (item.kind === 'solution-image') return <li className={styles.solutionImageItem} key={`${logicalSession.id}:${item.artifact.id}`}><SolutionImagePreview artifact={item.artifact} scope={services.scope} sessionId={logicalSession.id} /></li>;
              const event = item.event;
              if (messageDraft && draftEditing && logicalSession.id === runtime.session?.id && event.id === lastAgentEvent?.id) return null;
              const isCurrentDraft = event.actor === 'agent' && logicalSession.id === runtime.session?.id && event.id === lastAgentEvent?.id && currentDeliveryIntent === 'draft' && logicalSession.status === 'idle';
              const visible = isCurrentDraft ? messageDraft?.body ?? currentDraftBody : event.actor === 'teacher' ? teacherVisibleRuntimeText(event.summary) : event.actor === 'agent' ? formatImAssistantIdentity(event.summary) : event.summary;
              return <Fragment key={`${logicalSession.id}:${event.id}`}><li data-actor={event.actor}><article aria-label={event.actor === 'teacher' ? '你的消息' : event.actor === 'agent' ? `${TEACHBUDDY_IM_ASSISTANT_LABEL}回复` : event.title}>{event.actor !== 'teacher' && event.actor !== 'agent' ? <header><strong>{event.title}</strong></header> : null}{event.actor === 'agent' ? <>{isCurrentDraft ? <p className={styles.draftCaption}>消息草稿</p> : null}<AgentRichResponse className={isCurrentDraft ? styles.compactDraft : undefined} mentionLabels={mentionLabels}>{visible}</AgentRichResponse></> : <p>{visible}</p>}</article></li>{event.id === turnTeacher?.id ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} assistantLabel={TEACHBUDDY_IM_ASSISTANT_LABEL} /></li> : null}</Fragment>;
            })}{!turnTeacher ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} assistantLabel={TEACHBUDDY_IM_ASSISTANT_LABEL} /></li> : null}</Fragment>;
          });
        })}</ol> : null}
        {activeSession?.status === 'running' && activeSession.events.length === 0 ? <AnalysisProcess session={activeSession} mode="compact" context={null} assistantLabel={TEACHBUDDY_IM_ASSISTANT_LABEL} /> : null}

        {activeTurnVisible && lastAgentEvent && runtime.session?.status === 'idle' && !pending && (!messageDraft || !draftEditing) && acceptedAgentEventId !== lastAgentEvent.id && (!selection || learningResultReady) && currentDeliveryIntent !== 'none' ? (
          <div className={styles.agentResultActions}>
            {parentDraft ? <><span className={styles.deliveryTarget}>家长消息草稿 · 请复制后选择接收人</span><button type="button" className={styles.conversionAction} onClick={() => { if (!navigator.clipboard) { setQuestionNotice('当前浏览器不支持直接复制，请选择正文手动复制'); return; } void navigator.clipboard.writeText(currentDraftBody).then(() => setQuestionNotice('已复制家长消息草稿')).catch(() => setQuestionNotice('未能复制，请选择正文手动复制')); }}>复制草稿</button></> : currentDeliveryIntent === 'draft'
              ? <><span className={styles.deliveryTarget}>{personalDelivery ? '插入私聊输入框' : `发送至：${target.classLabel}`}</span><button className={styles.conversionAction} type="button" disabled={delivery.status === 'sending'} onClick={() => void reviewAsMessage()}>修改文案</button><button className={styles.resultAction} type="button" disabled={!currentDraftBody || delivery.status === 'sending'} onClick={() => void (messageDraft ? deliverDraft() : reviewAsMessage(true))}>{delivery.status === 'sending' ? '发送中…' : personalDelivery ? '插入回复框' : delivery.status === 'failed' ? '重试发送' : '直接发送'}</button></>
              : <button className={styles.conversionAction} type="button" onClick={convertAdviceToMessage}>{direct ? '整理成回复' : '整理成群消息'}</button>}
          </div>
        ) : null}

        {messageDraft && draftEditing ? <section className={styles.directDraft} data-review-artifact="true" aria-label={personalDelivery ? '个性化沟通草稿' : '班级群消息草稿'}>
          <header><span>{learningArtifact?.title ?? (personalDelivery ? '可发送回复' : '可发送消息')}</span></header>
          {learningArtifact ? <dl className={styles.learningArtifactMeta}><div><dt>接收对象</dt><dd>{learningArtifact.recipientLabel}</dd></div><div><dt>交付方式</dt><dd>{learningArtifact.delivery === 'class-review' ? '当前班级群 · 确认后发送' : '学生私聊 · 插入输入框'}</dd></div></dl> : null}
          <label><span>消息正文</span><textarea aria-label="消息草稿正文" value={messageDraft.body} disabled={delivery.status === 'sending' || delivery.status === 'sent'} autoFocus onChange={(event) => { const body = event.target.value; setMessageDraft(reviseMessageDraft(messageDraft, body)); setLearningArtifact((current) => current ? revisePersonalizedLearningArtifact(current, body) : null); setDelivery({ status: 'idle' }); }} /></label>
          {delivery.status === 'failed' ? <p className={styles.inlineError} role="alert">{delivery.message}</p> : null}
          <footer><span>{personalDelivery ? '插入后仍需由你手动发送' : `将以${services.actor.name}身份发送到${target.classLabel}`}</span><div className={styles.draftActions}><button className={styles.draftCancel} type="button" disabled={delivery.status === 'sending'} onClick={cancelMessageReview}>取消</button><button className={styles.primaryButton} type="button" disabled={!messageDraft.body.trim() || delivery.status === 'sending'} onClick={() => void deliverDraft()}>{delivery.status === 'sending' ? '发送中…' : direct ? '插入回复框' : personalDelivery ? `转到${catalog?.students.find(({ ref }) => ref === selection?.studentRef)?.label ?? '学生'}私聊并插入` : '确认发送'}</button></div></footer>
        </section> : null}

        {delivery.status === 'failed' && !draftEditing ? <p className={styles.inlineError} role="alert">{delivery.message}</p> : null}
        {delivery.status === 'sent' ? <p className={styles.runtimeNotice} role="status">已发送</p> : null}
        {delivery.status === 'inserted' ? <p className={styles.runtimeNotice} role="status">已插入，请在聊天框发送</p> : null}

        {runtime.creation === 'pending' ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />正在准备{TEACHBUDDY_IM_ASSISTANT_LABEL}…</p> : null}
        {sendingRequest && activeSession?.status !== 'running' ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />{TEACHBUDDY_IM_ASSISTANT_LABEL}正在理解你的要求…</p> : null}
        {stopping ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />正在停止当前生成…</p> : null}
        {(activeTurnVisible || interruptedSessionRef === runtime.session?.id) && runtime.session?.status === 'stopped' ? <p className={styles.runtimeNotice} role="status">{runtime.session.error || '生成已停止，你可以继续发送要求。'}</p> : null}
        {activeTurnVisible && runtime.session?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.session.error || '任务未完成，请重试或调整要求。'}</p></div> : null}
        {runtime.readError && runtime.readErrorStatus !== 404 ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.readError}</p><button type="button" onClick={runtime.reconnect}>重试恢复</button></div> : null}
        {runtime.operation?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.operation.error}</p><button type="button" onClick={() => { if (!sessionRef || runtime.operation?.status !== 'failed') return; const command = runtime.operation.command; if (command.kind === 'send' && command.images?.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined }; void runtime.execute(sessionRef, command).then((completed) => { if (selection) setLearningResultReady(completed); }); }}>{runtime.operation.command.kind === 'cancel' ? '重试停止' : '重试原请求'}</button></div> : null}
        {runtime.createError ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.createError}</p></div> : null}
        {contextError ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{contextError}</p></div> : null}
      </div>

      <div className={styles.questionComposerArea}>
      {reference ? <div className={styles.questionReference}><span><strong>引用 {reference.authorName}</strong><small>{new Date(reference.sentAt).toLocaleString('zh-CN')} · {reference.preview}</small></span><button type="button" aria-label="移除AI引用" onClick={() => setReference(null)}><X size={14} aria-hidden="true" /></button></div> : null}
      {questionNotice ? <p className={styles.questionNotice} role="status">{questionNotice}</p> : null}
      <WorkspaceComposer
        ariaLabel={`向 ${TEACHBUDDY_IM_ASSISTANT_LABEL}输入要求`}
        className={styles.runComposerDock}
        countThreshold={3_200}
        disabled={delivery.status === 'sending'}
        imageAccept={RUNTIME_IMAGE_ACCEPT}
        imageAttachments={imageDrafts}
        imageError={imageError}
        maxLength={4_000}
        onSubmit={() => void submit()}
        onAddImages={addImages}
        onRemoveImage={removeImage}
        onValueChange={setComposerDraft}
        placeholder={direct ? '例如：结合当前对话，帮我拟一条专业回复…' : '问问班级、课程和作业，或让我帮您写消息…'}
        submitLabel={`发送给 ${TEACHBUDDY_IM_ASSISTANT_LABEL}`}
        canSubmit={canSend}
        secondaryActions={!direct || (canStop && sessionRef) ? <>
          {!direct ? <GeneralQuestionHelp groups={questions.groups} onQuestion={askQuestion} disabled={delivery.status === 'sending'} availableHeight={chatHeight} loading={catalogLoading} error={catalogError} onRetry={retryCatalog} /> : null}
          {canStop && sessionRef ? <button type="button" aria-label="停止生成" title="停止生成" disabled={stopping} onClick={() => { setInterruptedSessionRef(sessionRef); void runtime.execute(sessionRef, { kind: 'cancel' }); }}><Square aria-hidden="true" size={14} />停止</button> : null}
        </> : undefined}
        value={composerDraft}
      />
      </div>
    </aside>
  );
}
