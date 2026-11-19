import IORedis from 'ioredis'
import { loadEnv } from '@felops/config'
import { RateLimitExceededError } from './errors'

let redis: IORedis | undefined
const memory = new Map<string, { count: number; expiresAt: number }>()

function client(): IORedis {
  if (!redis) {
    redis = new IORedis(loadEnv().REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
    redis.on('error', () => undefined)
  }
  return redis
}

function memoryLimit(input: { key: string; limit: number; windowSeconds: number }): void {
  const now = Date.now()
  const entry = memory.get(input.key)
  if (!entry || entry.expiresAt <= now) {
    memory.set(input.key, { count: 1, expiresAt: now + input.windowSeconds * 1000 })
    return
  }
  entry.count += 1
  if (entry.count > input.limit) throw new RateLimitExceededError(input.windowSeconds)
}

export async function rateLimit(input: {
  key: string
  limit: number
  windowSeconds: number
}): Promise<void> {
  try {
    const connection = client()
    if (connection.status === 'wait') await connection.connect()
    const count = await connection.incr(input.key)
    if (count === 1) await connection.expire(input.key, input.windowSeconds)
    if (count > input.limit) throw new RateLimitExceededError(input.windowSeconds)
  } catch (error) {
    if (error instanceof RateLimitExceededError) throw error
    memoryLimit(input)
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  memory.delete(key)
  try {
    await client().del(key)
  } catch {
    // Failures are non-fatal for the caller.
  }
}

export { RateLimitExceededError } from './errors'
