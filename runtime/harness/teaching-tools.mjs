import { CLASSIN_READ_TOOL, createClassInReadTool } from './classin-read-tool.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateSolutionImage } from './solution-image.mjs';

export const name = 'teachbuddy-draft-tools';
export const inject = ['tools'];
export const TOOL_NAME = 'create_teaching_draft';
const RUNTIME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../.runtime');
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const SAFE_ARTIFACT_ID = /^[a-zA-Z0-9_-]{1,120}$/;
const MAX_CONTENT_LENGTH = 120000;
const FORMATS = Object.freeze({
  markdown: { extension: 'md', mediaType: 'text/markdown; charset=utf-8' },
  html: { extension: 'html', mediaType: 'text/html; charset=utf-8' },
  text: { extension: 'txt', mediaType: 'text/plain; charset=utf-8' },
  json: { extension: 'json', mediaType: 'application/json; charset=utf-8' },
});

export function draftFilename(callId) {
  if (typeof callId !== 'string' || callId.length === 0 || callId.length > 4096) {
    throw new Error('A non-empty runtime call id of at most 4096 characters is required.');
  }
  const stem = SAFE_ARTIFACT_ID.test(callId) && !callId.startsWith('sha256-')
    ? callId
    : `sha256-${createHash('sha256').update(callId).digest('hex')}`;
  return `${stem}.json`;
}

export function teachingToolGuard(exec) {
  return [TOOL_NAME, 'create_solution_image', CLASSIN_READ_TOOL].includes(exec.name) ? undefined : 'TeachBuddy permits only teaching draft, solution image and authorized ClassIn read tools.';
}

async function ensureDirectory(path) {
  try {
    await mkdir(path, { mode: 0o700 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error('Artifact directories must be real directories, not symbolic links.');
  }
}

async function readExisting(path, serialized) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_CONTENT_LENGTH * 6 + 32768) {
      throw new Error('Existing draft is not a bounded regular file.');
    }
    if (await handle.readFile('utf8') !== serialized) {
      throw new Error('This call id already belongs to a different draft.');
    }
  } finally {
    await handle.close();
  }
}

function hasUnsafeFileNameCharacter(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 || '/\\'.includes(character);
  });
}

function validateDraft(args, exec) {
  if (!args || typeof args !== 'object' || Array.isArray(args)
    || Object.keys(args).some(key => !['title', 'content', 'format', 'fileName'].includes(key))
    || typeof args.title !== 'string' || !args.title.trim() || args.title.length > 200
    || typeof args.content !== 'string' || !args.content.trim()
    || args.content.length > MAX_CONTENT_LENGTH
    || (args.format !== undefined && !Object.hasOwn(FORMATS, args.format))
    || (args.fileName !== undefined && (typeof args.fileName !== 'string' || !args.fileName.trim()
      || args.fileName.length > 200 || hasUnsafeFileNameCharacter(args.fileName)))) {
    throw new Error('Supply a title, content, optional supported format, and an optional path-free fileName.');
  }
  const format = args.format ?? 'markdown';
  if (format === 'json') {
    try { JSON.parse(args.content); } catch { throw new Error('JSON teaching material must contain valid JSON.'); }
  }
  const sessionId = exec.agent?.session?.id;
  if (typeof sessionId !== 'string' || !SAFE_ID.test(sessionId)) {
    throw new Error('A path-safe runtime session id is required.');
  }
  const extension = FORMATS[format].extension;
  const requested = (args.fileName ?? args.title).replace(/\.(?:md|markdown|html?|txt|json)$/i, '');
  return { sessionId, filename: draftFilename(exec.callId), format, fileName: `${requested}.${extension}` };
}

