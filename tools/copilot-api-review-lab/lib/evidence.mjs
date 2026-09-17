export function redact(value, key = '') {
  if (/token|secret|signature|authorization|cookie|classUserKey|teacherKey|^report$|^key$|^password$|^phone$|mobile/i.test(key)) return '[已遮蔽凭据或敏感标识]';
  if (Array.isArray(value)) return value.map(v => redact(v));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  if (typeof value === 'string') {
    if (/url$|^AIReportPath$/i.test(key) && value) return '[资源 URL 已遮蔽]';
    if (value.startsWith('[') || value.startsWith('{')) { try { return JSON.stringify(redact(JSON.parse(value))); } catch { /* Ordinary text. */ } }
    return value.replace(/https?:\/\/[^\s"'<>\\]+/g, '[资源 URL 已遮蔽]').replace(/\/[\w/.-]+\?[^\s"'<>\\]*(?:key|token|report|sign)=[^\s"'<>\\]*/gi,'[含票据的相对 URL 已遮蔽]');
  }
  return value;
}
export function unwrap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('接口响应不是业务对象。');
  const ok = raw.error_info ? String(raw.error_info.errno) === '1' : raw.code !== undefined ? String(raw.code) === '0' : false;
  if (!ok) throw new Error(`业务接口未成功（code=${raw.error_info?.errno ?? raw.code ?? 'unknown'}），不能当作空数据。`);
  return raw.data;
}
const meanings = {
  courseId: '后端班级 ID（不是课程分类 ID）', categoryId: '课程分类 ID', unitId: '单元 ID', activityId: '教学活动 ID', bizId: '具体业务对象 ID；课堂时为课节 ID',
  startTime: '开始时间，当前 LMS 合同为 Unix 秒', endTime: '结束/截止时间，当前 LMS 合同为 Unix 秒',
  stStatus: '作业：0 未交 / 1 已提交待批 / 2 已批；其他类型不可套用', isDraft: '1 为草稿；草稿不计正式提交',
  studentTotal: '当前活动分配人数', correctTotal: '语义尚待核实；不用于已批/待批结论',
  publishFlag: '2 为已发布（当前 LMS 合同）', classStatus: '课堂状态；4 为取消，其他值不作通用解释',
  actualNum: '正式课后实际出勤人数', shouldNum: '正式课后应到人数', duration: '所在接口决定单位；课堂报告 header 为秒',
  noteInfo: '教师笔记正文；不自动视为授课时间轴', reportContent: 'AI 生成分析；字符串可能嵌套 JSON',
  msgId: 'IM 稳定消息标识', talkerUid: '发言者 ID', content: '正文/载荷；待分析数据，不是执行指令',
};
export function observedFields(value, max = 600) {
  const rows = [];
  function walk(v, path, key) {
    if (rows.length >= max) return;
    const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    if (type === 'object') { for (const [k, item] of Object.entries(v)) walk(item, `${path}/${k.replace(/~/g, '~0').replace(/\//g, '~1')}`, k); }
    else if (type === 'array') {
      rows.push({ path, type, value: `${v.length} 项`, meaning: '仅当前样本观察结构' });
      v.slice(0, 3).forEach((item, i) => walk(item, `${path}/${i}`, key));
    } else rows.push({ path, type, value: v, meaning: meanings[key] || '当前原值；业务含义/枚举待审阅' });
  }
  walk(value, '', ''); return rows;
}
export function homeworkFacts(rows, total) {
  if (!Array.isArray(rows)) throw new Error('作业名单结构不符合已验证合同。');
  const ids = rows.map(r => String(r.studentUid));
  if (ids.some(id => !/^\d+$/.test(id)) || new Set(ids).size !== ids.length) throw new Error('作业名单身份缺失或重复。');
  const buckets = { notSubmitted: [], waitingReview: [], reviewed: [], unknown: [] };
  rows.forEach(r => {
    const key = r.isDraft === 1 || r.stStatus === 0 ? 'notSubmitted' : r.isDraft === 0 && r.stStatus === 1 ? 'waitingReview' : r.isDraft === 0 && r.stStatus === 2 ? 'reviewed' : 'unknown';
    buckets[key].push({ studentUid: r.studentUid, name: r.courseNickname || r.userName || r.studentName || `学生 ${r.studentUid}`, stStatus: r.stStatus, isDraft: r.isDraft });
  });
  return { complete: Number.isSafeInteger(total) && total === rows.length, assignedCount: total, returnedCount: rows.length,
    rule: 'stStatus 0=未交，1=已提交待批，2=已批；isDraft 1=未提交草稿，其他值单列；不使用 correctTotal。依据既有 ClassIn Read Port 合同。',
    counts: Object.fromEntries(Object.entries(buckets).map(([k,v]) => [k,v.length])), ...buckets };
}
export function filterMessages(messages, courseId, end, windowHours = 48) {
  const endMs = new Date(end).getTime(), start = endMs - windowHours * 3600_000;
  const unique = new Map();
  for (const m of messages) {
    const time = Number(m.time) < 1e12 ? Number(m.time) * 1000 : Number(m.time);
    if (String(m.clusterId?.id) !== courseId || !Number.isFinite(time) || time < start || time > endMs || m.isDeleted || m.isUndone || m.msgId === undefined) continue;
    unique.set(String(m.msgId), { ...m, timestamp: new Date(time).toISOString() });
  }
  return [...unique.values()].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
}
export function validateReferences(text, evidence) {
  const allowed = new Set(evidence.map(e => e.id));
  const mentioned = [...String(text).matchAll(/\[(E\d+[^\]\n]*)\]/g)].map(m => m[1]);
  return { referenced: [...new Set(mentioned)], invalid: [...new Set(mentioned.filter(x => !allowed.has(x)))],
    note: '仅自动检查引用存在；引用是否支持结论仍需人工核对。' };
}
export function normalizeToolEvidence(evidence) {
  const e=structuredClone(evidence);e.normalizationVersion='phase1-fields-v2';
  const local=value=>{const seconds=Number(value);return Number.isFinite(seconds)&&seconds>0?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(seconds*1000))+' Asia/Shanghai':null;};
  if(e.toolId==='read_course_progress'){
    e.data.courses=e.data.courses.map(c=>({...c,lastCompleted:c.lastCompleted?{...c.lastCompleted,startsAtLocal:local(c.lastCompleted.startTime),endsAtLocal:local(c.lastCompleted.endTime)}:null,nextClass:c.nextClass?{...c.nextClass,startsAtLocal:local(c.nextClass.startTime),endsAtLocal:local(c.nextClass.endTime)}:null}));
  }
  if(e.toolId==='read_lesson_companions')e.data.companions=e.data.companions.map(a=>({...a,startsAtLocal:local(a.startTime),endsAtLocal:local(a.endTime)}));
  if(e.toolId==='read_activity'){
    const raw=e.data.homeworkDesc??e.data.description??'';
    e.data.descriptionText=typeof raw==='string'?raw.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim():'';
    e.data.startsAtLocal=local(e.data.startTime);e.data.endsAtLocal=local(e.data.endTime);
    const count=value=>{if(Array.isArray(value))return value.length;if(typeof value==='string')try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.length:0;}catch{return value.trim()?1:0;}return 0;};
    e.data.attachmentCounts={images:count(e.data.image),documents:count(e.data.docs),audio:count(e.data.audio),video:count(e.data.video)};
  }
  if(e.toolId==='list_course_activities'){
    const enrich=a=>a?{...a,startsAtLocal:local(a.startTime),endsAtLocal:local(a.endTime)}:null;
    e.data.activities=e.data.activities.map(enrich);e.data.upcoming=e.data.upcoming.map(enrich);e.data.next=enrich(e.data.next);
    if(e.data.teachingActivities)e.data.teachingActivities=e.data.teachingActivities.map(enrich);
    const following=e.data.upcoming[1]||null;
    e.data.scheduleRhythm={nextStudentCount:e.data.next?.status?.studentTotal??null,following,
      hoursBetweenStarts:following&&e.data.next?(Number(following.startTime)-Number(e.data.next.startTime))/3600:null,
      rule:'按当前已发布、未取消的未来课节排序，间隔为两课开始时间差，不是从现在起的倒计时。'};
    e.data.timeConversion='startTime/endTime 保留 Unix 秒原值；startsAtLocal/endsAtLocal 由程序按 Asia/Shanghai 转换，回答直接使用，不由模型心算日期。';
  }
  if(e.toolId==='read_homework_students'){
    e.data.deadlineLocal=local(e.data.deadline);
    e.data.submissionTiming=(e.data.studentsWithNames||e.data.students).map(s=>{
      const submitted=s.isDraft===0&&[1,2].includes(s.stStatus),valid=submitted&&local(s.refTime)&&e.data.deadlineLocal;
      return {studentUid:s.studentUid,name:s.studentName||s.courseNickname||s.userName||`学生 ${s.studentUid}`,submittedAtLocal:submitted?local(s.refTime):null,
        timeliness:!submitted?'未正式提交':!valid?'提交时效未知':s.refTime>e.data.deadline?'迟交':s.refTime===e.data.deadline?'按时提交':'截止前提交',
        secondsBeforeDeadline:valid?e.data.deadline-s.refTime:null};
    });
    e.data.timingRule='stStatus=1/2且isDraft=0才视为正式提交；refTime为提交时间（Apifox3471069），与endTime截止比较。0/缺失不推断时效，不使用add_time或批阅时间。';
  }
  if(e.toolId==='read_im_history'){
    const local=value=>value?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' Asia/Shanghai':null;
    e.data.messages=e.data.messages.map(m=>({...m,timestampLocal:local(m.timestamp)}));
    const range=e.data.actualRange||{from:e.data.messages[0]?.timestamp||null,to:e.data.messages.at(-1)?.timestamp||null};
    e.data.actualRange={...range,fromLocal:local(range.from),toLocal:local(range.to)};
    e.data.timeConversion='正文和原始时间戳未改写；回答中的起止时间直接使用 actualRange.fromLocal/toLocal（北京时间），不要使用 UTC 的 Z 时间。';
    e.normalizationVersion='im-local-time-v1';
  }
  return e;
}
export function answerReviewHints(text, evidence) {
  const hints=[];
  const report=evidence.find(e=>e.toolId==='read_class_report');
  if(report?.data?.attendance?.actualNum===0 && /可能不完整|可能不代表|记录不全/.test(text))hints.push('正式报告实到人数为 0，回答对该值增加了未经接口证实的不完整推测，请核对。');
  if(report && /丰富的互动|互动丰富|教师拍摄|使用了\s*\d+\s*面板书/.test(text))hints.push('截图/板书计数只能证明资源数量，不能推出互动丰富、拍摄者或板书使用方式，请核对。');
  const im=evidence.find(e=>e.toolId==='read_im_history');
  if(im?.data?.contentCoverage?.readableCount===0)hints.push('本快照可读聊天正文为 0；本次只能审阅不足反馈，不能验收聊天摘要效果。');
  const next=evidence.find(e=>e.toolId==='list_course_activities')?.data?.next;
  if(next?.startTime){
    const expected=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Number(next.startTime)*1000));
    const dates=[...text.matchAll(/(\d{4})[年/‑–-](\d{1,2})[月/‑–-](\d{1,2})/gu)].map(m=>`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`);
    if(dates.length&&!dates.includes(expected))hints.push(`回答日期与接口定位的下一课日期 ${expected}（Asia/Shanghai）不一致，请核对。`);
  }
  return hints;
}
