import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ClassInScene } from '../../src/contracts/classin-test';
import { projectCatalog, projectContext, projectDynamics } from '../../src/domain/classin-test/projections';
const scene: ClassInScene = {
  environment: 'classin-test', teacher: { id: 'classin-test:teacher:fixture', name: '测试老师' }, schoolRef: 'classin-test:school:fixture',
  class: { id: 'fixture-class', name: '接口契约测试班' }, course: { id: 'fixture-course', name: '有理数课程' },
  units: [{ id: 'unit-1', name: '第1讲 有理数', count: 1 }], members: [{ id: 'student-1', name: '学生甲', identity: 1 }],
  activities: [{ id: 'activity-1', unitId: 'unit-1', categoryId: 'fixture-course', bizId: 'biz-1', name: '有理数练习', kind: 'homework', published: true, process: 1, startsAt: '2026-09-14T11:30:00Z', endsAt: '2026-09-16T11:30:00Z', summary: { studentTotal: 1, submitTotal: 0 } }],
  capturedAt: '2026-09-15T00:00:00Z', version: 'test-v1', complete: true, capabilities: { ordinaryIm: 'unavailable', realtimeAttendance: 'unverified' },
};
async function enter(page: Page) { await page.addInitScript(() => sessionStorage.setItem('classin.pc.demo.role.v1', 'teacher')); await page.goto('/teacher/classin-test'); }
async function mockReads(page: Page, failInitial = false) {
  let shouldFail = failInitial;
  await page.route('**/api/classin-test/**', async (route) => {
    const url = new URL(route.request().url()); const op = url.pathname.split('/').at(-1);
    if (op === 'scene' && shouldFail) { return route.fulfill({ status: 503, json: { error: { code: 'unauthorized', message: '测试凭据不可用' } } }); }
    const data = op === 'scene' ? scene : op === 'dynamics' ? projectDynamics(scene) : op === 'catalog' ? projectCatalog(scene) : op === 'context' ? projectContext(scene, 'message-draft') : { activity: scene.activities[0], capturedAt: scene.capturedAt, version: 'detail-1', description: '计算 -2+3，并解释符号。', fields: [], resources: [], students: [{ id: 'student-1', name: '学生甲', status: '未提交', grade: null, progress: null, durationSeconds: null }] };
    return route.fulfill({ json: { data } });
  });
  await page.route('**/api/teachbuddy/**', (route) => route.fulfill({ json: { status: 'ready', message: 'Runtime protocol fixture' } }));
  return { reconnect: () => { shouldFail = false; }, disconnect: () => { shouldFail = true; } };
}
test('test connection shows scoped activities, details and explicit unavailable IM @a11y', async ({ page }) => {
  await mockReads(page); await enter(page);
  await expect(page.getByRole('heading', { name: 'ClassIn 测试环境', exact: true })).toBeVisible();
  await expect(page.getByText('真实测试接口', { exact: false })).toBeVisible();
  await expect(page.getByText(/普通 IM 尚未接通；进入班级消息与 Copilot，可在原工作区体验老师端模拟发送/)).toBeVisible();
  await expect(page.getByText('高二物理 3 班')).toHaveCount(0);
  await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await expect(page.getByText('计算 -2+3，并解释符号。')).toBeVisible();
  await expect(page.locator('section[aria-label="教学活动详情"]')).toContainText('未提供或不评分');
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
});
test('failed authentication has retry and never displays mock course data', async ({ page }) => {
  const connection = await mockReads(page, true); await enter(page);
  await expect(page.getByRole('alert')).toHaveText('测试凭据不可用');
  await expect(page.getByText('高二物理 3 班')).toHaveCount(0);
  connection.reconnect();
  await page.getByRole('button', { name: '重新连接' }).click();
  await expect(page.getByRole('button', { name: '刷新真实数据' })).toBeVisible();
});
test('classroom replay metadata distinguishes files, no returned files and failed reads', async ({ page }) => {
  await mockReads(page);
  const lesson = { ...scene.activities[0]!, kind: 'classroom' as const, name: '有理数在线课堂' };
  const classroomScene = { ...scene, activities: [lesson] };
  let state: 'files_returned' | 'empty' | 'unavailable' = 'files_returned';
  await page.route('**/api/classin-test/**', (route) => {
    const op = new URL(route.request().url()).pathname.split('/').at(-1);
    const replay = { state, message: state === 'files_returned' ? '已返回1个录制文件；播放权限尚未验证' : state === 'empty' ? '本次未返回录制文件' : '本次回放结果无法核实', files: state === 'files_returned' ? [{ statusCode: '2', durationSeconds: 1707, startsAt: '2026-09-14T11:46:49Z', endsAt: '2026-09-14T12:15:14Z', createdAt: '2026-09-14T12:20:20Z' }] : [] };
    const data = op === 'scene' ? classroomScene : op === 'catalog' ? projectCatalog(classroomScene) : op === 'dynamics' ? projectDynamics(classroomScene) : { activity: lesson, version: 'replay-' + state, capturedAt: scene.capturedAt, description: '', fields: [], resources: [], students: [], replay };
    return route.fulfill({ json: { data } });
  });
  await enter(page);
  const button = page.locator('section[aria-label="真实课程与教学活动"] button');
  await button.click(); const panel = page.getByRole('region', { name: '课堂回放结果' });
  await expect(panel).toContainText('1707 秒'); await expect(panel).toContainText('19:46:49'); await expect(panel.getByRole('button')).toHaveCount(0);
  state = 'empty'; await button.click(); await expect(panel).toContainText('本次未返回录制文件'); await expect(panel).not.toContainText('1707');
  state = 'unavailable'; await button.click(); await expect(panel).toContainText('本次回放结果无法核实'); await expect(panel).not.toContainText('未返回录制文件');
});
test('replay failures can retry and closing releases the media element', async ({ page }) => {
  await mockReads(page);
  await page.route('**/api/classin-test/detail?**', (route) => route.fulfill({ json: { data: {
    activity: { ...scene.activities[0], kind: 'classroom' }, version: 'replay', capturedAt: scene.capturedAt, description: '', fields: [], resources: [], students: [],
    replay: { state: 'files_returned', message: '已返回录制文件', files: [{ statusCode: '2', durationSeconds: 1707, startsAt: null, endsAt: null, createdAt: null, playbackRef: 'a'.repeat(64) }] },
  } } }));
  let requests = 0;
  await page.route('**/api/classin-test/replay-resource?**', (route) => { requests++; return route.fulfill({ status: 503, json: { error: { code: 'upstream_error', message: '读取未完成' } } }); });
  await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  const panel = page.getByRole('region', { name: '课堂回放结果' });
  expect(requests).toBe(0); await panel.getByRole('button', { name: '读取课堂回放', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('回放未能打开'); await expect(panel.locator('video')).toHaveCount(0);
  await panel.getByRole('button', { name: '重试课堂回放' }).click();
  await expect.poll(() => requests).toBe(2); await expect(panel.getByRole('alert')).toBeVisible();
  let release!: () => void; const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/classin-test/replay-resource?**', async (route) => { await pending; await route.abort().catch(() => {}); });
  await panel.getByRole('button', { name: '重试课堂回放' }).click();
  // Closing remains reachable during permission/network loading, without waiting for a media result.
  await panel.getByRole('button', { name: '关闭课堂回放' }).click();
  release();
  await expect(panel.locator('video')).toHaveCount(0); await expect(panel.getByRole('button', { name: '读取课堂回放', exact: true })).toBeVisible();
});
test('submitted images load only on request and support retry, original view and close', async ({ page }) => {
  await mockReads(page);
  await page.route('**/api/classin-test/detail?**', (route) => route.fulfill({ json: { data: {
    activity: scene.activities[0], version: 'answer-image', capturedAt: scene.capturedAt, description: '', fields: [], resources: [],
    students: [{ id: 'student-1', name: '学生甲', status: '已提交待批阅', grade: null, progress: null, durationSeconds: null, submission: {
      status: 'available', message: 'AI尚未识别图中答案', text: '已提交', teacherFeedback: '', attachments: [{ kind: 'image', count: 1 }], images: [{ ref: 'a'.repeat(64), name: '答题图片1.png' }],
    } }],
  } } }));
  let requests = 0;
  await page.route('**/api/classin-test/submission-resource?**', (route) => {
    const query = new URL(route.request().url()).searchParams;
    expect(query.get('studentId')).toBe('student-1'); expect(query.get('activityId')).toBe('activity-1');
    requests++;
    return requests === 1 ? route.fulfill({ status: 503, body: '' }) : route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64') });
  });
  await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await page.getByText('查看已提交内容', { exact: true }).click(); expect(requests).toBe(0);
  await page.getByRole('button', { name: '读取答题图片' }).click();
  await expect(page.getByRole('alert')).toContainText('答题图片未能打开');
  await page.getByRole('button', { name: '重试答题图片' }).click();
  const img = page.getByRole('img', { name: '答题图片1.png' });
  await expect(img).toBeVisible(); await expect.poll(() => img.evaluate(i => (i as HTMLImageElement).naturalWidth)).toBe(1);
  await expect(page.getByRole('link', { name: '打开答题原图' })).toHaveAttribute('href', /\/api\/classin-test\/submission-resource\?/);
  await page.getByRole('button', { name: '关闭答题图片' }).click(); await expect(img).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开答题原图' })).toHaveCount(0);
});
test('exam question images are on-demand with failure recovery and no unverified HTML rendering', async ({ page }) => {
  await mockReads(page);
  await page.route('**/api/classin-test/detail?**', (route) => route.fulfill({ json: { data: {
    activity: { ...scene.activities[0], kind: 'exam' }, version: 'question-image', capturedAt: scene.capturedAt, description: '', fields: [], resources: [], students: [],
    questions: [
      { id: 'topic-1', typeCode: 5, content: '', options: [], answers: [], analysis: '', hasImage: true, images: [{ ref: 'a'.repeat(64), name: '题干图片 1' }] },
      { id: 'topic-2', typeCode: 5, content: '', options: [], answers: [], analysis: '', hasImage: true, images: [] },
    ],
  } } }));
  let requests = 0;
  await page.route('**/api/classin-test/question-resource?**', (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('topicId')).toBe('topic-1'); expect(params.get('activityId')).toBe('activity-1');
    requests++;
    return requests === 1 ? route.fulfill({ status: 403, body: '' }) : route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64') });
  });
  await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  expect(requests).toBe(0); await expect(page.getByText('该题图片暂不支持读取，请在 ClassIn 原活动核对。')).toBeVisible();
  await page.getByRole('button', { name: '读取题干图片' }).click();
  await expect(page.getByRole('alert')).toContainText('题干图片未能打开');
  await page.getByRole('button', { name: '重试题干图片' }).click();
  const img = page.getByRole('img', { name: '题干图片 1' });
  await expect.poll(() => img.evaluate(i => (i as HTMLImageElement).naturalWidth)).toBe(1);
  await expect(page.getByRole('link', { name: '打开题干原图' })).toHaveAttribute('href', /\/api\/classin-test\/question-resource\?/);
  await page.getByRole('button', { name: '关闭题干图片' }).click(); await expect(img).toHaveCount(0);
  await expect(page.getByRole('link', { name: '打开题干原图' })).toHaveCount(0);
});
test('compact viewport preserves reachable independent course and assistant areas', async ({ page }) => {
  await page.setViewportSize({ width: 680, height: 900 }); await mockReads(page); await enter(page);
  const input = page.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await input.scrollIntoViewIfNeeded(); await expect(input).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});
test('first visit returns to the test connection after choosing teacher role', async ({ page }) => {
  await mockReads(page); await page.goto('/teacher/classin-test');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await expect(page).toHaveURL(/\/teacher\/classin-test$/);
  await expect(page.getByRole('button', { name: '刷新真实数据' })).toBeVisible();
});

test('refresh failure retains teacher input and labels the previous snapshot', async ({ page }) => {
  const connection = await mockReads(page); await enter(page);
  const input = page.getByRole('textbox', { name: '向 AI 消息助手输入要求' });
  await input.fill('请帮我整理提醒'); connection.disconnect();
  await page.getByRole('button', { name: '刷新真实数据' }).click();
  await expect(page.getByRole('alert')).toContainText('当前保留上次数据');
  await expect(input).toHaveValue('请帮我整理提醒');
  await expect(page.getByRole('heading', { name: '有理数课程', exact: true })).toBeVisible();
});

test('refresh updates the open homework detail even when the scene version is unchanged', async ({ page }) => {
  await mockReads(page); let reads = 0;
  await page.route('**/api/classin-test/detail?**', (route) => {
    reads++;
    return route.fulfill({ json: { data: { activity: scene.activities[0], capturedAt: scene.capturedAt, version: `detail-${reads}`, description: reads === 1 ? '更新前的作业详情' : '更新后的作业详情', fields: [], resources: [], students: [{ id: 'student-1', name: '学生甲', status: reads === 1 ? '未提交' : '已提交待批阅', grade: null, progress: null, durationSeconds: null }] } } });
  });
  await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await expect(page.getByText('更新前的作业详情', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '教学活动详情' }).getByText('未提交', { exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: '向 AI 消息助手输入要求' }); await input.fill('保留这段未发送内容');
  await page.getByRole('button', { name: '刷新真实数据' }).click();
  await expect(page.getByText('更新后的作业详情', { exact: true })).toBeVisible({ timeout: 4000 });
  expect(reads).toBe(2); await expect(page.getByText('更新前的作业详情', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '教学活动详情' }).getByText('已提交待批阅', { exact: true })).toBeVisible();
  await expect(input).toHaveValue('保留这段未发送内容');
});

