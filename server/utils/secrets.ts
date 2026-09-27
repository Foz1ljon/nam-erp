import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Telegram sessions and access tokens give full access to a person's account, so they are stored
// encrypted (AES-256-GCM) with a key derived from the server's session password.
function key(): Buffer {
  const password = (useRuntimeConfig().session as { password?: string } | undefined)?.password || process.env.NUXT_SESSION_PASSWORD
  if (!password) throw new Error('NUXT_SESSION_PASSWORD sozlanmagan')
  return createHash('sha256').update(`nammotors-secrets:${password}`).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':')
}

export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  const [version, iv, tag, data] = value.split(':')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error("Shifrlangan ma'lumot formati noto'g'ri")
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')
}

/** For showing a stored secret in the UI without revealing it: "••••a1B2". */
export function maskSecret(plain: string): string {
  return plain ? `••••${plain.slice(-4)}` : ''
}
