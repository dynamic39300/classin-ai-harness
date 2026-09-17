import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { TeachingDynamicsSnapshot } from '@contracts/workbuddy/teaching-dynamics';
import { TeachingDynamics } from './TeachingDynamics';

const snapshot: TeachingDynamicsSnapshot = {
  threadRef: 'class-1', currentStage: 'during', capturedAt: '2026-09-09T10:00:00.000Z', version: 'v1', sourceRefs: ['fixture'], truthLabel: 'fixed-demo',
  stages: [
    { id: 'before', items: [{ id: 'before-ok', stage: 'before', kind: 'confirmation', title: '课前准备已完成', detail: '当前无需处理', priority: 1 }] },
    { id: 'during', items: [{ id: 'attendance', stage: 'during', kind: 'attention', contextLabel: '三年级数学 · 大数加减法 · 在线课堂', title: '正在上课，3 人迟到', detail: '可提醒学生进入课堂', priority: 20, action: { label: '提醒上课', teacherRequest: '提醒迟到学生' } }] },
    { id: 'after', items: [
      { id: 'homework', stage: 'after', kind: 'attention', contextLabel: '三年级数学 · 大数加减法 · 课后作业', title: '6 人尚未提交', detail: '明天 18:00 截止', priority: 10, action: { label: '提醒学生', teacherRequest: '提醒交作业' } },
      { id: 'grading', stage: 'after', kind: 'teacher-task', title: '1 份待批改', detail: '可辅助批改', priority: 5, action: { label: '辅助批改', teacherRequest: '辅助批改' } },
    ] },
    { id: 'summary', items: [{ id: 'recap', stage: 'summary', kind: 'progress', title: '课堂回顾', detail: '可生成', priority: 1, action: { label: '生成回顾', teacherRequest: '生成回顾' } }] },
  ],
};

function Harness({ onAction = vi.fn() }: Readonly<{ onAction?: (action: { label: string; teacherRequest: string }) => void }>) {
  const [expanded, setExpanded] = useState(true);
  const [selectedStage, setSelectedStage] = useState<null | 'before' | 'during' | 'after' | 'summary'>(null);
  return <TeachingDynamics snapshot={snapshot} expanded={expanded} selectedStage={selectedStage} contextPrefix="三年级数学" onExpandedChange={setExpanded} onSelectedStageChange={setSelectedStage} onAction={onAction} />;
}

