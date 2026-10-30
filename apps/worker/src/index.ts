import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { loadEnv } from '@felops/config'
import { processSourceJob } from './process-source'
import { executeActionJob } from './execute-action'
import { logger } from './logger'

const env = loadEnv()

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

const ingestion = new Worker(
  'ingestion',
  async (job) => {
    logger.info('job.started', { queue: 'ingestion', jobId: job.id, name: job.name })
    const data = job.data as { sourceId: string; workspaceId?: string }
    await processSourceJob(data)
  },
  { connection, concurrency: 2 },
)

const actions = new Worker(
  'action-execution',
  async (job) => {
    logger.info('job.started', { queue: 'action-execution', jobId: job.id, name: job.name })
    const data = job.data as { runId: string }
    await executeActionJob(data)
  },
  { connection, concurrency: 2 },
)

for (const worker of [ingestion, actions]) {
  worker.on('failed', (job, error) => {
    logger.error('job.failed', {
      queue: worker.name,
      jobId: job?.id,
      attempts: job?.attemptsMade,
      error: error.message.slice(0, 500),
    })
  })
  worker.on('completed', (job) => {
    logger.info('job.completed', { queue: worker.name, jobId: job.id })
  })
}

logger.info('worker.started', { queues: ['ingestion', 'action-execution'] })

async function shutdown(signal: string) {
  logger.info('worker.shutdown', { signal })
  await Promise.all([ingestion.close(), actions.close()])
  await connection.quit()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
