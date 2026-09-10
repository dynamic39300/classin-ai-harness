/// <reference types="node" />
import { expect, test as base, type Locator, type Page, type Route, type TestInfo } from '@playwright/test';
import type { RuntimeArtifact, RuntimeHealth, RuntimeScope, RuntimeSession } from '../../src/contracts/workbuddy/agent-runtime';
import type { ConversationRunEvent } from '../../src/contracts/workbuddy/conversation-run';

// Protocol mock only: exercises the real App Shell and HTTP adapter, never a live
// model, Harness tool execution, ClassIn writeback, or actual server persistence.
const timestamp = new Date().toISOString();
const defaultPath = '/teacher/ai-agent/new';
const classPath = '/teacher/classes/physics-3/workbuddy/new';
const firstMessage = '[协议模拟] 请为高二物理设计一份动量守恒教案。';
const secondMessage = '[协议模拟] 延续刚才的教案，补充一道课堂练习。';
const partialMessage = '[协议模拟] 正在整理动量守恒的教学目标';
const firstAnswer = '[协议模拟] 教案已生成，请审阅教学目标、实验过程与课堂练习。';
const secondAnswer = '[协议模拟] 已结合上一轮教案补充课堂练习：比较碰撞前后的总动量。';
const artifact: RuntimeArtifact = {
  id: 'protocol-artifact-1', title: '协议模拟-动量守恒教案', version: 1, status: 'draft',
  content: '# 动量守恒教案（协议模拟，非真实模型输出）\n\n## 教学目标\n比较碰撞前后总动量。\n\n## 实验步骤\n记录两辆小车碰撞前后的速度。\n\n## 课堂练习\n解释系统动量守恒的条件。\n\n证据标识：' + 'protocol_mock_long_reference_'.repeat(12),
  fileRef: 'sf-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', fileName: '协议模拟-动量守恒教案.md',
  format: 'markdown', mediaType: 'text/markdown; charset=utf-8', byteSize: 980,
  createdAt: timestamp,
};

type ApiCall = { method: string; path: string; scope: string | null; body: Record<string, unknown> | null };
type StoredSession = { scope: RuntimeScope; snapshot: RuntimeSession; turn: number; partialReads: number; finish: boolean };

class ProtocolMock {
  health: RuntimeHealth = { status: 'ready', message: 'Protocol mock; no live model.' };
  offline = false;
  readonly calls: ApiCall[] = [];
  readonly unexpected: ApiCall[] = [];
  readonly sessions = new Map<string, StoredSession>();

  writes(suffix: string) {
    return this.calls.filter((call) => call.method === 'POST' && call.path.endsWith(suffix));
  }

  write(suffix: string, index = 0) {
    const call = this.writes(suffix)[index];
    if (!call) throw new Error(`Expected protocol POST ${suffix} at index ${index}`);
    return call;
  }

  current(scope: RuntimeScope = 'ideal-full') {
    const stored = [...this.sessions.values()].find((entry) => entry.scope === scope);
    if (!stored) throw new Error(`No protocol session created for ${scope}`);
    return stored;
  }

  seedVisionFailure(scope: RuntimeScope = 'ideal-full') {
    const id = `protocol-${scope}-vision-failed`;
    const snapshot: RuntimeSession = {
      id, title: '图片理解失败的会话', status: 'failed', updatedAt: timestamp, events: [], artifacts: [],
      error: '当前模型凭据未开通图片理解，请联系服务管理员开通 DeepSeek 视觉模型后重试。',
      failureCode: 'vision-permission',
    };
    this.sessions.set(id, { scope, snapshot, turn: 0, partialReads: 0, finish: false });
    return id;
  }

