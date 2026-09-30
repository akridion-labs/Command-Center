import { Component, lazy, Suspense, type ReactNode, useEffect, useState } from 'react'

const Scene = lazy(() => import('./Scene'))

// A failed chunk load or a render error inside the scene empties the background, never the deck.
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('background scene disabled:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

// Check WebGL availability once at module level to avoid context leaks on re-renders
let _canRenderScene: boolean | null = null

export function canRenderScene(): boolean {
  if (_canRenderScene !== null) return _canRenderScene

  if (typeof window === 'undefined') {
    _canRenderScene = false
    return false
  }

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    _canRenderScene = false
    return false
  }

  try {
    const c = document.createElement('canvas')
    const ctx = c.getContext('webgl2') || c.getContext('webgl')
    // Release the probe context via its extension (loseContext is not on the context itself)
    ctx?.getExtension?.('WEBGL_lose_context')?.loseContext()
    _canRenderScene = !!ctx
    return _canRenderScene
  } catch {
    _canRenderScene = false
    return false
  }
}

// Decoration only: no WebGL or reduced motion renders nothing, and the deck works without it.
export function Background() {
  const [shouldRender, setShouldRender] = useState(canRenderScene())

  useEffect(() => {
    // Re-check in case user toggles WebGL or reduced-motion settings
    if (!canRenderScene()) {
      setShouldRender(false)
    }
  }, [])

  if (!shouldRender) return null

  return (
    <SceneBoundary>
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </SceneBoundary>
  )
}
