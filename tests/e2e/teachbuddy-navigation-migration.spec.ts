import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const labels = ['我的任务', '技能市场', 'AgentIn', '我的文件', '工具连接', '定时任务'];
const market = (page: Page) => page.getByRole('region', { name: 'AgentIn 智能体市场', exact: true });
const runtime = (page: Page) => page.getByRole('region', { name: 'TeachBuddy 对话工作台', exact: true });
const secondary = (page: Page) => page.getByRole('group', { name: 'TeachBuddy 二级导航', exact: true });

test.beforeEach(async ({ page }) => {
  // Navigation tests never invoke the live model or write to the local runtime.
  await page.route('**/api/teachbuddy/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().method()).toBe('GET');
    expect(['/api/teachbuddy/health', '/api/teachbuddy/sessions', '/api/teachbuddy/files']).toContain(path);
    await route.fulfill({ json: path.endsWith('/health') ? { status: 'ready', message: 'Protocol mock' } : [] });
  });
});

async function teacher(page: Page, path?: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /老师视角/ }).click();
  if (path) await page.goto(path);
}

test('primary disclosure keeps the URL and draft while My Tasks opens the real workbench', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 768 });
  await teacher(page);
  const original = page.url();
  const toggle = page.getByRole('button', { name: 'TeachBuddy', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page).toHaveURL(original);
  await expect(secondary(page).getByRole('link')).toHaveText(labels);
  await expect.poll(() => page.locator('aside[data-contextual-navigation="true"]').evaluate((node) => node.getBoundingClientRect().width)).toBe(220);
  await secondary(page).getByRole('link', { name: '我的任务', exact: true }).click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(runtime(page)).toBeVisible();
  await expect(secondary(page).getByRole('link', { name: '我的任务', exact: true })).toHaveAttribute('aria-current', 'page');
  const input = runtime(page).getByRole('textbox', { name: '向 TeachBuddy 输入要求' });
  await input.fill('导航展开不得清除这个未提交输入');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(secondary(page)).toHaveCount(0);
  await expect(input).toHaveValue('导航展开不得清除这个未提交输入');
  await toggle.click();
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(input).toHaveValue('导航展开不得清除这个未提交输入');
  await page.goto('/teacher/ai-agent/runs/run-geometry');
  await expect(page).toHaveURL(/\/teacher\/ai-agent\/new$/);
  await expect(runtime(page)).toBeVisible();
  await expect(secondary(page).getByRole('link', { name: '我的任务', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('AgentIn supports local search, recovery, recommendations and explicit unavailable feedback @a11y', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await teacher(page, '/teacher/ai-agent/agentin');
  await expect(secondary(page).getByRole('link', { name: 'AgentIn', exact: true })).toHaveAttribute('aria-current', 'page');
  const recommendations = market(page).getByRole('region', { name: '猜你喜欢' });
  await expect(recommendations.getByRole('button').nth(1)).toHaveAttribute('aria-label', '查看智能体 每日名言');
  await market(page).getByRole('button', { name: '换一换' }).click();
  await expect(recommendations.getByRole('button').nth(1)).toHaveAttribute('aria-label', '查看智能体 成语溯源与应用专家');
  const input = market(page).getByRole('searchbox', { name: '搜索智能体' });
  await input.fill('NOBOOK');
  await expect(market(page).getByRole('button', { name: '查看智能体 NOBOOK', exact: true })).toBeVisible();
  await market(page).getByRole('button', { name: '查看智能体 NOBOOK', exact: true }).click();
  await expect(market(page).getByText('“NOBOOK”当前场景不支持添加。')).toBeVisible();
  await input.fill('没有这个智能体');
  await expect(market(page).getByText('没有找到相关智能体')).toBeVisible();
  await market(page).getByRole('button', { name: '清空搜索条件' }).click();
  await expect(input).toHaveValue('');
  await market(page).getByRole('button', { name: '收起 AgentIn 导航' }).click();
  await expect(market(page).getByRole('button', { name: '首页', exact: true })).toBeVisible();
  await market(page).getByRole('button', { name: '我创建的', exact: true }).click();
  await expect(market(page).getByText('“我创建的”暂未开放。')).toBeVisible();
  await market(page).getByRole('button', { name: '关闭提示' }).click();
  await market(page).getByRole('button', { name: '展开 AgentIn 导航' }).click();
  await expect.poll(() => market(page).locator('img').evaluateAll((images) => images.every((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const result = await new AxeBuilder({ page }).include('[aria-label="AgentIn 智能体市场"]').analyze();
  expect(result.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await page.reload();
  await expect(market(page)).toBeVisible();
});

test('class entry has six destinations and retains its course, return path and existing Demo controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await teacher(page, '/teacher/classes/physics-3?course=course-momentum');
  await page.getByRole('button', { name: '打开 TeachBuddy' }).click();
  const nav = page.getByRole('navigation', { name: 'TeachBuddy 导航', exact: true });
  await expect(nav.getByRole('link')).toHaveText(labels);
  await expect(page.getByRole('navigation', { name: '老师视角主导航' })).toHaveCount(0);
  await expect(runtime(page)).toBeVisible();
  const base = '/teacher/classes/physics-3/workbuddy';
  for (const [label, section] of [['技能市场', 'skills'], ['AgentIn', 'agentin'], ['我的文件', 'files'], ['工具连接', 'tools'], ['定时任务', 'schedules']]) {
    const link = nav.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', `${base}/${section}?course=course-momentum`);
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: '返回高二物理 3 班', exact: true }).first()).toHaveAttribute('href', '/teacher/classes/physics-3?course=course-momentum');
    if (section === 'agentin') await expect(market(page)).toBeVisible();
    if (section === 'tools') {
      const github = page.locator('article').filter({ hasText: 'GitHub 平台集成：仓库、Issues、PR、Actions 管理' });
      await github.getByRole('button', { name: '安装', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '安装GitHub' });
      await expect(dialog.getByRole('textbox', { name: '命令', exact: true })).toHaveValue('npx');
      await dialog.getByRole('button', { name: '安装', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('GitHub 已安装');
    }
    if (section === 'schedules') {
      await page.getByRole('checkbox', { name: '开课前 10 分钟提醒老师上课停用' }).click();
      await expect(page.getByText('已停用', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: '开课前 10 分钟提醒老师上课更多操作' }).click();
      await page.getByRole('menuitem', { name: '立即运行' }).click();
      await expect(page.getByRole('table', { name: '定时任务运行历史' })).toContainText('运行中');
    }
  }
  await page.goto(`${base}/settings?course=course-momentum`);
  await expect(page).toHaveURL(`${base}/new?course=course-momentum`);
  await expect(runtime(page)).toBeVisible();
  await page.getByRole('link', { name: '返回高二物理 3 班', exact: true }).first().click();
  await expect(page).toHaveURL('/teacher/classes/physics-3?course=course-momentum');
});

test('AgentIn stays out of standalone and student product boundaries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /学生视角/ }).click();
  await expect(page.getByRole('button', { name: 'TeachBuddy', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'AgentIn', exact: true })).toHaveCount(0);
  await page.goto('/teachbuddy/register');
  await page.getByLabel('教师称呼').fill('导航验收老师');
  await page.getByLabel('邮箱').fill('navigation.fixture@example.com');
  await page.getByLabel('密码').fill('navigation88');
  await page.getByRole('button', { name: '注册并免费开始' }).click();
  await expect(page.getByRole('link', { name: 'AgentIn', exact: true })).toHaveCount(0);
  await page.goto('/teachbuddy/app/agentin');
  await expect(page).toHaveURL('/teachbuddy/app/new');
  await expect(market(page)).toHaveCount(0);
  await expect(page.getByRole('link', { name: '内容资源', exact: true })).toBeVisible();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 1000, height: 768 }, { width: 390, height: 844 }]) {
  for (const variant of ['ideal', 'class'] as const) {
    test(`AgentIn ${variant} is framed and interactive at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      const path = variant === 'ideal' ? '/teacher/ai-agent/agentin' : '/teacher/classes/physics-3/workbuddy/agentin?course=course-momentum';
      await teacher(page, path);
      await expect(market(page)).toBeVisible();
      const geometry = await market(page).evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width, doc: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      expect(geometry.doc).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.width).toBeGreaterThan(280);
      if (variant === 'ideal' && viewport.width < 832) {
        const switcher = page.getByRole('button', { name: '切换至学生', exact: true });
        const bounds = await switcher.boundingBox();
        expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(64);
      }
      const scroll = page.getByTestId('agentin-market-scroll');
      expect(await scroll.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      await expect.poll(() => market(page).locator('img').evaluateAll((images) => images.every((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`agentin-${variant}-${viewport.width}.png`) });
      await market(page).getByRole('searchbox', { name: '搜索智能体' }).fill('鲁迅');
      await market(page).getByRole('button', { name: '查看智能体 鲁迅', exact: true }).click();
      await expect(market(page).getByText('“鲁迅”的详情与添加流程暂未开放。')).toBeVisible();
      const nav = variant === 'ideal' ? secondary(page) : page.getByRole('navigation', { name: 'TeachBuddy 导航', exact: true });
      for (const label of labels) {
        const link = nav.getByRole('link', { name: label, exact: true });
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeInViewport();
      }
    });
  }
}
