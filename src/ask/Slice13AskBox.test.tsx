/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { AskBox } from './AskBox'
import { Deck } from '../Deck'

const mockFetch = vi.fn()
const DATA = resolve(process.cwd(), 'e2e/data')

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function box(): HTMLInputElement {
  return screen.getByPlaceholderText('Ask a question...') as HTMLInputElement
}

function askQuestion(q: string): void {
  fireEvent.change(box(), { target: { value: q } })
  fireEvent.submit(box().closest('form')!)
}

function sourceLabels(): string[] {
  const list = screen.queryByTestId('ask-sources')
  return list ? Array.from(list.querySelectorAll('li a')).map((a) => a.textContent ?? '') : []
}

const TOOL_SOURCES = [
  { title: 'self-check', url: '/docs/selfcheck', snippet: 'all checks ok' },
  { title: 'weather', url: '/docs/weather', snippet: 'light rain' },
]

function askBodies(): Record<string, unknown>[] {
  return mockFetch.mock.calls
    .filter(([url]) => url === '/vyom/ask')
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)))
}

/** Serve every /vyom/* GET from the e2e fixtures, with per-path overrides. */
function serveDeck(overrides: Record<string, () => Response> = {}) {
  mockFetch.mockImplementation(async (url: string) => {
    const path = String(url)
    if (overrides[path]) return overrides[path]()
    const file = resolve(DATA, `${path.replace('/vyom/', '')}.json`)
    if (path.startsWith('/vyom/') && existsSync(file)) return json(JSON.parse(readFileSync(file, 'utf8')))
    return new Response(null, { status: 404 })
  })
}

function tileTitles(): string[] {
  const region = screen.queryByRole('region', { name: 'Tiles' })
  return region ? Array.from(region.querySelectorAll('.card-title')).map((t) => t.textContent ?? '') : []
}

