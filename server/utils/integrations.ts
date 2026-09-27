import { randomBytes } from 'node:crypto'

interface StoredIntegrations {
  telegramApiId?: number
  telegramApiHash?: string // encrypted
  instagramAppId?: string
  instagramAppSecret?: string // encrypted
  instagramVerifyToken?: string
}

export interface Integrations {
  telegramApiId: number | null
  telegramApiHash: string
  instagramAppId: string
  instagramAppSecret: string
  instagramVerifyToken: string
}

async function stored(): Promise<StoredIntegrations> {
  const doc = await SettingModel.findById('integrations').lean()
  return (doc?.value as StoredIntegrations | undefined) ?? {}
}

/** Decrypted integration credentials. Server-side only — never return this object to the client. */
export async function getIntegrations(): Promise<Integrations> {
  const v = await stored()
  let verifyToken = v.instagramVerifyToken
  if (!verifyToken) {
    verifyToken = randomBytes(16).toString('hex')
    await SettingModel.updateOne({ _id: 'integrations' }, { $set: { 'value.instagramVerifyToken': verifyToken } }, { upsert: true })
  }
  return {
    telegramApiId: v.telegramApiId ?? null,
    telegramApiHash: decryptSecret(v.telegramApiHash),
    instagramAppId: v.instagramAppId ?? '',
    instagramAppSecret: decryptSecret(v.instagramAppSecret),
    instagramVerifyToken: verifyToken,
  }
}

export async function updateIntegrations(input: { telegramApiId?: number | null; telegramApiHash?: string; instagramAppId?: string; instagramAppSecret?: string }) {
  const set: Record<string, unknown> = {}
  if (input.telegramApiId !== undefined) set['value.telegramApiId'] = input.telegramApiId
  if (input.telegramApiHash) set['value.telegramApiHash'] = encryptSecret(input.telegramApiHash)
  if (input.instagramAppId !== undefined) set['value.instagramAppId'] = input.instagramAppId
  if (input.instagramAppSecret) set['value.instagramAppSecret'] = encryptSecret(input.instagramAppSecret)
  if (Object.keys(set).length) await SettingModel.updateOne({ _id: 'integrations' }, { $set: set }, { upsert: true })
}
