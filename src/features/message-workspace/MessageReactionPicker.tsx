import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MESSAGE_UNICODE_EMOJI, type MessageUnicodeEmoji } from '@domain/message/message-emoji';
import type { MessageReactionEmoji } from '@domain/message/im2-basic';
import styles from './MessageMediaSurfaces.module.css';

type MessageReactionPickerProps = Readonly<{
  anchor: HTMLButtonElement;
  selectedEmoji: ReadonlySet<MessageReactionEmoji>;
  onSelect: (emoji: MessageUnicodeEmoji) => void;
  onDismiss: (restoreFocus: boolean) => void;
}>;

type PickerPosition = Readonly<{ top: number; left: number }>;

const PICKER_WIDTH = 320;
const PICKER_HEIGHT = 236;
const VIEWPORT_GUTTER = 12;

function getPickerPosition(anchor: HTMLButtonElement): PickerPosition {
  const rect = anchor.getBoundingClientRect();
  const availableWidth = Math.min(PICKER_WIDTH, window.innerWidth - (2 * VIEWPORT_GUTTER));
  const left = Math.min(
    Math.max(VIEWPORT_GUTTER, rect.right - availableWidth),
    Math.max(VIEWPORT_GUTTER, window.innerWidth - availableWidth - VIEWPORT_GUTTER),
  );
  const below = rect.bottom + 8;
  const top = below + PICKER_HEIGHT <= window.innerHeight - VIEWPORT_GUTTER
    ? below
    : Math.max(VIEWPORT_GUTTER, rect.top - PICKER_HEIGHT - 8);
  return Object.freeze({ top, left });
}

export function MessageReactionPicker({ anchor, selectedEmoji, onSelect, onDismiss }: MessageReactionPickerProps) {
  const surfaceRef = useRef<HTMLElement>(null);
  const firstEmojiRef = useRef<HTMLButtonElement>(null);
  const position = getPickerPosition(anchor);

  useLayoutEffect(() => {
    firstEmojiRef.current?.focus({ preventScroll: true });
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || surfaceRef.current?.contains(target) || anchor.contains(target)) return;
      onDismiss(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onDismiss(true);
    };
    const dismissForViewportChange = () => onDismiss(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', dismissForViewportChange);
    window.addEventListener('scroll', dismissForViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', dismissForViewportChange);
      window.removeEventListener('scroll', dismissForViewportChange, true);
    };
  }, [anchor, onDismiss]);

  const style = { '--reaction-picker-top': `${position.top}px`, '--reaction-picker-left': `${position.left}px` } as CSSProperties;

  return createPortal(
    <section className={`${styles.popover} ${styles.reactionPopover}`} style={style} ref={surfaceRef} role="dialog" aria-label="添加表情回应">
      <header className={styles.popoverHeader}>
        <strong>添加表情回应</strong>
        <button type="button" aria-label="关闭表情回应面板" onClick={() => onDismiss(true)}><X aria-hidden="true" size={14} />关闭</button>
      </header>
      <div className={`${styles.assetGrid} ${styles.reactionAssetGrid}`} role="group" aria-label="可选表情">
        {MESSAGE_UNICODE_EMOJI.map((emoji, index) => (
          <div className={styles.assetItem} key={emoji}>
            <button
              className={styles.assetButton}
              data-selected={selectedEmoji.has(emoji)}
              type="button"
              aria-label={`用 ${emoji} 回应`}
              aria-pressed={selectedEmoji.has(emoji)}
              ref={index === 0 ? firstEmojiRef : undefined}
              onClick={() => onSelect(emoji)}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          </div>
        ))}
      </div>
    </section>,
    document.body,
  );
}
