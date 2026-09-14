import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { signatureStreamMapper, restoreSignatures, startGatewayCompat } from './gateway-compat.mjs';

test('parallel tool signatures survive split deltas and persisted replay by ID', () => {
  const map = signatureStreamMapper();
  map('data: '+JSON.stringify({choices:[{index:0,delta:{tool_calls:[{index:0,id:'a'},{index:1,id:'b'}]}}]}));
  const mapped = map('data: '+JSON.stringify({choices:[{index:0,delta:{tool_calls:[{index:1,extra_content:{google:{thought_signature:'opaque-b'}}},{index:0,extra_content:{google:{thought_signature:'opaque-a'}}}]}}]}));
  const details = JSON.parse(mapped.slice(6)).choices[0].delta.reasoning_details;
  const replay = JSON.parse(JSON.stringify({messages:[{role:'assistant',tool_calls:[{id:'a'},{id:'b'}],reasoning_details:details}]}));
  const message = restoreSignatures(replay).messages[0];
  assert.equal(message.tool_calls[0].extra_content.google.thought_signature,'opaque-a');
  assert.equal(message.tool_calls[1].extra_content.google.thought_signature,'opaque-b');
  assert.equal(message.reasoning_details,undefined);
  assert.equal(map('data: [DONE]'),'data: [DONE]');
});

test('refuses unbound signatures instead of inventing them; unrelated fields survive', () => {
  assert.throws(()=>signatureStreamMapper()('data: '+JSON.stringify({choices:[{delta:{tool_calls:[{extra_content:{google:{thought_signature:'x'}}}]}}]})));
  const body={messages:[{reasoning_details:[{type:'reasoning.encrypted',id:'a',data:'x',format:'other'}]}]};
  assert.deepEqual(restoreSignatures(structuredClone(body)),body);
});

test('HTTP stream bridge preserves signature across a tool result round trip and rejects unauthenticated callers', async () => {
  let round = 0;
  const upstream=createServer(async(req,res)=>{
    const chunks=[];for await(const c of req)chunks.push(c);
    const body=JSON.parse(Buffer.concat(chunks));
    if(round++===1)assert.equal(body.messages[0].tool_calls[0].extra_content.google.thought_signature,'opaque-original');
    res.writeHead(200,{'content-type':'text/event-stream'});
    const frame='data: '+JSON.stringify({choices:[{delta:{tool_calls:[{id:'call-a',index:0,extra_content:{google:{thought_signature:'opaque-original'}}}]}}]})+'\n\ndata: [DONE]\n\n';
    res.write(frame.slice(0,19));res.end(frame.slice(19));
  });upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
  const bridge=await startGatewayCompat({baseURL:`http://127.0.0.1:${upstream.address().port}/v1`,apiKey:'fixture-key'});
  try{
    assert.equal((await fetch(bridge.baseURL+'/chat/completions',{method:'POST'})).status,403);
    const request=async(messages)=>fetch(bridge.baseURL+'/chat/completions',{method:'POST',headers:{Authorization:'Bearer fixture-key','Content-Type':'application/json'},body:JSON.stringify({model:'gemini-2.5-pro',stream:true,messages})});
    const stream=await(await request([])).text();
    const delta=JSON.parse(stream.split('\n')[0].slice(6)).choices[0].delta;
    assert.equal(delta.reasoning_details[0].data,'opaque-original');
    assert.equal((await request([{role:'assistant',tool_calls:[{id:'call-a'}],reasoning_details:delta.reasoning_details}])).status,200);
    assert.equal(round,2);
  }finally{bridge.close();upstream.closeAllConnections();upstream.close();}
});
