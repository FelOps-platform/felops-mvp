import { and, eq, sql } from 'drizzle-orm'
import { db, knowledgeChunk } from '@felops/db'
import { findChunksByIds } from '@felops/db/repositories/chunks'
import { vectorLiteral } from '@felops/db/schema'
import {
  DEFAULT_RETRIEVAL_SCORE_FLOOR,
  embedText,
  fuseRrf,
  normalizeArabic,
  type RetrievedChunk,
} from '@felops/ai'

function toTsQuery(query: string): string {
  const tokens = normalizeArabic(query)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.replace(/[':&|!()<>]/g, ''))
    .filter((token) => token.length > 1)
    .slice(0, 24)
  return tokens.join(' | ')
}

export async function retrieve(input: {
  workspaceId: string
  agentId: string
  query: string
  limit?: number
  scoreFloor?: number
}): Promise<RetrievedChunk[]> {
  const limit = input.limit ?? 6
  const scoreFloor = input.scoreFloor ?? DEFAULT_RETRIEVAL_SCORE_FLOOR
  if (!input.query.trim()) return []

  const scoped = and(
    eq(knowledgeChunk.workspaceId, input.workspaceId),
    eq(knowledgeChunk.agentId, input.agentId),
  )

  const vector = await embedText(input.query)
  const vectorRows = await db
    .select({ id: knowledgeChunk.id })
    .from(knowledgeChunk)
    .where(
      and(
        scoped,
        sql`${knowledgeChunk.embedding} is not null`,
        sql`(1 - (${knowledgeChunk.embedding} <=> ${vectorLiteral(vector)})) >= 0.2`,
      ),
    )
    .orderBy(sql`${knowledgeChunk.embedding} <=> ${vectorLiteral(vector)}`)
    .limit(20)

  const tsQuery = toTsQuery(input.query)
  let lexicalRows: { id: string }[] = []
  if (tsQuery) {
    lexicalRows = await db
      .select({ id: knowledgeChunk.id })
      .from(knowledgeChunk)
      .where(
        and(
          scoped,
          sql`${knowledgeChunk.tsv} @@ to_tsquery('simple', ${tsQuery})`,
        ),
      )
      .orderBy(
        sql`ts_rank_cd(${knowledgeChunk.tsv}, to_tsquery('simple', ${tsQuery})) desc`,
      )
      .limit(20)
  }

  const fused = fuseRrf(
    vectorRows.map((row, index) => ({ id: row.id, rank: index + 1 })),
    lexicalRows.map((row, index) => ({ id: row.id, rank: index + 1 })),
  )

  if (fused.length === 0 || fused[0].score < scoreFloor) return []

  const top = fused.slice(0, limit)
  const rows = await findChunksByIds({
    workspaceId: input.workspaceId,
    ids: top.map((item) => item.id),
  })
  const byId = new Map(rows.map((row) => [row.id, row]))

  return top.flatMap((item) => {
    const row = byId.get(item.id)
    if (!row) return []
    return [
      {
        id: row.id,
        sourceId: row.sourceId,
        title: row.title,
        heading: row.heading,
        content: row.content,
        score: item.score,
      },
    ]
  })
}
