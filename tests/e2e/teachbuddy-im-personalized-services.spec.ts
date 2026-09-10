import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';

const timestamp = '2026-09-08T02:20:00.000Z';

async function mockRuntime(page: Page, messageBodies: Record<string, unknown>[] = [], options: Readonly<{ failFirstVisionRequest?: boolean; holdFirstTextRequestUntilCancel?: boolean; initialSessions?: readonly RuntimeSession[]; failFirstCreate?: boolean }> = {}) {
  let session: RuntimeSession | null = null;
  const sessions = new Map<string, RuntimeSession>();
  for (const initialSession of options.initialSessions ?? []) sessions.set(initialSession.id, initialSession);
  let createCount = 0;
  let createFailed = false;
  let visionFailed = false;
  let heldTextRequest = false;
  let releaseHeldTextRequest: (() => void) | null = null;
  const calls: string[] = [];
  await page.route('**/api/teachbuddy/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    calls.push(`${request.method()} ${url.pathname}`);
    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/api/teachbuddy/health') return json({ status: 'ready', message: 'Protocol mock for UI contract.' });
    if (url.pathname === '/api/teachbuddy/im-demo-context') return json({ error: 'No private fixture in browser contract test.' }, 404);
    if (url.pathname === '/api/teachbuddy/sessions' && request.method() === 'GET') return json([...sessions.values()]);
    if (url.pathname === '/api/teachbuddy/sessions' && request.method() === 'POST') {
      if (options.failFirstCreate && !createFailed) {
        createFailed = true;
        return json({ error: 'TeachBuddy 暂时无法创建替代会话。' }, 503);
      }
      createCount += 1;
      session = { id: `im-learning-session-${createCount}`, title: '个性化课堂回顾', status: 'idle', updatedAt: timestamp, events: [], artifacts: [] };
      sessions.set(session.id, session);
      return json(session, 201);
    }
    const readMatch = url.pathname.match(/^\/api\/teachbuddy\/sessions\/([^/]+)$/);
    if (readMatch && request.method() === 'GET') {
      const found = sessions.get(decodeURIComponent(readMatch[1]!));
      return found ? json(found) : json({ error: 'Session is missing.' }, 404);
    }
    const cancelMatch = url.pathname.match(/^\/api\/teachbuddy\/sessions\/([^/]+)\/cancel$/);
    if (cancelMatch && request.method() === 'POST') {
      const id = decodeURIComponent(cancelMatch[1]!);
      const current = sessions.get(id);
      if (!current) return json({ error: 'Session is missing.' }, 404);
      session = { ...current, status: 'stopped', error: '生成已停止，你可以继续发送要求。', updatedAt: timestamp };
      sessions.set(id, session);
      releaseHeldTextRequest?.();
      releaseHeldTextRequest = null;
      return json(session);
    }
    const messageMatch = url.pathname.match(/^\/api\/teachbuddy\/sessions\/([^/]+)\/messages$/);
    if (messageMatch && request.method() === 'POST' && typeof body?.text === 'string') {
      const id = decodeURIComponent(messageMatch[1]!);
      const current = sessions.get(id);
      if (!current) return json({ error: 'Session is missing.' }, 404);
      messageBodies.push(body);
      if (options.failFirstVisionRequest && !visionFailed && Array.isArray(body.images) && body.images.length > 0) {
        visionFailed = true;
        session = {
          ...current, status: 'failed', failureCode: 'vision-permission',
          error: '当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。',
          events: [{ id: 'vision-error-1', runRef: current.id, sequence: 1, occurredAt: timestamp, updatedAt: timestamp,
            actor: 'system', kind: 'error', state: 'failed', title: '生成失败',
            summary: '当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。', objectRefs: [], allowedCommands: [] }],
        };
        sessions.set(id, session);
        return json(session);
      }
      if (options.holdFirstTextRequestUntilCancel && !heldTextRequest) {
        heldTextRequest = true;
        await new Promise<void>((resolve) => { releaseHeldTextRequest = resolve; });
        const stopped = sessions.get(id);
        if (stopped?.status === 'stopped') return json(stopped);
      }
      const isDwDerived = body.text.includes('林悦');
      const summary = isDwDerived
        ? '林悦的个人学情总结文稿已生成，请教师审阅。'
        : `## 课堂回顾建议

我已结合课堂目标整理了回顾内容。

<!--TEACHBUDDY_MESSAGE_BODY_START-->
李明你好！机械波课堂要先明确“介质不变，所以波速不变”，再用 v=fλ 判断频率和波长。
<!--TEACHBUDDY_MESSAGE_BODY_END-->

| 下一步 | 完成方式 |
| --- | --- |
| 巩固练习 | 按这三步重做一道题后发给我 |

- [x] 已核对课堂目标`;
      const artifacts = isDwDerived ? [{
        id: 'runtime-artifact-dw-summary', title: '林悦近30天个人学情总结',
        content: '林悦你好！近一个月你在故事要素定位、情节顺序和 Problem–Solution 结构上进步明显。接下来请每次课后选两个新词造句，再用“问题—办法—结果”复述一个片段；目前没有可核验的学生回执，我会在下次课前和你确认。',
        fileRef: 'sessions/im-learning-session-1/lin-summary.md', fileName: 'lin-summary.md', format: 'markdown' as const, mediaType: 'text/markdown', byteSize: 268,
        createdAt: timestamp, version: 1, status: 'draft' as const,
      }] : [];
      session = {
        id: current.id, title: '个性化课堂回顾', status: 'idle', updatedAt: timestamp, artifacts,
        events: [
          ...current.events,
          { id: `teacher-event-${current.events.length + 1}`, runRef: current.id, sequence: current.events.length + 1, occurredAt: timestamp, updatedAt: timestamp, actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: body.text, objectRefs: [], allowedCommands: [] },
          { id: `agent-event-${current.events.length + 2}`, runRef: current.id, sequence: current.events.length + 2, occurredAt: timestamp, updatedAt: timestamp, actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary, objectRefs: [], allowedCommands: [] },
        ],
      };
      sessions.set(id, session);
      return json(session);
    }
    return json({ error: `Unexpected runtime call: ${request.method()} ${url.pathname}` }, 500);
  });
  return calls;
}

