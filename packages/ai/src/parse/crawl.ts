import robotsParser from 'robots-parser'
import { load } from 'cheerio'
import { parseHtml } from './html'
import { assertSafePublicUrlResolved } from '../url-safety'

export const MAX_CRAWL_PAGES = 25
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 10_000
const USER_AGENT = 'FelopsBot/1.0 (+https://felops.io/bot)'

export type CrawledPage = {
  url: string
  title: string
  text: string
}

export type CrawlResult = {
  pages: CrawledPage[]
  stopped?: 'limit' | 'blocked' | 'error'
}

export type CrawlOptions = {
  maxPages?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
  allowPrivateHosts?: boolean
}

function normalizeUrl(url: URL): string {
  const copy = new URL(url.toString())
  copy.hash = ''
  if (copy.pathname !== '/') copy.pathname = copy.pathname.replace(/\/$/, '')
  return copy.toString()
}

async function safeFetch(
  url: string,
  options: { timeoutMs: number; fetchImpl: typeof fetch; allowPrivateHosts: boolean; origin: string },
): Promise<{ response: Response; finalUrl: string }> {
  let current = url
  for (let redirect = 0; redirect < 5; redirect += 1) {
    if (!options.allowPrivateHosts) await assertSafePublicUrlResolved(current)
    const parsed = new URL(current)
    if (parsed.origin !== options.origin) throw new Error('Redirect left the source origin')
    const response = await options.fetchImpl(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: { 'user-agent': USER_AGENT },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return { response, finalUrl: current }
      current = new URL(location, current).toString()
      continue
    }
    return { response, finalUrl: current }
  }
  throw new Error('Too many redirects')
}

export async function crawlSite(seed: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const maxPages = options.maxPages ?? MAX_CRAWL_PAGES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const allowPrivateHosts = options.allowPrivateHosts ?? false

  const seedUrl = new URL(seed)
  const origin = seedUrl.origin
  const robotsUrl = new URL('/robots.txt', origin).toString()

  let robots: ReturnType<typeof robotsParser> | undefined
  try {
    const response = await fetchImpl(robotsUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'user-agent': USER_AGENT },
    })
    if (response.ok) {
      robots = robotsParser(robotsUrl, await response.text())
    }
  } catch {
    robots = undefined
  }

  const queue: string[] = [normalizeUrl(seedUrl)]
  const visited = new Set<string>()
  const pages: CrawledPage[] = []

  while (queue.length > 0) {
    if (pages.length >= maxPages) return { pages, stopped: 'limit' }
    const url = queue.shift()
    if (!url || visited.has(url)) continue
    visited.add(url)

    const parsedUrl = new URL(url)
    if (parsedUrl.origin !== origin) continue
    if (robots && robots.isAllowed(url, USER_AGENT) === false) continue

    try {
      const { response, finalUrl } = await safeFetch(url, {
        timeoutMs,
        fetchImpl,
        allowPrivateHosts,
        origin,
      })

      if (response.status === 429 || response.status === 403) {
        return { pages, stopped: 'blocked' }
      }
      if (!response.ok) continue

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) continue

      const lengthHeader = Number(response.headers.get('content-length') ?? '0')
      if (lengthHeader > MAX_RESPONSE_BYTES) continue

      const body = await response.text()
      if (Buffer.byteLength(body, 'utf8') > MAX_RESPONSE_BYTES) continue

      if (contentType.includes('text/html')) {
        const document = parseHtml(body, finalUrl)
        pages.push({ url: finalUrl, title: document.title, text: document.text })
        const $ = load(body)
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href')
          if (!href) return
          try {
            const next = new URL(href, finalUrl)
            if (next.origin !== origin) return
            if (next.protocol !== 'http:' && next.protocol !== 'https:') return
            const normalized = normalizeUrl(next)
            if (!visited.has(normalized) && !queue.includes(normalized)) queue.push(normalized)
          } catch {
            // Ignore malformed links.
          }
        })
      } else {
        pages.push({ url: finalUrl, title: parsedUrl.pathname, text: body })
      }
    } catch {
      continue
    }
  }

  return { pages }
}
