import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { DoubleSide, type Group } from 'three'
import type { ScenePresentation } from '../demo/presentation'
import { BLUE, GOLD, PERIOD_COLORS } from './palette'
import { useI18n } from '../content/locale'

type Point = [number, number, number]
const WIDTH = 5.5
const DEPTH = 3.8
const HEIGHT = 4.4
const FRONT = DEPTH / 2 + 0.08
const GRAY = '#7e8892'
const x = (action: number) => (action - 0.5) * WIDTH

function Label({ position, children, className = '' }: { position: Point; children: ReactNode; className?: string }) {
  return <Html position={position} center className={`scene-tag ${className}`} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>{children}</Html>
}

function tickLabel(value: number) {
  if (Math.abs(value) < 1e-9) return '0'
  return Number(value.toFixed(Math.abs(value) < 1 ? 2 : 1)).toString()
}

function curvePoints(actions: number[], values: number[], scaleY: (value: number) => number, depth = 0): Point[] {
  // Coordinates only: every value was calculated by the shared model selector.
  return actions.flatMap((action, index) => index % 2 === 0 || index === actions.length - 1 ? [[x(action), scaleY(values[index]), depth] as Point] : [])
}

interface Props {
  presentation: ScenePresentation
  periodIndex: number
  actionIndex: number
  animateProjection: boolean
  onPeriodChange: (period: number) => void
  onPeriodHover?: (period: number | null) => void
}

