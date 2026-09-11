import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { SolutionImagePreview } from './SolutionImagePreview';
import type { RuntimeArtifact } from '@contracts/workbuddy/agent-runtime';
const artifact: RuntimeArtifact = {id:'image-1',title:'解析图',content:'{}',fileRef:'source',fileName:'solution.solution.json',format:'json',mediaType:'application/json',byteSize:2,createdAt:'2026-09-10',version:1,status:'draft'};
it('shows loading, enables PNG download after image load and offers retry on failure', () => {
  const {container}=render(<SolutionImagePreview artifact={artifact} scope="ideal-full" sessionId="session-1" />);
  expect(screen.getByRole('button',{name:'下载 PNG'})).toBeDisabled();
  fireEvent.error(container.querySelector('img')!);
  expect(screen.getByRole('alert')).toHaveTextContent('图片排版未完成');
  fireEvent.click(screen.getByRole('button',{name:'重试预览'}));
  fireEvent.load(container.querySelector('img')!);
  expect(screen.getByRole('button',{name:'下载 PNG'})).toBeEnabled();
  expect(screen.getByRole('img',{name:'解析图'})).toBeVisible();
  expect(screen.getByRole('link',{name:'打开大图'})).toHaveAttribute('href','/api/teachbuddy/sessions/session-1/artifacts/image-1/image?scope=ideal-full');
});
