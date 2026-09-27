import { z } from 'zod'

const schema = z.object({
  publicBaseUrl: z.string().trim().regex(/^(https:\/\/[^\s/]+(\/[^\s]*)?)?$/, "Manzil https:// bilan boshlanishi kerak").transform((v) => v.replace(/\/+$/, '')),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'users.manage')
  const body = await parseBody(event, schema)
  await SettingModel.updateOne({ _id: 'general' }, { $set: { 'value.publicBaseUrl': body.publicBaseUrl } }, { upsert: true })
  return ok(body)
})
