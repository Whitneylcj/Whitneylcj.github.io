import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { BufferAttribute, BufferGeometry, Color, DoubleSide } from 'three'
import type { ModelData } from '../model'
import type { ViewData } from '../demo/selectors'
import type { ScenePresentation } from '../demo/presentation'
import { CameraController } from './CameraController'
import { StageGeometry3D } from './StageGeometry3D'
import { useI18n } from '../content/locale'
import './p2-visual.css'

export interface Scene3DProps {
  view: ViewData
  pooled: boolean
  showSamples: boolean
  sameAction: boolean
  rotating: boolean
  animateProjection?: boolean
  interactive: boolean
  resetKey: number
  cameraView?: 'orbit' | 'front'
  onInteract: () => void
  onPeriodChange: (period: number) => void
  onPeriodHover?: (period: number | null) => void
  onUnavailable: () => void
  presentation?: ScenePresentation
}

type Point = [number, number, number]
const WIDTH = 5.5
const DEPTH = 3.8
const HEIGHT = 4.4
const FRONT = DEPTH / 2 + 0.47
const BLUE = '#285b93'
const RED = '#b8402b'
const GOLD = '#aa7927'
const TIME_COLORS = ['#b4c3cf', '#a4b6c5', '#94a9bc', '#849cb1', '#748da6', '#657f9b', '#55708d']
const x = (action: number) => (action - 0.5) * WIDTH
const y = (response: number) => (response / 10) * HEIGHT
const z = (time: number) => (0.5 - time) * DEPTH

function Tag({ position, children, className = '' }: { position: Point; children: ReactNode; className?: string }) {
  return (
    <Html position={position} center className={`scene-tag ${className}`} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      {children}
    </Html>
  )
}

function Axes() {
  const { t } = useI18n()
  const left = -WIDTH / 2 - 0.1
  const front = DEPTH / 2 + 0.08
  return (
    <group>
      {[0, 0.25, 0.5, 0.75, 1].map((a) => (
        <group key={`a-${a}`}>
          <Line points={[[x(a), 0, front], [x(a), 0, -DEPTH / 2]]} color="#dce3e5" lineWidth={0.65} />
          <Tag position={[x(a), -0.16, front + 0.07]} className="scene-tick">{a.toFixed(a % 1 ? 2 : 0)}</Tag>
        </group>
      ))}
      {[0, 2, 4, 6, 8, 10].map((value) => (
        <group key={`y-${value}`}>
          <Line points={[[left, y(value), front], [left + 0.1, y(value), front]]} color="#8c9ca4" lineWidth={1} />
          <Tag position={[left - 0.17, y(value), front]} className="scene-tick">{value}</Tag>
        </group>
      ))}
      {[0, 0.5, 1].map((time) => (
        <Line key={`t-${time}`} points={[[left, 0, z(time)], [WIDTH / 2, 0, z(time)]]} color="#dce3e5" lineWidth={0.65} />
      ))}
      <Line points={[[left, 0, front], [WIDTH / 2 + 0.23, 0, front]]} color="#52656f" lineWidth={1.1} />
      <Line points={[[left, 0, front], [left, HEIGHT + 0.18, front]]} color="#52656f" lineWidth={1.1} />
      <Line points={[[left, 0, front], [left, 0, -DEPTH / 2 - 0.25]]} color="#52656f" lineWidth={1.1} />
      <Tag position={[0, -0.39, front + 0.11]} className="scene-axis">{t('Action')} <i>a</i></Tag>
      <Tag position={[left - 0.1, HEIGHT + 0.39, front]} className="scene-axis">{t('Response')} <i>mₜ(a)</i></Tag>
      <Tag position={[WIDTH / 2 + 0.32, -0.33, -DEPTH / 2 - 0.22]} className="scene-axis">{t('Period')} <i>t</i></Tag>
      <Tag position={[WIDTH / 2 + 0.26, 0.08, z(0)]} className="scene-period">{t('Early')}</Tag>
      <Tag position={[WIDTH / 2 + 0.26, 0.08, z(0.5)]} className="scene-period">{t('Middle')}</Tag>
      <Tag position={[WIDTH / 2 + 0.26, 0.08, z(1)]} className="scene-period">{t('Late')}</Tag>
    </group>
  )
}

