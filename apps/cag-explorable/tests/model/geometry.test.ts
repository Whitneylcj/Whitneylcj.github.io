import { describe, expect, it } from 'vitest';
import golden from '../../fixtures/golden.json';
import { buildModel, presetConfig } from '../../src/model';
import { compareGeometry, fitGeometry, fitGeometryCurves, positiveAmplitude, rhoAt, weightedDot } from '../../src/model/geometry';
import type { GeometryFit, OkGeometryFit } from '../../src/model/geometry';
import type { ModelConfig } from '../../src/model';
import { responseAt } from '../../src/model/response';

function ok(fit: GeometryFit): OkGeometryFit {
  if (fit.status !== 'ok') throw new Error(fit.message);
  return fit;
}

const cases = [
  { name: 'additive_default', config: presetConfig('additive') },
  { name: 'no_baseline_drift', config: { ...presetConfig('additive'), baselineDrift: 0 } },
  { name: 'no_logging_drift', config: { ...presetConfig('additive'), loggingDrift: 0 } },
  { name: 'log_with_amplitude_drift', config: presetConfig('log-amplitude') },
  { name: 'pure_multiplicative_tie', config: presetConfig('multiplicative') },
] as const;

describe('P2 known-curve geometry', () => {
  it.each(cases)('matches both fitted scales and selection for $name', ({ name, config }) => {
    const expected = golden.presets[name];
    const model = buildModel(config);
    const comparison = compareGeometry(model, 0.5);
    const identity = ok(comparison.identity);
    const log = ok(comparison.log);
    expect(model.pooledAction).toBeCloseTo(expected.pooled_action, 12);
    expect(identity.action).toBe(expected.identity_action);
    expect(log.action).toBe(expected.log_action);
    for (const [fit, loss] of [[identity, expected.identity_loss], [log, expected.log_loss]] as const) {
      expect(Math.abs(fit.loss - loss)).toBeLessThan(1e-10);
      if (loss > 1e-10) expect(Math.abs(fit.loss / loss - 1)).toBeLessThan(1e-8);
      expect(fit.rhoNorm).toBeCloseTo(1, 13);
      expect(fit.amplitudes.every((value) => value >= 0)).toBe(true);
    }
    expect(comparison.selectedLink).toBe(expected.selected_link);
    expect(comparison.tie).toBe(expected.link_tie);
  });

  it.each(['additive', 'log-amplitude'] as const)('aligns correctly linked %s curves using positive profiling', (preset) => {
    const model = buildModel(presetConfig(preset));
    const fit = ok(fitGeometry(model, 0.5, preset === 'additive' ? 'identity' : 'log'));
    for (const normalized of fit.normalized) {
      normalized.forEach((value, index) => expect(value).toBeCloseTo(fit.rho[index]!, 11));
    }
    expect(fit.action).toBe(0.68);
    expect(fit.anchorValue).toBe(0);
  });

  it('treats pure multiplicative drift as both scales fitting, with deterministic identity preference', () => {
    const comparison = compareGeometry(buildModel(presetConfig('multiplicative')), 0.5);
    expect(comparison.tie).toBe(true);
    expect(comparison.gap).toBeLessThan(1e-8);
    expect(comparison.selectedLink).toBe('identity');
    expect(ok(comparison.identity).action).toBe(ok(comparison.log).action);
  });

  it.each([0, 0.33313, 0.50071, 0.68, 1])('anchors analytically at off-grid or endpoint reference %s without altering the data', (anchor) => {
    const model = buildModel(presetConfig('log-amplitude'));
    const before = structuredClone(model);
    for (const link of ['identity', 'log'] as const) {
      const fit = ok(fitGeometry(model, anchor, link));
      expect(rhoAt(model, fit, anchor)).toBe(0);
      expect(fit.action).toBe(0.68);
      for (const index of [0, 133, 200, 272, 400]) {
        expect(rhoAt(model, fit, model.actions[index]!)).toBeCloseTo(fit.rho[index]!, 11);
      }
      fit.contrasts.forEach((curve, period) => {
        const rawAnchor = responseAt(anchor, model.times[period]!, model.config);
        const linkedAnchor = link === 'identity' ? rawAnchor : Math.log(rawAnchor);
        expect(curve[200]).toBeCloseTo(fit.linkedCurves[period]![200]! - linkedAnchor, 13);
      });
    }
    expect(model).toEqual(before);
    expect(Object.hasOwn(model.config, 'anchor')).toBe(false);
  });

  it('retains the positive response direction rather than normalizing its sign arbitrarily', () => {
    const fit = ok(fitGeometryCurves({ actions: [0, 0.5, 1], quadrature: [0.25, 0.5, 0.25],
      curves: [[4, 3, 2], [8, 6, 4]], anchorValues: [3, 6], anchor: 0.5, link: 'identity' }));
    expect(fit.rho[0]).toBeGreaterThan(0);
    expect(fit.rho[2]).toBeLessThan(0);
    expect(fit.action).toBe(0);
    expect(fit.amplitudes.every((value) => value > 0)).toBe(true);
    expect(fit.loss).toBeLessThan(1e-12);
  });

  it('profiles with the actual weighted norm denominator and is invariant to direction scale', () => {
    const model = buildModel();
    const fit = ok(fitGeometry(model, 0.5, 'identity'));
    const delta = fit.contrasts[0]!;
    const amplitude = positiveAmplitude(delta, fit.rho, model.quadrature);
    const scaled = fit.rho.map((value) => value * 3.7);
    const nextAmplitude = positiveAmplitude(delta, scaled, model.quadrature);
    expect(weightedDot(scaled, scaled, model.quadrature)).toBeCloseTo(3.7 ** 2, 12);
    expect(nextAmplitude).toBeCloseTo(amplitude / 3.7, 12);
    delta.forEach((_, index) => expect(nextAmplitude * scaled[index]!).toBeCloseTo(amplitude * fit.rho[index]!, 12));
    expect(positiveAmplitude(delta.map((value) => -value), fit.rho, model.quadrature)).toBe(0);
    expect(() => positiveAmplitude(delta, delta.map(() => 0), model.quadrature)).toThrow(RangeError);
  });

  it.each(['identity', 'log'] as const)('returns explicit no action signal on constant %s curves', (link) => {
    const fit = fitGeometryCurves({ actions: [0, 0.5, 1], quadrature: [0.25, 0.5, 0.25],
      curves: [[4, 4, 4], [2, 2, 2]], anchorValues: [4, 2], anchor: 0.33313, link });
    expect(fit.status).toBe('no-signal');
    expect(JSON.stringify(fit)).not.toContain('NaN');
  });

  it('does not divide a zero-energy period by zero when other periods contain signal', () => {
    const fit = ok(fitGeometryCurves({ actions: [0, 0.5, 1], quadrature: [0.25, 0.5, 0.25],
      curves: [[4, 4, 4], [4, 3, 2]], anchorValues: [4, 3], anchor: 0.5, link: 'identity' }));
    expect(fit.amplitudes[0]).toBe(0);
    expect(fit.normalized[0]).toEqual([0, 0, 0]);
    expect([...fit.rho, ...fit.normalized.flat(), fit.loss].every(Number.isFinite)).toBe(true);
  });

  it.each([
    { curves: [[1, 0, 2]], anchorValues: [1] },
    { curves: [[1, 2, 3]], anchorValues: [0] },
    { curves: [[1, -0.1, 2]], anchorValues: [1] },
  ])('rejects log on any nonpositive curve or exact anchor', ({ curves, anchorValues }) => {
    const fit = fitGeometryCurves({ actions: [0, 0.5, 1], quadrature: [0.25, 0.5, 0.25],
      curves, anchorValues, anchor: 0.33313, link: 'log' });
    expect(fit.status).toBe('invalid-link');
    expect(JSON.stringify(fit)).not.toContain('NaN');
  });

  it.each([-0.01, 1.01, NaN, Infinity])('rejects unsupported reference action %s', (anchor) => {
    expect(() => fitGeometry(buildModel(), anchor, 'identity')).toThrow(RangeError);
  });
});

