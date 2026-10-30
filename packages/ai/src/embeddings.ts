import { createOpenAI } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { EMBEDDING_DIMENSIONS } from '@felops/config'

const BATCH_SIZE = 64

function shouldMock(): boolean {
  const key = process.env.OPENAI_API_KEY
  return (
    !key ||
    key.startsWith('sk-test') ||
    process.env.MOCK_AI === '1' ||
    process.env.MOCK_AI === 'true'
  )
}

function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return Math.abs(result)
}

/**
 * Deterministic, dependency-free embedding used when no real provider key is
 * configured. It hashes words and character trigrams, so shared Arabic roots and
 * words produce a usable cosine similarity in local development and tests.
 */
export function mockEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0)
  const normalized = text.toLowerCase()
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

  for (const word of words) {
    vector[hash(`w:${word}`) % EMBEDDING_DIMENSIONS] += 1.2
    const padded = `^${word}$`
    for (let index = 0; index < padded.length - 2; index += 1) {
      const gram = padded.slice(index, index + 3)
      vector[hash(`g:${gram}`) % EMBEDDING_DIMENSIONS] += 0.35
    }
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0))
  if (magnitude === 0) {
    vector[0] = 1
    return vector
  }
  return vector.map((value) => value / magnitude)
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY ?? ''
  const provider = createOpenAI({ apiKey })
  const model = provider.embedding(process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small')
  try {
    const { embeddings } = await embedMany({ model, values: texts })
    return embeddings
  } catch (error) {
    const { embeddings } = await embedMany({ model, values: texts })
    void error
    return embeddings
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const vectors: number[][] = []
  if (shouldMock()) {
    for (const text of texts) vectors.push(mockEmbedding(text))
  } else {
    for (let index = 0; index < texts.length; index += BATCH_SIZE) {
      const batch = texts.slice(index, index + BATCH_SIZE)
      const embedded = await embedBatch(batch)
      vectors.push(...embedded)
    }
  }

  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding vector must have ${EMBEDDING_DIMENSIONS} dimensions`)
    }
  }
  return vectors
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text])
  return vector
}
