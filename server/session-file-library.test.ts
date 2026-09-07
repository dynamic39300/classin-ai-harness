import { mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalSessionFileLibrary } from './session-file-library';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'teachbuddy-files-'));
  roots.push(root);
  return { root, library: createLocalSessionFileLibrary(join(root, '.runtime')) };
}

function generated(overrides: Record<string, unknown> = {}) {
  return {
    scope: 'ideal-full' as const,
    sessionId: 'session-1',
    sessionTitle: '分数比较教案',
    artifactId: 'artifact-1',
    title: '分数比较：课堂教案',
    content: '# 分数比较\n\n比较 1/2 与 2/3。',
    format: 'markdown' as const,
    version: 1,
    status: 'draft' as const,
    createdAt: '2026-09-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('local SessionFileLibrary contract', () => {
  it('materializes, lists and reads a generated file through stable references', async () => {
    const { root, library } = fixture();
    const file = await library.materialize(generated());
    expect(file).toMatchObject({ name: '分数比较 课堂教案.md', extension: 'md', format: 'markdown', status: 'draft' });
    expect(file.id).toMatch(/^sf-[a-f0-9]{40}$/);
    const groups = await library.list('ideal-full', [{ sessionId: 'session-1', sessionTitle: '新的会话名称' }]);
    expect(groups).toEqual([expect.objectContaining({ sessionId: 'session-1', sessionTitle: '新的会话名称', files: [expect.objectContaining({ id: file.id, sessionTitle: '新的会话名称' })] })]);
    expect(await library.read('ideal-full', file.id)).toEqual({ file: expect.objectContaining({ id: file.id }), content: generated().content });
    const directory = join(root, '.runtime', 'files', 'ideal-full', 'session-1');
    expect(readdirSync(directory).sort()).toEqual(['manifest.json', `${file.id}.md`]);
    expect(JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8')).sessionTitle).toBe('新的会话名称');
  });

  it('is idempotent, keeps same-name artifacts distinct and updates status without duplicating content', async () => {
    const { library } = fixture();
    const first = await library.materialize(generated());
    const repeat = await library.materialize(generated({ status: 'saved' }));
    const second = await library.materialize(generated({ artifactId: 'artifact-2' }));
    expect(repeat.id).toBe(first.id);
    expect(second.id).not.toBe(first.id);
    const [group] = await library.list('ideal-full', []);
    expect(group?.files).toHaveLength(2);
    expect(group?.files.filter((file) => file.name === first.name)).toHaveLength(2);
    expect(group?.files.find((file) => file.id === first.id)?.status).toBe('saved');
    await expect(library.materialize(generated({ content: 'different' }))).rejects.toThrow('冲突');
  });

  it('keeps profiles isolated and rejects path-shaped identities', async () => {
    const { library } = fixture();
    const file = await library.materialize(generated());
    expect(await library.list('standalone-teacher', [])).toEqual([]);
    await expect(library.read('standalone-teacher', file.id)).rejects.toThrow('不存在');
    await expect(library.materialize(generated({ sessionId: '../outside' }))).rejects.toThrow('标识');
    await expect(library.materialize(generated({ artifactId: 'a/b' }))).rejects.toThrow('标识');
    await expect(library.read('ideal-full', '../manifest')).rejects.toThrow('不存在');
  });

  it('supports the four bounded text formats and rejects malformed JSON', async () => {
    const { library } = fixture();
    for (const [format, content, extension] of [
      ['markdown', '# Lesson', 'md'],
      ['html', '<!doctype html><title>Lesson</title>', 'html'],
      ['text', 'Lesson', 'txt'],
      ['json', '{"lesson":true}', 'json'],
    ] as const) {
      const file = await library.materialize(generated({ artifactId: `artifact-${format}`, format, content }));
      expect(file.extension).toBe(extension);
      expect((await library.read('ideal-full', file.id)).content).toBe(content);
    }
    await expect(library.materialize(generated({ artifactId: 'bad-json', format: 'json', content: '{' }))).rejects.toThrow('JSON');
    await expect(library.materialize(generated({ artifactId: 'large', content: '中'.repeat(180_000) }))).rejects.toThrow('超过');
  });

  it('rebuilds a corrupt manifest from source artifacts without exposing partial entries', async () => {
    const { root, library } = fixture();
    const first = await library.materialize(generated());
    const manifest = join(root, '.runtime', 'files', 'ideal-full', 'session-1', 'manifest.json');
    writeFileSync(manifest, '{');
    expect(await library.list('ideal-full', [])).toEqual([]);
    const restored = await library.materialize(generated());
    expect(restored.id).toBe(first.id);
    expect((await library.list('ideal-full', []))[0]?.files).toHaveLength(1);
  });

  it('does not follow a Session directory symlink', async () => {
    const { root } = fixture();
    const runtime = join(root, '.runtime');
    const outside = join(root, 'outside');
    mkdirSync(outside);
    mkdirSync(join(runtime, 'files', 'ideal-full'), { recursive: true });
    symlinkSync(outside, join(runtime, 'files', 'ideal-full', 'session-1'));
    const library = createLocalSessionFileLibrary(runtime);
    await expect(library.materialize(generated())).rejects.toThrow('目录');
    expect(readdirSync(outside)).toEqual([]);
  });
});
