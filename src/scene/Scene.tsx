import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { Points } from 'three'
import { POINT_COUNT, startTicker } from './budget'

function Field() {
  const ref = useRef<Points>(null)
  const invalidate = useThree((s) => s.invalidate)
  const positions = useMemo(() => {
    const p = new Float32Array(POINT_COUNT * 3)
    for (let i = 0; i < p.length; i++) p[i] = (Math.random() - 0.5) * 16
    return p
  }, [])

  useEffect(() => {
    const cleanup = startTicker(invalidate)
    return cleanup
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
  const [lost, setLost] = useState(false)
  // A lost WebGL context (driver reset, GPU pressure from Ollama) removes the scene; the panels are untouched.
  if (lost) return null
  return (
    <Canvas
      frameloop="demand"
      dpr={1}
      camera={{ position: [0, 0, 7], fov: 55 }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        // Add context loss handler
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault()
          console.warn('background scene: WebGL context lost, scene removed')
          setLost(true)
        }, { once: true })

        // Also handle webglcontextrestored if needed (though we just remove the scene)
        gl.domElement.addEventListener('webglcontextrestored', () => {
          // We don't restore - just remove the scene as requested
          console.warn('background scene: WebGL context restored but scene removed')
        })
      }}
    >
      <Field />
    </Canvas>
  )
}