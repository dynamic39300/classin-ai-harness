import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';

const timestamp = '2026-09-08T02:20:00.000Z';

async function mockRuntime(page: Page, messageBodies: Record<string, unknown>[] = [], options: Readonly<{ failFirstVisionRequest?: boolean }> = {}) {
  let session: RuntimeSession | null = null;
  let createCount = 0;
  let visionFailed = false;
  const calls: string[] = [];
  await page.route('**/api/teachbuddy/**', async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    calls.push(`${request.method()} ${url.pathname}`);
    const json = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (url.pathname === '/api/teachbuddy/health') return json({ status: 'ready', message: 'Protocol mock for UI contract.' });
    if (url.pathname === '/api/teachbuddy/im-demo-context') return json({ error: 'No private fixture in browser contract test.' }, 404);
    if (url.pathname === '/api/teachbuddy/sessions' && request.method() === 'GET') return json(session ? [session] : []);
    if (url.pathname === '/api/teachbuddy/sessions' && request.method() === 'POST') {
      createCount += 1;
      session = { id: `im-learning-session-${createCount}`, title: '个性化课堂回顾', status: 'idle', updatedAt: timestamp, events: [], artifacts: [] };
      return json(session, 201);
    }
    const sessionPath = session ? `/api/teachbuddy/sessions/${session.id}` : '';
    if (url.pathname === sessionPath && request.method() === 'GET') return json(session);
    if (url.pathname === `${sessionPath}/messages` && request.method() === 'POST' && typeof body?.text === 'string') {
      if (!session) return json({ error: 'Session is missing.' }, 404);
      const current = session;
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
        return json(session);
      }
      const isDwDerived = body.text.includes('林悦');
      const summary = isDwDerived
        ? '林悦的个人学情总结文稿已生成，请教师审阅。'
        : `## 课堂回顾建议

> 李明你好！机械波课堂要先明确“介质不变，所以波速不变”，再用 v=fλ 判断频率和波长。

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
          { id: 'teacher-event-1', runRef: current.id, sequence: 1, occurredAt: timestamp, updatedAt: timestamp, actor: 'teacher', kind: 'teacher_message', state: 'completed', title: '教师', summary: body.text, objectRefs: [], allowedCommands: [] },
          { id: 'agent-event-1', runRef: current.id, sequence: 2, occurredAt: timestamp, updatedAt: timestamp, actor: 'agent', kind: 'process', state: 'completed', title: 'TeachBuddy', summary, objectRefs: [], allowedCommands: [] },
        ],
      };
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
  const sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  const composer = sidecar.getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await composer.evaluate((textarea) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], '课堂截图.png', { type: 'image/png' }));
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await expect(sidecar.getByRole('list', { name: '已添加 1 张图片' })).toContainText('课堂截图.png');
  await sidecar.getByRole('button', { name: '发送给 TeachBuddy' }).click();
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
  let sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  let composer = sidecar.getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await composer.evaluate((textarea) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], '待识别.png', { type: 'image/png' }));
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await sidecar.getByRole('button', { name: '发送给 TeachBuddy' }).click();
  await expect(sidecar.getByText(/当前模型凭据未开通图片理解/).first()).toBeVisible();

  await page.reload();
  sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  composer = sidecar.getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await composer.fill('先继续处理纯文本内容');
  await sidecar.getByRole('button', { name: '发送给 TeachBuddy' }).click();

  await expect.poll(() => messageBodies.length).toBe(2);
  expect(messageBodies[1]).toMatchObject({ images: [] });
  expect(String(messageBodies[1]?.text)).toContain('先继续处理纯文本内容');
  expect(calls.filter((call) => call === 'POST /api/teachbuddy/sessions')).toHaveLength(2);
  expect(calls).toContain('POST /api/teachbuddy/sessions/im-learning-session-2/messages');
  await expect(sidecar.getByText(/课堂回顾建议/).first()).toBeVisible();
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

test('teacher starts a governed recap from Teaching Dynamics without a configuration page', async ({ page }) => {
  const calls = await mockRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-physics-3');

  const sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  await expect(sidecar.getByText('仅你可见', { exact: true })).toBeVisible();
  await expect(sidecar.getByText('DeepSeek 已连接', { exact: true })).toHaveCount(0);
  await expect(sidecar.getByRole('region', { name: '教学动态' })).toBeVisible();
  await expect(sidecar.getByRole('combobox')).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).include('#workbuddy-im-sidecar').analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await sidecar.getByRole('button', { name: /制作解析：/ }).first().click();

  await expect(sidecar.getByText(/介质不变，所以波速不变/)).toBeVisible();
  await expect(sidecar.getByRole('heading', { name: '课堂回顾建议', level: 2 })).toBeVisible();
  await expect(sidecar.getByRole('table')).toContainText('巩固练习');
  await expect(sidecar).not.toContainText('| --- | --- |');
  const analysis = sidecar.getByRole('region', { name: 'TeachBuddy 分析过程' });
  await expect(analysis.getByRole('button', { name: /已完成分析 · 2 个步骤/ })).toHaveAttribute('aria-expanded', 'false');
  await analysis.getByRole('button', { name: /已完成分析/ }).click();
  await expect(analysis.getByText('已核对当前会话上下文', { exact: true })).toHaveCount(0);
  await sidecar.getByRole('button', { name: '审阅沟通内容' }).click();
  const artifact = sidecar.getByRole('region', { name: '个性化沟通草稿' });
  await expect(artifact).toContainText('接收对象李明');
  await expect(artifact).toContainText('学生私聊 · 插入输入框');
  await expect(artifact).not.toContainText('使用依据');
  await artifact.getByRole('button', { name: '转到李明私聊并插入' }).click();

  await expect(page).toHaveURL(/category=direct&thread=direct-wang-li/);
  await expect(page.getByRole('region', { name: '李明会话' }).getByRole('textbox', { name: '输入消息' })).toHaveValue(/介质不变，所以波速不变/);
  expect(calls.some((call) => call.endsWith('/messages'))).toBe(true);
});

test('teacher-to-teacher direct chat cannot discover student learning services', async ({ page }) => {
  await mockRuntime(page);
  await enterTeacherMessages(page, 'direct-teacher-zhang');
  const dynamics = page.getByRole('region', { name: '教学动态' });
  await expect(dynamics).toContainText('暂未识别到当前聊天的教学事项');
  await expect(dynamics.getByRole('button', { name: /生成|提醒|批改/ })).toHaveCount(0);
});

test('DW-derived class context creates a private learning summary for its mapped student', async ({ page }) => {
  await mockRuntime(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, 'class-dw-expression-lab');

  await expect(page.getByRole('region', { name: '表达与思辨体验班会话' })).toContainText('真实数据 · 已脱敏');
  const sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  await sidecar.getByRole('button', { name: /生成总结：/ }).click();
  await expect(sidecar.getByRole('combobox')).toHaveCount(0);
  await expect(sidecar.getByText('林悦的个人学情总结文稿已生成，请教师审阅。')).toBeVisible();
  await sidecar.getByRole('button', { name: '审阅沟通内容' }).click();
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

  const sidecar = page.getByRole('complementary', { name: 'TeachBuddy 私密协作窗口' });
  await sidecar.getByRole('button', { name: /制作解析：/ }).first().click();
  await expect(sidecar.getByRole('heading', { name: '课堂回顾建议', level: 2 })).toBeVisible();
  await expect(sidecar.getByRole('table')).toBeVisible();
  await expect(sidecar.getByRole('region', { name: 'TeachBuddy 分析过程' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const box = await sidecar.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(901);
});
