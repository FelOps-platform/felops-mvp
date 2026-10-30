export type PlanId = 'free' | 'starter' | 'growth'

export type PlanLimits = {
  priceEgp: number
  agents: number
  messages: number
  sources: number
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: { priceEgp: 0, agents: 1, messages: 100, sources: 5 },
  starter: { priceEgp: 750, agents: 3, messages: 2000, sources: 25 },
  growth: { priceEgp: 2500, agents: 10, messages: 10000, sources: 100 },
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_CRAWL_PAGES = 25
export const CRAWL_TIMEOUT_MS = 10_000
export const CRAWL_MAX_RESPONSE_BYTES = 5 * 1024 * 1024
export const MAX_MESSAGE_LENGTH = 2000
export const MAX_ACTION_RESPONSE_BYTES = 100 * 1024
export const ACTION_TIMEOUT_MS = 10_000
export const MAX_ACTION_ATTEMPTS = 3
export const PUBLIC_CHAT_RATE_LIMIT = 30
export const PUBLIC_CHAT_RATE_WINDOW_SECONDS = 60
export const AUTH_RATE_LIMIT = 10
export const AUTH_RATE_WINDOW_SECONDS = 60

export const UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const
