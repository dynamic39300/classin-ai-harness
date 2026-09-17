import { Check, ChevronDown, ChevronRight, ChevronUp, LoaderCircle, Sparkles, X } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import type { TeachingDynamicAction, TeachingDynamicItem, TeachingDynamicsSnapshot, TeachingStageId } from '@contracts/workbuddy/teaching-dynamics';
import { TEACHBUDDY_IM_ASSISTANT_LABEL } from '@contracts/workbuddy/product-brand';
import { TeachBuddyAvatar } from '@design-system/TeachBuddyAvatar';
import { projectTeachingStage, teachingDynamicsCompactLabel, TEACHING_STAGE_EMPTY_LABELS, TEACHING_STAGE_LABELS, TEACHING_STAGE_ORDER } from '@domain/workbuddy/teaching-dynamics';
import styles from './TeachingDynamics.module.css';

type Props = Readonly<{
  snapshot: TeachingDynamicsSnapshot | null;
  expanded: boolean;
  selectedStage: TeachingStageId | null;
  loading?: boolean;
  slow?: boolean;
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
  const informational = item.stage === 'during' && !item.action;
  const copy = <>
    <span className={styles.itemCopy}>
      {contextLabel ? <span className={styles.itemContext}>{contextLabel}</span> : null}
      <strong>{item.title}</strong>
      <span className={styles.itemDetail}>{item.detail}</span>
    </span>
    {item.action ? <span className={styles.itemAction} aria-hidden="true">
      <Sparkles size={12} />{item.action.label}<ChevronRight size={12} />
    </span> : informational ? null : <span className={styles.itemStatus}><Check size={12} aria-hidden="true" />{item.kind === 'confirmation' ? '无需处理' : '仅供查看'}</span>}
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
  return <article className={`${styles.item} ${informational ? styles.notice : ''}`} data-kind={item.kind}>{copy}</article>;
}