function createRibbon(actions: number[], response: number[], depth: number, thickness: number) {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(actions.length * 6)
  const indices: number[] = []
  actions.forEach((action, index) => {
    positions.set([x(action), y(response[index]), depth - thickness / 2, x(action), y(response[index]), depth + thickness / 2], index * 6)
    if (index < actions.length - 1) {
      const i = index * 2
      indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
    }
  })
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ResponseRibbon({ model, period, selected, onSelect, onHover }: { model: ModelData; period: number; selected: boolean; onSelect: (period: number) => void; onHover?: (period: number | null) => void }) {
  const geometry = useMemo(() => createRibbon(model.actions, model.responses[period], z(model.times[period]), 0.17), [model, period])
  const edge: Point[] = useMemo(() => model.actions.filter((_, i) => i % 4 === 0).map((action, i) => [x(action), y(model.responses[period][i * 4]), z(model.times[period])]), [model, period])
  useEffect(() => () => geometry.dispose(), [geometry])
  const select = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    event.stopPropagation()
    onSelect(period)
  }
  return (
    <group>
      <mesh geometry={geometry} onPointerOver={(event) => { event.stopPropagation(); onHover?.(period) }} onPointerOut={(event) => { event.stopPropagation(); onHover?.(null) }} onClick={select}>
        <meshBasicMaterial color={TIME_COLORS[period]} transparent opacity={selected ? 0.53 : 0.25} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={edge} color={selected ? BLUE : TIME_COLORS[period]} lineWidth={selected ? 2.3 : 1.3} />
    </group>
  )
}

function LoggingStrips({ model }: { model: ModelData }) {
  // The strips encode the already-normalized densities from the one model.
  const maximum = useMemo(() => Math.max(...model.densities.flat()), [model])
  return <group>{model.times.map((time, period) => (
    <LoggingStrip key={period} actions={model.actions} density={model.densities[period]} time={time} maximum={maximum} period={period} />
  ))}</group>
}

function LoggingStrip({ actions, density, time, maximum, period }: { actions: number[]; density: number[]; time: number; maximum: number; period: number }) {
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions: number[] = []
    const colors: number[] = []
    const base = new Color(TIME_COLORS[period])
    const pale = new Color('#edf0f1')
    for (let index = 0; index < actions.length - 1; index += 4) {
      const next = Math.min(index + 4, actions.length - 1)
      const color = pale.clone().lerp(base, Math.min(1, ((density[index] + density[next]) / 2 / maximum) * 1.2))
      const x0 = x(actions[index])
      const x1 = x(actions[next])
      const z0 = z(time) - 0.1
      const z1 = z(time) + 0.1
      positions.push(x0, 0.015, z0, x1, 0.015, z0, x1, 0.015, z1, x0, 0.015, z0, x1, 0.015, z1, x0, 0.015, z1)
      for (let vertex = 0; vertex < 6; vertex++) colors.push(color.r, color.g, color.b)
    }
    result.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    result.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    return result
  }, [actions, density, maximum, period, time])
  useEffect(() => () => geometry.dispose(), [geometry])
  const ridge: Point[] = useMemo(() => actions.filter((_, i) => i % 4 === 0).map((action, i) => [x(action), 0.045 + density[i * 4] / maximum * 0.25, z(time)]), [actions, density, maximum, time])
  return <group>
    <mesh geometry={geometry}><meshBasicMaterial vertexColors side={DoubleSide} /></mesh>
    <Line points={ridge} color={TIME_COLORS[period]} lineWidth={1.1} />
  </group>
}

