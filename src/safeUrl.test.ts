import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { safeUrl } from './safeUrl'

const DECK = 'https://deck.intranet:8443'

const unsafe = (url: unknown, origin = DECK) => {
  const r = safeUrl(url, origin)
  expect(r.isSafe, String(url)).toBe(false)
  return r
}

describe('safeUrl', () => {
  it('TC-27-01: relative paths are safe and returned unchanged as the href', () => {
    for (const url of ['/docs/a', 'docs/a', '#sec-x']) {
      expect(safeUrl(url, DECK)).toEqual({ isSafe: true, href: url })
    }
  })

  it("TC-27-02: http(s) on the deck's own origin is safe", () => {
    expect(safeUrl(`${DECK}/x`, DECK)).toEqual({ isSafe: true, href: `${DECK}/x` })
    expect(safeUrl('http://localhost:4173/x', 'http://localhost:4173')).toEqual({ isSafe: true, href: 'http://localhost:4173/x' })
  })

  it('TC-27-03: another host, another port, or http against an https deck is unsafe', () => {
    unsafe('https://other.example/x')
    unsafe('https://deck.intranet:9443/x')
    unsafe('http://deck.intranet:8443/x')
    unsafe('http://localhost:8765/x', 'http://localhost:4173')
  })

  it('TC-27-04: every other scheme, however disguised, is unsafe and keeps its address', () => {
    const urls = [
      'javascript:alert(1)', 'JaVaScRiPt:x', ' javascript:x', 'java\tscript:x', 'java\nscript:x',
      'data:text/html,x', 'vbscript:x', 'ftp://h/f', 'mailto:a@b.c', 'tel:1', 'file:///etc/passwd',
    ]
    for (const url of urls) expect(unsafe(url)).toEqual({ isSafe: false, text: url.trim() })
  })

  it('TC-27-05: protocol-relative and backslash tricks are not relative', () => {
    for (const url of ['//evil.example/x', '/\\evil.example', '\\\\evil.example', ' //evil.example']) unsafe(url)
  })

  it('TC-27-06: empty, missing, non-string and unparseable input is unsafe and never throws', () => {
    for (const url of ['', undefined, null, 42, {}]) expect(() => unsafe(url)).not.toThrow()
    expect(unsafe('http://[bad')).toEqual({ isSafe: false, text: 'http://[bad' })
    expect(unsafe(null)).toEqual({ isSafe: false, text: '' })
    // no known origin (no browser): absolute URLs cannot be proved same-origin
    expect(safeUrl('https://deck.intranet:8443/x', undefined).isSafe).toBe(false)
  })

  it('TC-27-07: this suite lives at src/safeUrl.test.ts and covers every URL class in AC1-AC6', () => {
    const path = join('src', 'safeUrl.test.ts')
    expect(statSync(path).isFile()).toBe(true)
    const titles = [...readFileSync(path, 'utf8').matchAll(/it\(['"](TC-27-0[1-6]):/g)].map((m) => m[1])
    expect(titles).toEqual(['TC-27-01', 'TC-27-02', 'TC-27-03', 'TC-27-04', 'TC-27-05', 'TC-27-06'])
  })

  it('TC-27-08: server URLs reach href only through safeUrl and nothing uses dangerouslySetInnerHTML', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(p)
      }
    }
    walk('src')
    const hrefs: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      expect(text.includes('dangerouslySetInnerHTML'), f).toBe(false)
      for (const m of text.matchAll(/href=\{([^}]*)\}/g)) {
        // in-page `#…` fragments are built by the app itself, not from server data
        if (!m[1].trim().startsWith('`#')) hrefs.push(`${f}: ${m[1].trim()}`)
      }
    }
    // the only href fed by a server string is the one safeUrl produced
    expect(hrefs).toEqual([join('src', 'ask', 'AskBox.tsx') + ': link.href'])
  })
})
