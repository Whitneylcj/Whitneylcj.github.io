import { DEFAULT_CONFIG, type ModelConfig } from '../model';
import { presetConfig, type PresetId } from '../model/presets';
import { defaultFutureConfig, type FrozenHistory, type FutureConfig } from '../model/future';
import type { Link } from '../model/geometry';
import type { Language } from '../content/locale';

export type Stage = 'observe' | 'pool' | 'geometry' | 'deploy' | 'failure';
export type GeometryPhase = 'linked' | 'anchored' | 'normalized';
export interface DemoState {
  config: ModelConfig; stage: Stage; preset: PresetId; periodIndex: number; actionIndex: number;
  showSamples: boolean; sameAction: boolean; rotating: boolean; interactive: boolean; resetKey: number;
  geometryPhase: GeometryPhase; viewLink: Link; anchor: number;
  frozen: FrozenHistory | null; future: FutureConfig; revealed: boolean; futureInvalidated: boolean;
  language: Language;
}
export type DemoAction =
  | { type: 'drift'; key: 'baselineDrift' | 'loggingDrift'; value: number }
  | { type: 'stage'; stage: Stage }
  | { type: 'preset'; preset: PresetId }
  | { type: 'anchor'; value: number }
  | { type: 'link'; link: Link }
  | { type: 'phase'; phase: GeometryPhase }
  | { type: 'enterFuture'; stage: 'deploy' | 'failure'; frozen: FrozenHistory }
  | { type: 'futureParam'; key: keyof FutureConfig; value: number }
  | { type: 'futureCase'; shock: number }
  | { type: 'reveal' }
  | { type: 'period'; index: number }
  | { type: 'cursor'; index: number }
  | { type: 'language'; language: Language }
  | { type: 'restore'; state: DemoState }
  | { type: 'samples' | 'sameAction' | 'rotation' | 'interaction' }
  | { type: 'pause' | 'resetView' | 'reset' };

/** Pure initialization keeps numerical/state tests independent of browser globals. */
export function defaultState({ mobile = false, reduced = false }: {mobile?:boolean;reduced?:boolean} = {}): DemoState {
  return { config: { ...DEFAULT_CONFIG }, stage: 'observe', preset: 'additive', periodIndex: 3, actionIndex: 200,
    showSamples: true, sameAction: false, rotating: !mobile && !reduced, interactive: !mobile, resetKey: 0,
    geometryPhase: 'linked', viewLink: 'identity', anchor: .5,
    frozen: null, future: defaultFutureConfig('additive'), revealed: false, futureInvalidated: false, language: 'en' };
}
export function initialState(): DemoState {
  return defaultState({ mobile: window.matchMedia('(max-width: 760px)').matches,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
}
function invalidateHistory(state: DemoState) {
  return { frozen: null, revealed: false, futureInvalidated: state.futureInvalidated || state.frozen !== null };
}
export function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'drift': return { ...state, ...invalidateHistory(state), config: { ...state.config, [action.key]: action.value } };
    case 'preset': return { ...state, ...invalidateHistory(state), config: presetConfig(action.preset), preset: action.preset };
    case 'anchor': return { ...state, ...invalidateHistory(state), anchor: action.value };
    case 'link': return { ...state, viewLink: action.link };
    case 'phase': return { ...state, geometryPhase: action.phase };
    // Future stages can only be entered with an explicit snapshot of the history-only fit.
    case 'stage': return action.stage === 'deploy' || action.stage === 'failure' ? state : { ...state, stage: action.stage };
    case 'enterFuture': {
      const sameHistory = state.frozen === action.frozen;
      const future = sameHistory ? { ...state.future } : defaultFutureConfig(action.frozen.model.config.mode);
      future.shock = action.stage === 'failure' ? 2.4 : 0;
      return { ...state, stage: action.stage, frozen: action.frozen, future, revealed: false, futureInvalidated: false };
    }
    case 'futureParam': return { ...state, future: { ...state.future, [action.key]: action.value }, revealed: false };
    case 'futureCase': return { ...state, future: { ...state.future, shock: action.shock }, revealed: false };
    case 'reveal': return state.frozen && (state.stage === 'deploy' || state.stage === 'failure') ? { ...state, revealed: true } : state;
    case 'period': return { ...state, periodIndex: action.index };
    case 'cursor': return { ...state, actionIndex: action.index };
    case 'language': return { ...state, language: action.language };
    case 'restore': {
      const previous = state.config;
      const restored = action.state.config;
      const historyChanged = state.preset !== action.state.preset || state.anchor !== action.state.anchor ||
        previous.baselineDrift !== restored.baselineDrift || previous.loggingDrift !== restored.loggingDrift ||
        (previous.mode ?? 'additive') !== (restored.mode ?? 'additive') ||
        (previous.amplitudeDrift ?? 0) !== (restored.amplitudeDrift ?? 0);
      return { ...action.state, revealed: false, futureInvalidated: false, rotating: false, interactive: state.interactive,
        resetKey: state.resetKey + Number(historyChanged) };
    }
    case 'samples': return { ...state, showSamples: !state.showSamples };
    case 'sameAction': return { ...state, sameAction: !state.sameAction };
    case 'rotation': return { ...state, rotating: !state.rotating };
    case 'interaction': return { ...state, interactive: !state.interactive, rotating: false };
    case 'pause': return state.rotating ? { ...state, rotating: false } : state;
    case 'resetView': return { ...state, resetKey: state.resetKey + 1 };
    case 'reset': return { ...defaultState(), language: state.language, rotating: state.rotating,
      interactive: state.interactive, resetKey: state.resetKey + 1 };
  }
}