test('IM Sidecar accepts a pasted image and forwards it with governed context', async ({ page }) => {
  const messageBodies: Record<string, unknown>[] = [];
  await mockRuntime(page, messageBodies);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.evaluate((textarea) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], '课堂截图.png', { type: 'image/png' }));
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await expect(sidecar.getByRole('list', { name: '已添加 1 张图片' })).toContainText('课堂截图.png');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect.poll(() => messageBodies.length).toBe(1);
  expect(messageBodies[0]).toMatchObject({ images: [{ name: '课堂截图.png', mediaType: 'image/png', byteSize: 8, data: 'iVBORw0KGgo=' }] });
  expect(String(messageBodies[0]?.text)).toContain('TEACHBUDDY_CONTEXT_V1');
  await expect(sidecar.getByRole('list', { name: '已添加 1 张图片' })).toHaveCount(0);
});

test('IM Sidecar resumes text in a clean session after the vision credential gate', async ({ page }) => {
  const messageBodies: Record<string, unknown>[] = [];
  const calls = await mockRuntime(page, messageBodies, { failFirstVisionRequest: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');
  let sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  let composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.evaluate((textarea) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], '待识别.png', { type: 'image/png' }));
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByText(/当前模型凭据未开通图片理解/).first()).toBeVisible();

  await page.reload();
  sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.fill('先继续处理纯文本内容');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();

  await expect.poll(() => messageBodies.length).toBe(2);
  expect(messageBodies[1]).toMatchObject({ images: [] });
  expect(String(messageBodies[1]?.text)).toContain('先继续处理纯文本内容');
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(2);
  expect(calls).toContain('POST /api/teachbuddy/sessions/im-learning-session-2/messages');
  await expect(sidecar.getByText(/当前模型凭据未开通图片理解/).first()).toBeVisible();
  await expect(sidecar.getByText('先继续处理纯文本内容', { exact: true })).toBeVisible();
  await expect(sidecar.getByText(/课堂回顾建议/).first()).toBeVisible();

  await page.reload();
  sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByText(/当前模型凭据未开通图片理解/).first()).toBeVisible();
  await expect(sidecar.getByText('先继续处理纯文本内容', { exact: true })).toBeVisible();
  await expect(sidecar.getByText(/课堂回顾建议/).first()).toBeVisible();
});

