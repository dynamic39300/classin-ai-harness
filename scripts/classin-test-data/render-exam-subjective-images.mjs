// Render exact approved question text; no business API is called here.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const [source, output] = process.argv.slice(2);
if (!source || !output) throw new Error('Usage: node render-exam-subjective-images.mjs source.json output-directory');
const data=JSON.parse(await readFile(source,'utf8'));
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CLASSIN_RENDER_CHROME||undefined});
const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
const manifest={truth:'AI_GENERATED_TEST_CONTENT',images:[]};
try {
  for(const exam of data.exams) for(const q of exam.questions.filter(x=>x.imageQuestion)) {
    const filename=`lesson-${String(exam.lesson).padStart(2,'0')}-subjective-${q.imageNo}.png`;
    await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;background:#fff;color:#161616;font-family:"PingFang SC","Microsoft YaHei",sans-serif}
      article{width:1200px;min-height:760px;padding:58px 70px 38px;display:flex;flex-direction:column}
      header{font-size:22px;letter-spacing:1px;color:#555;padding-bottom:22px;border-bottom:2px solid #333}
      h1{font-size:31px;line-height:1.45;margin:26px 0 22px}.q{font-size:38px;line-height:1.75;white-space:pre-wrap;overflow-wrap:anywhere}
      .space{min-height:180px;flex:1}footer{font-size:19px;color:#666;border-top:1px solid #ddd;padding-top:18px;display:flex;justify-content:space-between}
    </style><article><header>初中数学 · 单元测验 · 主观题</header><h1>第 ${exam.lesson} 讲\u3000${esc(exam.topic)}</h1><div class="q">${esc(q.imageQuestion)}</div><div class="space"></div><footer><span>请写出完整思路与关键步骤</span><span>AI 生成 · 测试数据</span></footer></article></html>`);
    await page.locator('html').evaluate((element) => element.ownerDocument.fonts.ready);
    const observed=await page.locator('.q').innerText();
    if(observed!==q.imageQuestion) throw new Error(`Text mismatch: lesson ${exam.lesson}/${q.imageNo}`);
    const png=await page.locator('article').screenshot({path:path.join(output,filename)});
    manifest.images.push({lesson:exam.lesson,imageNo:q.imageNo,filename,sourceText:q.imageQuestion,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')});
  }
  await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({images:manifest.images.length,output}));
} finally { await browser.close(); }
