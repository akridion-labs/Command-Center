// The scene's cost ceiling: it shares the RTX 5070 with Ollama and is viewed over RDP.
export const POINT_COUNT = 400
export const FPS = 24

// frameloop="demand" draws only when invalidated: tick at FPS, and not at all while the window is hidden.
export function startTicker(invalidate: () => void, fps = FPS): () => void {
  let timer: number | undefined
  const start = () => {
    if (timer === undefined) timer = window.setInterval(() => invalidate(), 1000 / fps)
  }
  const stop = () => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
  const onVisibility = () => (document.hidden ? stop() : start())
  // Only start if document is not hidden at initialization
  if (!document.hidden) {
    start()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
