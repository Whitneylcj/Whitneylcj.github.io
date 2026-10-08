import { PERIOD_COUNT, SAMPLE_NOISE, SAMPLE_SEED, SAMPLES_PER_PERIOD } from './constants';
import { responseAt } from './response';
import type { ModelConfig, Sample } from './types';

function seededUniform(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    // The half-unit makes every draw strictly inside (0, 1).
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296 + 0.5 / 4294967296;
  };
}

const random = seededUniform(SAMPLE_SEED);
const baseDraws = Array.from({ length: PERIOD_COUNT }, () =>
  Array.from({ length: SAMPLES_PER_PERIOD }, () => ({
    uniform: random(),
    normal: Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()),
  })),
);

/** Trapezoidal CDF of the normalized, piecewise linear grid density. */
export function densityCdf(actions: readonly number[], density: readonly number[]): number[] {
  const cdf = [0];
  for (let index = 1; index < actions.length; index += 1) {
    cdf.push(cdf[index - 1]! + (actions[index]! - actions[index - 1]!) *
      (density[index]! + density[index - 1]!) / 2);
  }
  // Suppress floating-point normalization error, keeping the same probability law.
  const mass = cdf[cdf.length - 1]!;
  return cdf.map((value) => value / mass);
}

/** Invert each linear-density segment analytically, using a stable quadratic root. */
export function inverseDensityCdf(
  uniform: number,
  actions: readonly number[],
  density: readonly number[],
  cdf: readonly number[],
): number {
  let low = 0;
  let high = cdf.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (cdf[middle]! <= uniform) low = middle;
    else high = middle;
  }
  const width = actions[high]! - actions[low]!;
  const mass = (density[low]! + density[high]!) * width / 2;
  const quantileWithinSegment = (uniform - cdf[low]!) / (cdf[high]! - cdf[low]!);
  const targetMass = quantileWithinSegment * mass;
  const slope = (density[high]! - density[low]!) / width;
  const root = Math.sqrt(Math.max(0, density[low]! ** 2 + 2 * slope * targetMass));
  const offset = 2 * targetMass / (density[low]! + root);
  return actions[low]! + Math.min(width, Math.max(0, offset));
}

/** Fixed latent quantiles and noise are reused whenever parameters change. */
export function renderingSamples(
  actions: readonly number[],
  times: readonly number[],
  densities: number[][],
  config: ModelConfig,
): Sample[] {
  return times.flatMap((time, periodIndex) => {
    const density = densities[periodIndex]!;
    const cdf = densityCdf(actions, density);
    return baseDraws[periodIndex]!.map(({ uniform, normal }) => {
      const action = inverseDensityCdf(uniform, actions, density, cdf);
      const mean = responseAt(action, time, config);
      const response = config.mode === 'log'
        ? mean * Math.exp(SAMPLE_NOISE * normal - SAMPLE_NOISE ** 2 / 2)
        : mean + SAMPLE_NOISE * normal;
      return { action, periodIndex, response };
    });
  });
}
