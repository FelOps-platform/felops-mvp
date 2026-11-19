import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { countTokens } from './tokens'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export type StreamInput = {
  system: string
  messages: ChatTurn[]
  fallbackText: string
}

type StreamFn = (input: StreamInput) => AsyncGenerator<string>

let override: StreamFn | null = null

/** Test seam: replace the model-backed stream with a deterministic generator. */
export function setAnswerStreamForTesting(fn: StreamFn | null): void {
  override = fn
}

export function isMockAi(): boolean {
  const key = process.env.OPENAI_API_KEY
  return (
    !key ||
    key.startsWith('sk-test') ||
    process.env.MOCK_AI === '1' ||
    process.env.MOCK_AI === 'true'
  )
}

function chunkText(text: string, size = 18): string[] {
  const chunks: string[] = []
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size))
  }
  return chunks.length > 0 ? chunks : ['']
}

async function* mockStream(input: StreamInput): AsyncGenerator<string> {
  for (const chunk of chunkText(input.fallbackText)) {
    yield chunk
  }
}

async function* providerStream(
  input: StreamInput,
  modelId: string,
): AsyncGenerator<string> {
  const provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })
  const result = streamText({
    model: provider.chat(modelId),
    system: input.system,
    messages: input.messages.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    temperature: 0.2,
  })
  for await (const delta of result.textStream) yield delta
}

export async function* streamAssistant(input: StreamInput): AsyncGenerator<string> {
  if (override) {
    yield* override(input)
    return
  }
  if (isMockAi()) {
    yield* mockStream(input)
    return
  }

  const primary = process.env.CHAT_MODEL ?? 'gpt-4.1-mini'
  const fallback = process.env.CHAT_MODEL_FALLBACK
  let produced = false
  try {
    for await (const delta of providerStream(input, primary)) {
      produced = true
      yield delta
    }
  } catch (error) {
    if (produced || !fallback || fallback === primary) throw error
    yield* providerStream(input, fallback)
  }
}

export function estimateTokens(text: string): number {
  return countTokens(text)
}

export type { ChatTurn as GenerateChatTurn }
