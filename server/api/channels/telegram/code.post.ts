import { z } from 'zod'

const schema = z.object({
  phone: z.string().trim().transform((v) => v.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+?\d{9,15}$/, "Telefon raqamini to'liq kiriting: +998901234567")),
})

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  const { phone } = await parseBody(event, schema)
  return ok(await telegramSendCode(me.oid, phone.startsWith('+') ? phone : `+${phone}`))
})
