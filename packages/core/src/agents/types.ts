import { AppError } from '../errors'

export type AgentInstructions = {
  role: string
  language: string
  constraints: string
  responseFormat: string
}

export type AgentPatch = Partial<{
  name: string
  greeting: string
  instructions: AgentInstructions
  language: string
  allowedOrigins: string[]
}>

export class NoReadyKnowledgeError extends AppError {
  constructor() {
    super(
      'Add at least one ready knowledge source with content before activating the agent',
      'no_ready_knowledge',
      409,
    )
  }
}

export class AgentNotFoundError extends AppError {
  constructor() {
    super('Agent not found', 'agent_not_found', 404)
  }
}

export class ActionNotFoundError extends AppError {
  constructor() {
    super('Action not found', 'action_not_found', 404)
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition action run from ${from} to ${to}`, 'invalid_transition', 409)
  }
}
