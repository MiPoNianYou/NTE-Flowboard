import { expect, test } from '@playwright/test'

test('persists a completed checklist item after reloading the page', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const taskName = 'E2E persistence task'
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByPlaceholder('Enter a task name...').fill(taskName)
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  await page.getByRole('button', { name: `Mark “${taskName}” as complete` }).click()
  await expect(
    page.getByRole('button', { name: `Mark “${taskName}” as incomplete` }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(page.getByText(taskName, { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: `Mark “${taskName}” as incomplete` }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('edits and hides a task from compact item actions without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  const taskName = 'Compact action task'
  const updatedName = 'Updated compact task'
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByPlaceholder('Enter a task name...').fill(taskName)
  await page.getByRole('button', { name: 'Add', exact: true }).click()

  await page.getByText(taskName, { exact: true }).click()
  const actionButtons = ['Edit', 'Hide', 'Delete'].map((name) =>
    page.getByRole('button', { name, exact: true }),
  )
  for (const button of actionButtons) {
    await expect(button).toBeVisible()
    const box = await button.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  }

  await actionButtons[0].click()
  await page.getByRole('textbox', { name: 'Edit task name' }).fill(updatedName)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible()

  await page.getByText(updatedName, { exact: true }).click()
  await page.getByRole('button', { name: 'Hide', exact: true }).click()
  await expect(page.getByRole('button', { name: `Mark “${updatedName}” as complete` })).toHaveCount(
    0,
  )
  await expect(page.getByRole('button', { name: 'Hidden tasks (1)' })).toBeVisible()
  await expect(page.getByText(updatedName, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
