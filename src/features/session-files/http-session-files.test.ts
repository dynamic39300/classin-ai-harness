import { describe, expect, it, vi } from 'vitest';
import { createHttpSessionFileCatalog } from './http-session-files';

const file = {
  id: 'sf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', artifactId: 'artifact-1', sessionId: 'session-1', sessionTitle: '函数教案',
  name: '函数教案.md', extension: 'md', format: 'markdown', mediaType: 'text/markdown; charset=utf-8', byteSize: 12,
  version: 1, status: 'draft', createdAt: '2026-09-05T10:00:00.000Z', updatedAt: '2026-09-05T10:00:01.000Z',
  preview: 'text', truthLabel: 'local-runtime',
} as const;

describe('HTTP Session file catalog', () => {
  it('validates catalog and content responses and builds scoped download URLs', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ sessionId: 'session-1', sessionTitle: '函数教案', updatedAt: file.updatedAt, files: [file] }]))
      .mockResolvedValueOnce(Response.json({ file, content: '# 函数教案' }));
    const catalog = createHttpSessionFileCatalog(fetcher);
    expect((await catalog.list('classin-mvp'))[0]?.files[0]).toEqual(file);
    expect((await catalog.read('classin-mvp', file.id)).content).toBe('# 函数教案');
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      '/api/teachbuddy/files?scope=classin-mvp',
      `/api/teachbuddy/files/${file.id}?scope=classin-mvp`,
    ]);
    expect(catalog.downloadUrl('standalone-teacher', file.id)).toBe(`/api/teachbuddy/files/${file.id}/download?scope=standalone-teacher`);
  });

  it('rejects malformed files and preserves server errors', async () => {
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(Response.json([{ sessionId: 'session-1', sessionTitle: 'x', updatedAt: file.updatedAt, files: [{ ...file, id: '../x' }] }]));
    await expect(createHttpSessionFileCatalog(malformed).list('ideal-full')).rejects.toThrow('不完整');
    const denied = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: '文件不存在。' }, { status: 404 }));
    await expect(createHttpSessionFileCatalog(denied).read('ideal-full', file.id)).rejects.toMatchObject({ message: '文件不存在。', status: 404 });
  });
});
