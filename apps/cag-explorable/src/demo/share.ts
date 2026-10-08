import type { Language } from '../content/locale';
import { buildModel } from '../model';
import { GRID_SIZE, PERIOD_COUNT, SAMPLE_SEED } from '../model/constants';
import { defaultFutureConfig, freezeHistory, type FutureConfig } from '../model/future';
import { compareGeometry, type Link } from '../model/geometry';
import { presetConfig, type PresetId } from '../model/presets';
import { defaultState, type DemoState, type GeometryPhase, type Stage } from './reducer';

/** Inputs only: no fitted arrays, future truth, camera pose, or revealed state. */
export interface SharedSnapshot {
  preset: PresetId;
  baselineDrift: number;
  loggingDrift: number;
  anchor: number;
  viewLink: Link;
  geometryPhase: GeometryPhase;
  stage: Stage;
  language: Language;
  actionIndex: number;
  periodIndex: number;
  showSamples: boolean;
  sameAction: boolean;
  future?: FutureConfig;
}

export type ShareDecodeResult = { status: 'empty' } | { status: 'ok'; snapshot: SharedSnapshot } |
  { status: 'invalid'; message: string };

const VERSION = '1';
const REQUIRED = ['cag', 'seed', 'preset', 'd', 'l', 'anchor', 'link', 'phase', 'stage', 'lang', 'action', 'period'];
const OPTIONAL = ['samples', 'same', 'offset', 'amplitude', 'shock'];
const ALLOWED = new Set([...REQUIRED, ...OPTIONAL]);
const isFuture = (stage: Stage) => stage === 'deploy' || stage === 'failure';

export function encodeShareState(state: DemoState): string {
  // An invalidated branch has no historical choice to share; return to its fit step.
  const stage = isFuture(state.stage) && !state.frozen ? 'geometry' : state.stage;
  const params = new URLSearchParams({
    cag: VERSION, seed: String(SAMPLE_SEED), preset: state.preset,
    d: String(state.config.baselineDrift), l: String(state.config.loggingDrift), anchor: String(state.anchor),
    link: state.viewLink, phase: state.geometryPhase, stage, lang: state.language,
    action: String(state.actionIndex), period: String(state.periodIndex),
    samples: state.showSamples ? '1' : '0', same: state.sameAction ? '1' : '0',
  });
  if (isFuture(stage) && state.frozen) {
    params.set('offset', String(state.future.offset));
    params.set('amplitude', String(state.future.amplitude));
    params.set('shock', String(state.future.shock));
  }
  const hash = `#${params.toString()}`;
  // Do not create a URL that cannot be restored by this version of the teaching site.
  const checked = decodeShareState(hash);
  if (checked.status !== 'ok') throw new RangeError(checked.status === 'invalid' ? checked.message : 'Missing share inputs');
  return hash;
}

function member<T extends string>(params: URLSearchParams, key: string, values: readonly T[]): T {
  const value = params.get(key);
  if (value === null || !values.includes(value as T)) throw new RangeError(`Invalid ${key} in shared experiment.`);
  return value as T;
}

function numberIn(params: URLSearchParams, key: string, min: number, max: number, integer = false): number {
  const text = params.get(key);
  // Number() alone accepts empty strings and hexadecimal inputs; they are not this schema.
  if (text === null || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
    throw new RangeError(`Invalid ${key} in shared experiment.`);
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`Out-of-range ${key} in shared experiment.`);
  }
  return value;
}

function flag(params: URLSearchParams, key: string, fallback: boolean): boolean {
  if (!params.has(key)) return fallback;
  return member(params, key, ['0', '1']) === '1';
}

