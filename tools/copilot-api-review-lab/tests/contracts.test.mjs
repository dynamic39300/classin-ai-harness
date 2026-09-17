import { reviewOptions, REVIEW_VERSION, SUGGESTIONS_VERSION, reviewMarkdown } from '../lib/review.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validatePlanCalls } from '../lib/catalog.mjs';
import { redact, unwrap, homeworkFacts, filterMessages, observedFields, validateReferences, answerReviewHints, normalizeToolEvidence } from '../lib/evidence.mjs';
import { createStore } from '../lib/storage.mjs';
import { createRuns } from '../lib/runs.mjs';
import { createBusiness, sign } from '../lib/business.mjs';

const call=(name,args={purpose:'验证业务',expectedFields:['status']})=>({id:'call-1',function:{name,arguments:JSON.stringify(args)}});
test('unknown tools, scope overrides and malformed arguments are rejected',()=>{
  assert.match(validatePlanCalls([call('send_im')])[0].rejection,/不存在/);
  assert.match(validatePlanCalls([call('read_activity',{purpose:'x',expectedFields:[],activityId:'foreign'})])[0].rejection,/参数/);
  assert.ok(validatePlanCalls([{id:'x',function:{name:'read_activity',arguments:'bad'}}])[0].rejection);
  assert.equal(validatePlanCalls([call('read_activity')])[0].status,'planned');
});
test('business failure cannot become empty success',()=>{
  assert.throws(()=>unwrap({error_info:{errno:101},data:[]}),/未成功/);
  assert.deepEqual(unwrap({error_info:{errno:1},data:[]}),[]);
  assert.throws(()=>unwrap({data:[]}),/未成功/);
});
test('homework draft, pending, reviewed and unknown stay distinct',()=>{
  const facts=homeworkFacts([{studentUid:1,stStatus:1,isDraft:1},{studentUid:2,stStatus:1,isDraft:0},{studentUid:3,stStatus:2,isDraft:0},{studentUid:4,stStatus:9,isDraft:0}],5);
  assert.deepEqual(facts.counts,{notSubmitted:1,waitingReview:1,reviewed:1,unknown:1});assert.equal(facts.complete,false);
  assert.throws(()=>homeworkFacts([{studentUid:1},{studentUid:1}],2),/重复/);
});
test('IM evidence excludes another group, old, future, deleted and duplicate messages',()=>{
  const end='2026-09-16T08:00:00Z',time=Date.parse(end)-3600_000,m={msgId:1,time,clusterId:{id:591820},content:'sample'};
  const result=filterMessages([m,m,{...m,msgId:2,clusterId:{id:999}},{...m,msgId:3,time:time-72*3600_000},{...m,msgId:4,isDeleted:true},{...m,msgId:5,time:time+7200_000}], '591820',end);
  assert.equal(result.length,1);assert.equal(result[0].msgId,1);
});
test('redaction handles nested serialized JSON and URLs without losing empty/zero values',()=>{
  const raw={data:{classUserKey:'sensitive',reportUrl:'/client/report?report=private-ticket',zero:0,empty:[],reportContent:JSON.stringify({token:'nested',url:'https://example.test/?key=x'})}};
  const out=redact(raw);assert.equal(out.data.zero,0);assert.deepEqual(out.data.empty,[]);assert.ok(!JSON.stringify(out).includes('sensitive'));assert.ok(!JSON.stringify(out).includes('https://'));
  assert.ok(!out.data.reportContent.includes('nested'));
  assert.ok(!JSON.stringify(out).includes('private-ticket'));
});
test('observed fields preserve JSON pointers and mark unresolved fields',()=>{
  const rows=observedFields({data:{'a/b':0,unknown:null}});
  assert.equal(rows[0].path,'/data/a~1b');assert.equal(rows[0].value,0);assert.match(rows[1].meaning,/待审阅/);
  assert.deepEqual(validateReferences('事实[E1] 错引[E9]',[{id:'E1'}]).invalid,['E9']);
  assert.deepEqual(validateReferences('虚构段号[E1:27-38]',[{id:'E1'}]).invalid,['E1:27-38']);
});
test('review hints surface unsupported zero-attendance and image-count inferences',()=>{
  const evidence=[{toolId:'read_class_report',data:{attendance:{actualNum:0}}}];
  assert.equal(answerReviewHints('实到可能不完整，课堂有丰富的互动',evidence).length,2);
  assert.deepEqual(answerReviewHints('报告记录实到 0 人，仅依据教师笔记回顾。',evidence),[]);
});
test('Unix lesson times are normalized deterministically and wrong model dates flagged',()=>{
  const activity={startTime:1789716600,endTime:1789723800};const e={toolId:'list_course_activities',data:{activities:[activity],upcoming:[activity],next:activity}};
  const normalized=normalizeToolEvidence(e);assert.equal(normalized.data.next.startsAtLocal,'2026-09-18 15:30 Asia/Shanghai');assert.equal(e.data.next.startsAtLocal,undefined);
  assert.equal(answerReviewHints('下节课2026年9月17日15:30',[e]).length,1);assert.deepEqual(answerReviewHints('下节课2026-09-18 15:30',[e]),[]);
});
test('store persists private records and refuses traversal',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'classin-lab-test-'));try{const store=createStore(dir);await store.save({id:'r-1',createdAt:new Date().toISOString(),note:'review'});assert.equal((await store.get('r-1')).note,'review');assert.equal((await stat(join(dir,'r-1.json'))).mode&0o777,0o600);await assert.rejects(()=>store.get('../secret'));}finally{await rm(dir,{recursive:true,force:true});}
});
function fixture(modelCalls){
  const records=new Map();const store={save:async r=>records.set(r.id,structuredClone(r)),get:async id=>{if(!records.has(id))throw new Error('missing');return structuredClone(records.get(id));}};
  let executionCount=0;
  const business={scene:async()=>({complete:true,activities:[]}),execute:async(id,s,c,trace,parent)=>{executionCount++;trace.push({id:'R1',parent,source:'live',response:{data:{value:5}}});return{toolId:id,data:{value:5,activities:[],upcoming:[],next:null,messages:[]},limitations:[],sourceRefs:['R1#/response']};}};
  const model=async(messages,tools,onRequest)=>{await onRequest({messages,tools:tools||[]});return{message:tools?{content:'',tool_calls:modelCalls}:{content:'值为5 [E1]'},model:'test-fixture-only'};};
  const runs=createRuns({store,business,model,getScene:async()=>({complete:true,activities:[]})});
  return{runs,store,count:()=>executionCount};
}
test('execution follows actual model tool selection and does not fill missing tools',async()=>{
  const f=fixture([call('list_course_activities')]);let r=await f.runs.plan({questionId:'A2',question:'下节课？',mode:'live'});assert.deepEqual(r.plan.map(s=>s.toolId),['list_course_activities']);r=await f.runs.execute(r.id);assert.equal(f.count(),1);assert.equal(r.context.evidence.length,1);r=await f.runs.generate(r.id);assert.equal(r.answers.length,1);assert.deepEqual(r.answers[0].references.invalid,[]);
});
test('snapshot execution never silently fetches live data',async()=>{
  const f=fixture([call('list_course_activities')]);let original=await f.runs.plan({questionId:'A2',question:'下节课？',mode:'live'});original=await f.runs.execute(original.id);let replay=await f.runs.plan({questionId:'A2',question:'复测下节课？',mode:'snapshot',sourceRunId:original.id});replay=await f.runs.execute(replay.id);assert.equal(f.count(),1);assert.equal(replay.results[0].status,'replayed');assert.equal(replay.clock,original.clock);assert.equal(replay.reviews.length,0);
});
test('no model tools means clarification, not a fabricated execution',async()=>{
  const f=fixture([]);const r=await f.runs.plan({questionId:'C2',question:'哪一个？',mode:'live'});assert.equal(r.plan.length,0);await assert.rejects(()=>f.runs.execute(r.id),/没有|需要/);assert.equal(f.count(),0);
});
const feedback=r=>({version:REVIEW_VERSION,answerId:r.answers.at(-1)?.id,snapshotHash:r.snapshotHash,note:'回答太长，希望直接说结论',verdicts:{match:'基本满意'},suggestionsVersion:SUGGESTIONS_VERSION,suggestions:[]});
test('quality feedback preserves legacy history, context and answer version',async()=>{
  const f=fixture([call('list_course_activities')]);let r=await f.runs.plan({questionId:'A2',question:'下节课？',mode:'live'});r=await f.runs.execute(r.id);r=await f.runs.generate(r.id);const hash=r.snapshotHash;
  const legacy={note:'旧技术反馈',anchor:'R1',verdicts:{routing:'通过'}};r.reviews.push(legacy);await f.store.save(r);
  r=await f.runs.review(r.id,feedback(r));assert.deepEqual(r.reviews[0],legacy);assert.equal(r.reviews[1].verdicts.relevance,'待评价');assert.equal(r.snapshotHash,hash);
  const stale=feedback(r);await f.runs.generate(r.id);await assert.rejects(()=>f.runs.review(r.id,stale),/版本已变化/);
});
test('candidate feedback snapshots plain-language descriptions and never calls APIs',async()=>{
  const f=fixture([call('list_course_activities')]);let r=await f.runs.plan({questionId:'A2',question:'下节课？',mode:'live'});r=await f.runs.execute(r.id);r=await f.runs.generate(r.id);const count=f.count();
  r.context.evidence[0].data.next={name:'测试课',activityId:1};await f.store.save(r);
  const item=reviewOptions(r).items[0];const input={...feedback(r),suggestions:[{id:item.id,decision:'建议补充',note:'希望具体一点'}]};
  r=await f.runs.review(r.id,input);assert.equal(f.count(),count);assert.deepEqual(r.reviews[0].suggestions[0].candidate,item);assert.match(reviewMarkdown(r.reviews[0]),/下节课安排了多少学生/);
  await assert.rejects(()=>f.runs.review(r.id,{...input,suggestions:[{id:'invented',decision:'建议补充',note:''}]}),/建议无效/);
  await assert.rejects(()=>f.runs.review(r.id,{...input,suggestionsVersion:'old'}),/已更新/);
});
test('suggestions exclude tried endpoints including dependencies, failures and replays',()=>{
  const run={questionId:'C2',executedAt:'2026-09-16',status:'answered',trace:[],results:[],plan:[]};
  assert.equal(reviewOptions({...run,executedAt:null}).items.length,0);
  assert.ok(reviewOptions(run).items.some(x=>x.id==='student-submission'));
  for(const source of ['live','replay']){const options=reviewOptions({...run,trace:[{path:'/lms/app/activity/homework/student/detail',status:'failed',source,role:'dependency'}]});assert.ok(!options.items.some(x=>x.id==='student-submission'));}
  const options=reviewOptions({...run,results:[{toolId:'read_homework_students',status:'failed'}]});assert.ok(!options.items.some(x=>x.id==='homework-roster'));
});
test('foreign activity selection is rejected before the planner runs',async()=>{
  const f=fixture([call('read_activity')]);await assert.rejects(()=>f.runs.plan({questionId:'C2',question:'看作业',mode:'live',activityId:'foreign'}),/不属于/);assert.equal(f.count(),0);
});
test('missing snapshot tool does not fall back to a live API',async()=>{
  const calls=[call('list_course_activities')],f=fixture(calls);let original=await f.runs.plan({questionId:'A2',question:'课表',mode:'live'});original=await f.runs.execute(original.id);calls.splice(0,1,call('read_activity'));let replay=await f.runs.plan({questionId:'A2',question:'课堂详情',mode:'snapshot',sourceRunId:original.id});replay=await f.runs.execute(replay.id);assert.equal(f.count(),1);assert.equal(replay.status,'failed');assert.match(replay.results[0].error,/原快照缺少/);
});
test('upstream teacher/school mismatch stops further requests',async()=>{
  let calls=0;const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async()=>{calls++;return new Response(JSON.stringify({code:0,data:{total:1,list:[{courseId:591820,schoolUid:999,identity:3}]}}),{status:200});}});
  await assert.rejects(()=>b.scene([]),/无权/);assert.equal(calls,1);
});
test('detail object mismatch is not usable evidence',async()=>{
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async()=>new Response(JSON.stringify({code:0,data:{id:1,courseId:591820,categoryId:3153610,unitId:2,bizId:9}}),{status:200})});
  const trace=[];await assert.rejects(()=>b.execute('read_activity',{activityId:88,type:2,publishFlag:2,unitId:2,bizId:9},{complete:true},trace,'call',new Date().toISOString()),/归属/);assert.equal(trace.length,1);
});
test('signed transport retains JSON versus form contracts without persisting secrets',()=>{
  const f=sign({courseId:591820},true,'fixture-only',1700000000),j=sign({courseId:591820},false,'fixture-only',1700000000);
  assert.equal(f.body,'courseId=591820');assert.equal(j.body,'{"courseId":591820}');assert.ok(j.headers['X-EEO-TOKEN']);assert.ok(!JSON.stringify(f).includes('fixture-only'));assert.equal(f.headers['X-EEO-UID'],'632586');
});

