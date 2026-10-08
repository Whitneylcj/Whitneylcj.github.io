/** Endpoint-only visual data. Display interpolation never feeds model selection. */
export interface ScenePresentation {
  kind: 'geometry' | 'future';
  actions: number[];
  times: number[];
  curves: number[][];
  yExtent: [number, number];
  yLabel: string;
  anchor: number;
  showAnchor: boolean;
  collapse: boolean;
  geometry: number[] | null;
  geometryAction: number | null;
  assumedFuture: number[] | null;
  revealedFuture: number[] | null;
  futureOracleAction: number | null;
  futureTime: number;
}
