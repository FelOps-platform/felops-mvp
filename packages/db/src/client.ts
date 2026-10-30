import { loadEnv } from '@felops/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL ?? loadEnv().DATABASE_URL

export const queryClient = postgres(connectionString, {
  max: 10,
  onnotice: () => undefined,
})

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
export { schema }
export * from './schema'
