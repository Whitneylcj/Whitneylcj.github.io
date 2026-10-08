import type { ModelData } from '../model';
import { useI18n } from '../content/locale';

export function MetricReadout({ model }: {model: ModelData}) {
  const { t } = useI18n();
  const aligned = model.pooledIndex === model.trueIndex;
  return <div className="metrics" aria-live="polite" aria-atomic="true">
    <div><span className="metric-label pooled-label">{t('Ideal pooled action')}</span><output data-testid="pooled-action">{model.pooledAction.toFixed(4)}</output><span className="metric-symbol">a<sub>pooled</sub></span></div>
    <div><span className="metric-label true-label">{t('True preferred action')}</span><output data-testid="true-action">{model.trueAction.toFixed(4)}</output><span className="metric-symbol">a<sub>true</sub></span></div>
    <p className={aligned ? 'alignment-note aligned' : 'alignment-note'}>{t(aligned ? 'The two optima coincide.' : 'Prediction and decision point to different actions.')}</p>
  </div>;
}
