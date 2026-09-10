import { Check, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { MessageCaptureFrame, MessageScreenSelection } from '@contracts/message/message-media';
import styles from './MessageMediaSurfaces.module.css';

type Handle = 'nw' | 'ne' | 'sw' | 'se';
type DragState = Readonly<{
  mode: 'create' | 'move' | 'resize';
  handle?: Handle;
  startX: number;
  startY: number;
  initial: MessageScreenSelection;
}>;

type MessageScreenCaptureDialogProps = Readonly<{
  frame: MessageCaptureFrame;
  sourceUrl: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (selection: MessageScreenSelection) => void;
}>;

function clampSelection(frame: MessageCaptureFrame, selection: MessageScreenSelection): MessageScreenSelection {
  const x = Math.max(0, Math.min(frame.width - 1, Math.round(selection.x)));
  const y = Math.max(0, Math.min(frame.height - 1, Math.round(selection.y)));
  return Object.freeze({
    x,
    y,
    width: Math.max(1, Math.min(frame.width - x, Math.round(selection.width))),
    height: Math.max(1, Math.min(frame.height - y, Math.round(selection.height))),
  });
}

export function MessageScreenCaptureDialog({ frame, sourceUrl, busy, onCancel, onConfirm }: MessageScreenCaptureDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [selection, setSelection] = useState<MessageScreenSelection>(() => ({
    x: Math.round(frame.width * 0.15),
    y: Math.round(frame.height * 0.15),
    width: Math.round(frame.width * 0.7),
    height: Math.round(frame.height * 0.7),
  }));
  const [rgb, setRgb] = useState('RGB —');

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !busy) onConfirm(selection);
      if (event.key === 'Tab') {
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
        const first = focusable[0];
        const last = focusable.at(-1);
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel, onConfirm, selection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = new window.Image();
    image.onload = () => {
      canvas.width = frame.width;
      canvas.height = frame.height;
      canvas.getContext('2d')?.drawImage(image, 0, 0, frame.width, frame.height);
    };
    image.src = sourceUrl;
  }, [frame.height, frame.width, sourceUrl]);

  const toImagePoint = (event: ReactPointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(frame.width, (event.clientX - rect.left) * frame.width / rect.width)),
      y: Math.max(0, Math.min(frame.height, (event.clientY - rect.top) * frame.height / rect.height)),
    };
  };

  const sampleRgb = (x: number, y: number) => {
    try {
      const pixel = canvasRef.current?.getContext('2d')?.getImageData(
        Math.max(0, Math.min(frame.width - 1, Math.round(x))),
        Math.max(0, Math.min(frame.height - 1, Math.round(y))),
        1,
        1,
      ).data;
      if (pixel) setRgb(`RGB ${pixel[0]}, ${pixel[1]}, ${pixel[2]}`);
    } catch {
      setRgb('RGB —');
    }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (busy) return;
    const point = toImagePoint(event);
    const handle = (event.target as HTMLElement).dataset.handle as Handle | undefined;
    const inside = point.x >= selection.x && point.x <= selection.x + selection.width
      && point.y >= selection.y && point.y <= selection.y + selection.height;
    dragRef.current = {
      mode: handle ? 'resize' : inside ? 'move' : 'create',
      handle,
      startX: point.x,
      startY: point.y,
      initial: selection,
    };
    if (!inside && !handle) setSelection({ x: point.x, y: point.y, width: 1, height: 1 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = toImagePoint(event);
    sampleRgb(point.x, point.y);
    const drag = dragRef.current;
    if (!drag) return;
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    if (drag.mode === 'create') {
      const x = Math.min(drag.startX, point.x);
      const y = Math.min(drag.startY, point.y);
      setSelection(clampSelection(frame, { x, y, width: Math.abs(point.x - drag.startX), height: Math.abs(point.y - drag.startY) }));
      return;
    }
    if (drag.mode === 'move') {
      setSelection({
        ...drag.initial,
        x: Math.max(0, Math.min(frame.width - drag.initial.width, drag.initial.x + dx)),
        y: Math.max(0, Math.min(frame.height - drag.initial.height, drag.initial.y + dy)),
      });
      return;
    }
    const left = drag.handle?.includes('w') ? drag.initial.x + dx : drag.initial.x;
    const top = drag.handle?.includes('n') ? drag.initial.y + dy : drag.initial.y;
    const right = drag.handle?.includes('e') ? drag.initial.x + drag.initial.width + dx : drag.initial.x + drag.initial.width;
    const bottom = drag.handle?.includes('s') ? drag.initial.y + drag.initial.height + dy : drag.initial.y + drag.initial.height;
    setSelection(clampSelection(frame, {
      x: Math.min(left, right - 1),
      y: Math.min(top, bottom - 1),
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    }));
  };

  const stopDrag = () => { dragRef.current = null; };
  const selectionStyle = {
    left: `${selection.x / frame.width * 100}%`,
    top: `${selection.y / frame.height * 100}%`,
    width: `${selection.width / frame.width * 100}%`,
    height: `${selection.height / frame.height * 100}%`,
  };

  return (
    <div className={styles.backdrop} role="presentation">
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label="裁剪屏幕截图">
        <header className={styles.dialogHeader}><span><strong>选择截图区域</strong><small>拖动画框，拖动四角调整大小</small></span><button type="button" ref={closeRef} disabled={busy} onClick={onCancel}><X aria-hidden="true" size={15} />取消</button></header>
        <div className={styles.captureBody}>
          <div className={styles.captureStage} ref={stageRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
            <canvas ref={canvasRef} aria-label="屏幕截图预览" />
            <div className={styles.captureSelection} style={selectionStyle}>
              <span className={styles.captureReadout}>{Math.round(selection.x)}, {Math.round(selection.y)} · {Math.round(selection.width)} × {Math.round(selection.height)} · {rgb}</span>
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => <i aria-hidden="true" className={styles.captureHandle} data-handle={handle} key={handle} />)}
            </div>
          </div>
        </div>
        <footer className={styles.dialogFooter}><span>Esc 取消 · Ctrl/Cmd + Enter 确认</span><div><button type="button" disabled={busy} onClick={onCancel}>取消</button><button className={styles.primary} type="button" disabled={busy} onClick={() => onConfirm(selection)}><Check aria-hidden="true" size={14} />{busy ? '正在裁剪…' : '使用截图'}</button></div></footer>
      </section>
    </div>
  );
}