describe('TeachingDynamics', () => {
  it('shows a plain no-class notice without actions, badges or a fabricated suggestion', () => {
    render(<TeachingDynamics snapshot={{ ...snapshot, stages: snapshot.stages.map(stage => stage.id === 'during' ? { ...stage, items: [] } : stage) }} expanded selectedStage="during" onExpandedChange={vi.fn()} onSelectedStageChange={vi.fn()} onAction={vi.fn()} />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('当前没有正在上课的课堂');
    expect(within(panel).queryByRole('button')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('article')).not.toBeInTheDocument();
    expect(panel).not.toHaveTextContent(/仅供查看|无需处理|实时出勤尚未接入/);
    expect(screen.getByRole('tab', { name: /课中.*暂无课堂/ })).toHaveTextContent('课中暂无');
  });

  it('keeps full attendance informational and leaves the missing-student reminder actionable', () => {
    const full = { id: 'full', stage: 'during' as const, kind: 'confirmation' as const, title: '数学课，已上课15分钟，全员满勤', detail: '无需发送提醒', priority: 1 };
    const onAction = vi.fn();
    render(<TeachingDynamics snapshot={{ ...snapshot, stages: snapshot.stages.map(stage => stage.id === 'during' ? { ...stage, items: [...stage.items, full] } : stage) }} expanded selectedStage="during" onExpandedChange={vi.fn()} onSelectedStageChange={vi.fn()} onAction={onAction} />);
    const notice = screen.getByRole('article');
    expect(notice).toHaveTextContent('全员满勤');
    expect(within(notice).queryByRole('button')).not.toBeInTheDocument();
    expect(notice).not.toHaveTextContent(/仅供查看|无需处理/);
    expect(within(screen.getByRole('tabpanel')).getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /提醒上课/ })).toBeEnabled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('shows loading when collapsed and keeps stage counts unknown in an expanded skeleton', () => {
    const props = { snapshot: null, loading: true, selectedStage: null, onExpandedChange: vi.fn(), onSelectedStageChange: vi.fn(), onAction: vi.fn() };
    const { rerender } = render(<TeachingDynamics {...props} expanded={false} />);
    expect(screen.getByRole('status')).toHaveTextContent('正在整理建议…');
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    rerender(<TeachingDynamics {...props} expanded slow />);
    expect(screen.getByText('读取时间较长，您可以先提问')).toBeVisible();
    expect(screen.queryByText(/0条|待核|已核/)).not.toBeInTheDocument();
  });

  it('uses a compact failure with retry and preserves old content on refresh failure', async () => {
    const retry = vi.fn();
    const props = { selectedStage: null, onExpandedChange: vi.fn(), onSelectedStageChange: vi.fn(), onAction: vi.fn(), onRetry: retry };
    const { rerender } = render(<TeachingDynamics {...props} snapshot={null} expanded error="离线" />);
    expect(screen.getByRole('status')).toHaveTextContent('教学建议暂不可用');
    expect(screen.getByText('您仍可直接提问')).toBeVisible();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(<TeachingDynamics {...props} snapshot={snapshot} expanded error="离线" />);
    expect(screen.getByText('正在上课，3 人迟到')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('更新失败');
  });
  it('fuses the AI message assistant introduction with four compact stage tabs and switches one content card in place', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const module = screen.getByRole('region', { name: 'AI 消息助手建议' });
    expect(within(module).getByText('AI 消息助手')).toBeVisible();
    expect(within(module).getByText('4项')).toBeVisible();
    expect(within(module).queryByText('仅你可见')).not.toBeInTheDocument();
    expect(within(module).getByText(/选一条建议，AI写消息，您确认后发送/)).toBeVisible();
    expect(within(module).queryByText('您好，我会根据当前教学进展，帮您把要发给学生的消息整理好。')).not.toBeInTheDocument();
    const collapse = within(module).getByRole('button', { name: '收起 AI 消息助手建议' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(collapse).toHaveTextContent('AI 消息助手');
    expect(within(module).queryByText('教学动态')).not.toBeInTheDocument();
    expect(within(module).getByRole('tab', { name: /课中.*建议 1 条/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(module).getByRole('tab', { name: /课中.*建议 1 条/ })).toHaveTextContent('课中1条');
    expect(within(module).queryByText('建议 1 条')).not.toBeInTheDocument();
    expect(within(module).getByText('正在上课，3 人迟到')).toBeVisible();
    expect(within(module).getByText('大数加减法 · 在线课堂')).toBeVisible();
    expect(within(module).queryByText(/三年级数学 · 大数加减法/)).not.toBeInTheDocument();
    expect(within(module).queryByText('6 人尚未提交')).not.toBeInTheDocument();

    await user.click(within(module).getByRole('tab', { name: /课前/ }));
    expect(within(module).getByText('课前准备已完成')).toBeVisible();
    expect(within(module).getByText('无需处理')).toBeVisible();
    expect(within(module).queryByText('正在上课，3 人迟到')).not.toBeInTheDocument();

    await user.click(within(module).getByRole('tab', { name: /课后.*建议 2 条/ }));
    expect(within(module).getByText('6 人尚未提交')).toBeVisible();
    expect(within(module).getByText('1 份待批改')).toBeVisible();

    await user.click(within(module).getByRole('tab', { name: /总结/ }));
    expect(within(module).getByText('课堂回顾')).toBeVisible();
    expect(within(module).queryByText('6 人尚未提交')).not.toBeInTheDocument();
    expect(within(module).queryByRole('button', { name: /自动切换/ })).not.toBeInTheDocument();
    expect(within(module).queryByText('当前班级的课程、学生与任务')).not.toBeInTheDocument();
  });

  it('collapses in place and starts an AI prompt from the selected stage', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await user.click(screen.getByRole('tab', { name: /课后/ }));
    await user.click(screen.getByRole('button', { name: /提醒学生：大数加减法/ }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ teacherRequest: '提醒交作业' }));
    await user.click(screen.getByText(/选一条建议，AI写消息，您确认后发送/));
    expect(screen.getByRole('button', { name: '展开 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('4项')).toBeVisible();
    expect(screen.getByText(/选一条建议，AI写消息，您确认后发送/)).toBeVisible();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: '收起 AI 消息助手建议' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tab', { name: /课后/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the current stage selected until the teacher chooses another tab', () => {
    vi.useFakeTimers();
    try {
      render(<Harness />);
      expect(screen.getByRole('tab', { name: /课中/ })).toHaveAttribute('aria-selected', 'true');
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByRole('tab', { name: /课中/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.queryByRole('button', { name: /自动切换/ })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a stage-specific empty state without creating a fake suggestion', () => {
    render(<TeachingDynamics
      snapshot={{ ...snapshot, currentStage: 'after', stages: snapshot.stages.map((stage) => stage.id === 'after' ? { ...stage, items: [] } : stage) }}
      expanded
      selectedStage="after"
      onExpandedChange={vi.fn()}
      onSelectedStageChange={vi.fn()}
      onAction={vi.fn()}
    />);

    expect(screen.getByText('当前没有待提醒或待处理的课后任务')).toBeVisible();
    expect(screen.getByRole('tab', { name: /课后.*已核对/ })).toHaveTextContent('课后已核');
  });
});