/** A display of selector endpoints, never an estimator or a source of future data. */
export function StageGeometry3D({ presentation, periodIndex, actionIndex, animateProjection, onPeriodChange, onPeriodHover }: Props) {
  const { t } = useI18n()
  const { actions, times, curves, yExtent, anchor, showAnchor, collapse, geometry, geometryAction, assumedFuture, revealedFuture, futureOracleAction, futureTime, kind } = presentation
  const { invalidate } = useThree()
  const periods = useRef<Group>(null)
  const progress = useRef(collapse ? 1 : 0)
  const timeLimit = kind === 'future' ? futureTime : 1
  const z = (time: number) => (0.5 - time / timeLimit) * DEPTH
  const span = Math.max(1e-9, yExtent[1] - yExtent[0])
  const y = (value: number) => (value - yExtent[0]) / span * HEIGHT
  const selectedAction = actions[actionIndex]
  const ticks = Array.from({ length: 5 }, (_, index) => yExtent[0] + span * index / 4)
  const points = useMemo(() => curves.map((curve) => curvePoints(actions, curve, y)), [actions, curves, yExtent[0], yExtent[1]])
  const geometryPoints = useMemo(() => geometry ? curvePoints(actions, geometry, y, 0.045) : null, [actions, geometry, yExtent[0], yExtent[1]])
  const assumedPoints = useMemo(() => assumedFuture ? curvePoints(actions, assumedFuture, y, z(futureTime)) : null, [actions, assumedFuture, futureTime, timeLimit, yExtent[0], yExtent[1]])
  const revealedPoints = useMemo(() => revealedFuture ? curvePoints(actions, revealedFuture, y, z(futureTime) + 0.035) : null, [actions, revealedFuture, futureTime, timeLimit, yExtent[0], yExtent[1]])
  const geometryIndex = geometryAction === null ? -1 : actions.indexOf(geometryAction)
  const oracleIndex = futureOracleAction === null ? -1 : actions.indexOf(futureOracleAction)

  useEffect(() => {
    if (!animateProjection) progress.current = collapse ? 1 : 0
    if (periods.current) periods.current.scale.z = 1 - progress.current
    invalidate()
  }, [collapse, animateProjection, invalidate])

  useFrame((_, delta) => {
    if (!animateProjection || !periods.current) return
    const target = collapse ? 1 : 0
    if (Math.abs(progress.current - target) < 0.0005) {
      periods.current.scale.z = 1 - target
      return
    }
    progress.current += (target - progress.current) * (1 - Math.exp(-Math.min(delta, 0.05) * 6))
    periods.current.scale.z = 1 - progress.current
    invalidate()
  })

  const select = (period: number) => (event: ThreeEvent<MouseEvent | PointerEvent>) => {
    event.stopPropagation()
    onPeriodChange(period)
  }
  const hover = (period: number | null) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onPeriodHover?.(period)
  }

  return <group>
    <group>
      {[0, 0.25, 0.5, 0.75, 1].map((action) => <group key={`action-${action}`}>
        <Line points={[[x(action), 0, FRONT], [x(action), 0, -DEPTH / 2]]} color="#dce3e5" lineWidth={0.65} />
        <Label position={[x(action), -0.16, FRONT + 0.07]} className="scene-tick">{action}</Label>
      </group>)}
      {ticks.map((value, index) => <group key={index}>
        <Line points={[[-WIDTH / 2 - 0.1, y(value), FRONT], [-WIDTH / 2, y(value), FRONT]]} color="#8c9ca4" lineWidth={1} />
        <Label position={[-WIDTH / 2 - 0.31, y(value), FRONT]} className="scene-tick">{tickLabel(value)}</Label>
      </group>)}
      <Line points={[[-WIDTH / 2 - 0.1, 0, FRONT], [WIDTH / 2 + 0.23, 0, FRONT]]} color="#52656f" lineWidth={1.1} />
      <Line points={[[-WIDTH / 2 - 0.1, 0, FRONT], [-WIDTH / 2 - 0.1, HEIGHT + 0.18, FRONT]]} color="#52656f" lineWidth={1.1} />
      <Label position={[0, -0.65, FRONT + 0.11]} className="scene-axis">{t('Action')} <i>a</i></Label>
      {!collapse && <>
        <Line points={[[-WIDTH / 2 - 0.1, 0, FRONT], [-WIDTH / 2 - 0.1, 0, -DEPTH / 2 - 0.22]]} color="#52656f" lineWidth={1.1} />
        <Label position={[-WIDTH / 2 - 0.32, -0.3, -DEPTH / 2 - 0.18]} className="scene-axis">{t('Period')} <i>t</i></Label>
        {(kind === 'future' ? [0, 1, futureTime] : [0, 0.5, 1]).map((time) => <Label key={time} position={[WIDTH / 2 + 0.28, time === futureTime && kind === 'future' ? 0.27 : -0.04, z(time)]} className="scene-period">{time === futureTime && kind === 'future' ? `${t('Future')} ${futureTime}` : time}</Label>)}
      </>}
    </group>

    <group ref={periods} scale={[1, 1, 1 - progress.current]}>
      {showAnchor && <group>
        <mesh position={[0, y(0), 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[WIDTH, DEPTH]} />
          <meshBasicMaterial color="#c8d2d9" transparent opacity={0.13} depthWrite={false} side={DoubleSide} />
        </mesh>
        <Line points={[[x(anchor), y(0), z(0)], [x(anchor), y(0), z(1)]]} color={GRAY} lineWidth={1.4} dashed dashSize={0.12} gapSize={0.075} />
        {!collapse && <Label position={[x(anchor), y(0) + 0.16, z(0) + 0.12]} className="stage-anchor-label">{t('Reference')} <i>a₀</i> = {anchor.toFixed(2)}</Label>}
      </group>}
      {points.map((line, period) => <group key={period} position={[0, 0, z(times[period])]}>
        <Line points={line} color={period === periodIndex ? BLUE : PERIOD_COLORS[period]} lineWidth={period === periodIndex ? 2.3 : 1.55} transparent opacity={collapse ? 0.55 : 0.95} onClick={select(period)} onPointerOver={hover(period)} onPointerOut={hover(null)} />
        {!collapse && <mesh position={[x(selectedAction), y(curves[period][actionIndex]), 0]}>
          <sphereGeometry args={[period === periodIndex ? 0.063 : 0.042, 12, 8]} />
          <meshBasicMaterial color={period === periodIndex ? BLUE : PERIOD_COLORS[period]} />
        </mesh>}
      </group>)}
    </group>

    {geometryPoints && <Line points={geometryPoints} color={BLUE} lineWidth={3} />}
    {showAnchor && collapse && <>
      <Line points={[[x(anchor), 0, 0.05], [x(anchor), HEIGHT, 0.05]]} color={GRAY} lineWidth={1} dashed dashSize={0.1} gapSize={0.08} />
      <Label position={[x(anchor), y(0) - 0.22, 0.05]} className="stage-anchor-label">{t('Reference')} <i>a₀</i></Label>
    </>}
    {geometry && geometryAction !== null && geometryIndex >= 0 && <group>
      <Line points={[[x(geometryAction), 0, 0.06], [x(geometryAction), y(geometry[geometryIndex]), 0.06]]} color={GOLD} lineWidth={1.1} dashed dashSize={0.09} gapSize={0.06} />
      <mesh position={[x(geometryAction), y(geometry[geometryIndex]), 0.065]}>
        <octahedronGeometry args={[0.105]} /><meshStandardMaterial color={GOLD} roughness={0.7} />
      </mesh>
      <Label position={[x(geometryAction), y(geometry[geometryIndex]) + 0.28, 0.065]} className="scene-optimum scene-true-label">{t('Geometry action')} · {geometryAction.toFixed(2)}</Label>
    </group>}

    {assumedPoints && <Line points={assumedPoints} color={GRAY} lineWidth={2.7} dashed dashSize={0.14} gapSize={0.085} />}
    {assumedFuture && geometryAction !== null && geometryIndex >= 0 && <mesh position={[x(geometryAction), y(assumedFuture[geometryIndex]), z(futureTime)]}>
      <sphereGeometry args={[0.079, 14, 10]} /><meshBasicMaterial color={BLUE} />
    </mesh>}
    {revealedPoints && <Line points={revealedPoints} color={GOLD} lineWidth={2.7} />}
    {revealedFuture && futureOracleAction !== null && oracleIndex >= 0 && <group>
      <mesh position={[x(futureOracleAction), y(revealedFuture[oracleIndex]), z(futureTime) + 0.04]}>
        <octahedronGeometry args={[0.105]} /><meshStandardMaterial color={GOLD} roughness={0.7} />
      </mesh>
      <Label position={[x(futureOracleAction), y(revealedFuture[oracleIndex]) + 0.28, z(futureTime) + 0.04]} className="scene-optimum scene-true-label">{t('Revealed oracle')} · {futureOracleAction.toFixed(4)}</Label>
    </group>}
  </group>
}
