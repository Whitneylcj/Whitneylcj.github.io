import type { ModelData } from '../model';

export interface ViewData {
  model: ModelData;
  periodIndex: number;
  actionIndex: number;
  action: number;
  curve: number[];
  mixture: number[];
  sameActionResponses: number[];
}

/** The shared projection from semantic UI selection to model data. */
export function selectView(model: ModelData, periodIndex: number, actionIndex: number): ViewData {
  if (!Number.isInteger(periodIndex) || periodIndex < 0 || periodIndex >= model.times.length) {
    throw new RangeError('Period index is outside the observed periods');
  }
  if (!Number.isInteger(actionIndex) || actionIndex < 0 || actionIndex >= model.actions.length) {
    throw new RangeError('Action index is outside the supported grid');
  }
  return {
    model,
    periodIndex,
    actionIndex,
    action: model.actions[actionIndex]!,
    curve: model.responses[periodIndex]!,
    mixture: model.periodWeights.map((weights) => weights[actionIndex]!),
    sameActionResponses: model.responses.map((response) => response[actionIndex]!),
  };
}

// These selectors contain display projections, not response/estimator formulas.
import type { GeometryComparison } from '../model/geometry';
import type { FrozenHistory, FutureAudit } from '../model/future';
import type { GeometryPhase } from './reducer';
import type { ScenePresentation } from './presentation';

function displayExtent(curves: number[][], includeZero: boolean): [number,number] {
  const values = curves.flat();
  const min = Math.min(...values, ...(includeZero ? [0] : []));
  const max = Math.max(...values, ...(includeZero ? [0] : []));
  const padding = Math.max((max-min)*.1, .08);
  return [min-padding,max+padding];
}

export function geometryPresentation(model: ModelData, comparison: GeometryComparison,
  link: 'identity'|'log', phase: GeometryPhase, anchor: number): ScenePresentation | null {
  const fit = comparison[link];
  if (fit.status !== 'ok') return null;
  const curves = phase === 'linked' ? fit.linkedCurves : phase === 'anchored' ? fit.contrasts : fit.normalized;
  const geometry = phase === 'normalized' ? fit.rho : null;
  return { kind: 'geometry', actions:model.actions, times:model.times, curves,
    yExtent:displayExtent(geometry ? [...curves,geometry] : curves, phase !== 'linked'),
    yLabel:phase === 'linked' ? (link === 'log' ? 'Log response' : 'Response')
      : phase === 'anchored' ? `${link === 'log' ? 'Log' : 'Identity'} linked contrast` : 'Normalized linked contrast',
    anchor,showAnchor:phase !== 'linked',collapse:phase === 'normalized',geometry,
    geometryAction:fit.action,assumedFuture:null,revealedFuture:null,futureOracleAction:null,futureTime:1.3 };
}

/** Future audit is supplied only after explicit reveal; null contains no future truth. */
export function futurePresentation(frozen:FrozenHistory, audit:FutureAudit|null):ScenePresentation {
  const revealed = audit?.status === 'ok' ? audit.normalizedTruth : null;
  const curves = frozen.fit.normalized;
  return {kind:'future', actions:frozen.model.actions,times:frozen.model.times,curves,
    yExtent:displayExtent([...curves,frozen.fit.rho,...(revealed ? [revealed] : [])],true),
    yLabel:'Scaled linked contrast',anchor:frozen.anchor,showAnchor:true,collapse:false,
    geometry:null,geometryAction:frozen.fit.action,assumedFuture:frozen.fit.rho,revealedFuture:revealed,
    futureOracleAction:audit?.status==='ok' ? audit.oracleAction : null,futureTime:1.3 };
}
