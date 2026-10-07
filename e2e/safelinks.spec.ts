import { test, expect, openConsole, data } from './fixtures'
import type { Page } from '@playwright/test'

async function ask(page: Page, question: string) {
  const box = page.getByLabel('Ask Vyom')
  await box.getByPlaceholder('Ask a question...').fill(question)
  await box.getByRole('button', { name: 'Ask' }).click()
  return box
}

const source = (title: string, url: unknown) => ({ title, url, snippet: `about ${title}` })

test.describe('Story 27 - safe links', () => {
  test('TC-27-09: Given an Ask answer with a relative source and a same-origin source When the user views the sources Then both are anchors with their titles and rel="noopener noreferrer"', async ({ page, deck }) => {
    await openConsole(page)
    const origin = new URL(page.url()).origin
    deck.use('ask', { body: { answer: 'ok', sources: [source('Relative', '/docs/a'), source('Same origin', `${origin}/docs/b`)] } })
    const box = await ask(page, 'where?')
    const links = box.getByTestId('ask-sources').locator('a')
    await expect(links).toHaveCount(2)
    expect(await links.allTextContents()).toEqual(['Relative', 'Same origin'])
    expect(await links.evaluateAll((as) => as.map((a) => [a.getAttribute('href'), a.getAttribute('rel')]))).toEqual([
      ['/docs/a', 'noopener noreferrer'],
      [`${origin}/docs/b`, 'noopener noreferrer'],
    ])
  })

  test('TC-27-10: Given sources on another host, javascript: and mailto: When the user views the sources Then each shows as plain text with its address visible and no anchor', async ({ page, deck }) => {
    const urls = ['https://other.example/x', 'javascript:alert(1)', 'mailto:a@b.c']
    deck.use('ask', { body: { answer: 'ok', sources: urls.map((u, i) => source(`Bad ${i + 1}`, u)) } })
    await openConsole(page)
    const box = await ask(page, 'where?')
    const list = box.getByTestId('ask-sources')
    await expect(list.locator('li')).toHaveCount(3)
    await expect(list.locator('a')).toHaveCount(0)
    expect(await list.getByTestId('ask-source-address').allTextContents()).toEqual(urls)
    expect(await list.getByTestId('ask-source-text').allTextContents()).toEqual(urls.map((u, i) => `Bad ${i + 1} ${u}`))
    expect(await list.locator('[href]').count()).toBe(0)
  })

  test('TC-27-11: Given a source with an empty URL and one with a malformed URL When the user views the sources Then the titles show as text and the panel still works', async ({ page, deck }) => {
    deck.use('ask', { body: { answer: 'still here', sources: [source('No address', ''), source('Broken', 'http://[bad')] } })
    await openConsole(page)
    const box = await ask(page, 'where?')
    await expect(box.getByTestId('ask-answer')).toHaveText('still here')
    const list = box.getByTestId('ask-sources')
    expect(await list.getByTestId('ask-source-text').allTextContents()).toEqual(['No address', 'Broken http://[bad'])
    await expect(list.locator('a')).toHaveCount(0)

    // the panel still answers the next question
    deck.use('ask', { body: { answer: 'second answer', sources: [] } })
    await ask(page, 'again?')
    await expect(box.getByTestId('ask-answer')).toHaveText('second answer')
  })

  test('TC-27-12: Given an Ask answer with 20+ mixed sources When the user views the list Then every item is shown in order, safe ones as links and the rest as text', async ({ page, deck }) => {
    const mixed = Array.from({ length: 24 }, (_, i) =>
      source(`S${i + 1}`, i % 3 === 0 ? `/docs/${i + 1}` : i % 3 === 1 ? `https://other.example/${i + 1}` : `javascript:void(${i + 1})`))
    deck.use('ask', { body: { answer: 'mixed', sources: mixed } })
    await openConsole(page)
    const box = await ask(page, 'all?')
    const items = box.getByTestId('ask-sources').getByTestId('ask-source')
    await expect(items).toHaveCount(24)
    const seen = await items.evaluateAll((lis) => lis.map((li) => {
      const a = li.querySelector('a')
      return a ? `link:${a.textContent}:${a.getAttribute('href')}` : `text:${li.querySelector('[data-testid="ask-source-text"]')?.textContent}`
    }))
    expect(seen).toEqual(mixed.map((s) => (s.url as string).startsWith('/') ? `link:${s.title}:${s.url}` : `text:${s.title} ${s.url}`))
  })

  test('TC-27-13: Given the Ask panel returns NOT BUILT with a why, and another run returns 403 When the user views it Then the why shows and no links appear', async ({ page, deck }) => {
    deck.use('ask', 'not-built')
    await openConsole(page)
    const box = await ask(page, 'built?')
    await expect(box.getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(box.getByText((data('ask-not-built.json') as { why: string }).why, { exact: true })).toBeVisible()
    await expect(box.locator('a')).toHaveCount(0)

    deck.use('ask', { status: 403, body: { answer: 'refused', sources: [source('Refused', '/docs/secret')] } })
    await ask(page, 'allowed?')
    await expect(box.getByText('NOT BUILT', { exact: true })).toBeVisible()
    // 403 keeps the ask box's existing message (story 6, TC-6-11)
    await expect(box.getByText('/vyom/ask unreachable', { exact: true })).toBeVisible()
    await expect(box.locator('a')).toHaveCount(0)
    await expect(box.getByText('Refused')).toHaveCount(0)
  })
})
