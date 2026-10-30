import { parseDocx } from './docx'
import { parseHtml } from './html'
import { parsePdf } from './pdf'
import { parseText, parseTxt } from './txt'
import type { ParsedDocument, SourceKind } from './types'

export async function parseSource(input: {
  kind: SourceKind
  content: string | Buffer | Uint8Array
  title?: string
  url?: string
}): Promise<ParsedDocument> {
  const { kind, content, title, url } = input
  switch (kind) {
    case 'url':
    case 'html':
      return parseHtml(String(content), url)
    case 'pdf':
      return parsePdf(content instanceof Buffer ? content : Buffer.from(content), title)
    case 'docx':
      return parseDocx(content instanceof Buffer ? content : Buffer.from(content), title)
    case 'txt':
      return parseTxt(content instanceof Buffer ? content : Buffer.from(content), title)
    case 'text':
      return parseText(String(content), title)
    default:
      throw new Error(`Unsupported source kind: ${kind satisfies never}`)
  }
}

export { parseHtml } from './html'
export { parsePdf } from './pdf'
export { parseDocx } from './docx'
export { parseTxt, parseText } from './txt'
export { crawlSite } from './crawl'
export type { ParsedDocument, SourceKind } from './types'
export type { CrawledPage, CrawlResult, CrawlOptions } from './crawl'
