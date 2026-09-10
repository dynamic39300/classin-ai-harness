import type { RuntimeScope } from '@contracts/workbuddy/agent-runtime';

type BindingTarget = Readonly<{ actorRef: string; tenantRef: string; threadRef: string; scope: RuntimeScope }>;
type BindingRecord = Readonly<{ sessionRef: string; updatedAt: string }>;

const STORAGE_KEY = 'classin:teachbuddy:im-session-bindings:v1';
const identifier = /^[a-zA-Z0-9_-]{1,160}$/;

function key(target: BindingTarget): string {
  return [target.scope, target.tenantRef, target.actorRef, target.threadRef].map(encodeURIComponent).join('|');
}

function read(storage: Pick<Storage, 'getItem'>): Record<string, BindingRecord> {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, BindingRecord] => {
      const record = entry[1];
      return Boolean(record && typeof record === 'object' && !Array.isArray(record)
        && 'sessionRef' in record && typeof record.sessionRef === 'string' && identifier.test(record.sessionRef)
        && 'updatedAt' in record && typeof record.updatedAt === 'string' && Number.isFinite(Date.parse(record.updatedAt)));
    }));
  } catch {
    return {};
  }
}

export function getImAgentSessionBinding(target: BindingTarget, storage: Pick<Storage, 'getItem'> = window.localStorage): string | null {
  return read(storage)[key(target)]?.sessionRef ?? null;
}

export function saveImAgentSessionBinding(target: BindingTarget, sessionRef: string, storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage): void {
  if (!identifier.test(sessionRef)) throw new Error('无法保存无效的 TeachBuddy 会话。');
  const bindings = read(storage);
  bindings[key(target)] = Object.freeze({ sessionRef, updatedAt: new Date().toISOString() });
  storage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function removeImAgentSessionBinding(target: BindingTarget, storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage): void {
  const bindings = read(storage);
  delete bindings[key(target)];
  storage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}
