import { Check, ChevronDown, ChevronRight, ChevronUp, Sparkles, X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import type { TeachingDynamicAction, TeachingDynamicItem, TeachingDynamicsSnapshot, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { TEACHBUDDY_IM_ASSISTANT_LABEL } from '@contracts/workbuddy/product-brand';
import { TeachBuddyAvatar } from '@design-system/TeachBuddyAvatar';
import { projectTeachingStage, teachingDynamicsCompactLabel, TEACHING_STAGE_ORDER } from '@domain/workbuddy/teaching-dynamics';
import styles from './TeachingDynamics.module.css';

type Props = Readonly<{
  snapshot: TeachingDynamicsSnapshot | null;
  expanded: boolean;
  selectedStage: TeachingStageId | null;
  loading?: boolean;
  error?: string;
  updatedWhileCompact?: boolean;
  contextPrefix?: string;
  disabled?: boolean;
  isActionDisabled?: (action: TeachingDynamicAction) => boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectedStageChange: (stage: TeachingStageId) => void;
  onAction: (action: TeachingDynamicAction) => void;
  onRetry?: () => void;
  onClose?: () => void;
}>;

function visibleContextLabel(contextLabel: string | undefined, contextPrefix: string | undefined) {
  if (!contextLabel || !contextPrefix) return contextLabel;
  const prefix = `${contextPrefix} · `;
  return contextLabel.startsWith(prefix) ? contextLabel.slice(prefix.length) : contextLabel;
}

function StageItem({ item, contextPrefix, disabled, onAction }: Readonly<{
  item: TeachingDynamicItem;
  contextPrefix?: string;
  disabled: boolean;
  onAction: (action: TeachingDynamicAction) => void;
}>) {
  const contextLabel = visibleContextLabel(item.contextLabel, contextPrefix);
  const copy = <>
    <span className={styles.itemCopy}>
      {contextLabel ? <span className={styles.itemContext}>{contextLabel}</span> : null}
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
      aria-label={`${item.action.label}：${contextLabel ? `${contextLabel}，` : ''}${item.title}`}
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
  contextPrefix,
  disabled = false,
  isActionDisabled,
  onExpandedChange,
  onSelectedStageChange,
  onAction,
  onRetry,
  onClose,
}: Props) {
  const compactLabel = snapshot ? teachingDynamicsCompactLabel(snapshot) : '消息建议暂未就绪';
  const compactSummary = compactLabel.replace(/^教学动态｜/, '');
  const activeStage = selectedStage ?? snapshot?.currentStage ?? 'before';
  const projection = snapshot ? projectTeachingStage(snapshot, activeStage, true) : null;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    if (!expanded && content.contains(document.activeElement)) toggleRef.current?.focus();
    content.toggleAttribute('inert', !expanded);
    if (expanded) content.removeAttribute('aria-hidden');
    else content.setAttribute('aria-hidden', 'true');
  }, [expanded]);

  const selectStage = (stage: TeachingStageId) => {
    onSelectedStageChange(stage);
  };

  return (
    <section
      className={styles.module}
      aria-label={`${TEACHBUDDY_IM_ASSISTANT_LABEL}建议`}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <header className={styles.moduleHeader}>
        <div className={styles.assistantIdentity}>
          <TeachBuddyAvatar size="compact" />
          <div className={styles.assistantCopy}>
            <div className={styles.identityLine}>
              <strong>{TEACHBUDDY_IM_ASSISTANT_LABEL}</strong>
              <span>{compactSummary}</span>
            </div>
            <p>选环节，点一条建议，AI写消息草稿，您确认后发送</p>
          </div>
        </div>
        <div className={styles.moduleActions}>
          {updatedWhileCompact && !expanded ? <span className={styles.updateHint}>有更新</span> : null}
          <button
            className={styles.moduleToggle}
            type="button"
            aria-expanded={expanded}
            aria-controls="teaching-dynamics-content"
            aria-label={expanded ? `收起 ${TEACHBUDDY_IM_ASSISTANT_LABEL}建议` : `展开 ${TEACHBUDDY_IM_ASSISTANT_LABEL}建议`}
            onClick={() => onExpandedChange(!expanded)}
            ref={toggleRef}
          >
            {expanded ? <ChevronUp aria-hidden="true" size={15} /> : <ChevronDown aria-hidden="true" size={15} />}
          </button>
          {onClose ? <button className={styles.closeButton} type="button" aria-label={`关闭 ${TEACHBUDDY_IM_ASSISTANT_LABEL}`} onClick={onClose}><X aria-hidden="true" size={16} /></button> : null}
        </div>
      </header>

      <div
        className={styles.contentReveal}
        data-expanded={expanded ? 'true' : 'false'}
        id="teaching-dynamics-content"
        ref={contentRef}
      >
        <div className={styles.contentRevealInner}>
          <div className={styles.content}>
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
                  const compactStageStatus = stage.actionableCount
                    ? `${stage.actionableCount}条`
                    : stage.items.some(({ kind }) => kind === 'unknown') ? '待核' : '已核';
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
                    <span className={styles.stageDot} aria-hidden="true">
                      <span className={styles.stageLabel}>{stage.label}</span>
                      <span className={styles.stageCount}>{compactStageStatus}</span>
                    </span>
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
                {projection?.items.length ? <div className={styles.items}>{projection.items.map((item) => <StageItem key={item.id} item={item} contextPrefix={contextPrefix} disabled={disabled || Boolean(item.action && isActionDisabled?.(item.action))} onAction={onAction} />)}</div>
                  : <p className={styles.cleared}><Check aria-hidden="true" size={14} />这个阶段当前没有需要处理的事项</p>}
              </section>
            </> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
