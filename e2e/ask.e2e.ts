import { test, expect } from '@playwright/test'
import { MODE, STUB_EMPTY_QUESTION, STUB_QUESTION, ask, openConsole } from './deck'

// Needs the running deck (see playwright.config.ts) - and a session for a REAL answer (see e2e/deck.ts).
// VYOM_E2E_QUESTION        a question the index has documents for
// VYOM_E2E_EMPTY_QUESTION  a question the index has no documents for
const QUESTION = process.env.VYOM_E2E_QUESTION ?? STUB_QUESTION
const EMPTY_QUESTION = process.env.VYOM_E2E_EMPTY_QUESTION ?? (MODE === 'stubbed' ? STUB_EMPTY_QUESTION : undefined)

test('TC-6-20: answering a question with sources raises zero CSP errors', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const csp: string[] = []
  page.on('console', (m) => {
    if (/content security policy|Content-Security-Policy/i.test(m.text())) csp.push(m.text())
  })
  const offOrigin: string[] = []
  page.on('request', (r) => {
    if (!r.url().startsWith('data:') && new URL(r.url()).origin !== origin) offOrigin.push(r.url())
  })

  await openConsole(page, origin)
  const card = await ask(page, QUESTION)
  await expect(card.getByTestId('ask-sources').locator('li').first()).toBeVisible()

  expect(csp).toEqual([])
  expect(offOrigin).toEqual([])
})

test('TC-6-21: a real question shows its answer with the Sources list under it', async ({ page, baseURL }) => {
  await openConsole(page, new URL(baseURL!).origin)
  const card = await ask(page, QUESTION)

  expect((await card.getByTestId('ask-answer').textContent())?.trim()).not.toBe('')
  await expect(card.getByText('Sources', { exact: true })).toBeVisible()
  expect(await card.getByTestId('ask-sources').locator('li').count()).toBeGreaterThan(0)
})

test('TC-6-22: clicking a source title opens a new tab and the deck stays open', async ({ page, context, baseURL }) => {
  await openConsole(page, new URL(baseURL!).origin)
  const card = await ask(page, QUESTION)
  const link = card.getByTestId('ask-sources').locator('a').first()

  const [tab] = await Promise.all([context.waitForEvent('page'), link.click()])

  expect(tab).not.toBe(page)
  expect(page.isClosed()).toBe(false)
  await expect(page.getByLabel('Ask Vyom')).toBeVisible()
})

test('TC-6-23: a question with no indexed documents shows "no sources returned"', async ({ page, baseURL }) => {
  test.skip(!EMPTY_QUESTION, 'set VYOM_E2E_EMPTY_QUESTION to a question the index has no documents for')
  await openConsole(page, new URL(baseURL!).origin)
  const card = await ask(page, EMPTY_QUESTION!)

  await expect(card.getByText('no sources returned')).toBeVisible()
  await expect(card.getByTestId('ask-sources')).toHaveCount(0)
})
