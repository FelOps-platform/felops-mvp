import { eq } from 'drizzle-orm'
import { db, knowledgeSource } from '@felops/db'
import { replaceSourceChunks } from '@felops/db/repositories/chunks'
import {
  chunkDocument,
  crawlSite,
  embedTexts,
  parseDocx,
  parsePdf,
  parseText,
  parseTxt,
  type ParsedDocument,
} from '@felops/ai'
import {
  getSource,
  setSourceStatus,
} from '@felops/core/knowledge'
import { getObject } from '@felops/core/storage/s3'
import { loadEnv } from '@felops/config'
import { logger } from './logger'

async function documentFor(source: typeof knowledgeSource.$inferSelect): Promise<ParsedDocument> {
  if (source.type === 'url') {
    if (!source.url) throw new Error('URL source has no URL')
    const result = await crawlSite(source.url, { maxPages: 25 })
    if (result.pages.length === 0) throw new Error('The page returned no readable content')
    const text = result.pages
      .map((page) => `# ${page.title}\n\n${page.text}`)
      .join('\n\n')
    return {
      title: source.title || result.pages[0].title,
      text,
      metadata: { pages: result.pages.length, stopped: result.stopped ?? null },
    }
  }

  if (source.type === 'text') {
    if (!source.rawText) throw new Error('Text source has no content')
    return parseText(source.rawText, source.title)
  }

  if (!source.storageKey) throw new Error('File source has no storage key')
  const buffer = Buffer.from(await getObject(source.storageKey))
  if (source.type === 'pdf') return parsePdf(buffer, source.title)
  if (source.type === 'docx') return parseDocx(buffer, source.title)
  return parseTxt(buffer, source.title)
}

export async function processSourceJob(input: {
  sourceId: string
  workspaceId?: string
}): Promise<void> {
  const startedAt = Date.now()
  const source = await getSource({
    workspaceId: input.workspaceId ?? (await locateWorkspace(input.sourceId)),
    sourceId: input.sourceId,
  })
  if (!source) throw new Error('Source not found')

  await setSourceStatus({
    workspaceId: source.workspaceId,
    sourceId: source.id,
    status: 'processing',
  })

  try {
    const document = await documentFor(source)
    const chunks = chunkDocument(document)
    if (chunks.length === 0) throw new Error('No readable text was found in this source')

    const vectors = await embedTexts(chunks.map((chunk) => chunk.content))
    if (vectors.length !== chunks.length) throw new Error('Embedding count did not match chunks')

    const count = await replaceSourceChunks({
      workspaceId: source.workspaceId,
      agentId: source.agentId,
      sourceId: source.id,
      chunks: chunks.map((chunk, index) => ({
        content: chunk.content,
        embedding: vectors[index],
        tokenCount: chunk.tokenCount,
        heading: chunk.heading ?? null,
      })),
    })

    await setSourceStatus({
      workspaceId: source.workspaceId,
      sourceId: source.id,
      status: 'ready',
      chunkCount: count,
      error: null,
    })

    logger.info('source.ingested', {
      workspaceId: source.workspaceId,
      agentId: source.agentId,
      sourceId: source.id,
      chunks: count,
      durationMs: Date.now() - startedAt,
      route: 'worker.process-source',
      status: 200,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingestion failed'
    await setSourceStatus({
      workspaceId: source.workspaceId,
      sourceId: source.id,
      status: 'failed',
      error: message,
    })
    logger.error('source.failed', {
      workspaceId: source.workspaceId,
      agentId: source.agentId,
      sourceId: source.id,
      error: message.slice(0, 500),
      route: 'worker.process-source',
      status: 500,
      durationMs: Date.now() - startedAt,
    })
    throw error
  }
}

async function locateWorkspace(sourceId: string): Promise<string> {
  const [row] = await db
    .select({ workspaceId: knowledgeSource.workspaceId })
    .from(knowledgeSource)
    .where(eq(knowledgeSource.id, sourceId))
    .limit(1)
  if (!row) throw new Error('Source not found')
  return row.workspaceId
}

export function ingestionConcurrency(): number {
  return Number(process.env.INGESTION_CONCURRENCY ?? loadEnv().MOCK_AI ? 2 : 2)
}
