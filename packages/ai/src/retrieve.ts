export type RankedItem = { id: string; rank: number }
export type FusedItem = { id: string; score: number }

/**
 * Reciprocal Rank Fusion. A document found by both retrievers outranks a
 * document found by only one of them.
 */
export function fuseRrf(
  vectorRanked: RankedItem[],
  lexicalRanked: RankedItem[],
  k = 60,
): FusedItem[] {
  const scores = new Map<string, number>()
  for (const list of [vectorRanked, lexicalRanked]) {
    for (const item of list) {
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + item.rank))
    }
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

export type RetrievedChunk = {
  id: string
  sourceId: string
  title: string
  content: string
  heading: string | null
  score: number
}

export const DEFAULT_RETRIEVAL_SCORE_FLOOR = 0.015
