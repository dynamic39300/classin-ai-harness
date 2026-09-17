import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ClassInScene } from '../../src/contracts/classin-test';
import type { RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';
import { projectCatalog, projectContext, projectDynamics, threadRef } from '../../src/domain/classin-test/projections';

const scene: ClassInScene = {
  environment: 'classin-test', teacher: { id: 'fixture-teacher', name: '接口老师' }, schoolRef: 'fixture-school',
  class: { id: 'fixture-class', name: '真实接口契约班' }, course: { id: 'fixture-course', name: '有理数课程' },
  units: [{ id: 'unit', name: '有理数计算', count: 1 }], members: [{ id: 'fixture-student', name: '测试学员', identity: 1 }],
  activities: [{ id: 'fixture-lesson', bizId: 'biz', unitId: 'unit', categoryId: 'fixture-course', name: '有理数计算课堂', kind: 'classroom', startsAt: '2026-09-15T11:30:00Z', endsAt: '2026-09-15T12:15:00Z', published: true, process: 0, summary: { studentTotal: 1 } }],
  capturedAt: '2026-09-15T02:00:00Z', version: 'fixed-contract', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' },
};
const path = `/teacher/messages?category=class&thread=${encodeURIComponent(threadRef(scene))}`;
async function fixture(page: Page) {
  let fail = false; const requests: string[] = []; const modelInputs: string[] = [];
  await page.addInitScript(() => { if (!sessionStorage.getItem('classin.pc.demo.role.v1')) sessionStorage.setItem('classin.pc.demo.role.v1', 'teacher'); });
  await page.route('**/api/classin-test/**', (route) => {
    const url = new URL(route.request().url()); requests.push(`${route.request().method()} ${url.pathname}`);
    if (fail) return route.fulfill({ status: 503, json: { error: { message: '契约测试：真实接口不可用' } } });
    let data;
    if (url.pathname.endsWith('/scene')) data = scene;
    else if (url.pathname.endsWith('/catalog')) data = projectCatalog(scene);
    else if (url.pathname.endsWith('/dynamics')) data = projectDynamics(scene);
    else {
      const focusRefs = url.searchParams.getAll('focus');
      const context = projectContext(scene, url.searchParams.get('use') === 'message-draft' ? 'message-draft' : 'private-assistance');
      const query = url.searchParams.get('query') ?? '';
      const routeVersion = /有哪些课程|课程进度|分别学到/.test(query) ? 'course-progress' : 'base';
      const version = focusRefs.length ? `focused:${focusRefs.join(',')}` : routeVersion;
      data = { ...context, id: `${context.threadRef}:${version}`, version, focusRefs, sources: context.sources.map((source) => ({ ...source, version })) };
    }
    return route.fulfill({ json: { data } });
  });
  const sessions = new Map<string, RuntimeSession>(); let count = 0;
  await page.route('**/api/teachbuddy/**', async (route) => {
    const url = new URL(route.request().url()); const method = route.request().method();
    if (url.pathname.endsWith('/health')) return route.fulfill({ json: { status: 'ready', message: 'Contract fixture' } });
    if (url.pathname.endsWith('/sessions') && method === 'GET') return route.fulfill({ json: [...sessions.values()] });
    if (url.pathname.endsWith('/sessions') && method === 'POST') {
      const session: RuntimeSession = { id: `hybrid-${++count}`, title: '提醒', status: 'idle', events: [], artifacts: [], updatedAt: new Date().toISOString() };
      sessions.set(session.id, session); return route.fulfill({ status: 201, json: session });
    }
    const match = url.pathname.match(/\/sessions\/([^/]+)(\/messages)?$/);
    if (match) {
      const current = sessions.get(match[1]!); if (!current) return route.fulfill({ status: 404, json: { error: 'not found' } });
      if (match[2] && method === 'POST') {
        const text = route.request().postDataJSON().text as string; modelInputs.push(text);
        const now = new Date().toISOString(); const next: RuntimeSession = { ...current, status: 'idle', updatedAt: now, events: [...current.events,
          { id: `teacher-${modelInputs.length}`, runRef: current.id, sequence: current.events.length + 1, actor: 'teacher', kind: 'teacher_message', title: '你的要求', summary: text, state: 'completed', occurredAt: now, updatedAt: now, objectRefs: [], allowedCommands: [] },
          { id: `assistant-${modelInputs.length}`, runRef: current.id, sequence: current.events.length + 2, actor: 'agent', kind: 'process', title: 'AI 回复', summary: '<!--TEACHBUDDY_MESSAGE_BODY_START-->同学们，请准备今晚19:30的有理数课堂。<!--TEACHBUDDY_MESSAGE_BODY_END-->', state: 'completed', occurredAt: now, updatedAt: now, objectRefs: [], allowedCommands: [] },
        ] };
        sessions.set(next.id, next); return route.fulfill({ json: next });
      }
      return route.fulfill({ json: current });
    }
    return route.fulfill({ status: 404, json: { error: 'no fixture' } });
  });
  return { requests, modelInputs, fail: (value: boolean) => { fail = value; } };
}

test('expanded header keeps introduction and stages close without clipping', async ({ page }, testInfo) => {
  await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
  for (const size of [{ width: 1440, height: 900 }, { width: 1100, height: 720 }]) {
    await page.setViewportSize(size);
    const toggle = sidecar.getByRole('button', { name: '收起 AI 消息助手建议' });
    const hint = toggle.getByText(/选一条建议，AI写消息，您确认后发送/);
    const stages = sidecar.getByRole('tablist', { name: '教学阶段' });
    await expect(sidecar.getByRole('button', { name: '发送给 AI 消息助手' })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: testInfo.outputPath(`navigation-spacing-${size.width}.png`) });
    const hintBox = (await hint.boundingBox())!; const stagesBox = (await stages.boundingBox())!;
    const gap = stagesBox.y - hintBox.y - hintBox.height;
    await testInfo.attach(`navigation-gap-${size.width}`, { body: JSON.stringify({ gap }), contentType: 'application/json' });
    expect(gap).toBeGreaterThanOrEqual(4);
    expect(gap).toBeLessThanOrEqual(18);
    await expect(hint).toBeInViewport({ ratio: 1 });
    if (size.width === 1440) expect(await hint.evaluate(node => node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight))).toBeLessThan(1.1);
    expect(await sidecar.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const divider = page.getByRole('separator', { name: '调整AI 消息助手宽度' });
  await divider.focus();
  await divider.press('Home');
  await expect(divider).toHaveAttribute('aria-valuenow', '384');
  const hint = sidecar.getByText(/选一条建议，AI写消息，您确认后发送/);
  await expect(hint).toBeInViewport({ ratio: 1 });
  expect(await hint.evaluate(node => node.scrollWidth <= node.clientWidth + 1 && getComputedStyle(node).overflow === 'visible')).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('navigation-minimum-width.png') });
});

