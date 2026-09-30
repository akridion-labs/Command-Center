import { test, expect, openConsole } from './fixtures'
import type { Page } from '@playwright/test'

const tileTitles = (page: Page) => page.getByRole('region', { name: 'Tiles' }).locator('.card-title').allTextContents()

test.describe('Tiles', () => {
  test('TC-12b-15: Given `/vyom/me` options A When the console opens Then exactly tiles A show; with options B, exactly tiles B show', async ({ page, deck }) => {
    // A: the default me.json - deploys and models on, work off
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    expect(await tileTitles(page)).toEqual(['deploys', 'models'])

    deck.use('me', { body: { user: 'coo', options: { work: true, deploys: false, models: false } } })
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    expect(await tileTitles(page)).toEqual(['work'])
  })

  test('TC-12b-16: Given `/vyom/me` with an empty `options` When the console opens Then no tiles are shown and the page stays usable', async ({ page, deck }) => {
    deck.use('me', { body: { user: 'guest', options: {} } })
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toHaveCount(0)
    // Still usable: the ask box takes a question
    const box = page.getByLabel('Ask Vyom')
    await box.getByPlaceholder('Ask a question...').fill('still here?')
    await box.getByRole('button', { name: 'Ask' }).click()
    await expect(box.getByTestId('ask-answer')).toBeVisible()
  })

  test('TC-12b-17: Given `/vyom/me` with `config_problem` When the console opens Then the problem text is visible', async ({ page, deck }) => {
    const problem = 'ROLE_OPTIONS has no entry for role "cto"'
    deck.use('me', { body: { user: 'cto', options: { deploys: true }, config_problem: problem } })
    await openConsole(page)
    const card = page.getByLabel('Config Problem')
    await expect(card).toBeVisible()
    await expect(card.getByText(problem, { exact: true })).toBeVisible()
  })

  test('TC-12b-18: Given `/vyom/me` without `config_problem` When the console opens Then no config problem message appears', async ({ page }) => {
    await openConsole(page)
    await expect(page.getByRole('region', { name: 'Tiles' })).toBeVisible()
    await expect(page.getByLabel('Config Problem')).toHaveCount(0)
    await expect(page.getByText('Configuration Problem')).toHaveCount(0)
  })
})
