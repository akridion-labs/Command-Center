import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, waitFor } from '@testing-library/react'
import { NightPanel, type NightResponse } from './Night'
import { useEndpoint } from './Panels'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const REPORT = (markdown: string, at = '2026-10-07 02:14') =>
  ({ built: true, file: 'reports/night-2026-10-07.md', at, markdown })

/** The deck's real loader for this panel, so the tests run the real fetch/status code. */
function Loaded() {
  return <NightPanel panel={useEndpoint<NightResponse>('/vyom/night')} />
}
const reply = (status: number, body: unknown) => {
  const fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
  vi.stubGlobal('fetch', fetch)
  return fetch
}
const panelEl = () => document.querySelector('.panel') as HTMLElement

describe('night report panel', () => {
  it('TC-25-1: headings and lines appear as text in order, # characters still visible', async () => {
    const fetch = reply(200, REPORT('# Night\n## Slices\nslice 24 done'))
    const { container } = render(<Loaded />)
    await screen.findByText('# Night')
    expect(fetch).toHaveBeenCalledWith('/vyom/night', expect.anything())
    const lines = Array.from(container.querySelectorAll('.night-line')).map((l) => l.textContent)
    expect(lines).toEqual(['# Night', '## Slices', 'slice 24 done'])
  })

  it('TC-25-2: the time is the first thing in the panel, above the body, in monospace', async () => {
    reply(200, REPORT('# Night'))
    const { container } = render(<Loaded />)
    const at = await screen.findByText('2026-10-07 02:14')
    expect(at.classList.contains('mono')).toBe(true)
    const report = container.querySelector('.night-report') as HTMLElement
    expect(report.firstElementChild).toBe(at)
    expect(at.nextElementSibling?.classList.contains('night-report-body')).toBe(true)
  })

  it('TC-25-3: markup in the report shows literally and is never turned into elements', async () => {
    const markup = '<b>bold</b><img src=x onerror=alert(1)>'
    reply(200, REPORT(markup))
    render(<Loaded />)
    expect((await screen.findByText(markup)).textContent).toBe(markup)
    expect(panelEl().querySelector('b')).toBe(null)
    expect(panelEl().querySelector('img')).toBe(null)
    expect(panelEl().querySelector('script')).toBe(null)
  })

  it('TC-25-4: while the request is in flight it shows loading, with no time and no body', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    render(<Loaded />)
    expect(screen.getByText('loading…')).toBeTruthy()
    expect(document.querySelector('.night-report-at')).toBe(null)
    expect(document.querySelector('.night-report-body')).toBe(null)
  })

  it('TC-25-5: built with an empty report says "No night report yet" and shows no time', async () => {
    reply(200, { built: true, file: '', at: '', markdown: '' })
    render(<Loaded />)
    expect((await screen.findByText('No night report yet')).textContent).toBe('No night report yet')
    expect(document.querySelector('.night-report-at')).toBe(null)
    expect(document.querySelector('.night-report-body')).toBe(null)
  })

  it('TC-25-6: built:false shows NOT BUILT with its why and no empty body', async () => {
    reply(200, { built: false, why: 'night run has never executed' })
    render(<Loaded />)
    expect((await screen.findByText('night run has never executed')).textContent).toBe('night run has never executed')
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    expect(document.querySelector('.night-report-body')).toBe(null)
  })

  it('TC-25-7: 403 shows NOT BUILT "not permitted for your role" and no report text', async () => {
    reply(403, {})
    render(<Loaded />)
    expect((await screen.findByText('not permitted for your role')).textContent).toBe('not permitted for your role')
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    expect(document.querySelector('.night-report-body')).toBe(null)
  })

  it('TC-25-8: 401 goes to login and the panel shows no report and no error text', async () => {
    const loc = { href: '/console/' }
    vi.stubGlobal('location', loc)
    const fetch = reply(401, REPORT('# should not show'))
    render(<Loaded />)
    await waitFor(() => expect(loc.href).toBe('/vyom/login'))
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    // let the rejected get() settle before asserting nothing appeared
    await new Promise((r) => setTimeout(r, 0))
    const text = panelEl().textContent ?? ''
    expect(text).not.toContain('should not show')
    expect(text).not.toContain('unreachable')
    expect(text).not.toContain('NOT BUILT')
    expect(document.querySelector('.night-report-body')).toBe(null)
  })

  it('TC-25-9: a 500 shows an error message that is not "No night report yet"', async () => {
    reply(500, { error: 'boom' })
    render(<Loaded />)
    expect((await screen.findByText('/vyom/night unreachable')).textContent).toBe('/vyom/night unreachable')
    expect(panelEl().textContent).not.toContain('No night report yet')
  })
})
