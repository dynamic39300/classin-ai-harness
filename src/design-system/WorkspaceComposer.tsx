import { ArrowUp, ImagePlus, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './WorkspaceComposer.module.css';

export type WorkspaceComposerImageAttachment = Readonly<{
  id: string;
  name: string;
  previewUrl: string;
  byteSize: number;
}>;

export type WorkspaceComposerProps = Readonly<{
  ariaLabel: string;
  value: string;
  placeholder: string;
  submitLabel: string;
  onValueChange: (value: string, caret: number) => void;
  onSubmit: () => void;
  mode?: 'conversation' | 'task';
  className?: string;
  groupLabel?: string;
  tools?: ReactNode;
  target?: ReactNode;
  hint?: ReactNode;
  secondaryActions?: ReactNode;
  disabled?: boolean;
  canSubmit?: boolean;
  hasPendingContent?: boolean;
  maxLength?: number;
  countThreshold?: number;
  onTextareaKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  imageAttachments?: readonly WorkspaceComposerImageAttachment[];
  imageAccept?: string;
  imageError?: string;
  onAddImages?: (files: readonly File[], source: 'picker' | 'clipboard') => void;
  onRemoveImage?: (id: string) => void;
}>;

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  const maxHeight = Number.parseFloat(getComputedStyle(textarea).maxHeight);
  const nextHeight = Number.isFinite(maxHeight)
    ? Math.min(textarea.scrollHeight, maxHeight)
    : textarea.scrollHeight;
  const isOverflowing = Number.isFinite(maxHeight) && textarea.scrollHeight > maxHeight;
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = isOverflowing ? 'auto' : 'hidden';
  textarea.dataset.overflowing = String(isOverflowing);
}

export function WorkspaceComposer({
  ariaLabel,
  value,
  placeholder,
  submitLabel,
  onValueChange,
  onSubmit,
  mode = 'conversation',
  className,
  groupLabel,
  tools,
  target,
  hint,
  secondaryActions,
  disabled = false,
  canSubmit = true,
  hasPendingContent = false,
  maxLength,
  countThreshold,
  onTextareaKeyDown,
  imageAttachments = [],
  imageAccept = 'image/png,image/jpeg,image/webp,image/gif',
  imageError,
  onAddImages,
  onRemoveImage,
}: WorkspaceComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const helpId = `${generatedId}-help`;
  const countId = `${generatedId}-count`;
  const imageErrorId = `${generatedId}-image-error`;
  const showCount = maxLength !== undefined
    && value.length >= (countThreshold ?? Math.max(0, maxLength - 800));
  const describedBy = [hint ? helpId : null, showCount ? countId : null, imageError ? imageErrorId : null].filter(Boolean).join(' ') || undefined;
  const submitDisabled = disabled || !canSubmit || (!value.trim() && imageAttachments.length === 0 && !hasPendingContent);

  useLayoutEffect(() => {
    if (textareaRef.current) resizeComposer(textareaRef.current);
  }, [value, mode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return;
    let observedWidth = textarea.clientWidth;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width === observedWidth) return;
      observedWidth = entry.contentRect.width;
      resizeComposer(textarea);
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitDisabled) return;
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onTextareaKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onAddImages || disabled) return;
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null && file.type.startsWith('image/'));
    if (images.length) onAddImages(images, 'clipboard');
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) onAddImages?.(files, 'picker');
  };

  return (
    <form
      aria-label={groupLabel}
      className={[styles.composer, styles[mode], className].filter(Boolean).join(' ')}
      data-composer-mode={mode}
      data-workspace-composer="true"
      onSubmit={submit}
    >
      {target ? <div className={styles.targetSlot}>{target}</div> : null}
      {imageAttachments.length ? (
        <ul className={styles.imageRail} aria-label={`已添加 ${imageAttachments.length} 张图片`}>
          {imageAttachments.map((image) => <li key={image.id}>
            {image.previewUrl ? <img alt="" src={image.previewUrl} /> : <span className={styles.imageFallback}><ImagePlus aria-hidden="true" size={18} /></span>}
            <span title={image.name}>{image.name}</span>
            <button type="button" aria-label={`移除图片 ${image.name}`} disabled={disabled} onClick={() => onRemoveImage?.(image.id)}><X aria-hidden="true" size={13} /></button>
          </li>)}
        </ul>
      ) : null}
      <textarea
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onValueChange(event.target.value, event.target.selectionStart)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <div className={styles.footer}>
        {onAddImages ? <>
          <input ref={fileInputRef} className={styles.fileInput} type="file" accept={imageAccept} multiple tabIndex={-1} onChange={handleFileChange} />
          <div className={styles.tools}>
            <button type="button" aria-label="添加图片" title="添加图片" disabled={disabled} onClick={() => fileInputRef.current?.click()}><ImagePlus aria-hidden="true" size={17} /><span>图片</span></button>
            {tools}
          </div>
        </> : tools ? <div className={styles.tools}>{tools}</div> : null}
        {hint ? <span className={styles.hint} id={helpId}>{hint}</span> : null}
        <div className={styles.actions}>
          {secondaryActions ? <div className={styles.secondaryActions}>{secondaryActions}</div> : null}
          {showCount ? (
            <output className={styles.count} id={countId}>
              {value.length >= maxLength
                ? `已达 ${maxLength.toLocaleString('zh-CN')} 字上限`
                : `${value.length.toLocaleString('zh-CN')} / ${maxLength.toLocaleString('zh-CN')}`}
            </output>
          ) : null}
          <button className={styles.submit} aria-label={submitLabel} disabled={submitDisabled} type="submit">
            <ArrowUp aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      {imageError ? <p className={styles.imageError} id={imageErrorId} role="alert">{imageError}</p> : null}
    </form>
  );
}
