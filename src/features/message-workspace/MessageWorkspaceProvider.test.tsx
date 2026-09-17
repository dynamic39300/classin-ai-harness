import { createMemoryMessageLifecyclePort } from '@features/message-lifecycle/memory-message-lifecycle-port';
import type { MessageThread } from '@domain/message/message';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageWorkspaceProvider } from './MessageWorkspaceProvider';
import { useMessageWorkspaceStore } from './message-workspace-store';

function MessageSessionProbe() {
  const { state, actions } = useMessageWorkspaceStore();
  if (state.status !== 'ready') return null;
  const { threads } = state;
  const thread = threads.find(({ id }) => id === 'class-physics-3');

  return (
    <>
      <output aria-label="老师班级消息未读">{thread?.unreadByRole.teacher ?? 0}</output>
      <output aria-label="学生班级消息未读">{thread?.unreadByRole['student-family'] ?? 0}</output>
      <button
        type="button"
        onClick={() => thread && actions.readThread('teacher', thread.id)}
      >
        阅读班级消息
      </button>
    </>
  );
}

describe('message workspace provider', () => {
  it('shares one role-isolated message session across consumers', async () => {
    const user = userEvent.setup();
    render(
      <MessageWorkspaceProvider>
        <MessageSessionProbe />
        <MessageSessionProbe />
      </MessageWorkspaceProvider>,
    );

    expect(screen.getAllByLabelText('老师班级消息未读').map(({ textContent }) => textContent)).toEqual(['1', '1']);
    expect(screen.getAllByLabelText('学生班级消息未读').map(({ textContent }) => textContent)).toEqual(['3', '3']);
    await user.click(screen.getAllByRole('button', { name: '阅读班级消息' })[0]!);
    expect(screen.getAllByLabelText('老师班级消息未读').map(({ textContent }) => textContent)).toEqual(['0', '0']);
    expect(screen.getAllByLabelText('学生班级消息未读').map(({ textContent }) => textContent)).toEqual(['3', '3']);
  });
});

function ExtensionProbe() {
  const { state, actions } = useMessageWorkspaceStore();
  if (state.status !== 'ready') return null;
  return <>
    <output aria-label="scope-records">{JSON.stringify(state.threads.map(({ id, entries }) => ({ id, bodies: entries.map(({ body }) => body) })))}</output>
    <button onClick={() => actions.appendMessage({ role: 'teacher', authorName: '老师', threadId: 'class-physics-3', body: '保留旧会话内容', sentAt: '2026-09-15T00:00:00Z' })}>旧会话消息</button>
    <button onClick={() => void actions.submitMessage({ role: 'teacher', authorName: '老师', threadId: 'external-class', body: '扩展会话消息', sentAt: '2026-09-15T00:00:00Z', clientRequestId: 'stable-one' })}>扩展会话消息</button>
  </>;
}
it('adds scoped threads asynchronously without resetting history; duplicates and detach stay isolated', async () => {
  const user = userEvent.setup();
  const thread: MessageThread = { id: 'external-class', category: 'class', visibleTo: ['teacher'], titleByRole: { teacher: '附加测试班' }, subtitleByRole: {}, avatarByRole: {}, updatedAt: '2026-09-15T00:00:00Z', unreadByRole: {}, entries: [] };
  const extension = { threads: [thread], lifecyclePort: createMemoryMessageLifecyclePort([thread], { deliveryStatus: 'sent' }), persist: vi.fn() };
  const view = render(<MessageWorkspaceProvider><ExtensionProbe /></MessageWorkspaceProvider>);
  await user.click(screen.getByRole('button', { name: '旧会话消息' }));
  view.rerender(<MessageWorkspaceProvider extension={extension}><ExtensionProbe /></MessageWorkspaceProvider>);
  await user.click(screen.getByRole('button', { name: '扩展会话消息' }));
  await user.click(screen.getByRole('button', { name: '扩展会话消息' }));
  const snapshot = JSON.parse(screen.getByLabelText('scope-records').textContent!);
  expect(snapshot.find((t: { id: string }) => t.id === 'class-physics-3').bodies).toContain('保留旧会话内容');
  expect(snapshot.find((t: { id: string }) => t.id === 'external-class').bodies).toEqual(['扩展会话消息']);
  view.rerender(<MessageWorkspaceProvider><ExtensionProbe /></MessageWorkspaceProvider>);
  expect(screen.getByLabelText('scope-records')).not.toHaveTextContent('external-class');
  expect(screen.getByLabelText('scope-records')).toHaveTextContent('保留旧会话内容');
  const savedEntries = [{ id: 'restored', authorRole: 'teacher' as const, authorName: '老师', body: '切回老师恢复的消息', kind: 'text' as const, sentAt: thread.updatedAt }];
  view.rerender(<MessageWorkspaceProvider extension={{ ...extension, readEntries: () => savedEntries }}><ExtensionProbe /></MessageWorkspaceProvider>);
  expect(screen.getByLabelText('scope-records')).toHaveTextContent('切回老师恢复的消息');
  const differentActor = { ...extension, lifecyclePort: createMemoryMessageLifecyclePort([thread]), readEntries: () => [] };
  view.rerender(<MessageWorkspaceProvider extension={differentActor}><ExtensionProbe /></MessageWorkspaceProvider>);
  expect(screen.getByLabelText('scope-records')).not.toHaveTextContent('切回老师恢复的消息');
});
