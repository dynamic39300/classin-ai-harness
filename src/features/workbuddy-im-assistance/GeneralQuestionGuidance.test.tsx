import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ImSidecarAgentSurface } from './ImSidecarAgentSurface';
import type { AgentRuntimeAdapter, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { FixedWorkBuddyImBusinessContextAdapter } from '@mocks/adapters/workbuddy-im-business-context';
import { FixedWorkBuddyImTeachingDynamicsAdapter } from '@mocks/adapters/workbuddy-im-teaching-dynamics';
import { teacherVisibleRuntimeText } from '@domain/workbuddy/runtime-context-envelope';
import type { ImSidecarAgentServices, LearningContextCatalog } from '@contracts/workbuddy/business-context';
import type { TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';

const timestamp = '2026-09-15T02:00:00Z';
const target = { kind: 'class' as const, classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3' };
function holdRecommendations(services: ImSidecarAgentServices) {
  vi.spyOn(services.teachingDynamics, 'list').mockImplementation(() => new Promise(() => undefined));
}
function setup(responseForRequest: (request: string) => string = () => '接下来8月10日19:00上电磁感应导入。', configure?: (services: ImSidecarAgentServices) => void, initialSession?: RuntimeSession) {
  let session: RuntimeSession = initialSession ?? { id: 'general-session', title: '提问', status: 'idle', updatedAt: timestamp, events: [], artifacts: [] };
  const send = vi.fn(async (_scope: string, id: string, text: string) => {
    const n = session.events.length;
    const request = teacherVisibleRuntimeText(text);
    session = { ...session, id, events: [...session.events,
      { id: `teacher-${n}`, runRef: id, sequence: n + 1, occurredAt: timestamp, updatedAt: timestamp, actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: text, objectRefs: [], allowedCommands: [] },
      { id: `agent-${n}`, runRef: id, sequence: n + 2, occurredAt: timestamp, updatedAt: timestamp, actor: 'agent', kind: 'process', state: 'completed', title: 'AI', summary: responseForRequest(request), objectRefs: [], allowedCommands: [] },
    ] };
    return session;
  });
  const runtime: AgentRuntimeAdapter = { health: async () => ({ status: 'ready', message: 'ready' }), create: async () => session, list: async () => [], read: async () => session, send, cancel: async () => session, approve: async () => session };
  const businessContext = new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-08-09T06:40:00Z'), async () => ({ threadRef: target.threadId, capturedAt: timestamp, complete: true, messages: [] }));
  const services = { runtime, businessContext, teachingDynamics: new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-09T06:40:00Z')), actor: { id: 'teacher-test', name: '王老师' }, tenantRef: 'demo', scope: 'ideal-full' as const, messageDraft: { execute: vi.fn() } };
  configure?.(services);
  const view = render(<ImSidecarAgentSurface services={services} target={target} onLocateMessage={() => undefined} />);
  return { ...view, send, services };
}

describe('shared IM question guidance', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it('starts one real runtime request on click, uses the displayed text and keeps information out of delivery', async () => {
    const { send, services } = setup(undefined, holdRecommendations);
    const welcome = await screen.findByLabelText('自由提问引导');
    expect(within(welcome).getAllByRole('button')).toHaveLength(3);
    const question = within(welcome).getByRole('button', { name: '接下来要上什么课，什么时候上？' });
    await waitFor(() => expect(screen.getByRole('button', { name: '发送给 AI 消息助手' })).toBeDisabled());
    fireEvent.click(question); fireEvent.click(question);
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(teacherVisibleRuntimeText(send.mock.calls[0]![2])).toBe('接下来要上什么课，什么时候上？');
    expect(send.mock.calls[0]![2]).toContain('8月10日19:00电磁感应导入');
    expect(screen.queryByRole('button', { name: '直接发送' })).not.toBeInTheDocument();
    expect(services.messageDraft.execute).not.toHaveBeenCalled();
  });

  it('shows stable reviewed questions before either catalog or recommendations complete and can submit independently', async () => {
    let resolveCatalog!: (value: LearningContextCatalog) => void;
    let resolveDynamics!: (value: TeachingDynamicsSnapshot) => void;
    const { services, send } = setup(undefined, services => {
      vi.spyOn(services.businessContext, 'listLearningContext').mockImplementation(() => new Promise(resolve => { resolveCatalog = resolve; }));
      vi.spyOn(services.teachingDynamics, 'list').mockImplementation(() => new Promise(resolve => { resolveDynamics = resolve; }));
    });
    const welcome = await screen.findByLabelText('自由提问引导');
    const ids = () => within(welcome).getAllByRole('button').map(button => button.dataset.questionId);
    expect(ids()).toEqual(['A1', 'A2', 'A3']);
    // Completing the catalog cannot replace a question the teacher is about to click.
    const catalog = await new FixedWorkBuddyImBusinessContextAdapter(() => new Date('2026-08-09T06:40:00Z')).listLearningContext({ actorRef: services.actor.id, tenantRef: services.tenantRef, target });
    resolveCatalog(catalog);
    await waitFor(() => expect(ids()).toEqual(['A1', 'A2', 'A3']));
    fireEvent.click(within(welcome).getByRole('button', { name: '接下来要上什么课，什么时候上？' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
    resolveDynamics(await new FixedWorkBuddyImTeachingDynamicsAdapter(() => new Date('2026-08-09T06:40:00Z')).list({ actorRef: services.actor.id, tenantRef: services.tenantRef, target }));
    await waitFor(() => expect(screen.queryByText('正在整理建议…')).not.toBeInTheDocument());
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
  });

  it.each(['button', 'wheel'] as const)('shows guidance over collapsed history on re-entry, then removes it when history is revealed by %s', async method => {
    const firstVisit = setup(undefined, holdRecommendations);
    const welcome = await screen.findByLabelText('自由提问引导');
    fireEvent.click(within(welcome).getByRole('button', { name: '接下来要上什么课，什么时候上？' }));
    await screen.findByText('接下来8月10日19:00上电磁感应导入。');
    const storedSession = await firstVisit.services.runtime.read('ideal-full', 'general-session');
    firstVisit.unmount();

    const restored = setup(undefined, holdRecommendations, storedSession);
    const history = await screen.findByRole('button', { name: '查看历史消息' });
    expect(within(await screen.findByLabelText('自由提问引导')).getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('接下来8月10日19:00上电磁感应导入。')).not.toBeInTheDocument();
    if (method === 'button') fireEvent.click(history);
    else fireEvent.wheel(screen.getByRole('region', { name: 'AI 消息助手对话' }), { deltaY: -100 });
    expect(await screen.findByText('接下来8月10日19:00上电磁感应导入。')).toBeVisible();
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '可以问什么' })).toBeVisible();
    expect(restored.send).not.toHaveBeenCalled();
  });
  it('preserves text, quotes and message drafts, and Escape closes help without changing navigation', async () => {
    const { send, rerender, services } = setup(undefined, holdRecommendations);
    const user = userEvent.setup();
    await screen.findByLabelText('自由提问引导');
    const input = screen.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
    await user.type(input, '我的原稿');
    await user.click(screen.getByRole('button', { name: '可以问什么' }));
    const help = screen.getByRole('region', { name: '通用问题' });
    expect(within(help).queryByText('试着问我')).not.toBeInTheDocument();
    expect(within(help).getByRole('button', { name: '关闭提问帮助' })).toBeVisible();
    expect(within(help).queryByText('选一类，看看可以直接问 AI 什么')).not.toBeInTheDocument();
    expect(within(help).getByRole('navigation', { name: '问题分类' })).toBeVisible();
    expect(within(help).getByRole('region', { name: '班级和课程' })).toBeVisible();
    expect(within(help).queryByRole('region', { name: '对群聊的内容提问' })).not.toBeInTheDocument();
    await user.click(within(help).getByRole('button', { name: '群聊内容' }));
    expect(within(help).getByRole('region', { name: '对群聊的内容提问' })).toBeVisible();
    await user.click(within(help).getByRole('button', { name: '班级课程' }));
    await user.click(within(help).getByRole('button', { name: '接下来要上什么课，什么时候上？' }));
    expect(input).toHaveValue('我的原稿\n接下来要上什么课，什么时候上？');
    expect(send).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '可以问什么' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: '通用问题' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '可以问什么' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '收起 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'true');
    rerender(<ImSidecarAgentSurface services={services} target={{ ...target, aiReference: { id: 'm1', authorName: '示例学生', sentAt: timestamp, preview: '作业第二题怎么做？', requestId: 'quote-1' } }} onLocateMessage={() => undefined} />);
    expect(await screen.findByText('引用 示例学生')).toBeVisible();
    expect(input).toHaveValue('我的原稿\n接下来要上什么课，什么时候上？');
    expect(send).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '移除AI引用' }));
    expect(screen.queryByText('引用 示例学生')).not.toBeInTheDocument();
  });

  it('shows message review actions when a terse reply selects a prior message option', async () => {
    const options = ['可以继续处理：', '1. 回复李明关于第5题的疑问', '2. 提醒李明等人完成未提交的作业/测验', '3. 其他内容'].join('\n');
    setup(request => request === '2'
      ? '草稿已整理。\n<!--TEACHBUDDY_MESSAGE_BODY_START-->\n@李明、@周然，请尽快完成尚未提交的作业和测验。\n<!--TEACHBUDDY_MESSAGE_BODY_END-->'
      : options);
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
    const submit = screen.getByRole('button', { name: '发送给 AI 消息助手' });
    await user.type(input, '接下来可以处理什么？');
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);
    await screen.findByText('提醒李明等人完成未提交的作业/测验');
    await user.type(input, '2');
    await user.click(submit);
    expect(await screen.findByRole('button', { name: '直接发送' })).toBeVisible();
    expect(screen.getByRole('button', { name: '修改文案' })).toBeVisible();
  });
});
