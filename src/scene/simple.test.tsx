import { describe, it, expect, vi } from 'vitest'
import { canRenderScene } from './Background'

describe('canRenderScene', () => {
  it('returns false when WebGL is not available', () => {
    // Mock canvas with no WebGL context
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null),
      width: 1,
      height: 1
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

    expect(canRenderScene()).toBe(false)
  })

  it('returns false when prefers-reduced-motion is reduce', () => {
    // Mock canvas with WebGL context
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({}),
      width: 1,
      height: 1
    }

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLCanvasElement)

    // Mock matchMedia to return reduced motion
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn()
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia
    })

    expect(canRenderScene()).toBe(false)
  })
})