  event(session: RuntimeSession, actor: ConversationRunEvent['actor'], kind: ConversationRunEvent['kind'], summary: string, state: ConversationRunEvent['state'] = 'completed'): ConversationRunEvent {
    const sequence = session.events.length + 1;
    return { id: `${session.id}-event-${sequence}`, runRef: session.id, sequence, occurredAt: timestamp, updatedAt: timestamp,
      actor, kind, state, title: actor === 'tool' ? '生成教学文稿（协议模拟）' : summary, summary, objectRefs: [], allowedCommands: [] };
  }

  async route(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null;
    const call: ApiCall = { method: request.method(), path: url.pathname, scope: typeof body?.scope === 'string' ? body.scope : url.searchParams.get('scope'), body };
    this.calls.push(call);
    const respond = (value: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    if (this.offline) return route.abort('connectionrefused');
    if (call.path === '/api/teachbuddy/health' && call.method === 'GET') return respond(this.health);
    if (call.path === '/api/teachbuddy/im-demo-context' && call.method === 'GET') return respond({ error: 'No private IM fixture in this runtime test.' }, 404);
    if (call.path === '/api/teachbuddy/files' && call.method === 'GET') {
      const groups = [...this.sessions.values()].filter((entry) => entry.scope === call.scope && entry.snapshot.artifacts.length).map((entry) => ({
        sessionId: entry.snapshot.id,
        sessionTitle: entry.snapshot.title,
        updatedAt: entry.snapshot.updatedAt,
        files: entry.snapshot.artifacts.map((item) => ({
          id: item.fileRef, artifactId: item.id, sessionId: entry.snapshot.id, sessionTitle: entry.snapshot.title,
          name: item.fileName, extension: item.fileName.split('.').pop(), format: item.format, mediaType: item.mediaType,
          byteSize: item.byteSize, version: item.version, status: item.status, createdAt: item.createdAt,
          updatedAt: entry.snapshot.updatedAt, preview: item.format === 'html' ? 'html' : 'text', truthLabel: 'local-runtime',
        })),
      }));
      return respond(groups);
    }
    const fileMatch = call.path.match(/^\/api\/teachbuddy\/files\/(sf-[a-f0-9]{40})(?:\/(download))?$/);
    if (fileMatch && call.method === 'GET' && fileMatch[1] === artifact.fileRef) {
      if (fileMatch[2] === 'download') return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': artifact.mediaType,
          'Content-Length': String(Buffer.byteLength(artifact.content)),
          'Content-Disposition': `attachment; filename="teachbuddy.md"; filename*=UTF-8''${encodeURIComponent(artifact.fileName)}`,
        },
        body: artifact.content,
      });
      const stored = [...this.sessions.values()].find((entry) => entry.scope === call.scope && entry.snapshot.artifacts.some((item) => item.fileRef === fileMatch[1]));
      if (!stored) return respond({ error: '文件不存在。' }, 404);
      return respond({
        file: {
          id: artifact.fileRef, artifactId: artifact.id, sessionId: stored.snapshot.id, sessionTitle: stored.snapshot.title,
          name: artifact.fileName, extension: 'md', format: artifact.format, mediaType: artifact.mediaType,
          byteSize: artifact.byteSize, version: artifact.version, status: artifact.status, createdAt: artifact.createdAt,
          updatedAt: stored.snapshot.updatedAt, preview: 'text', truthLabel: 'local-runtime',
        },
        content: artifact.content,
      });
    }
    if (call.path === '/api/teachbuddy/sessions') {
      if (call.method === 'GET') return respond([...this.sessions.values()].filter((entry) => entry.scope === call.scope).map((entry) => entry.snapshot));
      if (call.method === 'POST' && (call.scope === 'ideal-full' || call.scope === 'classin-mvp' || call.scope === 'standalone-teacher')) {
        const snapshot: RuntimeSession = { id: `protocol-${call.scope}-${this.sessions.size + 1}`, title: '协议模拟：动量守恒教案', status: 'idle', updatedAt: timestamp, events: [], artifacts: [] };
        this.sessions.set(snapshot.id, { scope: call.scope, snapshot, turn: 0, partialReads: 0, finish: false });
        return respond(snapshot, 201);
      }
    }
    const parts = call.path.split('/');
    const stored = this.sessions.get(decodeURIComponent(parts[4] ?? ''));
    if (stored && call.scope === stored.scope) {
      let session = stored.snapshot;
      if (parts.length === 5 && call.method === 'GET') {
        if (session.status === 'running') {
          stored.partialReads += 1;
          if (stored.finish) {
            session = { ...session, status: 'idle', events: session.events.map((event) => event.state !== 'running' ? event : {
              ...event, state: 'completed', summary: event.actor === 'tool' ? '[协议模拟] 教学文稿工具已生成待审阅产物。' : stored.turn === 1 ? firstAnswer : secondAnswer,
            }), artifacts: [artifact] };
            stored.snapshot = session;
          }
        }
        return respond(session);
      }
      if (call.method === 'POST' && parts[5] === 'messages' && parts.length === 6 && typeof body?.text === 'string') {
        stored.turn += 1;
        stored.partialReads = 0;
        stored.finish = false;
        session = { ...session, status: 'running', events: [...session.events, this.event(session, 'teacher', 'teacher_message', body.text)] };
        session = { ...session, events: [...session.events, this.event(session, 'agent', 'process', `${partialMessage}（第 ${stored.turn} 轮）`, 'running')] };
        if (stored.turn === 1) session = { ...session, events: [...session.events, this.event(session, 'tool', 'capability_call', '[协议模拟] 正在生成教学文稿。', 'running')] };
        stored.snapshot = session;
        return respond(session, 202);
      }
      if (call.method === 'POST' && parts[5] === 'cancel' && parts.length === 6) {
        stored.snapshot = { ...session, status: 'stopped', events: session.events.map((event) => event.state === 'running' ? { ...event, state: 'stopped' } : event) };
        return respond(stored.snapshot);
      }
      if (call.method === 'POST' && parts[5] === 'artifacts' && parts[6] === artifact.id && parts[7] === 'approve' && parts.length === 8 && body?.version === artifact.version) {
        stored.snapshot = { ...session, artifacts: session.artifacts.map((item) => ({ ...item, status: 'saved', receipt: {
          id: 'protocol-receipt-1', approvedAt: timestamp, savedAt: timestamp, truthLabel: 'local-runtime',
        } })) };
        return respond(stored.snapshot);
      }
    }
    this.unexpected.push(call);
    return respond({ error: 'Unexpected protocol mock request; no live API fallback.' }, 400);
  }
}

