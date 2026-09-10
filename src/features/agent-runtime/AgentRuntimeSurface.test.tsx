import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeAdapter, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { AgentRuntimeSurface } from './AgentRuntimeSurface';
import { RuntimeHttpError } from './http-agent-runtime';
import { runtimeEvent, runtimeSession } from './runtime-test-fixtures';

function fixture(initial = runtimeSession()) {
  let snapshot = initial;
  const adapter = {
    health: vi.fn<AgentRuntimeAdapter['health']>().mockResolvedValue({ status: 'ready', message: '已连接' }),
    list: vi.fn<AgentRuntimeAdapter['list']>().mockImplementation(async () => [snapshot]),
    create: vi.fn<AgentRuntimeAdapter['create']>().mockImplementation(async () => snapshot),
    read: vi.fn<AgentRuntimeAdapter['read']>().mockImplementation(async (_scope, id) => ({ ...snapshot, id })),
    send: vi.fn<AgentRuntimeAdapter['send']>().mockImplementation(async (_scope, _id, text) => {
      snapshot = { ...snapshot, events: [...snapshot.events, runtimeEvent(text, 'teacher'), runtimeEvent(`答复：${text}`)] };
      return snapshot;
    }),
    cancel: vi.fn<AgentRuntimeAdapter['cancel']>().mockImplementation(async () => { snapshot = { ...snapshot, status: 'stopped' }; return snapshot; }),
    approve: vi.fn<AgentRuntimeAdapter['approve']>().mockImplementation(async (_scope, _id, artifactId, _version, commandId) => {
      snapshot = { ...snapshot, artifacts: snapshot.artifacts.map((item) => item.id === artifactId ? { ...item, status: 'saved', receipt: { id: commandId, approvedAt: initial.updatedAt, savedAt: initial.updatedAt, truthLabel: 'local-runtime' } } : item) };
      return snapshot;
    }),
  };
  return { adapter, update: (next: RuntimeSession) => { snapshot = next; } };
}

