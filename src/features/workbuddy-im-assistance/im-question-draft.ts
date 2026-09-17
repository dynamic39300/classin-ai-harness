import type { BusinessContextAdapter } from '@contracts/workbuddy/business-context';
import type { ImMessageReference } from '@contracts/workbuddy/im-chat-context';
import type { RuntimeImageDraft } from '@features/agent-runtime';

type Draft = { text: string; reference: ImMessageReference | null; images: readonly RuntimeImageDraft[] };
// Page-session drafts only, isolated by Adapter ownership and teacher/tenant/thread scope.
const drafts = new WeakMap<BusinessContextAdapter, Map<string, Draft>>();
export function readImQuestionDraft(owner: BusinessContextAdapter, key: string): Draft {
  return drafts.get(owner)?.get(key) ?? { text: '', reference: null, images: [] };
}
export function saveImQuestionDraft(owner: BusinessContextAdapter, key: string, draft: Draft) {
  let store = drafts.get(owner);
  if (!store) { store = new Map(); drafts.set(owner, store); }
  if (draft.text || draft.reference || draft.images.length) store.set(key, draft); else store.delete(key);
}