function LoggedPoints({ model, pooled, animateProjection }: { model: ModelData; pooled: boolean; animateProjection: boolean }) {
  const { invalidate } = useThree()
  const progress = useRef(pooled ? 1 : 0)
  const geometry = useMemo(() => {
    const result = new BufferGeometry()
    const positions = new Float32Array(model.samples.length * 3)
    const colors = new Float32Array(model.samples.length * 3)
    model.samples.forEach((sample, index) => {
      positions.set([x(sample.action), y(sample.response), z(model.times[sample.periodIndex]) * (1 - progress.current) + FRONT * progress.current], index * 3)
      const color = new Color(TIME_COLORS[sample.periodIndex])
      colors.set([color.r, color.g, color.b], index * 3)
    })
    result.setAttribute('position', new BufferAttribute(positions, 3))
    result.setAttribute('color', new BufferAttribute(colors, 3))
    return result
  }, [model])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => {
    if (!animateProjection) {
      progress.current = pooled ? 1 : 0
      const positions = geometry.getAttribute('position')
      model.samples.forEach((sample, index) => {
        positions.setZ(index, pooled ? FRONT : z(model.times[sample.periodIndex]))
      })
      positions.needsUpdate = true
      geometry.computeBoundingSphere()
    }
    invalidate()
  }, [model, pooled, animateProjection, geometry, invalidate])
  useFrame((_, delta) => {
    if (!animateProjection) return
    const goal = pooled ? 1 : 0
    if (Math.abs(goal - progress.current) < 0.0005) return
    progress.current += (goal - progress.current) * (1 - Math.exp(-Math.min(delta, 0.05) * 5.5))
    const positions = geometry.getAttribute('position')
    model.samples.forEach((sample, index) => {
      positions.setZ(index, z(model.times[sample.periodIndex]) * (1 - progress.current) + FRONT * progress.current)
    })
    positions.needsUpdate = true
    // Bounds must follow the time projection, so WebGL cannot cull its endpoint.
    geometry.computeBoundingSphere()
    invalidate()
  })
  return <points geometry={geometry} frustumCulled={false}>
    <pointsMaterial size={0.047} vertexColors transparent opacity={0.58} sizeAttenuation depthWrite={false} />
  </points>
}

function ActionMarkers({ view, pooled, sameAction }: { view: ViewData; pooled: boolean; sameAction: boolean }) {
  const { t } = useI18n()
  const { model, periodIndex, actionIndex, action } = view
  const selectedDepth = z(model.times[periodIndex])
  const trueY = y(model.responses[periodIndex][model.trueIndex])
  const pooledY = y(model.pooled[model.pooledIndex])
  const samePoints: Point[] = model.times.map((time, period) => [x(action), y(model.responses[period][actionIndex]), z(time)])
  return <group>
    <Line points={[[x(model.trueAction), 0.025, z(0)], [x(model.trueAction), 0.025, z(1)]]} color={GOLD} lineWidth={1.2} dashed dashSize={0.11} gapSize={0.07} />
    <Line points={[[x(model.trueAction), 0.02, selectedDepth], [x(model.trueAction), trueY, selectedDepth]]} color={GOLD} lineWidth={1.1} dashed dashSize={0.11} gapSize={0.065} />
    {model.times.map((time, period) => <mesh key={period} position={[x(model.trueAction), y(model.responses[period][model.trueIndex]), z(time)]}>
      <octahedronGeometry args={[period === periodIndex ? 0.105 : 0.055]} />
      <meshStandardMaterial color={GOLD} roughness={0.65} />
    </mesh>)}
    <Tag position={[x(model.trueAction), trueY + 0.3, selectedDepth]} className="scene-optimum scene-true-label">{t('Known true optimum')} · {model.trueAction.toFixed(2)}</Tag>
    <Line points={[[x(action), 0.03, selectedDepth], [x(action), y(model.responses[periodIndex][actionIndex]), selectedDepth]]} color="#5a7485" lineWidth={0.9} dashed dashSize={0.065} gapSize={0.06} />
    <mesh position={[x(action), y(model.responses[periodIndex][actionIndex]), selectedDepth]}>
      <sphereGeometry args={[0.067, 12, 8]} /><meshBasicMaterial color={BLUE} />
    </mesh>
    {sameAction && <group>
      <Line points={samePoints} color={BLUE} lineWidth={1.6} dashed dashSize={0.08} gapSize={0.04} />
      {samePoints.map((point, period) => <mesh key={period} position={point}>
        <sphereGeometry args={[0.068, 12, 8]} /><meshBasicMaterial color={BLUE} />
      </mesh>)}
      <Tag position={[x(action), samePoints[0][1] + 0.2, samePoints[0][2]]} className="scene-cursor-label">{t('Same action')} · {action.toFixed(2)}</Tag>
    </group>}
    {pooled && <group>
      <Line points={[[x(model.pooledAction), 0, FRONT], [x(model.pooledAction), pooledY, FRONT]]} color={RED} lineWidth={1.2} dashed dashSize={0.11} gapSize={0.07} />
      <mesh position={[x(model.pooledAction), pooledY, FRONT]}>
        <octahedronGeometry args={[0.115]} /><meshStandardMaterial color={RED} roughness={0.8} />
      </mesh>
      <Tag position={[x(model.pooledAction), pooledY + 0.29, FRONT]} className="scene-optimum scene-pooled-label">{t('Pooled optimum')} · {model.pooledAction.toFixed(4)}</Tag>
    </group>}
  </group>
}

