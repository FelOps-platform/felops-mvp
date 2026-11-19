import { Readability } from '@mozilla/readability'
import { load } from 'cheerio'
import { JSDOM } from 'jsdom'
import type { ParsedDocument } from './types'

const STRIP_SELECTORS = [
  'script',
  'style',
  'nav',
  'footer',
  'header',
  'noscript',
  'iframe',
  'form',
  'svg',
  'aside',
]

export function cleanText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseHtml(html: string, url?: string): ParsedDocument {
  const $ = load(html)
  for (const selector of STRIP_SELECTORS) $(selector).remove()
  const cleaned = $.html()

  let title = $('title').first().text().trim() || $('h1').first().text().trim() || 'Untitled'
  let text = ''

  try {
    const dom = new JSDOM(cleaned, { url: url ?? 'https://felops.local/' })
    const article = new Readability(dom.window.document).parse()
    if (article?.textContent?.trim()) {
      text = article.textContent
      if (article.title?.trim()) title = article.title.trim()
    }
    dom.window.close()
  } catch {
    // Fall through to the cheerio body text.
  }

  if (!text.trim()) {
    text = $('body').text()
  }

  return {
    title,
    text: cleanText(text),
    metadata: url ? { url } : {},
  }
}
