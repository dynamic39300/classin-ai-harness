import { createHash } from 'node:crypto';
import { ClassInError, object, type ClassInTransport } from './classin-test-transport.ts';
import { readValidatedTestFile, validatedResourceUrl } from './classin-test-resources.ts';

type ImageGrant = { ref: string; name: string; url: string };
function imageSource(tag: string): string | undefined {
  const attributes = tag.replace(/^<img\b/i, '').replace(/\/?\s*>$/, '');
  const pattern = /\s+([a-zA-Z][\w:-]*)\s*=\s*(["'])([\s\S]*?)\2/g;
  let cursor = 0; const sources: string[] = [];
  for (const match of attributes.matchAll(pattern)) {
    if (match.index !== cursor) return undefined;
    cursor = match.index + match[0].length;
    if (match[1]!.toLowerCase() === 'src') sources.push(match[3]!);
  }
  return attributes.slice(cursor).trim() === '' && sources.length === 1 ? sources[0] : undefined;
}
/** Strict extraction of the verified image format; never render supplied HTML. */
function imageGrants(activityId: string, topic: Record<string, unknown>, querySource: number): ImageGrant[] {
  if (querySource !== 0 || topic.topicSource !== 2 || topic.sensitive !== 0 || !Array.isArray(topic.permissions) || !topic.permissions.includes('check') || !topic.permissions.includes('download') || typeof topic.content !== 'string' || topic.content.length > 100_000) return [];
  const tags = topic.content.match(/<img\b[^>]*>/gi) ?? [];
  if (!tags.length || tags.length > 10) return [];
  return tags.flatMap((tag, index) => {
    const src = imageSource(tag);
    if (!src || !/^\/upload\/files\/file01\/[\w./-]+\.(png|jpe?g)$/i.test(src)) return [];
    let url: string;
    try { url = validatedResourceUrl(src.slice(1)); } catch { return []; }
    const ref = createHash('sha256').update(JSON.stringify([activityId, topic.topicId, querySource, topic.topicSource, topic.updatedAt, topic.content, index])).digest('hex');
    return [{ ref, name: `题干图片 ${index + 1}`, url }];
  });
}
export function questionImageRefs(activityId: string, topic: Record<string, unknown>, querySource: number) {
  return imageGrants(activityId, topic, querySource).map(({ ref, name }) => ({ ref, name }));
}

/** The caller has checked current teacher, published exam, source ownership and bizId. */
export async function readQuestionImage(transport: ClassInTransport, source: Record<string, unknown>, request: { activityId: string; topicId: string; imageRef: string }, fetcher: typeof fetch = fetch) {
  if (!/^[a-f0-9]{64}$/.test(request.imageRef) || !/^[1-9]\d*$/.test(request.topicId)) throw new ClassInError('forbidden', '题图引用不正确，请刷新测验。');
  let paper: Record<string, unknown>;
  try { paper = object(typeof source.paperInfo === 'string' ? JSON.parse(source.paperInfo) : source.paperInfo); }
  catch { throw new ClassInError('schema_error', '试卷结构无法读取。'); }
  if (!Array.isArray(paper.paper)) throw new ClassInError('schema_error', '试卷结构无法读取。');
  const refs = paper.paper.flatMap((part) => {
    const section = object(part);
    if (!Array.isArray(section.topicInfos)) throw new ClassInError('schema_error', '试卷题目列表无法读取。');
    return section.topicInfos.map(object);
  });
  if (!refs.length || refs.length > 100 || new Set(refs.map((r) => String(r.topicId))).size !== refs.length) throw new ClassInError('incomplete', '试卷题目列表为空、重复或超出读取边界。');
  const ref = refs.find((r) => String(r.topicId) === request.topicId);
  if (!ref || !Number.isSafeInteger(ref.topicId) || !Number.isSafeInteger(ref.topicSource) || ref.topicSource !== 0) throw new ClassInError('forbidden', '该题目不属于当前试卷。');
  const result = object(await transport('/question-bank-business-service/topic/batchGet', { topicQuery: JSON.stringify([{ topicId: ref.topicId, topicSource: ref.topicSource }]) }));
  if (!Array.isArray(result.list) || result.list.length !== 1) throw new ClassInError('incomplete', '题图所属题目未完整返回。');
  const topic = object(result.list[0]);
  if (String(topic.topicId) !== request.topicId || topic.topicSource !== 2) throw new ClassInError('forbidden', '题目或题源与授权试卷不一致。');
  const grant = imageGrants(request.activityId, topic, Number(ref.topicSource)).find((g) => g.ref === request.imageRef);
  if (!grant) throw new ClassInError('forbidden', '题图、题库权限或题目版本已变化，请刷新测验。');
  const file = await readValidatedTestFile(grant.url, `${grant.name}.${grant.url.toLowerCase().endsWith('.png') ? 'png' : 'jpg'}`, fetcher);
  if (!['image/png', 'image/jpeg'].includes(file.mimeType)) throw new ClassInError('schema_error', '题图文件类型不符合当前合同。');
  return file;
}
