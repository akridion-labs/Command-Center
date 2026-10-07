import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AskBox, type Source } from './AskBox'
import suiteSource from './AskBox.test.tsx?raw'

const mockFetch = vi.fn<typeof fetch>()

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function box() {
  return screen.getByPlaceholderText('Ask a question...') as HTMLInputElement
}

function button() {
  return screen.getByRole('button') as HTMLButtonElement
}

function askQuestion(q: string) {
  fireEvent.change(box(), { target: { value: q } })
  fireEvent.click(button())
}

function sourceItems(): HTMLLIElement[] {
  const list = screen.queryByTestId('ask-sources')
  return list ? Array.from(list.querySelectorAll('li')) : []
}

function makeSources(n: number, prefix = 'S'): Source[] {
  return Array.from({ length: n }, (_, i) => ({
    title: `${prefix} title ${i + 1}`,
    url: `/docs/${prefix}/${i + 1}`,
    snippet: `${prefix} snippet ${i + 1}`,
  }))
}

describe('AskBox', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('TC-6-1: empty or whitespace box keeps Ask disabled and Enter sends nothing', () => {
    render(<AskBox />)
    expect(button().disabled).toBe(true)
    expect(screen.queryByText('Sources')).toBeNull()

    fireEvent.submit(box().closest('form')!)
    fireEvent.change(box(), { target: { value: '   ' } })
    expect(button().disabled).toBe(true)
    fireEvent.keyDown(box(), { key: 'Enter', code: 'Enter' })
    fireEvent.submit(box().closest('form')!)

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('TC-6-2: posts the typed question once to /vyom/ask as JSON', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'ok', sources: [] }))
    render(<AskBox />)

    askQuestion('what is due?')
    await screen.findByText('ok')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/vyom/ask')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(String(init?.body)).toContain('what is due?')
  })

  it('TC-6-3: while pending the button reads Thinking... and box + button are disabled', async () => {
    let resolve: (r: Response) => void = () => {}
    mockFetch.mockReturnValueOnce(new Promise<Response>((r) => { resolve = r }))
    render(<AskBox />)

    askQuestion('what is due?')

    await waitFor(() => expect(button().textContent).toBe('Thinking...'))
    expect(box().disabled).toBe(true)
    expect(button().disabled).toBe(true)

    fireEvent.submit(box().closest('form')!)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    resolve(json({ answer: 'done', sources: [] }))
    await screen.findByText('done')
    expect(button().textContent).toBe('Ask')
  })

  it('TC-6-4: shows the answer text under the box', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'Two jobs are due', sources: [] }))
    render(<AskBox />)

    askQuestion('what is due?')

    const answer = await screen.findByTestId('ask-answer')
    expect(answer.textContent).toBe('Two jobs are due')
    expect(box().compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('TC-6-5: three sources render under a Sources heading in returned order with link + snippet', async () => {
    const sources = makeSources(3)
    mockFetch.mockResolvedValueOnce(json({ answer: 'A', sources }))
    render(<AskBox />)

    askQuestion('q')

    const heading = await screen.findByText('Sources')
    const answer = screen.getByTestId('ask-answer')
    expect(answer.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    const items = sourceItems()
    expect(items).toHaveLength(3)
    items.forEach((li, i) => {
      const a = li.querySelector('a')!
      expect(a.textContent).toBe(sources[i].title)
      expect(a.getAttribute('href')).toBe(sources[i].url)
      expect(li.querySelector('p')!.textContent).toBe(sources[i].snippet)
    })
  })

  it('TC-6-6: source links open in a new tab with rel noopener noreferrer', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'A', sources: makeSources(1) }))
    render(<AskBox />)

    askQuestion('q')

    const link = (await screen.findByText('S title 1')).closest('a')!
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it.each([
    ['sources: []', { answer: 'Nothing indexed', sources: [] }],
    ['sources absent', { answer: 'Nothing indexed' }],
  ])('TC-6-7: %s shows the answer plus "no sources returned" and no empty Sources list', async (_label, body) => {
    mockFetch.mockResolvedValueOnce(json(body))
    render(<AskBox />)

    askQuestion('q')

    await screen.findByText('no sources returned')
    expect(screen.getByTestId('ask-answer').textContent).toBe('Nothing indexed')
    expect(screen.queryByText('Sources')).toBeNull()
    expect(screen.queryByTestId('ask-sources')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  // Story 13 AC7 supersedes slice 6 here: a failed ask also shows NOT BUILT "/vyom/ask unreachable".
  it('TC-6-8: HTTP 500 shows "Error: HTTP 500" with NOT BUILT unreachable and no answer or Sources', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'should not show', sources: makeSources(1) }, 500))
    render(<AskBox />)

    askQuestion('q')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Error: HTTP 500')
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByText('should not show')).toBeNull()
    expect(screen.queryByText('Sources')).toBeNull()
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
    expect(screen.getByText('/vyom/ask unreachable')).toBeTruthy()
  })

  it('TC-6-9: a network failure shows a failure message and no answer', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<AskBox />)

    askQuestion('q')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('network failure')
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.getByText('/vyom/ask unreachable')).toBeTruthy()
  })

  it('TC-6-10: HTTP 501 shows NOT BUILT and "not implemented yet", no answer', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 501 }))
    render(<AskBox />)

    askQuestion('q')

    await screen.findByText('NOT BUILT')
    expect(screen.getByText('not implemented yet')).toBeTruthy()
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-6-10: a built:false body shows NOT BUILT with the server why', async () => {
    mockFetch.mockResolvedValueOnce(json({ built: false, why: 'index not loaded' }))
    render(<AskBox />)

    askQuestion('q')

    await screen.findByText('NOT BUILT')
    expect(screen.getByText('index not loaded')).toBeTruthy()
    expect(screen.queryByTestId('ask-answer')).toBeNull()
  })

  it('TC-6-11: HTTP 403 shows NOT BUILT with "/vyom/ask unreachable" and no answer or sources', async () => {
    mockFetch.mockResolvedValueOnce(json({ answer: 'secret', sources: makeSources(2) }, 403))
    render(<AskBox />)

    askQuestion('q')

    await screen.findByText('/vyom/ask unreachable')
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByText('secret')).toBeNull()
    expect(screen.queryByText('Sources')).toBeNull()
    expect(screen.getByText('NOT BUILT')).toBeTruthy()
  })

  it('TC-6-12: HTTP 401 sends the browser to /vyom/login and renders no answer', async () => {
    const redirect = vi.fn<(url: string) => void>()
    mockFetch.mockResolvedValueOnce(json({ answer: 'nope', sources: [] }, 401))
    render(<AskBox redirect={redirect} />)

    askQuestion('q')

    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/vyom/login'))
    expect(redirect).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('ask-answer')).toBeNull()
    expect(screen.queryByText('nope')).toBeNull()
  })

  it('TC-6-13: after an error the question is kept and box + Ask are usable', async () => {
    mockFetch.mockResolvedValueOnce(json({}, 500))
    render(<AskBox />)

    askQuestion('what is due?')

    await screen.findByRole('alert')
    expect(box().value).toBe('what is due?')
    expect(box().disabled).toBe(false)
    expect(button().disabled).toBe(false)
    expect(button().textContent).toBe('Ask')
  })

  it('TC-6-14: a second answer replaces the first answer and its sources', async () => {
    mockFetch
      .mockResolvedValueOnce(json({ answer: 'Answer A', sources: makeSources(2, 'A') }))
      .mockResolvedValueOnce(json({ answer: 'Answer B', sources: makeSources(1, 'B') }))
    render(<AskBox />)

    askQuestion('first')
    await screen.findByText('Answer A')

    askQuestion('second')
    await screen.findByText('Answer B')

    expect(screen.queryByText('Answer A')).toBeNull()
    expect(screen.queryByText('A title 1')).toBeNull()
    expect(sourceItems().map((li) => li.querySelector('a')!.textContent)).toEqual(['B title 1'])
  })

  it('TC-6-15: a failing second ask removes answer A and shows only the error', async () => {
    mockFetch
      .mockResolvedValueOnce(json({ answer: 'Answer A', sources: makeSources(1, 'A') }))
      .mockResolvedValueOnce(json({}, 500))
    render(<AskBox />)

    askQuestion('first')
    await screen.findByText('Answer A')

    askQuestion('second')
    const alert = await screen.findByRole('alert')

    expect(alert.textContent).toBe('Error: HTTP 500')
    expect(screen.queryByText('Answer A')).toBeNull()
    expect(screen.queryByText('A title 1')).toBeNull()
    expect(screen.queryByTestId('ask-answer')).toBeNull()
  })

  it('TC-6-15: a new submit clears the previous error', async () => {
    mockFetch
      .mockResolvedValueOnce(json({}, 500))
      .mockResolvedValueOnce(json({ answer: 'Recovered', sources: [] }))
    render(<AskBox />)

    askQuestion('first')
    await screen.findByRole('alert')

    askQuestion('second')
    await screen.findByText('Recovered')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('TC-6-16: blank title falls back to url and snippet HTML renders as literal text', async () => {
    const url = '/docs/untitled'
    mockFetch.mockResolvedValueOnce(json({
      answer: 'A',
      sources: [
        { title: '', url, snippet: '<b>x</b>' },
        { title: '   ', url: `${url}-2`, snippet: 'plain' },
      ],
    }))
    const { container } = render(<AskBox />)

    askQuestion('q')

    await screen.findByText('Sources')
    const [first, second] = sourceItems()
    expect(first.querySelector('a')!.textContent).toBe(url)
    expect(first.querySelector('a')!.getAttribute('href')).toBe(url)
    expect(second.querySelector('a')!.textContent).toBe(`${url}-2`)
    expect(first.querySelector('p')!.textContent).toBe('<b>x</b>')
    expect(container.querySelector('b')).toBeNull()
  })

  it('TC-6-17: 50 sources all render in order as unique entries', async () => {
    const sources = makeSources(50)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockResolvedValueOnce(json({ answer: 'many', sources }))
    render(<AskBox />)

    askQuestion('q')

    await screen.findByText('Sources')
    const items = sourceItems()
    expect(items).toHaveLength(50)
    const titles = items.map((li) => li.querySelector('a')!.textContent)
    expect(titles).toEqual(sources.map((s) => s.title))
    expect(new Set(titles).size).toBe(50)
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('TC-6-18: very long answer and snippets render in full and wrap instead of overflowing', async () => {
    const longAnswer = 'answer-'.repeat(2000)
    const longSnippet = 'snippetwithoutspaces'.repeat(500)
    mockFetch.mockResolvedValueOnce(json({
      answer: longAnswer,
      sources: [{ title: 'T', url: '/docs/long', snippet: longSnippet }],
    }))
    render(<AskBox />)

    askQuestion('q')

    const answer = await screen.findByTestId('ask-answer')
    expect(answer.textContent).toBe(longAnswer)
    const snippet = sourceItems()[0].querySelector('p')!
    expect(snippet.textContent).toBe(longSnippet)

    expect(answer.style.overflowWrap).toBe('anywhere')
    expect(snippet.style.overflowWrap).toBe('anywhere')
    const card = screen.getByLabelText('Ask Vyom') as HTMLDivElement
    expect(card.style.overflow).toBe('hidden')
    expect(card.style.minWidth).toBe('0px')
  })

  it('TC-6-19: every fetch in a full ask flow targets a same-origin relative URL', async () => {
    mockFetch
      .mockResolvedValueOnce(json({ answer: 'A', sources: makeSources(3) }))
      .mockResolvedValueOnce(json({ answer: 'B', sources: [] }))
    render(<AskBox />)

    askQuestion('first')
    await screen.findByText('A')
    askQuestion('second')
    await screen.findByText('B')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    for (const [input] of mockFetch.mock.calls) {
      const url = String(input)
      expect(url.startsWith('/')).toBe(true)
      expect(url.startsWith('//')).toBe(false)
      expect(new URL(url, location.origin).origin).toBe(location.origin)
    }
  })

  it('TC-6-25: src/ask covers every unit case of story 6 (answer+sources, empty sources, error, pending, NOT BUILT)', () => {
    const titled = new Set(Array.from(suiteSource.matchAll(/\(\s*'(TC-6-\d+):/g), (m) => m[1]))
    const unitCases = Array.from({ length: 19 }, (_, i) => `TC-6-${i + 1}`)
    expect(unitCases.filter((id) => !titled.has(id))).toEqual([])
  })
})
