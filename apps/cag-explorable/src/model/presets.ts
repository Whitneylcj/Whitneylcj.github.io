import type { ResolvedModelConfig } from './types';

export type PresetId = 'additive' | 'log-amplitude' | 'multiplicative';

export const PRESETS: Record<PresetId, { label: string; config: Readonly<ResolvedModelConfig> }> = {
  additive: { label: 'Additive drift', config: Object.freeze({
    mode: 'additive', baselineDrift: 1, loggingDrift: 1, amplitudeDrift: 0,
  }) },
  'log-amplitude': { label: 'Log scale with amplitude drift', config: Object.freeze({
    mode: 'log', baselineDrift: 1, loggingDrift: 1, amplitudeDrift: 0.45,
  }) },
  multiplicative: { label: 'Pure multiplicative drift', config: Object.freeze({
    mode: 'log', baselineDrift: 1, loggingDrift: 1, amplitudeDrift: 0,
  }) },
};

export function presetConfig(id: PresetId): ResolvedModelConfig {
  if (!Object.hasOwn(PRESETS, id)) throw new RangeError('Unknown teaching preset');
  return { ...PRESETS[id].config };
}
