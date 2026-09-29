/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { colors, fonts, layout } from './tokens'

const root = process.cwd()
const here = resolve(root, 'src/design')
const ref = readFileSync(resolve(root, 'docs/design/Vyom Command Deck.dc.html'), 'utf8')
const css = readFileSync(resolve(here, 'deck.css'), 'utf8')

describe('design tokens match the reference source', () => {
  it.each(Object.entries(colors))('colour %s is used by the reference', (_k, v) => {
    expect(ref.toLowerCase()).toContain(v)
  })

  it('brand variables are declared identically', () => {
    for (const [name, v] of [['magenta', colors.magenta], ['cyan', colors.cyan], ['green', colors.green]]) {
      expect(ref).toContain(`--brand-${name}:${v}`)
      expect(css).toContain(`--brand-${name}: ${v}`)
    }
  })

  it('fonts are Rajdhani and JetBrains Mono', () => {
    expect(fonts.sans).toContain('Rajdhani')
    expect(fonts.mono).toContain('JetBrains Mono')
    expect(ref).toContain("font-family:'Rajdhani'")
    expect(css).toContain("'Rajdhani'")
  })

  it('grid: 4 cols, 6 at 1440, 2 at 980, 1 at 560, gap 12', () => {
    expect(ref).toContain('.cd-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}')
    expect(ref).toContain('@media(min-width:1440px){.cd-grid{grid-template-columns:repeat(6,1fr)}')
    expect(css).toContain('grid-template-columns: repeat(4, 1fr); gap: 12px')
    expect(css).toContain('min-width: 1440px')
    expect(css).toContain('grid-template-columns: repeat(6, 1fr)')
    expect(css).toContain('max-width: 980px')
    expect(css).toContain('max-width: 560px')
    expect(layout.columns).toEqual({ base: 4, wide: 6, mid: 2, narrow: 1 })
  })

  it('deck container: max 1560, 20px padding, 110px left at >=1100', () => {
    expect(ref).toContain('.deck{position:relative;z-index:1;max-width:1560px;margin:0 auto;padding:20px 20px 56px}')
    expect(css).toContain('max-width: 1560px; margin: 0 auto; padding: 20px 20px 56px')
    expect(css).toMatch(/min-width: 1100px\) \{ \.deck \{ padding-left: 110px/)
    expect(layout.deckMaxWidth).toBe(1560)
  })

  it('card recipe matches the reference', () => {
    expect(ref).toContain('background:linear-gradient(180deg,rgba(17,26,41,.82),rgba(10,16,28,.9));border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px')
    expect(css).toContain('linear-gradient(180deg, rgba(17, 26, 41, 0.82), rgba(10, 16, 28, 0.9))')
    expect(css).toContain('border-radius: 14px; padding: 16px')
  })

  it('does not reference external hosts (CSP: script-src self)', () => {
    expect(css).not.toMatch(/https?:\/\//)
  })
})
