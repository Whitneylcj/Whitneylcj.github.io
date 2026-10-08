import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Opt in against the combined Astro production build, not the child Vite app.
const homepage = process.env.CAG_HOMEPAGE_URL;
const paperTitle = 'Learning Deployable Causal Action Geometry under Temporal Non-Stationarity';
const messages = new WeakMap<Page, { errors: string[]; failedResponses: string[] }>();

test.beforeEach(async ({ page }) => {
  const captured = { errors: [] as string[], failedResponses: [] as string[] };
  messages.set(page, captured);
  page.on('pageerror', error => captured.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') captured.errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) captured.failedResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async () => { throw new Error('Use the manual sharing UI in this test'); } } });
  });
});

test.afterEach(async ({ page }) => {
  if (!messages.has(page)) return;
  expect(messages.get(page)!.errors, 'Homepage entry and experiment must not emit browser errors').toEqual([]);
  expect(messages.get(page)!.failedResponses, 'Combined static assets must load without HTTP failures').toEqual([]);
});

async function actions(page: Page, pooled = 0.2175) {
  await expect.poll(async () => Number(await page.getByTestId('pooled-action').textContent())).toBeCloseTo(pooled, 4);
  await expect.poll(async () => Number(await page.getByTestId('true-action').textContent())).toBeCloseTo(0.68, 4);
}

async function entry(page: Page, kind: 'desktop' | 'mobile') {
  await page.goto(homepage!);
  const article = page.locator('article.research-entry').filter({
    has: page.getByRole('heading', { name: paperTitle, exact: true, level: 4 }),
  });
  await expect(article).toHaveCount(1);
  await expect(article).toContainText('NeurIPS 2026 · Accepted');
  const button = article.getByRole('link', { name: 'Interactive demo', exact: true });
  await expect(button).toHaveAttribute('href', '/experiments/cag/');
  expect(await button.getAttribute('target')).toBeNull();
  await expect(button).toHaveClass(/research-link-button/);
  await button.scrollIntoViewIfNeeded();
  const size = (await button.boundingBox())!;
  expect(size.height).toBeGreaterThanOrEqual(44);
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect.poll(() => article.locator('img').evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  // Keep the actual article below the sticky header before its review capture.
  await article.evaluate(element => {
    const header = document.querySelector('.site-header');
    const clearance = (header?.getBoundingClientRect().height ?? 0) + 16;
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - clearance, behavior: 'instant' });
  });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const articleBounds = (await article.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(articleBounds.y).toBeGreaterThanOrEqual(16);
  expect(articleBounds.y + articleBounds.height).toBeLessThanOrEqual(viewport.height);
  await mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
  await article.screenshot({ path: join(process.cwd(), 'screenshots', `homepage-cag-entry-${kind}.png`), animations: 'disabled' });
  await button.click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/experiments/cag/');
  expect(new URL(page.url()).origin).toBe(new URL(homepage!).origin);
  await actions(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('.scene-axis').filter({ hasText: 'Action' })).toBeVisible();
  return article;
}

async function captureExperiment(page: Page, kind: 'desktop' | 'mobile', chinese = false) {
  await page.getByRole('button', { name: chinese ? '重置视角' : 'Reset view', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await expect(page.locator('.scene-axis').filter({ hasText: chinese ? '动作' : 'Action' })).toBeVisible();
  await page.screenshot({ path: join(process.cwd(), 'screenshots', `homepage-cag-experiment-${kind}.png`), fullPage: true, animations: 'disabled' });
}

test('desktop NeurIPS entry opens the local experiment and Chinese sharing survives a hard reload', async ({ page }) => {
  test.skip(!homepage, 'Set CAG_HOMEPAGE_URL to the combined Astro production origin.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await entry(page, 'desktop');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await page.getByTestId('language-select').selectOption('zh');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByRole('button', { name: '复制链接', exact: true }).click();
  await expect(page.getByText('请手动复制下方链接。', { exact: true })).toBeVisible();
  const copied = new URL(await page.getByTestId('share-url').inputValue());
  expect(copied.pathname).toBe('/experiments/cag/');
  expect(copied.origin).toBe(new URL(homepage!).origin);
  expect(copied.hash).toContain('cag=1');
  expect(new URLSearchParams(copied.hash.slice(1)).get('lang')).toBe('zh');
  expect(new URLSearchParams(copied.hash.slice(1)).get('stage')).toBe('pool');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(new URL(page.url()).pathname).toBe('/experiments/cag/');
  await expect(page.getByTestId('share-notice')).toContainText('已恢复分享参数');
  await expect(page.getByTestId('pooled-path')).toBeVisible();
  await actions(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await captureExperiment(page, 'desktop', true);
  await page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  const homeArticle = page.locator('article.research-entry').filter({
    has: page.getByRole('heading', { name: paperTitle, exact: true, level: 4 }),
  });
  await expect(homeArticle.getByRole('link', { name: 'Interactive demo', exact: true })).toHaveAttribute('href', '/experiments/cag/');
});

test('mobile NeurIPS entry keeps touch scrolling and native drift and cursor controls functional', async ({ page }) => {
  test.skip(!homepage, 'Set CAG_HOMEPAGE_URL to the combined Astro production origin.');
  await page.setViewportSize({ width: 390, height: 844 });
  await entry(page, 'mobile');
  await expect(page.locator('canvas')).toHaveCSS('pointer-events', 'none');
  await page.getByRole('button', { name: 'Enable 3D interaction', exact: true }).click();
  await expect(page.locator('canvas')).not.toHaveCSS('pointer-events', 'none');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  const baseline = page.getByRole('slider', { name: 'Baseline drift', exact: true });
  await baseline.focus();
  await page.keyboard.press('Home');
  await expect(baseline).toHaveValue('0');
  await actions(page, 0.68);
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await actions(page);
  await expect(page.getByRole('button', { name: 'Disable 3D interaction', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await page.getByRole('button', { name: 'Disable 3D interaction', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCSS('pointer-events', 'none');
  const cursor = page.getByRole('slider', { name: 'Action cursor', exact: true });
  await cursor.focus();
  await page.keyboard.press('Home');
  await expect(cursor).toHaveValue('0');
  await page.keyboard.press('End');
  await expect(cursor).toHaveValue('400');
  await expect(cursor).toHaveAttribute('aria-valuetext', 'a = 1.000');
  await actions(page);
  await expect(page.getByTestId('pooled-path')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await captureExperiment(page, 'mobile');
});
