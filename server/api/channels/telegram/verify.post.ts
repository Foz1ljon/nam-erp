import { z } from 'zod'

const schema = z.object({
  loginId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{4,8}$/, 'Kod faqat raqamlardan iborat').optional(),
  password: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  return ok(await telegramVerify(me.oid, await parseBody(event, schema)))
})
