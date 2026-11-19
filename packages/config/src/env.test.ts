import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({ REDIS_URL: 'redis://localhost:6379' })).toThrow(/DATABASE_URL/)
  })

  it('applies defaults for model configuration', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://localhost/felops',
      REDIS_URL: 'redis://localhost:6379',
      BETTER_AUTH_SECRET: 'x'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      OPENAI_API_KEY: 'sk-test',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'felops',
      S3_ACCESS_KEY_ID: 'minio',
      S3_SECRET_ACCESS_KEY: 'minio123',
      ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      APP_URL: 'http://localhost:3000',
    })
    expect(env.EMBEDDING_DIMENSIONS).toBe(1536)
    expect(env.CHAT_MODEL).toBe('gpt-4.1-mini')
  })

  it('rejects a wrong embedding dimension', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://localhost/felops',
        REDIS_URL: 'redis://localhost:6379',
        BETTER_AUTH_SECRET: 'x'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost:3000',
        OPENAI_API_KEY: 'sk-test',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_REGION: 'us-east-1',
        S3_BUCKET: 'felops',
        S3_ACCESS_KEY_ID: 'minio',
        S3_SECRET_ACCESS_KEY: 'minio123',
        ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        APP_URL: 'http://localhost:3000',
        EMBEDDING_DIMENSIONS: '768',
      }),
    ).toThrow(/EMBEDDING_DIMENSIONS/)
  })
})
