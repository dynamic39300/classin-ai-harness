import { expect, test, type Page } from '@playwright/test';
import type { RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';

const session = (scope: string): RuntimeSession => ({
  id: `history-${scope}`,
  title: `${scope === 'classin-mvp' ? '班级' : '全局'}教案推进记录`,
  status: 'idle',
  updatedAt: '2026-09-05T06:00:00.000Z',
  artifacts: [],
  events: [{
    id: `event-${scope}`,
    runRef: `history-${scope}`,
    sequence: 1,
    occurredAt: '2026-09-05T06:00:00.000Z',
    updatedAt: '2026-09-05T06:00:00.000Z',
    actor: 'agent',
    kind: 'process',
    state: 'completed',
    title: '教案进展',
    summary: `已完成${scope}教案目标，等待补充课堂练习。`,
    objectRefs: [],
    allowedCommands: [],
  }],
});

async function enter(page: Page, path = '/teacher/ai-agent/new') {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto(path);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/teachbuddy/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    expect(request.method(), 'Browsing and opening a blank task must not create or mutate a session').toBe('GET');
    if (url.pathname.endsWith('/health')) return route.fulfill({ json: { status: 'ready', message: 'protocol fixture' } });
    const item = session(url.searchParams.get('scope') ?? 'ideal-full');
    if (url.pathname.endsWith('/sessions')) return route.fulfill({ json: [item] });
    if (url.pathname.endsWith(`/sessions/${item.id}`)) return route.fulfill({ json: item });
    throw new Error(`Unexpected history request: ${url.pathname}`);
  });
});

test('My Tasks exposes only real session history and new-task commands', async ({ page }) => {
  await enter(page);
  const draft = page.getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await draft.fill('接着完善上一版教案');
  await expect(page.getByRole('button', { name: '历史任务', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '添加新任务', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '历史任务', exact: true }).click();
  const chooser = page.getByRole('dialog', { name: '全部任务选择器' });
  await expect(chooser.getByRole('button', { name: /全局教案推进记录/ })).toBeVisible();
  await expect(chooser.getByText('课程任务', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '课程工作流', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(draft).toHaveValue('接着完善上一版教案');
});

test('legacy mock task URLs return to the real blank task without creating a session', async ({ page }) => {
  await enter(page, '/teacher/ai-agent/new?workflow=demo');
  await expect(page).toHaveURL('/teacher/ai-agent/new');
  await expect(page.getByRole('textbox', { name: '向 TeachBuddy 输入要求' })).toBeVisible();
  await page.goto('/teacher/ai-agent/runs/run-courseware');
  await expect(page).toHaveURL('/teacher/ai-agent/new');
  await expect(page.getByRole('heading', { name: '生成函数单调性课件', exact: true })).toHaveCount(0);
});

for (const width of [1440, 390]) {
  for (const scope of ['ideal-full', 'classin-mvp']) {
    test(`restore, close and reopen a real task: ${scope}, ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const base = scope === 'ideal-full' ? '/teacher/ai-agent' : '/teacher/classes/physics-3/workbuddy';
      const search = scope === 'classin-mvp' ? '?course=course-momentum' : '';
      await enter(page, `${base}/new${search}`);
      const trigger = page.getByRole('button', { name: '历史任务', exact: true });
      await trigger.click();
      const chooser = page.getByRole('dialog', { name: '全部任务选择器' });
      const filter = chooser.getByRole('textbox', { name: '搜索全部任务' });
      await filter.fill(session(scope).title);
      await chooser.getByRole('button', { name: new RegExp(session(scope).title) }).click();
      await expect(page).toHaveURL(`${base}/new?${scope === 'classin-mvp' ? 'course=course-momentum&' : ''}session=history-${scope}`);
      await expect(page.getByText(`已完成${scope}教案目标，等待补充课堂练习。`)).toBeVisible();
      await page.reload();
      await expect(page.getByText(`已完成${scope}教案目标，等待补充课堂练习。`)).toBeVisible();

      const tabs = page.getByRole('navigation', { name: '已打开的 TeachBuddy 任务' });
      await tabs.getByRole('button', { name: session(scope).title, exact: true }).hover();
      await tabs.getByRole('button', { name: `关闭任务：${session(scope).title}`, exact: true }).click();
      await trigger.click();
      await filter.fill(session(scope).title);
      await chooser.getByRole('button', { name: new RegExp(session(scope).title) }).click();
      await expect(page.getByText(`已完成${scope}教案目标，等待补充课堂练习。`)).toBeVisible();

      await page.getByRole('button', { name: '添加新任务', exact: true }).click();
      await expect(page).toHaveURL(`${base}/new${search}`);
      await trigger.click();
      await filter.fill('没有匹配的历史项目');
      await expect(chooser.getByText('没有匹配的任务')).toBeVisible();
      const rect = await chooser.boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      await page.screenshot({ path: testInfo.outputPath(`real-task-history-${scope}-${width}.png`) });
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    });
  }
}

test('history read failure supports retry without exposing mock tasks', async ({ page }) => {
  let failed = true;
  await page.route('**/api/teachbuddy/sessions?*', (route) => failed
    ? route.fulfill({ status: 503, json: { error: '历史会话暂时无法读取' } })
    : route.fulfill({ json: [session('ideal-full')] }));
  await enter(page);
  await page.getByRole('button', { name: '历史任务', exact: true }).click();
  const chooser = page.getByRole('dialog', { name: '全部任务选择器' });
  await expect(chooser.getByRole('alert')).toContainText('历史会话暂时无法读取');
  failed = false;
  await chooser.getByRole('button', { name: '重试加载对话任务' }).click();
  await expect(chooser.getByRole('button', { name: /全局教案推进记录/ })).toBeVisible();
});

test('empty runtime history retains the real new-task entry', async ({ page }) => {
  await page.route('**/api/teachbuddy/sessions?*', (route) => route.fulfill({ json: [] }));
  await enter(page);
  await page.getByRole('button', { name: '历史任务', exact: true }).click();
  const chooser = page.getByRole('dialog', { name: '全部任务选择器' });
  await expect(chooser.getByText('还没有对话任务')).toBeVisible();
  await chooser.getByRole('button', { name: '新建任务', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '向 TeachBuddy 输入要求' })).toBeVisible();
});
