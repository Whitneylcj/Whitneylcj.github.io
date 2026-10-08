import { useId } from 'react'
import type { FutureAudit } from '../model/future'
import { BLUE, GOLD, RED } from './palette'
import './p2-visual.css'
import { useI18n } from '../content/locale'

interface Props {
  actions: number[]
  rho: number[]
  chosenAction: number
  audit: FutureAudit | null
  onActionChange: (index: number) => void
  actionIndex: number
  rawExtent?: [number, number]
}

const LEFT = 64
const RIGHT = 666

function plotExtent(values: number[]): [number, number] {
  // Only a rendering extent, never a fit, optimizer, or future-data generator.
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.08, 0.02)
  return [min - pad, max + pad]
}

export function FuturePlot2D({ actions, rho, chosenAction, audit, onActionChange, actionIndex, rawExtent: suppliedRawExtent }: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const descriptionId = useId()
  const revealed = audit?.status === 'ok' ? audit : null
  const x = (action: number) => LEFT + action * (RIGHT - LEFT)
  const geometryExtent = plotExtent(rho)
  const rawExtent = revealed ? suppliedRawExtent ?? plotExtent(revealed.truth) : null
  const geometryY = (value: number) => 218 - (value - geometryExtent[0]) / (geometryExtent[1] - geometryExtent[0]) * 180
  const rawY = (value: number) => 478 - (value - rawExtent![0]) / (rawExtent![1] - rawExtent![0]) * 180
  const path = (values: number[], y: (value: number) => number) => actions.map((action, index) => `${index ? 'L' : 'M'}${x(action).toFixed(2)},${y(values[index]).toFixed(2)}`).join(' ')
  const chosenIndex = actions.indexOf(chosenAction)
  const ticks = (extent: [number, number]) => Array.from({ length: 4 }, (_, index) => extent[0] + (extent[1] - extent[0]) * index / 3)
  const format = (value: number) => Math.abs(value) < 1e-9 ? '0' : Number(value.toFixed(Math.abs(value) < 1 ? 2 : 1)).toString()
  const geometryHeight = revealed ? 552 : 290

  function axes(extent: [number, number], y: (value: number) => number, top: number, bottom: number, label: string, key: string) {
    return <g key={key}>
      {ticks(extent).map((value, index) => <g key={index}>
        <line x1={LEFT} x2={RIGHT} y1={y(value)} y2={y(value)} stroke="#e4e9ef" />
        <text x={LEFT - 12} y={y(value) + 4} textAnchor="end">{format(value)}</text>
      </g>)}
      <path d={`M${LEFT} ${top}V${bottom}H${RIGHT}`} fill="none" stroke="#69788c" />
      <text x={LEFT} y={top - 14} className="axis-title">{t(label)}</text>
      {[0, 0.25, 0.5, 0.75, 1].map((action) => <g key={action}>
        <line x1={x(action)} x2={x(action)} y1={bottom} y2={bottom + 6} stroke="#7c8a9d" />
        <text x={x(action)} y={bottom + 25} textAnchor="middle">{action}</text>
      </g>)}
      <text x={RIGHT} y={bottom + 48} textAnchor="end" className="axis-title">{t('Action a')}</text>
    </g>
  }

  return <div className="slice-panel p2-chart p2-future-chart">
    <div className="chart-heading"><h3>{t(revealed ? 'A frozen choice, a revealed future' : 'Choose with geometry only')}</h3><span>{t('Aligned actions · separate units')}</span></div>
    <svg className="p2-chart-svg" data-testid="future-plot" viewBox={`0 0 720 ${geometryHeight}`} role="img" aria-labelledby={titleId} aria-describedby={descriptionId} onPointerDown={(event) => {
      const box = event.currentTarget.getBoundingClientRect()
      const action = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width * 720 - LEFT) / (RIGHT - LEFT)))
      onActionChange(Math.round(action * (actions.length - 1)))
    }}>
      <title id={titleId}>{t(revealed ? 'Frozen dimensionless geometry and revealed raw future truth on separate aligned axes. Simulated truth diagnostic.' : 'Assumed dimensionless geometry continuation. Future outcomes are hidden.')}</title>
      <desc id={descriptionId}>{t('Frozen CAG action')}: a = {chosenAction.toFixed(4)}. {revealed && `${t('Revealed oracle')}: a = ${revealed.oracleAction.toFixed(4)}. ${t('Frozen pooled action')}: a = ${revealed.pooledAction.toFixed(4)}. `}{t('Action cursor')}: a = {actions[actionIndex].toFixed(3)}. {t('Use the Action cursor slider to explore the same values with a keyboard.')}</desc>
      {axes(geometryExtent, geometryY, 38, 218, 'Frozen geometry ρ · dimensionless', 'geometry')}
      <path data-testid="assumed-path" d={path(rho, geometryY)} fill="none" stroke={BLUE} strokeWidth="2.8" strokeDasharray="8 5" />
      {chosenIndex >= 0 && <g data-testid="frozen-action-marker">
        <line x1={x(chosenAction)} x2={x(chosenAction)} y1={geometryY(rho[chosenIndex])} y2="218" stroke={BLUE} strokeDasharray="3 4" />
        <circle cx={x(chosenAction)} cy={geometryY(rho[chosenIndex])} r="5.3" fill={BLUE} stroke="white" strokeWidth="1.5" />
      </g>}
      <line x1={x(actions[actionIndex])} x2={x(actions[actionIndex])} y1="38" y2="218" stroke="#929da7" strokeDasharray="3 5" />
      {revealed && rawExtent && <>
        <line x1={LEFT} x2={RIGHT} y1="279" y2="279" stroke="#dbe3e9" />
        {axes(rawExtent, rawY, 298, 478, 'Revealed future truth · raw response', 'truth')}
        <path data-testid="future-truth-path" d={path(revealed.truth, rawY)} fill="none" stroke={GOLD} strokeWidth="2.8" />
        <g data-testid="future-oracle-marker">
          <line x1={x(revealed.oracleAction)} x2={x(revealed.oracleAction)} y1={rawY(revealed.truth[revealed.oracleIndex])} y2="478" stroke={GOLD} strokeDasharray="2 4" />
          <path d={`M${x(revealed.oracleAction)},${rawY(revealed.truth[revealed.oracleIndex]) - 6}l6,6l-6,6l-6,-6Z`} fill={GOLD} stroke="white" strokeWidth="1.5" />
        </g>
        <line x1={x(chosenAction)} x2={x(chosenAction)} y1={rawY(revealed.truth[revealed.geometryIndex])} y2="478" stroke={BLUE} strokeDasharray="3 4" />
        <circle cx={x(chosenAction)} cy={rawY(revealed.truth[revealed.geometryIndex])} r="5.3" fill={BLUE} stroke="white" strokeWidth="1.5" />
        <line x1={x(revealed.pooledAction)} x2={x(revealed.pooledAction)} y1="298" y2="478" stroke={RED} strokeDasharray="8 5" opacity="0.72" />
        <line x1={x(actions[actionIndex])} x2={x(actions[actionIndex])} y1="298" y2="478" stroke="#929da7" strokeDasharray="3 5" />
      </>}
    </svg>
    <div className="legend p2-chart-legend">
      <span><i className="p2-legend-line assumed" />{t('Assumed continuation')}</span>
      <span><i className="p2-dot-key" />{t('Frozen CAG action')} {chosenAction.toFixed(4)}</span>
      {revealed && <><span><i className="p2-legend-line revealed" />{t('Revealed truth / oracle')}</span><span><i className="line-key red" />{t('Frozen pooled action')}</span></>}
    </div>
    <p className="p2-chart-note">{t(revealed ? 'Simulated truth diagnostic. Raw future outcomes appear on their own axis; dimensionless geometry does not predict an outcome level.' : audit && audit.status !== 'ok' ? audit.message : 'Future outcomes are hidden. The dashed continuation assumes persistent shape, with no predicted outcome level.')}</p>
  </div>
}
