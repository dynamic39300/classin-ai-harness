import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function enterTeacherMessages(page: import('@playwright/test').Page, path: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  await page.goto(path);
}

test('teacher recovers a failed message in place and sees governance events @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await enterTeacherMessages(page, '/teacher/messages?category=class&thread=class-physics-1');

  const failedMessage = page.locator('[data-message-id="cp1-failed-delivery"]');
  await expect(failedMessage).toContainText('消息发送失败，请稍后重试。');
  await failedMessage.getByRole('button', { name: '重新发送' }).click();
  await expect(failedMessage).toContainText('3 人已读');
  await expect(page.locator('[data-message-id="cp1-failed-delivery"]')).toHaveCount(1);

  await page.goto('/teacher/messages?category=class&thread=class-physics-3');
  const classConversation = page.getByRole('region', { name: '高二物理 3 班会话' });
  await expect(classConversation.getByText('周然加入班级')).toBeVisible();
  await expect(classConversation.getByText('班级名称已更新为“高二物理 3 班”')).toBeVisible();

  await page.goto('/teacher/messages?category=direct&thread=direct-teacher-zhang');
  await expect(page.getByRole('region', { name: '张老师会话' }).getByText('你已添加张老师为好友，现在可以开始聊天了。')).toBeVisible();

  const scan = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(scan.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('completed class keeps history, files and profile while write actions stay closed', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await enterTeacherMessages(page, '/teacher/messages?category=class&thread=class-history-physics');

  const conversation = page.getByRole('region', { name: '高一物理基础班会话' });
  await expect(conversation.getByText(/班级已结课，历史消息/)).toBeVisible();
  await expect(conversation.getByRole('textbox', { name: '输入消息' })).toHaveCount(0);
  await conversation.getByRole('button', { name: '加载更早消息' }).click();
  await expect(conversation.getByText('第一章复习提纲已上传到群文件。')).toBeVisible();
  await expect(conversation.getByText('已显示全部历史消息')).toBeVisible();

  await conversation.getByRole('button', { name: '查找会话资源' }).click();
  const files = page.getByRole('complementary', { name: '群文件' });
  await expect(files.getByText('高一物理基础复习提纲.pdf')).toBeVisible();
  await files.getByRole('button', { name: '关闭会话资源' }).click();

  await conversation.getByRole('button', { name: '会话管理' }).click();
  await page.getByRole('menuitem', { name: '群资料' }).click();
  const profile = page.getByRole('complementary', { name: '群资料' });
  await expect(profile.getByRole('heading', { name: '高一物理基础班' })).toBeVisible();
  await expect(profile.getByText(/班级已结课，历史消息/)).toBeVisible();
  await expect(profile.getByText('26 人', { exact: true })).toBeVisible();

  const scan = await new AxeBuilder({ page }).include('#main-content').analyze();
  expect(scan.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);

  await page.goto('/select-role');
  await page.evaluate(() => window.sessionStorage.clear());
  await page.goto('/select-role');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await page.goto('/student/messages?category=class&thread=class-history-physics');
  const studentConversation = page.getByRole('region', { name: '高一物理基础班会话' });
  await expect(studentConversation.getByText(/你已退出该班级/)).toBeVisible();
  await expect(studentConversation.getByRole('textbox', { name: '输入消息' })).toHaveCount(0);
});
