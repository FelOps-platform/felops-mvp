import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadEnv } from '@felops/config'

let client: S3Client | undefined

function s3(): S3Client {
  if (!client) {
    const env = loadEnv()
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}

export async function putObject(input: {
  key: string
  body: Uint8Array
  contentType: string
}): Promise<void> {
  const env = loadEnv()
  await s3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  )
}

export async function getObject(key: string): Promise<Uint8Array> {
  const env = loadEnv()
  const response = await s3().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }))
  if (!response.Body) throw new Error('Object not found')
  return response.Body.transformToByteArray()
}

export async function signedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  const env = loadEnv()
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
    expiresIn,
  })
}

export function sourceStorageKey(workspaceId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  return `workspaces/${workspaceId}/sources/${randomUUID()}-${safe}`
}
