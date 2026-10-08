import { TRUE_PEAK } from './constants';
import type { ModelConfig } from './types';

/** The generating reference action is fixed at 0.5; it is not an optimum. */
export function rawShape(action: number): number {
  return 4 * ((0.5 - TRUE_PEAK) ** 2 - (action - TRUE_PEAK) ** 2);
}

/** Known synthetic mean response, evaluated analytically even off the grid. */
export function responseAt(action: number, time: number, config: ModelConfig): number {
  const temporal = 1 - 2 * time;
  const shape = (1 + (config.amplitudeDrift ?? 0) * temporal) * rawShape(action);
  return config.mode === 'log'
    ? Math.exp(1.2 + 0.6 * config.baselineDrift * temporal + shape)
    : 6 + 2.5 * config.baselineDrift * temporal + shape;
}
