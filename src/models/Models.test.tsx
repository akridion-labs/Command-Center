import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ModelsPanel, ModelsSection, firstTryPercent, type ModelsResponse } from './Models'
import { AskBox } from '../ask/AskBox'
import { SelfCheckPanel, DoctorPanel } from '../panels/Panels'
import type { Panel } from '../api'

const MODELS: Extract<Panel<ModelsResponse>, { built: true }> = {
  built: true,
  default: 'qwen2.5-coder:14b',
  models: [
    { name: 'qwen2.5-coder:14b', default: true },
    { name: 'llama3.1:8b', default: false },
  ],
  build_loop_evidence: {
    'qwen2.5-coder:14b': { calls: 120, minutes: 95, slices_ok: 12, first_try: 9 },
    'llama3.1:8b': { calls: 40, minutes: 31, slices_ok: 4, first_try: 1 },
  },
}

const mockFetch = vi.fn<typeof fetch>()
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function cells(model: string): string[] {
  const row = document.querySelector(`tr[data-model="${model}"]`)
  return row ? Array.from(row.querySelectorAll('td'), (td) => td.textContent ?? '') : []
}

function ask(question: string) {
  fireEvent.change(screen.getByPlaceholderText('Ask a question...'), { target: { value: question } })
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
}

function picker() {
  return screen.getByRole('combobox', { name: 'Model' }) as HTMLSelectElement
}

function postedBodies(): unknown[] {
  return mockFetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
}

