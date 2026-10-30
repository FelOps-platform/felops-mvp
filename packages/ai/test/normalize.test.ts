import { expect, it } from 'vitest'
import { normalizeArabic } from '../src/normalize'

it('removes diacritics and unifies alef, ya, ta marbuta, and digits', () => {
  expect(normalizeArabic('الشّحنُ إِلَى الإِسْكَنْدَرِيَّة ٢٠٢٦')).toBe(
    'الشحن الي الاسكندريه 2026',
  )
})

it('removes tatweel and collapses whitespace', () => {
  expect(normalizeArabic('مرحـــبا   بيك')).toBe('مرحبا بيك')
})
