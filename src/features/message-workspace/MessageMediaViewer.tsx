import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MessageMediaAttachment } from '@domain/message/message-media';
import styles from './MessageMediaSurfaces.module.css';

type MessageMediaViewerProps = Readonly<{
  attachments: readonly MessageMediaAttachment[];
  initialIndex: number;
  resolveContent: (contentRef: string) => string | null;
  onClose: () => void;
}>;

export function MessageMediaViewer({ attachments, initialIndex, resolveContent, onClose }: MessageMediaViewerProps) {
  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, attachments.length - 1)));
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const attachment = attachments[index];
  const contentUrl = attachment ? resolveContent(attachment.contentRef) : null;
  const posterUrl = attachment?.posterRef ? resolveContent(attachment.posterRef) ?? undefined : undefined;
  const move = (delta: number) => {
    setFailed(false);
    setIndex((value) => (value + delta + attachments.length) % attachments.length);
  };

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && attachments.length > 1) { setFailed(false); setIndex((value) => (value - 1 + attachments.length) % attachments.length); }
      if (event.key === 'ArrowRight' && attachments.length > 1) { setFailed(false); setIndex((value) => (value + 1) % attachments.length); }
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])') ?? []);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachments.length, onClose]);

  if (!attachment) return null;
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className={styles.viewer} role="dialog" aria-modal="true" aria-label="媒体查看器">
        <header className={styles.dialogHeader}><span><strong>{attachment.name}</strong><small>{index + 1} / {attachments.length}</small></span><button type="button" ref={closeRef} onClick={onClose}><X aria-hidden="true" size={15} />关闭</button></header>
        <div className={styles.viewerBody}>
          {failed || !contentUrl ? <div className={styles.viewerStatus} role="alert"><strong>媒体加载失败</strong><span>请检查本地资源后重试。</span><button type="button" onClick={() => { setFailed(false); setRetryKey((value) => value + 1); }}><RotateCcw aria-hidden="true" size={14} />重试</button></div>
            : attachment.kind === 'image' ? <img key={retryKey} alt={attachment.name} src={contentUrl} onError={() => setFailed(true)} />
              : <video key={retryKey} aria-label={attachment.name} controls poster={posterUrl} src={contentUrl} onError={() => setFailed(true)} />}
          {attachments.length > 1 ? <><button className={styles.viewerNav} data-direction="previous" type="button" aria-label="上一项" onClick={() => move(-1)}><ChevronLeft aria-hidden="true" /></button><button className={styles.viewerNav} data-direction="next" type="button" aria-label="下一项" onClick={() => move(1)}><ChevronRight aria-hidden="true" /></button></> : null}
        </div>
        <div className={styles.viewerCaption}>{attachment.kind === 'video' && attachment.durationSeconds ? `视频 · ${Math.floor(attachment.durationSeconds / 60)}:${String(attachment.durationSeconds % 60).padStart(2, '0')}` : attachment.kind === 'image' && attachment.width && attachment.height ? `${attachment.width} × ${attachment.height}` : attachment.mimeType}</div>
      </section>
    </div>
  );
}
