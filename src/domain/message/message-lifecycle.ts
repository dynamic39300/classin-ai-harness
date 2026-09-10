import type { AppRole } from '@domain/account/role';
import type { MessageReplyReference, MessageResourceRef } from './im2-basic';
import type { MessageMediaAttachment, MessageMentionRef } from './message-media';
import type { MessageObjectCard } from './message-object-card';

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';
export type MessageDeliveryFailureCode =
  | 'offline'
  | 'transient'
  | 'version-conflict'
  | 'permission-denied'
  | 'thread-read-only';

export type MessageDeliveryReceipt = Readonly<{
  clientRequestId: string;
  serverMessageId: string;
  threadId: string;
  threadVersion: number;
  acceptedAt: string;
  deliveryStatus: MessageDeliveryStatus;
  readCount?: number;
  recipientCount?: number;
  truthLabel: 'SIMULATED';
}>;

export type MessageDeliveryState =
  | Readonly<{
    status: 'sending';
    clientRequestId: string;
    attempt: number;
    updatedAt: string;
  }>
  | Readonly<{
    status: MessageDeliveryStatus;
    clientRequestId: string;
    attempt: number;
    receipt: MessageDeliveryReceipt;
  }>
  | Readonly<{
    status: 'failed';
    clientRequestId: string;
    attempt: number;
    failedAt: string;
    code: MessageDeliveryFailureCode;
    message: string;
    latestThreadVersion?: number;
  }>;

export type MessageSubmitContent = Readonly<{
  body: string;
  kind: 'text' | 'emoji';
  replyTo?: MessageReplyReference;
  resources?: readonly MessageResourceRef[];
  attachments?: readonly MessageMediaAttachment[];
  mentions?: readonly MessageMentionRef[];
  objectCards?: readonly MessageObjectCard[];
}>;

export type MessageSubmitRequest = Readonly<{
  clientRequestId: string;
  threadId: string;
  actorRole: AppRole;
  authorName: string;
  expectedThreadVersion: number;
  sentAt: string;
  content: MessageSubmitContent;
}>;

export type MessageSubmitResult =
  | Readonly<{ status: 'accepted'; receipt: MessageDeliveryReceipt }>
  | Readonly<{ status: 'duplicate'; receipt: MessageDeliveryReceipt }>
  | Readonly<{
    status: 'failed';
    code: MessageDeliveryFailureCode;
    message: string;
    latestThreadVersion?: number;
  }>;

export type MessageConnectionSnapshot = Readonly<{
  status: 'online' | 'offline' | 'reconnecting';
  message: string;
  truthLabel: 'SIMULATED';
}>;

export type MessageThreadAccess = Readonly<{
  mode: 'write' | 'read-only' | 'unavailable';
  reason?: string;
  truthLabel: 'SIMULATED';
}>;

export function createSendingMessageDelivery(
  clientRequestId: string,
  updatedAt: string,
  attempt = 1,
): MessageDeliveryState {
  return Object.freeze({ status: 'sending', clientRequestId, attempt, updatedAt });
}

export function projectMessageDelivery(
  result: MessageSubmitResult,
  previous: MessageDeliveryState,
  failedAt: string,
): MessageDeliveryState {
  if ('receipt' in result) {
    return Object.freeze({
      status: result.receipt.deliveryStatus,
      clientRequestId: result.receipt.clientRequestId,
      attempt: previous.attempt,
      receipt: result.receipt,
    });
  }
  return Object.freeze({
    status: 'failed',
    clientRequestId: previous.clientRequestId,
    attempt: previous.attempt,
    failedAt,
    code: result.code,
    message: result.message,
    latestThreadVersion: result.latestThreadVersion,
  });
}

export function getMessageDeliveryLabel(delivery: MessageDeliveryState): string {
  if (delivery.status === 'sending') return delivery.attempt > 1 ? '正在重新发送…' : '正在发送…';
  if (delivery.status === 'sent') return '已发送';
  if (delivery.status === 'delivered') return '已送达';
  if (delivery.status === 'read') {
    return delivery.receipt.readCount === undefined ? '已读' : `${delivery.receipt.readCount} 人已读`;
  }
  return 'message' in delivery ? delivery.message : '';
}

export function getMessageDeliveryRecoveryAction(
  delivery: MessageDeliveryState,
): 'retry' | 'sync-and-retry' | null {
  if (delivery.status !== 'failed') return null;
  if (delivery.code === 'version-conflict') return 'sync-and-retry';
  if (delivery.code === 'offline' || delivery.code === 'transient') return 'retry';
  return null;
}
