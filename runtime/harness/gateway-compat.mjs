import { createServer } from 'node:http';
import { once } from 'node:events';

const MODEL = 'tokenhub/gemini-3.5-flash';
const FORMAT = 'teachbuddy.google.thought-signature';

// Preserve opaque signatures through the existing pi-ai replay contract.
export function restoreSignatures(body) {
  for (const message of body.messages ?? []) {
    const details = message.reasoning_details;
    if (!Array.isArray(details)) continue;
    for (const detail of details) {
      if (detail.format !== FORMAT || detail.type !== 'reasoning.encrypted') continue;
      const call = message.tool_calls?.find((entry) => entry.id === detail.id);
      if (!call || typeof detail.data !== 'string' || !detail.data) throw new Error('Unmatched tool signature');
      call.extra_content = { ...call.extra_content, google: { ...call.extra_content?.google, thought_signature: detail.data } };
    }
    message.reasoning_details = details.filter((detail) => detail.format !== FORMAT);
    if (!message.reasoning_details.length) delete message.reasoning_details;
  }
  return body;
}

export function signatureStreamMapper() {
  const ids = new Map();
  return (frame) => {
    return frame.replace(/^data: (.+)$/m, (line, value) => {
      if (value === '[DONE]') return line;
      const data = JSON.parse(value);
      for (const choice of data.choices ?? []) {
        const delta = choice.delta;
        if (!delta) continue;
        for (const call of delta.tool_calls ?? []) {
          const index = `${choice.index ?? 0}:${call.index ?? 0}`;
          if (call.id) ids.set(index, call.id);
          const signature = call.extra_content?.google?.thought_signature;
          if (typeof signature !== 'string' || !signature) continue;
          const id = call.id ?? ids.get(index);
          if (!id) throw new Error('Tool signature arrived without a call identity');
          delta.reasoning_details = [...(delta.reasoning_details ?? []), { type: 'reasoning.encrypted', id, data: signature, format: FORMAT }];
        }
      }
      return `data: ${JSON.stringify(data)}`;
    });
  };
}

export async function startGatewayCompat({ baseURL, apiKey }) {
  const upstream = new URL(`${baseURL.replace(/\/$/, '')}/chat/completions`);
  const server = createServer(async (request, response) => {
    const controller = new AbortController();
    response.on('close', () => controller.abort());
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions'
      || request.headers.origin || request.headers['sec-fetch-site']
      || !apiKey || request.headers.authorization !== `Bearer ${apiKey}`) {
      response.writeHead(403).end(); return;
    }
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 30 * 1024 * 1024) { response.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const body = restoreSignatures(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (body.model !== MODEL || body.stream !== true) { response.writeHead(400).end(); return; }
      const result = await fetch(upstream, {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal, redirect: 'error',
      });
      response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' });
      if (!result.ok || !result.headers.get('content-type')?.includes('text/event-stream')) {
        response.end(await result.text()); return;
      }
      const map = signatureStreamMapper(); const decoder = new TextDecoder(); let pending = '';
      for await (const chunk of result.body) {
        pending += decoder.decode(chunk, { stream: true });
        let boundary;
        while ((boundary = /\r?\n\r?\n/.exec(pending))) {
          const frame = pending.slice(0, boundary.index).replace(/\r\n/g, '\n');
          pending = pending.slice(boundary.index + boundary[0].length);
          if (!response.write(`${map(frame)}\n\n`)) await once(response, 'drain', { signal: controller.signal });
        }
      }
      pending += decoder.decode();
      if (pending.trim()) response.write(map(pending));
      response.end();
    } catch {
      // Never log provider payloads, opaque signatures, or credentials.
      if (!response.headersSent) response.writeHead(502).end('{"error":{"message":"Gateway compatibility request failed"}}');
      else response.destroy();
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { baseURL: `http://127.0.0.1:${server.address().port}/v1`, close() { server.closeAllConnections(); server.close(); } };
}
