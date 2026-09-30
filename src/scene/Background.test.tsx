import type { ComponentType } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'

// The browser the scene is judged against: whether WebGL exists, and whether reduce-motion is on.
function browser({ webgl, reduceMotion }: { webgl: boolean; reduceMotion: boolean }) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(webgl ? ({} as WebGL2RenderingContext) : null)
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduceMotion && query.includes('reduce'), media: query }))
}

// A fresh module graph per test, so React.lazy has not already cached a Scene import from an earlier test.
async function withScene(sceneModule: () => { default: ComponentType }) {
  vi.resetModules()
  vi.doMock('./Scene', sceneModule)
  return import('./Background')
}

afterEach(() => {
  cleanup()
  vi.doUnmock('./Scene')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Background', () => {
  it('TC-10-8: renders nothing when canvas.getContext returns null for webgl and webgl2', async () => {
    browser({ webgl: false, reduceMotion: false })
    const imported = vi.fn()
    const { Background, canRenderScene } = await withScene(() => {
      imported()
      return { default: () => <canvas /> }
    })

    const { container } = render(<Background />)
    await act(async () => {})

    expect(canRenderScene()).toBe(false)
    expect(container.innerHTML).toBe('')
    expect(imported).not.toHaveBeenCalled()
  })

  it('TC-10-10: with prefers-reduced-motion it renders nothing and never imports the Scene module', async () => {
    browser({ webgl: true, reduceMotion: true })
    const imported = vi.fn()
    const { Background, canRenderScene } = await withScene(() => {
      imported()
      return { default: () => <canvas /> }
    })

    const { container } = render(<Background />)
    await act(async () => {})

    expect(canRenderScene()).toBe(false)
    expect(container.innerHTML).toBe('')
    expect(imported).not.toHaveBeenCalled()
  })

  it('renders the scene when WebGL exists and motion is allowed (control for TC-10-8/10)', async () => {
    browser({ webgl: true, reduceMotion: false })
    const { Background, canRenderScene } = await withScene(() => ({ default: () => <canvas data-testid="scene" /> }))

    const { findByTestId } = render(<Background />)

    expect(canRenderScene()).toBe(true)
    expect((await findByTestId('scene')).tagName).toBe('CANVAS')
  })

  it('TC-10-12: a rejected Scene import leaves the panels rendered and does not reach the page', async () => {
    browser({ webgl: true, reduceMotion: false })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { Background } = await withScene(() => {
      throw new Error('chunk failed to load')
    })

    const { container, getByTestId } = render(
      <main>
        <Background />
        <section data-testid="panel">panel</section>
      </main>,
    )

    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
    expect(getByTestId('panel').textContent).toBe('panel')
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('TC-10-13: a Scene that throws while rendering inside the deck leaves every panel mounted', async () => {
    browser({ webgl: true, reduceMotion: false })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await withScene(() => ({
      default: () => {
        throw new Error('WebGL renderer failed')
      },
    }))
    const { Deck } = await import('../Deck')

    const { container, getByText, getByLabelText } = render(<Deck />)

    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
    expect(getByText(/COMMAND DECK/i).textContent).toContain('COMMAND DECK')
    expect(getByLabelText('Ask Vyom').tagName).toBe('DIV')
    expect(container.querySelector('canvas')).toBeNull()
  })
})