test('a detail refresh failure removes old results and a click can retry it', async ({ page }) => {
  await mockReads(page); let failed = false;
  await page.route('**/api/classin-test/detail?**', (route) => failed ? route.fulfill({ status: 503, json: { error: { message: '详情暂时不可读' } } }) : route.fulfill({ json: { data: { activity: scene.activities[0], capturedAt: scene.capturedAt, version: 'detail', description: '已读到的答案', fields: [], resources: [], students: [] } } }));
  await enter(page); const item = page.locator('section[aria-label="真实课程与教学活动"] button'); await item.click();
  await expect(page.getByText('已读到的答案', { exact: true })).toBeVisible(); failed = true;
  await page.getByRole('button', { name: '刷新真实数据' }).click();
  await expect(page.getByRole('region', { name: '教学活动详情' })).toContainText('详情暂时不可读');
  await expect(page.getByText('已读到的答案', { exact: true })).toHaveCount(0);
  failed = false; await item.click(); await expect(page.getByText('已读到的答案', { exact: true })).toBeVisible();
});

test('a failed scene refresh retains the previous detail with the stale notice', async ({ page }) => {
  const connection = await mockReads(page); await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await expect(page.getByText('计算 -2+3，并解释符号。')).toBeVisible(); connection.disconnect();
  await page.getByRole('button', { name: '刷新真实数据' }).click();
  await expect(page.getByRole('alert')).toContainText('当前保留上次数据');
  await expect(page.getByText('计算 -2+3，并解释符号。')).toBeVisible();
});