function LocationProbe() { return <output data-testid="location">{useLocation().search}</output>; }
function setup(adapter: AgentRuntimeAdapter, entry = '/new?session=session-a', initialDraft = '') {
  return render(<MemoryRouter initialEntries={[entry]}><AgentRuntimeSurface scope="ideal-full" newTaskPath="/new?keep=yes" adapter={adapter} initialDraft={initialDraft} /><LocationProbe /></MemoryRouter>);
}
async function send(text: string) {
  await screen.findByText('TeachBuddy 已连接');
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  await waitFor(() => expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: '发送给 TeachBuddy' }));
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('runtime workspace', () => {
  it('creates a persistent session on first send and continues in it with URL selection', async () => {
    const { adapter } = fixture();
    setup(adapter, '/new');
    await send('给我一份英语教案');
    await screen.findByText('答复：给我一份英语教案');
    expect(screen.getByTestId('location')).toHaveTextContent('session=session-a');
    expect(screen.getByRole('textbox')).toHaveValue('');
    await send('加上课堂练习');
    await screen.findByText('答复：加上课堂练习');
    expect(adapter.create).toHaveBeenCalledTimes(1);
    expect(adapter.send.mock.calls.map((call) => call.slice(0, 2))).toEqual([['ideal-full', 'session-a'], ['ideal-full', 'session-a']]);
    expect(screen.queryByRole('link', { name: '课程工作流' })).not.toBeInTheDocument();
  });

  it('sends an uploaded image through the runtime and clears its preview after acceptance', async () => {
    const { adapter } = fixture();
    const { container } = setup(adapter);
    await screen.findByText('TeachBuddy 已连接');
    const bytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([bytes], '课堂板书.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole('list', { name: '已添加 1 张图片' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '发送给 TeachBuddy' }));
    await waitFor(() => expect(adapter.send).toHaveBeenCalled());
    expect(adapter.send).toHaveBeenCalledWith('ideal-full', 'session-a', '', expect.any(String), [{
      name: '课堂板书.png', mediaType: 'image/png', byteSize: 8, data: 'iVBORw0KGgo=',
    }]);
    await waitFor(() => expect(screen.queryByRole('list', { name: '已添加 1 张图片' })).not.toBeInTheDocument());
  });

  it('prefills a capability intent without creating or sending a session', async () => {
    const { adapter } = fixture();
    setup(adapter, '/new', '使用“作业错因聚类”帮我完成：');
    await screen.findByText('TeachBuddy 已连接');
    expect(screen.getByRole('textbox')).toHaveValue('使用“作业错因聚类”帮我完成：');
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.send).not.toHaveBeenCalled();
  });

  it('disables sending while unconfigured and recovers after reconnect', async () => {
    const { adapter } = fixture();
    adapter.health.mockResolvedValue({ status: 'unconfigured', message: '尚未配置凭据' });
    setup(adapter, '/new');
    await screen.findByText('尚未配置凭据');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '教案' } });
    expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '新建会话' })).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    adapter.health.mockResolvedValue({ status: 'ready', message: '已连接' });
    fireEvent.click(screen.getByRole('button', { name: '重新连接' }));
    await screen.findByText('TeachBuddy 已连接');
    expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeEnabled();
  });

  it('restores a running session, polls, and invokes explicit backend cancellation', async () => {
    vi.useFakeTimers();
    const { adapter } = fixture(runtimeSession({ status: 'running' }));
    const view = setup(adapter);
    await act(async () => {});
    expect(screen.getByRole('region', { name: 'TeachBuddy 分析过程' })).toBeVisible();
    expect(screen.getByText('正在等待运行事件')).toBeVisible();
    expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(adapter.read).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: '停止生成' }));
    await act(async () => {});
    expect(adapter.cancel).toHaveBeenCalledWith('ideal-full', 'session-a');
    expect(screen.getByText('生成已停止，您可以继续发送要求。')).toBeVisible();
    view.unmount();
    expect(adapter.cancel).toHaveBeenCalledTimes(1);
  });

  it('retains commandId across an uncertain send and prevents duplicate submissions', async () => {
    const { adapter } = fixture();
    adapter.send.mockRejectedValueOnce(new Error('网络断开'));
    setup(adapter);
    await send('生成测验');
    await screen.findByText('网络断开');
    expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重试原请求' }));
    await screen.findByText('答复：生成测验');
    expect(adapter.send.mock.calls[0]).toEqual(adapter.send.mock.calls[1]);
    expect(screen.queryByRole('button', { name: '重试原请求' })).not.toBeInTheDocument();
  });

  it('preserves the backend timeout reason when restoring a stopped run', async () => {
    const reason = '任务执行超过 10 分钟，已请求停止。已有内容仍然保留。';
    const { adapter } = fixture(runtimeSession({ status: 'stopped', error: reason }));
    setup(adapter);
    expect(await screen.findByText(reason)).toBeVisible();
    expect(screen.queryByText('生成已停止，您可以继续发送要求。')).not.toBeInTheDocument();
  });

  it('exposes the complete persistent title when the compact header truncates it', async () => {
    const title = '我正在准备初二英语课，请记住本次课程代号海蓝星并生成完整教案';
    const { adapter } = fixture(runtimeSession({ title }));
    setup(adapter);
    expect(await screen.findByRole('heading', { name: title })).toHaveAttribute('title', title);
  });

  it('allows correcting a rejected message without locking the composer forever', async () => {
    const { adapter } = fixture();
    adapter.send.mockRejectedValueOnce(new RuntimeHttpError('请用自然语言', 400));
    setup(adapter);
    await send('/command');
    fireEvent.click(await screen.findByRole('button', { name: '修改消息' }));
    expect(screen.getByRole('textbox')).toHaveValue('/command');
    await send('改写教案');
    await screen.findByText('答复：改写教案');
    expect(adapter.send.mock.calls[0]?.[3]).not.toEqual(adapter.send.mock.calls[1]?.[3]);
  });

  it('reviews untrusted content as text and saves only the displayed artifact version', async () => {
    const content = '<script>alert(1)</script>\n# 教案\n[link](javascript:alert(1))';
    const { adapter } = fixture(runtimeSession({ artifacts: [{
      id: 'artifact-a', title: '教案文稿', content, status: 'draft', version: 2,
      fileRef: 'sf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', fileName: '教案文稿.md', format: 'markdown',
      mediaType: 'text/markdown; charset=utf-8', byteSize: new TextEncoder().encode(content).byteLength,
      createdAt: '2026-09-04T10:00:00.000Z',
    }] }));
    const { container } = setup(adapter);
    fireEvent.click(await screen.findByRole('button', { name: /教案文稿/ }));
    expect(container.querySelector('pre')).toHaveTextContent('<script>alert(1)</script>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '确认并保存到本机' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '已保存' })).toBeDisabled());
    expect(adapter.approve).toHaveBeenCalledWith('ideal-full', 'session-a', 'artifact-a', 2, expect.any(String));
    expect(screen.getByText(/本机保存回执/)).toBeVisible();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: '下载 MD' }));
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]).toMatchObject({
      href: expect.stringContaining('/api/teachbuddy/files/sf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/download?scope=ideal-full'),
      download: '教案文稿.md',
    });
  });

  it('selects history without canceling work and ignores a late response from the old session', async () => {
    const { adapter } = fixture(runtimeSession({ status: 'running' }));
    let resolveOld: (session: RuntimeSession) => void = () => {};
    adapter.read.mockImplementation((_scope, id) => id === 'session-a'
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve(runtimeSession({ id, title: '第二会话', events: [runtimeEvent('第二会话的回复')] })));
    adapter.list.mockResolvedValue([runtimeSession(), runtimeSession({ id: 'session-b', title: '第二会话' })]);
    const view = setup(adapter);
    fireEvent.click(screen.getByRole('button', { name: '历史会话' }));
    const history = screen.getByRole('complementary', { name: '历史会话' });
    fireEvent.click(await within(history).findByRole('link', { name: /第二会话/ }));
    await screen.findByText('第二会话的回复');
    await act(async () => { resolveOld(runtimeSession({ events: [runtimeEvent('过期回复')] })); });
    expect(screen.queryByText('过期回复')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('session=session-b');
    view.unmount();
    expect(adapter.cancel).not.toHaveBeenCalled();
  });

  it('retries a failed read and never leaks the prior profile snapshot on a scope change', async () => {
    const { adapter } = fixture(runtimeSession({ events: [runtimeEvent('终局私有内容')] }));
    adapter.read.mockRejectedValueOnce(new Error('离线'));
    const view = setup(adapter);
    await screen.findByText('终局私有内容');
    expect(screen.getByRole('button', { name: '发送给 TeachBuddy' })).toBeDisabled();
    fireEvent.click(await screen.findByRole('button', { name: '重试恢复会话' }));
    await screen.findByText('终局私有内容');
    adapter.read.mockResolvedValue(runtimeSession({ events: [runtimeEvent('独立空间内容')] }));
    view.rerender(<MemoryRouter><AgentRuntimeSurface scope="standalone-teacher" newTaskPath="/new" adapter={adapter} /></MemoryRouter>);
    expect(screen.queryByText('终局私有内容')).not.toBeInTheDocument();
    await screen.findByText('独立空间内容');
    expect(adapter.read).toHaveBeenLastCalledWith('standalone-teacher', 'session-a');
  });
});
