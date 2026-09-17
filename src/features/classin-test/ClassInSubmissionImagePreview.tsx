import { useState } from 'react';
import styles from './ClassInTestPage.module.css';

export function ClassInSubmissionImagePreview({ activityId, studentId, image }: { activityId: string; studentId: string; image: { ref: string; name: string } }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const active = state === 'loading' || state === 'ready';
  const url = `/api/classin-test/submission-resource?${new URLSearchParams({ activityId, studentId, imageRef: image.ref })}`;
  return <div>
    <p>{image.name}</p>
    <button type="button" onClick={() => setState(active ? 'idle' : 'loading')}>{active ? '关闭答题图片' : state === 'failed' ? '重试答题图片' : '读取答题图片'}</button>
    {state === 'loading' ? <p role="status">正在核对学生答卷并读取图片…</p> : null}
    {state === 'failed' ? <p role="alert">答题图片未能打开，可能答卷、权限或连接已变化；请重试或刷新作业。</p> : null}
    {active ? <img className={styles.resourceMedia} src={url} alt={image.name} onLoad={() => setState('ready')} onError={() => setState('failed')} /> : null}
    {state === 'ready' ? <p><a href={url} target="_blank" rel="noreferrer">打开答题原图</a></p> : null}
  </div>;
}