const test = base.extend<{ protocol: ProtocolMock }>({
  protocol: async ({ page }, provide, testInfo) => {
    const protocol = new ProtocolMock();
    await page.route('**/api/teachbuddy/**', (route) => protocol.route(route));
    await provide(protocol);
    await testInfo.attach('protocol-mock-requests-not-live-model', { body: JSON.stringify(protocol.calls, null, 2), contentType: 'application/json' });
    expect(protocol.unexpected, 'All TeachBuddy API calls must match the scoped protocol mock').toEqual([]);
  },
});

function surface(page: Page) { return page.getByRole('region', { name: 'TeachBuddy 对话工作台', exact: true }); }
function composer(page: Page) { return surface(page).getByRole('textbox', { name: '向 TeachBuddy 输入要求' }); }
function send(page: Page) { return surface(page).getByRole('button', { name: '发送给 TeachBuddy' }); }

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function openTeacher(page: Page, path = defaultPath) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toBeVisible();
  await page.goto(path);
  await expect(surface(page)).toBeVisible();
  await expect(path === classPath ? page.getByTestId('class-mvp-workbuddy-shell') : page.locator('[data-shell-mode="linear-workbench"]')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(surface(page).getByRole('link', { name: '课程工作流' })).toHaveCount(0);
}

test('main TeachBuddy composer uploads and pastes images into the runtime request', async ({ page, protocol }) => {
  await openTeacher(page);
  const input = surface(page).locator('input[type="file"]');
  await input.setInputFiles({ name: '课堂板书.png', mimeType: 'image/png', buffer: pngHeader });
  await expect(surface(page).getByRole('list', { name: '已添加 1 张图片' })).toContainText('课堂板书.png');
  await surface(page).getByRole('button', { name: '移除图片 课堂板书.png' }).click();

  await composer(page).evaluate((textarea) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from([0xff, 0xd8, 0xff])], '粘贴题目.jpg', { type: 'image/jpeg' }));
    textarea.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true }));
  });
  await expect(surface(page).getByRole('list', { name: '已添加 1 张图片' })).toContainText('粘贴题目.jpg');
  await send(page).click();
  await expect.poll(() => protocol.writes('/messages').length).toBe(1);
  expect(protocol.write('/messages').body).toMatchObject({
    scope: 'ideal-full', text: '', images: [{ name: '粘贴题目.jpg', mediaType: 'image/jpeg', byteSize: 3, data: '/9j/' }],
  });
  protocol.current().finish = true;
  await expect(surface(page).getByRole('list', { name: '已添加 1 张图片' })).toHaveCount(0, { timeout: 10_000 });
});

