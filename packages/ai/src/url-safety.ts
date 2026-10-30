import dns from 'node:dns/promises'
import net from 'node:net'
import ipaddr from 'ipaddr.js'

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeUrlError'
  }
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
])

function assertPublicAddress(address: string): void {
  const parsed = ipaddr.parse(address)
  const range = parsed.range()
  if (range !== 'unicast') {
    throw new UnsafeUrlError(`URL resolves to a non-public address (${range})`)
  }
}

function assertHostname(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '')
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new UnsafeUrlError('URL host is not public')
  }
  if (net.isIP(host)) assertPublicAddress(host)
}

/**
 * Synchronous structural check. DNS is validated separately by
 * `assertSafePublicUrlResolved` before any outbound request is made.
 */
export function assertSafePublicUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https URLs are allowed')
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed')
  }
  assertHostname(url.hostname)
  return url
}

export async function assertSafePublicUrlResolved(raw: string): Promise<URL> {
  const url = assertSafePublicUrl(raw)
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) return url
  let addresses: { address: string }[]
  try {
    addresses = await dns.lookup(host, { all: true, verbatim: true })
  } catch {
    throw new UnsafeUrlError('URL host could not be resolved')
  }
  if (addresses.length === 0) throw new UnsafeUrlError('URL host could not be resolved')
  for (const entry of addresses) assertPublicAddress(entry.address)
  return url
}

export function isSafePublicUrl(raw: string): boolean {
  try {
    assertSafePublicUrl(raw)
    return true
  } catch {
    return false
  }
}
