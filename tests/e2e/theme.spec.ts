import { expect, test, type Locator, type Page } from '@playwright/test'

const DISPLAY_PREFERENCES_STORAGE_KEY = 'flowboard-display-preferences'
const LEGACY_THEME_STORAGE_KEY = 'flowboard-theme-preference'

async function openFreshPage(page: Page, colorScheme: 'light' | 'dark') {
  await page.emulateMedia({ colorScheme, reducedMotion: 'no-preference' })
  await page.addInitScript(
    ({ displayPreferencesKey, legacyThemeKey }) => {
      const initializedKey = 'flowboard-e2e-environment-initialized'
      const environmentLanguageKey = 'flowboard-e2e-environment-language'
      const environmentHour12Key = 'flowboard-e2e-environment-hour12'
      if (!sessionStorage.getItem(initializedKey)) {
        localStorage.removeItem(legacyThemeKey)
        localStorage.removeItem(displayPreferencesKey)
        sessionStorage.setItem(environmentLanguageKey, 'zh-CN')
        sessionStorage.setItem(environmentHour12Key, 'false')
        sessionStorage.setItem(initializedKey, 'true')
      }

      Object.defineProperty(navigator, 'languages', {
        get: () => [sessionStorage.getItem(environmentLanguageKey) ?? 'zh-CN'],
      })
      Object.defineProperty(navigator, 'language', {
        get: () => sessionStorage.getItem(environmentLanguageKey) ?? 'zh-CN',
      })

      const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions
      Intl.DateTimeFormat.prototype.resolvedOptions = function () {
        const options = resolvedOptions.call(this)
        const hour12 = sessionStorage.getItem(environmentHour12Key) === 'true'
        return { ...options, hour12, hourCycle: hour12 ? 'h12' : 'h23' }
      }
    },
    {
      displayPreferencesKey: DISPLAY_PREFERENCES_STORAGE_KEY,
      legacyThemeKey: LEGACY_THEME_STORAGE_KEY,
    },
  )
  await page.goto('/')
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: /^(?:打开设置|Open settings)$/ }).click()
  return page.locator('[role="dialog"]:visible')
}

async function expectWithinViewport(locator: Locator, width: number) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(width)
}

async function expectWithinContainer(locator: Locator, container: { x: number; width: number }) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(container.x)
  expect(box!.x + box!.width).toBeLessThanOrEqual(container.x + container.width)
}

async function waitForMobilePageToSettle(dialog: Locator) {
  await expect
    .poll(() => dialog.locator('[data-settings-mobile-page]').count(), { timeout: 2000 })
    .toBe(1)
}

