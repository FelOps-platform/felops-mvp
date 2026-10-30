import { extractText, getDocumentProxy } from 'unpdf'
import { cleanText } from './html'
import type { ParsedDocument } from './types'

export async function parsePdf(buffer: Uint8Array, title?: string): Promise<ParsedDocument> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text, totalPages } = await extractText(pdf, { mergePages: true })
  return {
    title: title ?? 'PDF document',
    text: cleanText(text),
    metadata: { pages: totalPages },
  }
}
