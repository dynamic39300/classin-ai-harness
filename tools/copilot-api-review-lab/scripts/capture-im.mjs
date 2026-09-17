// Short-lived, read-only capture through the user's signed-in ClassIn page.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DATA_ROOT } from '../lib/config.mjs';
import { SCOPE } from '../lib/catalog.mjs';
const endpoint=process.env.LAB_CDP_ENDPOINT||'http://127.0.0.1:7777';
const parsed=new URL(endpoint);if(parsed.hostname!=='127.0.0.1')throw new Error('只允许本机已有客户端。');
const targets=await(await fetch(`${endpoint}/json`,{signal:AbortSignal.timeout(3000)})).json();
const pages=targets.filter(t=>t.type==='page'&&t.url.startsWith('https://wsevlf001.eeo.im/client/lmsbleach/six'));
if(pages.length!==1)throw new Error('请保持测试教师客户端中有一个明确的 LMS 页面。');
const target=pages[0],ws=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let seq=0;
const sockets=new Set(),identities=new Map(),authenticated=new Set(),frames=[],requests=[],diagnostics=[];let authObserved=false;
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP ${method} 超时`));},8000);pending.set(id,{resolve,reject,timeout});ws.send(JSON.stringify({id,method,params}));});
ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){clearTimeout(p.timeout);pending.delete(msg.id);if(msg.error)p.reject(new Error(msg.error.message));else p.resolve(msg.result);}return;}
  const p=msg.params||{};
  if(msg.method==='Network.webSocketCreated'&&p.url.startsWith('wss://dynamic14.eeo.im/chat-gateway-go/ws'))sockets.add(p.requestId);
  if(!sockets.has(p.requestId))return;
  if(!['Network.webSocketFrameReceived','Network.webSocketFrameSent'].includes(msg.method))return;
  let frame;try{frame=JSON.parse(p.response.payloadData);}catch{return;}
  if(msg.method==='Network.webSocketFrameSent'){
    if(frame.type==='auth'){const uid=frame.data?.uid??frame.uid;identities.set(p.requestId,String(uid));if(String(uid)===SCOPE.uid)authObserved=true;}
    if(frame.type==='requestChatMsg'&&String(frame.data?.clusterId?.id)===SCOPE.courseId)requests.push({type:frame.type,clusterId:frame.data.clusterId,count:frame.data.count,msgId:frame.data.msgId,isForward:frame.data.isForward});
    return;
  }
  if(identities.get(p.requestId)!==SCOPE.uid)return;
  if(frame.type==='auth'&&frame.data?.status==='authenticated'&&String(frame.data.uid)===SCOPE.uid)authenticated.add(p.requestId);
  if(!authenticated.has(p.requestId))return;
  diagnostics.push({type:frame.type,dataKind:Array.isArray(frame.data)?'array':typeof frame.data,dataKeys:frame.data&&typeof frame.data==='object'?Object.keys(frame.data).slice(0,12):[],sampleClusterType:Array.isArray(frame.data)?frame.data[0]?.clusterId?.type:undefined,sampleScopeMatch:Array.isArray(frame.data)?String(frame.data[0]?.clusterId?.id)===SCOPE.courseId:undefined});
  const list=frame.type==='requestChatMsg'&&Array.isArray(frame.data)?frame.data:frame.type==='clusterEvent:receiveChatMsg'&&frame.data?.msg?[frame.data.msg]:[];
  const messages=list.filter(m=>String(m.clusterId?.id)===SCOPE.courseId&&[0,'group'].includes(m.clusterId?.type));
  if(messages.length)frames.push({capturedAt:new Date().toISOString(),type:frame.type,messages});
});
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',()=>reject(new Error('无法连接客户端')), {once:true});});
try{
  await command('Network.enable');await command('Page.enable');
  await command('Page.navigate',{url:`https://wsevlf001.eeo.im/client/lmsbleach/six/course/detail/${SCOPE.courseId}/teacher/chat?chatSessionId=${SCOPE.courseId}`});
  await new Promise(resolve=>setTimeout(resolve,12000));
  if(!authObserved)throw new Error('未观察到固定测试教师的 IM 身份，不保存消息。');
  if(!frames.length){console.log(JSON.stringify({diagnostics,requests:requests.length}));throw new Error('教师身份已核对，但尚未取得目标班群正文。');}
  const data={version:'private-im-original-v1',id:`im-${Date.now()}`,capturedAt:new Date().toISOString(),scope:{uid:SCOPE.uid,courseId:SCOPE.courseId},source:'signed-in-client-websocket',requests,frames,coverage:{complete:false,reason:'本次页面实际返回的消息；未执行完整历史分页。'}};
  const dir=join(DATA_ROOT,'im-original');await mkdir(dir,{recursive:true,mode:0o700});
  await writeFile(join(dir,`${data.id}.json`),JSON.stringify(data,null,2),{mode:0o600});
  await writeFile(join(dir,'latest.json'),JSON.stringify(data,null,2),{mode:0o600});
  console.log(JSON.stringify({saved:data.id,frames:frames.length,messages:frames.reduce((sum,f)=>sum+f.messages.length,0),readRequests:requests.length,originalContent:true}));
}finally{ws.close();for(const p of pending.values()){clearTimeout(p.timeout);p.reject(new Error('采集结束'));}}