describe('P2 raw-model extension', () => {
  it('resolves omitted parameters to the original P1 model', () => {
    expect(buildModel().config).toEqual({ mode: 'additive', baselineDrift: 1, loggingDrift: 1, amplitudeDrift: 0 });
    expect(buildModel({ baselineDrift: 1, loggingDrift: 1 })).toEqual(buildModel(presetConfig('additive')));
    expect(presetConfig('log-amplitude').amplitudeDrift).toBe(0.45);
  });

  it('reuses exactly the same latent normal draws across additive and mean-corrected log samples', () => {
    const additive = buildModel();
    const log = buildModel(presetConfig('log-amplitude'));
    additive.samples.forEach((sample, index) => {
      const logSample = log.samples[index]!;
      expect(logSample.action).toBe(sample.action);
      expect(logSample.response).toBeGreaterThan(0);
      const time = additive.times[sample.periodIndex]!;
      const latentNoise = sample.response - responseAt(sample.action, time, additive.config);
      const logNoise = Math.log(logSample.response / responseAt(logSample.action, time, log.config));
      expect(logNoise).toBeCloseTo(latentNoise - 0.12 ** 2 / 2, 12);
    });
    expect(buildModel(presetConfig('log-amplitude')).samples).toEqual(log.samples);
  });

  it.each([-0.01, 0.451, NaN, Infinity])('rejects unsupported amplitude drift %s', (amplitudeDrift) => {
    expect(() => buildModel({ baselineDrift: 1, loggingDrift: 1, amplitudeDrift })).toThrow(RangeError);
  });

  it('rejects an unsupported generating mode', () => {
    expect(() => buildModel({ baselineDrift: 1, loggingDrift: 1, mode: 'sqrt' } as unknown as ModelConfig)).toThrow(RangeError);
  });
});
