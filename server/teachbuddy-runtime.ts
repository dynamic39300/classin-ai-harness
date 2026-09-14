import { renderSolutionPng } from './solution-image-renderer.ts';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AgentRuntimeAdapter, RuntimeArtifact, RuntimeImageInput, RuntimeImageMediaType, RuntimeScope, RuntimeSession } from '../src/contracts/workbuddy/agent-runtime.ts';
import type { ConversationRunEvent } from '../src/contracts/workbuddy/conversation-run.ts';
import type { SessionFileFormat, SessionFileLibrary } from '../src/contracts/workbuddy/session-files.ts';
import { projectHarnessEvents } from './harness-event-projection.ts';
import { createLocalSessionFileLibrary, SessionFileError } from './session-file-library.ts';
import { teacherVisibleRuntimeText } from '../src/shared/runtime-context-format.ts';
import { parsePrivateImDemoSnapshot, type PrivateImDemoSnapshot } from '../src/contracts/workbuddy/private-im-demo.ts';

type Command = {
  text: string; at: string;
  imageSignature?: string;
  imageNames?: string[];
  state: 'pending' | 'accepted' | 'queued' | 'claimed' | 'delivered' | 'uncertain' | 'rejected' | 'cancelled';
  error?: string;
  afterSeq?: number;
};
type StoredSession = {
  scope: RuntimeScope; snapshot: RuntimeSession; commands: Record<string, Command>;
  startedAt?: number; cursor?: number;
  cancelRequested?: { reason: 'user' | 'timeout'; at: number; status?: 'pending' | 'settled' };
};
type Rpc = (method: string, payload: Record<string, unknown>, rpcId?: string) => Promise<unknown>;
type MaintainedRuntime = AgentRuntimeAdapter & {
  maintain(): Promise<void>;
  files: SessionFileLibrary;
  readPrivateImDemoContext(): PrivateImDemoSnapshot | null;
};
type HistoryEntry = { event: { seq: number; time: number; type: string; data: Record<string, unknown> } };
type Admission = { state: 'queued' | 'claimed' | 'delivered' | 'cancelled' | 'rejected'; messageId: string; sequence: number; turn?: number };
const RUN_LIMIT_MS = 10 * 60_000;
const ADMISSION_WAIT_MS = 15_000;
const UNCONFIRMED = '消息发送结果尚未确认，请重新连接核对记录后再继续，避免重复执行。';
const REJECTED = '消息未进入执行，请恢复输入并重新发送。';
const TIMED_OUT = '任务执行超过 10 分钟，已请求停止。已有内容仍然保留。';
const scopes = new Set(['ideal-full', 'classin-mvp', 'standalone-teacher']);
const identifier = /^[a-zA-Z0-9_-]{1,120}$/;
const artifactFormats = new Set<SessionFileFormat>(['markdown', 'html', 'text', 'json']);
const imageMediaTypes = new Set<RuntimeImageMediaType>(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_MESSAGE_REQUEST_BYTES = 28 * 1024 * 1024;
const MODEL_DEFAULT_RESTORE_SESSION = `tb-model-default-restore-${createHash('sha256').update(process.cwd()).digest('hex').slice(0, 12)}`;
const now = () => new Date().toISOString();
export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
class RuntimeError extends Error {
  constructor(message: string, readonly status = 502, readonly code?: string) { super(message); }
}

function validImageBytes(mediaType: RuntimeImageMediaType, bytes: Buffer): boolean {
  if (mediaType === 'image/png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mediaType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mediaType === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString('ascii'));
}

function normalizeRuntimeImages(value: unknown): { images: RuntimeImageInput[]; signature: string } {
  if (value === undefined) return { images: [], signature: createHash('sha256').update('[]').digest('hex') };
  if (!Array.isArray(value) || value.length > MAX_IMAGES) throw new RuntimeError(`每次最多上传 ${MAX_IMAGES} 张图片。`, 400);
  let totalBytes = 0;
  const images = value.map((entry, index): RuntimeImageInput => {
    if (!record(entry) || typeof entry.name !== 'string' || typeof entry.mediaType !== 'string'
      || !imageMediaTypes.has(entry.mediaType as RuntimeImageMediaType) || typeof entry.data !== 'string'
      || typeof entry.byteSize !== 'number' || !Number.isSafeInteger(entry.byteSize)) {
      throw new RuntimeError(`第 ${index + 1} 张图片格式不正确。`, 400);
    }
    if (!entry.data || entry.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(entry.data)) {
      throw new RuntimeError(`第 ${index + 1} 张图片内容不正确。`, 400);
    }
    const bytes = Buffer.from(entry.data, 'base64');
    if (bytes.length <= 0 || bytes.length > MAX_IMAGE_BYTES || bytes.length !== entry.byteSize
      || bytes.toString('base64') !== entry.data || !validImageBytes(entry.mediaType as RuntimeImageMediaType, bytes)) {
      throw new RuntimeError(`第 ${index + 1} 张图片内容不正确。`, 400);
    }
    totalBytes += bytes.length;
    if (totalBytes > MAX_IMAGE_TOTAL_BYTES) throw new RuntimeError('本次图片合计不能超过 20 MB。', 400);
    const leafName = [...(entry.name.split(/[\\/]/).at(-1) ?? '')]
      .filter((character) => character.charCodeAt(0) > 31 && character.charCodeAt(0) !== 127)
      .join('').trim().slice(0, 120);
    return { name: leafName || `图片-${index + 1}`, mediaType: entry.mediaType as RuntimeImageMediaType, byteSize: bytes.length, data: entry.data };
  });
  const digest = createHash('sha256');
  for (const image of images) digest.update(image.name).update('\0').update(image.mediaType).update('\0').update(image.data).update('\0');
  return { images, signature: digest.digest('hex') };
}

const imageSummary = (names: readonly string[]) => names.length
  ? `已附 ${names.length} 张图片${names.length <= 2 ? `（${names.join('、')}）` : ''}`
  : '';

async function selectImageModel(rpc: Rpc, sessionId: string) {
  const directory = await rpc('session.models', { sessionId });
  const directoryRecord = record(directory) ? directory : undefined;
  const currentSelection = directoryRecord && record(directoryRecord.current) ? directoryRecord.current : undefined;
  if (!directoryRecord || !currentSelection || typeof currentSelection.provider !== 'string'
    || typeof currentSelection.model !== 'string' || !Array.isArray(directoryRecord.groups)) {
    throw new RuntimeError('无法核对图片模型能力，请稍后重试。', 503);
  }
  const groups = directoryRecord.groups.filter(record);
  // rc2 session.models omits modalities; use the explicitly configured, verified route.
  const provider = 'company-gateway';
  const model = 'gemini-2.5-pro';
  const group = groups.find((entry) => entry.id === provider);
  const models = group && Array.isArray(group.models) ? group.models.filter(record) : [];
  if (!models.some((entry) => entry.id === model)) {
    throw new RuntimeError('识图模型尚未配置或不可用，请检查运行服务配置后重试。', 409);
  }
  if (currentSelection.provider === provider && currentSelection.model === model) return;
  await rpc('session.selectModel', { sessionId, provider, model });
  try {
    await rpc('session.create', { sessionId: MODEL_DEFAULT_RESTORE_SESSION, agentPreset: 'teachbuddy' });
    await rpc('session.selectModel', { sessionId: MODEL_DEFAULT_RESTORE_SESSION, provider: currentSelection.provider, model: currentSelection.model,
      ...(typeof currentSelection.reasoningEffort === 'string' ? { reasoningEffort: currentSelection.reasoningEffort } : {}) });
  } catch {
    throw new RuntimeError('图片模型已选择，但默认文本模型未能安全恢复，请稍后重试。', 503);
  }
}

export function createHarnessRpc(baseUrl = 'http://127.0.0.1:3080'): Rpc {
  return async (method, payload, rpcId = randomUUID()) => {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: baseUrl },
        body: JSON.stringify({ type: 'client-request', rpcId, method, payload }),
        signal: AbortSignal.timeout(method === 'session.prompt' ? 60_000 : 15_000),
      });
    } catch {
      throw new RuntimeError('连接中断或等待超时，请检查运行服务后重试。');
    }
    if (!response.ok) throw new RuntimeError('运行服务暂时不可用，请稍后重新连接。');
    const envelope: unknown = await response.json();
    if (!record(envelope) || envelope.rpcId !== rpcId || !record(envelope.result)) {
      throw new RuntimeError('运行服务返回了无法识别的响应。');
    }
    if (envelope.result.ok !== true) {
      const code = record(envelope.result.error) ? envelope.result.error.code : '';
      throw new RuntimeError(code === 'model-unavailable'
        ? '模型暂时不可用，请检查服务端模型与凭据配置。'
        : code === 'attachment-error' ? '当前模型未能接收图片，请检查视觉模型配置后重试。'
        : code === 'agent-busy' ? '当前任务仍在执行，请等待完成或先停止。'
          : code === 'session-not-found' ? '运行会话已不可用，请新建对话。'
            : '运行服务未接受请求，请检查配置后重试。', 409, typeof code === 'string' ? code : undefined);
    }
    return envelope.result.value;
  };
}

