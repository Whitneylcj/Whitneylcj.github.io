import { applyLink, positiveAmplitude, weightedDot } from './geometry';
import type { GeometryComparison, Link, OkGeometryFit } from './geometry';
import { argmax } from './pooling';
import { rawShape } from './response';
import type { ModelData, ResponseMode } from './types';

export interface FutureConfig {
  offset: number;
  amplitude: number;
  shock: number;
}

export interface FrozenHistory {
  readonly model: ModelData;
  readonly anchor: number;
  readonly comparison: GeometryComparison;
  readonly fit: OkGeometryFit;
  readonly selectedLink: Link;
}

export interface OkFutureAudit {
  status: 'ok';
  truth: number[];
  linkedContrast: number[];
  /** Revealed diagnostic only. Null means the positive fitted scale is zero. */
  normalizedTruth: number[] | null;
  residual: number[];
  oracleAction: number;
  oracleIndex: number;
  geometryAction: number;
  geometryIndex: number;
  pooledAction: number;
  geometryRawRegret: number;
  pooledRawRegret: number;
  geometryLinkedRegret: number;
  twiceSupResidual: number;
  /** Dimensionless ||residual||_w / ||future linked contrast||_w. */
  mismatch: number;
  profiledAmplitude: number;
}

export type FutureAudit = OkFutureAudit | {
  status: 'invalid-link' | 'invalid-future' | 'no-signal';
  message: string;
};

export function defaultFutureConfig(mode: ResponseMode): FutureConfig {
  return { offset: mode === 'additive' ? 5.2 : 1, amplitude: 0.9, shock: 0 };
}

/** New arrays and config objects ensure subsequent historical edits cannot leak in. */
function immutableSnapshot<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => immutableSnapshot(entry))) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const snapshot = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, immutableSnapshot(entry)]));
    return Object.freeze(snapshot) as T;
  }
  return value;
}

export function freezeHistory(model: ModelData, comparison: GeometryComparison, anchor: number): FrozenHistory {
  if (!comparison.selected || !comparison.selectedLink) {
    throw new RangeError('A future branch requires an identified historical geometry');
  }
  if (!Number.isFinite(anchor) || anchor < 0 || anchor > 1 || comparison.selected.anchor !== anchor ||
      comparison.selected.link !== comparison.selectedLink) {
    throw new RangeError('A future branch must freeze its matching historical anchor and selected link');
  }
  const snapshot = immutableSnapshot(comparison);
  return Object.freeze({ model: immutableSnapshot(model), comparison: snapshot,
    anchor, fit: snapshot.selected!, selectedLink: snapshot.selectedLink! });
}

function validateFuture(config: FutureConfig): void {
  if (!Number.isFinite(config.offset)) throw new RangeError('Future offset must be finite');
  if (!Number.isFinite(config.amplitude) || config.amplitude <= 0) {
    throw new RangeError('Future amplitude must be finite and positive');
  }
  if (!Number.isFinite(config.shock) || config.shock < 0 || config.shock > 2.4) {
    throw new RangeError('Future-only shape shock must be finite and between 0 and 2.4');
  }
}

/**
 * One-way future truth audit. This function never fits or selects a history link.
 * Its result must stay hidden until Reveal; it is a simulated truth diagnostic,
 * not a predicted outcome level or an operational confidence certificate.
 */
export function auditFuture(frozen: FrozenHistory, config: FutureConfig): FutureAudit {
  validateFuture(config);
  const { model, anchor, fit, selectedLink } = frozen;
  const generatingLinked = (action: number): number =>
    config.offset + config.amplitude * rawShape(action) - config.shock * (action - 0.5);
  const generatingResponse = (action: number): number => {
    const value = generatingLinked(action);
    return model.config.mode === 'log' ? Math.exp(value) : value;
  };
  const truth = model.actions.map(generatingResponse);
  const anchorResponse = generatingResponse(anchor);
  if ([...truth, anchorResponse].some((value) => !Number.isFinite(value))) {
    return { status: 'invalid-future', message: 'The future calibration exceeds finite numerical response values.' };
  }
  if (selectedLink === 'log' && [...truth, anchorResponse].some((value) => value <= 0)) {
    return { status: 'invalid-link', message: 'The frozen log scale requires positive future responses across support.' };
  }
  const linkedAnchor = applyLink(anchorResponse, selectedLink);
  const linkedContrast = truth.map((value) => applyLink(value, selectedLink) - linkedAnchor);
  const contrastEnergy = weightedDot(linkedContrast, linkedContrast, model.quadrature);
  if (contrastEnergy <= 1e-12) {
    return { status: 'no-signal', message: 'No numerically resolved future action signal for this calibration.' };
  }
  const profiledAmplitude = positiveAmplitude(linkedContrast, fit.rho, model.quadrature);
  const residual = linkedContrast.map((value, index) => value - profiledAmplitude * fit.rho[index]!);
  const oracleIndex = argmax(truth);
  // These decisions were made on history. Future truth never updates either.
  const geometryIndex = fit.actionIndex;
  const pooledIndex = model.pooledIndex;
  return {
    status: 'ok', truth, linkedContrast,
    normalizedTruth: profiledAmplitude > 1e-14 ? linkedContrast.map((value) => value / profiledAmplitude) : null,
    residual, oracleIndex, oracleAction: model.actions[oracleIndex]!,
    geometryIndex, geometryAction: fit.action, pooledAction: model.pooledAction,
    geometryRawRegret: truth[oracleIndex]! - truth[geometryIndex]!,
    pooledRawRegret: truth[oracleIndex]! - truth[pooledIndex]!,
    geometryLinkedRegret: linkedContrast[oracleIndex]! - linkedContrast[geometryIndex]!,
    twiceSupResidual: 2 * Math.max(...residual.map(Math.abs)),
    mismatch: Math.sqrt(weightedDot(residual, residual, model.quadrature) / contrastEnergy),
    profiledAmplitude,
  };
}
