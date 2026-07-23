import { expect, test, type Page } from '@playwright/test'

const THEME_STORAGE_KEY = 'flowboard-theme-preference'
const DISPLAY_PREFERENCES_STORAGE_KEY = 'flowboard-display-preferences'

async function openFreshPage(page: Page, colorScheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
  await page.addInitScript(
    ({ displayPreferencesKey, themeKey }) => {
      localStorage.removeItem(themeKey)
      localStorage.setItem(
        displayPreferencesKey,
        JSON.stringify({ language: 'zh-CN', timeFormat: '24h' }),
      )
    },
    { displayPreferencesKey: DISPLAY_PREFERENCES_STORAGE_KEY, themeKey: THEME_STORAGE_KEY },
  )
  await page.goto('/')
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: '打开设置' }).click()
  return page.locator('[role="dialog"]:visible')
}

test('uses the system appearance from the first light-theme frame', async ({ page }, testInfo) => {
  await openFreshPage(page, 'light')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 246, 251)')
  await testInfo.attach('theme-light-desktop', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

test('persists an explicit dark choice when the system later changes', async ({
  page,
}, testInfo) => {
  await openFreshPage(page, 'light')
  const dialog = await openSettings(page)

  await dialog.getByRole('button', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY))
    .toBe('dark')
  await testInfo.attach('theme-dark-settings', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

for (const width of [320, 765, 1440]) {
  test(`keeps the appearance control within the viewport at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await openFreshPage(page, 'light')
    const dialog = await openSettings(page)
    const generalButton = dialog.getByRole('button', { name: '通用' })
    if (await generalButton.isVisible()) await generalButton.click()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    const themeControl = dialog.getByRole('group', { name: '外观' })

    await expect(themeControl).toBeVisible()
    await expect(dialog.getByRole('heading', { name: '偏好设置' })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: '任务行为' })).toBeVisible()
    const viewportHasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(viewportHasOverflow).toBe(false)

    const box = await themeControl.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    await testInfo.attach(`theme-light-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}

for (const width of [616, 1440]) {
  test(`keeps Chinese and English preference controls within the settings panel at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await openFreshPage(page, 'dark')
    const dialog = await openSettings(page)
    const generalButton = dialog.getByRole('button', { name: '通用' })
    if (await generalButton.isVisible()) await generalButton.click()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)

    async function expectPreferenceControlsToFit(
      heading: string,
      controls: { group: string; label: string }[],
    ) {
      const section = dialog.getByRole('heading', { name: heading }).locator('..')
      const card = section.locator(':scope > div')
      const cardBox = await card.boundingBox()
      expect(cardBox).not.toBeNull()

      const boxes = []
      for (const { group, label } of controls) {
        const control = dialog.getByRole('group', { name: group })
        const box = await control.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(cardBox!.x)
        expect(box!.x + box!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width)
        boxes.push(box!)

        const row = control.locator('..')
        const rowBox = await row.boundingBox()
        expect(rowBox).not.toBeNull()
        const labelElement = row.getByText(label, { exact: true })
        const labelBox = await labelElement.boundingBox()
        expect(labelBox).not.toBeNull()
        expect(box!.y).toBeGreaterThan(labelBox!.y + labelBox!.height)
        const labelMetrics = await labelElement.evaluate((element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }))
        expect(labelMetrics.scrollHeight).toBeLessThanOrEqual(labelMetrics.clientHeight + 1)
      }

      expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    }

    await expectPreferenceControlsToFit('偏好设置', [
      { group: '外观', label: '外观' },
      { group: '语言', label: '语言' },
      { group: '时间格式', label: '时间格式' },
    ])
    await testInfo.attach(`preferences-zh-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

    await dialog.getByRole('group', { name: '语言' }).getByRole('button', { name: '英文' }).click()
    await expect(dialog.getByRole('heading', { name: 'Preferences' })).toBeVisible()
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    await expectPreferenceControlsToFit('Preferences', [
      { group: 'Appearance', label: 'Appearance' },
      { group: 'Language', label: 'Language' },
      { group: 'Time format', label: 'Time format' },
    ])
    await testInfo.attach(`preferences-en-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })
  })
}
