import type { SessionFile, SessionFileCatalogAdapter, SessionFileContent, SessionFileGroup } from '@contracts/workbuddy/session-files';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = (value: unknown, choices: readonly string[]) => typeof value === 'string' && choices.includes(value);

function isFile(value: unknown): value is SessionFile {
  return object(value)
    && ['id', 'artifactId', 'sessionId', 'sessionTitle', 'name', 'extension', 'format', 'mediaType', 'createdAt', 'updatedAt', 'preview'].every((key) => typeof value[key] === 'string')
    && /^sf-[a-f0-9]{40}$/.test(String(value.id))
    && oneOf(value.extension, ['md', 'html', 'txt', 'json'])
    && oneOf(value.format, ['markdown', 'html', 'text', 'json'])
    && oneOf(value.preview, ['text', 'html'])
    && oneOf(value.status, ['draft', 'saved'])
    && value.truthLabel === 'local-runtime'
    && typeof value.byteSize === 'number' && Number.isSafeInteger(value.byteSize) && value.byteSize >= 0
    && typeof value.version === 'number' && Number.isSafeInteger(value.version) && value.version > 0;
}

function isGroup(value: unknown): value is SessionFileGroup {
  return object(value) && typeof value.sessionId === 'string' && typeof value.sessionTitle === 'string'
    && typeof value.updatedAt === 'string' && Array.isArray(value.files) && value.files.every(isFile);
}

function isContent(value: unknown): value is SessionFileContent {
  return object(value) && isFile(value.file) && typeof value.content === 'string';
}

export class SessionFileHttpError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'SessionFileHttpError';
  }
}

export function createHttpSessionFileCatalog(fetcher: typeof fetch = (...args) => fetch(...args)): SessionFileCatalogAdapter {
  async function request<T>(path: string, validate: (value: unknown) => value is T): Promise<T> {
    try {
      const response = await fetcher(`/api/teachbuddy${path}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' },
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new SessionFileHttpError(object(value) && typeof value.error === 'string' ? value.error : '读取文件失败，请重试。', response.status);
      if (!validate(value)) throw new SessionFileHttpError('文件服务返回的数据不完整，请重试。');
      return value;
    } catch (error) {
      if (error instanceof SessionFileHttpError) throw error;
      throw new SessionFileHttpError('暂时无法连接文件服务，请检查本机服务后重试。');
    }
  }

  return {
    list: (scope) => request(`/files?${new URLSearchParams({ scope })}`, (value): value is readonly SessionFileGroup[] => Array.isArray(value) && value.every(isGroup)),
    read: (scope, fileId) => request(`/files/${encodeURIComponent(fileId)}?${new URLSearchParams({ scope })}`, isContent),
    downloadUrl: (scope, fileId) => `/api/teachbuddy/files/${encodeURIComponent(fileId)}/download?${new URLSearchParams({ scope })}`,
  };
}
