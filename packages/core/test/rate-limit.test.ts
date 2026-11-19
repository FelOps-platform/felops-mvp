import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { rateLimit, RateLimitExceededError } from '../src/rate-limit'

it('rejects the request after the window limit', async () => {
  const key = `chat:pk_123:1.2.3.4:${randomUUID()}`
  for (let i = 0; i < 30; i += 1) {
    await rateLimit({ key, limit: 30, windowSeconds: 60 })
  }
  await expect(rateLimit({ key, limit: 30, windowSeconds: 60 })).rejects.toBeInstanceOf(
    RateLimitExceededError,
  )
})
