import type { Dispatch } from 'react';
import type { DemoAction, DemoState } from '../demo/reducer';
import { PRESETS, type PresetId } from '../model/presets';
import type { GeometryComparison, GeometryFit } from '../model/geometry';
import { useI18n } from '../content/locale';

function Loss({fit,id}:{fit:GeometryFit;id:string}) {
  const { t } = useI18n();
  return fit.status==='ok' ? <output data-testid={id} data-value={fit.loss}>{fit.loss < 1e-12 ? '≈ 0' : fit.loss.toExponential(5)}</output> : <span>{t(fit.status==='no-signal' ? 'No action signal' : 'Invalid scale')}</span>;
}
export function GeometryControls({state,comparison,dispatch}:{state:DemoState;comparison:GeometryComparison;dispatch:Dispatch<DemoAction>}) {
  const { t } = useI18n();
  return <div className="geometry-controls">
    <div className="control-heading"><h3>{t('Work with known response curves')}</h3><button className="text-button" onClick={()=>dispatch({type:'reset'})}>{t('Reset experiment')}</button></div>
    <label className="preset-select">{t('Teaching preset')}<select aria-label={t('Teaching preset')} value={state.preset} onChange={e=>dispatch({type:'preset',preset:e.target.value as PresetId})}>{Object.entries(PRESETS).map(([id,preset])=><option key={id} value={id}>{t(preset.label)}</option>)}</select></label>
    <div className="control-group"><span className="control-label">{t('View a response scale')}</span><div className="segmented"><button aria-pressed={state.viewLink==='identity'} onClick={()=>dispatch({type:'link',link:'identity'})}>{t('Identity scale')}</button><button aria-pressed={state.viewLink==='log'} onClick={()=>dispatch({type:'link',link:'log'})}>{t('Log scale')}</button></div></div>
    <div className="control-group"><span className="control-label">{t('Remove the calibration')}</span><div className="phase-controls">{([{phase:'linked',label:'Linked response'},{phase:'anchored',label:'Anchor contrasts'},{phase:'normalized',label:'Remove amplitude'}] as const).map((item,i)=><button key={item.phase} aria-pressed={state.geometryPhase===item.phase} onClick={()=>dispatch({type:'phase',phase:item.phase})}><span aria-hidden="true">{i+1}</span>{t(item.label)}</button>)}</div></div>
    <div className="loss-comparison"><h3>{t('Historical geometry loss')}</h3><table><thead><tr><th>{t('Scale')}</th><th>{t('Profiled loss')}</th></tr></thead><tbody><tr><td>{t('Identity')}</td><td><Loss fit={comparison.identity} id="identity-loss" /></td></tr><tr><td>{t('Log')}</td><td><Loss fit={comparison.log} id="log-loss" /></td></tr></tbody></table>
      <p className="selection-line">{t('Selection')} <strong data-testid="selected-link">{t(comparison.tie ? 'Both scales fit' : comparison.selectedLink==='identity' ? 'Identity' : comparison.selectedLink==='log' ? 'Log' : 'No action signal')}</strong></p>
      {comparison.selected && <p className="geometry-action-line">{t('Selected geometry action')} <output data-testid="geometry-action" data-value={comparison.selected.action}>{comparison.selected.action.toFixed(4)}</output></p>}
      <p className="control-note">{t(comparison.tie ? 'Gap < 10⁻⁸. Identity is the deterministic tie preference; the data do not identify a unique link.' : 'Both losses use the same grid, quadrature and positive-amplitude profiling.')}</p>
      <p className="control-note">{t('The scale buttons change the view. Future selection always uses the historical losses above.')}</p>
    </div>
    <details className="anchor-control"><summary>{t('Advanced: reference action')}</summary><label htmlFor="anchor">{t('Reference action')} <output>{state.anchor.toFixed(3)}</output></label><input id="anchor" aria-label={t('Reference action')} type="range" min="0" max="1" step=".001" value={state.anchor} onChange={e=>dispatch({type:'anchor',value:Number(e.target.value)})} /><p className="control-note">{t('Analytic reference inside [0,1]. Changing it leaves the original responses, logging and pooled target intact.')}</p></details>
    <span className="anchor-summary">a₀ = <output data-testid="anchor-value" data-value={state.anchor}>{state.anchor.toFixed(3)}</output></span>
  </div>;
}
