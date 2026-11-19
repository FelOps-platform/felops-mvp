import { z } from 'zod'

export const EMBEDDING_DIMENSIONS = 1536

const base64Key = z
  .string()
  .refine((value) => Buffer.from(value, 'base64').length === 32, {
    message: 'ENCRYPTION_KEY must be a base64-encoded 32-byte key',
  })

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  CHAT_MODEL: z.string().default('gpt-4.1-mini'),
  CHAT_MODEL_FALLBACK: z.string().default('gpt-4.1'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .refine((value) => value === EMBEDDING_DIMENSIONS, {
      message: `EMBEDDING_DIMENSIONS must equal ${EMBEDDING_DIMENSIONS}`,
    })
    .default(EMBEDDING_DIMENSIONS),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  ENCRYPTION_KEY: base64Key,
  APP_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('Felops <no-reply@felops.local>'),
  RETRIEVAL_SCORE_FLOOR: z.coerce.number().default(0.015),
  MOCK_AI: z
    .string()
    .optional()
    .transform((value) => value === '1' || value === 'true'),
})

export type Env = z.infer<typeof envSchema>

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment: ${issues.join(', ')}`)
    this.name = 'EnvValidationError'
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    )
  }
  return result.data
}

export const TEST_ENV: Record<string, string> = {
  DATABASE_URL: 'postgres://felops:felops@localhost:5433/felops_test',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'test-secret-test-secret-test-secret-1234',
  BETTER_AUTH_URL: 'http://localhost:3000',
  OPENAI_API_KEY: 'sk-test',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'felops',
  S3_ACCESS_KEY_ID: 'minio',
  S3_SECRET_ACCESS_KEY: 'minio123',
  ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  APP_URL: 'http://localhost:3000',
  MOCK_AI: '1',
}

let cached: Env | undefined

export function loadEnv(): Env {
  if (cached) return cached
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  const source = isTest ? { ...TEST_ENV, ...process.env } : process.env
  cached = parseEnv(source)
  return cached
}
