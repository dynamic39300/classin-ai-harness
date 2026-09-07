import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import type { RuntimeScope } from '../src/contracts/workbuddy/agent-runtime.ts';
import type {
  GeneratedSessionFile,
  SessionFile,
  SessionFileContent,
  SessionFileFormat,
  SessionFileGroup,
  SessionFileLibrary,
} from '../src/contracts/workbuddy/session-files.ts';

const SAFE_ID = /^[a-zA-Z0-9_-]{1,120}$/;
const SAFE_FILE_ID = /^sf-[a-f0-9]{40}$/;
const MAX_FILE_BYTES = 512 * 1024;
const scopes = new Set<RuntimeScope>(['ideal-full', 'classin-mvp', 'standalone-teacher']);
const formats: Readonly<Record<SessionFileFormat, Readonly<{
  extension: SessionFile['extension'];
  mediaType: string;
  preview: SessionFile['preview'];
}>>> = Object.freeze({
  markdown: { extension: 'md', mediaType: 'text/markdown; charset=utf-8', preview: 'text' },
  html: { extension: 'html', mediaType: 'text/html; charset=utf-8', preview: 'html' },
  text: { extension: 'txt', mediaType: 'text/plain; charset=utf-8', preview: 'text' },
  json: { extension: 'json', mediaType: 'application/json; charset=utf-8', preview: 'text' },
});

type StoredFile = SessionFile & Readonly<{ diskName: string }>;
type Manifest = Readonly<{
  schemaVersion: 1;
  sessionId: string;
  sessionTitle: string;
  updatedAt: string;
  files: readonly StoredFile[];
}>;

export class SessionFileError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = 'SessionFileError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validateScope(scope: RuntimeScope) {
  if (!scopes.has(scope)) throw new SessionFileError('工作区不存在。', 400);
}

function validateId(value: string, label: string) {
  if (!SAFE_ID.test(value)) throw new SessionFileError(`${label}无效。`, 400);
}

function ensureRealDirectory(path: string) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new SessionFileError('文件存储目录不可用。');
  }
}

function atomicJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}

function boundedText(path: string): string {
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new SessionFileError('文件不可读取。', 409);
    return readFileSync(descriptor, 'utf8');
  } finally {
    closeSync(descriptor);
  }
}

function writeImmutable(path: string, content: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const descriptor = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(descriptor, content, 'utf8');
    fsyncSync(descriptor);
    try {
      linkSync(temporary, path);
    } catch (error) {
      if (!isRecord(error) || error.code !== 'EEXIST') throw error;
      if (boundedText(path) !== content) throw new SessionFileError('同一产物版本的内容发生冲突。', 409);
    }
  } finally {
    closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function hasUnsafeFileNameCharacter(value: string): boolean {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 || '/\\:*?"<>|'.includes(character);
  });
}

function safeBaseName(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .replaceAll(/[\s\S]/g, (character) => hasUnsafeFileNameCharacter(character) ? ' ' : character)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return [...(normalized || 'TeachBuddy 产物')].slice(0, 96).join('');
}

function displayName(input: GeneratedSessionFile, extension: SessionFile['extension']): string {
  const requested = input.fileName?.trim() || input.title;
  const withoutKnownExtension = requested.replace(/\.(?:md|markdown|html?|txt|json)$/i, '');
  return `${safeBaseName(withoutKnownExtension)}.${extension}`;
}

function publicFile(file: StoredFile): SessionFile {
  return Object.freeze({
    id: file.id,
    artifactId: file.artifactId,
    sessionId: file.sessionId,
    sessionTitle: file.sessionTitle,
    name: file.name,
    extension: file.extension,
    format: file.format,
    mediaType: file.mediaType,
    byteSize: file.byteSize,
    version: file.version,
    status: file.status,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    preview: file.preview,
    truthLabel: file.truthLabel,
  });
}

function storedFile(value: unknown): value is StoredFile {
  if (!isRecord(value) || !SAFE_FILE_ID.test(String(value.id)) || !SAFE_ID.test(String(value.artifactId))
    || !SAFE_ID.test(String(value.sessionId)) || typeof value.sessionTitle !== 'string' || typeof value.name !== 'string'
    || !Object.hasOwn(formats, String(value.format)) || !['md', 'html', 'txt', 'json'].includes(String(value.extension))
    || typeof value.mediaType !== 'string' || typeof value.byteSize !== 'number' || !Number.isSafeInteger(value.byteSize)
    || value.byteSize < 0 || value.byteSize > MAX_FILE_BYTES || typeof value.version !== 'number'
    || !Number.isSafeInteger(value.version) || value.version < 1 || !['draft', 'saved'].includes(String(value.status))
    || !validDate(value.createdAt) || !validDate(value.updatedAt) || !['text', 'html'].includes(String(value.preview))
    || value.truthLabel !== 'local-runtime' || typeof value.diskName !== 'string') return false;
  return value.diskName === `${value.id}.${value.extension}`;
}

function readManifest(path: string, sessionId: string): Manifest | null {
  if (!existsSync(path)) return null;
  try {
    const value: unknown = JSON.parse(boundedText(path));
    if (!isRecord(value) || value.schemaVersion !== 1 || value.sessionId !== sessionId
      || typeof value.sessionTitle !== 'string' || !validDate(value.updatedAt) || !Array.isArray(value.files)) return null;
    return {
      schemaVersion: 1,
      sessionId,
      sessionTitle: value.sessionTitle,
      updatedAt: value.updatedAt,
      files: value.files.filter(storedFile),
    };
  } catch {
    return null;
  }
}

function normalizeJson(content: string): string {
  try {
    JSON.parse(content);
    return content;
  } catch {
    throw new SessionFileError('JSON 产物内容格式不正确。', 400);
  }
}

