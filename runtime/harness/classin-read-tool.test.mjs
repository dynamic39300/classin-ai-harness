import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClassInReadTool } from './classin-read-tool.mjs';
async function fixture(t, change = {}) {
  const root = await mkdtemp(join(tmpdir(), 'classin-read-')); t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'sessions'));
  const grant = { commandId: 'cmd-1', use: 'message-draft', actorRef: 'classin-test:teacher:1', tenantRef: 'classin-test:school:1', threadRef: 'classin-test:class:1:course:1', expiresAt: Date.now() + 60000 };
  const state = { scope: 'classin-test', snapshot: { id: 'session-1', status: 'running' }, commands: { 'cmd-1': { state: 'accepted' } }, businessRead: grant, ...change };
  const path = join(root, 'sessions/session-1.json'); const save = () => writeFile(path, JSON.stringify(state), { mode: 0o600 }); await save();
  const data = { ...grant, truthLabel: 'read-only-business-data', items: [{ label: '任务', value: '真实任务要求' }], sources: [] }; delete data.commandId; delete data.expiresAt;
  let requests = 0; let request;
  const fetcher = async (...args) => { requests++; request=args; return Response.json({ data }); };
  return { root, path, state, save, data, exec: { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal }, get requests() {return requests;}, get request(){return request;}, tool: createClassInReadTool(root, fetcher) };
}
test('uses server-bound use and identity with fixed read-only URL', async t => {
 const f=await fixture(t); assert.deepEqual(JSON.parse((await f.tool.execute({query:'第7讲测验',activityIds:['123']}, f.exec)).evidence),f.data);
 const url=new URL(f.request[0]);assert.equal(url.origin,'http://127.0.0.1:4174');assert.equal(url.pathname,'/api/classin-test/context');assert.equal(url.searchParams.get('use'),'message-draft');assert.equal(url.searchParams.get('focus'),'classin-test:activity:123');assert.equal(f.request[1].redirect,'error');
});
test('rejects ordinary, stopped, expired, cancelled and rejected sessions before HTTP', async t => {
 for(const update of [{scope:'ideal-full'}, {snapshot:{id:'session-1',status:'idle'}}, {cancelRequested:{reason:'user'}}, {commands:{'cmd-1':{state:'rejected'}}}]) {
  const f=await fixture(t,update); await assert.rejects(f.tool.execute({query:'第1讲作业'},f.exec),/unavailable/); assert.equal(f.requests,0);
 }
 const f=await fixture(t);f.state.businessRead.expiresAt=Date.now()-1;await f.save();await assert.rejects(f.tool.execute({query:'x'},f.exec),/unavailable/);assert.equal(f.requests,0);
});
test('rejects injected identity, use, URLs, unsafe IDs and overbroad arguments',async t=>{
 const f=await fixture(t);
 for(const args of [{query:'x',use:'private-assistance'},{query:'x',uid:'2'},{query:'x',url:'https://evil.invalid'},{query:''},{query:'x'.repeat(1001)},{query:'x',activityIds:['../../bad']},{query:'x',activityIds:['1','2','3','4','5']}]) await assert.rejects(f.tool.execute(args,f.exec),/Supply/);
 await assert.rejects(f.tool.execute({query:'x'},{agent:{session:{id:'../escape'}}}),/authorized/);assert.equal(f.requests,0);
});
test('rejects a symlinked runtime session record',async t=>{
 const f=await fixture(t);await symlink(f.path,join(f.root,'sessions/link.json'));await assert.rejects(f.tool.execute({query:'x'},{agent:{session:{id:'link'}}}),/unavailable/);assert.equal(f.requests,0);
});
test('discards results when cancelled or moved to a new turn during lookup',async t=>{
 for(const cancel of [true,false]){
  const f=await fixture(t);const tool=createClassInReadTool(f.root,async()=>{if(cancel)f.state.cancelRequested={reason:'user'};else f.state.businessRead.expiresAt++;await f.save();return Response.json({data:f.data});});
  await assert.rejects(tool.execute({query:'x'},f.exec),cancel?/unavailable/:/expired turn/);
 }
});
test('rejects failed, oversized or cross-scope responses instead of returning empty facts',async t=>{
 const f=await fixture(t);
 for(const response of [new Response('',{status:503}),new Response('invalid json'),new Response('x'.repeat(40001)),Response.json({data:{...f.data,use:'private-assistance'}}),Response.json({data:{...f.data,actorRef:'classin-test:teacher:2'}}),Response.json({data:{...f.data,items:[{value:'x'.repeat(8000)}]}})]) {
  await assert.rejects(createClassInReadTool(f.root,async()=>response).execute({query:'x'},f.exec));
 }
});
