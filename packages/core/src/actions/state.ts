import type { ActionRunStatus } from '@felops/db/schema'
import { InvalidTransitionError } from '../agents/types'

const TRANSITIONS: Record<ActionRunStatus, ActionRunStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['running'],
  rejected: [],
  running: ['succeeded', 'failed'],
  failed: ['running'],
  succeeded: [],
}

export function canTransition(from: ActionRunStatus, to: ActionRunStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: ActionRunStatus, to: ActionRunStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to)
}
