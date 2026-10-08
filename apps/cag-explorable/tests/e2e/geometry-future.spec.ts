import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import golden from '../../fixtures/golden.json' with { type: 'json' };

const errors = new WeakMap<Page, string[]>();
const hiddenTruth = [
  'future-truth-path', 'future-oracle-marker', 'future-oracle-action', 'geometry-raw-regret',
  'pooled-raw-regret', 'geometry-linked-regret', 'structural-bound', 'future-mismatch',
] as const;

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') messages.push(message.text()); });
  // Keep the model and the camera at deterministic endpoints throughout P2 tests.
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'P2 must not emit browser errors').toEqual([]);
});

async function setSlider(page: Page, name: string, value: string) {
  await page.getByRole('slider', { name, exact: true }).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function numeric(page: Page, testId: string) {
  const element = page.getByTestId(testId);
  const precise = await element.getAttribute('data-value');
  return Number(precise ?? await element.textContent());
}

async function expectNumeric(page: Page, testId: string, value: number, precision = 4) {
  await expect.poll(() => numeric(page, testId)).toBeCloseTo(value, precision);
}

async function expectUnrevealed(page: Page) {
  for (const testId of hiddenTruth) await expect(page.getByTestId(testId)).toHaveCount(0);
  await expect(page.locator('.scene-tag').filter({ hasText: 'Revealed oracle' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reveal future', exact: true })).toBeVisible();
}

async function openGeometry(page: Page, preset = 'additive') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Keep the shape', exact: true }).click();
  await page.getByRole('combobox', { name: 'Teaching preset', exact: true }).selectOption(preset);
  await expect(page.getByText('Illustrative geometry fit on known response curves', { exact: true })).toBeVisible();
}

async function capture(page: Page, filename: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const resetView = page.getByRole('button', { name: 'Reset view', exact: true });
  if (await resetView.isEnabled()) await resetView.click();
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  if (await page.locator('canvas').count()) {
    await expect(page.locator('.scene-tag.scene-axis').filter({ hasText: 'Action' })).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  }
  await mkdir(join(process.cwd(), 'screenshots'), { recursive: true });
  await page.screenshot({ path: join(process.cwd(), 'screenshots', filename), fullPage: true, animations: 'disabled' });
}

test('geometry fits the link by loss, keeps monotone-link decisions honest, and anchors off-grid', async ({ page }) => {
  await openGeometry(page, 'log-amplitude');
  // All five steps reuse a single Canvas rather than mounting separate scenes.
  await expect(page.locator('canvas')).toHaveCount(1);
  const initialCanvas = await page.locator('canvas').elementHandle();
  for (const name of ['Observe periods', 'Pool across time', 'Keep the shape', 'Choose before the future', 'Change the future']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(await initialCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  }
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await page.getByRole('button', { name: 'Keep the shape', exact: true }).click();
  await page.getByRole('combobox', { name: 'Teaching preset', exact: true }).selectOption('log-amplitude');
  const expected = golden.presets.log_with_amplitude_drift;
  await expectNumeric(page, 'pooled-action', expected.pooled_action);
  await expectNumeric(page, 'identity-loss', expected.identity_loss, 7);
  await expectNumeric(page, 'log-loss', expected.log_loss, 10);
  await expect(page.getByTestId('selected-link')).toHaveText('Log');
  await expectNumeric(page, 'geometry-action', 0.68);
  await expectNumeric(page, 'anchor-value', 0.5);

  await page.getByRole('button', { name: 'Log scale', exact: true }).click();
  await page.getByRole('button', { name: 'Anchor contrasts', exact: true }).click();
  const originalContrasts = await page.getByTestId('geometry-slice').locator('path').evaluateAll(
    (paths) => paths.map((path) => path.getAttribute('d')),
  );
  await page.getByText('Advanced: reference action', { exact: true }).click();
  await setSlider(page, 'Reference action', '0.613');
  await expectNumeric(page, 'anchor-value', 0.613);
  await expect.poll(() => page.getByTestId('geometry-slice').locator('path').evaluateAll(
    (paths) => paths.map((path) => path.getAttribute('d')),
  )).not.toEqual(originalContrasts);
  await expectNumeric(page, 'pooled-action', expected.pooled_action);
  await expectNumeric(page, 'geometry-action', 0.68);

  await page.getByRole('button', { name: 'Remove amplitude', exact: true }).click();
  await expect(page.getByTestId('geometry-path')).toBeVisible();
  await expectNumeric(page, 'log-loss', 0, 10);
  await capture(page, 'p2-geometry-desktop.png');

  // Changing the anchor is representation-only: the known response and pooled
  // target survive return to the original population views.
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  const response = await page.getByTestId('response-path').getAttribute('d');
  const pooled = await page.getByTestId('pooled-path').getAttribute('d');
  await page.getByRole('button', { name: 'Keep the shape', exact: true }).click();
  const anchorControl = page.getByRole('slider', { name: 'Reference action', exact: true });
  if (!await anchorControl.isVisible()) await page.getByText('Advanced: reference action', { exact: true }).click();
  await setSlider(page, 'Reference action', '0.287');
  await page.getByRole('button', { name: 'Pool across time', exact: true }).click();
  await expect(page.getByTestId('response-path')).toHaveAttribute('d', response!);
  await expect(page.getByTestId('pooled-path')).toHaveAttribute('d', pooled!);
  await expectNumeric(page, 'pooled-action', expected.pooled_action);
});

test('pure multiplicative history reports the actual tie on both scales', async ({ page }) => {
  await openGeometry(page, 'multiplicative');
  await expectNumeric(page, 'identity-loss', 0, 10);
  await expectNumeric(page, 'log-loss', 0, 10);
  await expect(page.getByTestId('selected-link')).toHaveText('Both scales fit');
  await expectNumeric(page, 'pooled-action', golden.presets.pure_multiplicative_tie.pooled_action);
  await page.getByRole('button', { name: 'Log scale', exact: true }).click();
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  // The viewing toggle does not turn a tie into evidence for a unique link.
  await expect(page.getByTestId('frozen-link')).toContainText('Identity');
  await expectNumeric(page, 'frozen-action', 0.68);
  await expectUnrevealed(page);
});

test('freeze uses historical selection and future calibration never refits the action', async ({ page }) => {
  await openGeometry(page);
  await page.getByRole('button', { name: 'Log scale', exact: true }).click();
  await expect(page.getByTestId('selected-link')).toHaveText('Identity');
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  await expect(page.getByTestId('frozen-link')).toContainText('Identity');
  await expectNumeric(page, 'frozen-action', 0.68);
  await expectUnrevealed(page);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.68);
  await expectNumeric(page, 'geometry-raw-regret', 0);
  await expectNumeric(page, 'pooled-raw-regret', golden.presets.additive_default.future_audits[0]!.pooled_raw_regret);

  await setSlider(page, 'Future amplitude', '1.3');
  await expectUnrevealed(page);
  await expectNumeric(page, 'frozen-action', 0.68);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.68);
  await expectNumeric(page, 'geometry-raw-regret', 0);
  const atFirstLevel = await page.getByTestId('future-truth-path').getAttribute('d');
  const firstAxisLabels = await page.getByTestId('future-plot').locator('text').allTextContents();
  await setSlider(page, 'Future level', '6');
  await expectUnrevealed(page);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.68);
  await expect(page.getByRole('slider', { name: 'Future level', exact: true })).toHaveValue('6');
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  await expect.poll(() => page.getByTestId('future-truth-path').getAttribute('d')).not.toBe(atFirstLevel);
  expect(await page.getByTestId('future-plot').locator('text').allTextContents()).toEqual(firstAxisLabels);
  await expectNumeric(page, 'frozen-action', 0.68);
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('identical history permits a future failure, with a truth-only same-scale structural audit', async ({ page }) => {
  await openGeometry(page);
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  const frozenLink = await page.getByTestId('frozen-link').textContent();
  await expectUnrevealed(page);
  await page.getByRole('button', { name: 'Shape-changing future', exact: true }).click();
  await expectUnrevealed(page);
  await expect(page.getByTestId('frozen-link')).toHaveText(frozenLink!);
  await expectNumeric(page, 'frozen-action', 0.68);
  await setSlider(page, 'Future shape shock', '2.4');
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  const expected = golden.presets.additive_default.future_audits[2]!;
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  await expectNumeric(page, 'future-oracle-action', expected.oracle_action);
  await expectNumeric(page, 'geometry-raw-regret', expected.geometry_raw_regret);
  await expectNumeric(page, 'pooled-raw-regret', expected.pooled_raw_regret);
  expect(await numeric(page, 'geometry-raw-regret')).toBeGreaterThan(await numeric(page, 'pooled-raw-regret'));
  await expect(page.getByTestId('structural-bound')).not.toBeVisible();
  await page.getByText('Show structural bound', { exact: true }).click();
  await expectNumeric(page, 'geometry-linked-regret', expected.geometry_linked_regret);
  await expectNumeric(page, 'structural-bound', expected.twice_true_sup_residual);
  await expect(page.getByText('Identity is selected: linked and raw regret have the same units and value.', { exact: false })).toBeVisible();
  expect(await numeric(page, 'geometry-linked-regret')).toBeLessThanOrEqual(await numeric(page, 'structural-bound') + 1e-8);
  await capture(page, 'p2-future-desktop.png');

  await page.getByRole('button', { name: 'Persistent future', exact: true }).click();
  await expectUnrevealed(page);
  await expectNumeric(page, 'frozen-action', 0.68);
  await expect(page.getByTestId('frozen-link')).toHaveText(frozenLink!);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.68);
  await expectNumeric(page, 'geometry-raw-regret', 0);
});

test('log future distinguishes raw outcome regret from selected-link regret', async ({ page }) => {
  await openGeometry(page, 'log-amplitude');
  await page.getByRole('button', { name: 'Identity scale', exact: true }).click();
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  await expect(page.getByTestId('frozen-link')).toContainText('Log');
  await setSlider(page, 'Future shape shock', '2.4');
  await expectUnrevealed(page);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  const expected = golden.presets.log_with_amplitude_drift.future_audits[2]!;
  await expectNumeric(page, 'geometry-raw-regret', expected.geometry_raw_regret);
  await page.getByText('Show structural bound', { exact: true }).click();
  await expectNumeric(page, 'geometry-linked-regret', expected.geometry_linked_regret);
  await expectNumeric(page, 'structural-bound', expected.twice_true_sup_residual);
  await expect(page.getByText('Log is selected: linked regret is in log-response units, while raw regret is in outcome units.', { exact: false })).toBeVisible();
  expect(Math.abs(await numeric(page, 'geometry-raw-regret') - await numeric(page, 'geometry-linked-regret'))).toBeGreaterThan(0.5);
});

test('a future with zero positive fitted scale still reveals finite raw truth and regret', async ({ page }) => {
  await openGeometry(page);
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  await setSlider(page, 'Future amplitude', '0.2');
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  await setSlider(page, 'Future shape shock', '2.4');
  await expectUnrevealed(page);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  // d/da[.2 r(a) - 2.4(a-.5)] is negative throughout [0,1].
  await expectNumeric(page, 'future-oracle-action', 0);
  await expectNumeric(page, 'frozen-action', 0.68);
  await expectNumeric(page, 'geometry-raw-regret', 1.26208);
  await expectNumeric(page, 'future-mismatch', 1);
  await page.getByText('Show structural bound', { exact: true }).click();
  await expectNumeric(page, 'structural-bound', 2.512);
  expect(await numeric(page, 'geometry-linked-regret')).toBeLessThanOrEqual(await numeric(page, 'structural-bound') + 1e-8);
});

test('historical edits invalidate a revealed branch and reset requires a new choice', async ({ page }) => {
  await openGeometry(page);
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  await page.getByRole('button', { name: 'Keep the shape', exact: true }).click();
  await page.getByRole('combobox', { name: 'Teaching preset', exact: true }).selectOption('log-amplitude');
  await page.getByRole('button', { name: 'Choose before the future', exact: true }).click();
  await expectUnrevealed(page);
  await expect(page.getByTestId('frozen-link')).toContainText('Log');
  await expectNumeric(page, 'pooled-action', 0.49);
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await page.getByRole('button', { name: 'Reset experiment', exact: true }).click();
  await expect(page.getByTestId('frozen-action')).toHaveCount(0);
  await expect(page.getByTestId('future-truth-path')).toHaveCount(0);
  await expectNumeric(page, 'pooled-action', 0.2175);
  await expect(page.getByRole('button', { name: 'Observe periods', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Resume rotation', exact: true })).toBeVisible();
});

test('mobile future remains scrollable with readable truth and an explicit camera mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGeometry(page);
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  await setSlider(page, 'Future shape shock', '2.4');
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await page.getByText('Show structural bound', { exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.3475);
  await expect(page.getByRole('button', { name: 'Enable 3D interaction', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('future-truth-path').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('future-truth-path')).toBeVisible();
  await capture(page, 'p2-future-mobile.png');
});

test('WebGL fallback keeps geometry selection and future audits fully usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, ...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(contextId)) return null;
      return original.apply(this, [contextId, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await openGeometry(page, 'log-amplitude');
  await expect(page.locator('.scene-unavailable[role="status"]')).toContainText('3D is unavailable. The 2D experiment remains fully interactive.');
  await page.getByRole('button', { name: 'Log scale', exact: true }).click();
  await page.getByRole('button', { name: 'Remove amplitude', exact: true }).click();
  await expect(page.getByTestId('geometry-path')).toBeVisible();
  await page.getByRole('button', { name: 'Change the future', exact: true }).click();
  await expectUnrevealed(page);
  await setSlider(page, 'Future shape shock', '2.4');
  await page.getByRole('button', { name: 'Reveal future', exact: true }).click();
  await expectNumeric(page, 'future-oracle-action', 0.3475);
  await expectNumeric(page, 'frozen-action', 0.68);
  await page.getByText('Show structural bound', { exact: true }).click();
  expect(await numeric(page, 'geometry-linked-regret')).toBeLessThanOrEqual(await numeric(page, 'structural-bound') + 1e-8);
});
