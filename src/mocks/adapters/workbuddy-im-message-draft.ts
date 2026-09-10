import type { ClassInMessageDraftAdapter, SendMessageAction, SendMessageApproval, SendMessageReceipt } from '@contracts/workbuddy/business-context';

type Dependencies = Readonly<{
  appendTeacherMessage: (message: Readonly<{ id: string; threadId: string; authorName: string; body: string; sentAt: string }>) => void;
  now: () => Date;
}>;

export class MockWorkBuddyImMessageDraftAdapter implements ClassInMessageDraftAdapter {
  private readonly receipts = new Map<string, SendMessageReceipt>();

  constructor(private readonly dependencies: Dependencies) {}

  async execute(action: SendMessageAction, approval: SendMessageApproval): Promise<SendMessageReceipt> {
    const prior = this.receipts.get(action.id);
    if (prior) return prior;
    if (approval.actionRef !== action.id || approval.artifactRef.id !== action.artifactRef.id || approval.artifactRef.version !== action.artifactRef.version) {
      return Object.freeze({ id: `receipt-${action.id}`, actionRef: action.id, approvalRef: approval.id, status: 'stale_context', result: '草稿版本已经变化，请重新确认。', executedAt: this.dependencies.now().toISOString() });
    }
    const sentAt = this.dependencies.now().toISOString();
    const messageId = `message-${action.id}`;
    this.dependencies.appendTeacherMessage({ id: messageId, threadId: action.threadRef, authorName: action.actorName, body: action.body, sentAt });
    const receipt = Object.freeze({ id: `receipt-${action.id}`, actionRef: action.id, approvalRef: approval.id, status: 'success' as const, result: '消息已发送。', executedAt: sentAt, messageId });
    this.receipts.set(action.id, receipt);
    return receipt;
  }
}
