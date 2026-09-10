import { ArrowLeft, Download, FileText, History, MessageSquarePlus, RefreshCw, Save, Square, X } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AgentRuntimeAdapter, RuntimeArtifact, RuntimeScope } from '@contracts/workbuddy/agent-runtime';
import { TeachBuddyAvatar } from '@design-system/TeachBuddyAvatar';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { createHttpAgentRuntime } from './http-agent-runtime';
import { useAgentRuntime } from './use-agent-runtime';
import { teacherVisibleRuntimeText } from '@domain/workbuddy/runtime-context-envelope';
import { splitAnalysisProcessTurns } from '@domain/workbuddy/analysis-process';
import { AnalysisProcess } from './AnalysisProcess';
import { appendRuntimeImageDrafts, encodeRuntimeImageDrafts, releaseRuntimeImageDrafts, RUNTIME_IMAGE_ACCEPT, type RuntimeImageDraft } from './runtime-image-attachments';
import { needsFreshTextSession } from './runtime-session-recovery';
import styles from './AgentRuntimeSurface.module.css';

const httpRuntime = createHttpAgentRuntime();
const statusLabels = { idle: '等待您的下一步', running: '正在处理', stopped: '已停止', failed: '任务失败' };

type Props = Readonly<{ scope: RuntimeScope; newTaskPath: string; returnTarget?: Readonly<{ label: string; to: string }>; adapter?: AgentRuntimeAdapter; embeddedNavigation?: boolean; initialDraft?: string }>;

export function AgentRuntimeSurface(props: Props) {
  return <RuntimeWorkspace key={props.scope} {...props} />;
}

