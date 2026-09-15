import { expect, it } from 'vitest';
import { formatImAssistantIdentity } from './im-assistant-identity';

it('updates legacy introductions without renaming unrelated references or code', () => {
  expect(formatImAssistantIdentity('王老师你好！我是你的 AI 教学助手 TeachBuddy，可以帮你整理消息。')).toBe('王老师你好！我是你的 AI消息助手，可以帮你整理消息。');
  expect(formatImAssistantIdentity('我是 ClassIn TeachBuddy。')).toBe('我是 AI消息助手。');
  const unrelated = '你可以在 TeachBuddy 工作台查看。\n`我是 TeachBuddy`\n```text\n我是 TeachBuddy\n```';
  expect(formatImAssistantIdentity(unrelated)).toBe(unrelated);
});
