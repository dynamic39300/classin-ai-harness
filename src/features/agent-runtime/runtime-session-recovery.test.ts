import { describe, expect, it } from 'vitest';
import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';
import { needsFreshTextSession } from './runtime-session-recovery';

describe('unreplayable history recovery', () => {
  const session: RuntimeSession = { id: 'test', title: 'test', status: 'failed', updatedAt: '2026-09-10T00:00:00Z', events: [], artifacts: [], failureCode: 'model-history-invalid' };
  it('opens a clean session with or without a newly attached image', () => {
    expect(needsFreshTextSession(session, 1)).toBe(true);
    expect(needsFreshTextSession(session, 0)).toBe(true);
    expect(needsFreshTextSession({ ...session, failureCode: undefined }, 1)).toBe(false);
  });
});
