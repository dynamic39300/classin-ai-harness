import katex from 'katex';

const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const keys = (value, allowed) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key));
function cleanFormula(value) {
  return value.replace(/\\{2}(?=[a-zA-Z])/g, '\\');
}
function displayFormula(value) {
  const clean = cleanFormula(value);
  let depth = 0; const parts = []; let start = 0;
  for (let index = 0; index < clean.length; index++) {
    if (clean[index] === '{') depth++;
    if (clean[index] === '}') depth--;
    if (clean[index] === '=' && depth === 0) { parts.push(clean.slice(start, index)); start = index + 1; }
  }
  parts.push(clean.slice(start));
  return parts.length > 2 ? '\\begin{aligned}' + parts[0] + parts.slice(1).map(part => '&=' + part).join('\\\\') + '\\end{aligned}' : clean;
}
export function validateSolutionImage(value) {
  if (!keys(value, ['title', 'steps', 'conclusion']) || !text(value.title, 60) || !text(value.conclusion, 140)
    || !Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 4
    || !value.steps.every(step => keys(step, ['title', 'explanation', 'formula']) && text(step.title, 24)
      && text(step.explanation, 140) && (step.formula === undefined || text(step.formula, 160)))) {
    throw new Error('解题图需要标题、2至4个简短步骤及结论；请精简过长内容。');
  }
  for (const step of value.steps) if (step.formula) katex.renderToString(cleanFormula(step.formula), { trust: false, throwOnError: true, strict: 'error', maxExpand: 500 });
  return value;
}
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function plain(value) {
  return escape(value.replace(/\\+(pi|sin|cos|theta|times|geq|leq|ge|le|neq|infty|in|implies)\b/g, (_match, command) => ({pi:'π',sin:'sin',cos:'cos',theta:'θ',times:'×',geq:'≥',leq:'≤',ge:'≥',le:'≤',neq:'≠',infty:'∞',in:'∈',implies:'⇒'}[command])));
}
export function solutionImageHtml(input, mathCSS) {
  const value = validateSolutionImage(input);
  const steps = value.steps.map((step, index) => `<section><div class="step">STEP 0${index + 1}</div><h2>${plain(step.title)}</h2><p>${plain(step.explanation)}</p>${step.formula ? `<div class="formula">${katex.renderToString(displayFormula(step.formula), {displayMode:true,trust:false,throwOnError:true,strict:'error',maxExpand:500})}</div>` : ''}</section>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src 'none'"><style>${mathCSS}
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden}body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#172a36;background:#f5f7f6}.slide{height:900px;padding:48px 60px;display:flex;flex-direction:column;gap:28px}.eyebrow{color:#087b60;font-size:20px;letter-spacing:3px}h1{font-size:42px;line-height:1.25;margin:12px 0 0;overflow-wrap:anywhere}.steps{display:grid;grid-template-columns:repeat(${value.steps.length},minmax(0,1fr));gap:22px;flex:1;min-height:0}section{background:white;border:1px solid #dbe4df;border-top:5px solid #087b60;border-radius:12px;padding:28px 24px;overflow:hidden}.step{font-size:17px;color:#087b60;letter-spacing:2px}h2{font-size:28px;line-height:1.35;margin:18px 0}p{font-size:24px;line-height:1.6;margin:0;overflow-wrap:anywhere}.formula{font-size:23px;margin-top:24px}.katex-display{margin:0}.katex{font-size:1.12em}.conclusion{border-left:6px solid #087b60;padding:18px 24px;background:#e7f1ec;font-size:26px;line-height:1.5;overflow-wrap:anywhere}.footer{font-size:16px;color:#63756c;display:flex;justify-content:space-between}
</style></head><body><main class="slide"><header><div class="eyebrow">AI 消息助手 / 解题步骤</div><h1>${plain(value.title)}</h1></header><div class="steps">${steps}</div><div class="conclusion"><strong>结论&nbsp; </strong>${plain(value.conclusion)}</div><footer class="footer"><span>AI 辅助整理 · 请教师核对题意与结论</span><span>16:9 · 解题过程图</span></footer></main></body></html>`;
}
