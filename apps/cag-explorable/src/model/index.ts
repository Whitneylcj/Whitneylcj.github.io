import { DEFAULT_CONFIG, GRID_SIZE, PERIOD_COUNT } from './constants';
import { loggingDensity } from './logging';
import { argmax, poolResponses } from './pooling';
import { responseAt } from './response';
import { renderingSamples } from './samples';
import type { ModelConfig, ModelData, ResolvedModelConfig } from './types';

export { DEFAULT_CONFIG } from './constants';
export type { ModelConfig, ModelData, ResolvedModelConfig, ResponseMode, Sample } from './types';
export { PRESETS, presetConfig } from './presets';
export type { PresetId } from './presets';

export function resolveConfig(config: ModelConfig): ResolvedModelConfig {
  if (!Number.isFinite(config.baselineDrift) || config.baselineDrift < 0 || config.baselineDrift > 1.2) {
    throw new RangeError('Baseline drift must be finite and between 0 and 1.2');
  }
  if (!Number.isFinite(config.loggingDrift) || config.loggingDrift < 0 || config.loggingDrift > 1) {
    throw new RangeError('Logging drift must be finite and between 0 and 1');
  }
  const mode = config.mode ?? 'additive';
  const amplitudeDrift = config.amplitudeDrift ?? 0;
  if (mode !== 'additive' && mode !== 'log') throw new RangeError('Response mode must be additive or log');
  if (!Number.isFinite(amplitudeDrift) || amplitudeDrift < 0 || amplitudeDrift > 0.45) {
    throw new RangeError('Amplitude drift must be finite and between 0 and 0.45');
  }
  return { baselineDrift: config.baselineDrift, loggingDrift: config.loggingDrift, mode, amplitudeDrift };
}

/**
 * Population teaching model. No observational fitting is performed.
 * Omitting the P2 parameters retains the original additive P0/P1 model.
 */
export function buildModel(config: ModelConfig = DEFAULT_CONFIG): ModelData {
  const snapshot = resolveConfig(config);
  const actions = Array.from({ length: GRID_SIZE }, (_, index) => index / (GRID_SIZE - 1));
  const quadrature = actions.map((_, index) =>
    (index === 0 || index === GRID_SIZE - 1 ? 0.5 : 1) / (GRID_SIZE - 1));
  const times = Array.from({ length: PERIOD_COUNT }, (_, index) => index / (PERIOD_COUNT - 1));
  const responses = times.map((time) => actions.map((action) => responseAt(action, time, snapshot)));
  const densities = times.map((time) => loggingDensity(actions, quadrature, time, snapshot.loggingDrift));
  const { pooled, periodWeights } = poolResponses(responses, densities);
  const pooledIndex = argmax(pooled);
  // Positive amplitudes and monotone links preserve the same period optimum.
  const trueIndex = argmax(responses[0]!);
  const samples = renderingSamples(actions, times, densities, snapshot);
  const responseValues = [...responses.flat(), ...pooled, ...samples.map((sample) => sample.response)];
  return {
    config: snapshot,
    actions,
    quadrature,
    times,
    responses,
    densities,
    periodWeights,
    pooled,
    pooledIndex,
    trueIndex,
    pooledAction: actions[pooledIndex]!,
    trueAction: actions[trueIndex]!,
    samples,
    responseExtent: [Math.min(...responseValues), Math.max(...responseValues)],
  };
}
