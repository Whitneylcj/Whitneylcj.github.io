import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const errors = new WeakMap<Page, string[]>();
const hiddenTruth = ['future-truth-path', 'future-oracle-marker', 'future-oracle-action',
  'geometry-raw-regret', 'pooled-raw-regret', 'geometry-linked-regret', 'structural-bound', 'future-mismatch'];

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'P3 interactions must not emit browser errors').toEqual([]);
});

async function numeric(page: Page, id: string) {
  const element = page.getByTestId(id);
  return Number(await element.getAttribute('data-value') ?? await element.textContent());
}
async function expectNumber(page: Page, id: string, value: number, precision = 4) {
  await expect.poll(() => numeric(page, id)).toBeCloseTo(value, precision);
}
async function setSlider(page: Page, name: string, value: string) {
  await page.getByRole('slider', { name, exact: true }).evaluate((element, next) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function expectHidden(page: Page) {
  for (const id of hiddenTruth) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByTestId('assumed-path')).toBeVisible();
}
async function settleScene(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}
async function capture(page: Page, name: string) {
  const chinese = await page.locator('html').getAttribute('lang') === 'zh-CN';
  const reset = page.getByRole('button', { name: chinese ? '重置视角' : 'Reset view', exact: true });
  if (await reset.isEnabled()) await reset.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleScene(page);
  if (await page.locator('canvas').count()) {
    await expect(page.locator('.scene-axis').filter({ hasText: chinese ? '动作' : 'Action' })).toBeVisible();
    await settleScene(page);
  }
  await mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(process.cwd(), 'screenshots', name), fullPage: true, animations: 'disabled' });
}
async function forceManualClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true,
      value: { writeText: async () => { throw new Error('Clipboard unavailable in this test'); } } });
  });
}
async function share(page: Page, chinese = false) {
  await page.getByRole('button', { name: chinese ? '复制链接' : 'Copy link', exact: true }).click();
  const input = page.getByTestId('share-url');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('readonly', '');
  return input.inputValue();
}
async function geometry(page: Page, preset = 'additive') {
  await page.getByRole('button', { name: 'Keep the shape', exact: true }).click();
  await page.getByRole('combobox', { name: 'Teaching preset', exact: true }).selectOption(preset);
}