test('main TeachBuddy resumes text in a clean session after the vision credential gate', async ({ page, protocol }) => {
  const failedId = protocol.seedVisionFailure();
  await openTeacher(page);
  await page.goto(`${defaultPath}?session=${failedId}`);
  await expect(surface(page).getByText(/当前模型凭据未开通图片理解/).first()).toBeVisible();
  await composer(page).fill('先继续处理纯文本内容');
  await send(page).click();
  await expect.poll(() => protocol.writes('/messages').length).toBe(1);
  expect(protocol.writes('/sessions')).toHaveLength(1);
  const createdId = protocol.write('/messages').path.split('/')[4];
  expect(createdId).toBeTruthy();
  expect(createdId).not.toBe(failedId);
  expect(protocol.write('/messages').body).toMatchObject({ text: '先继续处理纯文本内容', images: [] });
  await expect(page).toHaveURL(new RegExp(`session=${createdId}$`));
});

async function submitFirst(page: Page, protocol: ProtocolMock, scope: RuntimeScope = 'ideal-full') {
  await expect(surface(page).getByText('TeachBuddy 已连接', { exact: true })).toBeVisible();
  await composer(page).fill(firstMessage);
  await send(page).click();
  await expect.poll(() => protocol.writes('/messages').length).toBe(1);
  const id = protocol.current(scope).snapshot.id;
  await expect(page).toHaveURL(new RegExp(`session=${id}$`));
  expect(protocol.writes('/sessions')).toHaveLength(1);
  expect(protocol.write('/sessions').body).toEqual({ scope });
  expect(protocol.write('/messages')).toMatchObject({ path: `/api/teachbuddy/sessions/${id}/messages`, body: { scope, text: firstMessage, commandId: expect.any(String) } });
  expect(protocol.write('/messages').body?.commandId).toMatch(/^[\da-f-]{36}$/i);
  await expect(composer(page)).toHaveValue('');
  await expect(surface(page).getByText(firstMessage, { exact: true })).toHaveCount(1);
  await expect(surface(page).getByText(`${partialMessage}（第 1 轮）`, { exact: true })).toBeVisible();
  await expect(surface(page).getByText('进行中', { exact: true })).toHaveCount(2);
  await expect(send(page)).toBeDisabled();
  return id;
}

