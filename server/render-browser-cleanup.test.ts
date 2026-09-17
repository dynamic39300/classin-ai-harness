// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { closeRenderBrowser } from './render-browser-cleanup';
afterEach(() => vi.useRealTimers());
it('reaps only the owned browser if graceful exit stalls after a completed screenshot', async () => {
  vi.useFakeTimers();
  const owned = { close: vi.fn(() => new Promise<void>(() => {})), kill: vi.fn(async () => {}) };
  const cleanup = closeRenderBrowser(owned);
  await vi.advanceTimersByTimeAsync(2001);
  expect(owned.kill).toHaveBeenCalledTimes(1);
  await cleanup;
});
it('does not kill a browser which exits promptly', async () => {
  const owned = { close: vi.fn(async () => {}), kill: vi.fn(async () => {}) };
  await closeRenderBrowser(owned);
  expect(owned.kill).not.toHaveBeenCalled();
});
it('reaps its owned process when graceful shutdown rejects', async () => {
  const owned = { close: vi.fn(async () => { throw new Error('disconnect'); }), kill: vi.fn(async () => {}) };
  await closeRenderBrowser(owned);
  expect(owned.kill).toHaveBeenCalledTimes(1);
});
