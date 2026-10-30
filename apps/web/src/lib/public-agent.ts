import { loadEnv } from '@felops/config'
import { findAgentByPublicKey } from '@felops/db/repositories/agents'
import type { Agent } from '@felops/db/schema'

export class OriginNotAllowedError extends Error {
  readonly status = 403
  constructor() {
    super('Origin is not allowed for this agent')
    this.name = 'OriginNotAllowedError'
  }
}

export class AgentNotPublicError extends Error {
  readonly status = 404
  constructor() {
    super('Agent not found')
    this.name = 'AgentNotPublicError'
  }
}

export type PublicAgentConfig = {
  name: string
  greeting: string
  language: string
  theme: Record<string, string>
}

export function isOriginAllowed(agent: Agent, origin: string | null): boolean {
  if (!origin) return false
  if (origin === loadEnv().APP_URL) return true
  return agent.allowedOrigins.includes(origin)
}

export async function getPublicAgent(publicKey: string): Promise<Agent> {
  const agent = await findAgentByPublicKey(publicKey)
  if (!agent || agent.status !== 'active') throw new AgentNotPublicError()
  return agent
}

export async function getPublicAgentConfig(input: {
  publicKey: string
  origin: string | null
}): Promise<PublicAgentConfig> {
  const agent = await getPublicAgent(input.publicKey)
  if (!isOriginAllowed(agent, input.origin)) throw new OriginNotAllowedError()
  return {
    name: agent.name,
    greeting: agent.greeting,
    language: agent.language,
    theme: agent.theme,
  }
}