test('A2 suggestions compare information, not just which endpoint was unused',()=>{
  const next={activityId:1,name:'测试课',startTime:1,endTime:2,status:{studentTotal:3}};
  const r={questionId:'A2',status:'answered',executedAt:'now',trace:[],results:[],plan:[],context:{evidence:[{id:'E1',toolId:'list_course_activities',data:{next},sourceRefs:['R1#/response']}]}};
  let options=reviewOptions(r);assert.deepEqual(options.items,[]);assert.ok(options.available.some(x=>x.title==='下节课学生人数：3 人'));assert.ok(options.available.some(x=>x.id==='next-schedule'));
  next.status.studentTotal=0;options=reviewOptions(r);assert.deepEqual(options.items,[]);assert.ok(options.available.some(x=>x.title==='下节课学生人数：0 人'));
  next.status.studentTotal=null;options=reviewOptions(r);assert.deepEqual(options.items.map(x=>x.id),['next-lesson-students']);assert.ok(!options.available.some(x=>x.id==='next-student-count'));
  r.context.evidence[0].data.next=null;assert.deepEqual(reviewOptions(r).items,[]);
});
test('unreadable chat is not a reason to recommend unrelated schedule data',()=>{
  const r={questionId:'F1',status:'answered',executedAt:'now',trace:[],results:[],plan:[],context:{evidence:[{toolId:'read_im_history',data:{contentCoverage:{readableCount:0},messages:[]}}]}};
  assert.deepEqual(reviewOptions(r).items,[]);
});

