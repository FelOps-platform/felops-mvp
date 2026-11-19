import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { NextConfig } from 'next'

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const tracingRoot = path.join(fileURLToPath(new URL('.', import.meta.url)), '../..')

const nextConfig: NextConfig = {
  outputFileTracingRoot: tracingRoot,
  transpilePackages: ['@felops/ai', '@felops/config', '@felops/core', '@felops/db'],
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
