import { describe, expect, it } from 'vitest';
import golden from '../../fixtures/golden.json';
import { buildModel, presetConfig } from '../../src/model';
import { compareGeometry } from '../../src/model/geometry';
import { auditFuture, defaultFutureConfig, freezeHistory } from '../../src/model/future';
import type { FutureAudit, FutureConfig, OkFutureAudit } from '../../src/model/future';

function ok(audit: FutureAudit): OkFutureAudit {
  if (audit.status !== 'ok') throw new Error(audit.message);
  return audit;
}

const cases = [
  { name: 'additive_default', config: presetConfig('additive') },
  { name: 'no_baseline_drift', config: { ...presetConfig('additive'), baselineDrift: 0 } },
  { name: 'no_logging_drift', config: { ...presetConfig('additive'), loggingDrift: 0 } },
  { name: 'log_with_amplitude_drift', config: presetConfig('log-amplitude') },
  { name: 'pure_multiplicative_tie', config: presetConfig('multiplicative') },
] as const;

describe('P2 frozen-history future truth audit', () => {
  it.each(cases)('matches all three offline future audits for $name on the selected historical scale', ({ name, config }) => {
    const model = buildModel(config);
    const frozen = freezeHistory(model, compareGeometry(model, 0.5), 0.5);
    for (const expected of golden.presets[name].future_audits) {
      const audit = ok(auditFuture(frozen, { ...defaultFutureConfig(model.config.mode), shock: expected.shock }));
      expect(audit.oracleAction).toBe(expected.oracle_action);
      expect(audit.geometryAction).toBe(expected.geometry_action);
      expect(audit.pooledAction).toBe(expected.pooled_action);
      expect(audit.geometryRawRegret).toBeCloseTo(expected.geometry_raw_regret, 10);
      expect(audit.pooledRawRegret).toBeCloseTo(expected.pooled_raw_regret, 10);
      expect(audit.geometryLinkedRegret).toBeCloseTo(expected.geometry_linked_regret, 10);
      expect(audit.twiceSupResidual).toBeCloseTo(expected.twice_true_sup_residual, 10);
      expect(audit.geometryLinkedRegret).toBeLessThanOrEqual(audit.twiceSupResidual + 1e-10);
      expect(audit.mismatch).toBeGreaterThanOrEqual(0);
      expect(audit.mismatch).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it('freezes independent recursively immutable historical data, selection and geometry', () => {
    const model = buildModel();
    const comparison = compareGeometry(model, 0.5);
    const frozen = freezeHistory(model, comparison, 0.5);
    const before = JSON.stringify(frozen);
    expect(frozen.model).not.toBe(model);
    expect(frozen.fit).not.toBe(comparison.selected);
    expect(frozen.fit).toBe(frozen.comparison.selected);
    expect(Object.isFrozen(frozen.model.responses[0])).toBe(true);
    expect(Object.isFrozen(frozen.model.config)).toBe(true);
    expect(Object.isFrozen(frozen.fit.coefficients)).toBe(true);
    model.config.baselineDrift = 0;
    model.responses[0]![0] = 999;
    comparison.selected!.loss = 999;
    expect(() => { frozen.fit.rho[0] = 999; }).toThrow(TypeError);
    for (const shock of [0, 1.2, 2.4]) {
      for (const offset of [3, 5.2, 8]) {
        const audit = ok(auditFuture(frozen, { offset, amplitude: 0.9, shock }));
        expect(audit.geometryAction).toBe(0.68);
      }
    }
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it.each(['additive', 'log-amplitude', 'multiplicative'] as const)('keeps the decision fixed under unknown future calibration for %s', (preset) => {
    const model = buildModel(presetConfig(preset));
    const frozen = freezeHistory(model, compareGeometry(model, 0.33313), 0.33313);
    for (const offset of [model.config.mode === 'log' ? 0.7 : 3, 4, 7]) {
      for (const amplitude of [0.3, 0.9, 1.6]) {
        const audit = ok(auditFuture(frozen, { offset, amplitude, shock: 0 }));
        expect(audit.oracleAction).toBe(0.68);
        expect(audit.geometryAction).toBe(0.68);
        expect(audit.geometryRawRegret).toBe(0);
      }
    }
  });

  it('lets a future-only shape change defeat the fixed historical action', () => {
    const model = buildModel();
    const frozen = freezeHistory(model, compareGeometry(model, 0.5), 0.5);
    const persistent = ok(auditFuture(frozen, defaultFutureConfig('additive')));
    const changed = ok(auditFuture(frozen, { ...defaultFutureConfig('additive'), shock: 2.4 }));
    expect(persistent.geometryRawRegret).toBe(0);
    expect(changed.oracleAction).toBe(0.3475);
    expect(changed.geometryAction).toBe(0.68);
    expect(changed.geometryRawRegret).toBeCloseTo(0.3999975, 12);
    expect(changed.pooledRawRegret).toBeLessThan(changed.geometryRawRegret);
    expect(changed.mismatch).toBeGreaterThan(0);
  });

  it('retains the nonzero identity residual in the multiplicative tie despite zero persistent-future regret', () => {
    const model = buildModel(presetConfig('multiplicative'));
    const comparison = compareGeometry(model, 0.5);
    const frozen = freezeHistory(model, comparison, 0.5);
    const audit = ok(auditFuture(frozen, defaultFutureConfig('log')));
    expect(comparison.tie).toBe(true);
    expect(frozen.selectedLink).toBe('identity');
    expect(audit.geometryAction).toBe(0.68);
    expect(audit.geometryRawRegret).toBe(0);
    expect(audit.mismatch).toBeGreaterThan(0);
    expect(audit.twiceSupResidual).toBeCloseTo(0.08635371410242865, 11);
  });

  it('uses the actual rho norm for future profiling, preserving the audit under positive rescaling', () => {
    const model = buildModel();
    const frozen = freezeHistory(model, compareGeometry(model, 0.5), 0.5);
    const scaled = { ...frozen, fit: { ...frozen.fit,
      rho: frozen.fit.rho.map((value) => value * 3.7),
      coefficients: frozen.fit.coefficients.map((value) => value * 3.7),
      rhoNorm: frozen.fit.rhoNorm * 3.7 } };
    const config = { ...defaultFutureConfig('additive'), shock: 2.4 };
    const first = ok(auditFuture(frozen, config));
    const second = ok(auditFuture(scaled, config));
    expect(second.profiledAmplitude).toBeCloseTo(first.profiledAmplitude / 3.7, 12);
    expect(second.twiceSupResidual).toBeCloseTo(first.twiceSupResidual, 12);
    expect(second.mismatch).toBeCloseTo(first.mismatch, 12);
    first.residual.forEach((value, index) => expect(second.residual[index]).toBeCloseTo(value, 12));
  });

  it('reports zero positive future scale explicitly without producing NaN normalized values', () => {
    const model = buildModel();
    const frozen = freezeHistory(model, compareGeometry(model, 0), 0);
    const audit = ok(auditFuture(frozen, { offset: 5.2, amplitude: 0.01, shock: 2.4 }));
    expect(audit.profiledAmplitude).toBe(0);
    expect(audit.normalizedTruth).toBeNull();
    expect(audit.geometryLinkedRegret).toBeLessThanOrEqual(audit.twiceSupResidual);
    expect([...audit.truth, ...audit.residual, audit.mismatch].every(Number.isFinite)).toBe(true);
  });

  it('rejects a future that is nonpositive on a frozen log scale without refitting it', () => {
    const model = buildModel(presetConfig('log-amplitude'));
    const frozen = freezeHistory(model, compareGeometry(model, 0.5), 0.5);
    // An underflowed exponent is zero, invalid for the frozen log link.
    expect(auditFuture(frozen, { offset: -750, amplitude: 0.9, shock: 0 }).status).toBe('invalid-link');
    expect(frozen.selectedLink).toBe('log');
    expect(frozen.fit.action).toBe(0.68);
  });

  it('reports exponential overflow and numerically vanished future signal explicitly', () => {
    const model = buildModel(presetConfig('log-amplitude'));
    const frozen = freezeHistory(model, compareGeometry(model, 0.5), 0.5);
    expect(auditFuture(frozen, { offset: 750, amplitude: 0.9, shock: 0 }).status).toBe('invalid-future');
    expect(auditFuture(frozen, { offset: 1, amplitude: 1e-20, shock: 0 }).status).toBe('no-signal');
  });

  it('requires an identified historical geometry and matching anchor before freezing', () => {
    const model = buildModel();
    const comparison = compareGeometry(model, 0.5);
    expect(() => freezeHistory(model, comparison, 0.33313)).toThrow(RangeError);
    expect(() => freezeHistory(model, { ...comparison, selected: null, selectedLink: null }, 0.5)).toThrow(RangeError);
  });

  it.each([
    { offset: NaN, amplitude: 0.9, shock: 0 },
    { offset: Infinity, amplitude: 0.9, shock: 0 },
    { offset: 5.2, amplitude: 0, shock: 0 },
    { offset: 5.2, amplitude: -0.1, shock: 0 },
    { offset: 5.2, amplitude: Infinity, shock: 0 },
    { offset: 5.2, amplitude: 0.9, shock: -0.01 },
    { offset: 5.2, amplitude: 0.9, shock: 2.4001 },
    { offset: 5.2, amplitude: 0.9, shock: NaN },
  ] satisfies FutureConfig[])('rejects unsupported future calibration $offset / $amplitude / $shock', (config) => {
    const model = buildModel();
    expect(() => auditFuture(freezeHistory(model, compareGeometry(model, 0.5), 0.5), config)).toThrow(RangeError);
  });
});