test('a removed activity clears its old detail after refreshing the scene', async ({ page }) => {
  await mockReads(page); await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await expect(page.getByText('计算 -2+3，并解释符号。')).toBeVisible();
  await page.route('**/api/classin-test/scene?**', (route) => route.fulfill({ json: { data: { ...scene, activities: [], units: [], version: 'removed' } } }));
  await page.getByRole('button', { name: '刷新真实数据' }).click();
  await expect(page.getByRole('region', { name: '教学活动详情' })).toContainText('该活动已不在当前课程范围中');
  await expect(page.getByText('计算 -2+3，并解释符号。')).toHaveCount(0);
});

test('a late refreshed detail cannot replace another activity selected in the meantime', async ({ page }) => {
  await mockReads(page);
  const other = { ...scene.activities[0]!, id: 'activity-2', name: '另一份作业' };
  await page.route('**/api/classin-test/scene?**', (route) => route.fulfill({ json: { data: { ...scene, activities: [...scene.activities, other] } } }));
  let count = 0; let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/classin-test/detail?**', async (route) => {
    const second = new URL(route.request().url()).searchParams.get('activityId') === other.id;
    if (!second && ++count === 2) await gate;
    await route.fulfill({ json: { data: { activity: second ? other : scene.activities[0], capturedAt: scene.capturedAt, version: String(count), description: second ? '第二个活动当前详情' : '第一个活动的详情', fields: [], resources: [], students: [] } } });
  });
  await enter(page); const items = page.locator('section[aria-label="真实课程与教学活动"] button'); await items.first().click();
  await expect(page.getByText('第一个活动的详情', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '刷新真实数据' }).click(); await expect.poll(() => count).toBe(2);
  await items.nth(1).click(); await expect(page.getByText('第二个活动当前详情', { exact: true })).toBeVisible();
  const completed = page.waitForResponse((response) => response.url().includes('/detail?') && response.url().includes('activity-1'));
  release(); await completed;
  await expect(page.getByText('第二个活动当前详情', { exact: true })).toBeVisible();
  await expect(page.getByText('第一个活动的详情', { exact: true })).toHaveCount(0);
});

test('exam unused answer slots are readable without displaying an actual zero grade', async ({ page }) => {
  await mockReads(page);
  await page.route('**/api/classin-test/detail?**', (route) => route.fulfill({ json: { data: {
    activity: { ...scene.activities[0], kind: 'exam' }, capturedAt: scene.capturedAt, version: 'exam-detail', description: '测验', fields: [], resources: [],
    students: [{ id: 'student-1', name: '学生甲', status: '未作答', grade: null, progress: null, durationSeconds: null,
      examAnswers: { status: 'available', message: '未参与的空答案和0分占位不是实际成绩。', questions: [{ id: 'topic-1', position: 1, status: '未参与', answers: [], score: null, marking: null, hasMedia: false }] } }],
  } } }));
  await enter(page); await page.locator('section[aria-label="真实课程与教学活动"] button').click();
  await page.getByText('查看测验逐题作答', { exact: true }).click();
  const detail = page.getByRole('region', { name: '教学活动详情' });
  await expect(detail).toContainText('第1题 · 未参与');
  await expect(detail).not.toContainText('得分：0');
  await expect(detail).not.toContainText('学生答案：');
});
