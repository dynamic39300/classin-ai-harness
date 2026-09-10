import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('teacher uses class-scoped group files and the temporary group profile @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto('/teacher/messages?category=class&thread=class-physics-3');

  const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await conversation.getByRole('button', { name: '添加附件' }).click();
  await conversation.getByRole('button', { name: '文件', exact: true }).click();
  const files = page.getByRole('complementary', { name: '群文件' });
  await expect(files.getByText(/高二物理 3 班 · 当前范围/)).toBeVisible();
  await expect(files.getByText('动量守恒课堂练习单.pdf')).toBeVisible();
  await expect(files.getByText('阅读定位训练单.pdf')).toHaveCount(0);
  const worksheet = files.getByText('动量守恒课堂练习单.pdf').locator('..').locator('..');
  await worksheet.getByRole('button', { name: '引用' }).click();
  await expect(worksheet.getByRole('button', { name: '已引用' })).toHaveAttribute('aria-pressed', 'true');
  await files.getByRole('button', { name: '关闭会话资源' }).click();
  await expect(conversation.getByText('动量守恒课堂练习单.pdf', { exact: true })).toBeVisible();
  await conversation.getByRole('button', { name: '发送', exact: true }).click();
  await expect(conversation.getByText('PDF · 1.8 MB · SIMULATED')).toBeVisible();

  const menuTrigger = conversation.getByRole('button', { name: '会话管理' });
  await menuTrigger.click();
  await page.getByRole('menuitem', { name: '群资料' }).click();
  const profile = page.getByRole('complementary', { name: '群资料' });
  await expect(profile.getByText('班级号 PHY2303')).toBeVisible();
  await expect(profile.getByText('4 位可见 / 30 人')).toBeVisible();
  await expect(profile.getByText('课前练习单提醒')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(profile).toHaveCount(0);
  await expect(menuTrigger).toBeFocused();

  const scan = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(scan.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('student can inspect group facts in a narrow viewport without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.goto('/student/messages?category=class&thread=class-physics-3');

  const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await conversation.getByRole('button', { name: '班级会话操作' }).click();
  await page.getByRole('menuitem', { name: '群资料' }).click();
  const profile = page.getByRole('complementary', { name: '群资料' });
  await expect(profile.getByText('班级号 PHY2303')).toBeVisible();
  await expect(profile.getByText('学生', { exact: true })).toBeVisible();
  await expect(profile.getByRole('button', { name: '进入班级' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('compact teacher layout keeps conversation utilities reachable above the TeachBuddy overlay', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto('/teacher/messages?category=class&thread=class-physics-3');
  const conversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await conversation.getByRole('button', { name: '会话管理' }).click();
  await page.getByRole('menuitem', { name: '群资料' }).click();
  await expect(page.getByRole('complementary', { name: '群资料' })).toBeVisible();
});
