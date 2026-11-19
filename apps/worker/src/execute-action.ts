import { executeActionRun } from '@felops/core/actions'
import { logger } from './logger'

export async function executeActionJob(input: { runId: string }): Promise<void> {
  const startedAt = Date.now()
  const run = await executeActionRun(input.runId)
  logger.info('action.executed', {
    workspaceId: run?.workspaceId,
    agentId: run?.agentId,
    runId: input.runId,
    status: run?.status === 'succeeded' ? 200 : 500,
    route: 'worker.execute-action',
    durationMs: Date.now() - startedAt,
    attempts: run?.attempts,
  })
  if (run?.status === 'failed' && (run.attempts ?? 0) < 3) {
    throw new Error(run.error ?? 'Action failed')
  }
}
