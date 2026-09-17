import { useEffect, useRef, useState } from 'react';
import styles from './ClassInTestPage.module.css';

export function ClassInReplayPreview({ activityId, playbackRef, position }: { activityId: string; playbackRef: string; position: number }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const video = useRef<HTMLVideoElement>(null);
  const active = state === 'loading' || state === 'ready';
  const url = `/api/classin-test/replay-resource?${new URLSearchParams({ activityId, replayRef: playbackRef })}`;
  useEffect(() => {
    if (!active) return;
    const media = video.current;
    return () => { if (media) { media.pause(); media.removeAttribute('src'); media.load(); } };
  }, [active, url]);
  return <>
    {!active ? <button type="button" onClick={() => setState('loading')}>{state === 'failed' ? '重试课堂回放' : '读取课堂回放'}</button> : <button type="button" onClick={() => setState('idle')}>关闭课堂回放</button>}
    {state === 'loading' ? <p role="status">正在核对教师权限并加载回放…</p> : null}
    {state === 'failed' ? <p role="alert">回放未能打开，可能权限、文件版本或连接已变化。请重试或刷新课堂。</p> : null}
    {active ? <video ref={video} className={styles.resourceMedia} controls preload="metadata" src={url} aria-label={`课堂回放文件${position}`} onLoadedMetadata={() => setState('ready')} onError={() => setState('failed')} /> : null}
  </>;
}