function ContextObserver({ onUnavailable }: { onUnavailable: () => void }) {
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const lost = (event: Event) => { event.preventDefault(); onUnavailable() }
    canvas.addEventListener('webglcontextlost', lost)
    return () => canvas.removeEventListener('webglcontextlost', lost)
  }, [gl, onUnavailable])
  return null
}

function Unavailable({ onUnavailable }: { onUnavailable: () => void }) {
  const { t } = useI18n()
  useEffect(() => { onUnavailable() }, [onUnavailable])
  return <div className="scene-unavailable" role="status">{t('3D is unavailable here. Explore the synchronized response plot below.')}</div>
}

class SceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onUnavailable() }
  render() { return this.state.failed ? <Unavailable onUnavailable={this.props.onUnavailable} /> : this.props.children }
}

export function Scene3D(props: Scene3DProps) {
  const { t } = useI18n()
  const { view, pooled, showSamples, sameAction, rotating, animateProjection = true, interactive, resetKey, cameraView = 'orbit', onInteract, onPeriodChange, onPeriodHover, onUnavailable, presentation } = props
  const pooledCurve: Point[] = useMemo(() => view.model.actions.filter((_, i) => i % 2 === 0).map((action, i) => [x(action), y(view.model.pooled[i * 2]), FRONT]), [view.model])
  const sceneLabel = presentation ? `${t('3D scene of known curves on the')} ${t(presentation.yLabel.toLowerCase())} ${t('scale')}` : t('3D scene of known response curves across seven historical periods')
  return <div className={`scene3d ${interactive ? 'is-interactive' : 'is-static'}`} onPointerDownCapture={interactive ? onInteract : undefined} data-testid="scene3d" role="img" aria-label={`${sceneLabel}. ${t('Action runs horizontally, response vertically, and period into depth. Synchronized plots and controls provide the same data below.')}`}>
    <SceneBoundary onUnavailable={onUnavailable}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.6]}
        camera={{ position: [3.8, 4.5, 8.1], fov: 43, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
        fallback={<span>{t('Known synthetic response curves across seven historical periods. Explore the synchronized response plot below.')}</span>}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[4, 7, 5]} intensity={1.5} />
        {presentation ? <StageGeometry3D presentation={presentation} periodIndex={view.periodIndex} actionIndex={view.actionIndex} animateProjection={animateProjection} onPeriodChange={onPeriodChange} onPeriodHover={onPeriodHover} /> : <>
          <Axes />
          <LoggingStrips model={view.model} />
          {view.model.times.map((_, period) => <ResponseRibbon key={period} model={view.model} period={period} selected={period === view.periodIndex} onSelect={onPeriodChange} onHover={onPeriodHover} />)}
          {showSamples && <LoggedPoints model={view.model} pooled={pooled} animateProjection={animateProjection} />}
          {pooled && <Line points={pooledCurve} color={RED} lineWidth={3} dashed dashSize={0.11} gapSize={0.055} />}
          <ActionMarkers view={view} pooled={pooled} sameAction={sameAction} />
        </>}
        <CameraController rotating={rotating} interactive={interactive} resetKey={resetKey} cameraView={cameraView} onInteract={onInteract} />
        <ContextObserver onUnavailable={onUnavailable} />
      </Canvas>
    </SceneBoundary>
    {presentation ? <>
      <div className="stage-scene-key" aria-hidden="true">
        <span><i className="stage-key-line observed" />{t('Observed')}</span>
        {presentation.kind === 'future' && <span><i className="stage-key-line assumed" />{t('Assumed continuation')}</span>}
        {presentation.revealedFuture && <span><i className="stage-key-line revealed" />{t('Revealed truth')}</span>}
      </div>
      <div className="stage-scale-caption" aria-hidden="true">{t('Vertical axis')} · {t(presentation.yLabel)}</div>
      <div className="scene-footnote stage-scene-footnote" aria-hidden="true">{t(presentation.kind === 'future' ? 'Scaled linked contrast · continuation assumes persistent shape' : presentation.collapse ? 'Positive amplitude removed · time depth collapsed' : presentation.showAnchor ? 'Gray reference action and zero plane · no data regeneration' : 'Known response curves on the selected link scale')}</div>
    </> : <div className="scene-footnote" aria-hidden="true"><span className="scene-density-symbol" />{t('Floor strips: time-dependent logging density')}</div>}
  </div>
}
