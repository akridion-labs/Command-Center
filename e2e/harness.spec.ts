import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

// Lists (does not run) the suite in a child process, the way the person runs it.
const list = (...args: string[]) =>
  execFileSync('npx', ['playwright', 'test', '--list', ...args], { encoding: 'utf8', timeout: 60_000 })

test.describe('Harness', () => {
  test('TC-12b-3: Given the `e2e` script When `npm run e2e` runs Then no visual-tagged test is listed or executed', () => {
    // (the title avoids the tag itself, or --grep-invert would filter out this very test)
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
    expect(pkg.scripts.e2e).toBe('playwright test --grep-invert @visual')

    const e2e = list('--grep-invert', '@visual')
    expect(e2e).toContain('TC-12b-6:')
    expect(e2e).not.toContain('@visual')
    expect(e2e).not.toContain('visual.spec.ts')

    // Not vacuous: the visual tests exist and carry the tag
    const visual = list('--grep', '@visual')
    expect(visual).toContain('TC-12b-21:')
    expect(visual).toContain('TC-12b-22:')
  })

  test('TC-12b-25: Given the suite When run twice in a row Then both runs pass with the same results', () => {
    test.setTimeout(600_000)
    // Every behaviour spec, not this file - a harness that ran itself would recurse
    const specs = ['e2e/panels.spec.ts', 'e2e/ask.spec.ts', 'e2e/tiles.spec.ts', 'e2e/intranet.spec.ts']
    const run = () => {
      const out = spawnSync('npx', ['playwright', 'test', ...specs, '--grep-invert', '@visual', '--reporter=json'], {
        encoding: 'utf8',
        timeout: 280_000,
        maxBuffer: 64 * 1024 * 1024,
      })
      expect(out.status, out.stderr).toBe(0)
      return outcomes(JSON.parse(out.stdout) as Report)
    }

    const first = run()
    const second = run()
    expect(Object.keys(first).length).toBeGreaterThanOrEqual(15)
    expect(Object.values(first).every((s) => s === 'passed')).toBe(true)
    expect(second).toEqual(first)
  })
})

type Suite = { suites?: Suite[]; specs?: { title: string; tests: { results: { status: string }[] }[] }[] }
type Report = { suites: Suite[] }

// title -> final status of each test in a JSON report
function outcomes(report: Report): Record<string, string> {
  const found: Record<string, string> = {}
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? []) {
      const results = spec.tests.flatMap((t) => t.results)
      found[spec.title] = results[results.length - 1]?.status ?? 'missing'
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  report.suites.forEach(walk)
  return found
}
