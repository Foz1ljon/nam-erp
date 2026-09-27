export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'ai.use')
  return ok(await AiChatModel.find({ user: me.oid }).sort({ updatedAt: -1 }).limit(100).select('title updatedAt').lean())
})
