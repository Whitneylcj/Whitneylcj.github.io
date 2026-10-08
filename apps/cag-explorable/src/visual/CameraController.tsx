import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

interface Props {
  rotating: boolean
  interactive: boolean
  resetKey: number
  cameraView?: 'orbit' | 'front'
  onInteract: () => void
}

const DEFAULT_POSITION = [3.8, 4.5, 8.1] as const
const TARGET = [0, 1.6, 0] as const

/** Only the camera moves here. The mathematical state never depends on a frame. */
export function CameraController({ rotating, interactive, resetKey, cameraView = 'orbit', onInteract }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { camera, gl, invalidate, size } = useThree()
  const narrow = size.width / Math.max(1, size.height) < 1.3
  const phase = useRef(0)
  const baseAngle = useRef(0)

  useEffect(() => {
    // OrbitControls sets an inline touch-action even while disabled.
    // Restore vertical page scrolling until the mobile 3D control is enabled.
    gl.domElement.style.touchAction = interactive ? 'none' : 'pan-y'
  }, [gl, interactive])

  useEffect(() => {
    const padding = narrow ? 1.28 : 1
    const position = cameraView === 'front' ? [0, TARGET[1], 10] : DEFAULT_POSITION
    camera.position.set(
      TARGET[0] + (position[0] - TARGET[0]) * padding,
      TARGET[1] + (position[1] - TARGET[1]) * padding,
      TARGET[2] + (position[2] - TARGET[2]) * padding,
    )
    camera.lookAt(...TARGET)
    controls.current?.target.set(...TARGET)
    controls.current?.update()
    baseAngle.current = Math.atan2(camera.position.x - TARGET[0], camera.position.z - TARGET[2])
    phase.current = 0
    invalidate()
  }, [camera, invalidate, resetKey, narrow, cameraView])

  useEffect(() => {
    phase.current = 0
    baseAngle.current = Math.atan2(camera.position.x - TARGET[0], camera.position.z - TARGET[2])
    if (rotating) invalidate()
  }, [camera, invalidate, rotating])

  useFrame((_, delta) => {
    if (!rotating || !controls.current) return
    phase.current += Math.min(delta, 0.05)
    const offsetX = camera.position.x - controls.current.target.x
    const offsetZ = camera.position.z - controls.current.target.z
    const radius = Math.hypot(offsetX, offsetZ)
    const angle = baseAngle.current + 0.095 * Math.sin(phase.current * 0.26)
    camera.position.x = controls.current.target.x + Math.sin(angle) * radius
    camera.position.z = controls.current.target.z + Math.cos(angle) * radius
    controls.current.update()
    invalidate()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={interactive}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.3}
      maxPolarAngle={cameraView === 'front' ? Math.PI / 2 : Math.PI / 2 - 0.06}
      minDistance={6.5}
      maxDistance={narrow ? 18 : 15}
      onStart={onInteract}
    />
  )
}