function atomicJson(path: string, value: unknown) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  renameSync(temp, path);
}

const ordinal = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

// Pinned apiproxy paginate(): beforeSeq is exclusive; hasMore requires another page.
// Complete replay is also required for normalized inbox splice coordinates.
async function readHistory(rpc: Rpc, sessionId: string): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  let beforeSeq: number | undefined;
  for (;;) {
    const page = await rpc('session.history', { sessionId, maxMessages: 100, ...(beforeSeq === undefined ? {} : { beforeSeq }) });
    if (!record(page) || !Array.isArray(page.events) || typeof page.hasMore !== 'boolean') throw new RuntimeError('无法读取完整会话记录。');
    let first = beforeSeq ?? Infinity;
    let previous = -1;
    for (const entry of page.events) {
      const event = record(entry) && record(entry.event) ? entry.event : undefined;
      if (!event || !ordinal(event.seq) || !ordinal(event.time) || event.time > 8.64e15
        || typeof event.type !== 'string' || !record(event.data) || event.seq <= previous
        || (beforeSeq !== undefined && event.seq >= beforeSeq)) throw new RuntimeError('会话分页记录不完整，请重新连接。');
      previous = event.seq;
      first = Math.min(first, event.seq);
      entries.push({ event: { seq: event.seq, time: event.time, type: event.type, data: event.data } });
    }
    if (!page.hasMore) break;
    if (!Number.isFinite(first) || first === 0 || first === beforeSeq) throw new RuntimeError('会话分页未能继续，请重新连接。');
    beforeSeq = first;
  }
  return entries.sort((a, b) => a.event.seq - b.event.seq);
}