test('uses the user environment from the first light-theme frame', async ({ page }, testInfo) => {
  await openFreshPage(page, 'light')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(244, 246, 251)')
  await testInfo.attach('theme-light-desktop', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

test('persists explicit display choices when the environment later changes', async ({
  page,
}, testInfo) => {
  await openFreshPage(page, 'light')
  const dialog = await openSettings(page)

  await dialog.getByRole('button', { name: '深色' }).click()
  await dialog.getByRole('button', { name: '12 小时' }).click()
  await dialog.getByRole('button', { name: '英文' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.emulateMedia({ colorScheme: 'dark' })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.evaluate(() => {
    sessionStorage.setItem('flowboard-e2e-environment-language', 'zh-CN')
    sessionStorage.setItem('flowboard-e2e-environment-hour12', 'false')
    window.dispatchEvent(new Event('languagechange'))
  })
  await page.reload()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const reloadedDialog = await openSettings(page)
  await expect(
    reloadedDialog.getByRole('group', { name: 'Appearance' }).getByRole('button', {
      name: 'Dark',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    reloadedDialog.getByRole('group', { name: 'Language' }).getByRole('button', {
      name: 'English',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    reloadedDialog.getByRole('group', { name: 'Time format' }).getByRole('button', {
      name: '12-hour',
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        DISPLAY_PREFERENCES_STORAGE_KEY,
      ),
    )
    .toEqual({ theme: 'dark', language: 'en-US', timeFormat: '12h' })
  await testInfo.attach('theme-dark-settings', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
})

test('migrates the legacy theme preference without a light first frame', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(
    ({ displayPreferencesKey, legacyThemeKey }) => {
      localStorage.setItem(legacyThemeKey, 'dark')
      localStorage.setItem(
        displayPreferencesKey,
        JSON.stringify({ language: 'zh-CN', timeFormat: '12h' }),
      )
    },
    {
      displayPreferencesKey: DISPLAY_PREFERENCES_STORAGE_KEY,
      legacyThemeKey: LEGACY_THEME_STORAGE_KEY,
    },
  )

  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
        DISPLAY_PREFERENCES_STORAGE_KEY,
      ),
    )
    .toEqual({ theme: 'dark', language: 'zh-CN', timeFormat: '12h' })
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), LEGACY_THEME_STORAGE_KEY))
    .toBeNull()
})

test('keeps a hovered card scaled while changing the theme', async ({ page }) => {
  await openFreshPage(page, 'light')
  const dialog = await openSettings(page)
  const preferences = dialog.getByRole('heading', { name: '偏好设置' }).locator('..')
  const card = preferences.locator(':scope > div')
  const darkChoice = dialog
    .getByRole('group', { name: '外观' })
    .getByRole('button', { name: '深色' })

  await card.hover()
  await expect.poll(() => card.evaluate((element) => element.matches(':hover'))).toBe(true)

  await darkChoice.click({ noWaitAfter: true })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.waitForTimeout(100)
  expect(await card.evaluate((element) => element.matches(':hover'))).toBe(true)
  expect(
    await card.evaluate((element) => Number.parseFloat(getComputedStyle(element).scale)),
  ).toBeCloseTo(1.03, 2)
})

for (const width of [320, 765, 1440]) {
  test(`keeps the appearance control within the viewport at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await openFreshPage(page, 'light')
    const dialog = await openSettings(page)
    if (width < 768) {
      await dialog.getByRole('button', { name: '通用', exact: true }).click()
      await waitForMobilePageToSettle(dialog)
      await expect(dialog.getByRole('heading', { name: '通用', exact: true })).toBeVisible()

      const themeControl = dialog.getByRole('group', { name: '外观' })
      await expect(themeControl).toBeVisible()
      await expectWithinViewport(themeControl, width)
      await expect(themeControl.getByRole('button')).toHaveCount(2)
    } else {
      const generalButton = dialog.getByRole('button', { name: '通用', exact: true })
      if (await generalButton.isVisible()) await generalButton.click()
      const themeControl = dialog.getByRole('group', { name: '外观' })

      await expect(themeControl).toBeVisible()
      await expect(dialog.getByRole('heading', { name: '偏好设置' })).toBeVisible()
      await expect(dialog.getByRole('heading', { name: '任务行为' })).toBeVisible()
      await expectWithinViewport(themeControl, width)
    }

    const viewportHasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(viewportHasOverflow).toBe(false)
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
    if (width < 768) {
      await dialog.getByRole('button', { name: '通用', exact: true }).click()
      await waitForMobilePageToSettle(dialog)
      await expect(dialog.getByRole('heading', { name: '通用', exact: true })).toBeVisible()

      const section = dialog.getByRole('heading', { name: '偏好设置' }).locator('..')
      const card = section.locator(':scope > div')
      const cardBox = await card.boundingBox()
      expect(cardBox).not.toBeNull()

      const preferenceControls = [
        dialog.getByRole('group', { name: '外观' }),
        dialog.getByRole('group', { name: '语言' }),
        dialog.getByRole('group', { name: '时间格式' }),
      ]
      for (const control of preferenceControls) {
        await expect(control).toBeVisible()
        await expectWithinContainer(control, cardBox!)
        await expect(control.getByRole('button')).toHaveCount(2)
      }

      const englishChoice = dialog
        .getByRole('group', { name: '语言' })
        .getByRole('button', { name: '英文', exact: true })
      await expect(englishChoice).toBeVisible()
      await expectWithinViewport(englishChoice, width)

      await englishChoice.click()
      await expect(dialog.getByRole('heading', { name: 'General', exact: true })).toBeVisible()
      await expect(
        dialog.getByRole('group', { name: 'Language' }).getByRole('button', {
          name: 'English',
          exact: true,
        }),
      ).toHaveAttribute('aria-pressed', 'true')
    } else {
      const generalButton = dialog.getByRole('button', { name: '通用', exact: true })
      if (await generalButton.isVisible()) await generalButton.click()
    }

    async function expectPreferenceControlsToFit(
      heading: string,
      controls: { group: string; label: string }[],
    ) {
      await page.mouse.move(0, 0)

      const section = dialog.getByRole('heading', { name: heading }).locator('..')
      const card = section.locator(':scope > div')
      const cardBox = await card.boundingBox()
      expect(cardBox).not.toBeNull()

      for (const { group, label } of controls) {
        const control = dialog.getByRole('group', { name: group })
        const box = await control.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(cardBox!.x)
        expect(box!.x + box!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width)
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

      await expect
        .poll(async () => {
          const [firstBox, secondBox] = await Promise.all(
            controls
              .slice(0, 2)
              .map(({ group }) => dialog.getByRole('group', { name: group }).boundingBox()),
          )
          if (!firstBox || !secondBox) return Number.POSITIVE_INFINITY
          return Math.abs(firstBox.width - secondBox.width)
        })
        .toBeLessThanOrEqual(1)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true)
    }

    if (width < 768) {
      await testInfo.attach(`preferences-mobile-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      })
      return
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
