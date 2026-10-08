import { EXPLORATION, LOGGING_WIDTH } from './constants';

export function integrate(values: readonly number[], quadrature: readonly number[]): number {
  if (values.length !== quadrature.length) {
    throw new RangeError('Values and quadrature must have the same length');
  }
  return values.reduce((sum, value, index) => sum + value * quadrature[index]!, 0);
}

/** Each period's Gaussian is normalized on the supported action interval. */
export function loggingDensity(
  actions: readonly number[],
  quadrature: readonly number[],
  time: number,
  loggingDrift: number,
): number[] {
  const center = 0.5 + 0.7 * loggingDrift * (time - 0.5);
  const kernel = actions.map((action) => Math.exp(-0.5 * ((action - center) / LOGGING_WIDTH) ** 2));
  const mass = integrate(kernel, quadrature);
  return kernel.map((value) => (1 - EXPLORATION) * value / mass + EXPLORATION);
}
