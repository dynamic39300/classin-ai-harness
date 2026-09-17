import { useState } from 'react';
import type { ClassInActivityDetail } from '@contracts/classin-test';
import styles from './ClassInTestPage.module.css';
export function ClassInResourcePreview({ activityId, resource }: { activityId: string; resource: ClassInActivityDetail['resources'][number] }) {
  const [view, setView] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const url = `/api/classin-test/resource?${new URLSearchParams({ activityId, resourceId: resource.id ?? '' })}`;
  const previewable = resource.id && ['image', 'video'].includes(resource.kind);
  return <>
    <strong>{resource.name}</strong><p>{resource.state}</p>
    {previewable && (view === 'idle' || view === 'failed') ? <button type="button" onClick={() => setView('loading')}>{view === 'failed' ? '重试附件预览' : resource.kind === 'video' ? '读取并播放视频' : '读取图片'}</button> : null}
    {view === 'loading' ? <p role="status">正在核对权限并读取附件…</p> : null}
    {view === 'failed' ? <p role="alert">附件未能打开，请重试；当前不能确认资源可用。</p> : null}
    {(view === 'loading' || view === 'ready') && resource.kind === 'image' ? <img className={styles.resourceMedia} src={url} alt={resource.name} onLoad={() => setView('ready')} onError={() => setView('failed')} /> : null}
    {(view === 'loading' || view === 'ready') && resource.kind === 'video' ? <video className={styles.resourceMedia} controls preload="metadata" src={url} onLoadedMetadata={() => setView('ready')} onError={() => setView('failed')} aria-label={resource.name} /> : null}
    {resource.id ? <p><a href={url} target="_blank" rel="noreferrer">打开原附件</a> · <a href={url} download={resource.name}>下载附件</a></p> : null}
    {resource.document ? <details><summary>查看 PDF 文字层{resource.document.pages === null ? '' : ` · ${resource.document.pages} 页`}</summary><p>{resource.document.message}</p>{resource.document.status === 'available' ? <p className={styles.description}>{resource.document.text}</p> : null}</details> : null}
  </>;
}
