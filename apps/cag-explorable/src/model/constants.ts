import type { ModelConfig } from './types';

export const GRID_SIZE = 401;
export const PERIOD_COUNT = 7;
export const SAMPLES_PER_PERIOD = 60;
export const TRUE_PEAK = 0.68;
export const EXPLORATION = 0.08;
export const LOGGING_WIDTH = 0.13;
export const SAMPLE_NOISE = 0.12;
export const SAMPLE_SEED = 20261008;

export const DEFAULT_CONFIG: ModelConfig = Object.freeze({
  baselineDrift: 1,
  loggingDrift: 1,
});
