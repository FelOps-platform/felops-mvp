import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { loadEnv } from '@felops/config'

export type EncryptedPayload = { iv: string; tag: string; ciphertext: string }

function key(): Buffer {
  return Buffer.from(loadEnv().ENCRYPTION_KEY, 'base64')
}

export function encryptJson(value: unknown): EncryptedPayload {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(payload.iv, 'base64'),
  )
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])
  return JSON.parse(plaintext.toString('utf8')) as T
}
