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

function Harness({ onAction = vi.fn(), initialAutoRotate = false }: Readonly<{ onAction?: (action: { label: string; teacherRequest: string }) => void; initialAutoRotate?: boolean }>) {
  const [expanded, setExpanded] = useState(true);
  const [selectedStage, setSelectedStage] = useState<null | 'before' | 'during' | 'after' | 'summary'>(null);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);
  return <TeachingDynamics snapshot={snapshot} expanded={expanded} selectedStage={selectedStage} autoRotate={autoRotate} onExpandedChange={setExpanded} onSelectedStageChange={setSelectedStage} onAutoRotateChange={setAutoRotate} onAction={onAction} />;
}

describe('TeachingDynamics', () => {
  it('uses the current phase as a tab and switches one content card in place', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const module = screen.getByRole('region', { name: '教学动态' });
    expect(within(module).getByRole('tab', { name: /课中.*建议 1 条/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(module).getByText('正在上课，3 人迟到')).toBeVisible();
    expect(within(module).queryByText('6 人尚未提交')).not.toBeInTheDocument();

    await user.click(within(module).getByRole('tab', { name: /课后.*建议 2 条/ }));
    expect(within(module).getByText('6 人尚未提交')).toBeVisible();
    expect(within(module).getByText('1 份待批改')).toBeVisible();
    expect(within(module).queryByText('正在上课，3 人迟到')).not.toBeInTheDocument();
    expect(within(module).getByRole('button', { name: '继续自动切换' })).toBeVisible();
  });

  it('collapses in place and starts an AI prompt from the selected stage', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<Harness onAction={onAction} />);
    await user.click(screen.getByRole('tab', { name: /课后/ }));
    await user.click(screen.getByRole('button', { name: /提醒学生：三年级数学/ }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ teacherRequest: '提醒交作业' }));
    await user.click(screen.getByRole('button', { name: '教学动态' }));
    expect(screen.getByRole('button', { name: '教学动态｜4 项建议' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('auto-rotates stages and stops rotating after a manual tab choice', async () => {
    vi.useFakeTimers();
    try {
      render(<Harness initialAutoRotate />);
      expect(screen.getByRole('tab', { name: /课中/ })).toHaveAttribute('aria-selected', 'true');
      act(() => vi.advanceTimersByTime(8_000));
      expect(screen.getByRole('tab', { name: /课后/ })).toHaveAttribute('aria-selected', 'true');
      act(() => screen.getByRole('tab', { name: /课前/ }).click());
      expect(screen.getByRole('button', { name: '继续自动切换' })).toBeVisible();
      act(() => vi.advanceTimersByTime(16_000));
      expect(screen.getByRole('tab', { name: /课前/ })).toHaveAttribute('aria-selected', 'true');
    } finally {
      vi.useRealTimers();
    }
  });
});