test('original IM body survives capture-to-context, including URLs, emoji and line breaks',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'classin-original-im-'));
  try{
    await mkdir(join(dir,'im-original'));
    const end='2026-09-16T08:00:00Z',content='原文😀\nhttps://example.test/a?value=1&next=2';
    const m={msgId:1,clusterId:{id:591820,type:0},time:Date.parse(end)-72*3600_000,content};
    const sample={version:'private-im-original-v1',capturedAt:end,scope:{uid:'632586',courseId:'591820'},frames:[{capturedAt:end,messages:[m]}]};
    const path=join(dir,'im-original/latest.json');await writeFile(path,JSON.stringify(sample));
    const b=createBusiness({imRoot:dir});const trace=[];const e=await b.execute('read_im_history',null,null,trace,'test',end);
    assert.equal(e.data.messages[0].content,content);assert.equal(trace[0].response.frames[0].messages[0].content,content);assert.equal(e.data.contentCoverage.readableCount,1);assert.equal(e.data.contentCoverage.redactedCount,0);assert.equal(e.data.requestedWindow.hours,120);const normalized=normalizeToolEvidence(e);assert.equal(normalized.data.actualRange.fromLocal,'2026-09-13 16:00 Asia/Shanghai');assert.equal(normalized.data.messages[0].content,content);assert.equal(e.data.coverage.complete,false);
    assert.equal(filterMessages([m],'591820',end).length,0);assert.equal(filterMessages([m],'591820',end,120).length,1);
    sample.scope.uid='foreign';await writeFile(path,JSON.stringify(sample));await assert.rejects(()=>b.execute('read_im_history',null,null,[],'test',end),/归属/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('homework timeliness distinguishes draft, unknown, before, equal and after deadline',()=>{
  const row={studentUid:1,isDraft:0,stStatus:2,refTime:1000};
  const e=normalizeToolEvidence({toolId:'read_homework_students',data:{deadline:2000,students:[row,{...row,refTime:2000},{...row,refTime:2100},{...row,refTime:0},{...row,isDraft:1},{...row,stStatus:0}]}});
  assert.deepEqual(e.data.submissionTiming.map(s=>s.timeliness),['截止前提交','按时提交','迟交','提交时效未知','未正式提交','未正式提交']);
});
test('schedule rhythm uses two lesson start times and keeps original data',()=>{
  const next={startTime:1789716600,endTime:1789723800,status:{studentTotal:3}},following={startTime:1789889400};
  const raw={toolId:'list_course_activities',data:{activities:[next,following],upcoming:[next,following],next}};const e=normalizeToolEvidence(raw);assert.equal(e.data.scheduleRhythm.nextStudentCount,3);assert.equal(e.data.scheduleRhythm.hoursBetweenStarts,48);assert.equal(raw.data.scheduleRhythm,undefined);
});
test('mixed IM and LMS reads only model-selected tools while capture mode stays isolated',async()=>{
  const calls=[call('read_im_history'),{...call('list_course_activities'),id:'call-2'}],f=fixture(calls);
  let r=await f.runs.plan({questionId:'F1',question:'聊天与LMS核对',mode:'mixed'});r=await f.runs.execute(r.id);assert.equal(f.count(),2);assert.equal(r.context.evidence.length,2);
  const g=fixture([call('list_course_activities')]);let only=await g.runs.plan({questionId:'F1',question:'聊天',mode:'capture'});only=await g.runs.execute(only.id);assert.equal(g.count(),0);assert.equal(only.status,'failed');
});
test('homework names come from same-class students; no guessed name on lookup failure',async()=>{
  const selected={activityId:88,type:2,publishFlag:2,unitId:2,bizId:9};let failNames=false;
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url)=>{
    const data=url.includes('/homework/get')?{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9,studentTotal:1,endTime:2000}:url.includes('/homework/students')?[{studentUid:1,isDraft:0,stStatus:2,refTime:1000}]:[{memberUid:1,identity:1,courseNickname:'测试姓名'}];
    if(failNames&&url.includes('getCourseMember'))throw new Error('offline');return new Response(JSON.stringify({code:0,data}));
  }});
  let e=await b.execute('read_homework_students',selected,{complete:true},[],'call','now');assert.equal(e.data.reviewed[0].name,'测试姓名');assert.ok(e.fieldMappings[0].sources.length===2);
  failNames=true;e=await b.execute('read_homework_students',selected,{complete:true},[],'call','now');assert.equal(e.data.counts.reviewed,1);assert.ok(e.limitations.some(x=>x.includes('姓名未取得')));
});