async function finishTurn(page: Page, protocol: ProtocolMock, answer: string, scope: RuntimeScope = 'ideal-full') {
  // Keep the running snapshot stable until the browser has observed partial data
  // on two GETs. Completion is delivered by a later poll, never the send POST.
  await expect.poll(() => protocol.current(scope).partialReads, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  const readsBefore = protocol.current(scope).partialReads;
  protocol.current(scope).finish = true;
  await expect(surface(page).getByText(answer, { exact: true })).toBeVisible({ timeout: 10_000 });
  expect(protocol.current(scope).partialReads).toBeGreaterThan(readsBefore);
  await expect(surface(page).getByRole('button', { name: '停止生成' })).toHaveCount(0);
}

async function evidence(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false, animations: 'disabled' });
  await testInfo.attach(name, { path: testInfo.outputPath(`${name}.png`), contentType: 'image/png' });
}

async function assertGeometry(page: Page, controls: Locator = surface(page)) {
  const overflow = await surface(page).evaluate((root) => {
    const bounds = root.getBoundingClientRect();
    const issues: string[] = [];
    if (bounds.width <= 0 || bounds.height <= 0 || bounds.left < -1 || bounds.right > innerWidth + 1 || bounds.top < -1 || bounds.bottom > innerHeight + 1) issues.push(`surface outside viewport: ${JSON.stringify(bounds.toJSON())}`);
    for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none') continue;
      const label = `${element.tagName}.${element.className}: ${element.textContent?.slice(0, 65)}`;
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) issues.push(`${label} exceeds surface horizontally (${rect.left}, ${rect.right})`);
      if (element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1 && style.display !== 'inline' && !(style.textOverflow === 'ellipsis' && style.overflowX === 'hidden')) issues.push(`${label} has horizontal overflow ${element.scrollWidth}/${element.clientWidth}`);
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('document has horizontal overflow');
    return issues;
  });
  expect.soft(overflow, 'Work surface and every rendered descendant must fit horizontally').toEqual([]);
  const inaccessible = await controls.locator('button, a, textarea').evaluateAll((elements) => elements.flatMap((element) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(element).visibility === 'hidden') return [];
    const label = element.getAttribute('aria-label') ?? element.textContent ?? element.tagName;
    if (rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1 || rect.bottom > innerHeight + 1) return [`${label}: outside viewport`];
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return target && (target === element || element.contains(target)) ? [] : [`${label}: obscured or clipped`];
  }));
  expect.soft(inaccessible, 'Visible controls must be reachable, unclipped and unobscured').toEqual([]);
}

