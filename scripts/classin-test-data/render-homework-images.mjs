// Render approved question text exactly; this script does not call business APIs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const [source, output, lessonList] = process.argv.slice(2);
if (!source || !output) throw new Error('Usage: node render-homework-images.mjs source.json output-directory [2,3,...]');
const selected = lessonList ? new Set(lessonList.split(',').map(Number)) : null;
const dataset = JSON.parse(await readFile(source, 'utf8'));
const units = dataset.units.filter(unit => !selected || selected.has(unit.lesson));
if (selected && units.length !== selected.size) throw new Error('Some requested lessons do not exist');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CLASSIN_RENDER_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
const manifest = { truth: 'AI_GENERATED_TEST_CONTENT', rule: { questions: 4, images: 2, text: 2 }, images: [] };
try {
  for (const unit of units) {
    if (unit.questions.length !== 4) throw new Error(`Lesson ${unit.lesson} must have four questions`);
    for (let i = 0; i < 2; i += 1) {
      const question = unit.questions[i].q;
      const filename = `lesson-${String(unit.lesson).padStart(2, '0')}-question-${i + 1}.png`;
      await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
        *{box-sizing:border-box}body{margin:0;background:white;color:#161616;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
        article{width:1200px;padding:62px 72px 42px;min-height:760px;display:flex;flex-direction:column}
        header{font-size:23px;letter-spacing:2px;color:#555;padding-bottom:23px;border-bottom:2px solid #333}
        h1{font-size:34px;line-height:1.5;font-weight:600;margin:28px 0 30px;overflow-wrap:anywhere}
        .question{font-size:40px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere;font-variant-numeric:lining-nums}
        .number{font-size:25px;font-weight:600;margin-bottom:12px}.space{height:130px;flex:1;min-height:100px}
        footer{font-size:19px;color:#666;border-top:1px solid #ddd;padding-top:20px;display:flex;justify-content:space-between}
      </style><article><header>初中数学 · 单元练习</header><h1>第 ${unit.lesson} 讲\u3000${escape(unit.topic)}</h1><div class="number">第 ${i + 1} 题</div><div class="question">${escape(question)}</div><div class="space"></div><footer><span>请写出思路和关键步骤</span><span>AI 生成 · 测试题</span></footer></article></html>`);
      await page.locator('html').evaluate((element) => element.ownerDocument.fonts.ready);
      const bounds = await page.locator('article').boundingBox();
      const observed = await page.locator('.question').innerText();
      if (observed !== question) throw new Error('Question text changed during rendering');
      if (await page.locator('html').evaluate((element) => element.scrollWidth > 1200)) throw new Error('Horizontal overflow');
      const png = await page.locator('article').screenshot({ path: path.join(output, filename) });
      manifest.images.push({ lesson: unit.lesson, question: i + 1, filename, width: bounds.width, height: bounds.height, bytes: png.length, sha256: createHash('sha256').update(png).digest('hex'), sourceText: question });
    }
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ lessons: units.length, images: manifest.images.length, output }));
} finally { await browser.close(); }
