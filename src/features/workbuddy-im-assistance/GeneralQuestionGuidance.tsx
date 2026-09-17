import { ArrowUpRight, BookOpenText, CircleHelp, ClipboardCheck, FileChartColumn, MessagesSquare, Presentation, UserRound, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { GeneralQuestion } from '@contracts/workbuddy/general-question-guidance';
import { TEACHBUDDY_IM_ASSISTANT_LABEL } from '@contracts/workbuddy/product-brand';
import styles from './GeneralQuestionGuidance.module.css';

type QuestionActions = Readonly<{ onQuestion: (question: GeneralQuestion) => boolean; disabled: boolean }>;
const GROUP_PRESENTATION = {
  '班级和课程': { shortLabel: '班级课程', Icon: BookOpenText },
  '课堂和学习参与': { shortLabel: '课堂参与', Icon: Presentation },
  '作业和测验': { shortLabel: '作业测验', Icon: ClipboardCheck },
  '某位学生': { shortLabel: '学生情况', Icon: UserRound },
  '报告和沟通': { shortLabel: '报告沟通', Icon: FileChartColumn },
  '对群聊的内容提问': { shortLabel: '群聊内容', Icon: MessagesSquare },
} as const;
type WelcomeState = { phase: 'waiting' | 'visible' | 'leaving' | 'dismissed' };

export function GeneralQuestionWelcome({ questions, onQuestion, disabled, eligible, recommendationsReady }: QuestionActions & {
  questions: readonly GeneralQuestion[];
  eligible: boolean;
  recommendationsReady: boolean;
}) {
  const [state, setState] = useState<WelcomeState>({ phase: 'waiting' });
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Fast recommendations skip the introduction. Once a conversation replaces it,
  // later background reads cannot replay this visit's guide.
  if ((state.phase === 'waiting' && recommendationsReady)
    || (!eligible && (state.phase === 'visible' || state.phase === 'leaving'))) {
    setState({ phase: 'dismissed' });
  }

  useEffect(() => {
    if (state.phase !== 'waiting' || !eligible || recommendationsReady) return;
    const timer = window.setTimeout(() => setState({ phase: 'visible' }), 180);
    return () => window.clearTimeout(timer);
  }, [state.phase, eligible, recommendationsReady]);

  useEffect(() => {
    if (state.phase !== 'visible' || !recommendationsReady || hovered || focused) return;
    // Let the 500ms recommendation reveal settle before withdrawing this entry.
    const timer = window.setTimeout(() => setState({ phase: 'leaving' }), 900);
    return () => window.clearTimeout(timer);
  }, [state, recommendationsReady, hovered, focused]);

  useEffect(() => {
    if (state.phase !== 'leaving') return;
    // Also finish when transitions are disabled or the page is in the background.
    const timer = window.setTimeout(() => setState({ phase: 'dismissed' }), 450);
    return () => window.clearTimeout(timer);
  }, [state.phase]);

  if (!eligible || state.phase === 'waiting' || state.phase === 'dismissed') return null;
  const leaving = state.phase === 'leaving';
  return <div className={styles.welcomeFrame} data-state={state.phase} inert={leaving} aria-hidden={leaving || undefined}
    onTransitionEnd={event => { if (event.target === event.currentTarget && event.propertyName === 'grid-template-rows' && leaving) setState({ phase: 'dismissed' }); }}>
    <div className={styles.welcomeClip}>
      <section className={styles.welcome} aria-label="自由提问引导"
        onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <p>我是您的 {TEACHBUDDY_IM_ASSISTANT_LABEL}，可以帮您了解班级和课程的情况。您可以问：</p>
        <QuestionRows questions={questions} onQuestion={onQuestion} disabled={disabled} entry />
      </section>
    </div>
  </div>;
}

function QuestionRows({ questions, onQuestion, disabled, entry = false }: QuestionActions & { questions: readonly GeneralQuestion[]; entry?: boolean }) {
  return <ul className={`${styles.questions} ${entry ? styles.entryQuestions : ''}`}>{questions.map((question, index) => <li key={question.id}><button type="button" disabled={disabled} onClick={() => onQuestion(question)} data-question-id={question.id}>
    {entry ? <span className={styles.questionNumber} aria-hidden="true">{index + 1}</span> : null}
    <span className={styles.questionText}>{question.text}</span><ArrowUpRight aria-hidden="true" size={16} />
  </button></li>)}</ul>;
}

export function GeneralQuestionHelp({ groups, onQuestion, disabled, availableHeight, loading = false, error = '', onRetry }: QuestionActions & {
  groups: readonly Readonly<{ label: string; questions: readonly GeneralQuestion[] }>[];
  availableHeight: number;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(groups[0]?.label ?? '');
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const scrollPosition = useRef(0);
  const activated = useRef(new Set<string>());
  const id = useId();
  const selectedGroup = groups.find(group => group.label === selectedLabel) ?? groups[0];
  useEffect(() => {
    if (!open) return;
    activated.current.clear();
    if (scroll.current) scroll.current.scrollTop = scrollPosition.current;
    ref.current?.querySelector<HTMLButtonElement>('[data-question-id]')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  return <div className={styles.helpDock} ref={ref}>
    {open ? <section id={id} role="region" aria-label="通用问题" className={styles.help} style={{ height: Math.max(180, Math.min(252, availableHeight)) }}>
      <div className={styles.helpNavigation}>
      {groups.length ? <nav className={styles.groupRail} aria-label="问题分类">
        {groups.map(group => {
          const presentation = GROUP_PRESENTATION[group.label as keyof typeof GROUP_PRESENTATION];
          const Icon = presentation?.Icon ?? CircleHelp;
          return <button key={group.label} type="button" aria-pressed={group.label === selectedGroup?.label} onClick={() => {
            setSelectedLabel(group.label);
            scrollPosition.current = 0;
            if (scroll.current) scroll.current.scrollTop = 0;
          }}>
            <span><Icon aria-hidden="true" size={17} /></span>
            <small>{presentation?.shortLabel ?? group.label}</small>
          </button>;
        })}
      </nav> : null}
      <button className={styles.helpClose} type="button" aria-label="关闭提问帮助" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X aria-hidden="true" size={16} /></button>
      </div>
      {loading && groups.length ? <p className={styles.catalogStatus} role="status">正在读取更多问题，可先询问班级和课程。</p> : null}
      {error ? <div className={styles.catalogStatus} role="status"><span>更多问题暂未加载，可先询问班级和课程。</span>{onRetry ? <button type="button" onClick={onRetry} disabled={loading}>重新读取问题</button> : null}</div> : null}
      <div className={styles.helpScroll} ref={scroll} onScroll={event => { scrollPosition.current = event.currentTarget.scrollTop; }}>
        {selectedGroup ? <section key={selectedGroup.label} aria-label={selectedGroup.label}><QuestionRows questions={selectedGroup.questions} disabled={disabled} onQuestion={question => {
          if (activated.current.has(question.id)) return false;
          activated.current.add(question.id);
          const accepted = onQuestion(question);
          if (accepted) setOpen(false); else activated.current.delete(question.id);
          return accepted;
        }} /></section> : <p className={styles.empty}>{loading ? '正在读取本班可提问内容…' : '暂未取得本班可用的问题内容，您仍可直接输入。'}</p>}
      </div>
    </section> : null}
    <button ref={trigger} className={styles.helpTrigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><CircleHelp aria-hidden="true" size={14} />可以问什么</button>
  </div>;
}
