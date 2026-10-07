import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DoctorPanel } from './Doctor'
import { useEndpoint } from './Panels'
import type { DoctorResponse } from '../api'

const AT = '2026-09-30T08:00:00Z'
const DOCTOR: DoctorResponse = {
  at: AT,
  checks: [
    { name: 'ollama reachable', ok: true },
    { name: 'vault index', ok: true, fixed: true, detail: 'stale lock removed' },
    { name: 'GPU memory', ok: false, cause: 'GPU memory near capacity', do: 'ojas doctor --fix' },
  ],
}

function LoadedDoctor() {
  return <DoctorPanel panel={useEndpoint<DoctorResponse>('/vyom/doctor')} />
}

const items = () => Array.from(document.querySelectorAll('li'))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DoctorPanel', () => {
  it('TC-20-1: every check is listed with its ok status', () => {
    render(<DoctorPanel panel={{ built: true, ...DOCTOR }} />)
    expect(screen.getByText('Doctor').textContent).toBe('Doctor')
    expect(items().map((li) => li.getAttribute('data-ok'))).toEqual(['true', 'true', 'false'])
    expect(items()[0].textContent).toBe('✓ ollama reachable')
  })

  it('TC-20-4: the panel fetches /vyom/doctor through api.ts and renders what it returns', async () => {
    const fetchMock = vi.fn(async (_url: string) => new Response(JSON.stringify(DOCTOR), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<LoadedDoctor />)
    expect(screen.getByText('loading…').textContent).toBe('loading…')
    await screen.findByText('GPU memory near capacity')
    // models and releases belong to the Deck's own sections; this panel makes exactly one call
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/vyom/doctor'])
    expect(items().length).toBe(3)
  })

  it('TC-20-13: a failing check shows its cause and its do command in monospace; fixed shows "fixed automatically"', () => {
    render(<DoctorPanel panel={{ built: true, ...DOCTOR }} />)
    const [, fixed, failing] = items()
    expect(fixed.textContent).toBe('✓ vault indexfixed automaticallystale lock removed')
    expect(failing.textContent).toContain('✗ GPU memory')
    expect(failing.textContent).toContain('GPU memory near capacity')
    expect(failing.querySelector('code.mono')?.textContent).toBe('ojas doctor --fix')
    expect(failing.querySelector('button')?.textContent).toBe('Copy')
    expect(items()[0].querySelector('code')).toBe(null)
  })

  it('TC-20-13: a built answer with no checks shows its empty words, not a blank card', () => {
    render(<DoctorPanel panel={{ built: true, at: AT, checks: [] }} />)
    expect(screen.getByText('no checks reported').textContent).toBe('no checks reported')
    expect(document.querySelector('ul')).toBe(null)
  })

  it('TC-20-5: a 403 from /vyom/doctor shows NOT BUILT "not permitted for your role"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })))
    render(<LoadedDoctor />)
    await screen.findByText('not permitted for your role')
    expect(screen.getByText('NOT BUILT').textContent).toBe('NOT BUILT')
    expect(document.querySelector('li')).toBe(null)
  })

  it('TC-20-4: a 500 from /vyom/doctor shows it as unreachable, never as an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    render(<LoadedDoctor />)
    await screen.findByText('/vyom/doctor unreachable')
    expect(screen.queryByText('no checks reported')).toBe(null)
  })
})
