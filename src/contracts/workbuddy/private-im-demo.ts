export type PrivateImDemoEntry = Readonly<{
  id: string;
  authorRole: 'teacher' | 'student-family' | 'system';
  authorName: string;
  body: string;
  sentAt: string;
  kind: 'text' | 'system';
}>;

export type PrivateImDemoSnapshot = Readonly<{
  version: string;
  capturedAt: string;
  dataWindow: string;
  truthLabel: 'read-only-business-data';
  source: 'dw-hunter-local';
  thread: Readonly<{
    id: 'class-dw-expression-lab';
    classId: 'dw-expression-lab';
    title: string;
    subtitle: string;
    avatar: string;
    updatedAt: string;
    memberCount: number;
    entries: readonly PrivateImDemoEntry[];
  }>;
  context: Readonly<{
    courseType: number;
    courseStatus: number;
    classCount: number;
    messageCount: number;
    activeSenderCount: number;
    teachingTopics: readonly string[];
    interactionPatterns: readonly string[];
    evidenceBoundary: string;
  }>;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function isoDate(value: unknown): value is string {
  return text(value, 64) && Number.isFinite(Date.parse(value));
}

function count(value: unknown, max = 1_000_000): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
}

function textList(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => text(item, maxLength));
}

export function parsePrivateImDemoSnapshot(value: unknown): PrivateImDemoSnapshot | null {
  if (!record(value) || value.truthLabel !== 'read-only-business-data' || value.source !== 'dw-hunter-local'
    || !text(value.version, 120) || !isoDate(value.capturedAt) || !text(value.dataWindow, 120)
    || !record(value.thread) || !record(value.context)) return null;

  const thread = value.thread;
  const context = value.context;
  if (thread.id !== 'class-dw-expression-lab' || thread.classId !== 'dw-expression-lab'
    || !text(thread.title, 120) || !text(thread.subtitle, 160) || !text(thread.avatar, 8)
    || !isoDate(thread.updatedAt) || !count(thread.memberCount, 10_000)
    || !Array.isArray(thread.entries) || thread.entries.length === 0 || thread.entries.length > 50
    || !count(context.courseType, 10_000) || !count(context.courseStatus, 10_000)
    || !count(context.classCount, 100_000) || !count(context.messageCount, 1_000_000)
    || !count(context.activeSenderCount, 100_000)
    || !textList(context.teachingTopics, 12, 80)
    || !textList(context.interactionPatterns, 12, 160)
    || !text(context.evidenceBoundary, 500)) return null;

  const ids = new Set<string>();
  for (const entry of thread.entries) {
    if (!record(entry) || !text(entry.id, 120) || ids.has(entry.id)
      || !['teacher', 'student-family', 'system'].includes(String(entry.authorRole))
      || !text(entry.authorName, 80) || !text(entry.body, 2_000) || !isoDate(entry.sentAt)
      || !['text', 'system'].includes(String(entry.kind))) return null;
    ids.add(entry.id);
  }

  return value as PrivateImDemoSnapshot;
}
