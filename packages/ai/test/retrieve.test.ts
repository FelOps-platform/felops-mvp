import { expect, it } from 'vitest'
import { fuseRrf } from '../src/retrieve'

it('ranks a document found by both retrievers above a single-retriever hit', () => {
  const fused = fuseRrf(
    [
      { id: 'a', rank: 1 },
      { id: 'b', rank: 2 },
    ],
    [
      { id: 'b', rank: 1 },
      { id: 'c', rank: 2 },
    ],
  )
  expect(fused[0].id).toBe('b')
  expect(fused[0].score).toBeGreaterThan(fused[1].score)
})
