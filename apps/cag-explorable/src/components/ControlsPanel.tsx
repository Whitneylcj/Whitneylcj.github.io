import type { Dispatch } from 'react';
import type { DemoAction, DemoState } from '../demo/reducer';
import { useI18n } from '../content/locale';

export function ControlsPanel({ state, dispatch }: {state: DemoState; dispatch: Dispatch<DemoAction>}) {
  const { t } = useI18n();
  return <div className="parameters">
    <div className="control-heading"><h3>{t('Change the history')}</h3><button className="text-button" onClick={() => dispatch({type: 'reset'})}>{t('Reset experiment')}</button></div>
    <div className="slider-field">
      <label htmlFor="baseline">{t('Baseline drift')} <output>{state.config.baselineDrift.toFixed(2)}</output></label>
      <input id="baseline" aria-label={t('Baseline drift')} type="range" min="0" max="1.2" step=".01" value={state.config.baselineDrift} onChange={e => dispatch({type:'drift', key:'baselineDrift',value:Number(e.target.value)})} />
      <span className="control-note">{t('How much response levels change over time')}</span>
    </div>
    <div className="slider-field">
      <label htmlFor="logging">{t('Logging drift')} <output>{state.config.loggingDrift.toFixed(2)}</output></label>
      <input id="logging" aria-label={t('Logging drift')} type="range" min="0" max="1" step=".01" value={state.config.loggingDrift} onChange={e => dispatch({type:'drift', key:'loggingDrift',value:Number(e.target.value)})} />
      <span className="control-note">{t('How much logged actions move from low to high')}</span>
    </div>
    <p className="preset-note">{t(state.config.mode === 'log' ? 'Log' : 'Additive')} {t('teaching preset · amplitude drift')} {(state.config.amplitudeDrift ?? 0).toFixed(2)}</p>
  </div>;
}
