import { mkdir, writeFile, rename, readFile, readdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
export function createStore(root) {
  const path = id => { if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error('记录标识无效。'); return join(root, `${id}.json`); };
  return {
    async save(record) {
      await mkdir(root, { recursive: true, mode: 0o700 }); await chmod(root, 0o700);
      const target = path(record.id), tmp = `${target}.${randomUUID()}.tmp`;
      await writeFile(tmp, JSON.stringify(record, null, 2), { mode: 0o600 }); await rename(tmp, target);
    },
    async get(id) { return JSON.parse(await readFile(path(id), 'utf8')); },
    async list() {
      await mkdir(root, { recursive: true, mode: 0o700 });
      const out = [];
      for (const f of await readdir(root)) {
        if (!f.endsWith('.json')) continue;
        try { out.push(JSON.parse(await readFile(join(root, f), 'utf8'))); } catch { /* An invalid record is never used as evidence. */ }
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}
