import { expect, test } from '@playwright/test';

async function expectPhysicsTeachingSuggestions(page: import('@playwright/test').Page) {
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar).toBeVisible();
  await expect(sidecar.getByText('10项', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('tab', { name: /课中.*建议 1 条/ })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: /提醒上课：.*动量守恒模型/ })).toBeVisible();
}

test('teacher primary message entry and class chat open the same enriched Copilot scenario', async ({ page }) => {
  const classInRequests: string[] = [];
  // M0 restored connection discovery at the workspace root. Demo teaching
  // suggestions must still avoid real catalog/context/dynamics reads.
  await page.route('**/api/classin-test/scene**', route => route.fulfill({ status: 503, json: { error: { message: '隔离演示班验收：测试连接未启用' } } }));
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith('/api/classin-test/')) classInRequests.push(`${request.method()} ${pathname}`);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await expect(page).toHaveURL(/\/teacher\/messages\?category=class&thread=class-physics-3/);
  await expectPhysicsTeachingSuggestions(page);
  await expect(page.getByText(/选一条建议，AI写消息，您确认后发送/)).toBeVisible();
  expect(classInRequests.filter(request => request !== 'GET /api/classin-test/scene')).toEqual([]);

  await page.goto('/teacher/classes/physics-3/chat');
  await expectPhysicsTeachingSuggestions(page);
  expect(classInRequests.filter(request => request !== 'GET /api/classin-test/scene')).toEqual([]);
});
