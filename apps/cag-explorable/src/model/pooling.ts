/** Equal period priors cancel in the numerator and denominator of Bayes' rule. */
export function poolResponses(responses: number[][], densities: number[][]): {
  pooled: number[];
  periodWeights: number[][];
} {
  const periodWeights = densities.map((density) => density.map(() => 0));
  const pooled = responses[0]!.map((_, actionIndex) => {
    const totalDensity = densities.reduce((sum, row) => sum + row[actionIndex]!, 0);
    return densities.reduce((sum, row, periodIndex) => {
      const weight = row[actionIndex]! / totalDensity;
      periodWeights[periodIndex]![actionIndex] = weight;
      return sum + weight * responses[periodIndex]![actionIndex]!;
    }, 0);
  });
  return { pooled, periodWeights };
}

export function argmax(values: readonly number[]): number {
  return values.reduce((best, value, index) => value > values[best]! ? index : best, 0);
}
