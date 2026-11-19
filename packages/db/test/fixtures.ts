import { randomUUID } from 'node:crypto'
import { db } from '../src/client'
import { workspace } from '../src/schema'

export async function createWorkspaceFixture(slug: string) {
  const [row] = await db
    .insert(workspace)
    .values({
      name: slug,
      slug: `${slug}-${randomUUID().slice(0, 8)}`,
    })
    .returning()
  return row
}
