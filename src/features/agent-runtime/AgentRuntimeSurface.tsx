import { ArrowLeft, Download, FileText, History, LoaderCircle, MessageSquarePlus, RefreshCw, Save, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AgentRuntimeAdapter, RuntimeArtifact, RuntimeScope } from '@contracts/workbuddy/agent-runtime';
import { TeachBuddyAvatar } from '@design-system/TeachBuddyAvatar';
import { WorkspaceComposer } from '@design-system/WorkspaceComposer';
import { createHttpAgentRuntime } from './http-agent-runtime';
import { useAgentRuntime } from './use-agent-runtime';
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
  const [review, setReview] = useState<{ sessionId: string; artifactId: string } | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const followTail = useRef(true);
  const navigationVersion = useRef(0);
  const consumedDraftLocation = useRef('');
  const pending = operation?.status === 'pending';
  const running = session?.status === 'running';
  const draftKey = activeId ?? '';
  const draft = drafts[draftKey] ?? '';
  const artifact = review?.sessionId === activeId ? session?.artifacts.find((item) => item.id === review.artifactId) : undefined;
  const lastTeacherMessage = session ? [...session.events].reverse().find((event) => event.kind === 'teacher_message') : undefined;
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

  function pathFor(id?: string) {
    const [pathname, search = ''] = newTaskPath.split('?');
    const params = new URLSearchParams(search);
    params.delete('session');
    params.delete('workflow');
    if (id) params.set('session', id);
    return `${pathname}${params.size ? `?${params}` : ''}`;
  }

  async function submit() {
    if (!canSend || !draft.trim()) return;
    const text = draft.trim();
    const version = navigationVersion.current;
    const commandId = crypto.randomUUID();
    let id = activeId;
    if (!id) {
      const created = await runtime.create();
      if (!created) return;
      id = created.id;
      if (navigationVersion.current === version) navigate(pathFor(id));
    }
    setDrafts((current) => ({ ...current, [draftKey]: '', [id]: id === draftKey ? '' : current[id] ?? '' }));
    await runtime.execute(id, { kind: 'send', text, commandId });
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
            {!activeId || (session && session.events.length === 0) ? <div className={styles.welcome}><TeachBuddyAvatar size="welcome" /><h2>老师好，有什么能帮您的？</h2><p>教案、练习、测验或课程方案</p><p>当前仅依据您输入的内容，不会自动读取 ClassIn 教学数据。</p></div> : null}
            {activeId && !session && !runtime.readError ? <p role="status">正在恢复会话…</p> : null}
            {session ? <ol className={styles.events} aria-label="会话消息">{session.events.map((event) => <li key={event.id} data-actor={event.actor}>
              <article><header><strong>{event.actor === 'teacher' ? '您' : event.actor === 'agent' ? 'TeachBuddy' : event.title}</strong>{event.actor === 'tool' || event.actor === 'skill' ? <span>{event.state === 'running' ? '执行中' : event.state === 'failed' ? '失败' : '处理记录'}</span> : null}</header><p>{event.summary || event.title}</p></article>
            </li>)}</ol> : null}
            {session?.artifacts.length ? <section className={styles.outputs} aria-label="生成的产物"><h2>生成的产物</h2>{session.artifacts.map((item) => <button key={item.id} type="button" onClick={() => setReview({ sessionId: session.id, artifactId: item.id })}><FileText size={16} aria-hidden="true" /><span>{item.title}</span><small>v{item.version} · {item.status === 'saved' ? '已保存到本机' : '待审阅'}</small></button>)}</section> : null}
            {running || pending || runtime.creation === 'pending' ? <p className={styles.progress} role="status"><LoaderCircle className={styles.spinner} size={16} aria-hidden="true" />{pending && operation.command.kind === 'approve' ? '正在保存产物…' : pending && operation.command.kind === 'cancel' ? '正在停止…' : runtime.creation === 'pending' ? '正在创建会话…' : 'TeachBuddy 正在处理…'}</p> : null}
            {session?.status === 'stopped' ? <p role="status">{session.error || '生成已停止，您可以继续发送要求。'}</p> : null}
            {session?.status === 'failed' ? <div className={styles.error} role="alert"><p>{session.error || '任务未完成，请重试或调整要求。'}</p>{lastTeacherMessage?.state === 'completed' ? <button type="button" disabled={!canSend} onClick={() => void runtime.execute(session.id, { kind: 'send', text: lastTeacherMessage.summary, commandId: crypto.randomUUID() })}>重新发送上一条</button> : <button type="button" onClick={runtime.reconnect}>重新核对会话</button>}</div> : null}
            {runtime.readError ? <div className={styles.error} role="alert"><p>{runtime.readError}</p><button type="button" onClick={runtime.reconnect}>重试恢复会话</button></div> : null}
            {operation?.status === 'failed' && activeId ? <div className={styles.error} role="alert"><p>{operation.error}</p>{operation.command.kind === 'send' ? <p className={styles.plainText}>待确认的消息：{operation.command.text}</p> : null}<button type="button" onClick={() => void runtime.execute(activeId, operation.command)}>重试原请求</button>{operation.rejected ? <button type="button" onClick={() => {
              if (operation.command.kind === 'send') setDrafts((current) => ({ ...current, [activeId]: operation.command.kind === 'send' ? operation.command.text : '' }));
              runtime.dismissRejected(activeId);
              if (operation.command.kind === 'approve') setReview(null);
            }}>{operation.command.kind === 'send' ? '修改消息' : '返回重新审阅'}</button> : null}</div> : null}
            {runtime.createError ? <div className={styles.error} role="alert"><p>{runtime.createError}</p><button type="button" onClick={() => void (draft.trim() && !activeId ? submit() : createSession())}>重试创建会话</button></div> : null}
          </div>
          <div className={styles.composerDock}><WorkspaceComposer ariaLabel="向 TeachBuddy 输入要求" value={draft} onValueChange={(value) => setDrafts((current) => ({ ...current, [draftKey]: value }))} placeholder="告诉我您想完成的教学工作…" submitLabel="发送给 TeachBuddy" onSubmit={() => void submit()} canSubmit={canSend} maxLength={4000} hint="产物保存到本机，不会发布到 ClassIn" secondaryActions={running && activeId ? <button type="button" aria-label="停止生成" title="停止生成" disabled={pending} onClick={() => void runtime.execute(activeId, { kind: 'cancel' })}><Square size={14} aria-hidden="true" />停止</button> : undefined} /></div>
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
