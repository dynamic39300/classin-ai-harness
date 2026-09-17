import { modelConfig } from './config.mjs';
export async function callModel(messages, tools, onRequest = () => {}) {
  const cfg = await modelConfig();
  if (!cfg.apiKey || !cfg.baseUrl) throw new Error('模型配置缺失：请配置本机 LAB_MODEL_API_KEY/LAB_MODEL_BASE_URL 或已有 .env。');
  const endpoint = new URL(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`);
  if (endpoint.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(endpoint.hostname)) throw new Error('模型网关必须使用 HTTPS。');
  const body = { model: cfg.model, messages, temperature: 0.2, max_tokens: tools ? 4096 : 8192,
    ...(tools ? { tools, tool_choice: 'auto' } : {}) };
  await onRequest(body);
  const start = Date.now();
  const res = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`模型服务返回 HTTP ${res.status}，本次未得到可用结果。`);
  const data = await res.json(), message = data.choices?.[0]?.message;
  if (!message || (!message.content && !message.tool_calls?.length)) {
    const error=new Error(`模型未返回正文或工具选择（结束原因：${data.choices?.[0]?.finish_reason||'unknown'}）。`);
    error.modelMeta={model:data.model||cfg.model,finishReason:data.choices?.[0]?.finish_reason,usage:data.usage};throw error;
  }
  // Do not persist hidden reasoning or opaque provider signatures.
  return { model: data.model || cfg.model, elapsedMs: Date.now() - start, usage: data.usage, finishReason:data.choices?.[0]?.finish_reason,
    message: { content: message.content || '', ...(message.tool_calls ? { tool_calls: message.tool_calls.map(c => ({ id: c.id, type: c.type, function: c.function })) } : {}) } };
}
