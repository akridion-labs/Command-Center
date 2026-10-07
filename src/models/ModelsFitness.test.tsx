import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ModelsPanel, ModelsSection, type ModelsResponse } from './Models'
import { get, type Panel } from '../api'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** What the Deck does: fetch through get(); a thrown non-login failure becomes "unreachable". */
const load = () => get<ModelsResponse>('/vyom/models').catch((): Panel<ModelsResponse> => ({ built: false, why: '/vyom/models unreachable' }))

const FITNESS_MODELS: Extract<Panel<ModelsResponse>, { built: true }> = {
  built: true,
  default: 'qwen2.5-coder:14b',
  models: [
    { name: 'qwen2.5-coder:14b', default: true, fit: true, tests: ['test1.ts', 'test2.ts'] },
    { name: 'llama3.1:8b', default: false, fit: false, fit_why: 'model failed to load required libraries', tests: ['test3.ts'] },
    { name: 'gemma2:2b', default: false, tests: [] }
  ],
  build_loop_evidence: {
    'qwen2.5-coder:14b': { calls: 120, minutes: 95, slices_ok: 12, first_try: 9 },
    'llama3.1:8b': { calls: 40, minutes: 31, slices_ok: 4, first_try: 1 },
    'gemma2:2b': { calls: 5, minutes: 2, slices_ok: 1, first_try: 1 },
  },
}

const mockFetch = vi.fn<typeof fetch>()

