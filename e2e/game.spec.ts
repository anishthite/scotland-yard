import { expect, test } from '@playwright/test'

test('plays the opening fugitive move and saves the game', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /city is a maze/i })).toBeVisible()
  await page.getByRole('button', { name: /begin pursuit/i }).click()
  await expect(page.getByText(/choose any connected/i)).toBeVisible()
  await page.locator('[aria-label^="Move to station"]').first().click()
  await page.locator('.move-option').first().click()
  await expect(page.getByText('1 / 22')).toBeVisible()
  await page.getByRole('button', { name: /save & exit/i }).click()
  await expect(page.getByText(/case in progress/i)).toBeVisible()
})

test('starts as lead detective and receives a bot fugitive clue', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /lead detective/i }).click()
  await page.getByRole('button', { name: /begin pursuit/i }).click()
  await expect(page.getByText(/select a highlighted station/i)).toBeVisible({ timeout: 8_000 })
  await expect(page.locator('.travel-slot.filled')).toHaveCount(1)
  await expect(page.locator('[aria-label^="Move to station"]').first()).toBeVisible()
})

test('completes both legs of a human double move before bots respond', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /begin pursuit/i }).click()
  await page.getByRole('button', { name: /use double move/i }).click()
  await page.locator('[aria-label^="Move to station"]').first().click()
  await page.locator('.move-option').first().click()
  await expect(page.getByText(/second leg required/i)).toBeVisible()
  await page.locator('[aria-label^="Move to station"]').first().click()
  await page.locator('.move-option').first().click()
  await expect(page.getByText('2 / 22')).toBeVisible()
})

test('keeps the core briefing and board usable on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /city is a maze/i })).toBeVisible()
  await page.getByRole('button', { name: /begin pursuit/i }).click()
  await expect(page.locator('.map-card')).toBeVisible()
  await expect(page.locator('[aria-label^="Move to station"]').first()).toBeVisible()
})