test('loading handoff smoothly resizes recommendations and keeps question help without a toast @a11y', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await fixture(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const initial = projectDynamics(scene);
  // Exercise a real height difference using isolated UI contract data.
  const data = { ...initial, stages: initial.stages.map(stage => stage.id === initial.currentStage
    ? { ...stage, items: [0, 1, 2].flatMap(n => stage.items.map(item => ({ ...item, id: `${item.id}-${n}` }))) } : stage) };
  await page.route('**/api/classin-test/dynamics**', async route => { await gate; await route.fulfill({ json: { data } }); });
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  const welcome = sidecar.getByLabel('自由提问引导');
  const input = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await expect(input).toHaveAttribute('placeholder', '问问班级、课程和作业，或让我帮您写消息…');
  await expect(welcome).toBeVisible();
  await input.fill('保留问题草稿');
  await sidecar.evaluate(node => {
    const rows: { t: number; h: number; opacity: number; guide: string | null }[] = [];
    (window as unknown as { handoffFrames: typeof rows }).handoffFrames = rows;
    const start = performance.now();
    const record = () => {
      const content = node.querySelector<HTMLElement>('[class*="contentResize"]');
      rows.push({ t: performance.now() - start, h: content?.getBoundingClientRect().height ?? 0,
        opacity: content?.firstElementChild ? Number(getComputedStyle(content.firstElementChild).opacity) : 1,
        guide: node.querySelector('[class*="welcomeFrame"]')?.getAttribute('data-state') ?? null });
      if (performance.now() - start < 2200) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  release();
  await expect(welcome).toHaveCount(0);
  await expect(sidecar.getByText('这些问题也可以在这里找到')).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('保留问题草稿');
  await expect(welcome).toHaveCount(0);
  await expect(sidecar.getByRole('region', { name: '通用问题' })).toHaveCount(0);
  await expect(sidecar.getByRole('button', { name: '可以问什么' })).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: testInfo.outputPath('handoff-plain-help.png') });
  const frames = await page.evaluate(() => (window as unknown as { handoffFrames: { t: number; h: number; opacity: number; guide: string | null }[] }).handoffFrames);
  await testInfo.attach('handoff-frames', { body: JSON.stringify(frames), contentType: 'application/json' });
  const fading = frames.filter(frame => frame.opacity > 0.05 && frame.opacity < 0.98);
  expect(fading.length).toBeGreaterThan(3);
  expect(new Set(fading.map(frame => Math.round(frame.h))).size).toBeGreaterThan(3);
  expect(fading.every(frame => frame.guide === 'visible')).toBe(true);
  const leaving = frames.filter(frame => frame.guide === 'leaving');
  expect(leaving.length).toBeGreaterThan(3);
  expect(leaving[0]!.t - fading[0]!.t).toBeGreaterThan(700);
  await sidecar.getByRole('button', { name: '可以问什么' }).click();
  const help = sidecar.getByRole('region', { name: '通用问题' });
  expect(await help.locator('[data-question-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-question-id')))).toEqual(expect.arrayContaining(['A1', 'A2', 'A3']));
  await expect(sidecar.getByText('这些问题也可以在这里找到')).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze()).violations).toEqual([]);
});

