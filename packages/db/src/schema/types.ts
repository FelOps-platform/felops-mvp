import { sql } from 'drizzle-orm'
import { customType } from 'drizzle-orm/pg-core'

/** pgvector column. Values are passed as JSON strings and cast in SQL. */
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value)
  },
  fromDriver(value: unknown): number[] {
    if (Array.isArray(value)) return value as number[]
    return JSON.parse(String(value)) as number[]
  },
})

export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const vectorLiteral = (values: number[]) => sql`${JSON.stringify(values)}::vector`
