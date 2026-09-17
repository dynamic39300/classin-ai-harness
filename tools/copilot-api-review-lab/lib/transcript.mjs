// Keep the source wording and each video's relative time axis independent.
export function transcriptSegments(content) {
  if (!content || typeof content !== 'object' || !Array.isArray(content.children)) throw new Error('转写正文结构未知，不能当作空课堂。');
  const segments=[];
  function visit(node, path, depth=0) {
    if(depth>12 || !node || typeof node!=='object')throw new Error('转写层级或条目结构异常。');
    if(typeof node.desc==='string' && node.desc.trim()) {
      const times=node.metadata?.times;
      if(!Array.isArray(times)||times.length!==2||times.some(t=>typeof t!=='string'||!/^\d{2,}:\d{2}:\d{2}$/.test(t)))throw new Error('转写时间字段结构未知。');
      segments.push({text:node.desc,start:times[0],end:times[1],sourcePath:path});
    }
    if(node.children!=null && !Array.isArray(node.children))throw new Error('转写子条目结构未知。');
    for(const [i,child] of (node.children||[]).entries())visit(child,`${path}/children/${i}`,depth+1);
  }
  for(const [i,node] of content.children.entries())visit(node,`/content/children/${i}`);
  return segments;
}
