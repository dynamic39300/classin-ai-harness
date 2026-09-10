export type DesktopNotificationPermission = 'unsupported' | 'prompt' | 'granted' | 'denied' | 'failed';

export type DesktopNotificationPayload = Readonly<{
  id: string;
  title: string;
  body: string;
  threadId: string;
}>;

export type DesktopNotificationResult =
  | Readonly<{ status: 'delivered' }>
  | Readonly<{ status: 'unsupported' | 'denied' | 'failed'; message: string }>;

export interface DesktopNotificationAdapter {
  getPermission(): DesktopNotificationPermission;
  requestPermission(): Promise<DesktopNotificationPermission>;
  notify(payload: DesktopNotificationPayload): Promise<DesktopNotificationResult>;
  dispose(): void;
}
