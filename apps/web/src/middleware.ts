import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/chat/', '/widget.js', '/invite/', '/api/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('session_token'))

  const isProtected =
    pathname === '/dashboard' ||
    pathname.startsWith('/w/') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/verify'

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()
  const isEmbeddable =
    pathname.startsWith('/chat/') || pathname === '/widget.js' || pathname.startsWith('/api/')

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'X-Frame-Options',
    isEmbeddable || PUBLIC_PATHS.some((prefix) => pathname.startsWith(prefix))
      ? 'SAMEORIGIN'
      : 'DENY',
  )
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
