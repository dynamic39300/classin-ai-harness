import { AlertTriangle, Check, ChevronDown, Circle, LoaderCircle, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { projectAnalysisProcess, type AnalysisContextEvidence, type AnalysisProcessStep } from '@domain/workbuddy/analysis-process';
import styles from './AnalysisProcess.module.css';

type Props = Readonly<{
  session: Pick<RuntimeSession, 'id' | 'status' | 'events'> & Readonly<{ updatedAt?: string }>;
  mode?: 'full' | 'compact';
  context?: AnalysisContextEvidence | null;
}>;

const stateLabels: Record<AnalysisProcessStep['state'], string> = {
  queued: '等待中',
  running: '进行中',
  needs_information: '需要信息',
  completed: '已完成',
  failed: '失败',
  stopped: '已停止',
};

function elapsedLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function statusLabel(status: NonNullable<ReturnType<typeof projectAnalysisProcess>>['status']): string {
  if (status === 'running') return '正在分析';
  if (status === 'needs_information') return '等待补充';
  if (status === 'failed') return '分析未完成';
  if (status === 'stopped') return '分析已停止';
  return '已完成分析';
}

function StepIcon({ state }: Readonly<{ state: AnalysisProcessStep['state'] }>) {
  if (state === 'completed') return <Check size={13} aria-hidden="true" />;
  if (state === 'running') return <LoaderCircle className={styles.spinner} size={13} aria-hidden="true" />;
  if (state === 'failed' || state === 'needs_information') return <AlertTriangle size={13} aria-hidden="true" />;
  if (state === 'stopped') return <Square size={11} aria-hidden="true" />;
  return <Circle size={9} aria-hidden="true" />;
}

export function AnalysisProcess({ session, mode = 'full', context }: Props) {
  const [now, setNow] = useState(Date.now);
  const projection = useMemo(() => projectAnalysisProcess({ session, now, context }), [context, now, session]);
  const [preference, setPreference] = useState<Readonly<{ runRef: string; status: string; expanded: boolean }> | null>(null);

  useEffect(() => {
    if (session.status !== 'running') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.status]);

  if (!projection) return null;
  const expanded = preference?.runRef === projection.runRef && preference.status === projection.status ? preference.expanded : projection.defaultExpanded;
  const visibleSteps = mode === 'compact' && projection.steps.length > 3 ? projection.steps.slice(-3) : projection.steps;
  const currentStep = [...visibleSteps].reverse().find(({ state }) => state === 'running' || state === 'needs_information' || state === 'failed' || state === 'stopped');
  const heading = `${statusLabel(projection.status)} · ${projection.steps.length} 个步骤 · ${elapsedLabel(projection.elapsedMs)}`;

  return (
    <section className={styles.process} data-mode={mode} data-status={projection.status} aria-label="TeachBuddy 分析过程">
      <button className={styles.summary} type="button" aria-expanded={expanded} onClick={() => setPreference({ runRef: projection.runRef, status: projection.status, expanded: !expanded })}>
        <span className={styles.summaryState}><span className={styles.summaryIcon}><StepIcon state={projection.status === 'completed' ? 'completed' : projection.status === 'failed' ? 'failed' : projection.status === 'stopped' ? 'stopped' : 'running'} /></span><strong>{heading}</strong></span>
        <span className={styles.toggleLabel}>{expanded ? '收起' : '展开'}<ChevronDown size={14} aria-hidden="true" /></span>
      </button>
      {expanded ? <ol className={styles.steps} aria-label="分析步骤">
        {visibleSteps.map((step) => <li key={step.id} data-state={step.state}>
          <span className={styles.node}><StepIcon state={step.state} /></span>
          <div className={styles.stepBody}>
            <header><strong>{step.label}</strong><span>{stateLabels[step.state]}</span></header>
            <p>{step.summary}</p>
            {step.evidenceLabels.length ? <div className={styles.evidence} aria-label="使用依据">{step.evidenceLabels.map((label, index) => <span key={`${label}-${index}`}>{label.replaceAll('_', ' ')}</span>)}</div> : null}
            {step.detailLines.length ? <details className={styles.details}><summary>查看执行详情</summary><ul>{step.detailLines.map((line) => <li key={line}>{line}</li>)}</ul></details> : null}
          </div>
        </li>)}
      </ol> : null}
      {currentStep ? <span className={styles.liveStatus} role="status" aria-live="polite" aria-label={`当前步骤：${currentStep.label}`} /> : null}
    </section>
  );
}
