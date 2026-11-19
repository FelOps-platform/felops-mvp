import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
    env: {
      NODE_ENV: 'test',
      MOCK_AI: '1',
      OPENAI_API_KEY: 'sk-test',
    },
  },
})
