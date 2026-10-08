import { describe, expect, it } from 'vitest';
import golden from '../../fixtures/golden.json';
import { selectView } from '../../src/demo/selectors';
import { buildModel, DEFAULT_CONFIG } from '../../src/model';
import { PERIOD_COUNT, SAMPLES_PER_PERIOD } from '../../src/model/constants';
import { integrate } from '../../src/model/logging';
import { responseAt } from '../../src/model/response';
import { densityCdf } from '../../src/model/samples';

function probabilityAtAction(action: number, actions: number[], density: number[]): number {
  const cdf = densityCdf(actions, density);
  const index = Math.min(actions.length - 2, Math.floor(action * (actions.length - 1)));
  const width = actions[index + 1]! - actions[index]!;
  const offset = action - actions[index]!;
  const slope = (density[index + 1]! - density[index]!) / width;
  const mass = integrate(density, actions.map((_, i) =>
    (i === 0 || i === actions.length - 1 ? 0.5 : 1) / (actions.length - 1)));
  return cdf[index]! + (density[index]! * offset + slope * offset ** 2 / 2) / mass;
}

describe('P0/P1 additive population model', () => {
  it('matches the offline golden optima for default and both zero-drift controls', () => {
    const scenarios = [
      { config: DEFAULT_CONFIG, expected: golden.presets.additive_default },
      { config: { baselineDrift: 0, loggingDrift: 1 }, expected: golden.presets.no_baseline_drift },
      { config: { baselineDrift: 1, loggingDrift: 0 }, expected: golden.presets.no_logging_drift },
    ];
    for (const { config, expected } of scenarios) {
      const model = buildModel(config);
      expect(model.pooledAction).toBeCloseTo(expected.pooled_action, 12);
      expect(model.trueAction).toBeCloseTo(expected.identity_action, 12);
      expect(model.pooledAction).toBe(model.actions[model.pooledIndex]);
      expect(model.trueAction).toBe(model.actions[model.trueIndex]);
    }
  });

  it('uses the exact 401-action, seven-period trapezoidal grid', () => {
    const model = buildModel();
    expect(model.actions).toHaveLength(401);
    expect(model.times).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1]);
    expect(model.actions[0]).toBe(0);
    expect(model.actions[400]).toBe(1);
    expect(model.quadrature[0]).toBe(1 / 800);
    expect(model.quadrature[200]).toBe(1 / 400);
    expect(model.quadrature[400]).toBe(1 / 800);
    expect(integrate(model.actions.map(() => 1), model.quadrature)).toBeCloseTo(1, 12);
    expect(integrate(model.actions, model.quadrature)).toBeCloseTo(0.5, 12);
  });

  it('normalizes logging on bounded support and preserves positive exploration', () => {
    for (const loggingDrift of [0, 0.4, 1]) {
      const model = buildModel({ baselineDrift: 1, loggingDrift });
      for (const density of model.densities) {
        expect(integrate(density, model.quadrature)).toBeCloseTo(1, 12);
        expect(Math.min(...density)).toBeGreaterThanOrEqual(0.08);
      }
    }
    const stationary = buildModel({ baselineDrift: 1, loggingDrift: 0 });
    for (const density of stationary.densities) expect(density).toEqual(stationary.densities[0]);
  });

  it('computes the population pooled target from Bayes weights at every action', () => {
    const model = buildModel();
    model.actions.forEach((_, actionIndex) => {
      const weights = model.periodWeights.map((row) => row[actionIndex]!);
      expect(weights.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
      const expected = weights.reduce((sum, weight, periodIndex) =>
        sum + weight * model.responses[periodIndex]![actionIndex]!, 0);
      expect(model.pooled[actionIndex]).toBeCloseTo(expected, 12);
    });
    expect(model.periodWeights[0]![40]).toBeGreaterThan(model.periodWeights[6]![40]!);
    expect(model.periodWeights[6]![360]).toBeGreaterThan(model.periodWeights[0]![360]!);
    const unweightedAtLowAction = model.responses.reduce((sum, row) => sum + row[40]! / 7, 0);
    expect(Math.abs(model.pooled[40]! - unweightedAtLowAction)).toBeGreaterThan(1);
  });

  it('evaluates the declared response formula and an identical peak in all periods', () => {
    const model = buildModel();
    expect(model.responses[0]![200]).toBe(8.5);
    expect(model.responses[3]![200]).toBe(6);
    expect(model.responses[6]![200]).toBe(3.5);
    expect(model.responses[3]![272]).toBeCloseTo(6.1296, 12);
    for (const row of model.responses) {
      expect(row.indexOf(Math.max(...row))).toBe(model.trueIndex);
    }
  });

  it('responds to both controls through curves, density, target and action', () => {
    const original = buildModel();
    const baselineChanged = buildModel({ baselineDrift: 0.4, loggingDrift: 1 });
    expect(baselineChanged.responses).not.toEqual(original.responses);
    expect(baselineChanged.pooled).not.toEqual(original.pooled);
    expect(baselineChanged.pooledAction).not.toBe(original.pooledAction);
    expect(baselineChanged.densities).toEqual(original.densities);
    const loggingChanged = buildModel({ baselineDrift: 1, loggingDrift: 0.4 });
    expect(loggingChanged.densities).not.toEqual(original.densities);
    expect(loggingChanged.periodWeights).not.toEqual(original.periodWeights);
    expect(loggingChanged.pooled).not.toEqual(original.pooled);
    expect(loggingChanged.pooledAction).not.toBe(original.pooledAction);
    expect(loggingChanged.responses).toEqual(original.responses);
    expect(baselineChanged.trueAction).toBe(original.trueAction);
    expect(loggingChanged.trueAction).toBe(original.trueAction);
  });

  it('regenerates deterministic visual samples with fixed noise and latent quantiles', () => {
    const original = buildModel();
    expect(buildModel().samples).toEqual(original.samples);
    expect(original.samples).toHaveLength(PERIOD_COUNT * SAMPLES_PER_PERIOD);
    const changed = buildModel({ baselineDrift: 0.4, loggingDrift: 0.2 });
    let moved = 0;
    original.samples.forEach((sample, index) => {
      const next = changed.samples[index]!;
      expect(next.periodIndex).toBe(sample.periodIndex);
      expect(next.action).toBeGreaterThanOrEqual(0);
      expect(next.action).toBeLessThanOrEqual(1);
      const originalNoise = sample.response - responseAt(sample.action, original.times[sample.periodIndex]!, original.config);
      const nextNoise = next.response - responseAt(next.action, changed.times[next.periodIndex]!, changed.config);
      expect(nextNoise).toBeCloseTo(originalNoise, 12);
      const originalQuantile = probabilityAtAction(sample.action, original.actions, original.densities[sample.periodIndex]!);
      const nextQuantile = probabilityAtAction(next.action, changed.actions, changed.densities[next.periodIndex]!);
      expect(nextQuantile).toBeCloseTo(originalQuantile, 11);
      if (next.action !== sample.action) moved += 1;
    });
    expect(moved).toBeGreaterThan(300);
  });

  it('keeps every displayed response inside one common response extent', () => {
    for (const config of [DEFAULT_CONFIG, { baselineDrift: 0, loggingDrift: 0 }, { baselineDrift: 1.2, loggingDrift: 1 }]) {
      const model = buildModel(config);
      const [minimum, maximum] = model.responseExtent;
      expect(Number.isFinite(minimum) && Number.isFinite(maximum)).toBe(true);
      expect(maximum).toBeGreaterThan(minimum);
      for (const value of [...model.responses.flat(), ...model.pooled, ...model.samples.map((sample) => sample.response)]) {
        expect(value).toBeGreaterThanOrEqual(minimum);
        expect(value).toBeLessThanOrEqual(maximum);
      }
    }
  });

  it('copies the input config so later UI mutation cannot change a built model', () => {
    const config = { baselineDrift: 1, loggingDrift: 1 };
    const model = buildModel(config);
    config.baselineDrift = 0;
    expect(model.config.baselineDrift).toBe(1);
    expect(model.pooledAction).toBe(0.2175);
  });

  it.each([-0.01, 1.2001, NaN, Infinity, -Infinity])('rejects invalid baseline drift %s', (baselineDrift) => {
    expect(() => buildModel({ baselineDrift, loggingDrift: 1 })).toThrow(RangeError);
  });
  it.each([-0.01, 1.0001, NaN, Infinity, -Infinity])('rejects invalid logging drift %s', (loggingDrift) => {
    expect(() => buildModel({ baselineDrift: 1, loggingDrift })).toThrow(RangeError);
  });
});

describe('shared view selector', () => {
  it('projects selected slice, weights and responses from the same model', () => {
    const model = buildModel();
    const view = selectView(model, 2, 100);
    expect(view.model).toBe(model);
    expect(view.action).toBe(0.25);
    expect(view.curve).toBe(model.responses[2]);
    expect(view.mixture).toEqual(model.periodWeights.map((row) => row[100]));
    expect(view.sameActionResponses).toEqual(model.responses.map((row) => row[100]));
    expect(view.mixture.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
  });
  it.each([-1, 7, 0.5, NaN])('rejects invalid period selection %s', (index) => {
    expect(() => selectView(buildModel(), index, 200)).toThrow(RangeError);
  });
  it.each([-1, 401, 0.5, NaN])('rejects invalid action selection %s', (index) => {
    expect(() => selectView(buildModel(), 3, index)).toThrow(RangeError);
  });
});
