import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test('legacy standalone URL redirects to the branded TeachBuddy URL', async ({ page }) => {
  await page.goto('/workbuddy#classin');
  await expect(page).toHaveURL(/\/teachbuddy#classin$/);
  await expect(page.getByRole('heading', { level: 1, name: /把教学想法.*可以直接审阅的成果/ })).toBeVisible();
});

async function registerStandaloneTeacher(page: Page) {
  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('林老师');
  await page.getByLabel('邮箱').fill('lin.standalone@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/teachbuddy');
  await page.evaluate(() => localStorage.clear());
});

test('standalone teacher registers and enters the real isolated task workspace @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/teachbuddy');
  await expect(page.getByRole('heading', { level: 1, name: '把教学想法，变成 可以直接审阅的成果' })).toBeVisible();
  await page.getByRole('link', { name: '免费开始', exact: true }).first().click();
  await page.getByLabel('教师称呼').fill('林老师');
  await page.getByLabel('邮箱').fill('lin.standalone@example.com');
  await page.getByLabel('密码').fill('teaching88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();

  await expect(page.getByTestId('standalone-workbuddy-shell')).toBeVisible();
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  await expect(page.getByText('未连接 ClassIn', { exact: true })).toBeVisible();
  await expect(page.getByText(/模拟|仿真/)).toHaveCount(0);
  await expect(page.getByRole('link', { name: '内容资源' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);

  await page.getByRole('link', { name: '了解连接价值' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '现在可以开始，连接 ClassIn 后更省一步' })).toBeVisible();
  await expect(page.getByText('当前：独立使用')).toBeVisible();
  await expect(page.getByText('[未来] 连接 ClassIn')).toBeVisible();
  await expect(page.getByRole('link', { name: /了解 ClassIn/ })).toHaveAttribute('href', 'https://www.classin.com/');
  await page.getByRole('link', { name: '先创建一个任务' }).click();

  const composer = page.getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await expect(composer).toBeVisible();
  await composer.fill('为明天的函数单调性课准备一份课堂提纲');
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '创建任务' })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('region', { name: 'TeachBuddy 对话工作台' })).toBeVisible();
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('standalone membership grants points once and keeps a persistent ledger @a11y', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '会员方案' }).click();
  await page.getByRole('button', { name: '选择方案' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('会员订单');
  await expect(dialog).not.toContainText(/模拟|仿真/);
  await dialog.getByRole('button', { name: '确认开通' }).click();
  await expect(page.getByRole('status')).toContainText('已到账 1500 AI 点数');
  await expect(page.getByRole('link', { name: /AI 点数 1860/ })).toBeVisible();

  await page.getByRole('link', { name: /AI 点数 1860/ }).click();
  await expect(page.getByRole('region', { name: '点数流水' })).toContainText('会员点数到账');
  await expect(page.getByRole('region', { name: '点数流水' })).toContainText('新用户体验点数');
  await page.reload();
  await expect(page.getByText('1860', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('会员点数到账')).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
});

test('standalone content resources stay inside the consumer product boundary', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '内容资源' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/content$/);
  await expect(page.getByRole('heading', { level: 1, name: '内容资源' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);
  await expect(page.getByText('独立个人内容库', { exact: true })).toBeVisible();
  await expect(page.getByText(/模拟|仿真/)).toHaveCount(0);
  await expect(page.getByText('机构内容库')).toHaveCount(0);
  await expect(page.locator('a[href^="/teacher"]')).toHaveCount(0);

  await page.getByRole('button', { name: '查看函数单调性精品教案' }).click();
  await page.getByRole('button', { name: '改编到新任务' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);

  await page.goto('/teachbuddy/app/content');
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('个人机械波演示课件');
  await page.getByLabel('作品简介').fill('用于个人复习课的机械波演示。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('status')).toContainText('作品已保存到个人内容库');
  await expect(page.getByRole('button', { name: '查看个人机械波演示课件' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '查看个人机械波演示课件' })).toBeVisible();
});

test('legacy standalone mock task links return to the real blank task', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.goto('/teachbuddy/app/runs/run-quiz-activity-1');
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  await expect(page.getByRole('textbox', { name: '向 TeachBuddy 输入要求' })).toHaveValue('');
  await expect(page.getByRole('button', { name: '确认以上要求并生成' })).toHaveCount(0);
});

test('standalone accounts keep capability data and workspace sessions isolated', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByLabel('向 TeachBuddy 输入要求').fill('第一位老师的私有任务草稿');
  await page.getByRole('link', { name: '技能市场' }).click();
  await expect(page.locator('main[data-surface="skills"]')).not.toContainText(/ClassIn|机构推荐|班级|教研组/);
  await page.getByRole('link', { name: '内容资源' }).click();
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('第一位老师的私有课件');
  await page.getByLabel('作品简介').fill('只属于第一位老师的个人内容。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('button', { name: '查看第一位老师的私有课件' })).toBeVisible();
  await page.getByRole('button', { name: '退出登录' }).click();

  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('周老师');
  await page.getByLabel('邮箱').fill('zhou.standalone@example.com');
  await page.getByLabel('密码').fill('teaching99');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
  await expect(page.getByLabel('向 TeachBuddy 输入要求')).toHaveValue('');
  await expect(page.getByText('第一位老师的私有任务草稿')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /AI 点数 360/ })).toBeVisible();
  await page.getByRole('link', { name: '内容资源' }).click();
  await expect(page.getByRole('button', { name: '查看第一位老师的私有课件' })).toHaveCount(0);
  await page.getByRole('button', { name: '发布作品' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByLabel('作品标题').fill('第二位老师的私有课件');
  await page.getByLabel('作品简介').fill('验证第二个账号可以独立发布。');
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '保存到个人内容库' }).click();
  await expect(page.getByRole('button', { name: '查看第二位老师的私有课件' })).toBeVisible();
});

test('standalone personal files expose only local product actions', async ({ page }) => {
  await registerStandaloneTeacher(page);
  await page.getByRole('link', { name: '我的文件' }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/files$/);
  await expect(page.locator('a[href^="/teacher"]')).toHaveCount(0);
  await expect(page.getByText(/TeacherIn|组织云盘|教研组/)).toHaveCount(0);

  await page.getByRole('button', { name: '查看函数单调性智能课件.pptx' }).click();
  await expect(page.getByRole('heading', { level: 3, name: '个人文件库' })).toBeVisible();
  await expect(page.getByRole('button', { name: '复制分享链接' })).toBeVisible();
  await expect(page.getByRole('button', { name: '在空间中定位' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /TeacherIn/ })).toHaveCount(0);
  await page.getByRole('button', { name: '作为上下文', exact: true }).click();
  await expect(page).toHaveURL(/\/teachbuddy\/app\/new$/);
});

test('signed-out teachers cannot enter standalone app routes', async ({ page }) => {
  await page.goto('/teachbuddy/app/credits');
  await expect(page).toHaveURL(/\/teachbuddy\/login\?next=%2Fteachbuddy%2Fapp%2Fcredits$/);
  await expect(page.getByRole('heading', { level: 1, name: '欢迎回到 TeachBuddy' })).toBeVisible();
});
