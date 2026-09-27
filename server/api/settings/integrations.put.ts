import type { Types } from 'mongoose'
import { z } from 'zod'

const schema = z.object({
  telegramApiId: z.number().int().positive().nullish(),
  telegramApiHash: z.string().trim().regex(/^([a-f0-9]{32})?$/, "api_hash 32 belgili (0-9, a-f) bo'lishi kerak").optional(),
  instagramAppId: z.string().trim().regex(/^\d*$/, 'App ID faqat raqamlardan iborat').optional(),
  instagramAppSecret: z.string().trim().optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'users.manage')
  const body = await parseBody(event, schema)
  await updateIntegrations(body)
  // New Telegram credentials: reconnect every saved profile with them.
  if (body.telegramApiId || body.telegramApiHash) {
    const profiles = await ChannelModel.find({ type: 'telegram', active: true }).select('_id').lean()
    for (const p of profiles) await startTelegramProfile(p._id as Types.ObjectId)
  }
  return ok(null)
})
