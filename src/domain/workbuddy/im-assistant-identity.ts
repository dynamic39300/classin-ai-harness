/** Correct legacy self-introductions in IM only, leaving other brand references intact. */
export function formatImAssistantIdentity(text: string): string {
  let fenced = false;
  return text.split('\n').map(line => {
    if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced || line.includes('`')) return line;
    return line.replace(/((?:我是|我叫|我的名字是|可以叫我)(?:你的|您的|你们的|大家的)?[ \t]*)(?:ClassIn[ \t]*)?(?:AI[ \t]*教学助手[ \t]*)?TeachBuddy/gi, '$1AI消息助手');
  }).join('\n');
}
