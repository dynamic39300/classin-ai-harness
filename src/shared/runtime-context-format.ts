export const RUNTIME_CONTEXT_START = '[[TEACHBUDDY_CONTEXT_V1]]';
export const RUNTIME_CONTEXT_END = '[[/TEACHBUDDY_CONTEXT_V1]]';
export const RUNTIME_TEACHER_REQUEST = '[[TEACHER_REQUEST]]';

export function teacherVisibleRuntimeText(value: string): string {
  if (!value.startsWith(`${RUNTIME_CONTEXT_START}\n`)) return value;
  const marker = `\n${RUNTIME_CONTEXT_END}\n${RUNTIME_TEACHER_REQUEST}\n`;
  const index = value.indexOf(marker);
  if (index < 0) return value;
  try {
    const context = JSON.parse(value.slice(RUNTIME_CONTEXT_START.length + 1, index)) as { visibleTeacherRequest?: unknown };
    if (typeof context.visibleTeacherRequest === 'string' && context.visibleTeacherRequest.trim()) return context.visibleTeacherRequest.trim();
  } catch { /* Preserve compatibility with existing envelopes if metadata is malformed. */ }
  return value.slice(index + marker.length);
}
