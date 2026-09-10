import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import type { ConversationRunEvent, ConversationRunEventState } from '@contracts/workbuddy/conversation-run';

export type AnalysisProcessStatus = 'running' | 'needs_information' | 'stopped' | 'failed' | 'completed';
export type AnalysisProcessStepState = 'queued' | 'running' | 'needs_information' | 'completed' | 'failed' | 'stopped';

export type AnalysisContextEvidence = Readonly<{
  snapshotRef: string;
  label: string;
  summary: string;
  evidenceLabels: readonly string[];
  excludedSensitiveCount: number;
}>;

export type AnalysisProcessStep = Readonly<{
  id: string;
  sourceEventRefs: readonly string[];
  label: string;
  summary: string;
  state: AnalysisProcessStepState;
  evidenceLabels: readonly string[];
  detailLines: readonly string[];
  elapsedMs?: number;
}>;

export type AnalysisProcessProjection = Readonly<{
  runRef: string;
  status: AnalysisProcessStatus;
  startedAt: string;
  elapsedMs: number;
  defaultExpanded: boolean;
  steps: readonly AnalysisProcessStep[];
}>;

export type AnalysisProcessTurn = Readonly<{
  id: string;
  events: readonly ConversationRunEvent[];
}>;

type Input = Readonly<{
  session: Pick<RuntimeSession, 'id' | 'status' | 'events'> & Readonly<{ updatedAt?: string }>;
  now?: number;
  context?: AnalysisContextEvidence | null;
}>;

export function splitAnalysisProcessTurns(events: readonly ConversationRunEvent[]): readonly AnalysisProcessTurn[] {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  const turns: Array<{ id: string; events: ConversationRunEvent[] }> = [];
  for (const event of ordered) {
    if (event.kind === 'teacher_message' || turns.length === 0) turns.push({ id: event.id, events: [] });
    turns.at(-1)?.events.push(event);
  }
  return turns;
}

const labels: Partial<Record<ConversationRunEvent['kind'], string>> = {
  teacher_message: '已接收要求',
  goal_understood: '已理解任务',
  clarification_request: '需要补充信息',
  clarification_submitted: '已收到补充信息',
  context_confirmed: '已核对上下文',
  plan: '正在组织执行方案',
  artifact: '已生成可审阅产物',
  proposed_action: '已准备待确认操作',
  approval: '已记录教师确认',
  receipt: '已取得执行回执',
  evaluation: '已复核结果',
  error: '执行遇到问题',
};

