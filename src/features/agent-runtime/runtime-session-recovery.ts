import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';

/**
 * A vision failure leaves an image in Harness history. Sending that history to
 * a text-only model can fail again. Exhausted context is likewise unreplayable.
 * The next explicit submit uses fresh business context; UI history stays bound.
 */
export function needsFreshTextSession(session: RuntimeSession | null | undefined, imageCount: number) {
  return session?.failureCode === 'context-window-exceeded'
    || session?.failureCode === 'model-history-invalid'
    || (imageCount === 0 && (session?.failureCode === 'vision-permission' || session?.failureCode === 'model-rate-limited'));
}
