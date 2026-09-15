import { describe, expect, it } from 'vitest';
import { projectImMessageDeliveryIntent } from './im-message-delivery-intent';

describe('projectImMessageDeliveryIntent', () => {
  it('treats teaching-dynamic actions as message-producing tasks', () => {
    expect(projectImMessageDeliveryIntent('查看当前课堂情况', 'teaching-dynamic')).toBe('draft');
  });

  it.each([
    '帮我写一条通知发到班级群里',
    '拟一条实验提醒',
    '请提醒未交作业的学生',
    '帮我润色这条回复',
    'Draft a message for the parents',
  ])('recognizes an explicit message request: %s', (request) => {
    expect(projectImMessageDeliveryIntent(request)).toBe('draft');
  });

  it.each([
    '这个情况怎么提醒更合适？',
    '回复家长时应该怎么说？',
    'How should I reply to the parent?',
  ])('keeps an exploratory request as an optional conversion: %s', (request) => {
    expect(projectImMessageDeliveryIntent(request)).toBe('suggest');
  });

  it.each([
    '我们接下来要上的课程都有什么？分别列出课程名称和时间',
    '分析一下这次作业的完成情况',
    '总结学生最近的学习表现',
    '这条消息表达了什么意思？',
  ])('does not turn an informational request into a message draft: %s', (request) => {
    expect(projectImMessageDeliveryIntent(request)).toBe('none');
  });

  it('inherits the selected numbered option when the prior answer offered a message task', () => {
    const priorAnswer = [
      '你可以继续处理：',
      '1. 回复李明关于第5题的疑问',
      '2. 提醒李明等人完成未提交的作业/测验',
      '3. 其他内容',
      '请说一声，我来生成对应的消息草稿。',
    ].join('\n');
    expect(projectImMessageDeliveryIntent('2', 'freeform', priorAnswer)).toBe('draft');
    expect(projectImMessageDeliveryIntent('第二项', 'freeform', priorAnswer)).toBe('draft');
    expect(projectImMessageDeliveryIntent('3', 'freeform', priorAnswer)).toBe('none');
  });
});

it('treats parent wording as a draft intent without selecting a destination', () => {
  expect(projectImMessageDeliveryIntent('根据李明的学情报告，帮我写一段给家长的话')).toBe('draft');
});
