import { test, expect, openConsole, assertIntranet, offIntranet } from './fixtures'

test.describe('Intranet Rule', () => {
  test('TC-12b-19: Given the page fully used (panels, ask, tiles) When every request is recorded Then all hosts are localhost or 127.0.0.1', async ({ page, deck }) => {
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()

    const box = page.getByLabel('Ask Vyom')
    await box.getByPlaceholder('Ask a question...').fill('What is the system status?')
    await box.getByRole('button', { name: 'Ask' }).click()
    await expect(box.getByTestId('ask-answer')).toBeVisible()
    await page.getByRole('button', { name: '7d' }).click()
    await page.waitForLoadState('networkidle')

    // Loading, panels, ask and tiles all happened, so the record is not empty
    expect(deck.urls.some((u) => u.endsWith('/vyom/ask'))).toBe(true)
    expect(deck.urls.some((u) => u.endsWith('/vyom/me'))).toBe(true)
    expect(() => assertIntranet(deck.urls)).not.toThrow()
  })

  test('TC-12b-20: Given a page that fetches `https://example.com` When the intranet check runs Then it fails naming that URL (guards against a vacuous test)', async ({ page, deck }) => {
    await openConsole(page)
    // The fixture aborts it before it leaves the machine; the request is still recorded.
    await page.evaluate(() => fetch('https://example.com/').catch(() => null))
    expect(offIntranet(deck.urls)).toEqual(['https://example.com/'])
    expect(() => assertIntranet(deck.urls)).toThrow('requests left localhost: https://example.com/')
  })
})
