import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Golden actions come from the independent offline reference fixture, not the UI model.
const DEFAULT_POOLED = 0.2175;
const TRUE_ACTION = 0.68;
const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text());
  });
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'The experiment must not emit browser errors').toEqual([]);
});

async function expectActions(page: Page, pooled: number, truth = TRUE_ACTION) {
  await expect.poll(async () => Number(await page.getByTestId('pooled-action').textContent())).toBeCloseTo(pooled, 4);
  await expect.poll(async () => Number(await page.getByTestId('true-action').textContent())).toBeCloseTo(truth, 4);
}

async function setSlider(page: Page, name: string, value: string) {
  // Native range inputs need an input event after value mutation; exercising the DOM
  // control keeps the test independent of reducer and numerical implementation.
  await page.getByRole('slider', { name, exact: true }).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function weights(page: Page) {
  return page.getByTestId('mixture-bar').locator('rect[data-weight]').evaluateAll((rects) =>
    rects.map((rect) => Number(rect.getAttribute('data-weight'))),
  );
}

async function capture(page: Page, filename: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const pause = page.getByRole('button', { name: 'Pause rotation', exact: true });
  if (await pause.isVisible() && await pause.isEnabled()) {
    // emulateMedia delivers its change event asynchronously; wait for the paused endpoint.
    await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  }
  // Full-page capture still needs the demand-rendered Canvas in the viewport:
  // Drei HTML labels otherwise retain their last offscreen projection.
  await page.evaluate(() => window.scrollTo(0, 0));
  const resetView = page.getByRole('button', { name: 'Reset view', exact: true });
  if (await resetView.isEnabled()) await resetView.click();
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Reduced motion makes scene projection exact; allow its demand-render frame to paint.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  if (await page.locator('canvas').count()) {
    await expect(page.locator('.scene-tag.scene-axis').filter({ hasText: 'Action' })).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  await mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(process.cwd(), 'screenshots', filename), fullPage: true, animations: 'disabled' });
}

test('desktop defaults, pooling, drift controls, and explicit pause survive reset', async ({ page }) => {
  await page.goto('/');
  await expectActions(page, DEFAULT_POOLED);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByTestId('curve-slice')).toBeVisible();
  await expect(page.getByTestId('pooled-path')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expect(page.getByTestId('pooled-path')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await capture(page, 'desktop.png');

  // The middle period has no baseline offset; select an early period to test visible drift.
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('0');
  const initialResponse = await page.getByTestId('response-path').getAttribute('d');
  const initialPooled = await page.getByTestId('pooled-path').getAttribute('d');
  await setSlider(page, 'Baseline drift', '0');
  await expectActions(page, TRUE_ACTION);
  await expect.poll(() => page.getByTestId('response-path').getAttribute('d')).not.toBe(initialResponse);
  await expect.poll(() => page.getByTestId('pooled-path').getAttribute('d')).not.toBe(initialPooled);
  await setSlider(page, 'Baseline drift', '1');
  await expectActions(page, DEFAULT_POOLED);
  await setSlider(page, 'Logging drift', '0');
  await expectActions(page, TRUE_ACTION);
  const uniform = await weights(page);
  expect(uniform).toHaveLength(7);
  uniform.forEach((weight) => expect(weight).toBeCloseTo(1 / 7, 7));
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await expectActions(page, DEFAULT_POOLED);
  await expect(page.getByRole('slider', { name: 'Baseline drift', exact: true })).toHaveValue('1');
  await expect(page.getByRole('slider', { name: 'Logging drift', exact: true })).toHaveValue('1');
  await expect(page.getByTestId('pooled-path')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('action cursor changes the period mixture; period selection changes only the true slice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause rotation', exact: true }).click();
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await setSlider(page, 'Action cursor', '40');
  const early = await weights(page);
  await setSlider(page, 'Action cursor', '360');
  const late = await weights(page);
  expect(early).toHaveLength(7);
  expect(late).toHaveLength(7);
  expect(early.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 8);
  expect(late.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 8);
  expect(early[0]).toBeGreaterThan(late[0]);
  expect(late[6]).toBeGreaterThan(early[6]);
  await expectActions(page, DEFAULT_POOLED);

  const response = await page.getByTestId('response-path').getAttribute('d');
  const pooled = await page.getByTestId('pooled-path').getAttribute('d');
  await page.getByRole('combobox', { name: 'Period', exact: true }).selectOption('6');
  await expect.poll(() => page.getByTestId('response-path').getAttribute('d')).not.toBe(response);
  await expect(page.getByTestId('pooled-path')).toHaveAttribute('d', pooled!);
  await page.getByRole('button', { name: 'Same action, all periods', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Same action, all periods', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('checkbox', { name: 'Show samples', exact: true }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Show samples', exact: true })).not.toBeChecked();
  await expectActions(page, DEFAULT_POOLED);
});

test('dragging the real canvas stops rotation and cannot change the decisions', async ({ page }) => {
  await page.goto('/');
  await expectActions(page, DEFAULT_POOLED);
  await expect(page.locator('.scene-true-label')).toBeVisible();
  const bounds = await page.locator('canvas').boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width * 0.5, bounds!.y + bounds!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * 0.7, bounds!.y + bounds!.height * 0.55, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await expectActions(page, DEFAULT_POOLED);
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expectActions(page, DEFAULT_POOLED);
});

test('native keyboard controls can remove baseline drift', async ({ page }) => {
  await page.goto('/');
  const baseline = page.getByRole('slider', { name: 'Baseline drift', exact: true });
  await baseline.focus();
  await page.keyboard.press('Home');
  await expect(baseline).toHaveValue('0');
  await expectActions(page, TRUE_ACTION);
  await page.keyboard.press('End');
  await expect(baseline).toHaveValue('1.2');
  await expect.poll(async () => Number(await page.getByTestId('pooled-action').textContent())).not.toBe(TRUE_ACTION);
});

test('mobile stays scrollable and makes 3D interaction explicit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectActions(page, DEFAULT_POOLED);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable 3D interaction', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await capture(page, 'mobile.png');
  await page.getByRole('button', { name: 'Enable 3D interaction', exact: true }).click();
  await setSlider(page, 'Logging drift', '0');
  await expectActions(page, TRUE_ACTION);
  await page.getByTestId('curve-slice').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('curve-slice')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('reduced motion starts paused and parameter changes do not restart motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectActions(page, DEFAULT_POOLED);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
  await setSlider(page, 'Baseline drift', '0');
  await expectActions(page, TRUE_ACTION);
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('WebGL failure preserves both numerical controls and the full 2D explanation', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null;
      return original.apply(this, [contextId, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.scene-unavailable[role="status"]')).toContainText('3D is unavailable. The 2D experiment remains fully interactive.');
  await expectActions(page, DEFAULT_POOLED);
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expect(page.getByTestId('pooled-path')).toBeVisible();
  await setSlider(page, 'Baseline drift', '0');
  await expectActions(page, TRUE_ACTION);
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expectActions(page, DEFAULT_POOLED);
  await capture(page, 'fallback.png');
});