test.describe('TeachBuddy browser integration (protocol mock, not live model)', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`create, poll, second turn, restore, review/save/download at ${viewport.width}x${viewport.height}`, async ({ page, protocol }, testInfo) => {
      test.setTimeout(60_000);
      await page.setViewportSize(viewport);
      await openTeacher(page);
      await expect(surface(page).getByRole('heading', { name: '老师好，有什么能帮您的？' })).toBeVisible();
      await expect(surface(page).getByText('当前仅依据您输入的内容，不会自动读取 ClassIn 教学数据。')).toBeVisible();
      await evidence(page, testInfo, `empty-${viewport.width}x${viewport.height}`);
      await assertGeometry(page);
      const id = await submitFirst(page, protocol);
      const messageColumn = surface(page).getByRole('list', { name: '会话消息' });
      const analysis = surface(page).getByRole('region', { name: 'TeachBuddy 分析过程' });
      await expect(analysis.getByRole('button', { name: /正在分析 · 3 个步骤/ })).toHaveAttribute('aria-expanded', 'true');
      await expect(analysis.getByText('生成教学文稿（协议模拟）', { exact: true })).toBeVisible();
      const [messageBox, progressBox] = await Promise.all([messageColumn.boundingBox(), analysis.boundingBox()]);
      expect(messageBox).not.toBeNull();
      expect(progressBox).not.toBeNull();
      expect(Math.abs((messageBox?.x ?? 0) - (progressBox?.x ?? 0))).toBeLessThanOrEqual(1);
      expect(Math.abs((messageBox?.width ?? 0) - (progressBox?.width ?? 0))).toBeLessThanOrEqual(1);
      await evidence(page, testInfo, `partial-${viewport.width}x${viewport.height}`);
      await assertGeometry(page);
      await finishTurn(page, protocol, firstAnswer);
      await expect(analysis.getByRole('button', { name: /已完成分析 · 3 个步骤/ })).toHaveAttribute('aria-expanded', 'false');
      await analysis.getByRole('button', { name: /已完成分析/ }).click();
      await expect(surface(page).getByText('[协议模拟] 教学文稿工具已生成待审阅产物。', { exact: true })).toBeVisible();
      await composer(page).fill(secondMessage);
      await expect(send(page)).toBeEnabled();
      await composer(page).press('Enter');
      await expect.poll(() => protocol.writes('/messages').length).toBe(2);
      expect(protocol.writes('/sessions')).toHaveLength(1);
      expect(protocol.write('/messages', 1)).toMatchObject({ path: `/api/teachbuddy/sessions/${id}/messages`, body: { scope: 'ideal-full', text: secondMessage, commandId: expect.any(String) } });
      expect(protocol.write('/messages', 1).body?.commandId).not.toBe(protocol.write('/messages').body?.commandId);
      await finishTurn(page, protocol, secondAnswer);
      const turnProcesses = surface(page).getByRole('region', { name: 'TeachBuddy 分析过程' });
      await expect(turnProcesses).toHaveCount(2);
      await expect(turnProcesses.last().getByRole('button', { name: /已完成分析 · 2 个步骤 · 0s/ })).toBeVisible();

      const readsBefore = protocol.calls.filter((call) => call.method === 'GET' && call.path.endsWith(`/${id}`)).length;
      await page.reload();
      await expect(surface(page).getByText(secondAnswer, { exact: true })).toBeVisible();
      expect(protocol.calls.filter((call) => call.method === 'GET' && call.path.endsWith(`/${id}`)).length).toBeGreaterThan(readsBefore);
      await expect(surface(page).getByText(firstMessage, { exact: true })).toHaveCount(1);
      await expect(surface(page).getByText(secondMessage, { exact: true })).toHaveCount(1);
      await expect(surface(page).getByText(firstAnswer, { exact: true })).toHaveCount(1);
      expect(protocol.writes('/sessions')).toHaveLength(1);
      expect(protocol.writes('/messages')).toHaveLength(2);
      await surface(page).getByRole('button', { name: '历史会话', exact: true }).click();
      const history = surface(page).getByRole('complementary', { name: '历史会话' });
      await expect(history.getByRole('link', { name: /协议模拟：动量守恒教案/ })).toHaveAttribute('aria-current', 'page');
      await surface(page).getByRole('button', { name: '历史会话', exact: true }).click();
      await surface(page).getByRole('button', { name: `${artifact.title} v1 · 待审阅`, exact: true }).click();
      const review = surface(page).getByRole('complementary', { name: '审阅产物' });
      await expect(review.locator('pre')).toHaveText(artifact.content);
      await expect(review).toContainText('不代表 ClassIn 正式发布');
      expect(protocol.writes('/approve')).toHaveLength(0);
      await evidence(page, testInfo, `review-${viewport.width}x${viewport.height}`);
      await assertGeometry(page, review);
      await review.getByRole('button', { name: '确认并保存到本机' }).click();
      await expect(review).toContainText('本机保存回执：protocol-receipt-1');
      await expect(review.getByRole('button', { name: '已保存', exact: true })).toBeDisabled();
      expect(protocol.writes('/approve')).toHaveLength(1);
      expect(protocol.write('/approve')).toMatchObject({ path: `/api/teachbuddy/sessions/${id}/artifacts/${artifact.id}/approve`, body: { scope: 'ideal-full', version: 1, commandId: expect.any(String) } });
      const downloadPromise = page.waitForEvent('download');
      await review.getByRole('button', { name: '下载 MD' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(artifact.fileName);
      await evidence(page, testInfo, `saved-${viewport.width}x${viewport.height}`);
      await assertGeometry(page, review);
      await page.reload();
      await surface(page).getByRole('button', { name: `${artifact.title} v1 · 已保存到本机`, exact: true }).click();
      await expect(review).toContainText('本机保存回执：protocol-receipt-1');
      expect(protocol.writes('/approve')).toHaveLength(1);

      await page.goto('/teacher/ai-agent/files');
      await expect(page.getByRole('region', { name: '我的文件' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '协议模拟：动量守恒教案' })).toBeVisible();
      await expect(page.getByText(artifact.fileName, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: `查看${artifact.fileName}` }).click();
      const fileDetail = page.getByRole('complementary', { name: `${artifact.fileName}文件详情` });
      await expect(fileDetail.locator('pre')).toContainText('# 动量守恒教案');
      await expect(fileDetail).toContainText('已确认保存');
      const libraryDownloadPromise = page.waitForEvent('download');
      await fileDetail.getByRole('button', { name: '下载' }).click();
      expect((await libraryDownloadPromise).suggestedFilename()).toBe(artifact.fileName);
      await fileDetail.getByRole('button', { name: '回到任务' }).click();
      await expect(page).toHaveURL(new RegExp(`/teacher/ai-agent/new\\?session=${id}$`));
      await expect(surface(page).getByText(secondAnswer, { exact: true })).toBeVisible();
    });
  }

  test('explicit Stop invokes the cancel endpoint and permits a follow-up', async ({ page, protocol }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTeacher(page);
    const id = await submitFirst(page, protocol);
    expect(protocol.writes('/cancel')).toHaveLength(0);
    await surface(page).getByRole('button', { name: '停止生成' }).click();
    await expect.poll(() => protocol.writes('/cancel').length).toBe(1);
    expect(protocol.write('/cancel')).toMatchObject({ path: `/api/teachbuddy/sessions/${id}/cancel`, body: { scope: 'ideal-full' } });
    await expect(surface(page).getByText('生成已停止，您可以继续发送要求。')).toBeVisible();
    expect(protocol.current().snapshot.status).toBe('stopped');
    await expect(surface(page).getByRole('button', { name: '停止生成' })).toHaveCount(0);
    await composer(page).fill(secondMessage);
    await send(page).click();
    await expect.poll(() => protocol.writes('/messages').length).toBe(2);
    expect(protocol.writes('/sessions')).toHaveLength(1);
    await finishTurn(page, protocol, secondAnswer);
    expect(protocol.writes('/cancel')).toHaveLength(1);
  });

  for (const condition of ['offline', 'missing-key'] as const) {
    test(`${condition} blocks create/send, preserves the draft and reconnects`, async ({ page, protocol }) => {
      protocol.offline = condition === 'offline';
      if (condition === 'missing-key') protocol.health = { status: 'unconfigured', message: '[协议模拟] 未配置模型凭据。' };
      await openTeacher(page);
      await expect(surface(page).getByText(condition === 'offline' ? 'TeachBuddy 暂时离线' : '服务尚未配置模型凭据，请联系本机服务管理员。', { exact: true })).toBeVisible();
      await composer(page).fill(firstMessage);
      await expect(send(page)).toBeDisabled();
      await expect(surface(page).getByRole('button', { name: '新建会话' })).toBeDisabled();
      await composer(page).press('Enter');
      await expect(composer(page)).toHaveValue(firstMessage);
      expect(protocol.calls.filter((call) => call.method === 'POST')).toEqual([]);
      await expect(surface(page).getByRole('list', { name: '会话消息' })).toHaveCount(0);
      protocol.offline = false;
      protocol.health = { status: 'ready', message: 'Protocol mock recovery; no live model.' };
      await surface(page).getByRole('button', { name: '重新连接' }).click();
      await expect(send(page)).toBeEnabled();
      expect(protocol.calls.filter((call) => call.method === 'POST')).toEqual([]);
      await send(page).click();
      await expect.poll(() => protocol.writes('/messages').length).toBe(1);
      expect(protocol.write('/messages').body?.text).toBe(firstMessage);
    });
  }

  test('direct class route uses classin-mvp scope and restores only its own history', async ({ page, protocol }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openTeacher(page);
    const globalId = await submitFirst(page, protocol);
    await page.goto(classPath);
    await expect(surface(page)).toBeVisible();
    await expect(surface(page).getByText('TeachBuddy 已连接', { exact: true })).toBeVisible();
    await surface(page).getByRole('button', { name: '历史会话', exact: true }).click();
    const history = surface(page).getByRole('complementary', { name: '历史会话' });
    await expect(history.getByText('还没有会话')).toBeVisible();
    await expect(history.getByRole('link')).toHaveCount(0);
    expect(protocol.writes('/cancel')).toHaveLength(0);
    await surface(page).getByRole('button', { name: '历史会话', exact: true }).click();
    await composer(page).fill(firstMessage);
    await send(page).click();
    await expect.poll(() => protocol.writes('/messages').length).toBe(2);
    const id = protocol.current('classin-mvp').snapshot.id;
    expect(id).not.toBe(globalId);
    expect(protocol.write('/sessions', 1).body).toEqual({ scope: 'classin-mvp' });
    expect(protocol.write('/messages', 1)).toMatchObject({ path: `/api/teachbuddy/sessions/${id}/messages`, body: { scope: 'classin-mvp', text: firstMessage } });
    await expect(page).toHaveURL(`${new URL(classPath, page.url())}?session=${id}`);
    await finishTurn(page, protocol, firstAnswer, 'classin-mvp');
    await page.reload();
    await expect(surface(page).getByText(firstAnswer, { exact: true })).toBeVisible();
    await surface(page).getByRole('button', { name: '历史会话', exact: true }).click();
    await expect(history.getByRole('link')).toHaveCount(1);
    await expect(history.getByRole('link')).toHaveAttribute('href', `${classPath}?session=${id}`);
    expect(protocol.calls.filter((call) => call.path.includes(`/${id}`)).every((call) => call.scope === 'classin-mvp')).toBe(true);
    expect(protocol.writes('/cancel')).toHaveLength(0);
  });

  test('standalone TeachBuddy uses the shared analysis process with its isolated scope', async ({ page, protocol }) => {
    await page.goto('/teachbuddy/register');
    await page.getByLabel('教师称呼').fill('分析验收老师');
    await page.getByLabel('邮箱').fill('analysis.acceptance@example.com');
    await page.getByLabel('密码').fill('teaching88');
    await page.getByRole('button', { name: '注册并免费开始' }).click();
    await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
    await expect(page.getByTestId('standalone-workbuddy-shell')).toBeVisible();
    await submitFirst(page, protocol, 'standalone-teacher');
    await expect(surface(page).getByRole('region', { name: 'TeachBuddy 分析过程' })).toBeVisible();
    expect(protocol.write('/sessions').body).toEqual({ scope: 'standalone-teacher' });
  });

  for (const destination of [
    { path: defaultPath, label: /^返回 ClassIn$/, href: '/teacher', finalPath: '/teacher/home' },
    { path: classPath, label: /^返回/, href: '/teacher/classes/physics-3', finalPath: '/teacher/classes/physics-3' },
  ]) {
    test(`mobile return navigates to ${destination.href}`, async ({ page, protocol }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openTeacher(page, destination.path);
      const back = surface(page).getByRole('link', { name: destination.label });
      await expect(back).toBeVisible();
      await expect(back).toHaveAttribute('href', destination.href);
      await assertGeometry(page);
      await back.click();
      await expect(page).toHaveURL(new RegExp(`${destination.finalPath}$`));
      await expect(surface(page)).toHaveCount(0);
      expect(protocol.calls.filter((call) => call.method === 'POST')).toEqual([]);
    });
  }
});
