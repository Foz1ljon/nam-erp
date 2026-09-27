import { z } from 'zod'

const schema = userBase.extend({ password: z.string().min(6).optional().or(z.literal('')) })

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'users.manage')
  const id = paramId(event)
  const { password, ...body } = await parseBody(event, schema)
  if (await UserModel.exists({ username: body.username, _id: { $ne: id } })) conflict('Bu login band')
  if (me.oid.equals(id) && (!body.active || body.role !== 'admin')) conflict("O'zingizni bloklay yoki rolingizni o'zgartira olmaysiz")

  const update: Record<string, unknown> = { ...body }
  if (password) update.passwordHash = await hashPassword(password)
  const user = await UserModel.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean()
  if (!user) notFound('Foydalanuvchi topilmadi')
  return ok({ _id: user._id })
})
