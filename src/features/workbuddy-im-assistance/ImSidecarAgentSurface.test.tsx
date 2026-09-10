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
    const sidecar = await screen.findByLabelText('TeachBuddy 私密协作窗口');
    expect(within(sidecar).getByText('仅你可见')).toBeVisible();
    expect(within(sidecar).getByRole('region', { name: '教学动态' })).toBeVisible();
    expect(within(sidecar).getByText('高二物理 3 班 · 动量守恒模型 · 在线课堂')).toBeVisible();
    expect(within(sidecar).getByText('今天 14:30 开课')).toBeVisible();
    expect(within(sidecar).queryByText('DeepSeek 已连接')).not.toBeInTheDocument();
    expect(within(sidecar).queryByText('同一教学 Agent')).not.toBeInTheDocument();
    expect(within(sidecar).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(sidecar).getByRole('button', { name: '教学动态' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.wheel(within(sidecar).getByRole('region', { name: 'TeachBuddy 对话' }), { deltaY: 80 });
    const compactDynamics = within(sidecar).getByRole('button', { name: '教学动态｜4 项建议' });
    expect(compactDynamics).toHaveAttribute('aria-expanded', 'false');
    await user.click(compactDynamics);
    expect(within(sidecar).getByRole('button', { name: '教学动态' })).toHaveAttribute('aria-expanded', 'true');
    const composer = within(sidecar).getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
    expect(within(sidecar).getByRole('button', { name: '添加图片' })).toBeVisible();
    await user.type(composer, '拟一条实验提醒');
    await user.click(within(sidecar).getByRole('button', { name: '发送给 TeachBuddy' }));
    expect(await within(sidecar).findByText('拟一条实验提醒')).toBeInTheDocument();
    expect(within(sidecar).queryByText(/TEACHBUDDY_CONTEXT_V1/)).not.toBeInTheDocument();
    expect(within(sidecar).getByText('同学们，请明天带上实验报告。')).toBeInTheDocument();
    expect(within(sidecar).getByRole('button', { name: '教学动态' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(sidecar).getByRole('button', { name: '作为群消息草稿审阅' }));
    expect(append).not.toHaveBeenCalled();
    await user.click(within(sidecar).getByRole('button', { name: '确认并发送至高二物理 3 班' }));
    await waitFor(() => expect(append).toHaveBeenCalledTimes(1));
    expect(append.mock.calls[0]?.[0]).toMatchObject({ threadId: 'class-physics-3', authorName: '王老师', body: '同学们，请明天带上实验报告。' });
  });
});
