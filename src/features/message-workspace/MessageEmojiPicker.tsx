import { ImagePlus, Star, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { MESSAGE_UNICODE_EMOJI } from '@domain/message/message-emoji';
import type { MessageMediaDraft } from '@domain/message/message-media';
import styles from './MessageMediaSurfaces.module.css';

export type MessageEmojiAsset = Readonly<{
  id: string;
  label: string;
  glyph?: string;
  contentRef?: string;
  mimeType?: 'image/svg+xml';
}>;

const EMOJI: readonly MessageEmojiAsset[] = MESSAGE_UNICODE_EMOJI
  .map((glyph, index) => Object.freeze({ id: `emoji-${index}`, label: glyph, glyph }));
const RESPONSES: readonly MessageEmojiAsset[] = ['收到', '谢谢', '赞同', '稍等', '已完成', '有疑问']
  .map((label, index) => Object.freeze({ id: `response-${index}`, label, glyph: ['👌', '🙏', '👍', '⏳', '✅', '🙋'][index] }));
const STICKERS: readonly MessageEmojiAsset[] = [
  { id: 'sticker-great', label: '真棒', contentRef: '/media/stickers/great.svg', mimeType: 'image/svg+xml' },
  { id: 'sticker-focus', label: '专注', contentRef: '/media/stickers/focus.svg', mimeType: 'image/svg+xml' },
  { id: 'sticker-progress', label: '有进步', contentRef: '/media/stickers/progress.svg', mimeType: 'image/svg+xml' },
  { id: 'sticker-question', label: '好问题', contentRef: '/media/stickers/question.svg', mimeType: 'image/svg+xml' },
];
const MESSAGE_EMOJI_ASSETS = Object.freeze([...EMOJI, ...RESPONSES, ...STICKERS]);

type Category = 'recent' | 'emoji' | 'stickers' | 'responses' | 'mine';
const CATEGORIES: ReadonlyArray<{ id: Category; label: string }> = [
  { id: 'recent', label: '最近' },
  { id: 'emoji', label: 'Emoji' },
  { id: 'stickers', label: '教学贴纸' },
  { id: 'responses', label: '常用回应' },
  { id: 'mine', label: '我的' },
];

type MessageEmojiPickerProps = Readonly<{
  recentIds: readonly string[];
  favoriteIds: readonly string[];
  customEmoji: readonly MessageMediaDraft[];
  resolveContent: (contentRef: string) => string | null;
  onSelectAsset: (asset: MessageEmojiAsset) => void;
  onSelectCustom: (draft: MessageMediaDraft) => void;
  onToggleFavorite: (assetId: string) => void;
  onAddCustom: (files: readonly File[]) => void;
  onClose: () => void;
}>;

export function MessageEmojiPicker(props: MessageEmojiPickerProps) {
  const [category, setCategory] = useState<Category>('recent');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const favoriteAssets = MESSAGE_EMOJI_ASSETS.filter(({ id }) => props.favoriteIds.includes(id));
  const assets = category === 'recent'
    ? props.recentIds.map((id) => MESSAGE_EMOJI_ASSETS.find((asset) => asset.id === id)).filter((asset): asset is MessageEmojiAsset => Boolean(asset))
    : category === 'emoji' ? EMOJI
      : category === 'stickers' ? STICKERS
        : category === 'responses' ? RESPONSES
          : favoriteAssets;
  const showCustom = category === 'mine';
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) props.onAddCustom(files);
  };

  return (
    <section className={styles.popover} aria-label="表情与贴纸">
      <header className={styles.popoverHeader}><strong>表情与贴纸</strong><button type="button" aria-label="关闭表情面板" onClick={props.onClose}><X aria-hidden="true" size={14} />关闭</button></header>
      <div className={styles.tabs} role="tablist" aria-label="表情分类">
        {CATEGORIES.map((item) => <button type="button" role="tab" aria-selected={category === item.id} key={item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </div>
      {assets.length || (showCustom && props.customEmoji.length) ? (
        <div className={styles.assetGrid} role="tabpanel">
          {assets.map((asset) => <div className={styles.assetItem} key={asset.id}>
            <button className={styles.assetButton} type="button" aria-label={`添加${asset.label}`} onClick={() => props.onSelectAsset(asset)}>{asset.contentRef ? <img alt="" src={asset.contentRef} /> : <span aria-hidden="true">{asset.glyph}</span>}</button>
            <button className={styles.favoriteButton} data-selected={props.favoriteIds.includes(asset.id)} type="button" aria-label={`${props.favoriteIds.includes(asset.id) ? '取消收藏' : '收藏'}${asset.label}`} aria-pressed={props.favoriteIds.includes(asset.id)} onClick={() => props.onToggleFavorite(asset.id)}><Star aria-hidden="true" fill={props.favoriteIds.includes(asset.id) ? 'currentColor' : 'none'} size={11} /></button>
          </div>)}
          {showCustom ? props.customEmoji.map((draft) => <div className={styles.assetItem} key={draft.id}><button className={styles.assetButton} type="button" aria-label={`添加自定义表情${draft.name}`} onClick={() => props.onSelectCustom(draft)}><img alt="" src={props.resolveContent(draft.contentRef) ?? ''} /></button></div>) : null}
        </div>
      ) : <div className={styles.empty} role="status"><strong>这里还没有内容</strong><span>{category === 'recent' ? '选择表情后会出现在这里' : '收藏表情或添加自己的图片'}</span></div>}
      <footer className={styles.popoverFooter}>
        <span>选择 Emoji 会插入输入框，贴纸将作为图片发送</span>
        <input className={styles.fileInput} ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={onFileChange} />
        <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus aria-hidden="true" size={14} />添加自定义</button>
      </footer>
    </section>
  );
}
