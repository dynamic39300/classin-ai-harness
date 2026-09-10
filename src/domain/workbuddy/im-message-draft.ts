import type { BusinessContextSnapshot, MessageDraftArtifact, SendMessageAction, SendMessageApproval } from '@contracts/workbuddy/business-context';

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createMessageDraft(input: Readonly<{ sessionRef: string; snapshot: BusinessContextSnapshot; body: string }>): MessageDraftArtifact {
  return Object.freeze({
    id: id('message-draft'),
    sessionRef: input.sessionRef,
    contextSnapshotRef: input.snapshot.id,
    threadRef: input.snapshot.threadRef,
    channel: input.snapshot.channel,
    body: input.body.trim(),
    version: 1,
  });
}

export function reviseMessageDraft(draft: MessageDraftArtifact, body: string): MessageDraftArtifact {
  return Object.freeze({ ...draft, body, version: draft.version + 1 });
}

export function validateMessageContext(original: BusinessContextSnapshot, current: BusinessContextSnapshot): string | null {
  if (current.actorRef !== original.actorRef || current.tenantRef !== original.tenantRef || current.threadRef !== original.threadRef || current.channel !== original.channel) {
    return '当前消息目标或权限已经变化，请重新生成草稿。';
  }
  if (current.sources.some((source) => source.freshness !== 'current')) {
    return '当前业务上下文已经过期，请刷新后重试。';
  }
  const currentVersions = new Map(current.sources.map((source) => [source.sourceRef, `${source.kind}:${source.permissionScope}:${source.version}`]));
  if (original.sources.some((source) => currentVersions.get(source.sourceRef) !== `${source.kind}:${source.permissionScope}:${source.version}`)) {
    return '生成草稿后业务事实已经变化，请核对最新消息并重新生成。';
  }
  return null;
}

export function proposeMessageSend(
  draft: MessageDraftArtifact,
  actor: Readonly<{ id: string; name: string }>,
  contextSnapshotRef = draft.contextSnapshotRef,
): SendMessageAction | null {
  if (draft.channel !== 'class' || !draft.body.trim()) return null;
  return Object.freeze({
    id: id('message-action'),
    kind: 'send-class-message',
    artifactRef: Object.freeze({ id: draft.id, version: draft.version }),
    contextSnapshotRef,
    threadRef: draft.threadRef,
    actorRef: actor.id,
    actorName: actor.name,
    body: draft.body,
  });
}

export function approveMessageSend(action: SendMessageAction, approvedAt: string): SendMessageApproval {
  return Object.freeze({
    id: id('message-approval'),
    actionRef: action.id,
    artifactRef: action.artifactRef,
    approvedBy: action.actorRef,
    approvedAt,
  });
}