test('reduced motion disables recommendation animation while keeping plain help usable', async ({ page }) => {
  await fixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/classin-test/dynamics**', async route => { await gate; await route.fulfill({ json: { data: projectDynamics(scene) } }); });
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await expect(sidecar.getByLabel('自由提问引导')).toBeVisible();
  release();
  await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
  expect(await sidecar.locator('[class*="contentResize"]').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(sidecar.getByLabel('自由提问引导')).toHaveCount(0);
  await expect(sidecar.getByText('这些问题也可以在这里找到')).toHaveCount(0);
  await expect(sidecar.getByRole('button', { name: '可以问什么' })).toHaveCSS('animation-name', 'none');
  await sidecar.getByRole('button', { name: '可以问什么' }).click();
  await expect(sidecar.getByRole('region', { name: '通用问题' })).toBeVisible();
});

test('during shows only the appropriate notice and summary omits course inventory @a11y', async ({ page }, testInfo) => {
  await fixture(page);
  const classroom = scene.activities[0]!;
  let data = projectDynamics({ ...scene, capturedAt: '2026-09-15T13:00:00Z', activities: [{ ...classroom, process: 2 }] });
  await page.route('**/api/classin-test/dynamics**', route => route.fulfill({ json: { data } }));
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  const settleVisuals = () => sidecar.evaluate(async node => {
    await Promise.all(node.getAnimations({ subtree: true }).filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
  });
  await sidecar.getByRole('tab', { name: /课中/ }).click();
  let panel = sidecar.getByRole('tabpanel');
  await expect(panel).toHaveText('当前没有正在上课的课堂');
  await expect(panel.getByRole('button')).toHaveCount(0);
  await expect(panel.getByRole('article')).toHaveCount(0);
  await expect(sidecar.getByRole('tab', { name: /课中/ })).toContainText('暂无');
  await settleVisuals();
  await page.screenshot({ path: testInfo.outputPath('during-no-class.png') });
  await sidecar.getByRole('tab', { name: /总结/ }).click();
  panel = sidecar.getByRole('tabpanel');
  await expect(panel.getByRole('button', { name: /整理课堂回顾/ })).toHaveCount(1);
  await expect(panel).not.toContainText('项教学活动');
  await expect(panel).not.toContainText('已核对当前课程活动完整性');
  await expect(panel).not.toContainText('仅供查看');
  await settleVisuals();
  await page.screenshot({ path: testInfo.outputPath('summary-without-inventory.png') });

  // A time-window candidate is distinct from an observed member-level attendance result.
  data = projectDynamics({ ...scene, capturedAt: '2026-09-15T11:35:00Z', activities: [{ ...classroom, process: 1, summary: { studentTotal: 3, actualTotal: 3 } }] });
  await page.reload();
  await sidecar.getByRole('tab', { name: /课中/ }).click();
  panel = sidecar.getByRole('tabpanel');
  await expect(panel).toContainText('处于排定上课时间，实时到课情况暂未确认。');
  await expect(panel.getByRole('button')).toHaveCount(0);
  await expect(panel).not.toContainText('满勤');
  await expect(panel).not.toContainText('当前没有正在上课的课堂');
  await expect(panel).not.toContainText('仅供查看');
  await expect(sidecar.getByRole('tab', { name: /课中/ })).toContainText('待核');
  await settleVisuals();
  await page.screenshot({ path: testInfo.outputPath('during-attendance-unknown.png') });
  expect((await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze()).violations).toEqual([]);
});

test('history reveal preserves pointer input focus and keeps keyboard navigation accessible @a11y', async ({ page }, testInfo) => {
  const reads = await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  const input = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  const conversation = sidecar.getByRole('region', { name: 'AI 消息助手对话' });
  const history = sidecar.getByRole('button', { name: '查看历史消息' });
  await input.fill('我们班有哪些课程？');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect.poll(() => reads.modelInputs.length).toBe(1);
  await page.reload();
  await expect(history).toBeVisible();
  await input.fill('保留正在输入的内容');
  await conversation.hover();
  await page.mouse.wheel(0, -600);
  await expect(history).toHaveCount(0);
  await testInfo.attach('wheel-focus', { body: JSON.stringify(await conversation.evaluate(node => ({ focused: document.activeElement === node, focusVisible: node.matches(':focus-visible'), outline: getComputedStyle(node).outline }))), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('history-wheel-focus.png') });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('保留正在输入的内容');
  await expect(conversation).toHaveCSS('outline-style', 'none');

  await page.reload();
  await history.click();
  await expect(history).toHaveCount(0);
  await expect(conversation).not.toBeFocused();
  await expect(conversation).toHaveCSS('outline-style', 'none');

  await page.reload();
  await history.focus();
  await history.press('Enter');
  await expect(history).toHaveCount(0);
  await expect(conversation).toBeFocused();
  await expect(conversation).toHaveCSS('outline-style', 'solid');
  await expect(conversation).toHaveCSS('outline-width', '2px');
  await conversation.press('Tab');
  await expect(conversation).not.toBeFocused();
  expect(await sidecar.evaluate(node => node.contains(document.activeElement))).toBe(true);
  expect((await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze()).violations).toEqual([]);
});

test('entry questions hand over to usable recommendations after pointer and keyboard interaction @a11y', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const reads = await fixture(page);
  await page.addInitScript(() => document.addEventListener('animationstart', event => {
    if (event.animationName.includes('question-enter')) document.documentElement.dataset.questionEntries = String(Number(document.documentElement.dataset.questionEntries ?? '0') + 1);
  }));
  let releaseDynamics!: () => void; let releaseCatalog!: () => void;
  const dynamicsGate = new Promise<void>(resolve => { releaseDynamics = resolve; });
  const catalogGate = new Promise<void>(resolve => { releaseCatalog = resolve; });
  await page.route('**/api/classin-test/dynamics**', async route => { await dynamicsGate; await route.fulfill({ json: { data: projectDynamics(scene) } }); });
  await page.route('**/api/classin-test/catalog**', async route => { await catalogGate; await route.fulfill({ json: { data: projectCatalog(scene) } }); });
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar'); const welcome = sidecar.getByLabel('自由提问引导');
  await expect(welcome.getByRole('button')).toHaveCount(3);
  await expect(welcome.getByText('我是您的 AI 消息助手，可以帮您了解班级和课程的情况。您可以问：')).toBeVisible();
  await expect(welcome.locator('small')).toHaveCount(0);
  const questionIds = () => welcome.getByRole('button').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-question-id')));
  expect(await questionIds()).toEqual(['A1', 'A2', 'A3']);
  await expect(sidecar.locator('[data-load-state="loading"]')).toBeVisible();
  const delays = await welcome.locator('li').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationDelay));
  expect(delays).toEqual(['0s', '0.18s', '0.36s']);
  await expect.poll(() => page.locator('html').getAttribute('data-question-entries')).toBe('3');
  await page.screenshot({ path: testInfo.outputPath('entry-loading-1440.png') });
  const a11y = await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze();
  expect(a11y.violations).toEqual([]);

  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  const question = welcome.getByRole('button', { name: '接下来要上什么课，什么时候上？' });
  await question.hover();
  await question.focus();
  releaseCatalog(); releaseDynamics();
  await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
  expect(await questionIds()).toEqual(['A1', 'A2', 'A3']);
  await expect(question).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-question-entries', '3');
  await page.screenshot({ path: testInfo.outputPath('entry-interaction-protected.png') });
  await composer.hover();
  await expect(question).toBeFocused();
  await expect(welcome.getByRole('button')).toHaveCount(3);
  await composer.fill('保留输入');
  await expect(welcome).toHaveCount(0);
  await expect(composer).toBeFocused(); await expect(composer).toHaveValue('保留输入');
  expect(reads.modelInputs).toHaveLength(0);
  await page.screenshot({ path: testInfo.outputPath('entry-recommendations-only.png') });
  for (const size of [{ width: 1100, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await expect(sidecar.getByRole('button', { name: '发送给 AI 消息助手' })).toBeInViewport({ ratio: 1 });
    expect(await sidecar.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`entry-ready-${size.width}.png`) });
  }
  await sidecar.getByRole('button', { name: '收起 AI 消息助手建议' }).click();
  await expect(welcome).toHaveCount(0);
  // A quick ready card on re-entry skips the introduction entirely.
  await page.reload();
  await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-question-entries', /.+/);
  await composer.fill('');
  await sidecar.getByRole('button', { name: '可以问什么' }).click();
  await sidecar.getByRole('region', { name: '通用问题' }).getByRole('button', { name: '我们班有多少学生？' }).click();
  await expect.poll(() => reads.modelInputs.length).toBe(1);
});

