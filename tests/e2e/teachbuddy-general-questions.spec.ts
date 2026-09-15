import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';

async function prepare(page: Page, failFirstWithLongContext = false) {
  const sessions = new Map<string, RuntimeSession>();
  const requests: string[] = [];
  const at = '2026-09-15T02:00:00Z';
  await page.route('**/api/teachbuddy/**', async route => {
    const request = route.request(); const path = new URL(request.url()).pathname;
    const json = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path.endsWith('/health')) return json({ status: 'ready', message: 'UI protocol fixture' });
    if (path.endsWith('/im-demo-context')) return json({}, 404);
    if (path.endsWith('/sessions')) {
      if (request.method() === 'GET') return json([...sessions.values()]);
      const session: RuntimeSession = { id: `question-${sessions.size}`, title: '通用提问', status: 'idle', updatedAt: at, events: [], artifacts: [] };
      sessions.set(session.id, session); return json(session, 201);
    }
    const match = path.match(/\/sessions\/([^/]+)(\/messages)?$/);
    if (match) {
      const session = sessions.get(match[1]!); if (!session) return json({}, 404);
      if (!match[2]) return json(session);
      const text = String(request.postDataJSON().text); requests.push(text);
      const n = session.events.length;
      const next: RuntimeSession = { ...session, events: [...session.events,
        { id: `t-${n}`, runRef: session.id, sequence: n + 1, occurredAt: at, updatedAt: at, actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: text, objectRefs: [], allowedCommands: [] },
        { id: `a-${n}`, runRef: session.id, sequence: n + 2, occurredAt: at, updatedAt: at, actor: 'agent', kind: 'process', state: 'completed', title: 'AI', summary: '已交24份，未交6份；已批20份，待批4份。', objectRefs: [], allowedCommands: [] },
      ] };
      const result: RuntimeSession = failFirstWithLongContext && requests.length === 1
        ? { ...next, status: 'failed', failureCode: 'context-window-exceeded', error: '本轮对话内容过长，历史消息仍保留。请重新发送本次具体要求。' } : next;
      sessions.set(session.id, result); return json(result);
    }
    return json({}, 404);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  await page.locator('[data-thread-id="class-physics-3"]').click();
  return requests;
}

for (const entry of ['messages', 'class-chat']) {
  test(`general questions: ${entry} @a11y`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const requests = await prepare(page);
    if (entry === 'class-chat') await page.goto('/teacher/classes/physics-3/chat');
    const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
    await expect(sidecar.getByLabel('自由提问引导')).toBeVisible();
    await expect(sidecar.getByLabel('自由提问引导').getByRole('button')).toHaveCount(3);
    await sidecar.getByRole('button', { name: '可以问什么' }).click();
    const help = sidecar.getByRole('region', { name: '通用问题' });
    await expect(help).toBeVisible();
    await expect(help.getByText('试着问我')).toBeVisible();
    await expect(help.getByRole('navigation', { name: '问题分类' })).toBeVisible();
    await expect(help.getByRole('region', { name: '班级和课程' })).toBeVisible();
    const initialHelpHeight = await help.evaluate(node => Math.round(node.getBoundingClientRect().height));
    await help.getByRole('button', { name: '群聊内容' }).click();
    await expect(help.getByRole('region', { name: '对群聊的内容提问' })).toBeVisible();
    await expect.poll(() => help.evaluate(node => Math.round(node.getBoundingClientRect().height))).toBe(initialHelpHeight);
    await page.screenshot({ path: testInfo.outputPath(`questions-${entry}.png`) });
    const a11y = await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze();
    expect(a11y.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(help).toHaveCount(0);
    await expect(sidecar.getByRole('button', { name: '可以问什么' })).toBeFocused();
    const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
    await composer.fill('保留我的草稿');
    await sidecar.getByRole('button', { name: '可以问什么' }).click();
    await help.getByRole('button', { name: '班级课程' }).click();
    await help.getByRole('button', { name: '接下来要上什么课，什么时候上？' }).click();
    await expect(composer).toHaveValue('保留我的草稿\n接下来要上什么课，什么时候上？');
    expect(requests).toHaveLength(0);
    await composer.fill('');
    await sidecar.getByLabel('自由提问引导').getByRole('button', { name: /还有谁没交/ }).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toContain('homework-review');
    await expect(sidecar.getByRole('article', { name: '你的消息' })).toContainText('《动量守恒作业 A 组》还有谁没交，交上来的批完了吗？');
    await expect(sidecar.getByRole('button', { name: '直接发送' })).toHaveCount(0);
    // Narrow/short surface: help must scroll independently while composer stays reachable.
    await page.setViewportSize({ width: 1100, height: 720 });
    await sidecar.getByRole('button', { name: '可以问什么' }).click();
    await expect(help).toBeVisible();
    await expect(composer).toBeInViewport();
    await expect(sidecar.getByRole('button', { name: '收起 AI 消息助手建议' })).toBeInViewport();
    await expect(help).toBeInViewport();
    const sizes = await sidecar.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(sizes.scroll).toBeLessThanOrEqual(sizes.width + 1);
    await page.screenshot({ path: testInfo.outputPath(`questions-${entry}-narrow.png`) });
  });
}

test('quote group message without sending or replacing text, then include its current evidence', async ({ page }) => {
  const requests = await prepare(page);
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.fill('帮我回答这个问题');
  const quotedMessage = page.locator('[data-message-id]').filter({ has: page.locator('button[aria-label="引用给AI"]') }).last();
  await quotedMessage.focus();
  const quote = quotedMessage.getByRole('button', { name: '引用给AI', exact: true });
  // Message actions reveal on keyboard focus as well as hover.
  await quote.focus(); await quote.click();
  await expect(sidecar.getByRole('button', { name: '移除AI引用' })).toBeVisible();
  await expect(composer).toHaveValue('帮我回答这个问题');
  expect(requests).toHaveLength(0);
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toContain('referenceId');
  expect(requests[0]).toContain('chatContext');
  await expect(sidecar.getByRole('button', { name: '移除AI引用' })).toHaveCount(0);
});

test('long conversation recovers on the next explicit submit and preserves visible history', async ({ page }) => {
  const requests = await prepare(page, true);
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.fill('请查看这次作业提交情况');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByRole('alert')).toContainText('对话内容过长');
  const response = page.waitForResponse(r => r.url().endsWith('/question-1/messages') && r.request().method() === 'POST');
  await composer.fill('《动量守恒作业 A 组》还有谁没交？');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  expect((await response).ok()).toBe(true);
  expect(requests).toHaveLength(2);
  await expect(sidecar.getByRole('article', { name: '你的消息' }).filter({ hasText: '请查看这次作业提交情况' })).toBeVisible();
  await expect(sidecar.getByRole('article', { name: '你的消息' }).filter({ hasText: '还有谁没交' })).toBeVisible();
  const bindings = await page.evaluate(() => JSON.parse(localStorage.getItem('classin:teachbuddy:im-session-bindings:v1') ?? '{}'));
  expect(Object.values(bindings)).toContainEqual(expect.objectContaining({ sessionRef: 'question-1', priorSessionRefs: ['question-0'] }));
});