test('IM Sidecar can stop a pending generation and continue in the same conversation', async ({ page }) => {
  const calls = await mockRuntime(page, [], { holdFirstTextRequestUntilCancel: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.fill('先帮我整理一条课堂提醒');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();

  const stop = sidecar.getByRole('button', { name: '停止生成' });
  await expect(stop).toBeVisible();
  await expect(composer).toBeEnabled();
  await expect(sidecar.getByRole('button', { name: '发送给 AI 消息助手' })).toBeDisabled();
  await composer.fill('这句话先保留');
  await stop.click();
  await expect(sidecar.getByText('生成已停止，你可以继续发送要求。')).toBeVisible();
  await expect(composer).toBeEnabled();
  await expect(composer).toHaveValue('这句话先保留');

  await composer.fill('改成一句更简短的提醒');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByText(/课堂回顾建议/).first()).toBeVisible();

  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(1);
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions/im-learning-session-1/cancel')).toHaveLength(1);
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions/im-learning-session-1/messages')).toHaveLength(2);
});

test('IM Sidecar transparently replaces a stale binding without exposing session controls', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('classin:teachbuddy:im-session-bindings:v1', JSON.stringify({
      'ideal-full|classin-demo-school|teacher-001|class-physics-3': {
        sessionRef: 'missing-session',
        updatedAt: '2026-09-10T10:00:00.000Z',
      },
    }));
  });
  const calls = await mockRuntime(page);
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByRole('button', { name: /新建.*会话/ })).toHaveCount(0);
  await expect(sidecar.getByRole('button', { name: '重试恢复' })).toHaveCount(0);
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await expect(composer).toBeEnabled();
  await composer.fill('继续整理当前班级的消息');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByText('继续整理当前班级的消息', { exact: true })).toBeVisible();
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(1);
  expect(calls).toContain('POST /api/teachbuddy/sessions/im-learning-session-1/messages');
});

test('demo reset URL starts with an empty AI conversation after every page refresh', async ({ page }) => {
  const priorSession: RuntimeSession = {
    id: 'demo-history-session',
    title: '历史演示消息',
    status: 'idle',
    updatedAt: timestamp,
    artifacts: [],
    events: [{
      id: 'demo-history-event', runRef: 'demo-history-session', sequence: 1,
      occurredAt: timestamp, updatedAt: timestamp, actor: 'agent', kind: 'process', state: 'completed',
      title: 'TeachBuddy', summary: '这条历史 AI 对话不应出现在刷新后的演示页面。', objectRefs: [], allowedCommands: [],
    }],
  };
  await page.addInitScript(() => {
    window.localStorage.setItem('classin:teachbuddy:im-session-bindings:v1', JSON.stringify({
      'ideal-full|classin-demo-school|teacher-001|class-physics-3': {
        sessionRef: 'demo-history-session',
        updatedAt: '2026-09-10T10:00:00.000Z',
      },
    }));
  });
  const calls = await mockRuntime(page, [], { initialSessions: [priorSession] });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto('/teacher/messages?category=class&thread=class-physics-3&resetCopilotOnReload=1');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByText('这条历史 AI 对话不应出现在刷新后的演示页面。')).toHaveCount(0);
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await composer.fill('生成一条消息，提醒大家明天上课');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByText('生成一条消息，提醒大家明天上课', { exact: true })).toBeVisible();
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(1);

  await page.reload();
  await expect(sidecar.getByText('生成一条消息，提醒大家明天上课', { exact: true })).toHaveCount(0);
});