test('collapsed history shows animated questions while recommendations load; reveal or submit removes them', async ({ page }, testInfo) => {
  const reads = await fixture(page);
  await page.addInitScript(() => document.addEventListener('animationstart', event => {
    if (event.animationName.includes('question-enter')) document.documentElement.dataset.questionEntries = String(Number(document.documentElement.dataset.questionEntries ?? '0') + 1);
  }));
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/classin-test/dynamics**', async route => { await gate; await route.fulfill({ json: { data: projectDynamics(scene) } }); });
  try {
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar'); const welcome = sidecar.getByLabel('自由提问引导');
  await welcome.getByRole('button', { name: '我们班有多少学生？' }).click();
  await expect.poll(() => reads.modelInputs.length).toBe(1);
  await expect(welcome).toHaveCount(0);
  await page.reload();
  await expect(sidecar.getByRole('button', { name: '查看历史消息' })).toBeVisible();
  await expect(welcome.getByRole('button')).toHaveCount(3);
  await expect.poll(() => page.locator('html').getAttribute('data-question-entries')).toBe('3');
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(sidecar.getByRole('button', { name: '发送给 AI 消息助手' })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: testInfo.outputPath('entry-history-collapsed.png') });
  await sidecar.getByRole('button', { name: '查看历史消息' }).click();
  await expect(welcome).toHaveCount(0);
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toContainText('我们班有多少学生？');
  await page.screenshot({ path: testInfo.outputPath('entry-history-revealed.png') });
  await expect(sidecar.getByRole('button', { name: '可以问什么' })).toBeVisible();

  // A refresh collapses history again. Upward scrolling has the same effect as the history button.
  await page.reload();
  await expect(welcome.getByRole('button')).toHaveCount(3);
  const conversation = sidecar.getByRole('region', { name: 'AI 消息助手对话' });
  await conversation.hover();
  await page.mouse.wheel(0, -600);
  await expect(welcome).toHaveCount(0);
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toContainText('我们班有多少学生？');

  // Asking a fresh question while history remains collapsed also removes the guide.
  await page.reload();
  await expect(welcome.getByRole('button')).toHaveCount(3);
  await welcome.getByRole('button', { name: '接下来要上什么课，什么时候上？' }).click();
  await expect.poll(() => reads.modelInputs.length).toBe(2);
  await expect(welcome).toHaveCount(0);
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toContainText('接下来要上什么课，什么时候上？');
  await sidecar.getByRole('button', { name: '查看历史消息' }).click();
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toHaveCount(2);
  } finally { release(); }
});