describe('Model console', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('TC-21-15: models panel lists each local model, marks the default, and shows calls, minutes, slices ok and first-try %', () => {
    render(<ModelsPanel panel={MODELS} />)
    expect(screen.getByText('qwen2.5-coder:14b', { selector: '.card-note .mono' }).textContent).toBe('qwen2.5-coder:14b')
    expect(cells('qwen2.5-coder:14b')).toEqual(['qwen2.5-coder:14b default', '120', '95', '12', '75%'])
    expect(cells('llama3.1:8b')).toEqual(['llama3.1:8b', '40', '31', '4', '25%'])
    expect(document.querySelectorAll('tbody tr').length).toBe(2)
  })

  it('TC-21-15: a model with no build-loop evidence shows dashes, and first-try % never divides by zero', () => {
    render(<ModelsPanel panel={{ ...MODELS, build_loop_evidence: {} }} />)
    expect(cells('llama3.1:8b')).toEqual(['llama3.1:8b', '-', '-', '-', '-'])
    expect(firstTryPercent({ calls: 3, minutes: 2, slices_ok: 0, first_try: 0 })).toBe('-')
  })

  it('TC-21-15: no installed models shows its empty words, not a blank table', () => {
    render(<ModelsPanel panel={{ ...MODELS, models: [], build_loop_evidence: {} }} />)
    expect(screen.getByText('no local models installed').textContent).toBe('no local models installed')
    expect(document.querySelector('table')).toBe(null)
  })

  it('TC-21-15: NOT BUILT shows the why verbatim; loading shows loading', () => {
    const { rerender } = render(<ModelsPanel panel={null} />)
    expect(screen.getByText('loading…').textContent).toBe('loading…')
    rerender(<ModelsPanel panel={{ built: false, why: 'no local model server answered' }} />)
    expect(screen.getByText('NOT BUILT').textContent).toBe('NOT BUILT')
    expect(screen.getByText('no local model server answered').textContent).toBe('no local model server answered')
  })

  it('TC-21-15: an unreachable /vyom/models offers Retry, which calls back; a plain NOT BUILT does not', () => {
    const retry = vi.fn()
    const { rerender } = render(<ModelsSection panel={{ built: false, why: '/vyom/models unreachable' }} onRetry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalledTimes(1)
    rerender(<ModelsSection panel={{ built: false, why: 'not permitted for your role' }} onRetry={retry} />)
    expect(screen.queryByRole('button', { name: 'Retry' })).toBe(null)
  })

  it('TC-21-05: one question asked with two different models sends each chosen model', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'from qwen', sources: [] }))
    mockFetch.mockResolvedValueOnce(json({ answer: 'from llama', sources: [] }))
    render(<AskBox models={MODELS.models.map((m) => m.name)} defaultModel="qwen2.5-coder:14b" />)

    fireEvent.change(picker(), { target: { value: 'qwen2.5-coder:14b' } })
    ask('why did slice 20 stall?')
    await screen.findByText('from qwen')

    fireEvent.change(picker(), { target: { value: 'llama3.1:8b' } })
    ask('why did slice 20 stall?')
    await screen.findByText('from llama')

    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual(['/vyom/ask', '/vyom/ask'])
    // Story 13 AC5: the second ask is a follow-up, so it also carries the previous turn.
    expect(postedBodies()).toEqual([
      { query: 'why did slice 20 stall?', model: 'qwen2.5-coder:14b' },
      { query: 'why did slice 20 stall?', model: 'llama3.1:8b', history: [{ query: 'why did slice 20 stall?', answer: 'from qwen' }] },
    ])
  })

  it('TC-21-05: with no model chosen the request carries no model, so the brain uses its default', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'default answer', sources: [] }))
    render(<AskBox models={['qwen2.5-coder:14b', 'llama3.1:8b']} defaultModel="qwen2.5-coder:14b" />)
    ask('status?')
    await screen.findByText('default answer')
    expect(postedBodies()).toEqual([{ query: 'status?' }])
  })

  it('TC-21-04: a 400 unknown_model from /vyom/ask shows the error code, not a blank answer', async () => {
    mockFetch.mockResolvedValueOnce(json({ error: 'unknown_model' }, 400))
    render(<AskBox models={['qwen2.5-coder:14b', 'llama3.1:8b']} />)
    fireEvent.change(picker(), { target: { value: 'llama3.1:8b' } })
    ask('status?')
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Error: HTTP 400 unknown_model')
    expect(screen.queryByTestId('ask-answer')).toBe(null)
  })

  it('TC-21-07: the picker lists every model from /vyom/models and marks the default', () => {
    render(<AskBox models={['qwen2.5-coder:14b', 'llama3.1:8b']} defaultModel="qwen2.5-coder:14b" />)
    const options = Array.from(picker().options, (o) => [o.value, o.textContent])
    expect(options).toEqual([
      ['', 'brain default (qwen2.5-coder:14b)'],
      ['qwen2.5-coder:14b', 'qwen2.5-coder:14b (default)'],
      ['llama3.1:8b', 'llama3.1:8b'],
    ])
  })

  it('TC-21-13: selfcheck rows show level, area, text and the fix command', () => {
    render(<SelfCheckPanel panel={{
      built: true,
      at: '2026-09-30T08:00:00Z',
      rows: [
        { level: 'ok', area: 'brain', text: 'all checks green', fix: '' },
        { level: 'bad', area: 'vault', text: 'index is 3 days old', fix: 'ojas index --refresh' },
      ],
    }} />)
    const rows = Array.from(document.querySelectorAll('li[data-level]'))
    expect(rows.map((r) => r.getAttribute('data-level'))).toEqual(['ok', 'bad'])
    expect(rows[0].textContent).toBe('ok brain all checks green')
    expect(rows[1].textContent).toBe('bad vault index is 3 days oldojas index --refresh')
    expect(rows[1].querySelector('code')?.textContent).toBe('ojas index --refresh')
    expect(rows[0].querySelector('code')).toBe(null)
  })

  it('TC-21-14: doctor shows each check; a failing one shows its cause and a copyable do command; fixed shows "fixed automatically"', () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<DoctorPanel panel={{
      built: true,
      at: '2026-09-30T08:00:00Z',
      checks: [
        { name: 'ollama reachable', ok: true },
        { name: 'vault index', ok: true, fixed: true, detail: 'stale lock removed' },
        { name: 'GPU memory', ok: false, cause: 'GPU memory near capacity', do: 'ojas doctor --fix' },
      ],
    }} />)
    const items = Array.from(document.querySelectorAll('li'))
    expect(items.map((li) => li.getAttribute('data-ok'))).toEqual(['true', 'true', 'false'])
    expect(items[0].textContent).toBe('✓ ollama reachable')
    expect(items[1].textContent).toBe('✓ vault indexfixed automaticallystale lock removed')
    expect(items[2].textContent).toContain('GPU memory near capacity')
    expect(items[2].querySelector('code.mono')?.textContent).toBe('ojas doctor --fix')
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('ojas doctor --fix')
  })
})
