export type ResponseMode = 'additive' | 'log';

/** Raw data parameters. A geometry anchor is deliberately not a data parameter. */
export interface ModelConfig {
  baselineDrift: number;
  loggingDrift: number;
  mode?: ResponseMode;
  amplitudeDrift?: number;
}

export interface ResolvedModelConfig extends ModelConfig {
  mode: ResponseMode;
  amplitudeDrift: number;
}

export interface Sample {
  action: number;
  periodIndex: number;
  response: number;
}

/** Every scene, SVG and readout consumes these same population quantities. */
export interface ModelData {
  config: ResolvedModelConfig;
  actions: number[];
  quadrature: number[];
  times: number[];
  responses: number[][];
  densities: number[][];
  periodWeights: number[][];
  pooled: number[];
  pooledIndex: number;
  trueIndex: number;
  pooledAction: number;
  trueAction: number;
  samples: Sample[];
  responseExtent: [number, number];
}
