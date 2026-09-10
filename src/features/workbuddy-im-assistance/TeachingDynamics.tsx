import { AlertCircle, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type { TeachingDynamicAction, TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { projectTeachingPrompts, teachingDynamicsCompactLabel } from '@domain/workbuddy/teaching-dynamics';
import styles from './TeachingDynamics.module.css';

type Props = Readonly<{
  snapshot: TeachingDynamicsSnapshot | null;
  expanded: boolean;
  loading?: boolean;
  error?: string;
  updatedWhileCompact?: boolean;
  disabled?: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onAction: (action: TeachingDynamicAction) => void;
  onRetry?: () => void;
}>;

export function TeachingDynamics({
  snapshot,
  expanded,
  loading = false,
  error = '',
  updatedWhileCompact = false,
  disabled = false,
  onExpandedChange,
  onAction,
  onRetry,
}: Props) {
  const compactLabel = snapshot ? teachingDynamicsCompactLabel(snapshot) : '教学动态';
  const prompts = snapshot ? projectTeachingPrompts(snapshot) : [];
  const fallback = snapshot?.stages.flatMap(({ items }) => items)[0];

  return (
    <section className={styles.module} aria-label="教学动态" data-expanded={expanded ? 'true' : 'false'}>
      <button
        className={styles.moduleToggle}
        type="button"
        aria-expanded={expanded}
        aria-controls="teaching-dynamics-content"
        onClick={() => onExpandedChange(!expanded)}
      >
        <span className={styles.moduleTitle}>{expanded ? '教学动态' : compactLabel}</span>
        {expanded && prompts.length ? <span className={styles.promptCount}>{prompts.length} 项建议</span> : null}
        {updatedWhileCompact && !expanded ? <span className={styles.updateHint}>有更新</span> : null}
        {expanded ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
      </button>

      {expanded ? <div id="teaching-dynamics-content" className={styles.content}>
        <p className={styles.introduction}>点一下，TeachBuddy 帮你起草要说的话</p>
        {loading && !snapshot ? <p className={styles.feedback} role="status">正在读取当前教学进度…</p> : null}
        {error ? <div className={styles.error} role="alert"><span>{error}</span>{onRetry ? <button type="button" onClick={onRetry}>重试</button> : null}</div> : null}
        {prompts.length ? <div className={styles.promptGrid}>{prompts.map((item) => <button
          className={styles.promptCard}
          type="button"
          key={item.id}
          disabled={disabled}
          aria-label={`${item.action!.label}：${item.contextLabel ? `${item.contextLabel}，` : ''}${item.title}`}
          onClick={() => onAction(item.action!)}
        >
          <span className={styles.promptContext}>{item.contextLabel}</span>
          <strong>{item.title}</strong>
          <span className={styles.promptAction}><Sparkles aria-hidden="true" size={12} />{item.action!.label}<ChevronRight aria-hidden="true" size={12} /></span>
        </button>)}</div> : fallback ? <p className={styles.cleared}>{fallback.kind === 'unknown' ? <AlertCircle aria-hidden="true" size={13} /> : <Check aria-hidden="true" size={13} />}{fallback.title}</p> : null}
      </div> : null}
    </section>
  );
}
