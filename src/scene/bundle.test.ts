// @vitest-environment node
/// <reference types="node" />
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const root = process.cwd()
const json = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'))

// Enough semver for a peer range: space-separated comparators, ORed with "||".
function parts(v: string): number[] {
  return v.replace(/^v/, '').split('-')[0].split('.').map((p) => (p === 'x' || p === '*' ? 0 : Number(p)))
}
function compare(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0)
  return 0
}
function satisfies(version: string, range: string): boolean {
  const v = parts(version)
  return range.split('||').some((set) => set.trim().split(/\s+/).every((c) => {
    const [, op, raw] = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(c)!
    const r = parts(raw)
    const bump = (i: number) => r.map((n, j) => (j < i ? n : j === i ? n + 1 : 0))
    switch (op) {
      case '>=': return compare(v, r) >= 0
      case '>': return compare(v, r) > 0
      case '<=': return compare(v, r) <= 0
      case '<': return compare(v, r) < 0
      case '^': return compare(v, r) >= 0 && compare(v, bump(r[0] === 0 ? 1 : 0)) < 0
      case '~': return compare(v, r) >= 0 && compare(v, bump(1)) < 0
      default: return raw.split('.').length < 3 || /x|\*/.test(raw) ? compare(v, r) >= 0 && compare(v, bump(raw.split('.').filter((p) => /\d/.test(p)).length - 1)) < 0 : compare(v, r) === 0
    }
  }))
}

describe('dependencies', () => {
  it('TC-10-2: three and R3F are dependencies, @types/three is a devDependency, and R3F accepts the installed React', () => {
    const pkg = json('package.json')
    const lock = json('package-lock.json')
    const react = json('node_modules/react/package.json').version as string
    const fiberPeer = json('node_modules/@react-three/fiber/package.json').peerDependencies.react as string

    expect(pkg.dependencies.three).toBeTruthy()
    expect(pkg.dependencies['@react-three/fiber']).toBeTruthy()
    expect(pkg.devDependencies['@types/three']).toBeTruthy()
    expect(pkg.dependencies['@types/three']).toBeUndefined()
    expect(lock.packages['node_modules/react'].version).toBe(react)
    expect(satisfies(react, fiberPeer), `R3F peer react "${fiberPeer}" vs installed ${react}`).toBe(true)
  })
})

describe('built console', () => {
  let out = ''
  const files: string[] = []
  const read = (rel: string) => readFileSync(join(out, rel), 'utf8')

  beforeAll(async () => {
    out = mkdtempSync(join(tmpdir(), 'vyom-console-'))
    await promisify(execFile)(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], { cwd: root })
    const walk = (dir: string) => {
      for (const e of readdirSync(join(out, dir), { withFileTypes: true })) {
        const rel = dir ? `${dir}/${e.name}` : e.name
        if (e.isDirectory()) walk(rel)
        else files.push(rel)
      }
    }
    walk('')
  }, 120_000)

  afterAll(() => {
    if (out) rmSync(out, { recursive: true, force: true })
  })

  it('TC-10-4: no built file or index.html references a script, stylesheet, font or asset on another origin', () => {
    const offOrigin = /^(https?:)?\/\//i
    const html = read('index.html')
    const htmlRefs = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1])
    const cssRefs = files.filter((f) => f.endsWith('.css'))
      .flatMap((f) => [...read(f).matchAll(/(?:url\(\s*["']?|@import\s+["'])([^"')]+)/gi)].map((m) => m[1]))
    const jsImports = files.filter((f) => f.endsWith('.js'))
      .flatMap((f) => [...read(f).matchAll(/\bimport\s*\(\s*["'`]([^"'`]+)|\bfrom\s*["']([^"']+)/g)].map((m) => m[1] ?? m[2]))

    expect(htmlRefs.length).toBeGreaterThan(0)
    expect(htmlRefs.filter((r) => offOrigin.test(r))).toEqual([])
    expect(cssRefs.filter((r) => offOrigin.test(r))).toEqual([])
    expect(jsImports.filter((r) => offOrigin.test(r))).toEqual([])
    expect(html).not.toMatch(/cdn/i)
  })

  it('TC-10-6: the entry chunk has no three.js and the scene is its own chunk', () => {
    const html = read('index.html')
    const entry = /<script[^>]+type="module"[^>]+src="\/console\/([^"]+)"/.exec(html)?.[1]
    expect(entry).toBeTruthy()
    const sceneChunks = files.filter((f) => /^assets\/Scene-[^/]+\.js$/.test(f))
    const threeChunks = files.filter((f) => f.endsWith('.js') && read(f).includes('WebGLRenderer'))

    expect(read(entry!)).not.toContain('WebGLRenderer')
    expect(sceneChunks.length).toBe(1)
    expect(threeChunks.length).toBeGreaterThan(0)
    expect(threeChunks).not.toContain(entry)
    expect(html).not.toContain(sceneChunks[0].split('/').pop())
  })
})
