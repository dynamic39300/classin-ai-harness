import { AlertTriangle, CheckCircle2, ExternalLink, LoaderCircle, MessageSquarePlus, RefreshCw, Sparkles, Square, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BusinessContextSnapshot, ImSidecarAgentServices, LearningContextCatalog, LearningContextSelection, MessageDraftArtifact, PersonalizedLearningArtifact, SendMessageReceipt } from '@contracts/workbuddy/business-context';
import type { WorkBuddyImTarget } from '@contracts/workbuddy/im-conversation-run';
import type { TeachingDynamicAction, TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { TeachBuddyAvatar } from '@design-system/TeachBuddyAvatar';
import { AgentRichResponse } from '@design-system/AgentRichResponse';
import { approveMessageSend, createMessageDraft, proposeMessageSend, reviseMessageDraft, validateMessageContext } from '@domain/workbuddy/im-message-draft';
import { buildLearningTeacherRequest, createPersonalizedLearningArtifact, deliveryTarget, revisePersonalizedLearningArtifact, validateLearningSelectionAgainstCatalog } from '@domain/workbuddy/personalized-learning-service';
import { createRuntimeContextEnvelope, teacherVisibleRuntimeText } from '@domain/workbuddy/runtime-context-envelope';
import { splitAnalysisProcessTurns } from '@domain/workbuddy/analysis-process';
import { AnalysisProcess, appendRuntimeImageDrafts, encodeRuntimeImageDrafts, needsFreshTextSession, releaseRuntimeImageDrafts, RUNTIME_IMAGE_ACCEPT, type RuntimeImageDraft, useAgentRuntime } from '@features/agent-runtime';
import { getImAgentSessionBinding, removeImAgentSessionBinding, saveImAgentSessionBinding } from './im-agent-session-binding';
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

type TeachingDynamicsPresentation = Readonly<{ expanded: boolean }>;

function presentationStorageKey(threadRef: string) {
  return `teachbuddy:teaching-dynamics:${threadRef}`;
}

function loadPresentation(threadRef: string, hasBoundSession: boolean): TeachingDynamicsPresentation {
  try {
    const saved = window.sessionStorage.getItem(presentationStorageKey(threadRef));
    if (saved) {
      const value = JSON.parse(saved) as Partial<TeachingDynamicsPresentation>;
      return { expanded: value.expanded !== false };
    }
  } catch { /* The local preference must not block the teaching workflow. */ }
  return { expanded: !hasBoundSession };
}

function savePresentation(threadRef: string, presentation: TeachingDynamicsPresentation) {
  try { window.sessionStorage.setItem(presentationStorageKey(threadRef), JSON.stringify(presentation)); } catch { /* Keep the surface usable without storage. */ }
}

export function ImSidecarAgentSurface({ services, target, onLocateMessage, onInsertDirectReply, onClose }: Props) {
  const bindingTarget = useMemo(() => ({
    actorRef: services.actor.id,
    tenantRef: services.tenantRef,
    threadRef: target.threadId,
    scope: services.scope,
  }), [services.actor.id, services.scope, services.tenantRef, target.threadId]);
  const initialBinding = useMemo(() => getImAgentSessionBinding(bindingTarget), [bindingTarget]);
  const [sessionRef, setSessionRef] = useState(initialBinding);
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
  const [presentation, setPresentation] = useState<TeachingDynamicsPresentation>(() => loadPresentation(target.threadId, Boolean(initialBinding)));
  const timelineRef = useRef<HTMLDivElement>(null);
  const imageDraftsRef = useRef(imageDrafts);
  const pendingImageSubmission = useRef<{ images: readonly RuntimeImageDraft[]; beforeTeacherEventId?: string } | null>(null);
  const latestTeacherEventIdRef = useRef<string | null>(null);
  const direct = target.kind === 'direct';
  const activeSession = runtime.session;
  const analysisTurns = activeSession ? splitAnalysisProcessTurns(activeSession.events) : [];
  const pending = runtime.operation?.status === 'pending';
  const running = runtime.session?.status === 'running';
  const lastAgentEvent = runtime.session ? [...runtime.session.events].reverse().find((event) => event.actor === 'agent' && event.summary.trim()) : undefined;
  const canSend = runtime.health?.status === 'ready' && !running && !pending && runtime.creation !== 'pending'
    && (!sessionRef || Boolean(runtime.session)) && !runtime.readError && delivery.status !== 'sending';

  const loadDynamics = useCallback(async () => {
    try {
      const next = await services.teachingDynamics.list({ actorRef: services.actor.id, tenantRef: services.tenantRef, target });
      if (next.threadRef !== target.threadId) throw new Error('教学动态与当前会话不匹配，请刷新后重试。');
      setDynamics((current) => {
        if (current && current.version !== next.version && !presentation.expanded) setDynamicsUpdated(true);
        return next;
      });
      setDynamicsError('');
    } catch (error) {
      setDynamicsError(error instanceof Error ? error.message : '教学动态暂时无法读取。');
    } finally {
      setDynamicsLoading(false);
    }
  }, [presentation.expanded, services.actor.id, services.teachingDynamics, services.tenantRef, target]);

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

  useEffect(() => { savePresentation(target.threadId, presentation); }, [presentation, target.threadId]);
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
    const latestTeacher = activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message') : undefined;
    if (!latestTeacher || latestTeacher.id === latestTeacherEventIdRef.current) return;
    latestTeacherEventIdRef.current = latestTeacher.id;
    setPresentation((current) => ({ ...current, expanded: false }));
  }, [activeSession]);

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
    if (timeline) timeline.scrollTo?.({ top: timeline.scrollHeight, behavior: 'auto' });
  }, [delivery, messageDraft, runtime.session]);

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
    let id = recoveringTextSession ? null : sessionRef;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      try {
        saveImAgentSessionBinding(bindingTarget, id);
      } catch {
        setContextError('会话已创建，但本机未能保存恢复信息。当前页面仍可继续使用。');
      }
      setSessionRef(id);
    }
    setMessageDraft(null);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
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
    let id = recoveringTextSession ? null : sessionRef;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      try { saveImAgentSessionBinding(bindingTarget, id); } catch { setContextError('会话已创建，但本机未能保存恢复信息。当前页面仍可继续使用。'); }
      setSessionRef(id);
    }
    setMessageDraft(null);
    setLearningArtifact(null);
    setDelivery({ status: 'idle' });
    setRuntimeArtifactBaselineIds(runtime.session?.artifacts.map(({ id: artifactId }) => artifactId) ?? []);
    if (imageDrafts.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: recoveringTextSession ? undefined : activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined };
    const completed = await runtime.execute(id, { kind: 'send', text: createRuntimeContextEnvelope(captured, buildLearningTeacherRequest(nextSelection, catalog, teacherRequest)), commandId: crypto.randomUUID(), ...(images.length ? { images } : {}) });
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

  function startNewSession() {
    removeImAgentSessionBinding(bindingTarget);
    setSessionRef(null);
    setSnapshot(null);
    setMessageDraft(null);
    setLearningArtifact(null);
    setSelection(null);
    setDelivery({ status: 'idle' });
    setContextError('');
    setLearningResultReady(false);
    setRuntimeArtifactBaselineIds([]);
    setPresentation({ expanded: true });
    latestTeacherEventIdRef.current = null;
    releaseRuntimeImageDrafts(imageDrafts);
    setImageDrafts([]);
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
    <aside className={styles.sidecar} aria-label={`${TEACHBUDDY_BRAND.shortName} 私密协作窗口`} data-dismissible={onClose ? 'true' : 'false'} data-surface="floating-assistant" id="workbuddy-im-sidecar">
      <header className={styles.header}>
        <div className={styles.identity}><TeachBuddyAvatar size="compact" /><strong>{TEACHBUDDY_BRAND.shortName}</strong><span className={styles.runtimeIdentity}>仅你可见</span></div>
        <div className={styles.headerActions}>
          <button type="button" aria-label="新建 TeachBuddy 会话" title="新建会话" disabled={running || pending} onClick={startNewSession}><MessageSquarePlus aria-hidden="true" size={17} /></button>
          {onClose ? <button type="button" aria-label={`关闭 ${TEACHBUDDY_BRAND.shortName}`} onClick={onClose}><X aria-hidden="true" size={17} /></button> : null}
        </div>
      </header>

      <div className={styles.agentBody} ref={timelineRef}>
        {connectionProblem ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{connectionProblem}{runtime.health?.message ? `：${runtime.health.message}` : ''}</p><button type="button" onClick={runtime.reconnect}><RefreshCw aria-hidden="true" size={14} />重试</button></div> : null}

        <TeachingDynamics
          snapshot={dynamics}
          expanded={presentation.expanded}
          loading={dynamicsLoading}
          error={dynamicsError || catalogError}
          updatedWhileCompact={dynamicsUpdated}
          disabled={!canSend || !catalog}
          onExpandedChange={(expanded) => {
            setPresentation((current) => ({ ...current, expanded }));
            if (expanded) setDynamicsUpdated(false);
          }}
          onAction={triggerTeachingAction}
          onRetry={() => { void loadDynamics(); runtime.reconnect(); }}
        />

        {sessionRef && !runtime.session && !runtime.readError ? <p className={styles.runtimeProgress} role="status">正在恢复当前消息会话…</p> : null}
        {activeSession?.events.length ? <ol className={styles.agentEvents} aria-label="TeachBuddy 会话消息">{analysisTurns.map((turn, turnIndex) => {
          const turnTeacher = turn.events.find(({ kind }) => kind === 'teacher_message');
          const turnStatus = turnIndex === analysisTurns.length - 1 ? activeSession.status
            : turn.events.some(({ state }) => state === 'failed') ? 'failed'
              : turn.events.some(({ state }) => state === 'stopped' || state === 'cancelled') ? 'stopped' : 'idle';
          const turnSession = { id: activeSession.id, status: turnStatus, events: turn.events, updatedAt: activeSession.updatedAt } as const;
          const messages = turn.events.filter((event) => event.actor === 'teacher' || (event.actor === 'agent' && event.kind === 'process') || event.kind === 'error');
          return <Fragment key={turn.id}>{messages.map((event) => {
            const visible = event.actor === 'teacher' ? teacherVisibleRuntimeText(event.summary) : event.summary;
            return <Fragment key={event.id}><li data-actor={event.actor}><article><header><strong>{event.actor === 'teacher' ? '您' : event.actor === 'agent' ? 'TeachBuddy' : event.title}</strong></header>{event.actor === 'agent' ? <AgentRichResponse>{visible}</AgentRichResponse> : <p>{visible}</p>}</article></li>{event.id === turnTeacher?.id ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} /></li> : null}</Fragment>;
          })}{!turnTeacher ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} mode="compact" context={null} /></li> : null}</Fragment>;
        })}</ol> : null}
        {activeSession?.status === 'running' && activeSession.events.length === 0 ? <AnalysisProcess session={activeSession} mode="compact" context={null} /> : null}

        {lastAgentEvent && runtime.session?.status === 'idle' && !messageDraft && (!selection || learningResultReady) ? (
          <div className={styles.agentResultActions}>
            <button className={styles.secondaryButton} type="button" onClick={() => void reviewAsMessage()}>{selection ? '审阅沟通内容' : direct ? '作为回复草稿审阅' : '作为群消息草稿审阅'}</button>
            <Link to={`/teacher/ai-agent/new?${new URLSearchParams({ session: runtime.session.id })}`}>在 TeachBuddy 中继续<ExternalLink aria-hidden="true" size={13} /></Link>
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

        {runtime.creation === 'pending' ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />正在创建会话…</p> : null}
        {pending && runtime.operation?.command.kind === 'send' ? <p className={styles.runtimeProgress} role="status"><LoaderCircle className={styles.spinner} aria-hidden="true" size={16} />TeachBuddy 正在理解你的要求…</p> : null}
        {runtime.session?.status === 'stopped' ? <p className={styles.runtimeNotice} role="status">{runtime.session.error || '生成已停止，你可以继续发送要求。'}</p> : null}
        {runtime.session?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.session.error || '任务未完成，请重试或调整要求。'}</p></div> : null}
        {runtime.readError ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.readError}</p><button type="button" onClick={runtime.reconnect}>重试恢复</button><button type="button" onClick={startNewSession}>新建会话</button></div> : null}
        {runtime.operation?.status === 'failed' ? <div className={styles.runtimeError} role="alert"><AlertTriangle aria-hidden="true" size={16} /><p>{runtime.operation.error}</p><button type="button" onClick={() => { if (!sessionRef || runtime.operation?.status !== 'failed') return; const command = runtime.operation.command; if (command.kind === 'send' && command.images?.length) pendingImageSubmission.current = { images: imageDrafts, beforeTeacherEventId: activeSession ? [...activeSession.events].reverse().find(({ kind }) => kind === 'teacher_message')?.id : undefined }; void runtime.execute(sessionRef, command).then((completed) => { if (selection) setLearningResultReady(completed); if (completed && command.kind === 'send') setComposerDraft(''); }); }}>重试原请求</button></div> : null}
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
        tools={<button type="button" aria-label="打开教学协作" title="教学协作" onClick={() => { setPresentation({ expanded: true }); setDynamicsUpdated(false); timelineRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' }); }}><Sparkles aria-hidden="true" size={17} /><span>教学协作</span></button>}
        secondaryActions={running && sessionRef ? <button type="button" aria-label="停止生成" title="停止生成" disabled={pending} onClick={() => void runtime.execute(sessionRef, { kind: 'cancel' })}><Square aria-hidden="true" size={14} />停止</button> : undefined}
        value={composerDraft}
      />
    </aside>
  );
}
