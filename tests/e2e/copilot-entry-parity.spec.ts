import { expect, test } from '@playwright/test';

async function expectPhysicsTeachingSuggestions(page: import('@playwright/test').Page) {
  const sidecar = page.getByRole('complementary', { name: 'AI 消息助手私密协作窗口' });
  await expect(sidecar).toBeVisible();
  await expect(sidecar.getByText('10 项建议', { exact: true })).toBeVisible();
  await expect(sidecar.getByRole('tab', { name: /课中.*建议 1 条/ })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: /提醒上课：.*动量守恒模型/ })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '添加图片' })).toBeVisible();
  await expect(sidecar.getByRole('button', { name: '打开教学协作' })).toHaveCount(0);
  await expect(sidecar.getByText(/可直接说你想提醒谁/)).toHaveCount(0);
}

test('teacher primary message entry and class chat open the same enriched Copilot scenario', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.getByRole('link', { name: /消息/ }).click();

  await expect(page).toHaveURL(/\/teacher\/messages\?category=class&thread=class-physics-3/);
  await expectPhysicsTeachingSuggestions(page);

  await page.goto('/teacher/classes/physics-3/chat');
  await expectPhysicsTeachingSuggestions(page);
});
