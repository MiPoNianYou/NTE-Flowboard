import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('main checklist has no detectable WCAG A/AA violations', async ({ page }) => {
  await expect(page.getByRole('button', { name: /^(?:添加任务|Add task)$/ })).toBeVisible()
  await expectNoAccessibilityViolations(page)
})

test('settings dialog has no detectable WCAG A/AA violations', async ({ page }) => {
  await page.getByRole('button', { name: /^(?:打开设置|Open settings)$/ }).click()
  await expect(page.locator('[role="dialog"]:visible')).toBeVisible()

  await expectNoAccessibilityViolations(page)
})
