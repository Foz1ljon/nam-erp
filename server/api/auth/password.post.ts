import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Parol kamida 6 belgidan iborat bo'lishi kerak"),
})

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event)
  const body = await parseBody(event, schema)
  const user = await UserModel.findById(me.oid).select('+passwordHash')
  if (!user || !(await verifyPassword(user.passwordHash, body.currentPassword))) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: "Joriy parol noto'g'ri" })
  }
  user.passwordHash = await hashPassword(body.newPassword)
  await user.save()
  return ok(null)
})