/** Replay agent/src/inbox.ts: only outcome=canceled is a discard; other removals claim input for the open turn. */
function admissions(entries: HistoryEntry[]) {
  const queues: Record<'next-turn' | 'next-step', { id: string; commandId?: string; sequence: number }[]> = { 'next-turn': [], 'next-step': [] };
  const commands = new Map<string, Admission>();
  let openTurn: number | undefined;
  for (const { event } of entries) {
    const { data } = event;
    if (event.type === 'turn/start' && ordinal(data.turn)) openTurn = data.turn;
    if (event.type === 'agent/inbox/spliced') {
      if (data.target !== 'next-turn' && data.target !== 'next-step') throw new RuntimeError('无法核对消息队列。');
      const queue = queues[data.target];
      const removedCount = data.removedCount ?? 0;
      if (!ordinal(data.start) || !ordinal(removedCount) || data.start + removedCount > queue.length
        || !Array.isArray(data.inserted) || (data.outcome !== undefined && data.outcome !== 'canceled')) throw new RuntimeError('无法核对消息队列。');
      const inserted = data.inserted.map((message: unknown) => {
        if (!record(message) || typeof message.id !== 'string' || !record(message.source)) throw new RuntimeError('无法核对消息来源。');
        return { id: message.id, sequence: event.seq,
          commandId: message.source.kind === 'user' && typeof message.source.rpcId === 'string' ? message.source.rpcId : undefined };
      });
      for (const removed of queue.splice(data.start, removedCount, ...inserted)) {
        if (removed.commandId) commands.set(removed.commandId, {
          state: data.outcome === 'canceled' ? 'cancelled' : 'claimed', messageId: removed.id,
          sequence: removed.sequence, ...(openTurn === undefined ? {} : { turn: openTurn }),
        });
      }
      for (const message of inserted) if (message.commandId) commands.set(message.commandId, {
        state: 'queued', messageId: message.id, sequence: message.sequence,
      });
    }
    if (event.type === 'user/message' && data.role === 'user' && record(data.source)
      && data.source.kind === 'user' && typeof data.source.rpcId === 'string') {
      commands.set(data.source.rpcId, { state: 'delivered', messageId: typeof data.id === 'string' ? data.id : '', sequence: event.seq, turn: openTurn });
    }
    if (event.type === 'turn/end' && ordinal(data.turn) && record(data.reason)
      && ['completed', 'aborted', 'interrupted', 'blocked', 'error', 'max-tokens'].includes(String(data.reason.kind))) {
      for (const [id, command] of commands) {
        if (command.state === 'claimed' && command.turn === data.turn) commands.set(id, {
          ...command, state: data.reason.kind === 'aborted' || data.reason.kind === 'interrupted' ? 'cancelled' : 'rejected',
        });
      }
      if (openTurn === data.turn) openTurn = undefined;
    }
  }
  return { commands, openTurn };
}

