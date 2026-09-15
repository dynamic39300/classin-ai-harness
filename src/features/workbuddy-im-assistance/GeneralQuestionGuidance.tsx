import { ArrowUpRight, BookOpenText, CircleHelp, ClipboardCheck, FileChartColumn, MessagesSquare, Presentation, UserRound, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { GeneralQuestion } from '@contracts/workbuddy/general-question-guidance';
import styles from './GeneralQuestionGuidance.module.css';

type QuestionActions = Readonly<{ onQuestion: (question: GeneralQuestion) => boolean; disabled: boolean; hint: string }>;
const GROUP_PRESENTATION = {
  '班级和课程': { shortLabel: '班级课程', Icon: BookOpenText },
  '课堂和学习参与': { shortLabel: '课堂参与', Icon: Presentation },
  '作业和测验': { shortLabel: '作业测验', Icon: ClipboardCheck },
  '某位学生': { shortLabel: '学生情况', Icon: UserRound },
  '报告和沟通': { shortLabel: '报告沟通', Icon: FileChartColumn },
  '对群聊的内容提问': { shortLabel: '群聊内容', Icon: MessagesSquare },
} as const;
export function GeneralQuestionWelcome({ questions, onQuestion, disabled, hint }: QuestionActions & { questions: readonly GeneralQuestion[] }) {
  return <section className={styles.welcome} aria-label="自由提问引导">
    <p>也可以问本班课程和学生情况，整理群聊、讲解题目，或帮您写回复</p>
    {questions.length ? <><small>{hint}</small><QuestionRows questions={questions} onQuestion={onQuestion} disabled={disabled} /></> : null}
  </section>;
}

function QuestionRows({ questions, onQuestion, disabled }: Omit<QuestionActions, 'hint'> & { questions: readonly GeneralQuestion[] }) {
  return <ul className={styles.questions}>{questions.map(question => <li key={question.id}><button type="button" disabled={disabled} onClick={() => onQuestion(question)} data-question-id={question.id}><span>{question.text}</span><ArrowUpRight aria-hidden="true" size={16} /></button></li>)}</ul>;
}

export function GeneralQuestionHelp({ groups, onQuestion, disabled, availableHeight }: QuestionActions & {
  groups: readonly Readonly<{ label: string; questions: readonly GeneralQuestion[] }>[];
  availableHeight: number;
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
    {open ? <section id={id} role="region" aria-label="通用问题" className={styles.help} style={{ height: Math.max(180, Math.min(300, availableHeight)) }}>
      <header><strong>试着问我</strong><button type="button" aria-label="关闭提问帮助" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X aria-hidden="true" size={16} /></button></header>
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
      <div className={styles.helpScroll} ref={scroll} onScroll={event => { scrollPosition.current = event.currentTarget.scrollTop; }}>
        {selectedGroup ? <section key={selectedGroup.label} aria-label={selectedGroup.label}><QuestionRows questions={selectedGroup.questions} disabled={disabled} onQuestion={question => {
          if (activated.current.has(question.id)) return false;
          activated.current.add(question.id);
          const accepted = onQuestion(question);
          if (accepted) setOpen(false); else activated.current.delete(question.id);
          return accepted;
        }} /></section> : <p className={styles.empty}>暂未取得本班可用的问题内容，您仍可直接输入。</p>}
      </div>
    </section> : null}
    <button ref={trigger} className={styles.helpTrigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><CircleHelp aria-hidden="true" size={14} />可以问什么</button>
  </div>;
}
