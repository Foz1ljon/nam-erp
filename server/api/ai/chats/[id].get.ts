export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.use')
  const chat = await AiChatModel.findOne({ _id: paramId(event), user: me.oid }).lean()
  if (!chat) notFound('Suhbat topilmadi')
  return ok(chat)
})
