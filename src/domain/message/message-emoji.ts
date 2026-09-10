export const MESSAGE_UNICODE_EMOJI = Object.freeze([
  '😀', '😊', '😂', '🥰', '😎', '🤔',
  '👏', '👍', '💪', '🎉', '✨', '🔥',
  '✅', '📚', '✏️', '💡', '🧪', '🚀',
] as const);

export type MessageUnicodeEmoji = typeof MESSAGE_UNICODE_EMOJI[number];

export function isMessageUnicodeEmoji(value: string): value is MessageUnicodeEmoji {
  return MESSAGE_UNICODE_EMOJI.some((emoji) => emoji === value);
}
