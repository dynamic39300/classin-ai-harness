import { describe, expect, it } from 'vitest';
import { createMemoryDesktopNotificationAdapter } from './desktop-notification-adapter';

describe('desktop notification adapter contract', () => {
  it('requires granted permission before delivery', async () => {
    const adapter = createMemoryDesktopNotificationAdapter('prompt');
    expect(await adapter.notify({ id: 'n1', title: '标题', body: '正文', threadId: 't1' })).toMatchObject({ status: 'denied' });
    adapter.setPermission('granted');
    expect(await adapter.notify({ id: 'n1', title: '标题', body: '正文', threadId: 't1' })).toEqual({ status: 'delivered' });
    expect(adapter.delivered).toHaveLength(1);
  });

  it('exposes unsupported state and releases recorded notifications', async () => {
    const adapter = createMemoryDesktopNotificationAdapter('unsupported');
    expect(await adapter.requestPermission()).toBe('unsupported');
    adapter.setPermission('granted');
    await adapter.notify({ id: 'n2', title: '标题', body: '正文', threadId: 't2' });
    adapter.dispose();
    expect(adapter.delivered).toHaveLength(0);
  });
});
