import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

export const EVIDENCE = 'PROTOCOL_FIXTURE_NOT_LIVE_MODEL';
export const FIRST_REPLY = `${EVIDENCE}: the lesson topic is fractions.`;
export const CONTEXT_REPLY = `${EVIDENCE}: retained context confirms fractions.`;
export const DRAFT = { title: 'Protocol fixture lesson', content: `${EVIDENCE}\nGoal: compare fractions.\nPractice: compare 1/2 and 2/3.` };
export const DRAFT_CALL_ID = 'fixture/draft:1';
export const PROBE_TOOL = 'fixture_forbidden_probe';
export const name = 'teachbuddy-protocol-fixture-probe';
export const inject = ['tools'];

// Mounted only by the test overlay. A registered tool proves the execution
// guard, while a model call to absent bash separately proves catalog denial.
export function apply(ctx) {
  ctx.tools.register({
    name: PROBE_TOOL,
    description: 'Protocol fixture only: this tool must be rejected by the teaching guard.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    async execute() { throw new Error('FORBIDDEN_PROBE_BODY_EXECUTED'); },
  });
}

function contentText(message) {
  if (typeof message.content === 'string') return message.content;
  return Array.isArray(message.content) ? message.content.map(part => part.text ?? '').join('') : '';
}

function event(response, data) {
  if (!response.destroyed) response.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
}

async function finishText(response, text) {
  const middle = Math.floor(text.length / 2);
  event(response, { choices: [{ delta: { role: 'assistant', content: '', reasoning_content: '' } }] });
  event(response, { choices: [{ delta: { content: text.slice(0, middle) } }] });
  await delay(15);
  event(response, { choices: [{ delta: { content: text.slice(middle) } }] });
  event(response, { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
  event(response, '[DONE]');
  response.end();
}

function finishTools(response, calls) {
  event(response, { choices: [{ delta: { role: 'assistant', content: null, reasoning_content: '' } }] });
  event(response, { choices: [{ delta: { tool_calls: calls.map((call, index) => ({
    index, id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.args) },
  })) } }] });
  event(response, { choices: [{ delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } });
  event(response, '[DONE]');
  response.end();
}

export async function startModelFixture() {
  const evidence = { requests: 0, contextObserved: false, draftResultObserved: false,
    guardObserved: false, unsupportedToolObserved: false, delayedStarted: false, delayedAborted: false, errors: [] };
  const pending = new Set();
  const server = createServer((request, response) => {
    void (async () => {
      assert.equal(request.method, 'POST');
      assert.equal(request.url, '/chat/completions');
      let text = '';
      for await (const chunk of request) {
        text += chunk;
        assert.ok(text.length < 2_000_000, 'Fixture request too large');
      }
      const body = JSON.parse(text);
      assert.equal(body.stream, true);
      assert.ok(Array.isArray(body.messages));
      const names = body.tools.map(tool => tool.function.name).sort();
      assert.deepEqual(names, ['create_teaching_draft', PROBE_TOOL].sort());
      const systemText = body.messages.filter(message => message.role === 'system').map(contentText).join('\n');
      assert.ok(systemText.includes('ClassIn TeachBuddy'));
      assert.ok(!systemText.includes('You are a coding agent'));
      evidence.requests++;
      const markerIndex = body.messages.findLastIndex(message => message.role === 'user' && contentText(message).includes('[fixture:'));
      assert.ok(markerIndex >= 0, 'Unexpected model request without a fixture marker');
      const marker = contentText(body.messages[markerIndex]);
      const tail = body.messages.slice(markerIndex + 1);
      const toolResults = tail.filter(message => message.role === 'tool');
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      if (marker.includes('[fixture:text]')) {
        await finishText(response, FIRST_REPLY);
      } else if (marker.includes('[fixture:context]')) {
        assert.ok(body.messages.slice(0, markerIndex).some(message => message.role === 'user' && contentText(message).includes('[fixture:text]')));
        assert.ok(body.messages.slice(0, markerIndex).some(message => message.role === 'assistant' && contentText(message) === FIRST_REPLY));
        evidence.contextObserved = true;
        await finishText(response, CONTEXT_REPLY);
      } else if (marker.includes('[fixture:draft]')) {
        const result = toolResults.find(message => message.tool_call_id === DRAFT_CALL_ID);
        if (!result) {
          finishTools(response, [{ id: DRAFT_CALL_ID, name: 'create_teaching_draft', args: DRAFT }]);
        } else {
          const draft = JSON.parse(contentText(result));
          assert.equal(draft.title, DRAFT.title);
          assert.equal(draft.content, DRAFT.content);
          assert.equal(draft.status, 'draft');
          evidence.draftResultObserved = true;
          await finishText(response, `${EVIDENCE}: the draft tool confirmed durable creation.`);
        }
      } else if (marker.includes('[fixture:guard]')) {
        if (!toolResults.length) {
          finishTools(response, [
            { id: 'fixture-unknown', name: 'bash', args: {} },
            { id: 'fixture-guard', name: PROBE_TOOL, args: {} },
          ]);
        } else {
          const guard = toolResults.find(message => message.tool_call_id === 'fixture-guard');
          const unknown = toolResults.find(message => message.tool_call_id === 'fixture-unknown');
          assert.ok(guard && contentText(guard).includes('TeachBuddy permits only create_teaching_draft.'));
          assert.ok(!contentText(guard).includes('FORBIDDEN_PROBE_BODY_EXECUTED'));
          assert.ok(unknown && contentText(unknown).includes('TeachBuddy permits only create_teaching_draft.'),
            'The absent bash tool must also be rejected by the global guard.');
          evidence.guardObserved = true;
          evidence.unsupportedToolObserved = true;
          await finishText(response, `${EVIDENCE}: both forbidden calls were rejected.`);
        }
      } else if (marker.includes('[fixture:cancel]')) {
        evidence.delayedStarted = true;
        event(response, { choices: [{ delta: { role: 'assistant', content: `${EVIDENCE}: waiting for cancellation.` } }] });
        response.flushHeaders();
        pending.add(response);
        response.once('close', () => {
          evidence.delayedAborted = !response.writableEnded;
          pending.delete(response);
        });
      } else {
        throw new Error('Unknown fixture scenario');
      }
    })().catch(error => {
      evidence.errors.push(error.message);
      if (!response.headersSent) response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Protocol fixture assertion failed' } }));
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    evidence,
    async close() {
      for (const response of pending) response.destroy();
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
