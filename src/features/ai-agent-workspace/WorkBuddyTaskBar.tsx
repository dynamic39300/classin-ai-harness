import { ArrowLeft, ChevronDown, History, LoaderCircle, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { useWorkBuddyExperience } from './workbuddy-experience-context';
import { workBuddyNewTaskPath, workBuddyRuntimeSessionPath } from './workbuddy-experience-profile';
import { useRuntimeTaskHistory } from './use-runtime-task-history';
import styles from './WorkBuddyTaskBar.module.css';

const NEW_TASK_ID = 'new';
const SESSION_PREFIX = 'session:';
const statusLabels = { idle: '等待您的下一步', running: '正在处理', stopped: '已停止', failed: '任务失败' };

function activeTaskId(search: string) {
  const sessionId = new URLSearchParams(search).get('session');
  return sessionId ? `${SESSION_PREFIX}${sessionId}` : NEW_TASK_ID;
}

export function WorkBuddyTaskBar({ showReturnCommand = true, compactReturnTarget }: Readonly<{
  showReturnCommand?: boolean;
  compactReturnTarget?: Readonly<{ label: string; to: string }>;
}>) {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useWorkBuddyExperience();
  const activeId = activeTaskId(location.search);
  const activeSessionId = activeId.startsWith(SESSION_PREFIX) ? activeId.slice(SESSION_PREFIX.length) : null;
  const [openTaskIds, setOpenTaskIds] = useState<readonly string[]>([NEW_TASK_ID]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const history = useRuntimeTaskHistory(profile.id, selectorOpen ? 'selector' : activeSessionId);
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectorOpen) searchRef.current?.focus();
  }, [selectorOpen]);

  const availableIds = openTaskIds.filter((id) => id === NEW_TASK_ID || id.startsWith(SESSION_PREFIX));
  const visibleIds = availableIds.includes(activeId) ? availableIds : [...availableIds, activeId];
  const sessionById = useMemo(() => new Map(history.sessions.map((item) => [item.id, item])), [history.sessions]);
  const tabs = visibleIds.map((id) => ({
    id,
    title: id === NEW_TASK_ID ? '新建任务' : sessionById.get(id.slice(SESSION_PREFIX.length))?.title || '当前会话',
  }));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSessions = history.sessions.filter(({ title }) => !normalizedQuery || title.toLocaleLowerCase().includes(normalizedQuery));

  const pathFor = (id: string) => id === NEW_TASK_ID
    ? workBuddyNewTaskPath(profile)
    : workBuddyRuntimeSessionPath(profile, id.slice(SESSION_PREFIX.length));

  const openTask = (id: string) => {
    setOpenTaskIds((current) => current.includes(id) ? current : [...current, id]);
    setSelectorOpen(false);
    navigate(pathFor(id));
  };

  const closeTab = (id: string) => {
    const remaining = visibleIds.filter((item) => item !== id);
    setOpenTaskIds(remaining);
    if (activeId !== id) return;
    const fallback = remaining.at(-1) ?? NEW_TASK_ID;
    if (remaining.length === 0) setOpenTaskIds([NEW_TASK_ID]);
    navigate(pathFor(fallback));
  };

  const closeSelector = () => {
    setSelectorOpen(false);
    requestAnimationFrame(() => historyButtonRef.current?.focus());
  };

  const returnTarget = showReturnCommand && profile.returnTarget ? profile.returnTarget : compactReturnTarget;

  return (
    <header className={styles.taskBar} aria-label={`${TEACHBUDDY_BRAND.shortName} 任务导航`} data-has-return={returnTarget ? 'true' : undefined}>
      {returnTarget ? <button className={styles.returnButton} type="button" aria-label={returnTarget.label} title={returnTarget.label} onClick={() => navigate(returnTarget.to)}><ArrowLeft aria-hidden="true" size={15} /><span>{returnTarget.label}</span></button> : null}
      <nav className={styles.taskNavigation} aria-label={`已打开的 ${TEACHBUDDY_BRAND.shortName} 任务`}>
        <div className={styles.tabViewport}>
          {tabs.map((tab) => {
            const active = tab.id === activeId;
            return <div className={styles.tabShell} data-active={active} key={tab.id}>
              <button className={styles.tab} type="button" aria-current={active ? 'page' : undefined} title={tab.title} onClick={() => active ? setSelectorOpen((open) => !open) : openTask(tab.id)}>
                <span>{tab.title}</span>{active ? <ChevronDown className={styles.tabChevron} aria-hidden="true" size={14} /> : null}
              </button>
              <div className={styles.tabActions}><button className={styles.closeTab} type="button" aria-label={`关闭任务：${tab.title}`} title="关闭标签" onClick={() => closeTab(tab.id)}><X aria-hidden="true" size={13} /></button></div>
            </div>;
          })}
        </div>
        <div className={styles.taskBarActions}>
          <button className={styles.newTaskButton} type="button" aria-label="添加新任务" title="新建任务" onClick={() => openTask(NEW_TASK_ID)}><Plus aria-hidden="true" size={17} /><span>新建任务</span></button>
          <button ref={historyButtonRef} className={styles.historyButton} type="button" aria-label="历史任务" title="历史任务" aria-haspopup="dialog" aria-expanded={selectorOpen} onClick={() => setSelectorOpen((open) => !open)}><History aria-hidden="true" size={16} /><span>历史任务</span></button>
        </div>
      </nav>

      {selectorOpen ? <>
        <button className={styles.scrim} type="button" aria-label="关闭全部任务选择器" onClick={closeSelector} />
        <section className={styles.selector} role="dialog" aria-label="全部任务选择器" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); closeSelector(); } }}>
          <div className={styles.searchField}><Search aria-hidden="true" size={15} /><input ref={searchRef} aria-label="搜索全部任务" placeholder="搜索任务" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <button className={styles.selectorNewTask} type="button" onClick={() => openTask(NEW_TASK_ID)}><Plus aria-hidden="true" size={16} /><span>新建任务</span></button>
          <div className={styles.selectorHeading}><span>对话任务</span><span>{visibleSessions.length}</span></div>
          <div className={styles.taskList} aria-label="全部任务列表">
            {history.status === 'loading' ? <p className={styles.historyMessage} role="status"><LoaderCircle aria-hidden="true" size={14} />正在加载对话任务…</p> : null}
            {history.status === 'failed' ? <div className={styles.historyError} role="alert"><p>{history.error}</p><button type="button" onClick={history.reload}>重试加载对话任务</button></div> : null}
            {history.status === 'ready' && history.sessions.length === 0 ? <p className={styles.empty}>还没有对话任务</p> : null}
            {visibleSessions.map((item) => <button className={styles.sessionChoice} type="button" key={item.id} title={item.title} aria-current={activeSessionId === item.id ? 'page' : undefined} onClick={() => openTask(`${SESSION_PREFIX}${item.id}`)}><span className={styles.taskTitle}>{item.title || '新会话'}</span><span className={styles.taskTime}>{statusLabels[item.status]}</span></button>)}
            {history.status === 'ready' && history.sessions.length > 0 && visibleSessions.length === 0 ? <p className={styles.empty}>没有匹配的任务</p> : null}
          </div>
        </section>
      </> : null}
    </header>
  );
}
