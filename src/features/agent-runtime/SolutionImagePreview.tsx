import { useState } from 'react';
import type { RuntimeArtifact, RuntimeScope } from '@contracts/workbuddy/agent-runtime';
import styles from './SolutionImagePreview.module.css';
export function SolutionImagePreview({ artifact, scope, sessionId }: { artifact: RuntimeArtifact; scope: RuntimeScope; sessionId: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [downloadError, setDownloadError] = useState('');
  const url = `/api/teachbuddy/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(artifact.id)}/image?scope=${encodeURIComponent(scope)}`;
  async function download() {
    setDownloadError('');
    try {
      const response = await fetch(`${url}&download=1`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = objectURL; anchor.download = '解题过程.png'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
    } catch { setDownloadError('下载未完成，请重试。'); }
  }
  return <figure className={styles.preview} aria-label={`解题图片：${artifact.title}`}>
    <figcaption><strong>{artifact.title}</strong><span>16:9 · PNG · 待核对</span></figcaption>
    {state === 'loading' ? <p role="status">正在排版解题图片…</p> : null}
    {state === 'error' ? <div role="alert"><p>图片排版未完成。可重试，或让 AI 精简步骤后重新生成。</p><button type="button" onClick={() => { setState('loading'); setRetry(value => value + 1); }}>重试预览</button></div> : null}
    <img key={retry} src={`${url}&retry=${retry}`} alt={artifact.title} hidden={state !== 'ready'} onLoad={() => setState('ready')} onError={() => setState('error')} />
    <div className={styles.actions}><a href={url} target="_blank" rel="noreferrer">打开大图</a><button type="button" disabled={state !== 'ready'} onClick={() => void download()}>下载 PNG</button></div>
    {downloadError ? <p role="alert">{downloadError}</p> : null}
  </figure>;
}
