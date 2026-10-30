import { expect, it } from 'vitest'
import { assertSafePublicUrl } from '../src/knowledge/url-safety'

it.each([
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://169.254.169.254/latest/meta-data',
  'file:///etc/passwd',
  'http://[::1]',
  'http://user:pass@example.com',
  'http://10.0.0.5/admin',
  'http://192.168.1.1',
])('rejects %s', (url) => {
  expect(() => assertSafePublicUrl(url)).toThrow()
})

it('accepts a public https URL', () => {
  expect(assertSafePublicUrl('https://example.com/help').hostname).toBe('example.com')
})
