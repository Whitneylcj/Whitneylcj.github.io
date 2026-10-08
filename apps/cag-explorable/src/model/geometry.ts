import { argmax } from './pooling';
import { responseAt } from './response';
import type { ModelData } from './types';

export type Link = 'identity' | 'log';

export interface OkGeometryFit {
  status: 'ok';
  link: Link;
  anchor: number;
  linkedCurves: number[][];
  contrasts: number[][];
  normalized: number[][];
  rho: number[];
  amplitudes: number[];
  loss: number;
  action: number;
  actionIndex: number;
  anchorValue: 0;
  rhoNorm: number;
  /** rho is this exact linear combination of analytically anchored contrasts. */
  coefficients: number[];
}

export type GeometryFit = OkGeometryFit | {
  status: 'no-signal' | 'invalid-link';
  link: Link;
  anchor: number;
  message: string;
};

export interface GeometryComparison {
  identity: GeometryFit;
  log: GeometryFit;
  selectedLink: Link | null;
  tie: boolean;
  gap: number | null;
  selected: OkGeometryFit | null;
}

const ENERGY_TOLERANCE = 1e-12;
const DIRECTION_TOLERANCE = 1e-14;
const LINK_TIE_TOLERANCE = 1e-8;

/** Compensated summation keeps the browser and offline quadrature aligned. */
function sum(values: readonly number[]): number {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const next = total + value;
    correction += Math.abs(total) >= Math.abs(value) ? (total - next) + value : (value - next) + total;
    total = next;
  }
  return total + correction;
}

function dot(left: readonly number[], right: readonly number[]): number {
  return sum(left.map((value, index) => value * right[index]!));
}

export function weightedDot(left: readonly number[], right: readonly number[], weights: readonly number[]): number {
  if (left.length !== right.length || left.length !== weights.length) {
    throw new RangeError('Weighted vectors must use the same quadrature grid');
  }
  return sum(left.map((value, index) => value * right[index]! * weights[index]!));
}

/** The denominator is required even for a direction intended to have unit norm. */
export function positiveAmplitude(
  contrast: readonly number[], rho: readonly number[], weights: readonly number[],
): number {
  const squaredNorm = weightedDot(rho, rho, weights);
  if (!Number.isFinite(squaredNorm) || squaredNorm <= DIRECTION_TOLERANCE ** 2) {
    throw new RangeError('A positive profiler requires a finite nonzero direction');
  }
  const cross = weightedDot(contrast, rho, weights);
  if (!Number.isFinite(cross)) throw new RangeError('A positive profiler requires finite contrasts');
  return Math.max(0, cross / squaredNorm);
}

export function applyLink(value: number, link: Link): number {
  return link === 'identity' ? value : Math.log(value);
}

function validateAnchor(anchor: number): void {
  if (!Number.isFinite(anchor) || anchor < 0 || anchor > 1) {
    throw new RangeError('Reference action must be finite and inside [0, 1]');
  }
}

export interface GeometryCurves {
  actions: readonly number[];
  quadrature: readonly number[];
  curves: readonly (readonly number[])[];
  /** Raw response at the exact anchor; never a nearest-grid substitute. */
  anchorValues: readonly number[];
  anchor: number;
  link: Link;
}

/**
 * Known-curve teaching fit, not an observational or general nonconvex estimator.
 * The teaching family has positively aligned contrasts. Power iteration starts
 * in their aligned cone, with no arbitrary sign normalization.
 */