export function TeachingDynamics({
  snapshot,
  expanded,
  selectedStage,
  loading = false,
  slow = false,
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
  const unavailable = Boolean(error && !snapshot && !loading);
  const compactLabel = snapshot ? teachingDynamicsCompactLabel(snapshot) : loading ? '正在整理建议…' : '教学建议暂不可用';
  const compactSummary = compactLabel.replace(/^教学动态｜/, '').replace(/(\d+)\s*项建议/u, '$1项');
  const contentExpanded = expanded && !unavailable;
  const activeStage = selectedStage ?? snapshot?.currentStage ?? 'before';
  const projection = snapshot ? projectTeachingStage(snapshot, activeStage, true) : null;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const previousContentHeight = useRef<number | null>(null);
  const previousSnapshot = useRef(snapshot);

  useLayoutEffect(() => {
    const frame = resizeRef.current;
    const content = frame?.firstElementChild;
    if (!frame || !(content instanceof HTMLElement)) return;
    const firstReady = Boolean(snapshot && !previousSnapshot.current);
    const from = previousContentHeight.current;
    previousSnapshot.current = snapshot;
    const measure = () => { previousContentHeight.current = content.getBoundingClientRect().height; };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(content);
    const animations: Animation[] = [];
    if (firstReady && contentExpanded && from && frame.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const options = { duration: 500, easing: getComputedStyle(frame).getPropertyValue('--ease-out').trim() || 'ease-out' };
      animations.push(frame.animate([{ height: `${from}px` }, { height: `${previousContentHeight.current}px` }], options));
      animations.push(content.animate([{ opacity: 0 }, { opacity: 1 }], options));
    }
    return () => { observer?.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [snapshot, contentExpanded]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    if (!contentExpanded && content.contains(document.activeElement)) toggleRef.current?.focus();
    content.toggleAttribute('inert', !contentExpanded);
    if (contentExpanded) content.removeAttribute('aria-hidden');
    else content.setAttribute('aria-hidden', 'true');
  }, [contentExpanded]);

  const selectStage = (stage: TeachingStageId) => {
    onSelectedStageChange(stage);
  };

  const identity = <span className={styles.assistantIdentity}>
    <TeachBuddyAvatar size="compact" />
    <span className={styles.assistantCopy}>
      <span className={styles.identityLine}>
        <strong>{TEACHBUDDY_IM_ASSISTANT_LABEL}</strong>
      </span>
      <span className={styles.assistantHint}>
        <span className={styles.loadSummary} role="status">
          {loading ? <LoaderCircle size={12} aria-hidden="true" className={styles.loadingIcon} /> : null}
          {compactSummary}{snapshot && loading ? ' · 更新中' : snapshot && error ? ' · 更新失败' : ''}
        </span>
        <span aria-hidden="true">｜</span>
        {unavailable ? '您仍可直接提问' : loading && !snapshot
        ? slow ? '读取时间较长，您可以先提问' : '正在整理本班教学建议，您可以先提问'
        : '选一条建议，AI写消息，您确认后发送'}</span>
    </span>
  </span>;

  return (
    <section
      className={styles.module}
      aria-label={`${TEACHBUDDY_IM_ASSISTANT_LABEL}建议`}
      data-expanded={contentExpanded ? 'true' : 'false'}
      data-load-state={unavailable ? 'failed' : loading ? snapshot ? 'refreshing' : 'loading' : error ? 'stale' : 'ready'}
    >
      <header className={styles.moduleHeader}>
        {unavailable ? <div className={styles.unavailableHeader}>{identity}<button type="button" className={styles.retryButton} onClick={onRetry}>重试</button></div> : <button
          className={styles.moduleToggle}
          type="button"
          aria-expanded={expanded}
          aria-controls="teaching-dynamics-content"
          aria-label={expanded ? `收起 ${TEACHBUDDY_IM_ASSISTANT_LABEL}建议` : `展开 ${TEACHBUDDY_IM_ASSISTANT_LABEL}建议`}
          onClick={() => onExpandedChange(!expanded)}
          ref={toggleRef}
        >
          {identity}
          <span className={styles.moduleActions}>
            {updatedWhileCompact && !expanded ? <span className={styles.updateHint}>有更新</span> : null}
            <span className={styles.toggleIcon}>
              {expanded ? <ChevronUp aria-hidden="true" size={15} /> : <ChevronDown aria-hidden="true" size={15} />}
            </span>
          </span>
        </button>}
        {onClose ? <button className={styles.closeButton} type="button" aria-label={`关闭 ${TEACHBUDDY_IM_ASSISTANT_LABEL}`} onClick={onClose}><X aria-hidden="true" size={16} /></button> : null}
      </header>

      <div
        className={styles.contentReveal}
        data-expanded={contentExpanded ? 'true' : 'false'}
        id="teaching-dynamics-content"
        ref={contentRef}
      >
        <div className={styles.contentRevealInner}>
          <div className={styles.contentResize} ref={resizeRef}>
          <div className={styles.content}>
            {loading && !snapshot ? <div className={styles.skeleton} aria-hidden="true">
              <div className={styles.stageTabs}>{TEACHING_STAGE_ORDER.map(stage => <div className={styles.stageTab} key={stage}><span className={styles.stageDot}><span className={styles.stageLabel}>{TEACHING_STAGE_LABELS[stage]}</span><span className={`${styles.skeletonBar} ${styles.skeletonCount}`} /></span></div>)}</div>
              <div className={`${styles.stageCard} ${styles.skeletonCard}`}><span className={styles.skeletonBar} /><span className={styles.skeletonBar} /></div>
            </div> : null}
            {error && snapshot ? <div className={styles.error} role="alert"><span>建议尚未更新：{error}</span>{onRetry ? <button type="button" onClick={onRetry} disabled={loading}>重试</button> : null}</div> : null}
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
                    : stage.items.some(({ kind }) => kind === 'unknown') ? '待核对' : stageId === 'during' && !stage.items.length ? '暂无课堂' : '已核对';
                  const compactStageStatus = stage.actionableCount
                    ? `${stage.actionableCount}条`
                    : stage.items.some(({ kind }) => kind === 'unknown') ? '待核' : stageId === 'during' && !stage.items.length ? '暂无' : '已核';
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
                className={`${styles.stageCard} ${activeStage === 'during' && !projection?.items.some(item => item.action) ? styles.stageNotice : ''}`}
                role="tabpanel"
                aria-live="polite"
                id={`teaching-stage-panel-${activeStage}`}
                aria-labelledby={`teaching-stage-tab-${activeStage}`}
                key={activeStage}
              >
                {projection?.items.length ? <div className={styles.items}>{projection.items.map((item) => <StageItem key={item.id} item={item} contextPrefix={contextPrefix} disabled={disabled || Boolean(item.action && isActionDisabled?.(item.action))} onAction={onAction} />)}</div>
                  : <p className={styles.cleared}>{activeStage !== 'during' ? <Check aria-hidden="true" size={14} /> : null}{TEACHING_STAGE_EMPTY_LABELS[activeStage]}</p>}
              </section>
            </> : null}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
