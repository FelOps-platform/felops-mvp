import mammoth from 'mammoth'
import { cleanText } from './html'
import type { ParsedDocument } from './types'

export async function parseDocx(buffer: Buffer, title?: string): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer })
  return {
    title: title ?? 'Word document',
    text: cleanText(result.value),
    metadata: {},
  }
}
