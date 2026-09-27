export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.use')
  const id = paramId(event)
  const res = await AiChatModel.deleteOne({ _id: id, user: me.oid })
  if (!res.deletedCount) notFound('Suhbat topilmadi')
  await GeneratedFileModel.deleteMany({ chat: id, user: me.oid })
  return ok(null)
})
