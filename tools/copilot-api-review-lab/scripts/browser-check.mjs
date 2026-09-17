// Uses local Chrome and temporary copies of real evidence; never approves user runs.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, unlink, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { DATA_ROOT } from '../lib/config.mjs';

const origin=process.env.LAB_URL||'http://127.0.0.1:4186';
const cases=JSON.parse(await readFile(join(DATA_ROOT,'verification-runs.json'),'utf8'));
const actual=await(await fetch(`${origin}/api/runs/${cases.find(c=>c.questionId==='C2').id}`)).json();
const fixture={...actual,id:`ui-check-${randomUUID()}`,createdAt:new Date().toISOString(),reviews:[{at:new Date().toISOString(),note:'历史验证记录，不代表用户验收',anchor:'R1',verdicts:{routing:'通过'},answerId:actual.answers.at(-1).id}],verificationFixture:true};
const fixturePath=join(DATA_ROOT,'runs',`${fixture.id}.json`);
await writeFile(fixturePath,JSON.stringify(fixture,null,2),{mode:0o600});
const out=join(DATA_ROOT,'verification');await mkdir(out,{recursive:true,mode:0o700});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
const idle=()=>page.waitForFunction(()=>!globalThis.document.querySelector('.progress'));
const screenshot=async name=>{const path=join(out,name);await page.screenshot({path,fullPage:true});await chmod(path,0o600);};
const selectFixture=async()=>{
  await page.getByRole('heading',{name:'下一课与时间',exact:true}).waitFor();
  await page.locator('[data-question="C2"]').click();await idle();
  await page.locator('[data-action="history"]').selectOption(fixture.id);await idle();
};
try {
  await page.goto(origin);await selectFixture();
  assert.equal(await page.locator('#technical-evidence').getAttribute('open'),null);
  assert.ok(await page.getByRole('heading',{name:'模型的实际回答',exact:true}).isVisible());
  assert.equal(await page.locator('pre:visible').count(),0);
  assert.equal(await page.locator('[data-review="anchor"]').count(),0);
  assert.equal(await page.locator('[data-review="match"]').inputValue(),'待评价');
  results.push('answer and optional quality feedback are primary; legacy ratings are not inherited');
  assert.ok(await page.getByRole('heading',{name:'学生交了什么、老师写了什么评语',exact:true}).isVisible());
  assert.equal(await page.getByRole('heading',{name:'谁没交、谁还没批',exact:true}).count(),0);
  await page.locator('[data-suggestion="student-submission"][data-choice="decision"]').selectOption('建议补充');
  await page.locator('[data-suggestion="student-submission"][data-choice="note"]').fill('验证：想了解反馈内容');
  await page.locator('[data-review="note"]').fill('自动化 UI 验证备注；不代表人工验收。');
  await page.locator('[data-review="match"]').selectOption('基本满意');
  const writes=[];page.on('request',req=>{if(req.method()==='POST')writes.push(new URL(req.url()).pathname);});
  await page.getByRole('button',{name:'保存我的反馈',exact:true}).click();
  await page.getByText('2 条已保存记录',{exact:true}).waitFor();
  assert.deepEqual(writes,[`/api/runs/${fixture.id}/review`]);
  results.push('candidate feedback is saved without any extra model or business call');
  await page.evaluate(({id,answerId,hash})=>localStorage.setItem(`lab-review-v2-${id}`,JSON.stringify({version:'answer-quality-v2',answerId,snapshotHash:hash,verdicts:{match:'基本满意',relevance:'待评价',quality:'待评价'},note:'自动化 UI 验证备注；不代表人工验收。',suggestionsVersion:'business-suggestions-v1',suggestions:[{id:'student-submission',decision:'建议补充',note:'验证：想了解反馈内容'},{id:'obsolete-candidate',decision:'需要讨论',note:'旧候选意见'}]})),{id:fixture.id,answerId:fixture.answers.at(-1).id,hash:fixture.snapshotHash});
  await page.reload();await selectFixture();
  assert.ok(await page.evaluate(id=>!!localStorage.getItem(`lab-review-archive-${id}-business-suggestions-v1`),fixture.id));
  assert.equal(await page.locator('[data-review="note"]').inputValue(),'自动化 UI 验证备注；不代表人工验收。');
  assert.equal(await page.locator('[data-suggestion="student-submission"][data-choice="decision"]').inputValue(),'建议补充');
  assert.equal(await page.locator('[data-suggestion="student-submission"][data-choice="note"]').inputValue(),'验证：想了解反馈内容');
  const exported=await(await fetch(`${origin}/api/runs/${fixture.id}/export?format=md`)).text();assert.match(exported,/自动化 UI 验证备注/);assert.match(exported,/学生交了什么/);assert.match(exported,/旧版技术审阅/);
  results.push('quality and candidate comments persist, export plainly, and preserve legacy history');
  await screenshot('desktop-answer.png');
  await page.getByRole('button',{name:'查看 R1 返回',exact:true}).click();
  assert.ok(await page.locator('#request-R1 pre:visible').count());
  results.push('answer-side API path and return shortcut open the exact raw response');
  await page.getByRole('button',{name:'查看字段结构',exact:true}).click();await idle();
  assert.ok(await page.getByText(/字段路径与含义/).count());
  await page.locator('[data-tab="context"]').click();
  await page.getByText('完整 ContextSnapshot（实际发送内容）',{exact:true}).click();
  assert.ok(await page.locator('pre:visible').count());
  results.push('optional technical evidence still exposes actual calls, fields and model inputs');
  await page.route('**/api/plan',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'自动化验证：模型暂时不可用'})}));
  await page.getByRole('button',{name:'测试并生成回答',exact:true}).click();
  await page.getByRole('alert').getByText('自动化验证：模型暂时不可用').waitFor();
  assert.ok(await page.getByRole('button',{name:'测试并生成回答',exact:true}).isEnabled());
  await page.unroute('**/api/plan');results.push('one-click test shows model errors and leaves retry available');
  // Exercise UI orchestration without spending model calls or changing real business records.
  const sequence=[],respond=(route,value)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  const reset={...fixture,reviews:[],answers:[],status:'planned',context:null};
  await page.route('**/api/plan',route=>{sequence.push('plan');return respond(route,reset);});
  await page.route(`**/api/runs/${fixture.id}/execute`,route=>{sequence.push('execute');return respond(route,{...fixture,reviews:[],answers:[],status:'executed'});});
  const generated={...fixture,answers:[{...fixture.answers.at(-1),id:'ui-new-answer'}],reviews:(await(await fetch(`${origin}/api/runs/${fixture.id}`)).json()).reviews};
  await page.route(`**/api/runs/${fixture.id}/generate`,route=>{sequence.push('generate');return respond(route,generated);});
  await page.getByRole('button',{name:'测试并生成回答',exact:true}).click();await idle();
  assert.deepEqual(sequence,['plan','execute','generate']);
  assert.equal(await page.locator('[data-review="match"]').inputValue(),'待评价');
  assert.equal(await page.locator('[data-review="note"]').inputValue(),'');
  assert.equal(await page.locator('[data-suggestion="student-submission"][data-choice="decision"]').inputValue(),'待判断');
  assert.equal(await page.locator('#technical-evidence').getAttribute('open'),null);
  results.push('one-click test runs plan then execute then answer; fresh answer resets all feedback');
  await page.unrouteAll();
  for(const c of cases){
    await page.locator(`[data-question="${c.questionId}"]`).click();await idle();
    await page.locator('[data-action="history"]').selectOption(c.id);await idle();
    assert.equal(await page.locator('#technical-evidence').getAttribute('open'),null);
    if(c.questionId==='A2'){assert.equal(await page.getByText('下节课的具体安排',{exact:true}).count(),0);assert.ok(await page.getByRole('heading',{name:'下节课学生人数：3 人',exact:true}).isVisible());assert.equal(await page.locator('[data-suggestion]').count(),0);}
    assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false,`${c.questionId} desktop overflow`);
    await page.locator('#technical-evidence > summary').click();
    for(const tab of ['plan','execution','context']){await page.locator(`[data-tab="${tab}"]`).click();assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false,`${c.questionId} ${tab} desktop overflow`);}
  }
  results.push('all four questions and optional technical tabs remain accessible');
  await page.locator('[data-question="C2"]').click();await idle();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false,'mobile answer overflow');
  await screenshot('narrow-review.png');
  await page.locator('#technical-evidence > summary').click();
  for(const tab of ['plan','execution','context']){await page.locator(`[data-tab="${tab}"]`).click();assert.equal(await page.evaluate(()=>globalThis.document.documentElement.scrollWidth>globalThis.innerWidth),false,`${tab} mobile overflow`);}
  results.push('desktop and 390px layouts have no horizontal overflow');
  const denied=await fetch(`${origin}/api/plan`,{method:'POST',headers:{Origin:'https://outside.example','Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);results.push('cross-origin mutation rejected');
  assert.deepEqual(errors,[]);results.push('no browser runtime errors');
  await writeFile(join(out,'browser-check.json'),JSON.stringify({at:new Date().toISOString(),results},null,2),{mode:0o600});console.log(JSON.stringify({passed:results.length,results}));
}finally{await browser.close();await unlink(fixturePath);}
