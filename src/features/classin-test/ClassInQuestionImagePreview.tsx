import { useState } from 'react';
import styles from './ClassInTestPage.module.css';

export function ClassInQuestionImagePreview({ activityId, topicId, image }: { activityId: string; topicId: string; image: { ref: string; name: string } }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const active = state === 'loading' || state === 'ready';
  const url = `/api/classin-test/question-resource?${new URLSearchParams({ activityId, topicId, imageRef: image.ref })}`;
  return <div>
    <button type="button" onClick={() => setState(active ? 'idle' : 'loading')}>{active ? '关闭题干图片' : state === 'failed' ? '重试题干图片' : '读取题干图片'}</button>
    {state === 'loading' ? <p role="status">正在核对试卷与题目并读取图片…</p> : null}
    {state === 'failed' ? <p role="alert">题干图片未能打开，题目、权限或连接可能已变化；请重试或刷新测验。</p> : null}
    {active ? <img className={styles.resourceMedia} src={url} alt={image.name} onLoad={() => setState('ready')} onError={() => setState('failed')} /> : null}
    {state === 'ready' ? <p><a href={url} target="_blank" rel="noreferrer">打开题干原图</a></p> : null}
  </div>;
}
