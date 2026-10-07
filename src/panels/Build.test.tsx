import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { BuildPanel, type BuildResponse, type BuildSlice } from './Build'
import { useEndpoint } from './Panels'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const slice = (id: string, state: BuildSlice['state'], next = ''): BuildSlice =>
  ({ id, title: `slice ${id}`, state, status: `status of ${id}`, next })

const BUILT: BuildResponse = {
  slices: [
    slice('7', 'todo', 'ojas build --slice 7'),
    slice('1', 'done'),
    slice('3', 'parked'),
    slice('2', 'look', 'ojas build --look 2'),
    slice('5', 'yours'),
    slice('4', 'needs_you', 'ojas build --why 4'),
    slice('6', 'reopened'),
  ],
  count: { done: 1, look: 1, parked: 1, needs_you: 1, reopened: 1, yours: 1, todo: 1 },
  finished_by: { 'claude-opus-5-5': 3, 'qwen2.5-coder:7b': 1 },
}

/** The deck's real loader for this panel, so the tests run the real fetch/status code. */
function Loaded() {
  return <BuildPanel panel={useEndpoint<BuildResponse>('/vyom/build')} />
}
const reply = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))))

describe('build loop panel', () => {
  it('TC-24-10: groups slices by state in the morning-check order, each with its status line', () => {
    const { container } = render(<BuildPanel panel={{ built: true, ...BUILT }} />)
    const groups = Array.from(container.querySelectorAll('.slice-group'))
    expect(groups.map((g) => g.querySelector('h3')?.textContent)).toEqual(
      ['done', 'waiting for your look', 'parked', 'needs you', 'reopened', 'yours', 'to do'])
    expect(groups.map((g) => g.querySelector('.slice-title')?.textContent)).toEqual(
      ['slice 1', 'slice 2', 'slice 3', 'slice 4', 'slice 6', 'slice 5', 'slice 7'])
    expect(groups[0].querySelector('.slice-status')?.textContent).toBe('status of 1')
  })

  it('TC-24-11: a slice with a next command shows it in monospace with a Copy button; "" shows none', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { container } = render(<BuildPanel panel={{ built: true, ...BUILT }} />)
    const cmds = Array.from(container.querySelectorAll('.slice-next code.mono')).map((c) => c.textContent)
    expect(cmds).toEqual(['ojas build --look 2', 'ojas build --why 4', 'ojas build --slice 7'])
    expect(container.querySelectorAll('.copy-button').length).toBe(3)
    expect(container.querySelector('[data-state="done"] .copy-button')).toBe(null)
    fireEvent.click(container.querySelector('[data-state="todo"] .copy-button')!)
    expect(writeText).toHaveBeenCalledWith('ojas build --slice 7')
    await waitFor(() => expect(container.querySelector('[data-state="todo"] .slice-next')?.textContent).toContain('copied'))
  })

  it('TC-24-11: a failed copy says so instead of an unhandled rejection', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } })
    render(<BuildPanel panel={{ built: true, ...BUILT, slices: [slice('9', 'todo', 'ojas build --slice 9')] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect((await screen.findByRole('alert')).textContent).toContain('copy failed')
  })

  it('TC-24-12: shows which models finished the slices and how many each', () => {
    const { container } = render(<BuildPanel panel={{ built: true, ...BUILT }} />)
    const rows = Array.from(container.querySelectorAll('.finished-by li')).map((li) => li.textContent)
    expect(rows).toEqual(['claude-opus-5-5 - 3', 'qwen2.5-coder:7b - 1'])
  })

  it('loads through api.ts: built with zero slices says so', async () => {
    reply(200, { built: true, slices: [], count: {}, finished_by: {} })
    render(<Loaded />)
    expect(screen.getByText('loading…')).toBeTruthy()
    expect((await screen.findByText('No build slices found')).textContent).toBe('No build slices found')
  })

  it('loads through api.ts: NOT BUILT shows its why, 403 is not permitted, 500 is unreachable', async () => {
    reply(200, { built: false, why: 'ojas build --serve is not running' })
    render(<Loaded />)
    expect((await screen.findByText('ojas build --serve is not running')).textContent).toBeTruthy()
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    cleanup()
    reply(403, {})
    render(<Loaded />)
    expect((await screen.findByText('not permitted for your role')).textContent).toBeTruthy()
    cleanup()
    reply(500, { error: 'boom' })
    render(<Loaded />)
    expect((await screen.findByText('/vyom/build unreachable')).textContent).toBeTruthy()
    expect(document.querySelector('.slice-group')).toBe(null)
  })
})