test('question submits while recommendations and catalog remain pending; reduced motion stays static', async ({ page }) => {
  const reads = await fixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/classin-test/dynamics**', async route => { await gate; await route.fulfill({ json: { data: projectDynamics(scene) } }); });
  await page.route('**/api/classin-test/catalog**', async route => { await gate; await route.fulfill({ json: { data: projectCatalog(scene) } }); });
  try {
    await page.goto(path);
    const sidecar = page.locator('#workbuddy-im-sidecar'); const welcome = sidecar.getByLabel('自由提问引导');
    await expect(welcome.getByRole('button')).toHaveCount(3);
    expect(await welcome.locator('li').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).animationName === 'none'))).toBe(true);
    await welcome.getByRole('button', { name: '我们班有多少学生？' }).click();
    await expect.poll(() => reads.modelInputs.length).toBe(1);
    await expect(sidecar.locator('[data-load-state="loading"]')).toBeVisible();
    await expect(welcome).toHaveCount(0);
  } finally { release(); }
});

test('collapsed recommendations keep questions until the teacher opens the usable card', async ({ page }) => {
  await fixture(page);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/classin-test/dynamics**', async route => { await gate; await route.fulfill({ json: { data: projectDynamics(scene) } }); });
  try {
    await page.goto(path);
    const sidecar = page.locator('#workbuddy-im-sidecar'); const welcome = sidecar.getByLabel('自由提问引导');
    await expect(welcome.getByRole('button')).toHaveCount(3);
    await sidecar.getByRole('button', { name: '收起 AI 消息助手建议' }).click();
    release();
    await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
    await expect(welcome.getByRole('button')).toHaveCount(3);
    await sidecar.getByRole('button', { name: '展开 AI 消息助手建议' }).click();
    await expect(welcome).toHaveCount(0);
    await sidecar.getByRole('button', { name: '收起 AI 消息助手建议' }).click();
    await expect(welcome).toHaveCount(0);
  } finally { release(); }
});