export function createLocalSessionFileLibrary(runtimeRoot = '.runtime'): SessionFileLibrary {
  const root = resolve(runtimeRoot);
  const filesRoot = join(root, 'files');
  for (const path of [root, filesRoot]) ensureRealDirectory(path);

  const sessionDirectory = (scope: RuntimeScope, sessionId: string) => {
    validateScope(scope);
    validateId(sessionId, '会话标识');
    const scopeRoot = join(filesRoot, scope);
    const sessionRoot = join(scopeRoot, sessionId);
    for (const path of [scopeRoot, sessionRoot]) ensureRealDirectory(path);
    return sessionRoot;
  };

  const scan = (scope: RuntimeScope): Array<{ directory: string; manifest: Manifest }> => {
    validateScope(scope);
    const scopeRoot = join(filesRoot, scope);
    if (!existsSync(scopeRoot)) return [];
    return readdirSync(scopeRoot).flatMap((sessionId) => {
      if (!SAFE_ID.test(sessionId)) return [];
      const directory = join(scopeRoot, sessionId);
      try {
        const stat = lstatSync(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink()) return [];
        const manifest = readManifest(join(directory, 'manifest.json'), sessionId);
        return manifest ? [{ directory, manifest }] : [];
      } catch {
        return [];
      }
    });
  };

  return {
    async materialize(input) {
      validateScope(input.scope);
      validateId(input.sessionId, '会话标识');
      validateId(input.artifactId, '产物标识');
      if (!Object.hasOwn(formats, input.format) || !Number.isSafeInteger(input.version) || input.version < 1
        || !validDate(input.createdAt) || !input.content || !input.title.trim()) {
        throw new SessionFileError('文件产物信息不完整。', 400);
      }
      const bytes = Buffer.byteLength(input.content, 'utf8');
      if (bytes > MAX_FILE_BYTES) throw new SessionFileError('文件超过本地预览大小限制。', 413);
      const content = input.format === 'json' ? normalizeJson(input.content) : input.content;
      const definition = formats[input.format];
      const id = `sf-${createHash('sha256')
        .update(`${input.scope}\0${input.sessionId}\0${input.artifactId}\0${input.version}`)
        .digest('hex').slice(0, 40)}`;
      const diskName = `${id}.${definition.extension}`;
      const directory = sessionDirectory(input.scope, input.sessionId);
      const path = join(directory, diskName);
      writeImmutable(path, content);
      const manifestPath = join(directory, 'manifest.json');
      const manifest = readManifest(manifestPath, input.sessionId);
      const previous = manifest?.files.find((file) => file.id === id);
      const createdAt = previous?.createdAt ?? input.createdAt;
      const nextSessionTitle = input.sessionTitle.trim() || '新对话';
      const nextName = displayName(input, definition.extension);
      const metadataChanged = !previous || previous.sessionTitle !== nextSessionTitle || previous.name !== nextName
        || previous.status !== input.status || previous.byteSize !== bytes || previous.format !== input.format;
      const file: StoredFile = Object.freeze({
        id,
        artifactId: input.artifactId,
        sessionId: input.sessionId,
        sessionTitle: nextSessionTitle,
        name: nextName,
        extension: definition.extension,
        format: input.format,
        mediaType: definition.mediaType,
        byteSize: bytes,
        version: input.version,
        status: input.status,
        createdAt,
        updatedAt: metadataChanged ? new Date().toISOString() : previous.updatedAt,
        preview: definition.preview,
        truthLabel: 'local-runtime',
        diskName,
      });
      if (previous && !metadataChanged) return publicFile(previous);
      const files = [...(manifest?.files ?? []).filter((item) => item.id !== id), file]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      atomicJson(manifestPath, {
        schemaVersion: 1,
        sessionId: input.sessionId,
        sessionTitle: file.sessionTitle,
        updatedAt: file.updatedAt,
        files,
      } satisfies Manifest);
      return publicFile(file);
    },

    async list(scope, sessions) {
      validateScope(scope);
      const titles = new Map(sessions.map((session) => [session.sessionId, session.sessionTitle]));
      const groups: SessionFileGroup[] = [];
      for (const { directory, manifest } of scan(scope)) {
        const sessionTitle = titles.get(manifest.sessionId)?.trim() || manifest.sessionTitle || '新对话';
        const files = manifest.files.flatMap((file) => {
          try {
            const path = join(directory, file.diskName);
            const stat = lstatSync(path);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.byteSize) return [];
            return [publicFile({ ...file, sessionTitle })];
          } catch {
            return [];
          }
        }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        if (!files.length) continue;
        const updatedAt = files[0]!.updatedAt;
        if (sessionTitle !== manifest.sessionTitle) {
          atomicJson(join(directory, 'manifest.json'), {
            ...manifest,
            sessionTitle,
            updatedAt,
            files: manifest.files.map((file) => ({ ...file, sessionTitle })),
          } satisfies Manifest);
        }
        groups.push(Object.freeze({ sessionId: manifest.sessionId, sessionTitle, updatedAt, files }));
      }
      return groups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async read(scope, fileId): Promise<SessionFileContent> {
      validateScope(scope);
      if (!SAFE_FILE_ID.test(fileId)) throw new SessionFileError('文件不存在。', 404);
      for (const { directory, manifest } of scan(scope)) {
        const file = manifest.files.find((candidate) => candidate.id === fileId);
        if (!file) continue;
        const content = boundedText(join(directory, file.diskName));
        if (Buffer.byteLength(content, 'utf8') !== file.byteSize) throw new SessionFileError('文件内容已变化，请重新生成。', 409);
        return Object.freeze({ file: publicFile(file), content });
      }
      throw new SessionFileError('文件不存在。', 404);
    },
  };
}
