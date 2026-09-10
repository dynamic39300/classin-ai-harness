export type ImMessageDeliveryIntent = 'none' | 'suggest' | 'draft';
export type ImMessageRequestSource = 'freeform' | 'teaching-dynamic';

const communicationTerms = /(?:消息|通知|提醒|回复|公告|话术|私信|群发|发到群|发给|发送|通知|提醒|reply|message|notice|reminder)/i;
const explicitDraft = /(?:帮我|替我|请|麻烦)?\s*(?:写|拟|起草|草拟|拟定|生成|整理|改写|重写|润色|编辑).{0,10}(?:消息|通知|提醒|回复|公告|话术|私信|群发内容)|(?:draft|write|compose|rewrite)\s+(?:a\s+|the\s+)?(?:message|notice|reply|reminder)/i;
const exploratory = /(?:怎么|如何|怎样|什么|是否合适|给些建议|有什么建议).{0,18}(?:消息|通知|提醒|回复|公告|话术|私信|群发)|(?:消息|通知|提醒|回复|公告|话术|私信|群发).{0,18}(?:怎么|如何|怎样|是否合适|给些建议)|(?:how|what).{0,24}(?:reply|message|notice|remind)/i;
const directDelivery = /(?:请|帮我|麻烦)?\s*(?:发|发送|回复|通知|提醒)(?:一下)?.{0,14}(?:学生|家长|同学|班级|班群|群里|群内|对方|他|她|他们)|(?:send|reply|notify|remind).{0,18}(?:student|parent|class|group|them|him|her)/i;

/**
 * Projects a teacher request into the smallest delivery affordance the IM
 * Sidecar should expose. Runtime metadata can replace this conservative text
 * projection later without changing the surface contract.
 */
export function projectImMessageDeliveryIntent(
  request: string,
  source: ImMessageRequestSource = 'freeform',
): ImMessageDeliveryIntent {
  if (source === 'teaching-dynamic') return 'draft';
  const normalized = request.replace(/\s+/g, ' ').trim();
  if (!normalized || !communicationTerms.test(normalized)) return 'none';
  if (explicitDraft.test(normalized)) return 'draft';
  if (exploratory.test(normalized)) return 'suggest';
  if (directDelivery.test(normalized)) return 'draft';
  return 'none';
}