for (const content of ['empty', 'read-only'] as const) {
  test(`${content} current stage keeps questions despite actionable recommendations in another stage`, async ({ page }) => {
    await fixture(page);
    const snapshot = projectDynamics(scene);
    await page.route('**/api/classin-test/dynamics**', route => route.fulfill({ json: { data: {
      ...snapshot, currentStage: 'during', stages: snapshot.stages.map(stage => stage.id !== 'during' ? stage : {
        ...stage, items: content === 'empty' ? [] : [{ id: 'readonly', stage: 'during', kind: 'unknown', title: '课堂参与待核对', detail: '当前没有可操作的提醒。', priority: 1 }],
      }),
    } } }));
    await page.goto(path);
    const sidecar = page.locator('#workbuddy-im-sidecar'); const welcome = sidecar.getByLabel('自由提问引导');
    await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
    await expect(welcome.getByRole('button')).toHaveCount(3);
    await sidecar.getByRole('tab', { name: /^课前/ }).click();
    await expect(welcome).toHaveCount(0);
  });
}

test('failed recommendations use compact recovery without blocking questions or auto-expanding', async ({ page }, testInfo) => {
  await fixture(page); let attempts = 0; let recover = false;
  await page.route('**/api/classin-test/dynamics**', route => {
    attempts += 1;
    return recover ? route.fulfill({ json: { data: projectDynamics(scene) } }) : route.fulfill({ status: 503, json: { error: { message: '验收：建议暂不可用' } } });
  });
  await page.route('**/api/classin-test/catalog**', route => route.fulfill({ status: 503, json: { error: { message: '验收：目录暂不可用' } } }));
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await expect(sidecar.locator('[data-load-state="failed"]')).toBeVisible();
  expect(attempts).toBe(2);
  await expect(sidecar.getByText(/您仍可直接提问/)).toBeVisible();
  await expect(sidecar.getByRole('tab')).toHaveCount(0);
  await expect(sidecar.getByLabel('自由提问引导').getByRole('button')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('entry-unavailable.png') });
  await sidecar.getByRole('button', { name: '可以问什么' }).click();
  const help = sidecar.getByRole('region', { name: '通用问题' });
  await expect(help.getByRole('button', { name: '我们班有多少学生？' })).toBeVisible();
  await expect(help.getByRole('button', { name: '重新读取问题' })).toBeVisible();
  await page.keyboard.press('Escape');
  recover = true;
  await sidecar.getByRole('button', { name: '重试', exact: true }).click();
  await expect(sidecar.locator('[data-load-state="ready"]')).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '展开 AI 消息助手建议' })).toBeVisible();
  await expect(sidecar.getByRole('tab')).toHaveCount(0);
});

