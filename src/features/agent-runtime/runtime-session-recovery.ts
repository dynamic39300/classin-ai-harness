import type { RuntimeSession } from '@contracts/workbuddy/agent-runtime';

/**
 * A vision failure leaves an image in Harness history. Sending that history to
 * a text-only model can fail again, so text work resumes in a clean Session.
 */
export function needsFreshTextSession(session: RuntimeSession | null | undefined, imageCount: number) {
  return session?.failureCode === 'model-history-invalid'
    || (imageCount === 0 && session?.failureCode === 'vision-permission');
}