test('ASR uses verified replay files, preserves original text, and keeps partial failures separate',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9},text='原始转写😀\nhttps://example.test/课堂';const trace=[],sent=[];
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url,options)=>{
    sent.push({url,body:options.body});let data;
    if(url.includes('/activity/class/get'))data={id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9};
    else if(url.includes('getLessonRecordInfo'))data={lessonId:9,lessonData:{fileList:[{FileId:'101'},{FileId:'102'}]}};
    else {const p=JSON.parse(options.body);assert.equal(p.subtitle,1);assert.equal(p.isRetry,false);if(p.fileId==='102')throw new Error('file unavailable');data={cosUrl:'https://private.example/?token=secret-fixture',content:{children:[{desc:text,metadata:{times:['00:00:01','00:00:03']},children:null}]}};}
    return new Response(JSON.stringify({code:0,data}));
  }});
  const e=await b.execute('read_class_transcript',selected,{complete:true},trace,'call','now');
  assert.equal(e.data.segmentCount,1);assert.deepEqual(e.data.transcripts.map(f=>f.status),['available','failed']);assert.equal(e.data.transcripts[0].segments[0].text,text);
  assert.equal(trace[2].response.data.content.children[0].desc,text);assert.ok(!JSON.stringify(trace).includes('secret-fixture'));assert.equal(sent.length,4);assert.ok(e.fieldMappings[0].sources[0].startsWith('R3#'));
});
test('ASR rejects wrong lesson and oversized lists; empty replay does not invent transcript',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9};let replay={lessonId:99,lessonData:[]},calls=0;
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url)=>{calls++;return new Response(JSON.stringify({code:0,data:url.includes('/activity/class/get')?{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9}:replay}));}});
  await assert.rejects(()=>b.execute('read_class_transcript',selected,{complete:true},[],'call','now'),/不一致/);assert.equal(calls,2);
  replay={lessonId:9,lessonData:[]};const e=await b.execute('read_class_transcript',selected,{complete:true},[],'call','now');assert.equal(e.data.segmentCount,0);assert.equal(e.data.fileCount,0);assert.equal(calls,4);
  replay={lessonId:9,lessonData:{fileList:Array.from({length:11},(_,i)=>({FileId:String(i)}))}};await assert.rejects(()=>b.execute('read_class_transcript',selected,{complete:true},[],'call','now'),/边界/);assert.equal(calls,6);
});
test('ASR malformed time structure is a per-file failure, not fabricated usable text',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9};
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url)=>new Response(JSON.stringify({code:0,data:url.includes('/activity/class/get')?{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9}:url.includes('getLessonRecordInfo')?{lessonId:9,lessonData:{fileList:[{FileId:'101'}]}}:{content:{children:[{desc:'测试',metadata:{times:[null,null]}}]}}}))});
  const e=await b.execute('read_class_transcript',selected,{complete:true},[],'call','now');assert.equal(e.data.transcripts[0].status,'failed');assert.equal(e.data.segmentCount,0);assert.match(e.data.transcripts[0].error,/时间字段/);
});

