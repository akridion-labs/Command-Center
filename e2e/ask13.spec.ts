import { test, expect, openConsole, panel, PANELS, type Deck } from './fixtures'
import type { Page } from '@playwright/test'

const TOOL_SOURCES = [
  { title: 'self-check', url: '/docs/selfcheck', snippet: 'all checks ok' },
  { title: 'weather', url: '/docs/weather', snippet: 'light rain' },
]

async function ask(page: Page, question: string) {
  const box = page.getByLabel('Ask Vyom')
  await box.getByPlaceholder('Ask a question...').fill(question)
  await box.getByRole('button', { name: 'Ask' }).click()
  return box
}

const askBodies = (deck: Deck) => deck.served.filter((s) => s.path === '/vyom/ask').map((s) => JSON.parse(s.postData ?? '{}'))
const tileTitles = (page: Page) => page.getByRole('region', { name: 'Tiles' }).locator('.card-title').allTextContents()

test.describe('Story 13 - conversational ask box', () => {
  test('TC-13-1: Given /vyom/ask answers with sources self-check and weather When I send a question Then the answer shows with both tool names listed under it', async ({ page, deck }) => {
    deck.use('ask', { body: { answer: 'Light rain, all checks ok', sources: TOOL_SOURCES } })
    await openConsole(page)
    const box = await ask(page, 'Is it raining?')
    await expect(box.getByTestId('ask-answer')).toHaveText('Light rain, all checks ok')
    expect(await box.getByTestId('ask-sources').locator('a').allTextContents()).toEqual(['self-check', 'weather'])
  })

  test('TC-13-12: Given the answer has 50+ sources When it renders Then every label shows and the screenshot shows no overflow, overlap or cut-off list', { tag: '@visual' }, async ({ page, deck }) => {
    const manySources = Array.from({ length: 60 }, (_, i) => ({
      title: `Source ${i + 1}`,
      url: `/docs/source/${i + 1}`,
      snippet: `Snippet for source ${i + 1}`,
    }))
    deck.use('ask', { body: { answer: 'Many sources', sources: manySources } })
    await openConsole(page)
    const box = await ask(page, 'Query?')
    await expect(box.getByTestId('ask-answer')).toHaveText('Many sources')

    const links = box.getByTestId('ask-sources').locator('a')
    await expect(links).toHaveCount(60)
    for (let i = 0; i < 60; i++) await expect(links.nth(i)).toHaveText(`Source ${i + 1}`)

    // the last link must sit inside the card's box, not clipped by its overflow
    await links.last().scrollIntoViewIfNeeded()
    const r = await box.evaluate((el) => {
      const last = el.querySelector('[data-testid="ask-sources"] li:last-child a')!.getBoundingClientRect()
      const card = el.getBoundingClientRect()
      return { linkTop: last.top, linkBottom: last.bottom, cardTop: card.top, cardBottom: card.bottom }
    })
    expect(r.linkTop).toBeGreaterThanOrEqual(r.cardTop)
    expect(r.linkBottom).toBeLessThanOrEqual(r.cardBottom)
    await expect(links.last()).toBeVisible()
    await expect(box).toHaveScreenshot('ask-60-sources.png', { animations: 'disabled', mask: [page.locator('canvas')] })
  })

  test('TC-13-2: Given /vyom/me returns a limited options list When the panels load Then only the tiles in options are shown', async ({ page, deck }) => {
    deck.use('me', { body: { user: 'coo', options: { work: true, deploys: false, models: false } } })
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    expect(await tileTitles(page)).toEqual(['work'])
  })

  test('TC-13-3: Given /vyom/me returns a config_problem When I ask a question Then the problem text shows near the sources and the answer still shows', async ({ page, deck }) => {
    const problem = 'OJAS brain is running at 85% capacity'
    deck.use('me', { body: { user: 'cto', options: { deploys: true }, config_problem: problem } })
    deck.use('ask', { body: { answer: 'It is raining', sources: TOOL_SOURCES } })
    await openConsole(page)
    const box = await ask(page, 'Is it raining?')
    await expect(box.getByTestId('ask-answer')).toHaveText('It is raining')
    await expect(box.getByTestId('ask-config-problem')).toHaveText(`Config Problem: ${problem}`)
    // measure both in ONE frame: two separate reads can straddle a scroll or reflow
    const { sourcesBottom, noteTop } = await box.evaluate((el) => ({
      sourcesBottom: el.querySelector('[data-testid="ask-sources"]')!.getBoundingClientRect().bottom,
      noteTop: el.querySelector('[data-testid="ask-config-problem"]')!.getBoundingClientRect().top,
    }))
    expect(noteTop).toBeGreaterThanOrEqual(sourcesBottom)
  })

  test('TC-13-5: Given I got an answer When I send a follow-up Then the request carries the previous turn, the new answer shows and the page was not reloaded', async ({ page, deck }) => {
    await openConsole(page)
    await page.evaluate(() => { (window as unknown as { marker: number }).marker = 13 })
    deck.use('ask', { body: { answer: 'Light rain', sources: TOOL_SOURCES } })
    let box = await ask(page, 'Is it raining?')
    await expect(box.getByTestId('ask-answer')).toHaveText('Light rain')

    deck.use('ask', { body: { answer: 'Until 6pm', sources: TOOL_SOURCES.slice(1) } })
    box = await ask(page, 'Until when?')
    await expect(box.getByTestId('ask-answer')).toHaveText('Until 6pm')

    expect(askBodies(deck)).toEqual([
      { query: 'Is it raining?' },
      { query: 'Until when?', history: [{ query: 'Is it raining?', answer: 'Light rain' }] },
    ])
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(13)
  })

  test('TC-13-6: Given /vyom/ask answers slowly When I send a question Then "loading…" shows first, then is replaced by the answer and sources', async ({ page }) => {
    await openConsole(page)
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => { release = r })
    await page.route('**/vyom/ask', async (route) => {
      await gate
      await route.fulfill({ json: { answer: 'Yes', sources: TOOL_SOURCES } })
    })
    const box = await ask(page, 'Is it raining?')
    await expect(box.getByTestId('ask-loading')).toHaveText('loading…')
    release()
    await expect(box.getByTestId('ask-answer')).toHaveText('Yes')
    await expect(box.getByTestId('ask-loading')).toHaveCount(0)
    await expect(box.getByTestId('ask-sources').locator('li')).toHaveCount(2)
  })

  for (const [label, setup] of [
    ['a network error', (_page: Page, deck: Deck) => { deck.use('ask', { abort: true }); return Promise.resolve() }],
    ['a 500', (_page: Page, deck: Deck) => { deck.use('ask', { status: 500, body: { answer: 'should not show', sources: TOOL_SOURCES } }); return Promise.resolve() }],
    ['bad JSON', (page: Page) => page.route('**/vyom/ask', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{not json' }))],
  ] as const) {
    test(`TC-13-7: Given /vyom/ask has ${label} When I send a question Then NOT BUILT and "/vyom/ask unreachable" show, with no answer or sources`, async ({ page, deck }) => {
      await openConsole(page)
      await setup(page, deck)
      const box = await ask(page, 'Is it raining?')
      await expect(box.getByText('/vyom/ask unreachable', { exact: true })).toBeVisible()
      await expect(box.getByText('NOT BUILT', { exact: true })).toBeVisible()
      await expect(box.getByTestId('ask-answer')).toHaveCount(0)
      await expect(box.getByTestId('ask-sources')).toHaveCount(0)
    })
  }

  test('TC-13-8: Given /vyom/ask answers 403 When I send a question Then NOT BUILT shows and none of the refused body appears', async ({ page, deck }) => {
    deck.use('ask', { status: 403, body: { answer: 'refused secret', sources: TOOL_SOURCES } })
    await openConsole(page)
    const box = await ask(page, 'Is it raining?')
    await expect(box.getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(box.getByText('refused secret')).toHaveCount(0)
    await expect(box.getByTestId('ask-sources')).toHaveCount(0)
  })

  test('TC-13-10: Given I log in as Founder, then as COO/CTO When the deck loads each time Then the set of tiles shown differs', async ({ page, deck }) => {
    deck.use('me', { body: { user: 'founder', options: { deploys: true, models: true, work: true } } })
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    const founder = await tileTitles(page)

    deck.use('me', { body: { user: 'cto', options: { deploys: true, models: false, work: false } } })
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    const cto = await tileTitles(page)

    expect(founder).toEqual(['deploys', 'models', 'work'])
    expect(cto).toEqual(['deploys'])
  })

  test('TC-13-13: Given /vyom/me returns 20+ config_problem rows When the deck renders Then every row shows and the panels stay', async ({ page, deck }) => {
    const rows = Array.from({ length: 25 }, (_, i) => `row ${i + 1}: setting missing`)
    deck.use('me', { body: { user: 'cto', options: { deploys: true }, config_problem: rows.join('\n') } })
    await openConsole(page)
    const note = page.getByLabel('Ask Vyom').getByTestId('ask-config-problem')
    for (const row of rows) await expect(note).toContainText(row)
    for (const title of PANELS) await expect(panel(page, title)).toBeVisible()
  })

  test('TC-13-13: Given /vyom/me is 403 Then the /vyom/me slot shows the error state and the ask box stays', async ({ page, deck }) => {
    deck.use('me', { status: 403, body: { options: { deploys: true }, config_problem: 'refused' } })
    await openConsole(page)
    const slot = page.getByRole('region', { name: '/vyom/me' })
    await expect(slot.getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(slot.getByText('not permitted for your role')).toBeVisible()
    await expect(page.getByText('refused')).toHaveCount(0)
    await expect(page.getByLabel('Ask Vyom').getByPlaceholder('Ask a question...')).toBeEnabled()
  })

  test('TC-13-14: Given one panel endpoint returns 500 When the deck renders Then that panel shows its error and the other panels and the ask box still render', async ({ page, deck }) => {
    deck.use('containers', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    await expect(panel(page, 'Containers').getByText('/vyom/containers unreachable', { exact: true })).toBeVisible()
    for (const title of PANELS) await expect(panel(page, title)).toBeVisible()
    await expect(page.getByLabel('Ask Vyom').getByPlaceholder('Ask a question...')).toBeEnabled()
  })
})
