import { sql } from 'drizzle-orm'
import IORedis from 'ioredis'
import { db } from '@felops/db'
import { loadEnv } from '@felops/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  let dbStatus: 'up' | 'down' = 'up'
  let redisStatus: 'up' | 'down' = 'up'

  try {
    await db.execute(sql`select 1`)
  } catch {
    dbStatus = 'down'
  }

  const redis = new IORedis(loadEnv().REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
  })
  try {
    await redis.connect()
    await redis.ping()
  } catch {
    redisStatus = 'down'
  } finally {
    redis.disconnect()
  }

  const ok = dbStatus === 'up' && redisStatus === 'up'
  return Response.json(
    { status: ok ? 'ok' : 'degraded', db: dbStatus, redis: redisStatus },
    { status: ok ? 200 : 503 },
  )
}
