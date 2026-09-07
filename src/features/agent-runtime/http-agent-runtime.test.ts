import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpAgentRuntime, RuntimeHttpError } from './http-agent-runtime';
import { runtimeSession } from './runtime-test-fixtures';

afterEach(() => vi.useRealTimers());

describe('HTTP runtime adapter', () => {
  it('uses direct contract JSON with scope, encoded IDs, and stable command IDs', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(runtimeSession())));
    const adapter = createHttpAgentRuntime(fetcher);
    await adapter.send('classin-mvp', 'session/a', '教案', 'same-command');
    expect(fetcher).toHaveBeenCalledWith('/api/teachbuddy/sessions/session%2Fa/messages', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ scope: 'classin-mvp', text: '教案', commandId: 'same-command' }), credentials: 'same-origin',
    }));
    fetcher.mockResolvedValue(new Response(JSON.stringify(runtimeSession())));
    await adapter.approve('standalone-teacher', 'session/a', 'artifact/a', 2, 'approval-1');
    expect(fetcher).toHaveBeenLastCalledWith('/api/teachbuddy/sessions/session%2Fa/artifacts/artifact%2Fa/approve', expect.objectContaining({
      body: JSON.stringify({ scope: 'standalone-teacher', version: 2, commandId: 'approval-1' }),
    }));
  });

  it('implements health, list, create, read, and cancel endpoints', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => new Response(JSON.stringify(
      String(url).endsWith('/health') ? { status: 'unconfigured', message: '未配置' }
        : String(url).includes('/sessions?') ? [runtimeSession()] : runtimeSession(),
    )));
    const adapter = createHttpAgentRuntime(fetcher);
    expect((await adapter.health()).status).toBe('unconfigured');
    expect(await adapter.list('ideal-full')).toHaveLength(1);
    await adapter.create('ideal-full');
    await adapter.read('ideal-full', 'session-a');
    await adapter.cancel('ideal-full', 'session-a');
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(['/api/teachbuddy/health', '/api/teachbuddy/sessions?scope=ideal-full', '/api/teachbuddy/sessions', '/api/teachbuddy/sessions/session-a?scope=ideal-full', '/api/teachbuddy/sessions/session-a/cancel']);
    expect(fetcher.mock.calls[4]?.[1]?.body).toBe(JSON.stringify({ scope: 'ideal-full' }));
  });

  it('preserves API errors and rejects malformed data without displaying raw HTML', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ error: '无权访问' }), { status: 403 }))
      .mockResolvedValueOnce(new Response('<html>proxy error</html>'))
      .mockResolvedValueOnce(new Response(JSON.stringify(runtimeSession({ artifacts: [{
        id: 'a', title: 'x', content: 'x', fileRef: 'sf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', fileName: 'x.md',
        format: 'markdown', mediaType: 'text/markdown; charset=utf-8', byteSize: 1, createdAt: '2026-09-04T10:00:00.000Z',
        version: 0, status: 'draft',
      }] }))));
    const adapter = createHttpAgentRuntime(fetcher);
    await expect(adapter.read('ideal-full', 'a')).rejects.toMatchObject({ message: '无权访问', status: 403 });
    await expect(adapter.health()).rejects.toThrow('服务返回的数据不完整');
    await expect(adapter.read('ideal-full', 'a')).rejects.toBeInstanceOf(RuntimeHttpError);
  });

  it('times out a write without automatically resending it', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('abort')));
    }));
    const result = expect(createHttpAgentRuntime(fetcher).send('ideal-full', 'a', '教案', 'cmd')).rejects.toThrow('操作结果尚未确认');
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