test('a failed stale-binding replacement preserves earlier readable history', async ({ page }) => {
  const priorSession: RuntimeSession = {
    id: 'prior-session',
    title: '教学消息',
    status: 'idle',
    updatedAt: timestamp,
    artifacts: [],
    events: [{
      id: 'prior-agent-event', runRef: 'prior-session', sequence: 1, occurredAt: timestamp, updatedAt: timestamp,
      actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary: '之前整理的课堂提醒仍然保留。', objectRefs: [], allowedCommands: [],
    }],
  };
  await page.addInitScript(() => {
    window.localStorage.setItem('classin:teachbuddy:im-session-bindings:v1', JSON.stringify({
      'ideal-full|classin-demo-school|teacher-001|class-physics-3': {
        priorSessionRefs: ['prior-session'],
        sessionRef: 'missing-session',
        updatedAt: '2026-09-10T10:00:00.000Z',
      },
    }));
  });
  const calls = await mockRuntime(page, [], { initialSessions: [priorSession], failFirstCreate: true });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByText('之前整理的课堂提醒仍然保留。', { exact: true })).toBeVisible();
  const composer = sidecar.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await expect(composer).toBeEnabled();
  await composer.fill('沿用之前的内容，改得更简短');
  await sidecar.getByRole('button', { name: '发送给 AI 消息助手' }).click();
  await expect(sidecar.getByText('沿用之前的内容，改得更简短', { exact: true })).toBeVisible();
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(1);
  expect(calls).toContain('POST /api/teachbuddy/sessions/prior-session/messages');
});

test('review edits the current AI reply instead of an artifact left by an earlier turn', async ({ page }) => {
  const session: RuntimeSession = {
    id: 'restored-review-session',
    title: '班级消息',
    status: 'idle',
    updatedAt: '2026-09-10T06:50:20.000Z',
    events: [
      {
        id: 'teacher-current', runRef: 'restored-review-session', sequence: 1,
        occurredAt: '2026-09-10T06:50:07.000Z', updatedAt: '2026-09-10T06:50:07.000Z',
        actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师',
        summary: '请生成一条消息，针对李明第 5 题的正负号问题直接讲解。', objectRefs: [], allowedCommands: [],
      },
      {
        id: 'agent-current', runRef: 'restored-review-session', sequence: 2,
        occurredAt: '2026-09-10T06:50:20.000Z', updatedAt: '2026-09-10T06:50:20.000Z',
        actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy',
        summary: '<!--TEACHBUDDY_MESSAGE_BODY_START-->\n@李明 第5题先约定向右为正，再带着正负号代入动量守恒方程。\n<!--TEACHBUDDY_MESSAGE_BODY_END-->', objectRefs: [], allowedCommands: [],
      },
    ],
    artifacts: [{
      id: 'artifact-earlier', title: '电磁感应课前提醒',
      content: '各位同学：明天 19:00 我们将进行电磁感应课程，请提前完成预习。',
      fileRef: 'sessions/restored-review-session/earlier.md', fileName: 'earlier.md', format: 'markdown', mediaType: 'text/markdown', byteSize: 96,
      createdAt: '2026-09-10T06:41:31.000Z', version: 1, status: 'draft',
    }],
  };
  await page.addInitScript(() => {
    window.localStorage.setItem('classin:teachbuddy:im-session-bindings:v1', JSON.stringify({
      'ideal-full|classin-demo-school|teacher-001|class-physics-3': {
        sessionRef: 'restored-review-session',
        updatedAt: '2026-09-10T06:50:20.000Z',
      },
    }));
  });
  await mockRuntime(page, [], { initialSessions: [session] });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByText(/@李明 第5题先约定向右为正/)).toBeVisible();
  await sidecar.getByRole('button', { name: '审阅并发送' }).click();

  const editor = sidecar.getByRole('textbox', { name: '消息草稿正文' });
  await expect(editor).toHaveValue('@李明 第5题先约定向右为正，再带着正负号代入动量守恒方程。');
  await expect(editor).not.toHaveValue(/电磁感应/);
});

