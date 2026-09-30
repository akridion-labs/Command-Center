// @vitest-environment node
/// <reference types="node" />
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Runs vitest in a child process with THIS file excluded, so the check cannot recurse into itself.
const ROOT = resolve(__dirname, '../..')
const VITEST = join(ROOT, 'node_modules/vitest/vitest.mjs')

interface Report {
  success: boolean
  numFailedTests: number
  numPassedTests: number
  testResults: { assertionResults: { title: string; status: string }[] }[]
}

function runVitest(...filters: string[]): Report {
  const out = join(mkdtempSync(join(tmpdir(), 'vitest-')), 'report.json')
  const result = spawnSync(
    process.execPath,
    [VITEST, 'run', ...filters, '--exclude', 'src/scene/suite.test.ts', '--reporter=json', `--outputFile=${out}`],
    { cwd: ROOT, encoding: 'utf8' },
  )
  expect(result.status).toBe(0)
  return JSON.parse(readFileSync(out, 'utf8')) as Report
}

const SCENE_CASES = ['TC-10-8', 'TC-10-10', 'TC-10-12', 'TC-10-13', 'TC-10-16', 'TC-10-19', 'TC-10-21', 'TC-10-22', 'TC-10-23', 'TC-10-24', 'TC-10-25']

describe('scene suite', () => {
  it('TC-10-28: npx vitest run src/scene passes every scene test case', () => {
    const report = runVitest('src/scene')
    expect(report.success).toBe(true)
    expect(report.numFailedTests).toBe(0)
    const passed = report.testResults.flatMap((f) => f.assertionResults).filter((a) => a.status === 'passed').map((a) => a.title)
    for (const id of SCENE_CASES) {
      expect(passed.some((title) => title.startsWith(`${id}:`)), `${id} has a passing test`).toBe(true)
    }
  }, 120_000)

  it('TC-10-29: the whole suite passes with npx vitest run', () => {
    const report = runVitest()
    expect(report.success).toBe(true)
    expect(report.numFailedTests).toBe(0)
    expect(report.numPassedTests).toBeGreaterThan(0)
  }, 120_000)
})
