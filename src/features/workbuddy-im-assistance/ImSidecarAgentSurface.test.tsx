import { useEffect, useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentRuntimeAdapter, RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { WorkBuddyImProvider } from './WorkBuddyImProvider';
import { WorkBuddyImSidecar } from './WorkBuddyImSidecar';
import { useWorkBuddyIm } from './workbuddy-im-store';
import { FixedWorkBuddyImBusinessContextAdapter } from '@mocks/adapters/workbuddy-im-business-context';
import { FixedWorkBuddyImTeachingDynamicsAdapter } from '@mocks/adapters/workbuddy-im-teaching-dynamics';
import { MockWorkBuddyImMessageDraftAdapter } from '@mocks/adapters/workbuddy-im-message-draft';
import { MockWorkBuddyImHomeworkReminderAdapter } from '@mocks/adapters/workbuddy-im-homework-reminder';
import { MockGuidedExplanationDistributionAdapter } from '@mocks/adapters/workbuddy-guided-explanation';
import { createHomeworkScenario } from '@mocks/scenarios/homework';
import { saveImAgentSessionBinding } from './im-agent-session-binding';

function OpenSidecar() {
  const { actions } = useWorkBuddyIm();
  useEffect(() => actions.open({ kind: 'class', classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'class-physics-3', memberCount: 30, recentMessages: [{ authorRole: 'student-family', authorName: '李明', body: '明天带实验报告吗？' }] }), [actions]);
  return null;
}

describe('ImSidecarAgentSurface', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('uses the shared runtime, hides the context envelope and sends only after teacher approval', async () => {
    const append = vi.fn();
    let session: RuntimeSession | null = null;
    const runtime: AgentRuntimeAdapter = {
      health: async () => ({ status: 'ready', message: 'ready' }),
      list: async () => session ? [session] : [],
      create: async () => ({ id: 'tb-session-1', title: '新对话', status: 'idle', updatedAt: '2026-09-08T00:00:00.000Z', events: [], artifacts: [] }),
      read: async () => session ?? { id: 'tb-session-1', title: '新对话', status: 'idle', updatedAt: '2026-09-08T00:00:00.000Z', events: [], artifacts: [] },
      send: async (_scope, id, text) => {
        session = { id, title: '实验提醒', status: 'idle', updatedAt: '2026-09-08T00:00:01.000Z', artifacts: [], events: [
          { id: 'teacher-1', runRef: id, sequence: 1, occurredAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z', actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: text, objectRefs: [], allowedCommands: [] },
          { id: 'agent-1', runRef: id, sequence: 2, occurredAt: '2026-09-08T00:00:01.000Z', updatedAt: '2026-09-08T00:00:01.000Z', actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary: '同学们，请明天带上实验报告。', objectRefs: [], allowedCommands: [] },
        ] };
        return session;
      },
      cancel: async () => session!,
      approve: async () => session!,
    };
    const now = () => new Date('2026-08-09T10:00:00+08:00');
    const legacy = createHomeworkScenario();
    const homework = new MockWorkBuddyImHomeworkReminderAdapter({ readSnapshot: () => ({ ...legacy, classId: 'class-1', classLabel: '高二物理 3 班' }), appendTeacherMessage: append });
    const guided = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: append });
    const messageDraft = new MockWorkBuddyImMessageDraftAdapter({ now, appendTeacherMessage: append });
    function Tree() {
      const services = useMemo(() => ({ runtime, businessContext: new FixedWorkBuddyImBusinessContextAdapter(now), teachingDynamics: new FixedWorkBuddyImTeachingDynamicsAdapter(now), messageDraft, actor: { id: 'teacher-1', name: '王老师' }, tenantRef: 'school-1', scope: 'ideal-full' as const }), []);
      return <WorkBuddyImProvider adapter={homework} guidedExplanationAdapter={guided} teacher={{ id: 'teacher-1', name: '王老师' }} now={now} agentServices={services}><OpenSidecar /><WorkBuddyImSidecar onLocateMessage={() => undefined} /></WorkBuddyImProvider>;
    }
    const user = userEvent.setup();
    render(<MemoryRouter><Tree /></MemoryRouter>);
    const sidecar = await screen.findByLabelText('AI 消息助手私密协作窗口');
    const guide = within(sidecar).getByRole('region', { name: 'AI 消息助手建议' });
    expect(within(guide).getByText('AI 消息助手')).toBeVisible();
    expect(within(guide).getByText(/^\d+ 项建议$/)).toBeVisible();
    expect(within(guide).queryByText('仅你可见')).not.toBeInTheDocument();
    expect(within(guide).getByText('选环节，点一条建议，AI写消息草稿，您确认后发送')).toBeVisible();
    expect(within(guide).getByRole('tablist', { name: '教学阶段' })).toBeVisible();
    expect(within(guide).getByText('动量守恒模型 · 在线课堂')).toBeVisible();
    expect(within(guide).queryByText(/高二物理 3 班 · 动量守恒模型/)).not.toBeInTheDocument();
    expect(within(guide).getByText('今天 14:30 开课')).toBeVisible();
    expect(within(sidecar).queryByText('DeepSeek 已连接')).not.toBeInTheDocument();
    expect(within(sidecar).queryByText('同一教学 Agent')).not.toBeInTheDocument();
    expect(within(sidecar).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(sidecar).queryByRole('button', { name: /新建.*会话/ })).not.toBeInTheDocument();
    expect(within(guide).getByRole('button', { name: '收起 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'true');
    const conversation = within(sidecar).getByRole('region', { name: 'AI 消息助手对话' });
    expect(sidecar.firstElementChild).toBe(guide);
    expect(guide.nextElementSibling).toBe(conversation);
    expect(conversation).not.toContainElement(guide);
    const focusedStage = within(guide).getByRole('tab', { name: /课前/ });
    focusedStage.focus();
    expect(focusedStage).toHaveFocus();
    fireEvent.wheel(conversation, { deltaY: 240 });
    const collapseDynamics = within(guide).getByRole('button', { name: '收起 AI 消息助手建议' });
    expect(collapseDynamics).toHaveAttribute('aria-expanded', 'true');
    expect(collapseDynamics).toHaveTextContent('');
    await user.click(collapseDynamics);
    const compactDynamics = within(guide).getByRole('button', { name: '展开 AI 消息助手建议' });
    expect(compactDynamics).toHaveAttribute('aria-expanded', 'false');
    expect(compactDynamics).toHaveFocus();
    expect(guide.querySelector('#teaching-dynamics-content')).toHaveAttribute('aria-hidden', 'true');
    expect(guide.querySelector('#teaching-dynamics-content')).toHaveAttribute('inert');
    expect(within(guide).getByText('选环节，点一条建议，AI写消息草稿，您确认后发送')).toBeVisible();
    await user.click(compactDynamics);
    expect(within(guide).getByRole('button', { name: '收起 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'true');
    const composer = within(sidecar).getByRole('textbox', { name: '向 AI 消息助手输入要求' });
    expect(within(sidecar).getByRole('button', { name: '添加图片' })).toBeVisible();
    await user.type(composer, '拟一条实验提醒');
    await user.click(within(sidecar).getByRole('button', { name: '发送给 AI 消息助手' }));
    expect(await within(sidecar).findByText('拟一条实验提醒')).toBeInTheDocument();
    expect(within(sidecar).queryByText(/TEACHBUDDY_CONTEXT_V1/)).not.toBeInTheDocument();
    expect(within(sidecar).getByText('同学们，请明天带上实验报告。')).toBeInTheDocument();
    expect(within(guide).getByRole('button', { name: '收起 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(sidecar).getByRole('button', { name: '作为群消息草稿审阅' }));
    expect(within(sidecar).queryByRole('link', { name: /在 TeachBuddy 中继续/ })).not.toBeInTheDocument();
    expect(append).not.toHaveBeenCalled();
    await user.click(within(sidecar).getByRole('button', { name: '确认并发送至高二物理 3 班' }));
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append.mock.calls[0]?.[0]).toMatchObject({ threadId: 'class-physics-3', authorName: '王老师', body: '同学们，请明天带上实验报告。' });
  });

  it('stops the current task from the composer and continues in the same conversation', async () => {
    const oldTeacherEvent = { id: 'teacher-old', runRef: 'tb-session-keep', sequence: 1, occurredAt: '2026-09-08T00:00:00.000Z', updatedAt: '2026-09-08T00:00:00.000Z', actor: 'teacher' as const, kind: 'teacher_message' as const, state: 'completed' as const, title: '教师', summary: '先帮我整理课堂提醒', objectRefs: [], allowedCommands: [] };
    const oldAgentEvent = { id: 'agent-old', runRef: 'tb-session-keep', sequence: 2, occurredAt: '2026-09-08T00:00:01.000Z', updatedAt: '2026-09-08T00:00:01.000Z', actor: 'agent' as const, kind: 'process' as const, state: 'running' as const, title: 'TeachBuddy', summary: '正在整理消息', objectRefs: [], allowedCommands: [] };
    let session: RuntimeSession = { id: 'tb-session-keep', title: '教学消息', status: 'running', updatedAt: '2026-09-08T00:00:01.000Z', artifacts: [], events: [oldTeacherEvent, oldAgentEvent] };
    const create = vi.fn();
    const cancel = vi.fn(async () => {
      session = { ...session, status: 'stopped', error: '生成已停止，你可以继续发送要求。', updatedAt: '2026-09-08T00:00:02.000Z', events: [oldTeacherEvent, { ...oldAgentEvent, state: 'stopped' as const }] };
      return session;
    });
    const send = vi.fn(async (_scope: string, id: string, text: string) => {
      session = { id, title: '教学消息', status: 'idle', updatedAt: '2026-09-08T00:00:04.000Z', artifacts: [], events: [
        ...session.events,
        { id: 'teacher-new', runRef: id, sequence: 3, occurredAt: '2026-09-08T00:00:03.000Z', updatedAt: '2026-09-08T00:00:03.000Z', actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: text, objectRefs: [], allowedCommands: [] },
        { id: 'agent-new', runRef: id, sequence: 4, occurredAt: '2026-09-08T00:00:04.000Z', updatedAt: '2026-09-08T00:00:04.000Z', actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary: '新的提醒已经整理好了。', objectRefs: [], allowedCommands: [] },
      ] };
      return session;
    });
    const runtime: AgentRuntimeAdapter = {
      health: async () => ({ status: 'ready', message: 'ready' }),
      list: async () => [session],
      create,
      read: async () => session,
      send,
      cancel,
      approve: async () => session,
    };
    const now = () => new Date('2026-08-09T10:00:00+08:00');
    const append = vi.fn();
    const legacy = createHomeworkScenario();
    const homework = new MockWorkBuddyImHomeworkReminderAdapter({ readSnapshot: () => ({ ...legacy, classId: 'class-1', classLabel: '高二物理 3 班' }), appendTeacherMessage: append });
    const guided = new MockGuidedExplanationDistributionAdapter({ appendTeacherMessage: append });
    const messageDraft = new MockWorkBuddyImMessageDraftAdapter({ now, appendTeacherMessage: append });
    saveImAgentSessionBinding({ actorRef: 'teacher-1', tenantRef: 'school-1', threadRef: 'class-physics-3', scope: 'ideal-full' }, 'tb-session-keep');

    function Tree() {
      const services = useMemo(() => ({ runtime, businessContext: new FixedWorkBuddyImBusinessContextAdapter(now), teachingDynamics: new FixedWorkBuddyImTeachingDynamicsAdapter(now), messageDraft, actor: { id: 'teacher-1', name: '王老师' }, tenantRef: 'school-1', scope: 'ideal-full' as const }), []);
      return <WorkBuddyImProvider adapter={homework} guidedExplanationAdapter={guided} teacher={{ id: 'teacher-1', name: '王老师' }} now={now} agentServices={services}><OpenSidecar /><WorkBuddyImSidecar onLocateMessage={() => undefined} /></WorkBuddyImProvider>;
    }

    const user = userEvent.setup();
    render(<MemoryRouter><Tree /></MemoryRouter>);
    const sidecar = await screen.findByLabelText('AI 消息助手私密协作窗口');
    const composer = sidecar.querySelector<HTMLElement>('[data-workspace-composer="true"]');
    expect(composer).not.toBeNull();
    const conversation = within(sidecar).getByRole('region', { name: 'AI 消息助手对话' });
    Object.defineProperty(conversation, 'scrollHeight', { configurable: true, value: 1_000 });
    Object.defineProperty(conversation, 'clientHeight', { configurable: true, value: 240 });
    Object.defineProperty(conversation, 'scrollTop', { configurable: true, value: 120, writable: true });
    const scrollTo = vi.fn();
    conversation.scrollTo = scrollTo;
    fireEvent.scroll(conversation);
    scrollTo.mockClear();
    const stop = await within(composer!).findByRole('button', { name: '停止生成' });
    await user.click(stop);
    await within(sidecar).findByText('生成已停止，你可以继续发送要求。');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();

    const textbox = within(composer!).getByRole('textbox', { name: '向 AI 消息助手输入要求' });
    expect(textbox).toBeEnabled();
    await user.type(textbox, '换一种简短说法');
    await user.click(within(composer!).getByRole('button', { name: '发送给 AI 消息助手' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send.mock.calls[0]?.[1]).toBe('tb-session-keep');
    expect(create).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalled();
    expect(within(sidecar).getByText('先帮我整理课堂提醒')).toBeVisible();
    expect(await within(sidecar).findByText('换一种简短说法')).toBeVisible();
  });
});
