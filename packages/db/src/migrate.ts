import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const url =
  process.env.DATABASE_URL ?? 'postgres://felops:felops@localhost:5433/felops'
const migrationsDir = fileURLToPath(new URL('../drizzle', import.meta.url))

async function main() {
  const sql = postgres(url, { max: 1, onnotice: () => undefined })
  try {
    await sql`create extension if not exists vector`
    await sql`
      create table if not exists __migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const [applied] = await sql`select name from __migrations where name = ${file}`
      if (applied) continue
      const body = await readFile(`${migrationsDir}/${file}`, 'utf8')
      const statements = body
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean)
      await sql.begin(async (tx) => {
        for (const statement of statements) {
          await tx.unsafe(statement)
        }
        await tx`insert into __migrations (name) values (${file})`
      })
      console.log(`applied ${file}`)
    }
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
