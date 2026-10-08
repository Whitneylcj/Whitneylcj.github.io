import type { Dispatch } from 'react';
import type { DemoAction, DemoState } from '../demo/reducer';
import type { FutureAudit } from '../model/future';
import type { Link } from '../model/geometry';
import { useI18n } from '../content/locale';

export function FutureControls({state,dispatch}:{state:DemoState;dispatch:Dispatch<DemoAction>}) {
  const { t } = useI18n();
  const frozen=state.frozen;
  if (!frozen) return null;
  const logFamily=frozen.model.config.mode==='log';
  const failed=state.stage==='failure';
  return <div className="future-controls">
    <div className="control-heading"><h3>{t(failed ? 'Change only the future shape' : 'Change future calibration')}</h3><button className="text-button" onClick={()=>dispatch({type:'reset'})}>{t('Reset experiment')}</button></div>
    {failed ? <><div className="segmented future-cases"><button aria-pressed={state.future.shock===0} onClick={()=>dispatch({type:'futureCase',shock:0})}>{t('Persistent future')}</button><button aria-pressed={state.future.shock>0} onClick={()=>dispatch({type:'futureCase',shock:2.4})}>{t('Shape-changing future')}</button></div><div className="slider-field"><label htmlFor="shock">{t('Future shape shock')} <output>{state.future.shock.toFixed(2)}</output></label><input id="shock" aria-label={t('Future shape shock')} type="range" min="0" max="2.4" step=".01" value={state.future.shock} onChange={e=>dispatch({type:'futureParam',key:'shock',value:Number(e.target.value)})} /><span className="control-note">{t('ε affects future truth only. The historical rule stays frozen.')}</span></div></>
    : <><div className="slider-field"><label htmlFor="future-level">{t('Future level')} <output>{state.future.offset.toFixed(2)}</output></label><input id="future-level" aria-label={t('Future level')} type="range" min={logFamily ? '.2' : '3'} max={logFamily ? '1.8' : '8'} step=".01" value={state.future.offset} onChange={e=>dispatch({type:'futureParam',key:'offset',value:Number(e.target.value)})} /><span className="control-note">{t(logFamily ? 'Offset in the generating log-response scale' : 'Offset in the raw response scale')}</span></div><div className="slider-field"><label htmlFor="future-amplitude">{t('Future amplitude')} <output>{state.future.amplitude.toFixed(2)}</output></label><input id="future-amplitude" aria-label={t('Future amplitude')} type="range" min=".2" max="1.8" step=".01" value={state.future.amplitude} onChange={e=>dispatch({type:'futureParam',key:'amplitude',value:Number(e.target.value)})} /><span className="control-note">{t('Positive amplitude in the generating response family')}</span></div></>}
    <button className="reveal-button" onClick={()=>dispatch({type:'reveal'})} disabled={state.revealed}>{t(state.revealed ? 'Future revealed' : 'Reveal future')}</button>
    <p className="control-note">{t('Changing future parameters hides the truth again. It never refits the historical rule.')}</p>
    <div className="frozen-decision"><span>{t('Frozen from history')}</span><dl><div><dt>{t('Selected scale')}</dt><dd data-testid="frozen-link">{t(frozen.selectedLink==='log' ? 'Log' : 'Identity')}{frozen.comparison.tie ? t(' (tie preference)') : ''}</dd></div><div><dt>{t('Reference action')}</dt><dd>{frozen.anchor.toFixed(3)}</dd></div></dl>
      {frozen.comparison.tie && <p className="control-note">{t('Both scales fit the history. This does not identify which geometry will persist into a new calibration.')}</p>}
    </div>
    <div className="metrics future-decision-metrics"><div><span className="metric-label true-label">{t('Frozen geometry action')}</span><output data-testid="frozen-action" data-value={frozen.fit.action}>{frozen.fit.action.toFixed(4)}</output><span className="metric-symbol">a<sub>CAG</sub></span></div><div><span className="metric-label pooled-label">{t('Historical pooled action')}</span><output data-testid="pooled-action" data-value={frozen.model.pooledAction}>{frozen.model.pooledAction.toFixed(4)}</output><span className="metric-symbol">a<sub>pooled</sub></span></div></div>
  </div>;
}

function Metric({id,value,label}:{id:string;value:number;label:string}) {
  const { t } = useI18n();
  return <div><dt>{t(label)}</dt><dd><output data-testid={id} data-value={value}>{value.toFixed(5)}</output></dd></div>;
}
export function FutureReadout({audit,link}:{audit:FutureAudit|null;link:Link}) {
  const { t } = useI18n();
  if (!audit) return <p className="unrevealed-note">{t('Future truth, oracle and regret are hidden.')}</p>;
  if (audit.status!=='ok') return <p className="audit-status" role="status">{t(audit.message)}</p>;
  return <div className="future-readout"><p className="truth-diagnostic">{t('Simulated truth diagnostic')}</p><dl><Metric id="future-oracle-action" value={audit.oracleAction} label="Revealed oracle action" /><Metric id="geometry-raw-regret" value={audit.geometryRawRegret} label="Frozen geometry raw regret" /><Metric id="pooled-raw-regret" value={audit.pooledRawRegret} label="Pooled action, future raw regret" /><Metric id="future-mismatch" value={audit.mismatch} label="Relative linked mismatch" /></dl>
    <p className="control-note">{t('Raw regrets are in outcome units. Relative mismatch is ‖residual‖w / ‖linked contrast‖w in the selected historical scale.')}</p>
    <details className="structural-bound"><summary>{t('Show structural bound')}</summary><dl><Metric id="geometry-linked-regret" value={audit.geometryLinkedRegret} label="Geometry linked regret" /><Metric id="structural-bound" value={audit.twiceSupResidual} label="2 ‖true residual‖∞" /></dl><p>{t('The nonnegative future amplitude is profiled against the frozen shape, on the same grid and selected link. The displayed linked regret is bounded by twice the sup residual.')}</p><p><strong>{t('Known future truth audit.')}</strong> {t('This is not an observable deployment confidence interval, a safety certificate, or a statistical estimator guarantee.')} {t(link==='identity' ? 'Identity is selected: linked and raw regret have the same units and value.' : 'Log is selected: linked regret is in log-response units, while raw regret is in outcome units.')}</p></details>
    {audit.normalizedTruth===null && <p className="audit-status">{t('No positive future scale fits this direction. The 3D truth overlay is omitted; raw truth and residual diagnostics remain available.')}</p>}
  </div>;
}
