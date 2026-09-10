export const RUNTIME_CONTEXT_START = '[[TEACHBUDDY_CONTEXT_V1]]';
export const RUNTIME_CONTEXT_END = '[[/TEACHBUDDY_CONTEXT_V1]]';
export const RUNTIME_TEACHER_REQUEST = '[[TEACHER_REQUEST]]';

export function teacherVisibleRuntimeText(value: string): string {
  if (!value.startsWith(`${RUNTIME_CONTEXT_START}\n`)) return value;
  const marker = `\n${RUNTIME_CONTEXT_END}\n${RUNTIME_TEACHER_REQUEST}\n`;
  const index = value.indexOf(marker);
  return index < 0 ? value : value.slice(index + marker.length);
}