describe('Model fitness in console', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('TC-28-01: AC1 - each model shows a fit status indicator', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    // Check that the fitness column exists
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)

    // Check first model (fit=true)
    const firstRow = rows[0]
    const fitStatus1 = firstRow.querySelector('.fit-status') as HTMLElement
    expect(fitStatus1.textContent).toBe('✓')
    expect(fitStatus1.className).toContain('fit')

    // Check second model (fit=false)
    const secondRow = rows[1]
    const fitStatus2 = secondRow.querySelector('.fit-status') as HTMLElement
    expect(fitStatus2.textContent).toBe('✗')
    expect(fitStatus2.className).toContain('unfit')

    // Check third model (fit=undefined)
    const thirdRow = rows[2]
    const fitStatus3 = thirdRow.querySelector('.fit-status') as HTMLElement
    expect(fitStatus3.textContent).toBe('not checked')
    expect(fitStatus3.className).toContain('not-checked')
  })

  it('TC-28-02: AC2 - unfit models show fit_why explanation', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    // Check that the second model shows fit_why
    const secondRow = document.querySelector('tr[data-model="llama3.1:8b"]')
    expect(secondRow).not.toBeNull()

    const fitWhy = secondRow?.querySelector('.fit-why')
    expect(fitWhy).not.toBeNull()
    expect(fitWhy?.textContent).toBe('model failed to load required libraries')
  })

  it('TC-28-03: AC3 - models without fitness data show "not checked"', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    // Check third model (fit=undefined) shows "not checked"
    const thirdRow = document.querySelector('tr[data-model="gemma2:2b"]')
    expect(thirdRow).not.toBeNull()

    const fitStatus = thirdRow?.querySelector('.fit-status') as HTMLElement
    expect(fitStatus.textContent).toBe('not checked')
  })

  it('TC-28-04: AC4 - tests for each model are displayed', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    // Check first model has tests
    const firstRow = document.querySelector('tr[data-model="qwen2.5-coder:14b"]')
    expect(firstRow).not.toBeNull()

    const testList = firstRow?.querySelector('.model-tests')
    expect(testList).not.toBeNull()

    const testItems = testList?.querySelectorAll('.test-item')
    expect(testItems?.length).toBe(2)
    expect(testItems?.[0]?.textContent).toBe('test1.ts')
    expect(testItems?.[1]?.textContent).toBe('test2.ts')

    // Check second model has one test
    const secondRow = document.querySelector('tr[data-model="llama3.1:8b"]')
    expect(secondRow).not.toBeNull()

    const secondTestList = secondRow?.querySelector('.model-tests')
    expect(secondTestList).not.toBeNull()

    const secondTestItems = secondTestList?.querySelectorAll('.test-item')
    expect(secondTestItems?.length).toBe(1)
    expect(secondTestItems?.[0]?.textContent).toBe('test3.ts')

    // Check third model has no tests
    const thirdRow = document.querySelector('tr[data-model="gemma2:2b"]')
    expect(thirdRow).not.toBeNull()

    const noTests = thirdRow?.querySelector('.no-tests')
    expect(noTests).not.toBeNull()
    expect(noTests?.textContent).toBe('No tests')
  })

  it('TC-28-05: AC1 - fit=true shows ✓ indicator', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    const firstRow = document.querySelector('tr[data-model="qwen2.5-coder:14b"]')
    expect(firstRow).not.toBeNull()

    const fitStatus = firstRow?.querySelector('.fit-status.fit')
    expect(fitStatus).not.toBeNull()
    expect(fitStatus?.textContent).toBe('✓')
  })

  it('TC-28-06: AC2 - fit=false shows ✗ and fit_why explanation', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    const secondRow = document.querySelector('tr[data-model="llama3.1:8b"]')
    expect(secondRow).not.toBeNull()

    const fitStatus = secondRow?.querySelector('.fit-status.unfit')
    expect(fitStatus).not.toBeNull()
    expect(fitStatus?.textContent).toBe('✗')

    const fitWhy = secondRow?.querySelector('.fit-why')
    expect(fitWhy).not.toBeNull()
  })

  it('TC-28-07: AC3 - no fit data shows "not checked"', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    const thirdRow = document.querySelector('tr[data-model="gemma2:2b"]')
    expect(thirdRow).not.toBeNull()

    const fitStatus = thirdRow?.querySelector('.fit-status.not-checked')
    expect(fitStatus).not.toBeNull()
    expect(fitStatus?.textContent).toBe('not checked')
  })

  it('TC-28-08: AC4 - tests are shown for each model', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    // Check that all three models have their respective test lists
    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)

    // First model should have 2 tests
    const firstRowTests = rows[0].querySelector('.model-tests')
    expect(firstRowTests).not.toBeNull()

    // Second model should have 1 test
    const secondRowTests = rows[1].querySelector('.model-tests')
    expect(secondRowTests).not.toBeNull()

    // Third model should have no tests
    const thirdRowTests = rows[2].querySelector('.no-tests')
    expect(thirdRowTests).not.toBeNull()
  })

  it('TC-28-09: AC5 - a failing /vyom/models says unreachable and offers Retry', async () => {
    mockFetch.mockResolvedValueOnce(json({ error: 'boom' }, 500))
    const panel = await load()
    render(<ModelsSection panel={panel} onRetry={() => {}} />)
    expect(document.querySelector('.panel p')?.textContent).toBe('/vyom/models unreachable')
    expect(screen.getByRole('button', { name: 'Retry' }).textContent).toBe('Retry')
  })

  it('TC-28-10: AC5 - NOT BUILT shows its why', async () => {
    mockFetch.mockResolvedValueOnce(json({ built: false, why: 'ojas models-check has not run' }))
    render(<ModelsPanel panel={await load()} />)
    expect(screen.getByText('NOT BUILT').textContent).toBe('NOT BUILT')
    expect(document.querySelector('.panel p')?.textContent).toBe('ojas models-check has not run')
  })

  it('TC-28-11: AC5 - a 403 says not permitted for your role', async () => {
    mockFetch.mockResolvedValueOnce(json({ error: 'forbidden' }, 403))
    render(<ModelsPanel panel={await load()} />)
    expect(document.querySelector('.panel p')?.textContent).toBe('not permitted for your role')
    expect(document.querySelector('table')).toBe(null)
  })

  it('TC-28-12: AC5 - zero models says so instead of an empty table', async () => {
    mockFetch.mockResolvedValueOnce(json({ default: '', models: [], build_loop_evidence: {} }))
    render(<ModelsPanel panel={await load()} />)
    expect(document.querySelector('.card-note')?.textContent).toBe('no local models installed')
    expect(document.querySelector('table')).toBe(null)
  })

  it('TC-28-13: AC5 - while loading the panel says loading', () => {
    render(<ModelsPanel panel={null} />)
    expect(document.querySelector('.panel .card-note')?.textContent).toBe('loading…')
    expect(document.querySelector('.fit-status')).toBe(null)
  })

  it('TC-28-05: fitness fields arrive through the shared loader and render per model', async () => {
    mockFetch.mockResolvedValueOnce(json({ default: 'a', models: [{ name: 'a', default: true, fit: false, fit_why: 'no tool calls' }], build_loop_evidence: {} }))
    render(<ModelsPanel panel={await load()} />)
    expect(document.querySelector('tr[data-model="a"] .fit-status')?.textContent).toBe('✗')
    expect(document.querySelector('tr[data-model="a"] .fit-why')?.textContent).toBe('no tool calls')
  })

  it('TC-28-14: AC5 - fit indicators are visually distinguishable', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    const fitStatuses = document.querySelectorAll('.fit-status')
    expect(fitStatuses.length).toBe(3)

    // Check that different status classes exist
    const fit = document.querySelector('.fit-status.fit')
    const unfit = document.querySelector('.fit-status.unfit')
    const notChecked = document.querySelector('.fit-status.not-checked')

    expect(fit).not.toBeNull()
    expect(unfit).not.toBeNull()
    expect(notChecked).not.toBeNull()
  })

  it('TC-28-15: AC5 - tests are properly formatted and readable', () => {
    render(<ModelsPanel panel={FITNESS_MODELS} />)

    const testItems = document.querySelectorAll('.test-item')
    expect(testItems.length).toBe(3) // 2 from first model + 1 from second model

    // Check that they're readable
    const firstTest = testItems[0]
    expect(firstTest.textContent).toBe('test1.ts')

    const secondTest = testItems[1]
    expect(secondTest.textContent).toBe('test2.ts')

    const thirdTest = testItems[2]
    expect(thirdTest.textContent).toBe('test3.ts')
  })
})