/** Ordinary document anchors are harmless. A recognized but invalid CAG hash is explicit. */
export function decodeShareState(hash: string): ShareDecodeResult {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(value);
  if (!params.has('cag')) return { status: 'empty' };
  try {
    if (value.length > 2048) throw new RangeError('Shared experiment URL is too long.');
    for (const key of params.keys()) {
      if (!ALLOWED.has(key)) throw new RangeError('Unknown input in shared experiment.');
      if (params.getAll(key).length !== 1) throw new RangeError('Duplicate input in shared experiment.');
    }
    if (params.get('cag') !== VERSION) throw new RangeError('This shared experiment version is not supported.');
    if (params.get('seed') !== String(SAMPLE_SEED)) throw new RangeError('This shared experiment sample seed is not supported.');
    if (REQUIRED.some((key) => !params.has(key))) throw new RangeError('Shared experiment is missing required inputs.');
    const preset = member(params, 'preset', ['additive', 'log-amplitude', 'multiplicative']);
    const stage = member(params, 'stage', ['observe', 'pool', 'geometry', 'deploy', 'failure']);
    const snapshot: SharedSnapshot = {
      preset, stage,
      baselineDrift: numberIn(params, 'd', 0, 1.2), loggingDrift: numberIn(params, 'l', 0, 1),
      anchor: numberIn(params, 'anchor', 0, 1),
      viewLink: member(params, 'link', ['identity', 'log']),
      geometryPhase: member(params, 'phase', ['linked', 'anchored', 'normalized']),
      language: member(params, 'lang', ['en', 'zh']),
      actionIndex: numberIn(params, 'action', 0, GRID_SIZE - 1, true),
      periodIndex: numberIn(params, 'period', 0, PERIOD_COUNT - 1, true),
      showSamples: flag(params, 'samples', true), sameAction: flag(params, 'same', false),
    };
    const futureKeys = ['offset', 'amplitude', 'shock'];
    if (!isFuture(stage) && futureKeys.some((key) => params.has(key))) {
      throw new RangeError('Historical steps cannot include future calibration.');
    }
    if (isFuture(stage)) {
      const mode = presetConfig(preset).mode;
      const future = defaultFutureConfig(mode);
      // Omitted future inputs use the same stage defaults as ordinary navigation.
      if (stage === 'failure') future.shock = 2.4;
      if (params.has('offset')) future.offset = numberIn(params, 'offset', mode === 'additive' ? 3 : 0.2, mode === 'additive' ? 8 : 1.8);
      if (params.has('amplitude')) future.amplitude = numberIn(params, 'amplitude', 0.2, 1.8);
      if (params.has('shock')) future.shock = numberIn(params, 'shock', 0, 2.4);
      snapshot.future = future;
    }
    return { status: 'ok', snapshot };
  } catch (error) {
    return { status: 'invalid', message: error instanceof Error ? error.message : 'Invalid shared experiment.' };
  }
}

/** Recompute from history only; future truth is still unavailable until an explicit Reveal. */
export function hydrateSharedState(snapshot: SharedSnapshot, preferences: { mobile?: boolean; reduced?: boolean } = {}): DemoState {
  const state: DemoState = { ...defaultState(preferences),
    config: { ...presetConfig(snapshot.preset), baselineDrift: snapshot.baselineDrift, loggingDrift: snapshot.loggingDrift },
    preset: snapshot.preset, anchor: snapshot.anchor, viewLink: snapshot.viewLink,
    geometryPhase: snapshot.geometryPhase, stage: snapshot.stage, language: snapshot.language,
    actionIndex: snapshot.actionIndex, periodIndex: snapshot.periodIndex,
    showSamples: snapshot.showSamples, sameAction: snapshot.sameAction, rotating: false,
  };
  const mode = presetConfig(snapshot.preset).mode;
  state.future = defaultFutureConfig(mode);
  if (isFuture(snapshot.stage)) {
    const model = buildModel(state.config);
    // The displayed scale is a UI choice, never a source of the frozen fitted scale.
    state.frozen = freezeHistory(model, compareGeometry(model, state.anchor), state.anchor);
    state.future = { ...state.future, shock: snapshot.stage === 'failure' ? 2.4 : 0, ...snapshot.future };
  }
  return state;
}
