import { Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import type { TeachingDynamicAction, TeachingDynamicItem, TeachingDynamicsSnapshot, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { projectTeachingStage, teachingDynamicsCompactLabel, TEACHING_STAGE_ORDER } from '@domain/workbuddy/teaching-dynamics';
import styles from './TeachingDynamics.module.css';

type Props = Readonly<{
  snapshot: TeachingDynamicsSnapshot | null;
  expanded: boolean;
  selectedStage: TeachingStageId | null;
  loading?: boolean;
  error?: string;
  updatedWhileCompact?: boolean;
  disabled?: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectedStageChange: (stage: TeachingStageId) => void;
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
  loading = false,
  error = '',
  updatedWhileCompact = false,
  disabled = false,
  onExpandedChange,
  onSelectedStageChange,
  onAction,
  onRetry,
}: Props) {
  const compactLabel = snapshot ? teachingDynamicsCompactLabel(snapshot) : '教学动态';
  const activeStage = selectedStage ?? snapshot?.currentStage ?? 'before';
  const projection = snapshot ? projectTeachingStage(snapshot, activeStage, true) : null;

  const selectStage = (stage: TeachingStageId) => {
    onSelectedStageChange(stage);
  };

  return (
    <section
      className={styles.module}
      aria-label="教学动态"
      data-expanded={expanded ? 'true' : 'false'}
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
            {TEACHING_STAGE_ORDER.map((stageId) => {
              const stage = projectTeachingStage(snapshot, stageId, true);
              const selected = activeStage === stageId;
              const current = snapshot.currentStage === stageId;
              const stageStatus = stage.actionableCount
                ? `建议 ${stage.actionableCount} 条`
                : stage.items.some(({ kind }) => kind === 'unknown') ? '待核对' : '已核对';
              return <button
                className={styles.stageTab}
                data-current={current ? 'true' : 'false'}
                type="button"
                role="tab"
                id={`teaching-stage-tab-${stageId}`}
                aria-controls={`teaching-stage-panel-${stageId}`}
                aria-selected={selected}
                aria-label={`${stage.label}${current ? '，当前阶段' : ''}，${stageStatus}`}
                tabIndex={selected ? 0 : -1}
                key={stageId}
                onClick={() => selectStage(stageId)}
              >
                <span className={styles.stageDot} aria-hidden="true">{stage.label}</span>
                <span className={styles.stageCount} aria-hidden="true">{stageStatus}</span>
              </button>;
            })}
          </div>

          <section
            className={styles.stageCard}
            role="tabpanel"
            aria-live="polite"
            id={`teaching-stage-panel-${activeStage}`}
            aria-labelledby={`teaching-stage-tab-${activeStage}`}
            key={activeStage}
          >
            {projection?.items.length ? <div className={styles.items}>{projection.items.map((item) => <StageItem key={item.id} item={item} disabled={disabled} onAction={onAction} />)}</div>
              : <p className={styles.cleared}><Check aria-hidden="true" size={14} />这个阶段当前没有需要处理的事项</p>}
          </section>
        </> : null}
      </div> : null}
    </section>
  );
}
