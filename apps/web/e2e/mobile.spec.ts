import { test, expect } from '@playwright/test'

test('hosted page renders RTL Arabic on a phone without horizontal scroll', async ({ page }) => {
  await page.goto('/chat/cairo-threads/support')
  await expect(page.getByText('Cairo Threads', { exact: true })).toBeVisible()
  await expect(page.getByText(/أهلاً بيك/)).toBeVisible()
  await page.locator('[data-hydrated="true"]').waitFor({ timeout: 30_000 })

  const direction = await page.evaluate(() => {
    const node = document.querySelector('[dir="rtl"]')
    return node ? getComputedStyle(node).direction : 'ltr'
  })
  expect(direction).toBe('rtl')

  await page.getByPlaceholder('اكتب سؤالك…').fill('الشحن بياخد كام يوم؟')
  await page.getByRole('button', { name: 'إرسال' }).click()
  await expect(page.getByText(/3 أيام/)).toBeVisible({ timeout: 90_000 })

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  )
  expect(overflow).toBe(true)
})
