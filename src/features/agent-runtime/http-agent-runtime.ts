import type { AgentRuntimeAdapter, RuntimeHealth, RuntimeSession } from '@contracts/workbuddy/agent-runtime';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const oneOf = (value: unknown, values: readonly string[]) => typeof value === 'string' && values.includes(value);
const stringFields = (value: JsonObject, keys: string[]) => keys.every((key) => typeof value[key] === 'string');

function isSession(value: unknown): value is RuntimeSession {
  return object(value) && stringFields(value, ['id', 'title', 'updatedAt'])
    && value.id !== '' && value.id !== '.' && value.id !== '..'
    && oneOf(value.status, ['idle', 'running', 'stopped', 'failed'])
    && (value.error === undefined || typeof value.error === 'string')
    && Array.isArray(value.events) && value.events.every((event: unknown) => object(event)
      && stringFields(event, ['id', 'runRef', 'occurredAt', 'updatedAt', 'title', 'summary'])
      && Number.isSafeInteger(event.sequence)
      && oneOf(event.actor, ['teacher', 'agent', 'skill', 'tool', 'system'])
      && oneOf(event.kind, ['teacher_message', 'goal_understood', 'clarification_request', 'clarification_submitted', 'context_confirmed', 'plan', 'process', 'capability_call', 'artifact', 'proposed_action', 'approval', 'receipt', 'evaluation', 'error', 'system'])
      && oneOf(event.state, ['queued', 'running', 'requires_teacher_input', 'completed', 'failed', 'stopped', 'cancelled', 'superseded'])
      && (event.stepRef === undefined || typeof event.stepRef === 'string')
      && strings(event.allowedCommands)
      && Array.isArray(event.objectRefs) && event.objectRefs.every((ref: unknown) => object(ref)
        && typeof ref.id === 'string' && oneOf(ref.type, ['context_snapshot', 'artifact', 'action', 'approval', 'receipt', 'evaluation', 'capability'])
        && (ref.version === undefined || typeof ref.version === 'string'))
      && (event.detail === undefined || (object(event.detail)
        && stringFields(event.detail, ['capabilityLabel', 'purpose', 'inputSummary', 'outputSummary', 'elapsedLabel'])
        && strings(event.detail.contextLabels) && typeof event.detail.excludedSensitiveCount === 'number')))
    && Array.isArray(value.artifacts) && value.artifacts.every((artifact: unknown) => object(artifact)
      && stringFields(artifact, ['id', 'title', 'content', 'fileRef', 'fileName', 'format', 'mediaType', 'createdAt'])
      && oneOf(artifact.format, ['markdown', 'html', 'text', 'json'])
      && typeof artifact.byteSize === 'number' && Number.isSafeInteger(artifact.byteSize) && artifact.byteSize >= 0
      && typeof artifact.version === 'number' && Number.isSafeInteger(artifact.version) && artifact.version > 0
      && oneOf(artifact.status, ['draft', 'saved'])
      && (artifact.receipt === undefined || (object(artifact.receipt)
        && stringFields(artifact.receipt, ['id', 'approvedAt', 'savedAt']) && artifact.receipt.truthLabel === 'local-runtime')));
}

function isHealth(value: unknown): value is RuntimeHealth {
  return object(value) && oneOf(value.status, ['ready', 'unconfigured', 'offline']) && typeof value.message === 'string';
}

export class RuntimeHttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'RuntimeHttpError';
  }
}

export function createHttpAgentRuntime(fetcher: typeof fetch = (...args) => fetch(...args)): AgentRuntimeAdapter {
  async function request<T>(path: string, validate: (value: unknown) => value is T, body?: object): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetcher(`/api/teachbuddy${path}`, {
        method: body ? 'POST' : 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new RuntimeHttpError(object(data) && typeof data.error === 'string' ? data.error : `请求失败（${response.status}），请重试。`, response.status);
      }
      if (!validate(data)) throw new RuntimeHttpError('服务返回的数据不完整，请重新连接。');
      return data;
    } catch (error) {
      if (error instanceof RuntimeHttpError) throw error;
      throw new RuntimeHttpError(body
        ? '连接中断或请求超时，操作结果尚未确认。请重新连接，或重试原请求。'
        : '暂时无法连接 TeachBuddy，请检查本机服务后重试。');
    } finally {
      clearTimeout(timeout);
    }
  }
  const sessionPath = (id: string) => `/sessions/${encodeURIComponent(id)}`;
  return {
    health: () => request('/health', isHealth),
    list: (scope) => request(`/sessions?${new URLSearchParams({ scope })}`, (value): value is readonly RuntimeSession[] => Array.isArray(value) && value.every(isSession)),
    create: (scope) => request('/sessions', isSession, { scope }),
    read: (scope, id) => request(`${sessionPath(id)}?${new URLSearchParams({ scope })}`, isSession),
    send: (scope, id, text, commandId) => request(`${sessionPath(id)}/messages`, isSession, { scope, text, commandId }),
    cancel: (scope, id) => request(`${sessionPath(id)}/cancel`, isSession, { scope }),
    approve: (scope, id, artifactId, version, commandId) => request(`${sessionPath(id)}/artifacts/${encodeURIComponent(artifactId)}/approve`, isSession, { scope, version, commandId }),
  };
}
