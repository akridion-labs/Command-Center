import { test, expect, openConsole, data, type Deck } from './fixtures'
import type { Page } from '@playwright/test'

async function ask(page: Page, question: string) {
  const box = page.getByLabel('Ask Vyom')
  await box.getByPlaceholder('Ask a question...').fill(question)
  await box.getByRole('button', { name: 'Ask' }).click()
  return box
}

const posted = (deck: Deck) => deck.served.filter((s) => s.path === '/vyom/ask')

test.describe('Ask Box', () => {
  test('TC-12b-12: Given the ask box When the person types a question and submits Then a POST to `/vyom/ask` carries that question and the answer and its sources appear under it', async ({ page, deck }) => {
    await openConsole(page)
    const question = 'What is the system status?'
    const box = await ask(page, question)
    const fixture = data('ask.json') as { answer: string; sources: { title: string }[] }

    const answer = box.getByTestId('ask-answer')
    await expect(answer).toBeVisible()
    expect(await answer.textContent()).toBe(fixture.answer)
    const sources = box.getByTestId('ask-sources')
    expect(await sources.locator('a').allTextContents()).toEqual(fixture.sources.map((s) => s.title))

    // Sources sit under the answer
    const a = await answer.boundingBox()
    const s = await sources.boundingBox()
    expect(a && s && s.y > a.y).toBe(true)

    const calls = posted(deck)
    expect(calls.length).toBe(1)
    expect(calls[0].method).toBe('POST')
    expect(JSON.parse(calls[0].postData ?? '{}')).toEqual({ query: question })
  })

  test('TC-12b-13: Given an answer with no sources When asked Then the answer shows and no empty sources list appears', async ({ page, deck }) => {
    deck.use('ask', { body: { answer: 'I found nothing on that.', sources: [] } })
    await openConsole(page)
    const box = await ask(page, 'what is on the far side of the moon?')
    await expect(box.getByTestId('ask-answer')).toBeVisible()
    expect(await box.getByTestId('ask-answer').textContent()).toBe('I found nothing on that.')
    await expect(box.getByTestId('ask-sources')).toHaveCount(0)
    await expect(box.getByText('no sources returned')).toBeVisible()
  })

  test('TC-12b-14: Given `/vyom/ask` is NOT BUILT or fails When a question is submitted Then the box shows NOT BUILT/an error with the why, not a blank answer', async ({ page, deck }) => {
    deck.use('ask', 'not-built')
    await openConsole(page)
    let box = await ask(page, 'What is the system status?')
    await expect(box.getByText('NOT BUILT', { exact: true })).toBeVisible()
    await expect(box.getByText((data('ask-not-built.json') as { why: string }).why, { exact: true })).toBeVisible()
    await expect(box.getByTestId('ask-answer')).toHaveCount(0)

    deck.use('ask', { status: 500, body: { error: 'boom' } })
    box = await ask(page, 'and now?')
    await expect(box.getByRole('alert')).toBeVisible()
    expect(await box.getByRole('alert').textContent()).toBe('Error: HTTP 500')
    await expect(box.getByTestId('ask-answer')).toHaveCount(0)
  })
})
