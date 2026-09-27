import { z } from 'zod'

const schema = z.object({ text: z.string().trim().min(1).max(4000) })

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use', 'channels.use')
  const id = paramId(event)
  const conversation = await ConversationModel.findById(id).lean()
  if (!conversation) notFound('Suhbat topilmadi')
  if (!canAccessConversation(me, conversation)) throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Bu suhbat sizga biriktirilmagan' })
  const { text } = await parseBody(event, schema)
  const { message, error } = await sendToConversation(id, text, me.oid)
  if (error) conflict(`Xabar yuborilmadi: ${error}`)
  return ok({ _id: message._id })
})
