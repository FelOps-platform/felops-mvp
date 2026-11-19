import { expect, it } from 'vitest'
import { GET } from '../src/app/api/health/route'

it('reports postgres and redis health', async () => {
  const response = await GET()
  expect(response.status).toBe(200)
  const body = (await response.json()) as { status: string; db: string; redis: string }
  expect(body).toEqual({ status: 'ok', db: 'up', redis: 'up' })
})