test('original message workspace retains demo and isolated real course, ordinary simulation survives reload', async ({ page }) => {
  const reads = await fixture(page); await page.goto('/teacher/messages?category=class&thread=class-physics-3');
  await expect(page.getByRole('button', { name: '班级消息', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '进入临时教室' })).toBeVisible();
  await page.getByText('真实接口契约班', { exact: true }).click();
  await expect(page.locator('#workbuddy-im-sidecar')).not.toContainText('消息发送仅老师端本机模拟');
  await expect(page.locator('#workbuddy-im-sidecar')).toContainText('有理数计算课堂');
  await expect(page.locator('#workbuddy-im-sidecar')).not.toContainText('动量守恒');
  const composer = page.getByRole('textbox', { name: '输入消息', exact: true });
  await composer.fill('普通老师端模拟消息验收'); await composer.press('Enter');
  await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
  await page.reload(); await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
  await composer.fill('刷新后的第二条'); await composer.press('Enter');
  await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(2);
  await expect(page.getByText(/人已读|已送达/)).toHaveCount(0);
  expect(reads.requests.every((request) => request.startsWith('GET '))).toBe(true);
  // Switch the actual role store without an init script restoring teacher on navigation.
  await page.evaluate(() => sessionStorage.setItem('classin.pc.demo.role.v1', 'student-family'));
  await page.unrouteAll();
  await page.goto('/student/messages?category=class&thread=' + encodeURIComponent(threadRef(scene)));
  await expect(page.getByText('目标消息在当前视角不可用')).toBeVisible();
  await expect(page.getByText('普通老师端模拟消息验收', { exact: true })).toHaveCount(0);
});

test('Copilot uses real context, review cancel has no send, approval creates simulated teacher message', async ({ page }) => {
  const reads = await fixture(page); await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' }).fill('为今晚的课堂生成上课提醒');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await sidecar.getByRole('button', { name: '修改文案', exact: true }).click();
  await sidecar.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByText('已发送', { exact: true })).toHaveCount(0);
  await sidecar.getByRole('button', { name: '修改文案', exact: true }).click();
  await sidecar.getByRole('textbox', { name: '消息草稿正文' }).fill('【审阅后】今晚19:30上有理数课。');
  await sidecar.getByRole('button', { name: '确认发送', exact: true }).click();
  await expect(sidecar).not.toContainText('消息发送仅老师端本机模拟');
  await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
  await expect(page.getByText(/人已读|已送达/)).toHaveCount(0);
  expect(reads.modelInputs[0]).toContain('有理数'); expect(reads.modelInputs[0]).not.toContain('动量守恒');
  expect(reads.modelInputs[0]).toContain(threadRef(scene));
  await page.reload(); await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-message-conversation]')).toContainText('【审阅后】今晚19:30上有理数课。');
});

