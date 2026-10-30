import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { crawlSite } from '../src/parse/crawl'

let server: Server
let origin = ''
let offOriginFetches = 0

beforeAll(async () => {
  server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    if (url.pathname === '/robots.txt') {
      response.writeHead(404).end('not found')
      return
    }
    if (url.pathname === '/') {
      const links = Array.from({ length: 40 }, (_, index) => `<a href="/page/${index}">p${index}</a>`)
      response
        .writeHead(200, { 'content-type': 'text/html' })
        .end(`<html><body><nav>Menu</nav><article><h1>Home</h1><p>Welcome.</p>${links.join('')}
          <a href="https://evil.example/steal">offsite</a></article></body></html>`)
      return
    }
    if (url.pathname.startsWith('/page/')) {
      response
        .writeHead(200, { 'content-type': 'text/html' })
        .end(`<html><body><article><h1>${url.pathname}</h1><p>Content ${url.pathname}</p></article></body></html>`)
      return
    }
    if (url.pathname === '/steal') {
      offOriginFetches += 1
      response.writeHead(200).end('leak')
      return
    }
    response.writeHead(404).end('nope')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('no address')
  origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

it('stays on the seed origin, never fetches off-origin links, and stops at 25 pages', async () => {
  const result = await crawlSite(`${origin}/`, { allowPrivateHosts: true, maxPages: 25 })
  expect(result.pages.length).toBeLessThanOrEqual(25)
  expect(result.stopped).toBe('limit')
  expect(offOriginFetches).toBe(0)
  expect(result.pages.some((page) => page.url.includes('/page/0'))).toBe(true)
  expect(result.pages.every((page) => page.url.startsWith(origin))).toBe(true)
})

it('stops the crawl when a page returns 403', async () => {
  const blocking = createServer((request, response) => {
    if (request.url === '/') {
      response.writeHead(403).end('forbidden')
      return
    }
    response.writeHead(404).end()
  })
  await new Promise<void>((resolve) => blocking.listen(0, '127.0.0.1', resolve))
  const address = blocking.address()
  if (!address || typeof address === 'string') throw new Error('no address')
  const result = await crawlSite(`http://127.0.0.1:${address.port}/`, {
    allowPrivateHosts: true,
  })
  expect(result.stopped).toBe('blocked')
  expect(result.pages).toHaveLength(0)
  await new Promise<void>((resolve) => blocking.close(() => resolve()))
})