export function fitGeometryCurves(input: GeometryCurves): GeometryFit {
  const { actions, quadrature: weights, curves, anchorValues, anchor, link } = input;
  validateAnchor(anchor);
  if (link !== 'identity' && link !== 'log') throw new RangeError('Unknown response link');
  if (actions.length < 2 || weights.length !== actions.length || curves.length === 0 ||
      anchorValues.length !== curves.length || curves.some((curve) => curve.length !== actions.length) ||
      actions.some((value) => !Number.isFinite(value)) ||
      weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    throw new RangeError('Geometry requires nonempty curves and one shared positive quadrature grid');
  }
  const raw = [...curves.flat(), ...anchorValues];
  if (raw.some((value) => !Number.isFinite(value) || (link === 'log' && value <= 0))) {
    return { status: 'invalid-link', link, anchor,
      message: link === 'log' ? 'Log requires positive response curves and a positive anchor response.'
        : 'Response curves and anchor responses must be finite.' };
  }
  const linkedCurves = curves.map((curve) => curve.map((value) => applyLink(value, link)));
  const contrasts = linkedCurves.map((curve, index) => {
    const anchorValue = applyLink(anchorValues[index]!, link);
    return curve.map((value) => value - anchorValue);
  });
  const energies = contrasts.map((curve) => weightedDot(curve, curve, weights));
  const active = energies.flatMap((energy, index) => energy > ENERGY_TOLERANCE ? [index] : []);
  const noSignal = (): GeometryFit => ({ status: 'no-signal', link, anchor,
    message: 'No action signal: a decision geometry is not identified.' });
  if (active.length === 0) return noSignal();
  const sqrtWeights = weights.map(Math.sqrt);
  const whitened = active.map((index) => contrasts[index]!.map((value, j) =>
    value * sqrtWeights[j]! / Math.sqrt(energies[index]!)));

  function direction(scales: number[]): { vector: number[]; coefficients: number[] } | null {
    const average = actions.map((_, j) =>
      sum(whitened.map((row, i) => scales[i]! * row[j]!)) / active.length);
    const norm = Math.sqrt(dot(average, average));
    if (!Number.isFinite(norm) || norm <= DIRECTION_TOLERANCE) return null;
    const coefficients = curves.map(() => 0);
    active.forEach((period, i) => {
      coefficients[period] = scales[i]! / (active.length * Math.sqrt(energies[period]!) * norm);
    });
    return { vector: average.map((value) => value / norm), coefficients };
  }

  let current = direction(active.map(() => 1));
  if (!current) return noSignal();
  for (let iteration = 0; iteration < 600; iteration += 1) {
    const scales = whitened.map((row) => Math.max(0, dot(row, current!.vector)));
    const next = direction(scales);
    if (!next) return noSignal();
    const change = next.vector.map((value, index) => value - current!.vector[index]!);
    const error = Math.sqrt(dot(change, change));
    current = next;
    if (error < 1e-12) break;
  }
  const rho = current.vector.map((value, index) => value / sqrtWeights[index]!);
  const amplitudes = contrasts.map((curve) => positiveAmplitude(curve, rho, weights));
  const losses = active.map((period) => {
    const residual = contrasts[period]!.map((value, index) => value - amplitudes[period]! * rho[index]!);
    return weightedDot(residual, residual, weights) / energies[period]!;
  });
  const normalized = contrasts.map((curve, period) => amplitudes[period]! > DIRECTION_TOLERANCE
    ? curve.map((value) => value / amplitudes[period]!) : curve.map(() => 0));
  const actionIndex = argmax(rho);
  return { status: 'ok', link, anchor, linkedCurves, contrasts, normalized, rho, amplitudes,
    loss: sum(losses) / losses.length, action: actions[actionIndex]!, actionIndex,
    anchorValue: 0, rhoNorm: Math.sqrt(weightedDot(rho, rho, weights)), coefficients: current.coefficients };
}

export function fitGeometry(model: ModelData, anchor: number, link: Link): GeometryFit {
  return fitGeometryCurves({ actions: model.actions, quadrature: model.quadrature,
    curves: model.responses, anchorValues: model.times.map((time) => responseAt(anchor, time, model.config)),
    anchor, link });
}

/** Exact evaluation preserves rho(a0)=0 for anchors between grid points. */
export function rhoAt(model: ModelData, fit: OkGeometryFit, action: number): number {
  validateAnchor(action);
  return sum(model.times.map((time, period) => fit.coefficients[period]! * (
    applyLink(responseAt(action, time, model.config), fit.link) -
    applyLink(responseAt(fit.anchor, time, model.config), fit.link))));
}

export function compareGeometry(model: ModelData, anchor: number): GeometryComparison {
  const identity = fitGeometry(model, anchor, 'identity');
  const log = fitGeometry(model, anchor, 'log');
  if (identity.status === 'ok' && log.status === 'ok') {
    const gap = Math.abs(identity.loss - log.loss);
    const tie = gap < LINK_TIE_TOLERANCE;
    // UI preference in a tie is deterministic; it does not identify a unique link.
    const selected = tie || identity.loss < log.loss ? identity : log;
    return { identity, log, selected, selectedLink: selected.link, tie, gap };
  }
  const selected = identity.status === 'ok' ? identity : log.status === 'ok' ? log : null;
  return { identity, log, selected, selectedLink: selected?.link ?? null, tie: false, gap: null };
}
