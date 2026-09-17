import type { ConversationRunEvent } from '../src/contracts/workbuddy/conversation-run.ts';

type Projection = {
  events: ConversationRunEvent[];
  status?: 'idle' | 'running' | 'stopped' | 'failed';
  error?: string;
  failureCode?: 'vision-permission' | 'model-history-invalid' | 'model-rate-limited' | 'context-window-exceeded';
};
type RawEvent = { seq: number; time: number; type: string; data: Record<string, unknown> };
type Step = {
  blocks: Map<number, { type: string; text: string; complete: boolean }>;
  final: boolean;
  state: ConversationRunEvent['state'];
};

const GENERATION_ERROR = '生成未能完成，请稍后重试。';
const MODEL_BUSY_ERROR = '模型服务当前繁忙，请稍后重试。已经生成的内容会继续保留。';
const VISION_PERMISSION_ERROR = '当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。';
const TOOL_ERROR = '工具执行失败，请重试。';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function index(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function textContent(content: unknown): string {
  if (!Array.isArray(content)) return '';
  return content.map((value: unknown) => {
    const block = record(value);
    return block?.type === 'text' && typeof block.text === 'string' ? block.text : '';
  }).join('');
}

function userContentSummary(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const text = textContent(content);
  const names = content.map(record).filter((block) => {
    const attachment = record(block?.attachment);
    return block?.type === 'image' && typeof attachment?.attachmentId === 'string';
  }).map((block, index) => {
    const attachment = record(block?.attachment);
    return typeof attachment?.name === 'string' && attachment.name.trim() ? attachment.name.trim() : `图片 ${index + 1}`;
  });
  const imageLabel = names.length ? `已附 ${names.length} 张图片${names.length <= 2 ? `（${names.join('、')}）` : ''}` : '';
  return [text, imageLabel].filter(Boolean).join('\n');
}

function rawEvent(entry: unknown): RawEvent | undefined {
  const event = record(record(entry)?.event);
  const data = record(event?.data);
  if (!event || !data || !index(event.seq) || !index(event.time)
    || event.time > 8.64e15 || typeof event.type !== 'string') return undefined;
  return { seq: event.seq, time: event.time, type: event.type, data };
}

function generationError(raw: RawEvent): { error: string; failureCode?: 'vision-permission' | 'model-history-invalid' | 'model-rate-limited' | 'context-window-exceeded' } {
  const chunk = record(raw.data.chunk);
  const reason = record(chunk?.reason) ?? record(raw.data.reason);
  const failure = record(reason?.failure) ?? record(reason?.error);
  const message = typeof failure?.message === 'string' ? failure.message : '';
  if (failure?.code === 'CONTEXT_WINDOW_EXCEEDED') {
    return { error: '本轮对话内容过长，历史消息仍保留。请重新发送本次具体要求；如需分析之前的图片，请重新附图。', failureCode: 'context-window-exceeded' };
  }
  if (failure?.code === 'TRANSPORT') {
    return { error: 'AI 服务连接失败，请检查服务连接后重试。已输入的内容和历史消息仍保留。' };
  }
  if (/missing.*thought_signature|thought_signature.*missing/iu.test(message)) {
    return { error: '此前生成记录无法继续，请重新添加图片并发送，系统会自动开启新的处理记录。', failureCode: 'model-history-invalid' };
  }
  if (/\b429\b|rate.?limit|serving capacity|throttling_error/iu.test(message)) {
    return { error: MODEL_BUSY_ERROR, failureCode: 'model-rate-limited' };
  }
  return /not allowed to access model|does not support image input/iu.test(message) && /vision|image/iu.test(message)
    ? { error: VISION_PERMISSION_ERROR, failureCode: 'vision-permission' }
    : { error: GENERATION_ERROR };
}

/**
 * Projects a complete session.history entries snapshot from the pinned Harness
 * session/src/types.ts and llm/src/types.ts protocols. Recompute on each read;
 * this is not a delta reducer. Raw views, reasoning and failure payloads stay private.
 * IDs and timestamps are deterministic; absent lifecycle evidence omits status.
 */
export function projectHarnessEvents(sessionId: string, entries: unknown[]): Projection {
  const projection: Projection = { events: [] };
  const rows = new Map<string, ConversationRunEvent>();
  const steps = new Map<string, Step>();
  const rowTurns = new Map<string, number>();
  const seen = new Set<number>();
  const history = entries.map(rawEvent).filter((event): event is RawEvent => !!event)
    .sort((a, b) => a.seq - b.seq);

  function put(key: string, raw: RawEvent, fields: Pick<ConversationRunEvent, 'actor' | 'kind' | 'state' | 'title' | 'summary'>,
    turn?: number, stepRef?: string, objectRefs: ConversationRunEvent['objectRefs'] = []) {
    const previous = rows.get(key);
    const timestamp = new Date(raw.time).toISOString();
    rows.set(key, {
      id: previous?.id ?? `${sessionId}:${key}`,
      runRef: sessionId,
      sequence: previous?.sequence ?? raw.seq,
      occurredAt: previous?.occurredAt ?? timestamp,
      updatedAt: timestamp,
      ...fields,
      ...(stepRef === undefined ? {} : { stepRef }),
      objectRefs,
      allowedCommands: [],
    });
    if (turn !== undefined) rowTurns.set(key, turn);
  }

  function fail(raw: RawEvent, turn: number) {
    projection.status = 'failed';
    const failure = generationError(raw);
    if (failure.failureCode || !projection.failureCode) {
      projection.error = failure.error;
      if (failure.failureCode) projection.failureCode = failure.failureCode;
      else delete projection.failureCode;
    }
    const error = projection.error ?? failure.error;
    projection.error = error;
    put(`error:${turn}`, raw, {
      actor: 'system', kind: 'error', state: 'failed', title: '生成失败', summary: error,
    }, turn);
  }

  function settle(raw: RawEvent, turn: number, state: ConversationRunEvent['state']) {
    for (const [key, row] of rows) {
      if (rowTurns.get(key) !== turn || row.state !== 'running') continue;
      rows.set(key, { ...row, state, updatedAt: new Date(raw.time).toISOString() });
    }
  }

  for (const raw of history) {
    if (seen.has(raw.seq)) continue;
    seen.add(raw.seq);
    const { data } = raw;
    if (raw.type === 'user/message') {
      if (data.role !== 'user' || record(data.source)?.kind !== 'user') continue;
      const summary = userContentSummary(data.content);
      if (summary) put(`user:${typeof data.id === 'string' ? data.id : raw.seq}`, raw, {
        actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary,
      });
      continue;
    }
    if (!index(data.turn)) continue;
    const turn = data.turn;
    if (raw.type === 'turn/start') {
      projection.status = 'running';
      delete projection.error;
      delete projection.failureCode;
      continue;
    }
    if (raw.type === 'turn/end') {
      const reason = record(data.reason)?.kind;
      if (reason === 'completed') {
        projection.status = 'idle';
        delete projection.error;
        delete projection.failureCode;
        settle(raw, turn, 'completed');
      } else if (reason === 'error') {
        fail(raw, turn);
        settle(raw, turn, 'failed');
      } else if (reason === 'max-tokens') {
        projection.status = 'failed';
        projection.error = '本次生成达到长度限制，请缩短要求或让 AI 分步生成。';
        delete projection.failureCode;
        settle(raw, turn, 'failed');
      } else if (reason === 'aborted' || reason === 'interrupted' || reason === 'blocked') {
        projection.status = 'stopped';
        delete projection.error;
        delete projection.failureCode;
        settle(raw, turn, 'stopped');
      }
      continue;
    }
    if (!index(data.step)) continue;
    const stepRef = `turn:${turn}:step:${data.step}`;
    const key = `assistant:${stepRef}`;
    if (raw.type === 'step/start') {
      projection.status = 'running';
      delete projection.error;
      delete projection.failureCode;
      continue;
    }
    if (raw.type === 'assistant/chunk' || raw.type === 'assistant/message') {
      let step = steps.get(stepRef);
      if (!step) {
        step = { blocks: new Map(), final: false, state: 'running' };
        steps.set(stepRef, step);
      }
      let summary: string;
      if (raw.type === 'assistant/message') {
        const message = record(data.message);
        if (message?.role !== 'assistant' || !Array.isArray(message.content)) continue;
        summary = textContent(message.content);
        step.final = true;
        step.state = data.interrupted === true ? 'stopped' : 'completed';
      } else {
        const chunk = record(data.chunk);
        if (!chunk || step.final) continue;
        // agent.ts retries provider failures inside the same step with a fresh assembler.
        if (step.state === 'failed' && index(chunk.index)
          && (chunk.type === 'block-start' || chunk.type === 'text-delta'
            || chunk.type === 'reasoning-delta' || chunk.type === 'tool-call-delta')) {
          step.blocks.clear();
          step.state = 'running';
          rows.delete(`error:${turn}`);
          projection.status = 'running';
          delete projection.error;
          delete projection.failureCode;
          const previous = rows.get(key);
          if (previous) rows.set(key, { ...previous, summary: '', state: 'running', updatedAt: new Date(raw.time).toISOString() });
        }
        if (chunk.type === 'finish') {
          const reason = record(chunk.reason)?.kind;
          if (reason === 'error' || reason === 'aborted') {
            step.state = 'failed';
            fail(raw, turn);
          } else if (reason === 'stop' || reason === 'tool-calls') {
            step.state = 'completed';
          } else if (reason === 'max-tokens') {
            step.state = 'stopped';
          } else continue;
        } else if (index(chunk.index)) {
          const block = step.blocks.get(chunk.index);
          if (chunk.type === 'block-start' && typeof chunk.blockType === 'string') {
            if (!block) step.blocks.set(chunk.index, { type: chunk.blockType, text: '', complete: false });
          } else if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
            if (!block?.complete && (!block || block.type === 'text')) {
              step.blocks.set(chunk.index, { type: 'text', text: (block?.text ?? '') + chunk.text, complete: false });
            }
          } else if (chunk.type === 'block-end') {
            const complete = record(chunk.block);
            if (block?.complete || !complete || typeof complete.type !== 'string') continue;
            if (complete.type === 'text' && typeof complete.text !== 'string') continue;
            step.blocks.set(chunk.index, {
              type: complete.type, text: complete.type === 'text' ? String(complete.text) : '', complete: true,
            });
          } else continue;
        } else continue;
        summary = [...step.blocks.values()].map(block => block.text).join('');
      }
      if (summary) {
        put(key, raw, { actor: 'agent', kind: 'process', state: step.state, title: 'TeachBuddy', summary }, turn, stepRef);
        projection.status ??= step.state === 'stopped' ? 'stopped' : 'running';
      } else if (step.final) rows.delete(key);
      continue;
    }
    if (raw.type === 'tool/call') {
      if (typeof data.callId !== 'string' || !data.callId || typeof data.name !== 'string' || !data.name) continue;
      put(`tool:${stepRef}:${data.callId}`, raw, {
        actor: 'tool', kind: 'capability_call', state: 'running',
        title: data.name === 'create_teaching_draft' ? '生成教学文稿' : data.name === 'read_classin_context' ? '读取测试课程数据' : '执行任务', summary: '正在执行',
      }, turn, stepRef, [{ type: 'capability', id: data.name }]);
      projection.status ??= 'running';
    } else if (raw.type === 'tool/result') {
      const message = record(data.message);
      const source = record(message?.source);
      if (message?.role !== 'user' || source?.kind !== 'tool' || typeof source.callId !== 'string'
        || !Array.isArray(message.content)) continue;
      const result = message.content.map(record).find(block => block?.type === 'tool-result' && block.toolCallId === source.callId);
      if (!result || !Array.isArray(result.content)) continue;
      const toolKey = `tool:${stepRef}:${source.callId}`;
      const previous = rows.get(toolKey);
      // Only dispatched calls become capabilities; streamed proposals are not execution.
      if (!previous) continue;
      const failed = result.isError === true || record(data.error) !== undefined;
      put(toolKey, raw, {
        actor: 'tool', kind: 'capability_call', state: failed ? 'failed' : 'completed',
        title: previous.title,
        summary: failed ? TOOL_ERROR : previous.objectRefs.some(ref => ref.id === 'create_teaching_draft')
          ? '教学文稿已生成，等待审阅。' : previous.objectRefs.some(ref => ref.id === 'read_classin_context') ? '已读取测试课程证据。' : '任务已完成。',
      }, turn, stepRef, previous.objectRefs);
    }
  }
  projection.events = [...rows.values()].filter(row => row.summary !== '').sort((a, b) => a.sequence - b.sequence);
  return projection;
}
