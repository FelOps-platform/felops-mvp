import { countTokens } from './tokens'

export type Chunk = {
  index: number
  content: string
  tokenCount: number
  heading?: string
}

export type ChunkableDocument = {
  title: string
  text: string
  metadata?: Record<string, unknown>
}

const TARGET_TOKENS = 600
const MAX_TOKENS = 800
const OVERLAP_TOKENS = 100

type Word = { value: string; tokens: number }

function splitWords(text: string): Word[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => ({ value, tokens: Math.max(1, countTokens(value)) }))
}

function sectionize(text: string): { heading?: string; body: string }[] {
  const lines = text.split(/\r?\n/)
  const sections: { heading?: string; body: string[] }[] = []
  let current: { heading?: string; body: string[] } = { body: [] }

  for (const line of lines) {
    const match = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line)
    if (match) {
      if (current.body.join('\n').trim()) sections.push(current)
      current = { heading: match[1].trim(), body: [] }
    } else {
      current.body.push(line)
    }
  }
  if (current.body.join('\n').trim()) sections.push(current)
  return sections.map((section) => ({ heading: section.heading, body: section.body.join('\n') }))
}

function buildChunksForSection(
  heading: string | undefined,
  body: string,
  startIndex: number,
): Chunk[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return []

  const words: Word[] = paragraphs.flatMap((paragraph, paragraphIndex) => {
    const paragraphWords = splitWords(paragraph)
    if (paragraphIndex < paragraphs.length - 1) {
      paragraphWords.push({ value: '\n\n', tokens: 1 })
    }
    return paragraphWords
  })

  const chunks: Chunk[] = []
  let cursor = 0
  let index = startIndex
  let guard = 0
  while (cursor < words.length && guard < 10_000) {
    guard += 1
    let end = cursor
    let tokens = 0
    while (end < words.length) {
      const next = words[end]
      if (tokens + next.tokens > TARGET_TOKENS && end > cursor) break
      tokens += next.tokens
      end += 1
      if (tokens >= TARGET_TOKENS) break
    }
    if (end === cursor) end = Math.min(words.length, cursor + 1)

    const content = words
      .slice(cursor, end)
      .map((word) => word.value)
      .join(' ')
      .replace(/\s*\n\s*\n\s*/g, '\n\n')
      .trim()

    if (content) {
      const tokenCount = Math.min(MAX_TOKENS, countTokens(content))
      chunks.push({ index, content, tokenCount, heading })
      index += 1
    }

    if (end >= words.length) break
    let nextCursor = end
    let overlap = 0
    while (nextCursor > cursor && overlap < OVERLAP_TOKENS) {
      nextCursor -= 1
      overlap += words[nextCursor].tokens
    }
    cursor = Math.max(cursor + 1, nextCursor)
  }

  return chunks
}

export function chunkDocument(document: ChunkableDocument): Chunk[] {
  const sections = sectionize(document.text)
  const chunks: Chunk[] = []
  for (const section of sections) {
    chunks.push(...buildChunksForSection(section.heading, section.body, chunks.length))
  }
  if (chunks.length === 0 && document.text.trim()) {
    chunks.push({
      index: 0,
      content: document.text.trim(),
      tokenCount: countTokens(document.text),
      heading: document.title,
    })
  }
  return chunks.map((chunk, index) => ({ ...chunk, index }))
}