describe('Slice 13 - Conversational ask box', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('TC-13-1: given /vyom/ask answers with sources self-check and weather When I send a question Then the answer shows with both tool names listed under it', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'Light rain, all checks ok', sources: TOOL_SOURCES }))
    render(<AskBox />)

    askQuestion('Is it raining?')

    const answer = await screen.findByTestId('ask-answer')
    expect(answer.textContent).toBe('Light rain, all checks ok')
    expect(sourceLabels()).toEqual(['self-check', 'weather'])
    const list = screen.getByTestId('ask-sources')
    expect(answer.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(askBodies()).toEqual([{ query: 'Is it raining?' }])
  })

  it('TC-13-2: given /vyom/me returns a limited options list When the panels load Then only the tiles in options are shown', async () => {
    serveDeck({ '/vyom/me': () => json({ built: true, user: 'coo', options: { work: true, deploys: false, models: false } }) })
    render(<Deck />)

    await waitFor(() => expect(tileTitles()).toEqual(['work']))
  })

  it('TC-13-3: given /vyom/me returns a config_problem When the ask box renders and I ask a question Then the problem text shows near the sources and the answer still shows', async () => {
    const problem = 'OJAS brain is running at 85% capacity; some tools may be slow'
    mockFetch.mockResolvedValueOnce(json({ answer: 'It is raining', sources: TOOL_SOURCES }))
    render(<AskBox configProblem={problem} />)

    askQuestion('Is it raining?')

    const answer = await screen.findByTestId('ask-answer')
    expect(answer.textContent).toBe('It is raining')
    const note = screen.getByTestId('ask-config-problem')
    expect(note.textContent).toBe(`Config Problem: ${problem}`)
    const list = screen.getByTestId('ask-sources')
    // "near the sources": directly after the sources, inside the same ask card
    expect(list.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Ask Vyom').contains(note)).toBe(true)
  })

  it('TC-13-4: given no endpoint for vram, ram, latency, spend, brief When their tiles render Then each shows NOT BUILT and no number or 0', async () => {
    serveDeck()
    render(<Deck />)

    const holders = [
      screen.getByRole('img', { name: 'GPU gauge' }).closest('.gauge')!,
      screen.getByRole('img', { name: 'SYSTEM gauge' }).closest('.gauge')!,
      screen.getByText('Spend').closest('.card')!,
      screen.getByText('Latency').closest('.card')!,
      // the brief's eyebrow names the window ("24h"), so check its value area only
      screen.getByText(/Ojas brief/).closest('.glass')!.querySelector('.not-built')!,
    ]
    for (const el of holders) {
      expect(el.textContent).toContain('NOT BUILT')
      expect(el.textContent ?? '').not.toMatch(/\d/)
    }
  })

  it('TC-13-5: given I got an answer When I send a follow-up Then the request carries the previous turn, the new answer shows and the page was not reloaded', async () => {
    mockFetch
      .mockResolvedValueOnce(json({ answer: 'Light rain this afternoon', sources: TOOL_SOURCES.slice(1) }))
      .mockResolvedValueOnce(json({ answer: 'It stops by 6pm', sources: TOOL_SOURCES.slice(1) }))
    render(<AskBox />)
    const input = box()

    askQuestion('Is it raining?')
    await screen.findByText('Light rain this afternoon')
    // after an answer the box waits for the next prompt
    expect(input.disabled).toBe(false)

    askQuestion('Until when?')
    await screen.findByText('It stops by 6pm')

    expect(askBodies()).toEqual([
      { query: 'Is it raining?' },
      { query: 'Until when?', history: [{ query: 'Is it raining?', answer: 'Light rain this afternoon' }] },
    ])
    expect(screen.queryByText('Light rain this afternoon')).toBeNull()
    // same input element: the box was updated in place, not reloaded
    expect(box()).toBe(input)
  })

  it('TC-13-5: a failed follow-up is not a turn: the next ask still carries the last answered one', async () => {
    mockFetch
      .mockResolvedValueOnce(json({ answer: 'First', sources: [] }))
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({ answer: 'Third', sources: [] }))
    render(<AskBox />)

    askQuestion('one')
    await screen.findByText('First')
    askQuestion('two')
    await screen.findByRole('alert')
    askQuestion('three')
    await screen.findByText('Third')

    expect(askBodies()[2]).toEqual({ query: 'three', history: [{ query: 'one', answer: 'First' }] })
  })

  it('TC-13-6: given /vyom/ask answers slowly When I send a question Then "loading…" shows first, then is replaced by the answer and sources', async () => {
    let resolve: (r: Response) => void = () => {}
    mockFetch.mockReturnValueOnce(new Promise<Response>((r) => { resolve = r }))
    render(<AskBox />)

    askQuestion('Is it raining?')

    const loading = await screen.findByTestId('ask-loading')
    expect(loading.textContent).toBe('loading…')
    expect(screen.queryByTestId('ask-answer')).toBeNull()

    resolve(json({ answer: 'Yes', sources: TOOL_SOURCES }))
    await screen.findByTestId('ask-answer')
    expect(screen.queryByTestId('ask-loading')).toBeNull()
    expect(sourceLabels()).toEqual(['self-check', 'weather'])
  })

  it.each([
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['a 500', () => Promise.resolve(json({ answer: 'should not show', sources: TOOL_SOURCES }, 500))],
    ['bad JSON', () => Promise.resolve(new Response('{not json', { status: 200 }))],
  ])('TC-13-7: given /vyom/ask has %s When I send a question Then NOT BUILT and "/vyom/ask unreachable" show, with no answer or sources', async (_label, reply) => {
    mockFetch.mockImplementationOnce(reply)
    render(<AskBox />)

    askQuestion('Is it raining?')

    await screen.findByText('/vyom/ask unreachable')
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByTestId('ask-sources')).toBeNull()
    expect(screen.queryByText('should not show')).toBeNull()
    expect(screen.queryByTestId('ask-loading')).toBeNull()
  })

  it('TC-13-8: given /vyom/ask answers 403 When I send a question Then NOT BUILT shows and none of the refused body appears', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'refused secret', sources: TOOL_SOURCES }, 403))
    render(<AskBox />)

    askQuestion('Is it raining?')

    await screen.findByText('NOT BUILT')
    expect(screen.queryByText('refused secret')).toBeNull()
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByTestId('ask-sources')).toBeNull()
    expect(screen.queryByText('weather')).toBeNull()
  })

  it('TC-13-9: given an endpoint returns {built:false, why:"vram not yet built"} When its tile renders Then NOT BUILT and the why show, with no list or value', async () => {
    serveDeck({ '/vyom/health': () => json({ built: false, why: 'vram not yet built' }) })
    render(<Deck />)

    const why = await screen.findAllByText('vram not yet built')
    const panel = why[0].closest('.panel')!
    expect(panel.textContent).toContain('NOT BUILT')
    expect(panel.querySelector('ul, ol, table')).toBeNull()
    expect(panel.textContent?.replace('NOT BUILT', '').replace('vram not yet built', '').replace('Health', '').trim()).toBe('')
  })

  it('TC-13-11: given all endpoints are built: true and no question was asked When the ask box renders Then "Ask a question..." shows with no sources and no crash', async () => {
    serveDeck()
    render(<Deck />)

    const card = screen.getByLabelText('Ask Vyom')
    const input = within(card).getByPlaceholderText('Ask a question...') as HTMLInputElement
    expect(input.value).toBe('')
    expect(within(card).queryByTestId('ask-answer')).toBeNull()
    expect(within(card).queryByTestId('ask-sources')).toBeNull()
    expect(within(card).queryByTestId('ask-loading')).toBeNull()
    expect(within(card).queryByText('NOT BUILT')).toBeNull()
    expect(within(card).queryByRole('alert')).toBeNull()
  })

  it('TC-13-10: given Founder then COO/CTO When the deck loads each time Then the set of tiles shown differs', async () => {
    serveDeck({ '/vyom/me': () => json({ built: true, user: 'founder', options: { deploys: true, models: true, work: true } }) })
    const first = render(<Deck />)
    await waitFor(() => expect(tileTitles()).toEqual(['deploys', 'models', 'work']))
    first.unmount()

    serveDeck({ '/vyom/me': () => json({ built: true, user: 'cto', options: { deploys: true, models: false, work: false } }) })
    render(<Deck />)
    await waitFor(() => expect(tileTitles()).toEqual(['deploys']))
  })

  it('TC-13-13: given /vyom/me returns 20+ config_problem rows When the deck renders Then every row shows and the panels stay', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => `row ${i + 1}: setting missing`)
    serveDeck({ '/vyom/me': () => json({ built: true, options: { deploys: true }, config_problem: rows.join('\n') }) })
    render(<Deck />)

    const note = await screen.findByTestId('ask-config-problem')
    for (const row of rows) expect(note.textContent).toContain(row)
    expect(note.style.whiteSpace).toBe('pre-wrap')
    const card = screen.getByLabelText('Config Problem')
    for (const row of rows) expect(card.textContent).toContain(row)
    // the ask box and the panels stay
    expect(box().disabled).toBe(false)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toContain('Health')
  })

  it('TC-13-13: given /vyom/me is 403 Then the /vyom/me slot shows the error state with the server reason and the ask box stays', async () => {
    serveDeck({ '/vyom/me': () => json({ options: { deploys: true }, config_problem: 'refused' }, 403) })
    render(<Deck />)

    const slot = await screen.findByRole('region', { name: '/vyom/me' })
    expect(slot.textContent).toContain('NOT BUILT')
    expect(slot.textContent).toContain('not permitted for your role')
    expect(tileTitles()).toEqual([])
    expect(screen.queryByText(/refused/)).toBeNull()
    expect(box().disabled).toBe(false)
  })

  it('TC-13-13: given /vyom/me returns built:false Then the /vyom/me slot shows NOT BUILT and the why word for word', async () => {
    serveDeck({ '/vyom/me': () => json({ built: false, why: 'roles not yet built' }) })
    render(<Deck />)

    const slot = await screen.findByRole('region', { name: '/vyom/me' })
    expect(slot.textContent).toContain('NOT BUILT')
    expect(slot.textContent).toContain('roles not yet built')
  })

  it('TC-13-13: given /vyom/me is 401 Then it redirects to login and shows no tiles or config problem from the refused call', async () => {
    let href = ''
    vi.stubGlobal('location', { origin: 'http://localhost', get href() { return href }, set href(v: string) { href = v } })
    serveDeck({ '/vyom/me': () => json({ options: { deploys: true }, config_problem: 'refused' }, 401) })
    render(<Deck />)

    await waitFor(() => expect(href).toBe('/vyom/login'))
    await screen.findByText('/vyom/me unreachable')
    expect(tileTitles()).toEqual([])
    expect(screen.queryByText(/refused/)).toBeNull()
    expect(box().disabled).toBe(false)

    // The ask box should still be functional and not show error state
    const askBox = screen.getByLabelText('Ask Vyom')
    expect(askBox).toBeTruthy()
  })

  it('TC-13-14: given one panel endpoint returns 500 When the deck renders Then that panel shows its error and the other five panels and the ask box still render', async () => {
    serveDeck({ '/vyom/containers': () => json({ error: 'boom' }, 500) })
    render(<Deck />)

    await screen.findByText('/vyom/containers unreachable')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    for (const title of ['Health', 'Tasks', 'Agents', 'Quota', 'Containers', 'Self-Check']) expect(headings).toContain(title)
    expect(screen.getByLabelText('Ask Vyom')).toBeTruthy()
    expect(box().disabled).toBe(false)
  })
})
