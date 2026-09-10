import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { MessageThread } from '@domain/message/message';
import { MessageWorkspace, MessageWorkspaceProvider } from '@features/message-workspace';
import { createMemoryMessageLifecyclePort } from '@features/message-lifecycle/memory-message-lifecycle-port';
import { MESSAGE_THREADS } from '@mocks/scenarios/messages';

const writableThread: MessageThread = {
  id: 'class-lifecycle-test', category: 'class', visibleTo: ['teacher'],
  titleByRole: { teacher: '消息状态测试班' }, subtitleByRole: { teacher: '20 位成员' },
  avatarByRole: { teacher: '测' }, updatedAt: '2026-08-08T14:00:00+08:00',
  unreadByRole: { teacher: 0 }, classId: 'lifecycle-test', memberCount: 20, entries: [],
};

function renderWorkspace(
  threads: readonly MessageThread[],
  initialEntry: string,
  port = createMemoryMessageLifecyclePort(threads),
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MessageWorkspaceProvider scenario={{ status: 'ready', threads }} lifecyclePort={port}>
        <MessageWorkspace role="teacher" />
      </MessageWorkspaceProvider>
    </MemoryRouter>,
  );
  return port;
}

describe('message lifecycle UI', () => {
  it('keeps a transient failure in place and retries the same message', async () => {
    const user = userEvent.setup();
    const port = createMemoryMessageLifecyclePort([writableThread]);
    port.planFailure(writableThread.id, 'transient');
    renderWorkspace([writableThread], `/teacher/messages?category=class&thread=${writableThread.id}`, port);

    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '请确认今天的作业');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('消息发送失败');
    expect(document.querySelectorAll('[data-message-id]')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: '重新发送' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '重新发送' })).not.toBeInTheDocument());
    expect(screen.getByText('3 人已读')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-message-id]')).toHaveLength(1);
  });

  it('reconnects explicitly without automatically retrying an offline message', async () => {
    const user = userEvent.setup();
    const port = createMemoryMessageLifecyclePort([writableThread], { connectionStatus: 'offline' });
    renderWorkspace([writableThread], `/teacher/messages?category=class&thread=${writableThread.id}`, port);

    expect(screen.getByText('消息服务已断开')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '离线时保留的消息');
    await user.click(screen.getByRole('button', { name: '发送' }));
    expect(await screen.findByRole('button', { name: '重新发送' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重新连接' }));
    await waitFor(() => expect(screen.queryByText('消息服务已断开')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '重新发送' })).toBeInTheDocument();
  });

  it('syncs the latest thread version before retrying a conflict', async () => {
    const user = userEvent.setup();
    const port = createMemoryMessageLifecyclePort([writableThread]);
    port.planFailure(writableThread.id, 'version-conflict');
    renderWorkspace([writableThread], `/teacher/messages?category=class&thread=${writableThread.id}`, port);

    await user.type(screen.getByRole('textbox', { name: '输入消息' }), '版本冲突测试消息');
    await user.click(screen.getByRole('button', { name: '发送' }));
    const recovery = await screen.findByRole('button', { name: '同步并重试' });
    expect(recovery.closest('[role="alert"]')).toHaveTextContent('会话已更新');
    await user.click(recovery);
    expect(await screen.findByText('3 人已读')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-message-id]')).toHaveLength(1);
  });

  it('shows retained history as read-only after a class is left or completed', () => {
    const historyThread = MESSAGE_THREADS.find(({ id }) => id === 'class-history-physics');
    expect(historyThread).toBeDefined();
    renderWorkspace([historyThread!], '/teacher/messages?category=class&thread=class-history-physics');

    expect(screen.getByText(/班级已结课，历史消息/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '输入消息' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '会话管理' })).toBeInTheDocument();
  });

  it('surfaces cursor history failure and succeeds when retried', async () => {
    const user = userEvent.setup();
    const thread: MessageThread = {
      ...writableThread,
      olderEntries: [
        { id: 'old-1', authorRole: 'teacher', authorName: '王老师', body: '更早的课堂提醒', sentAt: '2026-08-01T10:00:00+08:00', kind: 'text' },
      ],
    };
    const port = createMemoryMessageLifecyclePort([thread]);
    port.failNextHistoryLoad(thread.id);
    renderWorkspace([thread], `/teacher/messages?category=class&thread=${thread.id}`, port);

    await user.click(screen.getByRole('button', { name: '加载更早消息' }));
    expect(await screen.findByText('历史消息暂时无法加载，请重试。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试加载更早消息' }));
    expect(await screen.findAllByText('更早的课堂提醒')).toHaveLength(2);
    expect(screen.getByText('已显示全部历史消息')).toBeInTheDocument();
  });
});
