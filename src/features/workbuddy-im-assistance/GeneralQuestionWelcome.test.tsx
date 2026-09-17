import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTRY_QUESTION_GUIDANCE } from '@domain/workbuddy/general-question-guidance';
import { GeneralQuestionWelcome } from './GeneralQuestionGuidance';

const questions = ENTRY_QUESTION_GUIDANCE.questions;
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe('entry guidance hands over to recommendations', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('skips a quick successful load and never reappears during the same visit', () => {
    const onQuestion = vi.fn(() => true);
    const view = render(<GeneralQuestionWelcome questions={questions} onQuestion={onQuestion} disabled={false} eligible recommendationsReady={false} />);
    advance(100);
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
    view.rerender(<GeneralQuestionWelcome questions={questions} onQuestion={onQuestion} disabled={false} eligible recommendationsReady />);
    advance(2000);
    view.rerender(<GeneralQuestionWelcome questions={questions} onQuestion={onQuestion} disabled={false} eligible recommendationsReady={false} />);
    advance(2000);
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
    expect(onQuestion).not.toHaveBeenCalled();
  });

  it('shows the introduction without the auxiliary line, gives it reading time, then removes its space', () => {
    const onQuestion = vi.fn(() => true);
    const view = render(<GeneralQuestionWelcome questions={questions} onQuestion={onQuestion} disabled={false} eligible recommendationsReady={false} />);
    advance(180);
    const guide = screen.getByLabelText('自由提问引导');
    expect(within(guide).getAllByRole('button')).toHaveLength(3);
    expect(within(guide).getByText('我是您的 AI 消息助手，可以帮您了解班级和课程的情况。您可以问：')).toBeVisible();
    expect(guide.querySelector('small')).toBeNull();
    view.rerender(<GeneralQuestionWelcome questions={questions} onQuestion={onQuestion} disabled={false} eligible recommendationsReady />);
    advance(899);
    expect(within(guide).getAllByRole('button')).toHaveLength(3);
    advance(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(view.container.querySelector('[inert]')).toBeInTheDocument();
    advance(450);
    expect(view.container).toBeEmptyDOMElement();
    advance(1000);
  });

  it('protects both pointer and keyboard interaction until both leave, while allowing the chosen question', () => {
    const onQuestion = vi.fn(() => true);
    const props = { questions, onQuestion, disabled: false, eligible: true };
    const view = render(<><GeneralQuestionWelcome {...props} recommendationsReady={false} /><button>其他入口</button></>);
    advance(180);
    const guide = screen.getByLabelText('自由提问引导');
    const question = within(guide).getAllByRole('button')[0]!;
    fireEvent.pointerEnter(guide);
    act(() => question.focus());
    view.rerender(<><GeneralQuestionWelcome {...props} recommendationsReady /><button>其他入口</button></>);
    advance(2000);
    expect(question).toHaveFocus();
    fireEvent.pointerLeave(guide);
    advance(2000);
    expect(question).toBeVisible();
    fireEvent.click(question);
    expect(onQuestion).toHaveBeenCalledExactlyOnceWith(questions[0]);
    act(() => screen.getByRole('button', { name: '其他入口' }).focus());
    advance(900);
    advance(450);
    expect(screen.queryByLabelText('自由提问引导')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '其他入口' })).toHaveFocus();
  });

  it('keeps guidance indefinitely without a usable card, and dismisses immediately when conversation takes over', () => {
    const props = { questions, onQuestion: vi.fn(() => true), disabled: false, recommendationsReady: false };
    const view = render(<GeneralQuestionWelcome {...props} eligible={false} />);
    advance(2000);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<GeneralQuestionWelcome {...props} eligible />);
    advance(180);
    fireEvent.pointerEnter(screen.getByLabelText('自由提问引导'));
    advance(60_000);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    view.rerender(<GeneralQuestionWelcome {...props} eligible={false} />);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<GeneralQuestionWelcome {...props} eligible />);
    advance(2000);
    expect(view.container).toBeEmptyDOMElement();
  });

});