test('phase2 course progress stays separate by category and never invents one mixed percentage',async()=>{
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url,options)=>{
    const p=options.headers['Content-Type']==='application/json'?JSON.parse(options.body):Object.fromEntries(new URLSearchParams(options.body));let data;
    if(url.endsWith('/category/list'))data={list:[{categoryId:10,name:'课程甲'},{categoryId:20,name:'课程乙'}]};
    else if(url.endsWith('/unitList'))data={list:[{unitId:Number(p.categoryId)+1,name:'单元',activityCount:1}]};
    else data={list:[{unitId:Number(p.categoryId)+1,pageTotal:1,activities:[{activityId:Number(p.categoryId)+2,type:1,publishFlag:2,classStatus:0,startTime:100,endTime:Number(p.categoryId)===10?150:9999999999}]}]};
    return new Response(JSON.stringify({code:0,data}));
  }});
  const e=await b.execute('read_course_progress',null,{complete:true,className:'测试班'},[],'call','1970-01-01T00:03:20Z');
  assert.deepEqual(e.data.courses.map(c=>c.name),['课程甲','课程乙']);assert.deepEqual(e.data.courses.map(c=>c.completedClassCount),[1,0]);assert.ok(!('percent' in e.data));
});
test('phase2 roster separates students from auditors and staff',async()=>{
  const rows=[{memberUid:1,identity:1},{memberUid:2,identity:1},{memberUid:3,identity:2},{memberUid:4,identity:3},{memberUid:5,identity:4}];
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async()=>new Response(JSON.stringify({code:0,data:rows}))});
  const e=await b.execute('read_class_roster',null,{complete:true,className:'测试班'},[],'call','now');assert.deepEqual([e.data.studentCount,e.data.auditorCount,e.data.teacherCount,e.data.assistantCount],[2,1,1,1]);assert.ok(!JSON.stringify(e.data).includes('memberUid'));
});
test('phase2 lesson companions only keep published activities from the selected unit',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9,name:'课堂'};
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url)=>{
    const data=url.includes('/activity/class/get')?{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9,name:'课堂'}:{list:[{unitId:2,pageTotal:1,activities:[selected,{activityId:89,type:2,publishFlag:2,name:'配套作业'},{activityId:90,type:5,publishFlag:1,name:'未发布资料'}]}]};
    return new Response(JSON.stringify({code:0,data}));
  }});
  const e=await b.execute('read_lesson_companions',selected,{complete:true},[],'call','now');assert.deepEqual(e.data.companions.map(a=>a.name),['配套作业']);assert.equal(e.data.companions[0].typeLabel,'作业');
});
test('phase2 replay metadata removes file ids and playback URLs from model evidence',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9,name:'课堂'};
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async(url)=>{
    const data=url.includes('/activity/class/get')?{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9,name:'课堂'}:{lessonId:9,lessonData:{fileList:[{FileId:'private-file',Status:'2',Duration:30,Playset:[{Url:'https://private.example/video'}]}]},playbackDetail:{canPlay:1}};
    return new Response(JSON.stringify({code:0,data}));
  }});
  const e=await b.execute('read_replay_metadata',selected,{complete:true},[],'call','now');assert.equal(e.data.fileCount,1);assert.equal(e.data.files[0].playableVariantCount,1);assert.ok(!JSON.stringify(e.data).includes('private-file'));assert.ok(!JSON.stringify(e.data).includes('private.example'));
});
test('phase2 class report refuses to turn a future lesson into realtime attendance',async()=>{
  const selected={activityId:88,type:1,publishFlag:2,unitId:2,bizId:9,name:'未来课堂',endTime:2000};let calls=0;
  const b=createBusiness({getSecret:async()=> 'fixture-only',fetcher:async()=>{calls++;return new Response(JSON.stringify({code:0,data:{id:88,courseId:591820,categoryId:3153610,unitId:2,bizId:9}}));}});
  await assert.rejects(()=>b.execute('read_class_report',selected,{complete:true},[],'call','1970-01-01T00:16:40Z'),/尚未结束/);assert.equal(calls,1);
});
test('open question may clarify without tools or route a course-level read without an object',async()=>{
  let f=fixture([]),r=await f.runs.plan({questionId:'OPEN',question:'这节课有哪些回放？',mode:'live'});assert.equal(r.plan.length,0);assert.equal(f.count(),0);
  f=fixture([call('read_course_progress')]);r=await f.runs.plan({questionId:'OPEN',question:'我们班有哪些课程？',mode:'live'});assert.deepEqual(r.plan.map(x=>x.toolId),['read_course_progress']);
});
