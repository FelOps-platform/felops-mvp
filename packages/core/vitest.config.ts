import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://felops:felops@localhost:5433/felops_test',
      REDIS_URL: 'redis://localhost:6379',
      MOCK_AI: '1',
      OPENAI_API_KEY: 'sk-test',
    },
  },
})