async function enterTeacherMessages(page: Page, target: 'class-physics-3' | 'class-dw-expression-lab' | 'direct-teacher-zhang') {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();
  if (target.startsWith('class-')) {
    await page.locator(`[data-thread-id="${target}"]`).click();
  } else {
    await page.getByRole('button', { name: '私聊', exact: true }).click();
    await page.locator('[data-thread-id="direct-teacher-zhang"]').click();
  }
}

test('Teaching Dynamics starts an AI task when randomUUID is unavailable on an HTTP LAN origin', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
  });
  const messageBodies: Record<string, unknown>[] = [];
  await mockRuntime(page, messageBodies);
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await sidecar.getByRole('tab', { name: /课前/ }).click();
  await sidecar.getByRole('button', { name: /提醒上课：电磁感应/ }).click();

  await expect.poll(() => messageBodies.length).toBe(1);
  expect(messageBodies[0]?.commandId).toEqual(expect.any(String));
  await expect(sidecar.getByText('请为明天 19:00 的电磁感应课生成一条群提醒，提醒同学们准时进入课堂，并准备好讲义和预习单。', { exact: true })).toBeVisible();
  await expect(sidecar.getByText(/课堂回顾建议/).first()).toBeVisible();
});

test('teacher starts a governed recap from Teaching Dynamics without a configuration page', async ({ page }) => {
  const messageBodies: Record<string, unknown>[] = [];
  const calls = await mockRuntime(page, messageBodies);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar.getByText(/^\d+ 项建议$/)).toBeVisible();
  await expect(sidecar.getByText('仅你可见', { exact: true })).toHaveCount(0);
  await expect(sidecar.getByText('DeepSeek 已连接', { exact: true })).toHaveCount(0);
  const guide = sidecar.getByRole('region', { name: 'AI 消息助手建议' });
  await expect(guide).toContainText('选环节，点一条建议，AI写消息草稿，您确认后发送');
  await expect(guide.getByRole('tablist', { name: '教学阶段' })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: /新建.*会话/ })).toHaveCount(0);
  await expect(sidecar.getByRole('combobox')).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await sidecar.getByRole('tab', { name: /总结/ }).click();
  await sidecar.getByRole('button', { name: /个人总结：李明/ }).click();

  await expect.poll(() => messageBodies.length).toBe(1);
  const visibleRequest = '请根据李明在动量守恒单元的课堂、作业和互动证据，整理个人学习进展、困难和下一步建议；只陈述可核验事实。';
  expect(String(messageBodies[0]?.text)).toContain('请执行“个人学情总结”');
  expect(String(messageBodies[0]?.text)).toContain(visibleRequest);
  expect(String(messageBodies[0]?.text)).toContain('TEACHBUDDY_MESSAGE_BODY_START');
  await expect(sidecar.getByRole('list', { name: 'AI 消息助手会话消息' }).getByText(visibleRequest, { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('list', { name: 'AI 消息助手会话消息' })).not.toContainText('请执行“个人学情总结”');
  await expect(sidecar.getByRole('list', { name: 'AI 消息助手会话消息' })).not.toContainText('TEACHBUDDY_MESSAGE_BODY_START');
  await expect(sidecar.getByText(/介质不变，所以波速不变/)).toBeVisible();
  await expect(sidecar.getByRole('heading', { name: '课堂回顾建议', level: 2 })).toBeVisible();
  await expect(sidecar.getByRole('article', { name: '你的消息' })).toBeVisible();
  await expect(sidecar.getByText('您', { exact: true })).toHaveCount(0);
  await expect(sidecar.getByRole('table')).toContainText('巩固练习');
  await expect(sidecar).not.toContainText('| --- | --- |');
  const analysis = sidecar.getByRole('region', { name: 'AI 消息助手 分析过程' });
  await expect(analysis).not.toContainText('个步骤');
  const analysisToggle = analysis.getByRole('button', { name: /展开处理过程：已整理好/ });
  await expect(analysisToggle).toHaveAttribute('aria-expanded', 'false');
  await analysisToggle.click();
  await expect(analysis.getByText('已核对当前会话上下文', { exact: true })).toHaveCount(0);
  await sidecar.getByRole('button', { name: '审阅并发送' }).click();
  const artifact = sidecar.getByRole('region', { name: '个性化沟通草稿' });
  await expect(artifact).toContainText('接收对象李明');
  await expect(artifact).toContainText('学生私聊 · 插入输入框');
  await expect(artifact).not.toContainText('使用依据');
  await expect(artifact.getByRole('textbox', { name: '消息草稿正文' })).toHaveValue('李明你好！机械波课堂要先明确“介质不变，所以波速不变”，再用 v=fλ 判断频率和波长。');
  await artifact.getByRole('button', { name: '取消' }).click();
  await expect(artifact).toHaveCount(0);
  await expect(sidecar.getByRole('heading', { name: '课堂回顾建议', level: 2 })).toBeVisible();
  await sidecar.getByRole('button', { name: '审阅并发送' }).click();
  await expect(artifact).toBeVisible();
  await artifact.getByRole('button', { name: '转到李明私聊并插入' }).click();

  await expect(page).toHaveURL(/category=direct&thread=direct-wang-li/);
  await expect(page.getByRole('region', { name: '李明会话' }).getByRole('textbox', { name: '输入消息' })).toHaveValue(/介质不变，所以波速不变/);
  expect(calls.some((call) => call.endsWith('/messages'))).toBe(true);
});

