import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SCOPE, TOOLS } from './catalog.mjs';
import { SOURCE_ROOT, DATA_ROOT, teacherSecret } from './config.mjs';
import { redact, unwrap, homeworkFacts, filterMessages } from './evidence.mjs';
import { transcriptSegments } from './transcript.mjs';

const BASE = 'https://dynamic14.eeo.im';
const ROUTES = new Set(TOOLS.flatMap(t => t.endpoints).filter(p => p.startsWith('/')));
ROUTES.add('/lms/app/activity/homework/get'); ROUTES.add('/lms/app/activity/class/get');
const md5 = s => createHash('md5').update(s).digest('hex');
// Contract reference: server/classin-test-transport.ts, signedRequest; standalone implementation.
export function sign(fields, form, secret, ts = Math.floor(Date.now()/1000)) {
  const headers = { 'X-EEO-UID': SCOPE.uid, 'X-EEO-TS': String(ts), 'User-Agent': 'classin-review-lab/1' };
  let body;
  if (form) {
    const values = Object.fromEntries(Object.entries(fields).map(([k,v]) => [k,String(v)]));
    body = new URLSearchParams(values).toString();
    const input = Object.entries({ ...values, timeStamp: String(ts) }).filter(([k,v]) => k !== 'key' && !k.includes('[') && Buffer.byteLength(v)<=1024)
      .sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => `${k}=${v}`).join('&');
    headers['X-EEO-SIGN'] = md5(`${input}&key=${secret}`); headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else {
    body = JSON.stringify(fields); const raw = Buffer.from(body), i = Math.min(ts%10, raw.length);
    headers['X-EEO-SIGN'] = md5(Buffer.concat([raw.subarray(0,i),Buffer.from(String(ts)),raw.subarray(i)]));
    headers['X-EEO-SIGN-VERSION'] = '1'; headers['Content-Type'] = 'application/json';
    const encode = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({exp:ts+300,jti:randomUUID(),iat:ts-300,nbf:ts-300,data:{uid:Number(SCOPE.uid)}})}`;
    headers['X-EEO-TOKEN'] = `${token}.${createHmac('sha256',secret).update(token).digest('base64url')}`;
  }
  return { headers, body };
}
export function createBusiness({ fetcher = fetch, getSecret = teacherSecret, sourceRoot = SOURCE_ROOT, imRoot = DATA_ROOT } = {}) {
  async function api(path, fields, form, trace, parent, role='tool') {
    if (!ROUTES.has(path)) throw new Error('接口不在本审阅台只读白名单。');
    const record = { id: `R${trace.length+1}`, parent, role, method:'POST', path, params:redact(fields), startedAt:new Date().toISOString(), source:'live', status:'running' };
    trace.push(record);
    try {
      const response = await fetcher(`${BASE}${path}`, { method:'POST', ...sign(fields, form, await getSecret()), redirect:'error', signal:AbortSignal.timeout(15_000) });
      record.httpStatus = response.status;
      if (!response.ok) throw new Error(`接口 HTTP ${response.status}，本次读取失败。`);
      const body = await response.text();
      if (body.length>4_000_000) throw new Error('响应超出审阅台单次读取上限。');
      let raw; try { raw=JSON.parse(body); } catch { throw new Error('接口没有返回合法 JSON。'); }
      record.response = redact(raw);
      if(path==='/course-ai-assistant/app/file/richVideoSummary' && raw.data?.content)record.response.data.content=structuredClone(raw.data.content);
      const data = unwrap(raw); record.status='success'; return data;
    } catch(e) { record.status='failed';record.error=String(e.message || '读取失败');throw e; }
    finally {record.finishedAt=new Date().toISOString();record.elapsedMs=Date.parse(record.finishedAt)-Date.parse(record.startedAt);}
  }
  async function scene(trace=[], parent='system-scope') {
    const call = (p,f,form=true) => api(p,f,form,trace,parent,'authorization');
    const classes=[]; let total=Infinity;
    for(let page=1;classes.length<total;page++) {
      if(page>20)throw new Error('班级分页超出边界，未取全。');
      const d=await call('/course/app/member/course_list',{states:[0],page,pageSize:50,identitys:[3,192],processing:1},false);
      if(!Array.isArray(d?.list)||!Number.isSafeInteger(d.total)||(!d.list.length&&classes.length<d.total))throw new Error('班级列表分页不完整。');
      total=d.total;classes.push(...d.list);
    }
    const selected=classes.find(c=>String(c.courseId)===SCOPE.courseId);
    if(!selected||String(selected.schoolUid)!==SCOPE.schoolId||![3,192].includes(Number(selected.identity)))throw new Error('当前教师无权读取固定测试班级。');
    const categories=await call('/lms/app/category/list',{courseId:SCOPE.courseId});
    const category=categories?.list?.find(c=>String(c.categoryId)===SCOPE.categoryId);
    if(!category)throw new Error('授权课程不存在于当前班级。');
    const u=await call('/lms/app/course/unitList',{courseId:SCOPE.courseId,categoryId:SCOPE.categoryId,sort:'asc'});
    if(!Array.isArray(u?.list)||u.list.some(x=>String(x.categoryId)!==SCOPE.categoryId))throw new Error('单元归属无法核实。');
    const units=u.list;
    const a=units.length?await call('/lms/app/course/unitActivityList',{courseId:SCOPE.courseId,categoryId:SCOPE.categoryId,SID:SCOPE.schoolId,unitIds:JSON.stringify(units.map(x=>Number(x.unitId))),offset:0,limit:100,sort:'asc'}):{list:[]};
    if(!Array.isArray(a.list))throw new Error('活动列表结构未知。');
    const activities=[];const seen=new Set();
    for(const g of a.list) {
      const unit=units.find(u=>String(u.unitId)===String(g.unitId));
      if(!unit||seen.has(String(g.unitId))||Number(g.pageTotal)>1||!Array.isArray(g.activities)||g.activities.length!==unit.activityCount)throw new Error('活动分页或单元总量不完整，不能认定全课程覆盖。');
      seen.add(String(g.unitId));
      for(const row of g.activities) {
        if(String(row.categoryId)!==SCOPE.categoryId||String(row.unitId)!==String(unit.unitId))throw new Error('活动返回归属不匹配。');
        activities.push({...row,unitName:unit.name});
      }
    }
    if(units.some(u=>u.activityCount>0&&!seen.has(String(u.unitId)))||new Set(activities.map(a=>String(a.activityId))).size!==activities.length)throw new Error('活动列表缺失或重复。');
    return { scope:SCOPE,className:selected.courseName,courseName:category.name,activities,units,complete:true,capturedAt:new Date().toISOString() };
  }
  async function verifyActivity(selected, trace, parent) {
    if(!selected||![1,2].includes(selected.type)||selected.publishFlag!==2)throw new Error('需要选中当前课程中已发布的课堂或作业。');
    const kind=selected.type===1?'class':'homework';
    const d=await api(`/lms/app/activity/${kind}/get`,{activityId:String(selected.activityId),courseId:SCOPE.courseId},true,trace,parent,'dependency');
    if(String(d.id??d.activityId)!==String(selected.activityId)||String(d.courseId)!==SCOPE.courseId||String(d.categoryId)!==SCOPE.categoryId||String(d.unitId)!==String(selected.unitId)||String(d.bizId)!==String(selected.bizId))throw new Error('详情与选中活动的归属不一致。');
    return d;
  }
  async function imCapture(trace, parent) {
    let original;
    try{original=JSON.parse(await readFile(join(imRoot,'im-original/latest.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    if(original&&(original.version!=='private-im-original-v1'||String(original.scope?.uid)!==SCOPE.uid||String(original.scope?.courseId)!==SCOPE.courseId))throw new Error('IM 原文样本归属不符。');
    const sources=original?[]:[
      'lms-web-capture-2026-09-16/capture/network-events.redacted.jsonl',
      'lms-student-teacher-assessment-im-capture-2026-09-16/capture/network-events.redacted.jsonl',
    ];
    const frames=original?.frames||[];
    for(const relative of sources) {
      let text;try{text=await readFile(join(sourceRoot,'.runtime/private',relative),'utf8');}catch{continue;}
      for(const line of text.split('\n')) {
        let event,p;
        try{event=JSON.parse(line);if(event.event!=='websocketFrameReceived'||!event.url?.includes('/chat-gateway-go/ws'))continue;p=JSON.parse(event.payload);}catch{continue;}
        const messages=p.type==='requestChatMsg'&&Array.isArray(p.data)?p.data:p.type==='clusterEvent:receiveChatMsg'&&p.data?.msg?[p.data.msg]:[];
        const scoped=messages.filter(m=>String(m.clusterId?.id)===SCOPE.courseId);
        if(scoped.length)frames.push({capturedAt:event.capturedAt,sourceFile:relative,type:p.type,messages:scoped});
      }
    }
    if(!frames.length)throw new Error('未找到已授权班群的真实捕获消息。');
    frames.sort((a,b)=>a.capturedAt.localeCompare(b.capturedAt));
    const end=original?.capturedAt||frames.at(-1).capturedAt;
    const windowHours=original?120:48;
    const response={frames:original?frames:redact(frames),coverage:{complete:false,reason:'本次实际读取的部分消息，有多少可读正文就总结多少；未声明完整历史。',capturedAt:end},originalContent:!!original,windowHours};
    trace.push({id:`R${trace.length+1}`,parent,role:'tool',method:'WS CAPTURE',path:'wss://dynamic14.eeo.im/chat-gateway-go/ws → requestChatMsg / receiveChatMsg',params:{clusterId:{id:SCOPE.courseId},windowHours},startedAt:new Date().toISOString(),source:'captured',status:'success',response});
    const messages=filterMessages(original?frames.flatMap(f=>f.messages):redact(frames.flatMap(f=>f.messages)),SCOPE.courseId,end,windowHours);
    const readableCount=messages.filter(m=>typeof m.content==='string'&&m.content.trim()&&(original||!m.content.includes('[REDACTED]'))).length;
    return {timeAnchor:end,timeZone:'Asia/Shanghai',requestedWindow:{hours:windowHours,from:new Date(Date.parse(end)-windowHours*3600_000).toISOString(),to:end},actualRange:{from:messages[0]?.timestamp||null,to:messages.at(-1)?.timestamp||null},originalContent:!!original,messages,contentCoverage:{returnedCount:messages.length,readableCount,redactedCount:original?0:messages.filter(m=>typeof m.content==='string'&&m.content.includes('[REDACTED]')).length,unreadableCount:messages.length-readableCount},coverage:response.coverage};
  }
  async function execute(toolId, selected, current, trace, parent, clock) {
    const t=TOOLS.find(t=>t.id===toolId);
    if(!t)throw new Error('未知工具。');
    if(t.kind==='class'&&selected?.type!==1)throw new Error('该工具需要选中一节课堂。');
    if(t.kind==='homework'&&selected?.type!==2)throw new Error('该工具需要选中一份作业。');
    const start=trace.length;
    const call=(p,f,form=true)=>api(p,f,form,trace,parent);
    let data,limitations=[];
    if(toolId==='read_im_history') {data=await imCapture(trace,parent);limitations.push(data.coverage.reason,'来源为已登录客户端取得的真实消息快照；有正文即可总结，尚非独立实时连接。');if(data.contentCoverage.redactedCount)limitations.push(`历史采集已遮蔽 ${data.contentCoverage.redactedCount} 条消息正文；实际可读 ${data.contentCoverage.readableCount} 条，不能从字段结构推测聊天内容。`);}
    else if(toolId==='read_course_progress') {
      if(!current?.complete)throw new Error('授权现场未核验完成。');
      const categories=await call('/lms/app/category/list',{courseId:SCOPE.courseId});
      if(!Array.isArray(categories?.list)||categories.list.length>50)throw new Error('课程分类列表结构未知或超出50项边界。');
      const courses=[];
      for(const category of categories.list){
        if(!/^\d+$/.test(String(category.categoryId)))throw new Error('课程分类标识缺失。');
        const units=await call('/lms/app/course/unitList',{courseId:SCOPE.courseId,categoryId:String(category.categoryId),sort:'asc'});
        if(!Array.isArray(units?.list)||units.list.length>100)throw new Error('课程单元结构未知或超出100项边界。');
        let activities=[];
        if(units.list.length){
          const groups=await call('/lms/app/course/unitActivityList',{courseId:SCOPE.courseId,categoryId:String(category.categoryId),SID:SCOPE.schoolId,unitIds:JSON.stringify(units.list.map(u=>Number(u.unitId))),offset:0,limit:100,sort:'asc'});
          if(!Array.isArray(groups?.list)||groups.list.some(g=>Number(g.pageTotal)>1||!Array.isArray(g.activities)))throw new Error('课程活动分页或结构不完整。');
          activities=groups.list.flatMap(g=>g.activities.map(a=>({...a,unitName:units.list.find(u=>String(u.unitId)===String(g.unitId))?.name||''})));
          if(new Set(activities.map(a=>String(a.activityId))).size!==activities.length)throw new Error('课程活动存在重复，不能计算进度。');
        }
        const classes=activities.filter(a=>a.type===1&&a.publishFlag===2&&a.classStatus!==4).sort((a,b)=>a.startTime-b.startTime);
        const now=new Date(clock).getTime()/1000,ended=classes.filter(a=>Number(a.endTime)<=now),upcoming=classes.filter(a=>Number(a.startTime)>now);
        courses.push({categoryId:String(category.categoryId),name:category.name||category.categoryName||'未命名课程',unitCount:units.list.length,activityCount:activities.length,classCount:classes.length,completedClassCount:ended.length,lastCompleted:ended.at(-1)||null,nextClass:upcoming[0]||null});
      }
      data={className:current.className,clock,courses,rule:'每门课程分别统计已发布且未取消的课堂；completedClassCount仅按endTime不晚于业务时钟计算。不同类型活动不混成学习百分比。'};
    }
    else if(toolId==='read_class_roster') {
      if(!current?.complete)throw new Error('授权现场未核验完成。');
      const members=await call('/course/app/getCourseMember',{SID:Number(SCOPE.schoolId),clientCourseId:Number(SCOPE.courseId),identity:[1,2,3,4]},false);
      if(!Array.isArray(members)||members.length>500||new Set(members.map(m=>String(m.memberUid))).size!==members.length)throw new Error('班级成员结构未知、重复或超出500人边界。');
      const count=identity=>members.filter(m=>Number(m.identity)===identity).length;
      data={className:current.className,totalReturned:members.length,studentCount:count(1),auditorCount:count(2),teacherCount:count(3),assistantCount:count(4),otherCount:members.filter(m=>![1,2,3,4].includes(Number(m.identity))).length,rule:'identity 1=学生、2=旁听、3=教师、4=助教；各类分别统计，不把旁听和教师计入学生人数。'};
    }
    else if(toolId==='list_course_activities') {
      const s=await scene(trace,parent);
      const classroom=s.activities.filter(a=>a.type===1);
      const upcoming=classroom.filter(a=>a.publishFlag===2&&a.classStatus!==4&&Number(a.startTime)*1000>new Date(clock).getTime()).sort((a,b)=>a.startTime-b.startTime);
      data={className:s.className,courseName:s.courseName,clock,complete:s.complete,activities:classroom,teachingActivities:s.activities,upcoming,next:upcoming[0]??null,rule:'已发布 publishFlag=2、非取消 classStatus≠4、startTime（Unix秒）大于业务时钟；按开始时间排序。'};
    } else {
      if(!current?.complete)throw new Error('授权现场未核验完成。');
      const detail=await verifyActivity(selected,trace,parent);
      if(toolId==='read_activity')data=detail;
      else if(toolId==='read_lesson_companions') {
        const groups=await call('/lms/app/course/unitActivityList',{courseId:SCOPE.courseId,categoryId:SCOPE.categoryId,SID:SCOPE.schoolId,unitIds:JSON.stringify([Number(selected.unitId)]),offset:0,limit:100,sort:'asc'});
        if(!Array.isArray(groups?.list)||groups.list.length!==1||Number(groups.list[0].pageTotal)>1||!Array.isArray(groups.list[0].activities)||String(groups.list[0].unitId)!==String(selected.unitId))throw new Error('所选课堂单元的活动列表不完整。');
        const labels={1:'课堂',2:'作业',3:'测验',4:'录播',5:'学习资料'};
        const companions=groups.list[0].activities.filter(a=>String(a.activityId)!==String(selected.activityId)&&a.publishFlag===2).map(a=>({activityId:a.activityId,name:a.name,type:a.type,typeLabel:labels[a.type]||'其他活动',startTime:a.startTime,endTime:a.endTime,publishFlag:a.publishFlag,processFlag:a.processFlag}));
        data={lessonName:detail.name||selected.name,unitId:String(selected.unitId),unitName:selected.unitName||'',companions,counts:Object.fromEntries([...new Set(companions.map(a=>a.typeLabel))].map(label=>[label,companions.filter(a=>a.typeLabel===label).length])),rule:'只取与所选课堂相同unitId且publishFlag=2的其他活动；不按名称跨单元关联。'};
      }
      else if(toolId==='read_homework_students') {
        const students=await call('/lms/app/activity/homework/students',{activityId:String(selected.activityId),courseId:SCOPE.courseId});
        let members;try{members=await api('/course/app/getCourseMember',{SID:Number(SCOPE.schoolId),clientCourseId:Number(SCOPE.courseId),identity:[1,2]},false,trace,parent,'dependency');
        if(!Array.isArray(members)||new Set(members.map(m=>String(m.memberUid))).size!==members.length)throw new Error('同班成员名单无法唯一核对。');
        }catch{members=[];limitations.push('同班姓名未取得，提交和批阅状态仍使用本次实际名单；可重试姓名查询。');}
        const names=new Map(members.filter(m=>m.identity===1).map(m=>[String(m.memberUid),m.courseNickname||m.userName||'']));
        const studentsWithNames=students.map(s=>({...s,studentName:names.get(String(s.studentUid))||'',nameSource:names.get(String(s.studentUid))?'同班成员名单':'未取得姓名'}));
        data={activityName:detail.name||selected.name,deadline:detail.endTime,students,studentsWithNames,...homeworkFacts(studentsWithNames,detail.studentTotal)};
        if(!data.complete)limitations.push('分配人数与返回名单数量不一致，不能断言名单完整。');
        if(data.unknown.length)limitations.push('存在未核实状态，未计入未交/待批/已批。');
        if(studentsWithNames.some(s=>!s.studentName))limitations.push('部分学生未匹配到当前班级姓名，保留标识，不猜姓名。');
      } else if(toolId==='read_class_report') {
        const clockMs=new Date(clock).getTime();
        if(Number.isFinite(clockMs)&&Number.isFinite(Number(selected.endTime))&&Number(selected.endTime)*1000>clockMs)throw new Error('所选课堂尚未结束，正式课后报告不可用于回答实时考勤；当前审阅台尚无成员级实时考勤样本。');
        const entry=await call('/api/classin.api.php?action=getReportUrl',{SID:SCOPE.schoolId,UID:SCOPE.uid,clientClassId:String(selected.bizId),identify:3,language:'zh-CN'});
        const keys=[entry.newUrl,entry.url].filter(Boolean).map(u=>new URL(u).searchParams.get('key'));
        if(!keys.length||keys.some(k=>!k)||new Set(keys).size!==1)throw new Error('报告票据缺失或冲突。');
        const r=await call('/classroom/web/class/report/overallView',{classUserKey:keys[0],UID:SCOPE.uid});
        if(String(r.classInfo?.courseId)!==SCOPE.courseId||String(r.classInfo?.classId)!==String(selected.bizId)||String(r.classInfo?.schoolUid)!==SCOPE.schoolId)throw new Error('正式报告对象不匹配。');
        data={classInfo:r.classInfo,header:r.header,attendance:r.attendance,highlights:r.classRecords?.classPic?.length??null,blackboards:r.classRecords?.blackboardImgs?.length??null};
        limitations.push('正式课后报告；图片只读取元信息/计数，未做图像理解；不是课堂逐字稿。');
      } else if(toolId==='read_replay_metadata') {
        const replay=await call('/api/classin.api.php?action=getLessonRecordInfo',{SID:SCOPE.schoolId,clientCourseId:SCOPE.courseId,clientClassId:String(selected.bizId),memberUid:SCOPE.uid});
        if(String(replay?.lessonId)!==String(selected.bizId))throw new Error('回放课节与选中课堂不一致。');
        const files=Array.isArray(replay.lessonData)&&replay.lessonData.length===0?[]:replay.lessonData?.fileList;
        if(!Array.isArray(files)||files.length>10)throw new Error('回放文件列表结构未知或超出10个文件边界。');
        data={lessonName:detail.name||selected.name,fileCount:files.length,availability:files.length?'files_returned':'empty',files:files.map(f=>({rawStatus:f.Status??null,statusMessage:f.Message??null,durationValue:f.Duration??null,recordedStartAt:f.StartTime??null,recordedEndAt:f.EndTime??null,createdAt:f.CreateTime??null,playableVariantCount:Array.isArray(f.Playset)?f.Playset.length:0})),access:{canPlay:replay.playbackDetail?.canPlay??null,showPlayCount:replay.playbackDetail?.canShow??null,limitCount:replay.playbackDetail?.limitCount??null,playCount:replay.playbackDetail?.playCount??null}};
        limitations.push('回放状态和时长单位没有完整公开枚举；只展示原值与实际文件数。','回放文件存在不等于覆盖完整计划课堂；未读取媒体正文或播放地址。');
      } else if(toolId==='read_teacher_notes') {
        data=await call('/api/classin.api.php?action=getClassNotes',{SID:SCOPE.schoolId,clientClassId:String(selected.bizId),memberUid:SCOPE.uid,perpage:100});
        if(!Array.isArray(data.noteList)||data.noteList.length!==Number(data.totalNum))limitations.push('笔记未取全或字段结构未知。');
        limitations.push('只读取当前教师本人笔记；创建时间不代表授课时间轴。');
      } else if(toolId==='read_class_transcript') {
        const replay=await call('/api/classin.api.php?action=getLessonRecordInfo',{SID:SCOPE.schoolId,clientCourseId:SCOPE.courseId,clientClassId:String(selected.bizId),memberUid:SCOPE.uid});
        if(String(replay?.lessonId)!==String(selected.bizId))throw new Error('回放课节与选中课堂不一致。');
        const files=Array.isArray(replay.lessonData)&&replay.lessonData.length===0?[]:replay.lessonData?.fileList;
        if(!Array.isArray(files)||files.length>10||files.some(f=>!/^\d+$/.test(String(f.FileId)))||new Set(files.map(f=>String(f.FileId))).size!==files.length)throw new Error('回放文件列表未知、重复或超出10个文件边界。');
        const transcripts=[];
        for(const file of files){
          const item={fileId:String(file.FileId),durationRaw:file.Duration,status:'reading'};transcripts.push(item);
          try{
            const response=await call('/course-ai-assistant/app/file/richVideoSummary',{bizType:1,subtitle:1,classId:Number(selected.bizId),courseId:Number(SCOPE.courseId),fileId:item.fileId,isRetry:false,schoolId:Number(SCOPE.schoolId)},false);
            item.sourceRef=`${trace.at(-1).id}#/response/data/content`;
            if(response?.content==null){item.status='unavailable';item.reason='本次响应没有转写正文';continue;}
            item.segments=transcriptSegments(response.content);item.language=response.language;
            item.status=item.segments.length?'available':'empty';
          }catch(e){item.status='failed';item.error=e.message;}
        }
        data={classId:String(selected.bizId),activityName:detail.name||selected.name,fileCount:files.length,transcripts,segmentCount:transcripts.reduce((n,f)=>n+(f.segments?.length||0),0),timeSemantics:'start/end为各自视频内的相对时间，不是绝对授课时刻；多个视频不能直接拼接。'};
        if(transcripts.some(f=>f.status!=='available'))limitations.push('部分回放文件没有取得可读转写，失败与空结果逐文件保留。');
        if(!files.length)limitations.push('本次未返回回放文件，不能据此判断课堂没有讲解。');
        limitations.push('原始机器转写可能误识别数字、符号和语句；不自动纠正，不以转写推断学生掌握情况。');
        if(files.length>1)limitations.push('同一课节有多个视频，可能重复或主题不一致；按文件核对内容，冲突材料不能混入本课回顾。');
      } else if(toolId==='read_ai_analysis') {
        const fields={courseId:Number(SCOPE.courseId),classId:Number(selected.bizId)};
        const has=await call('/course-ai-assistant/app/course/checkAiTeachingAnalysisRecord',fields,false);
        if(has.hasRecord===false)data={hasRecord:false};
        else if(has.hasRecord!==true)throw new Error('AI 分析可用性状态未知。');
        else {
          const loc=await call('/course-ai-assistant/app/file/aiTeachingAnalysis',{...fields,theme:'light',language:'zh-CN',fileIds:[]},false);
          if(!Array.isArray(loc.list)||loc.list.length!==1)throw new Error('AI 报告定位不唯一，需要选择记录。');
          const r=loc.list[0];const report=new URL(r.reportUrl,BASE).searchParams.get('report');
          if(!report)throw new Error('AI 报告定位票据缺失。');
          data=await call('/course-ai-assistant/admin/ai-teaching-analysis/report',{classId:fields.classId,report,reqFileId:r.requestFileId??''},false);
          if(data.classInfo?.classId!==undefined&&String(data.classInfo.classId)!==String(selected.bizId))throw new Error('AI 报告课节不一致。');
        }
        limitations.push('AI 生成分析独立于正式事实；评分包装层可能冲突，学生对话/进步描述需正式数据佐证。','本工具不含原始 ASR；转写需另选 read_class_transcript，不能用生成对白替代。');
      } else throw new Error('当前阶段未实现该工具。');
    }
    const toolTrace=trace.slice(start);
    const last=toolTrace.at(-1);
    const studentTrace=toolTrace.find(t=>t.path==='/lms/app/activity/homework/students');
    const ref=(record,path)=>`${record.id}#/response${path}`;
    const fieldMappings=toolId==='read_course_progress'?[{contextPath:'courses',sources:toolTrace.map(r=>`${r.id}#/response`),transform:data.rule}]
      :toolId==='read_class_roster'?[{contextPath:'studentCount / auditorCount / teacherCount / assistantCount',sources:[ref(last,'/data')],transform:data.rule}]
      :toolId==='list_course_activities'?[{contextPath:'activities / upcoming / next',sources:[ref(last,'/data/list/*/activities')],transform:data.rule}]
      :toolId==='read_lesson_companions'?[{contextPath:'companions / counts',sources:[ref(last,'/data/list/0/activities')],transform:data.rule}]
      :toolId==='read_homework_students'?[{contextPath:'students / notSubmitted / waitingReview / reviewed / unknown / counts',sources:[ref(studentTrace,'/data'),ref(last,'/data')],transform:data.rule+'；studentUid 与同班 memberUid 关联姓名。'},{contextPath:'assignedCount',sources:[ref(toolTrace[0],'/data/studentTotal')],transform:'真实分配人数；与 students.length 核对'}]
      :toolId==='read_class_report'?['classInfo','header','attendance'].map(key=>({contextPath:key,sources:[ref(last,`/data/${key}`)],transform:'字段原值；票据遮蔽'})).concat([{contextPath:'highlights / blackboards',sources:[ref(last,'/data/classRecords/classPic'),ref(last,'/data/classRecords/blackboardImgs')],transform:'数组长度；未读取媒体正文'}])
      :toolId==='read_replay_metadata'?[{contextPath:'fileCount / availability / files / access',sources:[ref(last,'/data/lessonData/fileList'),ref(last,'/data/playbackDetail')],transform:'逐文件只投影状态、时长、录制/生成时间和播放版本数量；删除FileId、播放地址和票据。'}]
      :toolId==='read_class_transcript'?data.transcripts.filter(f=>f.sourceRef).map((f)=>({contextPath:`transcripts[fileId=${f.fileId}].segments`,sources:[f.sourceRef],transform:'desc原文；metadata.times[0/1]为视频相对起止时间；sourcePath保留原文路径。'}))
      :toolId==='read_im_history'?[{contextPath:'messages',sources:[ref(last,'/frames/*/messages')],transform:'按班群ID、按本次记录的查询窗口（新原文样本默认5天，旧样本48小时）、消息ID去重；过滤已撤回/删除；time值按秒或毫秒规范化，原值保留'}]
      :[{contextPath:'data',sources:[ref(last,'/data')],transform:'保持业务结构，遮蔽凭据/资源URL；不把AI分析提升为正式事实'}];
    return {toolId,data:['read_im_history','read_class_transcript'].includes(toolId)?data:redact(data),limitations,fieldMappings,sourceRefs:toolTrace.map(r=>`${r.id}#/response`)};
  }
  return {scene,execute,imCapture};
}
