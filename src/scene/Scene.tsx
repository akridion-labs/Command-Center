import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { Points } from 'three'

const COUNT = 400
const FPS = 24

function Field() {
  const ref = useRef<Points>(null)
  const invalidate = useThree((s) => s.invalidate)
  const positions = useMemo(() => {
    const p = new Float32Array(COUNT * 3)
    for (let i = 0; i < p.length; i++) p[i] = (Math.random() - 0.5) * 16
    return p
  }, [])

  // frameloop="demand": drive a throttled tick ourselves, and stop it while the window is hidden
  useEffect(() => {
    let timer: number | undefined
    const start = () => { if (timer === undefined) timer = window.setInterval(invalidate, 1000 / FPS) }
    const stop = () => { window.clearInterval(timer); timer = undefined }
    const onVis = () => (document.hidden ? stop() : start())
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => { stop(); document.removeEventListener('visibilitychange', onVis) }
  }, [invalidate])

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.y += dt * 0.04
    ref.current.rotation.x += dt * 0.015
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#39c6ff" size={0.03} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  )
}

export default function Scene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={1}
      camera={{ position: [0, 0, 7], fov: 55 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <Field />
    </Canvas>
  )
}