test('approved Copilot Markdown remains structured after sending to the class chat', async ({ page }) => {
  await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' }).fill('为今晚的课堂生成上课提醒');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await sidecar.getByRole('button', { name: '修改文案', exact: true }).click();
  await sidecar.getByRole('textbox', { name: '消息草稿正文' }).fill(`## 小石头学情摘要

| 项目 | 内容 |
| --- | --- |
| 学生 | 小石头 |
| 课程 | 初中数学专题提升课程 |

1. **在线课堂**：已完成
2. **单元练习**：未提交

- **学习资料**：个人完成状态未知

> 以上仅整理有依据的数据。`);
  await sidecar.getByRole('button', { name: '确认发送', exact: true }).click();

  const message = page.locator('[data-message-conversation] [data-message-body]').filter({ hasText: '小石头学情摘要' });
  await expect(message.getByRole('heading', { name: '小石头学情摘要' })).toBeVisible();
  await expect(message.getByRole('table')).toBeVisible();
  await expect(message.locator('strong')).toHaveCount(3);
  const emphasizedTableCells = message.locator('thead th, tbody td:first-child');
  await expect(emphasizedTableCells).toHaveCount(4);
  expect(await emphasizedTableCells.evaluateAll((cells) => cells.every((cell) => Number.parseInt(getComputedStyle(cell).fontWeight, 10) >= 600))).toBe(true);
  await expect(message.locator('ol')).toBeVisible();
  await expect(message.locator('ul')).toBeVisible();
  await expect(message.locator('blockquote')).toBeVisible();
  await expect(message).not.toContainText('| --- | --- |');
  expect(await message.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('[data-message-conversation]').analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('a teaching-action draft rechecks the same business objects and can be sent when facts are unchanged', async ({ page }) => {
  await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await sidecar.getByRole('button', { name: /整理课前提醒/ }).click();
  await sidecar.getByRole('button', { name: '直接发送', exact: true }).click();
  await expect(sidecar.getByText('生成草稿后业务事实已经变化，请核对最新消息并重新生成。', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
});

test('a freeform course-progress draft rechecks the original question and sends when facts are unchanged', async ({ page }) => {
  await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  const question = '请根据我们班有哪些课程、分别学到哪了的课程进度，生成一条班级群消息；列出单元数、已结束课堂、最近课堂和下一课堂，不生成混合百分比。';
  await sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' }).fill(question);
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await sidecar.getByRole('button', { name: '直接发送', exact: true }).click();
  await expect(sidecar.getByText('生成草稿后业务事实已经变化，请核对最新消息并重新生成。', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-message-conversation]').getByText('已发送', { exact: true })).toHaveCount(1);
});

test('the real ClassIn thread help lists only currently available real-data questions', async ({ page }) => {
  await fixture(page);
  await page.goto(path);
  const sidecar = page.locator('#workbuddy-im-sidecar');
  await sidecar.getByRole('button', { name: '可以问什么' }).click();
  await expect(sidecar.getByRole('region', { name: '通用问题' })).toContainText('接下来要上什么课，什么时候上？');
});

test('missing capabilities stay empty or unknown, and API errors never become sample facts', async ({ page }) => {
  const reads = await fixture(page); await page.goto(path); const sidecar = page.locator('#workbuddy-im-sidecar');
  await sidecar.getByRole('tab', { name: /课中/ }).click();
  await expect(sidecar).toContainText('当前没有正在上课的课堂');
  await expect(sidecar).not.toContainText('模拟到课提醒');
  await expect(sidecar).not.toContainText('模拟学员');
  reads.fail(true);
  await sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' }).fill('查询真实作业');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar).toContainText('契约测试：真实接口不可用');
  expect(reads.modelInputs).toHaveLength(0);
  await expect(sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' })).toHaveValue('查询真实作业');
  reads.fail(false);
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect.poll(() => reads.modelInputs.length).toBe(1);
});

test('an unavailable test connection leaves the approved mock workspace usable and recovers on reload', async ({ page }) => {
  const reads = await fixture(page);
  reads.fail(true);
  await page.goto('/teacher/messages?category=class&thread=class-physics-3');
  await expect(page.getByRole('button', { name: /高二物理 3 班/ })).toBeVisible();
  await expect(page.locator('#workbuddy-im-sidecar')).toContainText('动量守恒');
  await expect(page.getByText('真实接口契约班', { exact: true })).toHaveCount(0);

  reads.fail(false);
  await page.reload();
  await expect(page.getByText('真实接口契约班', { exact: true })).toBeVisible();
  await expect(page.locator('#workbuddy-im-sidecar')).toContainText('动量守恒');
});


test('teacher simulation sends on HTTP without randomUUID and remains unique after reload', async ({ page }) => {
  await fixture(page);
  await page.addInitScript(() => Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: undefined }));
  await page.goto(path);
  const composer = page.getByRole('textbox', { name: '输入消息', exact: true });
  await composer.fill('HTTP 环境第一条'); await composer.press('Enter');
  await expect(page.getByText('已发送', { exact: true })).toHaveCount(1);
  await page.reload(); await expect(page.getByText('已发送', { exact: true })).toHaveCount(1);
  await composer.fill('HTTP 环境第二条'); await composer.press('Enter');
  await expect(page.getByText('已发送', { exact: true })).toHaveCount(2);
});
