import { sql } from 'drizzle-orm'
import { db } from '../src/client'

/**
 * Truncate every public table so each test starts from a clean slate.
 * Migrations bookkeeping is preserved.
 */
export async function resetDb(): Promise<void> {
  const result = await db.execute<{ tablename: string }>(sql`
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not like '\\_\\_%'
      and tablename not like 'drizzle%'
  `)
  const tables = result.map((row) => row.tablename)
  if (tables.length === 0) return
  const list = tables.map((name) => `"public"."${name}"`).join(', ')
  await db.execute(sql.raw(`truncate table ${list} restart identity cascade`))
}

export { db }