function RuntimeWorkspace({ scope, newTaskPath, returnTarget, adapter = httpRuntime, embeddedNavigation = false, initialDraft = '' }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = new URLSearchParams(location.search).get('session');
  const runtime = useAgentRuntime(adapter, scope, activeId);
  const { session, operation } = runtime;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [imageDrafts, setImageDrafts] = useState<Record<string, readonly RuntimeImageDraft[]>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<{ sessionId: string; artifactId: string } | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const followTail = useRef(true);
  const navigationVersion = useRef(0);
  const imageDraftsRef = useRef(imageDrafts);
  const pendingImageSubmission = useRef<{ sessionId: string; images: readonly RuntimeImageDraft[]; beforeTeacherEventId?: string } | null>(null);
  const consumedDraftLocation = useRef('');
  const pending = operation?.status === 'pending';
  const running = session?.status === 'running';
  const draftKey = activeId ?? '';
  const draft = drafts[draftKey] ?? '';
  const attachedImages = imageDrafts[draftKey] ?? [];
  const artifact = review?.sessionId === activeId ? session?.artifacts.find((item) => item.id === review.artifactId) : undefined;
  const lastTeacherMessage = session ? [...session.events].reverse().find((event) => event.kind === 'teacher_message') : undefined;
  const analysisTurns = session ? splitAnalysisProcessTurns(session.events) : [];
  const canSend = runtime.health?.status === 'ready' && !running && !pending
    && runtime.creation !== 'pending' && (!activeId || Boolean(session)) && !runtime.readError
    && !(operation?.status === 'failed' && operation.command.kind === 'send');

  useEffect(() => {
    navigationVersion.current += 1;
    followTail.current = true;
  }, [activeId]);
  useEffect(() => {
    if (!initialDraft || consumedDraftLocation.current === location.key) return;
    consumedDraftLocation.current = location.key;
    setDrafts((current) => current[draftKey]?.trim() ? current : { ...current, [draftKey]: initialDraft });
  }, [draftKey, initialDraft, location.key]);
  useEffect(() => {
    const timeline = timelineRef.current;
    if (timeline && followTail.current) timeline.scrollTop = timeline.scrollHeight;
  }, [session]);
  useEffect(() => { imageDraftsRef.current = imageDrafts; }, [imageDrafts]);
  useEffect(() => {
    const submission = pendingImageSubmission.current;
    if (!submission || !session || session.id !== submission.sessionId || session.status === 'running') return;
    const latestTeacher = [...session.events].reverse().find(({ kind }) => kind === 'teacher_message');
    if (!latestTeacher || latestTeacher.id === submission.beforeTeacherEventId) return;
    pendingImageSubmission.current = null;
    if (session.status !== 'idle') return;
    releaseRuntimeImageDrafts(submission.images);
    const ids = new Set(submission.images.map(({ id }) => id));
    setImageDrafts((current) => ({ ...current, [session.id]: (current[session.id] ?? []).filter(({ id }) => !ids.has(id)) }));
    setImageErrors((current) => ({ ...current, [session.id]: '' }));
  }, [session]);
  useEffect(() => () => {
    releaseRuntimeImageDrafts(Object.values(imageDraftsRef.current).flat());
  }, []);

  function pathFor(id?: string) {
    const [pathname, search = ''] = newTaskPath.split('?');
    const params = new URLSearchParams(search);
    params.delete('session');
    params.delete('workflow');
    if (id) params.set('session', id);
    return `${pathname}${params.size ? `?${params}` : ''}`;
  }

  async function submit() {
    if (!canSend || (!draft.trim() && attachedImages.length === 0)) return;
    const text = draft.trim();
    let images;
    try {
      images = await encodeRuntimeImageDrafts(attachedImages);
    } catch {
      setImageErrors((current) => ({ ...current, [draftKey]: '图片读取失败，请移除后重新添加。' }));
      return;
    }
    const version = navigationVersion.current;
    const commandId = crypto.randomUUID();
    const recoveringTextSession = needsFreshTextSession(session, attachedImages.length);
    let id = recoveringTextSession ? null : activeId;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      setDrafts((current) => ({ ...current, [id!]: text }));
      setImageDrafts((current) => ({ ...current, [id!]: attachedImages }));
      setImageErrors((current) => ({ ...current, [id!]: current[draftKey] ?? '' }));
      if (navigationVersion.current === version) navigate(pathFor(id));
    }
    if (attachedImages.length) pendingImageSubmission.current = { sessionId: id, images: attachedImages, beforeTeacherEventId: recoveringTextSession ? undefined : lastTeacherMessage?.id };
    const completed = await runtime.execute(id, { kind: 'send', text, commandId, ...(images.length ? { images } : {}) });
    if (!completed) return;
    setDrafts((current) => ({ ...current, [draftKey]: '', [id]: '' }));
    if (!attachedImages.length) {
      setImageDrafts((current) => ({ ...current, [draftKey]: [], [id]: [] }));
      setImageErrors((current) => ({ ...current, [draftKey]: '', [id]: '' }));
    }
  }

  function addImages(files: readonly File[]) {
    const result = appendRuntimeImageDrafts(attachedImages, files);
    setImageDrafts((current) => ({ ...current, [draftKey]: result.attachments }));
    setImageErrors((current) => ({ ...current, [draftKey]: result.error }));
  }

  function removeImage(imageId: string) {
    const image = attachedImages.find(({ id }) => id === imageId);
    if (image) releaseRuntimeImageDrafts([image]);
    setImageDrafts((current) => ({ ...current, [draftKey]: (current[draftKey] ?? []).filter(({ id }) => id !== imageId) }));
    setImageErrors((current) => ({ ...current, [draftKey]: '' }));
  }

  async function createSession() {
    const version = navigationVersion.current;
    const created = await runtime.create();
    if (created && version === navigationVersion.current) navigate(pathFor(created.id));
  }

  function download(item: RuntimeArtifact) {
    try {
      const link = document.createElement('a');
      link.href = `/api/teachbuddy/files/${encodeURIComponent(item.fileRef)}/download?${new URLSearchParams({ scope })}`;
      link.download = item.fileName;
      document.body.append(link);
      link.click();
      setTimeout(() => link.remove(), 1000);
      setDownloadError('');
    } catch {
      setDownloadError('下载未完成，请重试。');
    }
  }

  return (
    <section className={styles.surface} data-embedded-navigation={embeddedNavigation || undefined} aria-label="TeachBuddy 对话工作台">
      <header className={styles.header}>
        {returnTarget ? <Link className={styles.compactReturn} to={returnTarget.to} aria-label={returnTarget.label} title={returnTarget.label}><ArrowLeft size={16} aria-hidden="true" /></Link> : null}
        <div className={styles.identity}><TeachBuddyAvatar size="compact" /><div><h1 title={session?.title || 'TeachBuddy'}>{session?.title || 'TeachBuddy'}</h1><span>{session ? statusLabels[session.status] : 'AI 教学搭档'}</span></div></div>
        <nav className={styles.actions} aria-label="对话操作">
          <button type="button" title="历史会话" aria-label="历史会话" aria-expanded={historyOpen} aria-controls="runtime-history" onClick={() => setHistoryOpen((open) => !open)}><History size={16} aria-hidden="true" /></button>
          <button type="button" title="新建会话" aria-label="新建会话" disabled={runtime.creation === 'pending' || runtime.health?.status !== 'ready'} onClick={() => void createSession()}><MessageSquarePlus size={16} aria-hidden="true" /></button>
        </nav>
      </header>
      <div className={styles.connection} data-status={runtime.health?.status ?? 'loading'} role="status">
        <span>{runtime.health === null ? '正在连接 TeachBuddy…' : runtime.health.status === 'ready' ? 'TeachBuddy 已连接' : runtime.health.status === 'unconfigured' ? '服务尚未配置模型凭据，请联系本机服务管理员。' : 'TeachBuddy 暂时离线'}</span>
        {runtime.health && runtime.health.status !== 'ready' ? <span>{runtime.health.message}</span> : null}
        <button type="button" title="重新连接" aria-label="重新连接" onClick={runtime.reconnect}><RefreshCw size={14} aria-hidden="true" /></button>
      </div>
      <div className={styles.body} data-history={historyOpen} data-review={Boolean(artifact)}>
        {historyOpen ? <aside className={styles.history} id="runtime-history" aria-label="历史会话">
          <h2>历史会话</h2>
          {runtime.historyError ? <div role="alert"><p>{runtime.historyError}</p><button type="button" onClick={runtime.reconnect}>重试加载历史</button></div> : null}
          {runtime.history === null && !runtime.historyError ? <p role="status">正在加载历史…</p> : null}
          {runtime.history?.length === 0 ? <p>还没有会话</p> : null}
          <ul>{runtime.history?.map((item) => <li key={item.id}><Link aria-current={activeId === item.id ? 'page' : undefined} to={pathFor(item.id)}><strong>{item.title || '新会话'}</strong><span>{statusLabels[item.status]}</span></Link></li>)}</ul>
        </aside> : null}
        <section className={styles.conversation} aria-label="当前会话">
          <div className={styles.timeline} ref={timelineRef} tabIndex={0} aria-label="会话记录" onScroll={(event) => {
            const element = event.currentTarget;
            followTail.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
          }}>
            {!activeId || (session && session.events.length === 0 && session.status !== 'running') ? <div className={styles.welcome}><TeachBuddyAvatar size="welcome" /><h2>老师好，有什么能帮您的？</h2><p>教案、练习、测验或课程方案</p><p>当前仅依据您输入的内容，不会自动读取 ClassIn 教学数据。</p></div> : null}
            {activeId && !session && !runtime.readError ? <p role="status">正在恢复会话…</p> : null}
            {session ? <ol className={styles.events} aria-label="会话消息">{analysisTurns.map((turn, turnIndex) => {
              const turnTeacher = turn.events.find(({ kind }) => kind === 'teacher_message');
              const turnStatus = turnIndex === analysisTurns.length - 1 ? session.status
                : turn.events.some(({ state }) => state === 'failed') ? 'failed'
                  : turn.events.some(({ state }) => state === 'stopped' || state === 'cancelled') ? 'stopped' : 'idle';
              const turnSession = { id: session.id, status: turnStatus, events: turn.events, updatedAt: session.updatedAt } as const;
              const messages = turn.events.filter((event) => event.actor === 'teacher' || (event.actor === 'agent' && event.kind === 'process') || event.kind === 'error');
              return <Fragment key={turn.id}>{messages.map((event) => <Fragment key={event.id}><li data-actor={event.actor}>
                <article><header><strong>{event.actor === 'teacher' ? '您' : event.actor === 'agent' ? 'TeachBuddy' : event.title}</strong></header><p>{event.actor === 'teacher' ? teacherVisibleRuntimeText(event.summary) : event.summary || event.title}</p></article>
              </li>{event.id === turnTeacher?.id ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} /></li> : null}</Fragment>)}
              {!turnTeacher ? <li className={styles.analysisItem}><AnalysisProcess session={turnSession} /></li> : null}</Fragment>;
            })}</ol> : null}
            {session?.status === 'running' && session.events.length === 0 ? <AnalysisProcess session={session} /> : null}
            {session?.artifacts.length ? <section className={styles.outputs} aria-label="生成的产物"><h2>生成的产物</h2>{session.artifacts.map((item) => <button key={item.id} type="button" onClick={() => setReview({ sessionId: session.id, artifactId: item.id })}><FileText size={16} aria-hidden="true" /><span>{item.title}</span><small>v{item.version} · {item.status === 'saved' ? '已保存到本机' : '待审阅'}</small></button>)}</section> : null}
            {pending && operation.command.kind === 'approve' ? <p className={styles.operationStatus} role="status">正在保存产物…</p> : null}
            {pending && operation.command.kind === 'cancel' ? <p className={styles.operationStatus} role="status">正在停止…</p> : null}
            {pending && operation.command.kind === 'send' ? <p className={styles.operationStatus} role="status">正在提交要求，等待 TeachBuddy 确认…</p> : null}
            {runtime.creation === 'pending' ? <p className={styles.operationStatus} role="status">正在创建会话…</p> : null}
            {session?.status === 'stopped' ? <p role="status">{session.error || '生成已停止，您可以继续发送要求。'}</p> : null}
            {session?.status === 'failed' ? <div className={styles.error} role="alert"><p>{session.error || '任务未完成，请重试或调整要求。'}</p>{attachedImages.length ? <button type="button" disabled={!canSend} onClick={() => void submit()}>使用保留图片重试</button> : lastTeacherMessage?.state === 'completed' ? <button type="button" disabled={!canSend} onClick={() => void runtime.execute(session.id, { kind: 'send', text: lastTeacherMessage.summary, commandId: crypto.randomUUID() })}>重新发送上一条</button> : <button type="button" onClick={runtime.reconnect}>重新核对会话</button>}</div> : null}
            {runtime.readError ? <div className={styles.error} role="alert"><p>{runtime.readError}</p><button type="button" onClick={runtime.reconnect}>重试恢复会话</button></div> : null}
            {operation?.status === 'failed' && activeId ? <div className={styles.error} role="alert"><p>{operation.error}</p>{operation.command.kind === 'send' ? <p className={styles.plainText}>待确认的消息：{operation.command.text || `已附 ${operation.command.images?.length ?? 0} 张图片`}</p> : null}<button type="button" onClick={() => {
              const command = operation.command;
              if (command.kind === 'send' && command.images?.length) pendingImageSubmission.current = { sessionId: activeId, images: imageDrafts[activeId] ?? [], beforeTeacherEventId: lastTeacherMessage?.id };
              void runtime.execute(activeId, command).then((completed) => {
                if (completed && command.kind === 'send') setDrafts((current) => ({ ...current, [activeId]: '' }));
              });
            }}>重试原请求</button>{operation.rejected ? <button type="button" onClick={() => {
              if (operation.command.kind === 'send') setDrafts((current) => ({ ...current, [activeId]: operation.command.kind === 'send' ? operation.command.text : '' }));
              runtime.dismissRejected(activeId);
              if (operation.command.kind === 'approve') setReview(null);
            }}>{operation.command.kind === 'send' ? '修改消息' : '返回重新审阅'}</button> : null}</div> : null}
            {runtime.createError ? <div className={styles.error} role="alert"><p>{runtime.createError}</p><button type="button" onClick={() => void ((draft.trim() || attachedImages.length) && !activeId ? submit() : createSession())}>重试创建会话</button></div> : null}
          </div>
          <div className={styles.composerDock}><WorkspaceComposer ariaLabel="向 TeachBuddy 输入要求" value={draft} onValueChange={(value) => setDrafts((current) => ({ ...current, [draftKey]: value }))} placeholder="告诉我您想完成的教学工作…" submitLabel="发送给 TeachBuddy" onSubmit={() => void submit()} canSubmit={canSend} disabled={pending || running} maxLength={4000} hint="可上传或粘贴图片 · 产物保存到本机，不会发布到 ClassIn" imageAccept={RUNTIME_IMAGE_ACCEPT} imageAttachments={attachedImages} imageError={imageErrors[draftKey]} onAddImages={addImages} onRemoveImage={removeImage} secondaryActions={running && activeId ? <button type="button" aria-label="停止生成" title="停止生成" disabled={pending} onClick={() => void runtime.execute(activeId, { kind: 'cancel' })}><Square size={14} aria-hidden="true" />停止</button> : undefined} /></div>
        </section>
        {artifact && session ? <aside className={styles.review} aria-label="审阅产物">
          <header><div><h2>{artifact.title}</h2><span>v{artifact.version} · {artifact.status === 'saved' ? '已保存到本机' : '待审阅'}</span></div><button type="button" aria-label="关闭产物" title="关闭产物" onClick={() => setReview(null)}><X size={16} aria-hidden="true" /></button></header>
          <div className={styles.document} tabIndex={0} role="region" aria-label="产物正文"><pre>{artifact.content}</pre></div>
          <footer><p>保存位置：本机个人产物存储；不代表 ClassIn 正式发布。</p>{artifact.receipt ? <p>本机保存回执：{artifact.receipt.id}<br /><time dateTime={artifact.receipt.savedAt}>{artifact.receipt.savedAt}</time></p> : null}
            <div className={styles.actions}><button type="button" disabled={artifact.status === 'saved' || pending || running || Boolean(runtime.readError) || operation?.status === 'failed'} onClick={() => void runtime.execute(session.id, { kind: 'approve', artifactId: artifact.id, version: artifact.version, commandId: crypto.randomUUID() })}><Save size={15} aria-hidden="true" />{artifact.status === 'saved' ? '已保存' : '确认并保存到本机'}</button><button type="button" onClick={() => download(artifact)}><Download size={15} aria-hidden="true" />下载 {artifact.fileName.split('.').pop()?.toLocaleUpperCase('en-US')}</button></div>
            {downloadError ? <p role="alert">{downloadError}</p> : null}
          </footer>
        </aside> : null}
      </div>
    </section>
  );
}