test('English and Chinese retain identical historical curves, actions and a connected Canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expectNumber(page, 'pooled-action', 0.2175);
  await expectNumber(page, 'true-action', 0.68);
  await expect(page.locator('canvas')).toHaveCount(1);
  const canvas = await page.locator('canvas').elementHandle();
  const pooled = await page.getByTestId('pooled-path').getAttribute('d');
  const response = await page.getByTestId('response-path').getAttribute('d');
  await capture(page, 'p3-desktop-en.png');
  await page.getByTestId('language-select').selectOption('zh');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('heading', { name: '预测准确，决策仍可出错。', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('slider', { name: '基线漂移', exact: true })).toBeVisible();
  await expect(page.getByTestId('pooled-path')).toHaveAttribute('d', pooled!);
  await expect(page.getByTestId('response-path')).toHaveAttribute('d', response!);
  await expectNumber(page, 'pooled-action', 0.2175);
  await expectNumber(page, 'true-action', 0.68);
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  await page.getByTestId('language-select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('response-path')).toHaveAttribute('d', response!);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('Chinese normalized geometry keeps the off-grid anchor and computed Log selection', async ({ page }) => {
  await page.goto('/');
  await geometry(page, 'log-amplitude');
  await page.getByRole('button', { name: 'Log scale', exact: true }).click();
  await page.getByText('Advanced: reference action', { exact: true }).click();
  await setSlider(page, 'Reference action', '0.613');
  await page.getByRole('button', { name: 'Remove amplitude', exact: true }).click();
  const paths = await page.getByTestId('geometry-slice').locator('path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  await page.getByTestId('language-select').selectOption('zh');
  await expect(page.getByTestId('selected-link')).toHaveText('对数');
  await expectNumber(page, 'anchor-value', 0.613);
  await expectNumber(page, 'geometry-action', 0.68);
  await expectNumber(page, 'log-loss', 0, 10);
  expect(await page.getByTestId('geometry-slice').locator('path').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')))).toEqual(paths);
  await capture(page, 'p3-desktop-zh.png');
});

test('manual share fallback exposes a usable versioned URL and supports Escape and close focus', async ({ page }) => {
  await forceManualClipboard(page);
  await page.goto('/?irrelevant=do-not-share');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('6');
  await setSlider(page, 'Action cursor', '327');
  await page.getByRole('checkbox', { name: 'Show samples', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Same action, all periods', exact: true }).click();
  const url = new URL(await share(page));
  expect(url.search).toBe('');
  const params = new URLSearchParams(url.hash.slice(1));
  expect(params.get('cag')).toBe('1');
  expect(params.get('seed')).toBe('20261008');
  expect(params.get('stage')).toBe('pool');
  expect(params.get('period')).toBe('6');
  expect(params.get('action')).toBe('327');
  expect(params.get('samples')).toBe('0');
  expect(params.get('same')).toBe('1');
  expect(url.hash).not.toMatch(/revealed|frozen|truth|audit|hover|camera/);
  await expect(page.getByText('Copy the link below.', { exact: true })).toBeVisible();
  await page.getByTestId('share-url').focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('share-url')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeFocused();
  await share(page);
  await page.getByRole('button', { name: 'Close share link', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy link', exact: true })).toBeFocused();
});

test('copying a revealed future retains the source audit, while reopening recomputes history and hides truth', async ({ page }) => {
  await forceManualClipboard(page);
  await page.goto('/');
  await geometry(page, 'log-amplitude');
  // The current view intentionally differs from the loss-selected historical scale.
  await expect(page.getByRole('button', { name: 'Identity scale', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByText('Advanced: reference action', { exact: true }).click();
  await setSlider(page, 'Reference action', '0.613');
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  await setSlider(page, 'Future level', '1.4');
  await setSlider(page, 'Future amplitude', '1.3');
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  const canvas = await page.locator('canvas').elementHandle();
  const truth = await page.getByTestId('future-truth-path').getAttribute('d');
  const regret = await numeric(page, 'geometry-raw-regret');
  await page.getByTestId('language-select').selectOption('zh');
  await expect(page.getByTestId('frozen-link')).toHaveText('对数');
  await expect(page.getByTestId('future-truth-path')).toHaveAttribute('d', truth!);
  await expectNumber(page, 'geometry-raw-regret', regret, 10);
  const link = await share(page, true);
  await expect(page.getByRole('button', { name: '未来已揭示', exact: true })).toBeDisabled();
  await expect(page.getByTestId('future-truth-path')).toHaveAttribute('d', truth!);
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  const params = new URLSearchParams(new URL(link).hash.slice(1));
  expect(params.get('link')).toBe('identity');
  expect(params.get('offset')).toBe('1.4');
  expect(params.get('amplitude')).toBe('1.3');
  expect(params.get('anchor')).toBe('0.613');
  expect(params.get('lang')).toBe('zh');
  await page.goto(link);
  // Copy replaced the current address; navigating that identical URL may stay in-document.
  await page.reload();
  await expect(page.getByTestId('share-notice')).toContainText('已恢复分享参数');
  await expectHidden(page);
  await expect(page.getByTestId('frozen-link')).toHaveText('对数');
  await expectNumber(page, 'frozen-action', 0.68);
  await expect(page.getByRole('slider', { name: '未来响应水平', exact: true })).toHaveValue('1.4');
  await expect(page.getByRole('slider', { name: '未来幅度', exact: true })).toHaveValue('1.3');
  await page.getByRole('button', { name: '揭示未来', exact: true }).click();
  await expect(page.getByTestId('future-truth-path')).toHaveAttribute('d', truth!);
  await expectNumber(page, 'geometry-raw-regret', regret, 10);
});

test('same-page hash restore atomically reinstates a hidden future while retaining the Canvas', async ({ page }) => {
  await forceManualClipboard(page);
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1);
  const canvas = await page.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  await setSlider(page, 'Future shape shock', '1.2');
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await page.getByTestId('language-select').selectOption('zh');
  const link = await share(page, true);
  await page.getByRole('button', { name: '关闭分享链接', exact: true }).click();
  await page.getByRole('button', { name: '重置实验', exact: true }).click();
  await setSlider(page, '基线漂移', '0');
  await expectNumber(page, 'pooled-action', 0.68);
  // Reset changes inputs without changing the stored address. First leave that hash.
  await page.evaluate(() => { window.location.hash = 'experiment'; });
  await page.evaluate(hash => { window.location.hash = hash; }, new URL(link).hash);
  await expect(page.getByTestId('share-notice')).toContainText('已恢复分享参数');
  await expectHidden(page);
  await expect(page.getByRole('slider', { name: '未来形状冲击', exact: true })).toHaveValue('1.2');
  await expectNumber(page, 'frozen-action', 0.68);
  await expectNumber(page, 'pooled-action', 0.2175);
  expect(await canvas!.evaluate(element => element.isConnected)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('ordinary section anchors preserve inputs and invalid version hashes recover to a labeled default', async ({ page }) => {
  await page.goto('/');
  await setSlider(page, 'Baseline drift', '0');
  await expectNumber(page, 'pooled-action', 0.68);
  await page.getByRole('link', { name: 'About this model', exact: true }).click();
  await expect(page).toHaveURL(/#model-notes$/);
  await expectNumber(page, 'pooled-action', 0.68);
  await expect(page.getByTestId('share-notice')).toHaveCount(0);
  await page.evaluate(() => { window.location.hash = 'cag=99'; });
  await expect(page.getByTestId('share-notice')).toContainText('invalid or uses an unsupported version');
  await expectNumber(page, 'pooled-action', 0.2175);
  await expectNumber(page, 'true-action', 0.68);
  await expect(page.getByRole('slider', { name: 'Baseline drift', exact: true })).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Observe periods', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('skip navigation and Home/End cursor controls are usable throughout the story without changing frozen regret', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to experiment', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#experiment')).toBeFocused();
  const cursor = page.getByRole('slider', { name: 'Action cursor', exact: true });
  await cursor.focus();
  await page.keyboard.press('Home');
  await expect(cursor).toHaveValue('0');
  await expect(page.getByTestId('curve-slice').locator('desc')).toContainText('Action cursor: a = 0.000');
  await page.keyboard.press('End');
  await expect(cursor).toHaveValue('400');
  await expect(page.getByTestId('curve-slice').locator('desc')).toContainText('Action cursor: a = 1.000');
  await expectNumber(page, 'pooled-action', 0.2175);
  for (const name of ['Pool across time', 'Keep the shape', 'Choose before the future', 'Change the future']) {
    await page.getByRole('button', { name, exact: true }).click();
    await cursor.focus();
    await page.keyboard.press('Home');
    await expect(cursor).toHaveValue('0');
    await page.keyboard.press('End');
    await expect(cursor).toHaveValue('400');
    await expect(cursor).toHaveAttribute('aria-valuetext', 'a = 1.000');
  }
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumber(page, 'future-oracle-action', 0.3475);
  const regret = await numeric(page, 'geometry-raw-regret');
  await cursor.focus();
  await page.keyboard.press('Home');
  await expect(page.getByTestId('future-plot').locator('desc')).toContainText('Action cursor: a = 0.000');
  await expectNumber(page, 'frozen-action', 0.68);
  await expectNumber(page, 'geometry-raw-regret', regret, 10);
  await page.keyboard.press('End');
  await expectNumber(page, 'geometry-raw-regret', regret, 10);
});

test('Front view changes the rendered camera and pauses it while retaining decisions and Canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expect(page.locator('.scene-axis').filter({ hasText: 'Action' })).toBeVisible();
  const canvas = page.locator('canvas');
  const original = await canvas.elementHandle();
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await settleScene(page);
  const orbit = await canvas.screenshot({ animations: 'disabled' });
  await page.getByRole('button', { name: 'Front view', exact: true }).click();
  await settleScene(page);
  await expect.poll(async () => (await canvas.screenshot({ animations: 'disabled' })).equals(orbit)).toBe(false);
  const front = await canvas.screenshot({ animations: 'disabled' });
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await expectNumber(page, 'pooled-action', 0.2175);
  await expectNumber(page, 'true-action', 0.68);
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await settleScene(page);
  await expect.poll(async () => (await canvas.screenshot({ animations: 'disabled' })).equals(front)).toBe(false);
  expect(await original!.evaluate(element => element.isConnected)).toBe(true);
});

test('mobile Chinese controls retain scrolling, adequate targets and the revealed failure explanation', async ({ page }) => {
  await forceManualClipboard(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCSS('pointer-events', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const selector of [page.getByTestId('language-select'), page.getByRole('button', { name: 'Copy link', exact: true }),
    page.getByRole('button', { name: 'Enable 3D interaction', exact: true })]) {
    expect((await selector.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await page.getByRole('slider', { name: 'Baseline drift', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(38);
  await share(page);
  const englishPopover = (await page.locator('.share-popover').boundingBox())!;
  expect(englishPopover.x).toBeGreaterThanOrEqual(0);
  expect(englishPopover.x + englishPopover.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close share link', exact: true }).click();
  await page.getByRole('button', { name: 'Enable 3D interaction', exact: true }).click();
  await expect(page.locator('canvas')).not.toHaveCSS('pointer-events', 'none');
  await page.getByRole('button', { name: 'Disable 3D interaction', exact: true }).click();
  await page.getByTestId('language-select').selectOption('zh');
  await share(page, true);
  const chinesePopover = (await page.locator('.share-popover').boundingBox())!;
  expect(chinesePopover.x).toBeGreaterThanOrEqual(0);
  expect(chinesePopover.x + chinesePopover.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '关闭分享链接', exact: true }).click();
  await page.getByRole('button', { name: '改变未来形状', exact: true }).click();
  await expect(page.getByRole('slider', { name: '未来形状冲击', exact: true })).toHaveValue('2.4');
  await page.getByRole('button', { name: '揭示未来', exact: true }).click();
  await expectNumber(page, 'future-oracle-action', 0.3475);
  await expectNumber(page, 'frozen-action', 0.68);
  await page.getByText('显示结构性界限', { exact: true }).click();
  await expect(page.getByTestId('structural-bound')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, 'p3-mobile-zh.png');
  await setSlider(page, '未来形状冲击', '0');
  await expectHidden(page);
  await page.getByRole('button', { name: '揭示未来', exact: true }).click();
  await expectNumber(page, 'future-oracle-action', 0.68);
  await expectNumber(page, 'geometry-raw-regret', 0, 10);
});

test('Chinese WebGL fallback keeps geometry, future diagnostics and semantic sharing operational', async ({ page }) => {
  await forceManualClipboard(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null;
      return original.apply(this, [contextId, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/');
  await page.getByTestId('language-select').selectOption('zh');
  await expect(page.locator('.scene-unavailable[role="status"]')).toContainText('3D 不可用，2D 实验仍可完整交互。');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: '保留形状', exact: true }).click();
  await page.getByRole('combobox', { name: '教学预设', exact: true }).selectOption('log-amplitude');
  await expect(page.getByTestId('selected-link')).toHaveText('对数');
  await expectNumber(page, 'geometry-action', 0.68);
  await page.getByRole('button', { name: '改变未来形状', exact: true }).click();
  await expectHidden(page);
  const link = await share(page, true);
  await page.getByRole('button', { name: '关闭分享链接', exact: true }).click();
  await page.getByRole('button', { name: '揭示未来', exact: true }).click();
  await expectNumber(page, 'future-oracle-action', 0.3475);
  await capture(page, 'p3-fallback-zh.png');
  await page.goto(link);
  await page.reload();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expectHidden(page);
  await expect(page.getByTestId('frozen-link')).toHaveText('对数');
});

test('runtime stays self-contained and exposes only the confirmed official research link', async ({ page }) => {
  const external: string[] = [];
  let origin: string | null = null;
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (origin === null && request.isNavigationRequest() && request.resourceType() === 'document') origin = url.origin;
    if (origin !== null && url.origin !== origin) external.push(url.href);
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1);
  const official = page.getByRole('link', { name: 'Official NeurIPS page', exact: true });
  await expect(official).toHaveAttribute('href', 'https://neurips.cc/virtual/2026/loc/sydney/poster/154378');
  await expect(official).toHaveAttribute('rel', 'noopener noreferrer');
  const researchLinks = await page.locator('#paper-evidence a').evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).href));
  expect(researchLinks).toEqual(['https://neurips.cc/virtual/2026/loc/sydney/poster/154378']);
  await expect(page.locator('#paper-evidence')).toContainText('separate known-response teaching model');
  await page.getByTestId('language-select').selectOption('zh');
  await page.getByRole('button', { name: '保留形状', exact: true }).click();
  await page.getByRole('button', { name: '改变未来形状', exact: true }).click();
  await page.getByRole('button', { name: '揭示未来', exact: true }).click();
  await settleScene(page);
  expect(external, 'The static runtime must not fetch fonts, models or services outside its own origin').toEqual([]);
});