test('AI message helper stays expanded while scrolling and collapses only from its icon', async ({ page }) => {
  await mockRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  const conversation = sidecar.getByRole('region', { name: 'AI 消息助手对话' });
  const guide = sidecar.getByRole('region', { name: 'AI 消息助手建议' });
  const content = guide.locator('#teaching-dynamics-content');
  const collapse = guide.getByRole('button', { name: '收起 AI 消息助手建议' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  const communication = page.getByRole('region', { name: '消息通信主工作台' });
  const [sidecarBox, guideBox, communicationBox] = await Promise.all([sidecar.boundingBox(), guide.boundingBox(), communication.boundingBox()]);
  expect(sidecarBox).not.toBeNull();
  expect(guideBox).not.toBeNull();
  expect(communicationBox).not.toBeNull();
  expect(sidecarBox?.y).toBeCloseTo(communicationBox?.y ?? 0, 0);
  expect((sidecarBox?.y ?? 0) + (sidecarBox?.height ?? 0)).toBeCloseTo((communicationBox?.y ?? 0) + (communicationBox?.height ?? 0), 0);
  expect(guideBox?.x).toBeCloseTo(sidecarBox?.x ?? 0, 0);
  expect(guideBox?.width).toBeCloseTo(sidecarBox?.width ?? 0, 0);
  const surfaces = await sidecar.evaluate((element) => {
    const guide = element.querySelector<HTMLElement>('[aria-label="AI 消息助手建议"]');
    const sidecarStyle = getComputedStyle(element);
    const guideStyle = guide ? getComputedStyle(guide) : null;
    const body = element.querySelector<HTMLElement>('[aria-label="AI 消息助手对话"]');
    const bodyStyle = body ? getComputedStyle(body) : null;
    return {
      sidecar: { borderWidth: sidecarStyle.borderWidth, boxShadow: sidecarStyle.boxShadow, margin: sidecarStyle.margin },
      guide: guideStyle ? { position: guideStyle.position, borderWidth: guideStyle.borderWidth, boxShadow: guideStyle.boxShadow, backgroundColor: guideStyle.backgroundColor } : null,
      conversationBackground: bodyStyle?.backgroundColor ?? null,
    };
  });
  expect(surfaces.sidecar).toEqual({ borderWidth: '0px', boxShadow: 'none', margin: '0px' });
  expect(surfaces.guide).toMatchObject({ position: 'relative', borderWidth: '0px', boxShadow: 'none' });
  expect(surfaces.guide?.backgroundColor).toBe('rgb(244, 244, 244)');
  expect(surfaces.guide?.backgroundColor).not.toBe(surfaces.conversationBackground);
  const motion = await content.evaluate((element) => {
    const style = getComputedStyle(element);
    return { duration: style.transitionDuration, property: style.transitionProperty };
  });
  expect(motion.property).toContain('grid-template-rows');
  expect(motion.property).toContain('opacity');
  expect(motion.property).toContain('transform');
  expect(motion.duration).toContain('0.32s');
  await expect(collapse).toHaveText('');
  await content.evaluate((element) => {
    element.setAttribute('data-observed-transitions', '[]');
    element.addEventListener('transitionend', (event) => {
      if (event.target !== element) return;
      const transition = event as TransitionEvent;
      const entries = JSON.parse(element.getAttribute('data-observed-transitions') ?? '[]') as { property: string; elapsedTime: number }[];
      entries.push({ property: transition.propertyName, elapsedTime: transition.elapsedTime });
      element.setAttribute('data-observed-transitions', JSON.stringify(entries));
    });
  });

  await conversation.hover();
  await page.mouse.wheel(0, 240);
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await collapse.click();
  const expand = guide.getByRole('button', { name: '展开 AI 消息助手建议' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(guide.getByText('选环节，点一条建议，AI写消息草稿，您确认后发送')).toBeVisible();
  await expect(content).toHaveCSS('visibility', 'hidden');
  const transitionEvents = await content.evaluate((element) => JSON.parse(element.getAttribute('data-observed-transitions') ?? '[]') as { property: string; elapsedTime: number }[]);
  for (const property of ['grid-template-rows', 'opacity', 'transform']) {
    const transition = transitionEvents.find((entry) => entry.property === property);
    expect(transition, `${property} transition should finish`).toBeDefined();
    expect(transition?.elapsedTime).toBeCloseTo(0.32, 2);
  }
  await expand.click();
  await expect(guide.getByRole('tablist', { name: '教学阶段' })).toBeVisible();
});

test('teacher-to-teacher direct chat cannot discover student learning services', async ({ page }) => {
  await mockRuntime(page);
  await enterTeacherMessages(page, 'direct-teacher-zhang');
  const dynamics = page.getByRole('region', { name: 'AI 消息助手建议' });
  await expect(dynamics).toContainText('暂未识别到当前聊天的教学事项');
  await expect(dynamics.getByRole('button', { name: /生成|提醒|批改/ })).toHaveCount(0);
});

test('DW-derived class context creates a private learning summary for its mapped student', async ({ page }) => {
  await mockRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-dw-expression-lab');

  await expect(page.getByRole('region', { name: '表达与思辨体验班会话' })).toContainText('真实数据 · 已脱敏');
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await sidecar.getByRole('tab', { name: /总结/ }).click();
  await sidecar.getByRole('button', { name: /生成总结：/ }).click();
  await expect(sidecar.getByRole('combobox')).toHaveCount(0);
  await expect(sidecar.getByText('林悦的个人学情总结文稿已生成，请教师审阅。')).toBeVisible();
  await sidecar.getByRole('button', { name: '审阅并发送' }).click();
  const artifact = sidecar.getByRole('region', { name: '个性化沟通草稿' });
  await expect(artifact).toContainText('接收对象林悦');
  await expect(artifact).not.toContainText('使用依据');
  await artifact.getByRole('button', { name: '转到林悦私聊并插入' }).click();

  await expect(page).toHaveURL(/category=direct&thread=direct-dw-lin/);
  await expect(page.getByRole('region', { name: '林悦会话' }).getByRole('textbox', { name: '输入消息' })).toHaveValue(/目前没有可核验的学生回执/);
});

test('rich Agent response stays contained in the compact Sidecar', async ({ page }) => {
  await mockRuntime(page);
  await page.setViewportSize({ width: 900, height: 720 });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await sidecar.getByRole('tab', { name: /总结/ }).click();
  await sidecar.getByRole('button', { name: /个人总结：李明/ }).click();
  await expect(sidecar.getByRole('heading', { name: '课堂回顾建议', level: 2 })).toBeVisible();
  await expect(sidecar.getByRole('table')).toBeVisible();
  await expect(sidecar.getByRole('region', { name: 'AI 消息助手 分析过程' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const box = await sidecar.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(901);
});
