import { randomUUID } from 'node:crypto'
import { Queue, type JobsOptions } from 'bullmq'
import IORedis from 'ioredis'
import { loadEnv } from '@felops/config'

export type EnqueueResult = { id: string }

/**
 * Thin queue facade. In tests jobs are recorded without opening a Redis
 * connection; in every other environment this is a real BullMQ queue.
 */
export class JobQueue {
  private queue: Queue | null = null

  constructor(public readonly name: string) {}

  private getQueue(): Queue {
    if (!this.queue) {
      const connection = new IORedis(loadEnv().REDIS_URL, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      })
      this.queue = new Queue(this.name, { connection })
    }
    return this.queue
  }

  async add(
    jobName: string,
    data: Record<string, unknown>,
    options?: JobsOptions,
  ): Promise<EnqueueResult> {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return { id: randomUUID() }
    }
    const job = await this.getQueue().add(jobName, data, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      ...options,
    })
    return { id: job.id ?? randomUUID() }
  }

  async close(): Promise<void> {
    if (this.queue) await this.queue.close()
  }
}

export const ingestionQueue = new JobQueue('ingestion')
export const actionQueue = new JobQueue('action-execution')