// The override is for isolated tests; the plugin always uses its fixed runtime root.
export function createTeachingDraftTool(runtimeRoot = RUNTIME_ROOT) {
  return {
    name: TOOL_NAME,
    description: 'Save teaching material as a durable Markdown, HTML, text, or JSON draft. Does not publish or change ClassIn business objects.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'A descriptive title, at most 200 characters.' },
        content: { type: 'string', description: 'The complete teaching material, at most 120000 characters.' },
        format: { type: 'string', enum: Object.keys(FORMATS), description: 'Output format. Defaults to markdown.' },
        fileName: { type: 'string', description: 'Optional display filename without a path.' },
      },
      required: ['title', 'content'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          fileName: { type: 'string' },
          format: { type: 'string', enum: Object.keys(FORMATS) },
          mediaType: { type: 'string' },
          byteSize: { type: 'integer' },
          version: { type: 'integer', enum: [1] },
          status: { type: 'string', enum: ['draft'] },
          sourceCallId: { type: 'string' },
        },
        required: ['id', 'title', 'content', 'fileName', 'format', 'mediaType', 'byteSize', 'version', 'status'],
        additionalProperties: false,
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      exec.signal.throwIfAborted();
      const { sessionId, filename, format, fileName } = validateDraft(args, exec);
      const id = filename.slice(0, -5);
      const draft = {
        id, title: args.title, content: args.content, fileName, format,
        mediaType: FORMATS[format].mediaType, byteSize: Buffer.byteLength(args.content, 'utf8'),
        version: 1, status: 'draft',
        ...(id === exec.callId ? {} : { sourceCallId: exec.callId }),
      };
      const serialized = `${JSON.stringify(draft, null, 2)}\n`;
      const artifactsRoot = join(runtimeRoot, 'artifacts');
      const sessionRoot = join(artifactsRoot, sessionId);
      for (const path of [runtimeRoot, artifactsRoot, sessionRoot]) {
        exec.signal.throwIfAborted();
        await ensureDirectory(path);
      }
      const destination = join(sessionRoot, filename);
      const temporary = join(sessionRoot, `.draft-${randomUUID()}.tmp`);
      const handle = await open(temporary, 'wx', 0o600);
      try {
        await handle.writeFile(serialized, { encoding: 'utf8', signal: exec.signal });
        await handle.sync();
        exec.signal.throwIfAborted();
        // Hard-link publication is atomic and cannot overwrite an existing id.
        try {
          await link(temporary, destination);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
          await readExisting(destination, serialized);
        }
        const directory = await open(sessionRoot, constants.O_RDONLY);
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }
        return draft;
      } finally {
        await handle.close();
        await unlink(temporary);
      }
    },
  };
}

export function createSolutionImageTool(runtimeRoot = RUNTIME_ROOT) {
  const draftTool = createTeachingDraftTool(runtimeRoot);
  return {
    ...draftTool,
    name: 'create_solution_image',
    description: 'Create a 16:9 solution process image for preview and PNG download. Supply 2–4 concise steps based on the conversation; formulas are raw LaTeX without dollar delimiters. No drawing or invented problem details. Text and formulas are laid out precisely, not painted by an image model.',
    parameters: {
      type: 'object', additionalProperties: false,
      properties: {
        title: { type: 'string', maxLength: 60 },
        steps: { type: 'array', minItems: 2, maxItems: 4, items: {
          type: 'object', additionalProperties: false, required: ['title', 'explanation'],
          properties: { title: { type: 'string', maxLength: 24 }, explanation: { type: 'string', maxLength: 140 }, formula: { type: 'string', maxLength: 160 } },
        } },
        conclusion: { type: 'string', maxLength: 140 },
      }, required: ['title', 'steps', 'conclusion'],
    },
    async execute(args, exec) {
      const source = validateSolutionImage(args);
      return draftTool.execute({ title: source.title, content: JSON.stringify(source), format: 'json', fileName: 'solution.solution.json' }, exec);
    },
  };
}

export function apply(ctx) {
  ctx.tools.guard(teachingToolGuard);
  ctx.tools.register(createTeachingDraftTool());
  ctx.tools.register(createSolutionImageTool());
  ctx.tools.register(createClassInReadTool());
}