function time(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bounded(value: string, fallback: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim() || fallback;
  return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
}

function stateOf(state: ConversationRunEventState): AnalysisProcessStepState {
  if (state === 'requires_teacher_input') return 'needs_information';
  if (state === 'failed') return 'failed';
  if (state === 'stopped' || state === 'cancelled') return 'stopped';
  if (state === 'queued' || state === 'superseded') return 'queued';
  return state;
}

function eventLabel(event: ConversationRunEvent): string {
  if (event.actor === 'tool' || event.actor === 'skill' || event.kind === 'capability_call') {
    return event.detail?.capabilityLabel || event.title || '正在调用所需能力';
  }
  if (event.kind === 'process' && event.actor === 'agent') {
    if (event.state === 'running') return '正在生成回答';
    if (event.state === 'failed') return '回答生成失败';
    if (event.state === 'stopped' || event.state === 'cancelled') return '回答生成已停止';
    return '回答已生成';
  }
  return labels[event.kind] || event.title || '处理运行事件';
}

function eventSummary(event: ConversationRunEvent): string {
  if (event.kind === 'teacher_message') return '已记录本轮教师要求，后续步骤将引用此输入。';
  if (event.kind === 'process' && event.actor === 'agent') {
    return event.state === 'running'
      ? 'TeachBuddy 正在根据当前要求整理可交付内容。'
      : 'TeachBuddy 已形成当前轮次的回答。';
  }
  if (event.actor === 'tool' || event.actor === 'skill' || event.kind === 'capability_call') {
    return bounded(event.detail?.purpose || event.detail?.outputSummary || event.summary, '已记录一次真实能力调用。');
  }
  return bounded(event.summary, event.title || '已记录运行阶段。');
}

function eventDetails(event: ConversationRunEvent): readonly string[] {
  if (!event.detail) return [];
  return [
    event.detail.inputSummary && `输入：${event.detail.inputSummary}`,
    event.detail.outputSummary && `输出：${event.detail.outputSummary}`,
    event.detail.elapsedLabel && `耗时：${event.detail.elapsedLabel}`,
    event.detail.excludedSensitiveCount > 0 && `已排除 ${event.detail.excludedSensitiveCount} 项敏感信息`,
  ].filter((line): line is string => Boolean(line));
}

function processStatus(session: Input['session']): AnalysisProcessStatus {
  if (session.status === 'running') {
    return session.events.some(({ state }) => state === 'requires_teacher_input') ? 'needs_information' : 'running';
  }
  if (session.status === 'failed' || session.events.some(({ state }) => state === 'failed')) return 'failed';
  if (session.status === 'stopped') return 'stopped';
  return session.events.some(({ state }) => state === 'requires_teacher_input') ? 'needs_information' : 'completed';
}

export function projectAnalysisProcess({ session, now = Date.now(), context }: Input): AnalysisProcessProjection | null {
  if (session.events.length === 0) {
    if (session.status !== 'running') return null;
    const startedAt = time(session.updatedAt ?? '') ?? now;
    return {
      runRef: session.id,
      status: 'running',
      startedAt: new Date(startedAt).toISOString(),
      elapsedMs: Math.max(0, now - startedAt),
      defaultExpanded: true,
      steps: [{ id: `waiting-${session.id}`, sourceEventRefs: [], label: '正在理解你的要求', summary: '请求已经收到，TeachBuddy 正在开始处理。', state: 'running', evidenceLabels: [], detailLines: [] }],
    };
  }
  const ordered = [...session.events].sort((left, right) => left.sequence - right.sequence);
  const firstTime = ordered.map(({ occurredAt }) => time(occurredAt)).find((value): value is number => value !== null) ?? now;
  const stableEnd = ordered.reduce((latest, event) => Math.max(latest, time(event.updatedAt) ?? latest), firstTime);
  const status = processStatus(session);
  const lastTeacherId = [...ordered].reverse().find(({ kind }) => kind === 'teacher_message')?.id;
  const steps: AnalysisProcessStep[] = [];

  for (const event of ordered) {
    steps.push({
      id: event.id,
      sourceEventRefs: [event.id],
      label: eventLabel(event),
      summary: eventSummary(event),
      state: stateOf(event.state),
      evidenceLabels: [...(event.detail?.contextLabels ?? []), ...event.objectRefs.map(({ type }) => type)],
      detailLines: eventDetails(event),
      ...(time(event.updatedAt) !== null && time(event.occurredAt) !== null
        ? { elapsedMs: Math.max(0, (time(event.updatedAt) ?? 0) - (time(event.occurredAt) ?? 0)) }
        : {}),
    });
    if (context && event.id === lastTeacherId) {
      steps.push({
        id: `context-${context.snapshotRef}`,
        sourceEventRefs: [],
        label: context.label,
        summary: bounded(context.summary, '已捕获当前业务上下文。'),
        state: 'completed',
        evidenceLabels: context.evidenceLabels,
        detailLines: context.excludedSensitiveCount > 0 ? [`已排除 ${context.excludedSensitiveCount} 项敏感信息`] : [],
      });
    }
  }

  let latestTeacherIndex = -1;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index]?.kind === 'teacher_message') {
      latestTeacherIndex = index;
      break;
    }
  }
  const hasCurrentRuntimeEvent = latestTeacherIndex >= 0 && ordered.slice(latestTeacherIndex + 1).some(({ actor }) => actor !== 'teacher');
  if (status === 'running' && !hasCurrentRuntimeEvent) {
    const teacher = ordered[latestTeacherIndex];
    steps.push({
      id: `waiting-${teacher?.id ?? session.id}`,
      sourceEventRefs: [],
      label: '正在理解你的要求',
      summary: '请求已经收到，TeachBuddy 正在开始处理。',
      state: 'running',
      evidenceLabels: [],
      detailLines: [],
    });
  }

  if (status === 'failed' && !steps.some(({ state }) => state === 'failed')) {
    steps.push({ id: `failed-${session.id}`, sourceEventRefs: [], label: '分析未完成', summary: 'Runtime 已记录本次执行失败，可结合页面错误提示重试或调整要求。', state: 'failed', evidenceLabels: [], detailLines: [] });
  }
  if (status === 'stopped' && !steps.some(({ state }) => state === 'stopped')) {
    steps.push({ id: `stopped-${session.id}`, sourceEventRefs: [], label: '分析已停止', summary: 'Runtime 已停止本次执行，已完成步骤仍保留。', state: 'stopped', evidenceLabels: [], detailLines: [] });
  }

  return {
    runRef: session.id,
    status,
    startedAt: new Date(firstTime).toISOString(),
    elapsedMs: Math.max(0, (status === 'running' || status === 'needs_information' ? now : stableEnd) - firstTime),
    defaultExpanded: status === 'running' || status === 'needs_information' || status === 'failed',
    steps,
  };
}
