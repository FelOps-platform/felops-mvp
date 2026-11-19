import { cleanText } from './html'
import type { ParsedDocument } from './types'

export function parseTxt(buffer: Buffer, title?: string): ParsedDocument {
  if (buffer.includes(0)) {
    throw new Error('File does not look like UTF-8 text')
  }
  return {
    title: title ?? 'Text document',
    text: cleanText(buffer.toString('utf8')),
    metadata: {},
  }
}

export function parseText(text: string, title = 'Text snippet'): ParsedDocument {
  return { title, text: cleanText(text), metadata: {} }
}
