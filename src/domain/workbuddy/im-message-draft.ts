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
  return `${request.trim()}\n\n生成要求：请选择一条最合适的最终消息，不提供多个备选版本。把且只把可以直接发送给目标对象的消息原文放在以下两个不可见标记之间；开场说明、分析、写法解释和对老师的后续建议不得放入标记。提及规则（适用于所有教学阶段与自由输入生成的消息）：群消息面向全班时，正文开头写 @所有人；面向单个或部分学生时，按本次请求与业务证据中的实际接收对象逐一写 @姓名，例如“@李明、@周然、@陈晨，请尽快进入课堂”，不能只写裸姓名或用一个 @ 代替多人。只提醒目标学生，不扩大到全班，不把可识别姓名目录当成本次接收名单；姓名保持原样，各提及后用空格或标点分隔。已包含 @ 时不重复添加。普通叙述中提到的姓名不代表接收对象，不自动 @；私聊无需 @所有人。对象不明确时不得编造姓名，应先补问；教师明确要求不 @ 时遵从。颜色与标签由界面统一渲染，不输出 HTML 或颜色描述。正文精简、紧凑，保留关键事实、对象和时间。紧凑指减少冗余和空白，不是把不同主题挤成一段。同一要点内能用一句话说完就保持连贯；称呼、主题和简短进度可连贯写在同一段，不单独列出标题或寒暄。结构化事实适合横向比较至少两个同类对象及其共同字段，或一个对象包含时间、对象、状态、进度等至少四项简短属性时，使用 GFM Markdown 表格；逐人明细较多时另起一张表，避免塞进一个超长单元格。课程、录播、作业或课堂进度同时包含对象元信息和成员进度时，固定使用两张表：先用“项目｜内容”呈现元信息，再用一人一行的成员表呈现状态、进度和时长等字段，不把本应入表的元信息连续写成“标签：内容”的散行。表头必须简短，第一列放行标签或主要对象，不在表格前后重复同一事实。只有单个简单事实、操作步骤、叙述性解释、长文本或字段无法对齐时使用段落或紧凑列表，不为凑表格编造字段。包含不同信息维度但不适合表格时，按要点使用紧凑的 Markdown 列表，每项以简短标签开头。例如课堂回顾中的“本讲知识点”“练习表现”“易错提醒”应各占一项，不能把知识点、正确率和订正建议混写成一个长段。每项内部可用一句话列出相关事实；知识点较多时，再按独立概念逐项列出，避免多层嵌套。多项课程安排、课后任务或操作步骤也逐项换行。列表每项以 - 或数字加点开头，列表项之间不空行；列表前保留解析所需的一个空行。只在主题确实切换时分段，段间最多一个必要空行。简短引导如“后续安排：”即可，不再增加层层小标题；结尾提醒能合并到前文就合并，避免重复总结。\n${MESSAGE_BODY_START}\n消息原文\n${MESSAGE_BODY_END}`;
}

// Legacy responses sometimes put several explicit bullet items on one line.
// Reflow only bullet markers; never split prose, decimal numbers or formulas.
export function formatMessageDraftBody(body: string) {
  let fenced = false;
  return body.replace(/\r\n?/g, '\n').split('\n').map((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced || line.includes('`') || !/(?:^|[ \t]+)[•●][ \t]+/.test(line)) return line;
    return line.replace(/(?:^|[ \t]+)[•●][ \t]+/g, (_match, offset: number) => offset === 0 ? '- ' : '\n- ')
      .replace(/^([^\n]+)\n- /, '$1\n\n- ');
  }).join('\n').trim();
}

export function extractMessageDraftBody(generated: string) {
  const normalized = generated.replace(/\r\n?/g, '\n').trim();
  const marked = markedMessageDraftBody(normalized);
  if (marked?.trim()) return formatMessageDraftBody(stripWrappingMarkdown(marked));

  const sections = normalized.split(/^\s*---+\s*$/m).map((section) => section.trim()).filter(Boolean);
  if (sections.length >= 3) {
    const middle = removeExplanatoryEdges(sections.slice(1, -1).join('\n\n'));
    if (middle) return formatMessageDraftBody(middle);
  }
  return formatMessageDraftBody(removeExplanatoryEdges(normalized) || normalized);
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
