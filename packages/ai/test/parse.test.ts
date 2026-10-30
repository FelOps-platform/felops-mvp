import { expect, it } from 'vitest'
import { parseHtml } from '../src/parse/html'
import { parseTxt } from '../src/parse/txt'

it('keeps article text and drops scripts and navigation', () => {
  const doc = parseHtml(
    '<html><body><nav>Home</nav><script>alert(1)</script><article><h1>Returns</h1><p>30 days.</p></article></body></html>',
    'https://shop.test/returns',
  )
  expect(doc.text).toContain('30 days')
  expect(doc.text).not.toContain('alert')
  expect(doc.text).not.toContain('Home')
})

it('rejects binary text files', () => {
  expect(() => parseTxt(Buffer.from([0x68, 0x00, 0x69]))).toThrow(/binary|UTF-8/i)
})