export function createTeachBuddyRuntime(options: { root?: string; rpc?: Rpc; verifyHost?: boolean } = {}): MaintainedRuntime {
  const root = resolve(options.root ?? '.runtime');
  const rpc = options.rpc ?? createHarnessRpc();
  const sessionFiles = createLocalSessionFileLibrary(root);
  const locks = new Map<string, Promise<unknown>>();
  let modelMutation: Promise<unknown> = Promise.resolve();
  const sessionsDir = join(root, 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const sessionPath = (id: string) => {
    if (!identifier.test(id)) throw new RuntimeError('会话不存在。', 404);
    return join(sessionsDir, `${id}.json`);
  };
  const load = (scope: RuntimeScope, id: string): StoredSession => {
    if (!scopes.has(scope)) throw new RuntimeError('工作区不存在。', 400);
    const path = sessionPath(id);
    if (!existsSync(path)) throw new RuntimeError('会话不存在。', 404);
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (!record(value) || value.scope !== scope || !record(value.snapshot) || value.snapshot.id !== id || !record(value.commands)) {
      throw new RuntimeError('会话不可用或不属于当前工作区。', 404);
    }
    return value as StoredSession;
  };
  const save = (value: StoredSession) => atomicJson(sessionPath(value.snapshot.id), value);
  const exclusive = async <T>(id: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(id) ?? Promise.resolve();
    const task = previous.catch(() => {}).then(operation);
    locks.set(id, task);
    try { return await task; } finally { if (locks.get(id) === task) locks.delete(id); }
  };
  const modelExclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
    const task = modelMutation.catch(() => {}).then(operation);
    modelMutation = task;
    return task;
  };
  const artifacts = async (scope: RuntimeScope, id: string, sessionTitle: string, existing: readonly RuntimeArtifact[]): Promise<RuntimeArtifact[]> => {
    const directory = join(root, 'artifacts', id);
    const merged = new Map(existing.map((item) => [item.id, item]));
    const created = new Map<string, string>();
    if (existsSync(directory)) {
      for (const name of readdirSync(directory).filter((name) => name.endsWith('.json'))) {
        const path = join(directory, name);
        let value: unknown;
        try { value = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
        if (!record(value) || typeof value.id !== 'string' || !identifier.test(value.id)
          || typeof value.title !== 'string' || typeof value.content !== 'string' || value.content.length > 120_000
          || value.version !== 1) continue;
        const format = typeof value.format === 'string' && artifactFormats.has(value.format as SessionFileFormat)
          ? value.format as SessionFileFormat : 'markdown';
        const createdAt = typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt))
          ? value.createdAt : statSync(path).mtime.toISOString();
        created.set(value.id, createdAt);
        merged.set(value.id, {
          id: value.id,
          title: value.title,
          content: value.content,
          fileRef: '',
          fileName: typeof value.fileName === 'string' ? value.fileName : value.title,
          format,
          mediaType: '',
          byteSize: Buffer.byteLength(value.content, 'utf8'),
          createdAt,
          version: 1,
          status: 'draft',
        });
        const savedPath = join(root, 'saved', scope, id, `${value.id}.json`);
        if (existsSync(savedPath)) {
          let saved: unknown;
          try { saved = JSON.parse(readFileSync(savedPath, 'utf8')); } catch { saved = null; }
          if (record(saved) && record(saved.artifact) && saved.artifact.id === value.id
            && saved.artifact.version === 1 && saved.artifact.content === value.content
            && record(saved.artifact.receipt) && typeof saved.artifact.receipt.id === 'string') {
            merged.set(value.id, { ...merged.get(value.id)!, status: 'saved', receipt: saved.artifact.receipt as RuntimeArtifact['receipt'] });
          }
        }
      }
    }
    const materialized: RuntimeArtifact[] = [];
    for (const item of merged.values()) {
      if (!identifier.test(item.id) || typeof item.title !== 'string' || typeof item.content !== 'string'
        || !artifactFormats.has(item.format) || !Number.isSafeInteger(item.version) || item.version < 1) continue;
      const createdAt = Number.isFinite(Date.parse(item.createdAt)) ? item.createdAt : created.get(item.id) ?? now();
      const file = await sessionFiles.materialize({
        scope,
        sessionId: id,
        sessionTitle,
        artifactId: item.id,
        title: item.title,
        fileName: item.fileName,
        content: item.content,
        format: item.format,
        version: item.version,
        status: item.status,
        createdAt,
      });
      materialized.push({
        ...item,
        fileRef: file.id,
        fileName: file.name,
        mediaType: file.mediaType,
        byteSize: file.byteSize,
        createdAt: file.createdAt,
      });
    }
    return materialized;
  };
  const sync = async (scope: RuntimeScope, id: string): Promise<RuntimeSession> => {
    const current = load(scope, id);
    const observe = async () => {
      const history = await readHistory(rpc, id);
      const listing = await rpc('session.list', {});
      if (!record(listing) || !Array.isArray(listing.items)) throw new RuntimeError('无法读取运行会话。');
      const live = listing.items.find((item: unknown) => record(item) && item.sessionId === id);
      return { history, ...admissions(history), running: record(live) && live.running === true };
    };
    const ownQueued = (facts: Awaited<ReturnType<typeof observe>>) => [...facts.commands.entries()]
      .filter(([commandId, fact]) => Object.hasOwn(current.commands, commandId) && fact.state === 'queued');
    let facts = await observe();
    const age = Date.now() - (current.startedAt ?? Date.now());
    if (age >= RUN_LIMIT_MS && (facts.running || facts.openTurn !== undefined || ownQueued(facts).length > 0)) {
      current.cancelRequested ??= { reason: 'timeout', at: Date.now() };
    }
    if (current.cancelRequested && current.cancelRequested.status !== 'settled') {
      // Persist intent before either write RPC. Lost responses resume by observing facts, never by resending a prompt.
      save(current);
      if (ownQueued(facts).length > 0) {
        // Official create with the same id resumes a cold inbox without waking its driver.
        await rpc('session.create', { sessionId: id, cwd: join(root, 'workspace'), agentPreset: 'teachbuddy' });
        facts = await observe();
        for (const [, queued] of ownQueued(facts)) {
          try {
            await rpc('session.updateQueue', { sessionId: id, itemId: queued.messageId, action: { kind: 'remove' } });
          } catch (error) {
            // A concurrent claim is resolved by the next history/list read and active-turn cancellation.
            if (!(error instanceof RuntimeError && error.code === 'queue-item-not-found')) throw error;
          }
        }
        facts = await observe();
      }
      if (facts.running) {
        try { await rpc('session.cancel', { sessionId: id }); } catch (error) {
          // Restart can detach the agent between list and cancel; cold history supplies interrupted closers.
          if (!(error instanceof RuntimeError && error.code === 'session-not-found')) throw error;
        }
        facts = await observe();
      }
    }
    const projection = projectHarnessEvents(id, facts.history);
    current.cursor = facts.history.at(-1)?.event.seq ?? -1;
    for (const [commandId, command] of Object.entries(current.commands)) {
      const fact = facts.commands.get(commandId);
      if (fact) {
        command.state = fact.state;
        command.error = fact.state === 'rejected' ? command.error ?? REJECTED : undefined;
      } else if ((command.state === 'pending' || command.state === 'accepted')
        && (Date.now() - Date.parse(command.at) >= ADMISSION_WAIT_MS || current.cancelRequested)) {
        command.state = 'uncertain';
      }
    }
    const commands = Object.values(current.commands);
    const uncertain = commands.some(command => command.state === 'uncertain');
    const unconfirmed = commands.some(command => ['pending', 'accepted', 'uncertain'].includes(command.state));
    const pendingExecution = commands.some(command => command.state === 'queued' || command.state === 'claimed');
    const activeExecution = facts.running || facts.openTurn !== undefined || pendingExecution;
    if (activeExecution) current.startedAt ??= Date.parse(commands.at(-1)?.at ?? now());
    else if (!unconfirmed || age >= RUN_LIMIT_MS) {
      // Unobserved admissions remain uncertain and block replay, but do not poll forever after the reconciliation window.
      delete current.startedAt;
      if (!unconfirmed && current.cancelRequested) current.cancelRequested.status = 'settled';
    }
    const pending: ConversationRunEvent[] = Object.entries(current.commands).flatMap(([commandId, command]) => {
      if (command.state === 'delivered') return [];
      return [{ id: `${id}:command:${commandId}`, runRef: id,
        sequence: facts.commands.get(commandId)?.sequence ?? (command.afterSeq ?? current.cursor ?? -1) + 0.5,
        occurredAt: command.at, updatedAt: command.at,
        actor: 'teacher', kind: 'teacher_message',
        state: command.state === 'uncertain' || command.state === 'rejected' ? 'failed'
          : command.state === 'cancelled' ? 'cancelled' : command.state === 'claimed' ? 'running' : 'queued',
        title: '您', summary: [teacherVisibleRuntimeText(command.text), imageSummary(command.imageNames ?? [])].filter(Boolean).join('\n'), objectRefs: [], allowedCommands: [] }];
    });
    const awaitingAdmission = unconfirmed && !current.cancelRequested && current.startedAt !== undefined && age < ADMISSION_WAIT_MS;
    const latest = commands.at(-1);
    const status = activeExecution || awaitingAdmission ? 'running' : uncertain || latest?.state === 'rejected' ? 'failed'
      : latest?.state === 'cancelled' ? 'stopped' : projection.status ?? 'idle';
    const error = uncertain ? UNCONFIRMED : latest?.state === 'rejected' ? latest.error ?? REJECTED
      : current.cancelRequested?.reason === 'timeout' ? TIMED_OUT : projection.error;
    const next: RuntimeSession = {
      ...current.snapshot, status, error,
      failureCode: status === 'failed' ? projection.failureCode : undefined,
      events: [...projection.events, ...pending].sort((a, b) => a.sequence - b.sequence).map((event, sequence) => ({ ...event, sequence })),
      artifacts: await artifacts(scope, id, current.snapshot.title, current.snapshot.artifacts),
    };
    if (JSON.stringify(next) !== JSON.stringify(current.snapshot)) {
      current.snapshot = { ...next, updatedAt: now() };
    }
    save(current);
    return current.snapshot;
  };

  const adapter: MaintainedRuntime = {
    async maintain() {
      for (const name of readdirSync(sessionsDir).filter(name => name.endsWith('.json'))) {
        try {
          const raw: unknown = JSON.parse(readFileSync(join(sessionsDir, name), 'utf8'));
          if (!record(raw) || typeof raw.scope !== 'string' || !scopes.has(raw.scope)) continue;
          const scope = raw.scope as RuntimeScope;
          const id = name.slice(0, -5);
          const current = load(scope, id);
          const unfinished = current.startedAt !== undefined || current.snapshot.status === 'running'
            || Object.values(current.commands).some(command => command.state === 'queued' || command.state === 'claimed'
              || (['pending', 'accepted', 'uncertain'].includes(command.state) && Date.now() - Date.parse(command.at) < RUN_LIMIT_MS));
          if (unfinished) await adapter.read(scope, id);
        } catch {
          // Offline or unreadable sessions must not block maintenance of the other sessions.
        }
      }
    },
    async health() {
      try {
        const host = await rpc('host.describe', {});
        if (options.verifyHost !== false && (!record(host) || host.cwd !== join(root, 'workspace'))) {
          return { status: 'offline', message: '请启动此项目专用的 TeachBuddy 运行服务。' };
        }
        const roster = await rpc('agentPreset.list', {});
        if (!record(roster) || !Array.isArray(roster.presets) || roster.presets.length !== 1
          || !record(roster.presets[0]) || roster.presets[0].id !== 'teachbuddy') {
          return { status: 'offline', message: '教学运行配置不匹配，请重新启动此项目的运行服务。' };
        }
        const data = await rpc('credentials.describe', { refs: ['DEEPSEEK_API_KEY'] });
        const credential = record(data) && record(data.credentials) ? data.credentials.DEEPSEEK_API_KEY : null;
        return record(credential) && credential.configured === true
          ? { status: 'ready', message: '已连接' }
          : { status: 'unconfigured', message: '尚未配置模型凭据，请在本机 .env 中配置 DEEPSEEK_API_KEY 并重启运行服务。' };
      } catch { return { status: 'offline', message: '运行服务尚未连接，请启动服务后重新连接。' }; }
    },
    async list(scope) {
      if (!scopes.has(scope)) throw new RuntimeError('工作区不存在。', 400);
      const sessions: RuntimeSession[] = [];
      for (const name of readdirSync(sessionsDir).filter((candidate) => candidate.endsWith('.json'))) {
        try {
          const current = load(scope, name.slice(0, -5));
          const nextArtifacts = await artifacts(scope, current.snapshot.id, current.snapshot.title, current.snapshot.artifacts);
          if (JSON.stringify(nextArtifacts) !== JSON.stringify(current.snapshot.artifacts)) {
            current.snapshot = { ...current.snapshot, artifacts: nextArtifacts };
            save(current);
          }
          sessions.push(current.snapshot);
        } catch {
          // One corrupt or unreadable Session must not hide the rest of the scope.
          continue;
        }
      }
      return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async create(scope) {
      if (!scopes.has(scope)) throw new RuntimeError('工作区不存在。', 400);
      const health = await adapter.health();
      if (health.status !== 'ready') throw new RuntimeError(health.message, 503);
      const id = `tb-${randomUUID()}`;
      const created = await modelExclusive(async () => {
        const session = await rpc('session.create', { sessionId: id, cwd: join(root, 'workspace'), agentPreset: 'teachbuddy' });
        await rpc('session.selectModel', { sessionId: id, provider: 'deepseek-official', model: 'deepseek-v4-flash' });
        return session;
      });
      if (!record(created) || created.sessionId !== id) throw new RuntimeError('无法创建运行会话。');
      const snapshot: RuntimeSession = { id, title: '新对话', status: 'idle', updatedAt: now(), events: [], artifacts: [] };
      save({ scope, snapshot, commands: {} });
      return snapshot;
    },
    read: (scope, id) => exclusive(id, () => sync(scope, id)),
    send: (scope, id, text, commandId, rawImages) => exclusive(id, async () => {
      const current = load(scope, id);
      const teacherText = typeof text === 'string' ? teacherVisibleRuntimeText(text).trim() : '';
      const { images, signature: imageSignature } = normalizeRuntimeImages(rawImages);
      if (!identifier.test(commandId) || typeof text !== 'string' || (!teacherText && images.length === 0) || teacherText.length > 4000 || text.length > 12_000) {
        throw new RuntimeError('请输入 1 到 4000 字的消息，或添加图片。', 400);
      }
      const prior = Object.hasOwn(current.commands, commandId) ? current.commands[commandId] : undefined;
      if (prior) {
        if (prior.text !== text || prior.imageSignature !== imageSignature) throw new RuntimeError('请求标识与原消息不一致。', 409);
        if (prior.state === 'rejected') throw new RuntimeError(prior.error ?? REJECTED, 409);
        return sync(scope, id);
      }
      if (teacherText.startsWith('/')) throw new RuntimeError('请用自然语言描述教学任务。', 400);
      const fresh = await sync(scope, id);
      if (fresh.status === 'running') throw new RuntimeError('任务正在执行，请等待完成或先停止。', 409);
      if (Object.values(load(scope, id).commands).some((command) => command.state === 'uncertain')) {
        throw new RuntimeError('上一条消息结果尚未确认，请新建对话或重新连接核对。', 409);
      }
      const health = await adapter.health();
      if (health.status !== 'ready') throw new RuntimeError(health.message, 503);
      const state = load(scope, id);
      const at = now();
      Object.defineProperty(state.commands, commandId, { value: { text, at, state: 'pending', afterSeq: state.cursor ?? -1, imageSignature, imageNames: images.map(({ name }) => name) }, enumerable: true, writable: true, configurable: true });
      state.startedAt = Date.now();
      delete state.cancelRequested;
      state.snapshot = { ...fresh, title: Object.keys(state.commands).length === 1 ? (teacherText || imageSummary(images.map(({ name }) => name))).slice(0, 40) : fresh.title, status: 'running', error: undefined, updatedAt: at };
      save(state);
      try {
        if (images.length) await modelExclusive(() => selectImageModel(rpc, id));
        const admission = rpc('session.prompt', { sessionId: id, mode: 'queue', content: [
          ...(text ? [{ type: 'text', text }] : []),
          ...images.map(({ mediaType, data, name }) => ({ type: 'image', mediaType, data, name })),
        ], clientTimeZone: 'Asia/Shanghai' }, commandId);
        // session.prompt resolves when the model turn settles, which can take longer than an HTTP request.
        // Release the per-session lock after dispatch so reads can observe queue/turn events while it runs.
        void admission.then(
          () => exclusive(id, async () => {
            const latest = load(scope, id);
            const command = latest.commands[commandId];
            if (!command || !['pending', 'accepted', 'uncertain'].includes(command.state)) return;
            command.state = 'accepted';
            delete command.error;
            if (latest.snapshot.status === 'failed' && latest.snapshot.error === UNCONFIRMED) {
              latest.snapshot = { ...latest.snapshot, status: 'running', error: undefined, updatedAt: now() };
            }
            save(latest);
          }),
          (error) => exclusive(id, async () => {
            // A timed-out response can still have admitted the command. Reconcile history before
            // classifying the write so a completed vision turn is never replaced by a false failure.
            try { await sync(scope, id); } catch { /* persisted command state remains the fallback */ }
            const latest = load(scope, id);
            const command = latest.commands[commandId];
            if (!command || ['queued', 'claimed', 'delivered', 'cancelled'].includes(command.state)) return;
            command.state = error instanceof RuntimeError && error.status === 409 ? 'rejected' : 'uncertain';
            command.error = error instanceof RuntimeError ? error.message : UNCONFIRMED;
            latest.snapshot = { ...latest.snapshot, status: 'failed', error: command.error, updatedAt: now() };
            if (command.state === 'rejected') delete latest.startedAt;
            save(latest);
          }),
        ).catch(() => {
          // Maintenance will reconcile the durable pending command if local persistence is briefly unavailable.
        });
      } catch (error) {
        state.commands[commandId]!.state = error instanceof RuntimeError && error.status === 409 ? 'rejected' : 'uncertain';
        state.commands[commandId]!.error = error instanceof RuntimeError ? error.message : UNCONFIRMED;
        state.snapshot = { ...state.snapshot, status: 'failed', error: state.commands[commandId]!.error };
        if (state.commands[commandId]!.state === 'rejected') {
          delete state.startedAt;
          save(state);
          throw error;
        }
      }
      save(state);
      return state.snapshot;
    }),
    cancel: (scope, id) => exclusive(id, async () => {
      const current = load(scope, id);
      if (!current.cancelRequested || current.cancelRequested.status === 'settled') current.cancelRequested = { reason: 'user', at: Date.now() };
      save(current);
      return sync(scope, id);
    }),
    approve: (scope, id, artifactId, version, commandId) => exclusive(id, async () => {
      if (!identifier.test(commandId)) throw new RuntimeError('保存请求无效。', 400);
      const current = load(scope, id);
      const items = await artifacts(scope, id, current.snapshot.title, current.snapshot.artifacts);
      const artifact = items.find((item) => item.id === artifactId);
      if (!artifact) throw new RuntimeError('未找到产物。', 404);
      if (artifact.version !== version) throw new RuntimeError('产物版本已变化，请重新审阅。', 409);
      if (items.some((item) => item.receipt?.id === commandId && item.id !== artifactId)) {
        throw new RuntimeError('保存请求标识与原产物不一致。', 409);
      }
      if (artifact.status === 'saved') {
        current.snapshot = { ...current.snapshot, artifacts: items };
        save(current);
        return current.snapshot;
      }
      const at = now();
      const saved: RuntimeArtifact = { ...artifact, status: 'saved', receipt: { id: commandId, approvedAt: at, savedAt: at, truthLabel: 'local-runtime' } };
      // The approved immutable snapshot is the local writeback; no ClassIn publication occurs.
      atomicJson(join(root, 'saved', scope, id, `${artifact.id}.json`), {
        artifact: saved,
        proposedAction: { id: `save-${artifact.id}`, type: 'save_local_teaching_artifact', artifactId, version },
        approval: { id: commandId, decision: 'approved', artifactId, version, at },
        receipt: saved.receipt,
      });
      current.snapshot = { ...current.snapshot, updatedAt: at, artifacts: items.map((item) => item.id === artifactId ? saved : item) };
      current.snapshot = { ...current.snapshot, artifacts: await artifacts(scope, id, current.snapshot.title, current.snapshot.artifacts) };
      save(current);
      return current.snapshot;
    }),
    readPrivateImDemoContext() {
      const path = join(root, 'private', 'im-demo-context.json');
      if (!existsSync(path)) return null;
      let value: unknown;
      try { value = JSON.parse(readFileSync(path, 'utf8')); } catch {
        throw new RuntimeError('本机真实消息上下文无法读取。', 503);
      }
      const snapshot = parsePrivateImDemoSnapshot(value);
      if (!snapshot) throw new RuntimeError('本机真实消息上下文未通过安全校验。', 503);
      return snapshot;
    },
    files: sessionFiles,
  };
  return adapter;
}

