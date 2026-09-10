import { describe, expect, it } from 'vitest';
import {
  createSendingMessageDelivery,
  getMessageDeliveryLabel,
  getMessageDeliveryRecoveryAction,
  projectMessageDelivery,
} from './message-lifecycle';

describe('message delivery projection', () => {
  it('projects a simulated receipt and preserves its request identity', () => {
    const sending = createSendingMessageDelivery('request-1', '2026-08-08T14:15:00+08:00');
    const delivery = projectMessageDelivery({
      status: 'accepted',
      receipt: {
        clientRequestId: 'request-1', serverMessageId: 'server-1', threadId: 'thread-1',
        threadVersion: 2, acceptedAt: '2026-08-08T14:15:01+08:00', deliveryStatus: 'read',
        readCount: 3, truthLabel: 'SIMULATED',
      },
    }, sending, '2026-08-08T14:15:01+08:00');

    expect(delivery.status).toBe('read');
    expect(getMessageDeliveryLabel(delivery)).toBe('3 人已读');
    expect(getMessageDeliveryRecoveryAction(delivery)).toBeNull();
  });

  it.each([
    ['offline', 'retry'],
    ['transient', 'retry'],
    ['version-conflict', 'sync-and-retry'],
    ['permission-denied', null],
    ['thread-read-only', null],
  ] as const)('maps %s failures to the valid recovery action', (code, expected) => {
    const failed = projectMessageDelivery(
      { status: 'failed', code, message: 'failed' },
      createSendingMessageDelivery('request-2', '2026-08-08T14:15:00+08:00'),
      '2026-08-08T14:15:01+08:00',
    );
    expect(getMessageDeliveryRecoveryAction(failed)).toBe(expected);
  });
});
