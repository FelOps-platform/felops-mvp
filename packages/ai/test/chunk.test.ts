import { expect, it } from 'vitest'
import { chunkDocument } from '../src/chunk'

it('splits on headings and keeps a token overlap between chunks', () => {
  const shipping = Array.from({ length: 700 }, (_, i) => `ship${i}`).join(' ')
  const returns = Array.from({ length: 700 }, (_, i) => `return${i}`).join(' ')
  const chunks = chunkDocument({
    title: 'Policy',
    text: `# Shipping\n${shipping}\n# Returns\n${returns}`,
    metadata: {},
  })
  expect(chunks.length).toBeGreaterThan(2)
  expect(chunks[0].heading).toBe('Shipping')
  expect(chunks.every((chunk) => chunk.tokenCount <= 900)).toBe(true)
  const overlap = chunks[1].content.split(' ').slice(0, 10).join(' ')
  expect(chunks[0].content).toContain(overlap)
})

it('carries the nearest heading into every chunk of a section', () => {
  const body = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ')
  const chunks = chunkDocument({ title: 'FAQ', text: `## Returns\n${body}`, metadata: {} })
  expect(chunks.every((chunk) => chunk.heading === 'Returns')).toBe(true)
})
