import { getEncoding } from 'js-tiktoken'

const encoding = getEncoding('cl100k_base')

export function countTokens(text: string): number {
  if (!text) return 0
  return encoding.encode(text).length
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encoding.encode(text)
  if (tokens.length <= maxTokens) return text
  return encoding.decode(tokens.slice(0, maxTokens))
}
