import { useId } from 'react';
import type { ViewData } from '../demo/selectors';
import { BLUE, RED, GOLD } from './palette';
import { useI18n } from '../content/locale';

export function CurveSlice2D({ view, pooled, onActionChange }: {view: ViewData; pooled: boolean; onActionChange:(index:number)=>void}) {
  const { t } = useI18n();
  const {model,curve,action} = view;
  const labelId = useId();
  const descriptionId = useId();
  const x = (a:number) => 50+a*620;
  const y = (v:number) => 220-v*18;
  const path = (values:number[]) => model.actions.map((a,j) => `${j ? 'L' : 'M'}${x(a).toFixed(2)},${y(values[j]).toFixed(2)}`).join(' ');
  const trueY = y(curve[model.trueIndex]);
  const poolY = y(model.pooled[model.pooledIndex]);
  return <div className="slice-panel">
    <div className="chart-heading"><h3>{t('One period, in focus')}</h3><span>{t('Same response axis across periods')}</span></div>
    <svg data-testid="curve-slice" viewBox="0 0 720 276" role="img" aria-labelledby={labelId} aria-describedby={descriptionId} onPointerDown={event => {
      const box = event.currentTarget.getBoundingClientRect();
      onActionChange(Math.round(Math.max(0,Math.min(1, ((event.clientX-box.left)/box.width*720-50)/620))*(model.actions.length-1)));
    }}>
      <title id={labelId}>{t('Known period')} {view.periodIndex+1} {t('response')}{pooled ? t(' and ideal pooled response') : ''}{t('; click to move the action cursor')}</title>
      <desc id={descriptionId}>{t('True optimum (synthetic truth)')}: a = {model.trueAction.toFixed(4)}. {pooled && `${t('Ideal pooled predictor')}: a = ${model.pooledAction.toFixed(4)}. `}{t('Action cursor')}: a = {action.toFixed(3)}, {t('Response')} = {curve[view.actionIndex].toFixed(3)}. {t('Use the Action cursor slider to explore the same values with a keyboard.')}</desc>
      {[0,2,4,6,8,10].map(v => <g key={v}><line x1="50" x2="670" y1={y(v)} y2={y(v)} stroke="#e4e9ef" /><text x="37" y={y(v)+4} textAnchor="end">{v}</text></g>)}
      {[0,.25,.5,.75,1].map(a => <g key={a}><line x1={x(a)} x2={x(a)} y1="220" y2="226" stroke="#7c8a9d" /><text x={x(a)} y="243" textAnchor="middle">{a}</text></g>)}
      <path d="M50 20V220H670" fill="none" stroke="#69788c" />
      <text x="50" y="20" className="axis-title">{t('Response')}</text><text x="670" y="265" textAnchor="end" className="axis-title">{t('Action a')}</text>
      <path data-testid="response-path" d={path(curve)} fill="none" stroke={BLUE} strokeWidth="2.8" />
      {pooled && <><path data-testid="pooled-path" d={path(model.pooled)} fill="none" stroke={RED} strokeWidth="2.8" strokeDasharray="8 5" />
        <line x1={x(model.pooledAction)} x2={x(model.pooledAction)} y1={poolY} y2="220" stroke={RED} strokeDasharray="4 4" />
        <circle cx={x(model.pooledAction)} cy={poolY} r="5" fill={RED} stroke="white" strokeWidth="1.5" /></>}
      <line x1={x(model.trueAction)} x2={x(model.trueAction)} y1={trueY} y2="220" stroke={GOLD} strokeDasharray="2 4" />
      <path d={`M${x(model.trueAction)},${trueY-6}l6,6l-6,6l-6,-6Z`} fill={GOLD} stroke="white" strokeWidth="1.5" />
      <line x1={x(action)} x2={x(action)} y1="20" y2="220" stroke="#7d8b9b" strokeWidth="1" strokeDasharray="3 4" />
      <circle cx={x(action)} cy={y(curve[view.actionIndex])} r="4" fill="white" stroke={BLUE} strokeWidth="2" />
    </svg>
    <div className="legend"><span><i className="line-key blue" />{t('Known period response')}</span>{pooled && <span><i className="line-key red" />{t('Ideal pooled predictor')}</span>}<span><i className="diamond-key" />{t('True optimum (synthetic truth)')}</span></div>
  </div>;
}
