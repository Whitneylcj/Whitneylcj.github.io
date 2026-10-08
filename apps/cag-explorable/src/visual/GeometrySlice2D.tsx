import { useId } from 'react'
import type { ScenePresentation } from '../demo/presentation'
import { BLUE, GOLD, PERIOD_COLORS } from './palette'
import './p2-visual.css'
import { useI18n } from '../content/locale'

interface Props {
  presentation: ScenePresentation
  periodIndex: number
  viewLinkLabel: string
  onActionChange: (index: number) => void
  actionIndex: number
}

const LEFT = 60
const RIGHT = 666
const TOP = 32
const BOTTOM = 228

export function GeometrySlice2D({ presentation, periodIndex, viewLinkLabel, onActionChange, actionIndex }: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const descriptionId = useId()
  const { actions, curves, yExtent, yLabel, showAnchor, anchor, geometry, geometryAction } = presentation
  const x = (action: number) => LEFT + action * (RIGHT - LEFT)
  const span = Math.max(1e-9, yExtent[1] - yExtent[0])
  const y = (value: number) => BOTTOM - (value - yExtent[0]) / span * (BOTTOM - TOP)
  const path = (values: number[]) => actions.map((action, index) => `${index ? 'L' : 'M'}${x(action).toFixed(2)},${y(values[index]).toFixed(2)}`).join(' ')
  const geometryIndex = geometryAction === null ? -1 : actions.indexOf(geometryAction)
  const focused = curves[periodIndex]
  const selectedAction = actions[actionIndex]
  const ticks = Array.from({ length: 5 }, (_, index) => yExtent[0] + span * index / 4)
  const format = (value: number) => Math.abs(value) < 1e-9 ? '0' : Number(value.toFixed(Math.abs(value) < 1 ? 2 : 1)).toString()

  return <div className="slice-panel p2-chart">
    <div className="chart-heading"><h3>{t(presentation.collapse ? 'A shared geometry, in focus' : 'Seven curves, one scale')}</h3><span>{t(viewLinkLabel)} · {t('period')} {periodIndex + 1}</span></div>
    <svg className="p2-chart-svg" data-testid="geometry-slice" viewBox="0 0 720 292" role="img" aria-labelledby={titleId} aria-describedby={descriptionId} onPointerDown={(event) => {
      const box = event.currentTarget.getBoundingClientRect()
      const action = Math.max(0, Math.min(1, ((event.clientX - box.left) / box.width * 720 - LEFT) / (RIGHT - LEFT)))
      onActionChange(Math.round(action * (actions.length - 1)))
    }}>
      <title id={titleId}>{t(yLabel)} {t('for seven known periods on the')} {t(viewLinkLabel)} {t('scale. Click to move the action cursor.')}</title>
      <desc id={descriptionId}>{t('Action cursor')}: a = {selectedAction.toFixed(3)}. {t('Known period')} {periodIndex+1}: {focused[actionIndex].toFixed(3)}. {showAnchor && `${t('Reference action a₀')}: ${anchor.toFixed(2)}. `}{geometryAction !== null && `${t('Geometry action')}: ${geometryAction.toFixed(4)}. `}{t('Use the Action cursor slider to explore the same values with a keyboard.')}</desc>
      {ticks.map((value, index) => <g key={index}>
        <line x1={LEFT} x2={RIGHT} y1={y(value)} y2={y(value)} stroke="#e4e9ef" />
        <text x={LEFT - 12} y={y(value) + 4} textAnchor="end">{format(value)}</text>
      </g>)}
      {[0, 0.25, 0.5, 0.75, 1].map((action) => <g key={action}>
        <line x1={x(action)} x2={x(action)} y1={BOTTOM} y2={BOTTOM + 6} stroke="#7c8a9d" />
        <text x={x(action)} y={BOTTOM + 25} textAnchor="middle">{action}</text>
      </g>)}
      <path d={`M${LEFT} ${TOP}V${BOTTOM}H${RIGHT}`} fill="none" stroke="#69788c" />
      <text x={LEFT} y="20" className="axis-title">{t(yLabel)}</text>
      <text x={RIGHT} y="278" textAnchor="end" className="axis-title">{t('Action a')}</text>
      {showAnchor && <>
        <line x1={LEFT} x2={RIGHT} y1={y(0)} y2={y(0)} stroke="#a7b3bd" strokeDasharray="4 4" />
        <line data-testid="anchor-reference" x1={x(anchor)} x2={x(anchor)} y1={TOP} y2={BOTTOM} stroke="#8c969f" strokeDasharray="3 5" />
        <text x={Math.min(RIGHT - 60, x(anchor) + 7)} y={TOP + 15} className="p2-reference-label">a₀ = {anchor.toFixed(2)}</text>
      </>}
      {curves.map((curve, period) => <path key={period} data-testid={period === periodIndex ? 'geometry-period-path' : undefined} d={path(curve)} fill="none" stroke={period === periodIndex ? BLUE : PERIOD_COLORS[period]} strokeWidth={period === periodIndex ? 2.3 : 1.2} opacity={period === periodIndex ? 0.8 : 0.6} />)}
      {geometry && <path data-testid="geometry-path" d={path(geometry)} fill="none" stroke={BLUE} strokeWidth="3.2" />}
      {geometry && geometryAction !== null && geometryIndex >= 0 && <g data-testid="geometry-action-marker">
        <line x1={x(geometryAction)} x2={x(geometryAction)} y1={y(geometry[geometryIndex])} y2={BOTTOM} stroke={GOLD} strokeDasharray="2 4" />
        <path d={`M${x(geometryAction)},${y(geometry[geometryIndex]) - 6}l6,6l-6,6l-6,-6Z`} fill={GOLD} stroke="white" strokeWidth="1.5" />
      </g>}
      <line x1={x(selectedAction)} x2={x(selectedAction)} y1={TOP} y2={BOTTOM} stroke="#7d8b9b" strokeDasharray="3 4" />
      <circle cx={x(selectedAction)} cy={y(focused[actionIndex])} r="4" fill="white" stroke={BLUE} strokeWidth="2" />
    </svg>
    <div className="legend p2-chart-legend">
      <span><i className="p2-legend-line known" />{t('Known period curves')}</span>
      {showAnchor && <span><i className="p2-legend-line reference" />{t('Reference action a₀')}</span>}
      {geometry && <span><i className="p2-legend-line fitted" />{t('Fitted geometry ρ')}</span>}
      {geometry && geometryAction !== null && <span><i className="diamond-key" />{t('Geometry action')} {geometryAction.toFixed(4)}</span>}
    </div>
    <p className="p2-chart-note">{t('Illustrative geometry fit on known response curves.')} {t(presentation.collapse ? 'All seven periods share this display scale; depth is collapsed in 3D.' : 'The action cursor is shared with the 3D scene.')}</p>
  </div>
}
