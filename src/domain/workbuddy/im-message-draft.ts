import type { BusinessContextSnapshot, MessageDraftArtifact, SendMessageAction, SendMessageApproval } from '@contracts/workbuddy/business-context';
import { createClientId } from '@shared/client-id';

const id = (prefix: string) => createClientId(prefix);
const MESSAGE_BODY_START = '<!--TEACHBUDDY_MESSAGE_BODY_START-->';
const MESSAGE_BODY_END = '<!--TEACHBUDDY_MESSAGE_BODY_END-->';

const bodyLabel = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:【)?(?:可发送消息|消息正文|提醒正文|通知正文|回复正文|建议发送内容|最终话术|提醒内容)(?:】)?(?:\*\*)?\s*[:：]?\s*$/i;
const explanationLabel = /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:【)?(?:说明|提醒要点(?:说明)?|写法说明|发送建议|使用建议|注意事项|为什么这样写|调整建议)(?:】)?(?:\*\*)?\s*[:：]?/i;
const leadingMeta = /^(?:好的|当然|没问题|收到)[，,!！。]?.*(?:以下|已经|为您|帮您|我来|我已).*(?:消息|提醒|通知|回复|话术)|^以下(?:是|为).*(?:消息|提醒|通知|回复|话术)|^(?:根据|结合).{0,40}(?:为您|帮您|我).*(?:整理|生成)/i;
const trailingMeta = /^(?:您|你)?(?:可以直接|可直接)|^(?:如需|如果需要|需要的话|希望调整|还可以告诉我).*(?:调整|修改|重新|其他版本|告诉我|我可以|继续)|^(?:以上|这就是).*(?:消息|提醒|通知|回复|话术)/i;

function markedMessageDraftBody(generated: string) {
  return generated.replace(/\r\n?/g, '\n').match(/<!--\s*TEACHBUDDY_MESSAGE_BODY_START\s*-->([\s\S]*?)<!--\s*TEACHBUDDY_MESSAGE_BODY_END\s*-->/i)?.[1];
}

function stripWrappingMarkdown(value: string) {
  let body = value.trim();
  const fenced = body.match(/^```(?:text|markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  if (fenced?.[1]) body = fenced[1].trim();
  const nonEmptyLines = body.split('\n').filter((line) => line.trim());
  if (nonEmptyLines.length && nonEmptyLines.every((line) => /^\s*>/.test(line))) {
    body = body.split('\n').map((line) => line.replace(/^\s*>\s?/, '')).join('\n').trim();
  }
  return body;
}

function removeExplanatoryEdges(value: string) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const explicitBodyIndex = lines.findIndex((line) => bodyLabel.test(line));
  let bodyLines = explicitBodyIndex >= 0 ? lines.slice(explicitBodyIndex + 1) : lines;
  const explanationIndex = bodyLines.findIndex((line) => explanationLabel.test(line) || trailingMeta.test(line.trim()));
  if (explanationIndex >= 0) bodyLines = bodyLines.slice(0, explanationIndex);

  while (bodyLines.length && (!bodyLines[0]!.trim() || /^\s*---+\s*$/.test(bodyLines[0]!))) bodyLines.shift();
  while (bodyLines.length && (!bodyLines.at(-1)!.trim() || /^\s*---+\s*$/.test(bodyLines.at(-1)!))) bodyLines.pop();

  if (bodyLines.length > 1 && /^\s*#{1,6}\s+/.test(bodyLines[0]!) && /(?:建议|提醒|通知|回复|消息)/.test(bodyLines[0]!)) {
    bodyLines.shift();
    while (bodyLines.length && !bodyLines[0]!.trim()) bodyLines.shift();
  }

  const blocks = bodyLines.join('\n').split(/\n\s*\n/);
  while (blocks.length > 1 && leadingMeta.test(blocks[0]!.replace(/^\s*#{1,6}\s*/, '').trim())) blocks.shift();
  while (blocks.length > 1 && trailingMeta.test(blocks.at(-1)!.trim())) blocks.pop();
  return stripWrappingMarkdown(blocks.join('\n\n').replace(/^\s*---+\s*$/gm, '').trim());
}

export function buildMessageDraftRuntimeRequest(request: string) {
  return `${request.trim()}\n\n生成要求：请选择一条最合适的最终消息，不提供多个备选版本。把且只把可以直接发送给目标对象的消息原文放在以下两个不可见标记之间；开场说明、分析、标题、写法解释、要点和后续建议不得放入标记。\n${MESSAGE_BODY_START}\n消息原文\n${MESSAGE_BODY_END}`;
}

export function extractMessageDraftBody(generated: string) {
  const normalized = generated.replace(/\r\n?/g, '\n').trim();
  const marked = markedMessageDraftBody(normalized);
  if (marked?.trim()) return stripWrappingMarkdown(marked);

  const sections = normalized.split(/^\s*---+\s*$/m).map((section) => section.trim()).filter(Boolean);
  if (sections.length >= 3) {
    const middle = removeExplanatoryEdges(sections.slice(1, -1).join('\n\n'));
    if (middle) return middle;
  }
  return removeExplanatoryEdges(normalized) || normalized;
}

export function hasMarkedMessageDraftBody(generated: string) {
  return Boolean(markedMessageDraftBody(generated)?.trim());
}

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
