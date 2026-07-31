import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

test('exports the current data and imports a valid backup', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  await page.getByRole('button', { name: /^(?:打开设置|Open settings)$/ }).click()
  const dialog = page.locator('[role="dialog"]:visible')
  await dialog.getByRole('button', { name: /^(?:数据管理|Data)$/ }).click()

  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /^(?:导出数据|Export data)/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('NTE_Flowboard.json')

  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()
  const exportedData = JSON.parse(await readFile(downloadPath!, 'utf8')) as Record<string, unknown>
  expect(exportedData).toMatchObject({
    daily: expect.any(Array),
    weekly: expect.any(Array),
    monthly: expect.any(Array),
    settings: expect.any(Object),
  })

  const importedTask = 'Imported E2E task'
  const backup = {
    daily: [
      {
        text: importedTask,
        isCompleted: false,
        isHidden: false,
        order: 1,
        tags: ['Backup'],
      },
    ],
    weekly: [],
    monthly: [],
  }
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'flowboard-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  })

  await expect(dialog.getByText(/^(?:导入完成|Import complete)$/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByText(importedTask, { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText(importedTask, { exact: true })).toBeVisible()
})
