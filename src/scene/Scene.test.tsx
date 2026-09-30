/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { CanvasProps } from '@react-three/fiber'
import { FPS, POINT_COUNT } from './budget'
import Scene from './Scene'

// jsdom has no WebGL, so the real Canvas cannot mount: capture the props Scene hands it instead.
const seen = vi.hoisted(() => ({ props: null as CanvasProps | null }))
vi.mock('@react-three/fiber', () => ({
  Canvas: (props: CanvasProps) => {
    seen.props = props
    return null
  },
  useFrame: () => undefined,
  useThree: () => undefined,
}))

const sources = import.meta.glob<string>(['./*.ts', './*.tsx', '!./*.test.ts', '!./*.test.tsx'], {
  query: '?raw', import: 'default', eager: true,
})
const packageJson = Object.values(import.meta.glob<string>('../../package.json', { query: '?raw', import: 'default', eager: true }))[0]
const deckCss = readFileSync('src/design/deck.css', 'utf8')

function canvasProps(): CanvasProps {
  seen.props = null
  render(<Scene />)
  expect(seen.props).not.toBeNull()
  return seen.props!
}

describe('Scene', () => {
  it('TC-10-16: the canvas is aria-hidden, ignores the pointer, and sits fixed below the panels', () => {
    const props = canvasProps()
    const panelZ = Number(/\.deck\s*\{[^}]*z-index:\s*(-?\d+)/.exec(deckCss)?.[1])

    expect(props['aria-hidden']).toBe('true')
    expect(props.style?.pointerEvents).toBe('none')
    expect(props.style?.position).toBe('fixed')
    expect(Number.isFinite(panelZ)).toBe(true)
    expect(Number(props.style?.zIndex)).toBeLessThan(panelZ)
  })

  it('TC-10-19: frameloop is "demand", dpr is 1, antialias is off and the point count is at most 500', () => {
    const props = canvasProps()

    expect(props.frameloop).toBe('demand')
    expect(props.dpr).toBe(1)
    expect(props.gl).toMatchObject({ antialias: false })
    expect(POINT_COUNT).toBeLessThanOrEqual(500)
  })

  it('TC-10-20: no post-processing in the scene source or package.json', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(0)
    for (const text of [...Object.values(sources), packageJson]) {
      expect(text).not.toMatch(/EffectComposer|@react-three\/postprocessing|postprocessing/)
    }
  })

  it('TC-10-25: the tick rate is at most 30 frames per second', () => {
    expect(FPS).toBeGreaterThan(0)
    expect(FPS).toBeLessThanOrEqual(30)
  })
})
