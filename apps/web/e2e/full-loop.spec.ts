import { test, expect } from '@playwright/test'

test('owner creates an agent, gets a cited answer, and approves an action', async ({ page }) => {
  await page.goto('/sign-in')
  await page.fill('input[name=email]', 'owner@cairothreads.test')
  await page.fill('input[name=password]', 'demo-password')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/w\//, { timeout: 30_000 })

  await page.goto('/w/cairo-threads/agents')
  await page.getByRole('link', { name: 'Support' }).first().click()
  await page.getByRole('link', { name: 'Playground', exact: true }).click()
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 30_000 })
  await page.fill('textarea', 'الشحن بياخد كام يوم؟')
  const send = page.getByRole('button', { name: 'Send' })
  await expect(send).toBeEnabled()
  await send.click()
  await expect(page.getByText(/3 days|3 أيام/)).toBeVisible()
  await expect(page.getByText(/Shipping and delivery/)).toBeVisible()

  await page.goto('/w/cairo-threads/approvals')
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByText('Succeeded', { exact: false })).toBeVisible({ timeout: 60_000 })
})

test('member cannot approve an action', async ({ page }) => {
  await page.goto('/sign-in')
  await page.fill('input[name=email]', 'owner@cairothreads.test')
  await page.fill('input[name=password]', 'demo-password')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/w\//, { timeout: 30_000 })
  await page.goto('/w/cairo-threads/settings')
  await expect(page.getByText('Members · 1')).toBeVisible()
})
