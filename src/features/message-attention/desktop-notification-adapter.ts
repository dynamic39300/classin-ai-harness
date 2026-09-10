import type {
  DesktopNotificationAdapter,
  DesktopNotificationPayload,
  DesktopNotificationPermission,
  DesktopNotificationResult,
} from '@contracts/message/message-attention';

function mapBrowserPermission(permission: NotificationPermission): DesktopNotificationPermission {
  return permission === 'default' ? 'prompt' : permission;
}

export function createBrowserDesktopNotificationAdapter(): DesktopNotificationAdapter {
  const notifications = new Set<Notification>();
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  return {
    getPermission: () => supported ? mapBrowserPermission(Notification.permission) : 'unsupported',
    requestPermission: async () => {
      if (!supported) return 'unsupported';
      try {
        return mapBrowserPermission(await Notification.requestPermission());
      } catch {
        return 'failed';
      }
    },
    notify: async (payload: DesktopNotificationPayload): Promise<DesktopNotificationResult> => {
      if (!supported) return { status: 'unsupported', message: '当前环境不支持桌面通知。' };
      if (Notification.permission !== 'granted') return { status: 'denied', message: '桌面通知尚未获得授权。' };
      try {
        const notification = new Notification(payload.title, { body: payload.body, tag: payload.id });
        notifications.add(notification);
        notification.addEventListener('close', () => notifications.delete(notification), { once: true });
        return { status: 'delivered' };
      } catch {
        return { status: 'failed', message: '桌面通知发送失败，站内提醒仍然可用。' };
      }
    },
    dispose: () => {
      for (const notification of notifications) notification.close();
      notifications.clear();
    },
  };
}

export type MemoryDesktopNotificationAdapter = DesktopNotificationAdapter & Readonly<{
  delivered: readonly DesktopNotificationPayload[];
  setPermission(permission: DesktopNotificationPermission): void;
}>;

export function createMemoryDesktopNotificationAdapter(
  initialPermission: DesktopNotificationPermission = 'prompt',
): MemoryDesktopNotificationAdapter {
  let permission = initialPermission;
  const delivered: DesktopNotificationPayload[] = [];
  return {
    delivered,
    getPermission: () => permission,
    requestPermission: async () => permission,
    setPermission: (next) => { permission = next; },
    notify: async (payload) => {
      if (permission !== 'granted') return { status: permission === 'unsupported' ? 'unsupported' : 'denied', message: '通知不可用。' };
      delivered.push(payload);
      return { status: 'delivered' };
    },
    dispose: () => { delivered.splice(0, delivered.length); },
  };
}
