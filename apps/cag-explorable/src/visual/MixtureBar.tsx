import { useId } from 'react';
import type { ViewData } from '../demo/selectors';
import { PERIOD_COLORS } from './palette';
import { useI18n } from '../content/locale';

export function MixtureBar({view, onActionChange}: {view:ViewData;onActionChange:(index:number)=>void}) {
  const { t } = useI18n();
  const titleId = useId();
  let start = 0;
  return <div className="mixture-panel">
    <h3>{t('Which times make this prediction?')}</h3>
    <p className="mixture-equation">P(t | A = {view.action.toFixed(3)})</p>
    <svg data-testid="mixture-bar" viewBox="0 0 400 74" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{t('Conditional period proportions at action')} {view.action.toFixed(3)}: {view.mixture.map((w,i)=>`${t('period')} ${i+1}: ${(w*100).toFixed(1)}%`).join(', ')}</title>
      {view.mixture.map((w,i) => {
        const left = start; start += w;
        return <g key={i}><rect data-weight={w} x={left*400} y="4" width={w*400} height="30" fill={PERIOD_COLORS[i]} stroke="#fafbfc" strokeWidth="1"><title>{t('Period')} {i+1}: {(w*100).toFixed(1)}%</title></rect>{w >= 0.07 && <text x={(left+w/2)*400} y="24" textAnchor="middle" stroke="#fafbfc" strokeWidth="2.5" paintOrder="stroke" className="mixture-period-number">{i+1}</text>}</g>;
      })}
      <text x="0" y="57">{t('Early')}</text><text x="200" y="57" textAnchor="middle">{t('Middle')}</text><text x="400" y="57" textAnchor="end">{t('Late')}</text>
    </svg>
    <label className="cursor-label" htmlFor="cursor">{t('Action cursor')} <output>a = {view.action.toFixed(3)}</output></label>
    <input id="cursor" aria-label={t('Action cursor')} aria-valuetext={`a = ${view.action.toFixed(3)}`} type="range" min="0" max={view.model.actions.length-1} step="1" value={view.actionIndex} onChange={e => onActionChange(Number(e.target.value))} />
    <div className="range-labels"><span>{t('0 · low action')}</span><span>{t('high action · 1')}</span></div>
    <p className="chart-note">{t('Move the cursor. The mix of periods changes with the action.')}</p>
  </div>;
}
