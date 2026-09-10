import { Check, ChevronDown, ChevronRight, Pause, Play, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TeachingDynamicAction, TeachingDynamicItem, TeachingDynamicsSnapshot, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { projectTeachingStage, teachingDynamicsCompactLabel, TEACHING_STAGE_ORDER } from '@domain/workbuddy/teaching-dynamics';
import styles from './TeachingDynamics.module.css';

type Props = Readonly<{
  snapshot: TeachingDynamicsSnapshot | null;
  expanded: boolean;
  selectedStage: TeachingStageId | null;
  autoRotate: boolean;
  loading?: boolean;
  error?: string;
  updatedWhileCompact?: boolean;
  disabled?: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectedStageChange: (stage: TeachingStageId) => void;
  onAutoRotateChange: (autoRotate: boolean) => void;
  onAction: (action: TeachingDynamicAction) => void;
  onRetry?: () => void;
}>;

function StageItem({ item, disabled, onAction }: Readonly<{
  item: TeachingDynamicItem;
  disabled: boolean;
  onAction: (action: TeachingDynamicAction) => void;
}>) {
  const copy = <>
    <span className={styles.itemCopy}>
      {item.contextLabel ? <span className={styles.itemContext}>{item.contextLabel}</span> : null}
      <strong>{item.title}</strong>
      <span className={styles.itemDetail}>{item.detail}</span>
    </span>
    {item.action ? <span className={styles.itemAction} aria-hidden="true">
      <Sparkles size={12} />{item.action.label}<ChevronRight size={12} />
    </span> : <span className={styles.itemStatus}><Check size={12} aria-hidden="true" />已了解</span>}
  </>;

  if (item.action) {
    return <button
      className={styles.item}
      type="button"
      disabled={disabled}
      aria-label={`${item.action.label}：${item.contextLabel ? `${item.contextLabel}，` : ''}${item.title}`}
      onClick={() => onAction(item.action!)}
    >{copy}</button>;
  }
  return <article className={styles.item} data-kind={item.kind}>{copy}</article>;
}

export function TeachingDynamics({
  snapshot,
  expanded,
  selectedStage,
  autoRotate,
  loading = false,
  error = '',
  updatedWhileCompact = false,
  disabled = false,
  onExpandedChange,
  onSelectedStageChange,
  onAutoRotateChange,
  onAction,
  onRetry,
}: Props) {
  const compactLabel = snapshot ? teachingDynamicsCompactLabel(snapshot) : '教学动态';
  const activeStage = selectedStage ?? snapshot?.currentStage ?? 'before';
  const projection = snapshot ? projectTeachingStage(snapshot, activeStage, true) : null;
  const [interactionPaused, setInteractionPaused] = useState(false);
  const reducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotating = expanded && autoRotate && !interactionPaused && !reducedMotion && Boolean(snapshot);
  const rotateLabel = reducedMotion
    ? '已按系统设置关闭自动切换'
    : autoRotate ? '暂停自动切换' : '继续自动切换';

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = window.setInterval(() => {
      const currentIndex = TEACHING_STAGE_ORDER.indexOf(activeStage);
      onSelectedStageChange(TEACHING_STAGE_ORDER[(currentIndex + 1) % TEACHING_STAGE_ORDER.length] ?? 'before');
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [activeStage, onSelectedStageChange, rotating]);

  const selectStage = (stage: TeachingStageId) => {
    onSelectedStageChange(stage);
    onAutoRotateChange(false);
  };

  return (
    <section
      className={styles.module}
      aria-label="教学动态"
      data-expanded={expanded ? 'true' : 'false'}
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={(event) => {
        setInteractionPaused(true);
        const target = event.target;
        if (target instanceof HTMLElement && target.closest(`.${styles.rotateToggle}`)) return;
        if (autoRotate) onAutoRotateChange(false);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
      }}
    >
      <div className={styles.moduleHeader}>
        <button
          className={styles.moduleToggle}
          type="button"
          aria-expanded={expanded}
          aria-controls="teaching-dynamics-content"
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className={styles.moduleTitle}>{expanded ? '教学动态' : compactLabel}</span>
          {updatedWhileCompact && !expanded ? <span className={styles.updateHint}>有更新</span> : null}
          {expanded ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
        </button>
        {expanded && snapshot ? <button
          className={styles.rotateToggle}
          type="button"
          aria-label={rotateLabel}
          title={rotateLabel}
          disabled={reducedMotion}
          onClick={() => onAutoRotateChange(!autoRotate)}
        >{autoRotate && !reducedMotion ? <Pause aria-hidden="true" size={13} /> : <Play aria-hidden="true" size={13} />}</button> : null}
      </div>

      {expanded ? <div id="teaching-dynamics-content" className={styles.content}>
        {loading && !snapshot ? <p className={styles.feedback} role="status">正在读取当前教学进度…</p> : null}
        {error ? <div className={styles.error} role="alert"><span>{error}</span>{onRetry ? <button type="button" onClick={onRetry}>重试</button> : null}</div> : null}
        {snapshot ? <>
          <div className={styles.stageTabs} role="tablist" aria-label="教学阶段" onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
            event.preventDefault();
            const currentIndex = TEACHING_STAGE_ORDER.indexOf(activeStage);
            const nextIndex = event.key === 'Home' ? 0
              : event.key === 'End' ? TEACHING_STAGE_ORDER.length - 1
                : event.key === 'ArrowLeft' ? (currentIndex - 1 + TEACHING_STAGE_ORDER.length) % TEACHING_STAGE_ORDER.length
                  : (currentIndex + 1) % TEACHING_STAGE_ORDER.length;
            const nextStage = TEACHING_STAGE_ORDER[nextIndex] ?? 'before';
            selectStage(nextStage);
            window.requestAnimationFrame(() => document.getElementById(`teaching-stage-tab-${nextStage}`)?.focus());
          }}>
            {TEACHING_STAGE_ORDER.map((stageId, index) => {
              const stage = projectTeachingStage(snapshot, stageId, true);
              const selected = activeStage === stageId;
              const current = snapshot.currentStage === stageId;
              return <button
                className={styles.stageTab}
                data-current={current ? 'true' : 'false'}
                type="button"
                role="tab"
                id={`teaching-stage-tab-${stageId}`}
                aria-controls={`teaching-stage-panel-${stageId}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                key={stageId}
                onClick={() => selectStage(stageId)}
              >
                <span className={styles.stageDot} aria-hidden="true">{index + 1}</span>
                <span className={styles.stageLabel}>{stage.label}</span>
                <span className={styles.stageCount}>{stage.actionableCount ? `建议 ${stage.actionableCount} 条` : stage.items.some(({ kind }) => kind === 'unknown') ? '待核对' : '已核对'}</span>
              </button>;
            })}
          </div>

          <section
            className={styles.stageCard}
            role="tabpanel"
            aria-live={autoRotate ? 'off' : 'polite'}
            id={`teaching-stage-panel-${activeStage}`}
            aria-labelledby={`teaching-stage-tab-${activeStage}`}
            key={activeStage}
          >
            <header className={styles.stageCardHeader}>
              <div><strong>{projection?.label}</strong><span>当前班级的课程、学生与任务</span></div>
              {snapshot.currentStage === activeStage ? <span className={styles.currentBadge}>当前阶段</span> : null}
            </header>
            {projection?.items.length ? <div className={styles.items}>{projection.items.map((item) => <StageItem key={item.id} item={item} disabled={disabled} onAction={onAction} />)}</div>
              : <p className={styles.cleared}><Check aria-hidden="true" size={14} />这个阶段当前没有需要处理的事项</p>}
          </section>
        </> : null}
      </div> : null}
    </section>
  );
}
