import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { ReleasesSection, loadReleases } from './Releases'
import type { Panel } from '../api'

const GOOD = {
  version: 'v0.3.0', date: '2026-10-01', since: 'v0.2.0', commits: ['a1b2c3', 'd4e5f6'],
  slices: [{ id: '20', title: 'doctor panel', commit: 'a1b2c3', date: '2026-10-01', tests: 6 }],
  fixes: ['login loop'], other: ['docs'],
}

function Loaded() {
  const [panel, setPanel] = useState<Panel<{ releases: unknown[] }> | null>(null)
  useEffect(() => { loadReleases().then(setPanel) }, [])
  return <ReleasesSection panel={panel} />
}

function serve(body: unknown, status = 200) {
  const mock = vi.fn(async (_url: string) => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('Releases', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })

  it('TC-21-06: reads releases.json relative to the app base and lists commits, slices, fixes and other items', async () => {
    const mock = serve([GOOD])
    render(<Loaded />)
    const history = await screen.findByLabelText('Release History')
    expect(mock.mock.calls[0][0]).toBe(`${import.meta.env.BASE_URL}releases.json`)
    const text = history.textContent ?? ''
    for (const s of ['v0.3.0', '2026-10-01', 'v0.2.0', 'Commits: a1b2c3, d4e5f6', 'doctor panel', '6 tests', 'login loop', 'docs']) {
      expect(text).toContain(s)
    }
  })

  it('TC-21-06: one malformed release renders NOT BUILT for itself and the rest still render', async () => {
    serve([GOOD, { version: 'v0.2.0', date: '2026-09-20', since: 'v0.1.0', commits: ['0ff1ce'] }])
    render(<Loaded />)
    const history = await screen.findByLabelText('Release History')
    expect(history.querySelectorAll(':scope > ul > li').length).toBe(2)
    expect(history.textContent).toContain('v0.3.0')
    expect(history.textContent).toContain('NOT BUILT')
    expect(history.textContent).toContain('release #2 is malformed')
  })

  it('TC-21-06: an empty file shows NOT BUILT with a reason, not an empty list', async () => {
    serve([])
    render(<Loaded />)
    await waitFor(() => expect(screen.getByText('NOT BUILT')).toBeTruthy())
    expect(screen.getByText('no releases recorded yet')).toBeTruthy()
    expect(screen.queryByLabelText('Release History')).toBeNull()
  })

  it('TC-21-06: an unreachable file shows NOT BUILT', async () => {
    serve({}, 404)
    render(<Loaded />)
    expect((await screen.findByText('releases.json unreachable')).textContent).toBe('releases.json unreachable')
  })
})
