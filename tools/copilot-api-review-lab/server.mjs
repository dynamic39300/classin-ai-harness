import { reviewOptions, reviewMarkdown } from './lib/review.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_ROOT, DATA_ROOT, modelConfig } from './lib/config.mjs';
import { TOOLS, QUESTIONS, VERSION } from './lib/catalog.mjs';
import { createStore } from './lib/storage.mjs';
import { createBusiness } from './lib/business.mjs';
import { createRuns } from './lib/runs.mjs';
import { callModel } from './lib/model.mjs';
import { observedFields } from './lib/evidence.mjs';

const port=Number(process.env.LAB_PORT||4186),host=`127.0.0.1:${port}`;
const store=createStore(join(DATA_ROOT,'runs')), sceneStore=createStore(join(DATA_ROOT,'catalog'));
const business=createBusiness();let current,pending;
async function getScene(refresh=false){
  if(current&&!refresh)return current;
  if(!refresh){try{current=(await sceneStore.get('scene')).data;return current;}catch{/* First run. */}}
  if(!pending)pending=(async()=>{const trace=[];const data=await business.scene(trace);await sceneStore.save({id:'scene',createdAt:new Date().toISOString(),data,trace});current=data;return data;})().finally(()=>{pending=null;});
  return pending;
}
const present=r=>({...r,reviewOptions:reviewOptions(r)});
const runs=createRuns({store,business,model:callModel,getScene});
// Interrupted records retain evidence and require a new plan/replay instead of continuing a hidden call.
for(const r of await store.list())if(['planning','executing','generating'].includes(r.status)){r.status='interrupted';r.error='上次服务停止时运行未完成。已保留已有证据，请新建计划或快照复测。';await store.save(r);}
function summary(r){return{id:r.id,questionId:r.questionId,question:r.question,mode:r.mode,status:r.status,createdAt:r.createdAt,executedAt:r.executedAt,sourceRunId:r.sourceRunId,review:r.reviews.at(-1),answerCount:r.answers.length,toolCount:r.plan?.length||0};}
async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>100_000)throw new Error('请求过大。');}return JSON.parse(text||'{}');}
function send(res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
function markdown(r){return `# ${r.questionId} ${r.question}\n\n运行：${r.id}\n模式：${r.mode}\n状态：${r.status}\n采集业务时钟：${r.clock}\n\n## 模型工具计划\n\n${(r.plan||[]).map(s=>`- ${s.toolId}：${s.args?.purpose||s.rejection}`).join('\n')}\n\n## 实际执行\n\n${r.results.map(s=>`- ${s.toolId}：${s.status}${s.error?`；${s.error}`:''}`).join('\n')}\n\n## 最新回答\n\n${r.answers.at(-1)?.text||'未生成'}\n\n## 审阅记录\n\n${r.reviews.map(reviewMarkdown).join('\n\n---\n\n')}\n\n完整请求、响应与模型输入请使用同运行的 JSON 导出。含授权测试业务数据，仅用于本地审阅。\n`;}
const server=createServer(async(req,res)=>{
  try{
    if(req.headers.host!==host||(['cross-site'].includes(req.headers['sec-fetch-site']))||(req.headers.origin&&req.headers.origin!==`http://${host}`)){send(res,403,{error:'仅允许本机同源访问。'});return;}
    const url=new URL(req.url,`http://${host}`);const path=url.pathname;
    if(req.method==='POST'&&(!req.headers['content-type']?.startsWith('application/json')||req.headers['x-lab-request']!=='1')){send(res,403,{error:'写入审阅记录需要同源 JSON 请求。'});return;}
    if(req.method==='GET'&&path==='/api/catalog'){
      const cfg=await modelConfig();let scene,error;
      try{scene=await getScene();}catch(e){error=e.message;}
      send(res,200,{version:VERSION,questions:QUESTIONS,tools:TOOLS,scene,error,model:{name:cfg.model,configured:!!(cfg.apiKey&&cfg.baseUrl)},runs:(await store.list()).map(summary)});return;
    }
    if(req.method==='POST'&&path==='/api/refresh'){send(res,200,await getScene(true));return;}
    if(req.method==='GET'&&path==='/api/runs'){send(res,200,(await store.list()).map(summary));return;}
    if(req.method==='POST'&&path==='/api/plan'){send(res,200,present(await runs.plan(await body(req))));return;}
    const match=path.match(/^\/api\/runs\/([a-zA-Z0-9-]+)(?:\/(execute|generate|review|export|fields))?$/);
    if(match){
      const [,id,action]=match;
      if(req.method==='POST'&&['execute','generate'].includes(action)){send(res,200,present(await runs[action](id)));return;}
      if(req.method==='POST'&&action==='review'){send(res,200,present(await runs.review(id,await body(req))));return;}
      if(req.method==='GET'){
        const record=await store.get(id);
        if(action==='fields'){send(res,200,record.trace.map(t=>({id:t.id,fields:observedFields(t.response)})));return;}
        if(action==='export'){
          const md=url.searchParams.get('format')==='md';res.setHeader('Content-Disposition',`attachment; filename="${record.questionId}-${id}.${md?'md':'json'}"`);
          send(res,200,md?markdown(record):present(record),md?'text/markdown; charset=utf-8':undefined);return;
        }
        if(!action){send(res,200,present(record));return;}
      }
    }
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
    if(req.method==='GET'&&files[path]){
      res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'");
      send(res,200,await readFile(join(APP_ROOT,'public',files[path]),'utf8'),path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');return;
    }
    send(res,404,{error:'未找到入口。'});
  }catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.message||'操作失败，请重试。'});}
});
await mkdir(DATA_ROOT,{recursive:true,mode:0o700});
server.listen(port,'127.0.0.1',()=>console.log(`Copilot API Review Lab: http://${host}`));
