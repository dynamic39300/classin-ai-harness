import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { solutionImageHtml } from '../runtime/harness/solution-image.mjs';

const require = createRequire(import.meta.url);
const cssPath = require.resolve('katex/dist/katex.min.css');
const mathCSS = readFileSync(cssPath, 'utf8').replace(/url\(([^)]+)\)/g, (_match, raw: string) => {
  const path = resolve(dirname(cssPath), raw.replace(/["']/g, ''));
  const mime = path.endsWith('.woff2') ? 'font/woff2' : path.endsWith('.woff') ? 'font/woff' : 'font/ttf';
  return `url(data:${mime};base64,${readFileSync(path).toString('base64')})`;
});
const cache = new Map<string, Buffer>();
let pending = 0;
export async function renderSolutionPng(content: string): Promise<Buffer> {
  const key = createHash('sha256').update(content).digest('hex');
  const existing = cache.get(key);
  if (existing) return existing;
  if (pending >= 2) throw new Error('图片正在排版，请稍后重试。');
  const html = solutionImageHtml(JSON.parse(content), mathCSS);
  pending++;
  try {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, javaScriptEnabled: false, serviceWorkers: 'block' });
      await context.route('**/*', route => route.abort());
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
      await page.evaluate('document.fonts.ready');
      await page.evaluate(`for (const element of document.querySelectorAll('.formula')) {
        const math = element.querySelector('.katex-html');
        if (math && math.getBoundingClientRect().width > element.clientWidth) {
          element.style.fontSize = Math.max(16, 23 * element.clientWidth / math.getBoundingClientRect().width) + 'px';
        }
      }`);
      const overflow = await page.evaluate<boolean>("[...document.querySelectorAll('header, section, .formula, .conclusion, .slide')].some(element => element.scrollWidth > element.clientWidth + 2 || (!element.classList.contains('formula') && element.scrollHeight > element.clientHeight + 4))");
      if (overflow) throw new Error('内容或公式过长，请让 AI 精简步骤后重新生成，避免图片被截断。');
      const png = await page.screenshot({ type: 'png', timeout: 15000 });
      if (cache.size >= 8) cache.delete(cache.keys().next().value!);
      cache.set(key, png);
      return png;
    } finally { await browser.close(); }
  } finally { pending--; }
}
