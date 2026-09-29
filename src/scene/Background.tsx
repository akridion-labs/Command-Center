import { lazy, Suspense } from 'react'

const Scene = lazy(() => import('./Scene'))

export function canRenderScene(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// Decoration only: no WebGL or reduced motion renders nothing, and the deck works without it.
export function Background() {
  if (!canRenderScene()) return null
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  )
}
