export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use', 'channels.use')
  const conversation = await ConversationModel.findById(paramId(event)).populate(CONVERSATION_POPULATE).lean()
  if (!conversation) notFound('Suhbat topilmadi')
  if (!canAccessConversation(me, { manager: (conversation.manager as unknown as { _id: import('mongoose').Types.ObjectId })._id })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Bu suhbat sizga biriktirilmagan' })
  }
  const messages = await ChatMessageModel.find({ conversation: conversation._id }).sort({ createdAt: -1 }).limit(300).populate('user', USER_REF).lean()
  if (conversation.unread) await ConversationModel.updateOne({ _id: conversation._id }, { unread: 0 })
  return ok({ conversation: { ...conversation, unread: 0 }, messages: messages.reverse() })
})