export function maintainRuntime(adapter: AgentRuntimeAdapter & { maintain?: () => Promise<void> }): () => void {
  let active = false;
  const timer = setInterval(() => {
    if (active) return;
    active = true;
    void (async () => {
      if (adapter.maintain) return adapter.maintain();
      for (const scope of scopes) {
        for (const session of await adapter.list(scope as RuntimeScope)) {
          if (session.status === 'running') await adapter.read(scope as RuntimeScope, session.id).catch(() => {});
        }
      }
    })().catch(() => {}).finally(() => { active = false; });
  }, 10_000);
  timer.unref();
  return () => clearInterval(timer);
}

async function readBody(request: IncomingMessage, maxBytes = 32_000): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maxBytes) throw new RuntimeError('请求内容过长。', 413);
    chunks.push(buffer);
  }
  let value: unknown;
  try { value = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')); } catch { throw new RuntimeError('请求格式不正确。', 400); }
  if (!record(value)) throw new RuntimeError('请求格式不正确。', 400);
  return value;
}

export function runtimeMiddleware(adapter: AgentRuntimeAdapter & {
  files?: SessionFileLibrary;
  readPrivateImDemoContext?: () => PrivateImDemoSnapshot | null;
}) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url ?? '';
    if (!path.startsWith('/api/teachbuddy/')) return next();
    const respond = (status: number, value: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(value));
    };
    void (async () => {
      const url = new URL(path, 'http://localhost');
      const origin = request.headers.origin;
      if (origin && new URL(origin).host !== request.headers.host) throw new RuntimeError('请求来源不被允许。', 403);
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new RuntimeError('请求来源不被允许。', 403);
      const method = request.method;
      if (method !== 'GET' && method !== 'POST') throw new RuntimeError('不支持的请求。', 405);
      if (method === 'POST' && !request.headers['content-type']?.startsWith('application/json')) {
        throw new RuntimeError('请求格式不正确。', 415);
      }
      if (method === 'GET' && url.pathname === '/api/teachbuddy/health') return adapter.health();
      const body = method === 'POST' ? await readBody(request, url.pathname.endsWith('/messages') ? MAX_MESSAGE_REQUEST_BYTES : 32_000) : {};
      const scope = method === 'POST' ? body.scope : url.searchParams.get('scope');
      if (typeof scope !== 'string' || !scopes.has(scope)) throw new RuntimeError('工作区不存在。', 400);
      const selectedScope = scope as RuntimeScope;
      if (url.pathname === '/api/teachbuddy/im-demo-context') {
        if (method !== 'GET' || selectedScope !== 'ideal-full' || !adapter.readPrivateImDemoContext) {
          throw new RuntimeError('接口不存在。', 404);
        }
        const snapshot = adapter.readPrivateImDemoContext();
        if (!snapshot) throw new RuntimeError('本机真实消息上下文尚未准备。', 404);
        return snapshot;
      }
      if (url.pathname === '/api/teachbuddy/files') {
        if (method !== 'GET' || !adapter.files) throw new RuntimeError('接口不存在。', 404);
        const sessions = await adapter.list(selectedScope);
        return adapter.files.list(selectedScope, sessions.map((session) => ({ sessionId: session.id, sessionTitle: session.title })));
      }
      const fileMatch = url.pathname.match(/^\/api\/teachbuddy\/files\/(sf-[a-f0-9]{40})(?:\/(download))?$/);
      if (fileMatch) {
        if (method !== 'GET' || !adapter.files) throw new RuntimeError('接口不存在。', 404);
        const content = await adapter.files.read(selectedScope, fileMatch[1]!);
        if (fileMatch[2] === 'download') {
          const fallback = content.file.name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
          response.writeHead(200, {
            'Content-Type': content.file.mediaType,
            'Content-Length': String(Buffer.byteLength(content.content, 'utf8')),
            'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(content.file.name)}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
          });
          response.end(content.content);
          return undefined;
        }
        return content;
      }
      if (url.pathname === '/api/teachbuddy/sessions') return method === 'GET' ? adapter.list(selectedScope) : adapter.create(selectedScope);
      const solutionMatch = url.pathname.match(/^\/api\/teachbuddy\/sessions\/([a-zA-Z0-9_-]+)\/artifacts\/([a-zA-Z0-9_-]+)\/image$/);
      if (method === 'GET' && solutionMatch) {
        const session = await adapter.read(selectedScope, solutionMatch[1]!);
        const artifact = session.artifacts.find(item => item.id === solutionMatch[2]);
        if (!artifact || artifact.format !== 'json' || !artifact.fileName.endsWith('.solution.json')) throw new RuntimeError('解题图片不存在。', 404);
        let png: Buffer;
        try { png = await renderSolutionPng(artifact.content); }
        catch { throw new RuntimeError('图片排版未完成，请重试；若内容过长，请让 AI 精简步骤后重新生成。', 422); }
        response.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': png.length, 'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `${url.searchParams.get('download') === '1' ? 'attachment' : 'inline'}; filename="solution.png"` });
        response.end(png);
        return undefined;
      }
      const match = url.pathname.match(/^\/api\/teachbuddy\/sessions\/([a-zA-Z0-9_-]+)(?:\/(messages|cancel|artifacts\/([a-zA-Z0-9_-]+)\/approve))?$/);
      if (!match) throw new RuntimeError('接口不存在。', 404);
      const [, id, action, artifactId] = match;
      if (method === 'GET' && !action) return adapter.read(selectedScope, id!);
      if (method === 'POST' && action === 'messages' && typeof body.text === 'string' && typeof body.commandId === 'string') {
        return adapter.send(selectedScope, id!, body.text, body.commandId, body.images as readonly RuntimeImageInput[] | undefined);
      }
      if (method === 'POST' && action === 'cancel') return adapter.cancel(selectedScope, id!);
      if (method === 'POST' && artifactId && typeof body.version === 'number' && typeof body.commandId === 'string') {
        return adapter.approve(selectedScope, id!, artifactId, body.version, body.commandId);
      }
      throw new RuntimeError('请求参数不正确。', 400);
    })().then((value) => { if (!response.writableEnded) respond(200, value); }).catch((error: unknown) => {
      respond(error instanceof RuntimeError || error instanceof SessionFileError ? error.status : 500,
        { error: error instanceof RuntimeError || error instanceof SessionFileError ? error.message : '读取任务失败，请重新连接。' });
    });
  };
}
