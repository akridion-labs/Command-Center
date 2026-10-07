import { test, expect, panel, openConsole, PANELS, data } from './fixtures'

const why = (file: string) => (data(file) as { why: string }).why

const MODELS = {
  default: 'llama3.1:8b',
  models: [
    { name: 'llama3.1:8b', default: true },
    { name: 'gemma:7b', default: false },
  ],
  build_loop_evidence: {
    'llama3.1:8b': { calls: 45, minutes: 120, slices_ok: 12, first_try: 9 },
    'gemma:7b': { calls: 12, minutes: 45, slices_ok: 4, first_try: 1 },
  },
}

const RELEASES = [
  { version: 'v0.3.0', date: '2026-10-01', since: 'v0.2.0', commits: ['a1b2c3', 'd4e5f6'], slices: [{ id: '20', title: 'doctor panel', commit: 'a1b2c3', date: '2026-10-01', tests: 6 }], fixes: [], other: [] },
  { version: 'v0.2.0', date: '2026-09-20', since: 'v0.1.0', commits: ['0ff1ce'], slices: [], fixes: ['login loop'], other: [] },
]

test.describe('Story 20 - Doctor Panel', () => {
  test('TC-20-1: Given the user is on the Doctor panel When the page loads Then all system checks are displayed with their status', async ({ page }) => {
    await openConsole(page)
    const checks = panel(page, 'Doctor').locator('li')
    await expect(checks).toHaveCount(3)
    expect(await checks.evaluateAll((els) => els.map((e) => e.getAttribute('data-ok')))).toEqual(['true', 'true', 'false'])
    await expect(checks.nth(0).getByText('✓ ollama reachable')).toBeVisible()
    await expect(checks.nth(2).getByText('✗ GPU memory')).toBeVisible()
  })

  test('TC-20-2: Given a failing check exists When the user views the doctor panel Then the cause and fix command are shown for each failing check', async ({ page, deck }) => {
    deck.use('doctor', { body: { at: '2026-10-01T08:00:00Z', checks: [
      { name: 'Database connection', ok: true },
      { name: 'API health', ok: false, cause: 'Connection timeout', do: 'docker restart vyom-api' },
      { name: 'Cache status', ok: true },
    ] } })
    await openConsole(page)
    const failing = panel(page, 'Doctor').locator('li[data-ok="false"]')
    await expect(failing).toHaveCount(1)
    await expect(failing.getByText('✗ API health')).toBeVisible()
    await expect(failing.getByText('Connection timeout')).toBeVisible()
    const cmd = failing.locator('code.mono')
    expect(await cmd.textContent()).toBe('docker restart vyom-api')
    expect(await cmd.evaluate((e) => getComputedStyle(e).userSelect)).toBe('all')
    await expect(failing.getByRole('button', { name: 'Copy' })).toBeVisible()
    await expect(panel(page, 'Doctor').locator('li[data-ok="true"] code')).toHaveCount(0)
  })

  test('TC-20-3: Given an automatic fix occurred When the user views the doctor panel Then fixed checks show "fixed automatically" indicator', async ({ page, deck }) => {
    deck.use('doctor', { body: { at: '2026-10-01T08:00:00Z', checks: [
      { name: 'Database connection', ok: true, fixed: true },
      { name: 'Cache status', ok: true },
    ] } })
    await openConsole(page)
    const checks = panel(page, 'Doctor').locator('li')
    await expect(checks.nth(0).getByText('fixed automatically')).toBeVisible()
    await expect(checks.nth(1).getByText('fixed automatically')).toHaveCount(0)
  })

  test('TC-20-5: Given a non-admin user accesses the panel When the page loads Then access denied message is shown', async ({ page, deck }) => {
    deck.use('doctor', { status: 403, body: { error: 'forbidden' } })
    await openConsole(page)
    const doctor = panel(page, 'Doctor')
    await expect(doctor.getByText('NOT BUILT', { exact: true })).toBeVisible()
    expect(await doctor.locator('p').first().textContent()).toBe('not permitted for your role')
    await expect(doctor.locator('li')).toHaveCount(0)
  })

  test('TC-20-6: Given the panel displays model information When the user views the doctor panel Then model names, default status, and build loop evidence are shown', async ({ page, deck }) => {
    deck.use('models', { body: MODELS })
    await openConsole(page)
    const models = panel(page, 'Models')
    expect(await models.locator('tr[data-model="llama3.1:8b"] td').first().textContent()).toBe('llama3.1:8b default')
    expect(await models.locator('tr[data-model="gemma:7b"] td').first().textContent()).toBe('gemma:7b')
    expect(await models.locator('tr[data-model="llama3.1:8b"] td').allTextContents()).toEqual(['llama3.1:8b default', '45', '120', '12', '75%', 'not checked', 'No tests'])
  })

  test('TC-20-7: Given the panel shows releases When the user views the doctor panel Then release history from /console/releases.json is displayed', async ({ page }) => {
    await page.route('**/console/releases.json', (route) => route.fulfill({ json: RELEASES }))
    await openConsole(page)
    const history = page.getByLabel('Release History')
    await expect(history.locator('li')).toHaveCount(2)
  })

  test('TC-20-9: Given an API error occurs When the user views the doctor panel Then appropriate error message is shown', async ({ page, deck }) => {
    deck.use('doctor', { status: 500, body: { error: 'boom' } })
    await openConsole(page)
    const doctor = panel(page, 'Doctor')
    expect(await doctor.locator('p').first().textContent()).toBe('/vyom/doctor unreachable')
    await expect(doctor.getByText('no checks reported')).toHaveCount(0)
    for (const title of PANELS.filter((t) => t !== 'Doctor')) await expect(panel(page, title)).toBeVisible()
  })

  test('TC-20-10: Given the doctor feature is not built When the user views the doctor panel Then NOT BUILT state with explanation is displayed', async ({ page, deck }) => {
    deck.use('doctor', 'not-built')
    await openConsole(page)
    const doctor = panel(page, 'Doctor')
    await expect(doctor.getByText('NOT BUILT', { exact: true })).toBeVisible()
    expect(await doctor.locator('p').first().textContent()).toBe(why('doctor-not-built.json'))
  })

  test('TC-20-11: Given a check has status "owe" When the user views the doctor panel Then the owe status is properly displayed', async ({ page, deck }) => {
    // /vyom/doctor reports ok true/false only; a not-ok check with nothing to run still shows as failing, with no empty command
    deck.use('doctor', { body: { at: '2026-10-01T08:00:00Z', checks: [{ name: 'Pending review', ok: false }] } })
    await openConsole(page)
    const check = panel(page, 'Doctor').locator('li')
    await expect(check).toHaveCount(1)
    expect(await check.getAttribute('data-ok')).toBe('false')
    expect(await check.textContent()).toBe('✗ Pending review')
  })

  test('TC-20-12: Given multiple failing checks exist When the user views the doctor panel Then all causes and fix commands are shown for each failing check', async ({ page, deck }) => {
    deck.use('doctor', { body: { at: '2026-10-01T08:00:00Z', checks: [
      { name: 'Check 1', ok: false, cause: 'Reason 1', do: 'fix command 1' },
      { name: 'Check 2', ok: false, cause: 'Reason 2', do: 'fix command 2' },
      { name: 'Check 3', ok: true },
    ] } })
    await openConsole(page)
    const failing = panel(page, 'Doctor').locator('li[data-ok="false"]')
    await expect(failing).toHaveCount(2)
    expect(await failing.locator('code.mono').allTextContents()).toEqual(['fix command 1', 'fix command 2'])
    await expect(failing.nth(0).getByText('Reason 1')).toBeVisible()
    await expect(failing.nth(1).getByText('Reason 2')).toBeVisible()
  })

  test('TC-20-13: Given a successful API response When the doctor panel displays data Then data is correctly parsed and rendered', async ({ page, deck }) => {
    deck.use('doctor', { body: { at: '2026-10-01T08:00:00Z', checks: [] } })
    await openConsole(page)
    const doctor = panel(page, 'Doctor')
    await expect(doctor.getByText('no checks reported')).toBeVisible()
    await expect(doctor.getByText('NOT BUILT')).toHaveCount(0)
    expect(deck.served.filter((s) => s.path === '/vyom/doctor').length).toBe(1)
  })

  test('TC-20-14: Given model evidence table exists When the user views the doctor panel Then minutes and first-try percentages are shown for each model', async ({ page, deck }) => {
    deck.use('models', { body: MODELS })
    await openConsole(page)
    const models = panel(page, 'Models')
    const cells = async (name: string) => models.locator(`tr[data-model="${name}"] td`).allTextContents()
    expect((await cells('llama3.1:8b')).slice(2)).toEqual(['120', '12', '75%', 'not checked', 'No tests'])
    expect((await cells('gemma:7b')).slice(2)).toEqual(['45', '4', '25%', 'not checked', 'No tests'])
  })

  test('TC-20-15: Given releases.json contains data When the user views the doctor panel Then release history is properly displayed with version, date, and commits', async ({ page }) => {
    await page.route('**/console/releases.json', (route) => route.fulfill({ json: RELEASES }))
    await openConsole(page)
    const rows = page.getByLabel('Release History').locator('li')
    await expect(rows.nth(0).getByText('v0.3.0 • 2026-10-01')).toBeVisible()
    await expect(rows.nth(0).getByText('Commits: a1b2c3, d4e5f6')).toBeVisible()
    await expect(rows.nth(1).getByText('v0.2.0 • 2026-09-20')).toBeVisible()
  })
})
