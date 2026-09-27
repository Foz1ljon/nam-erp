export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use', 'channels.use')
  const match = INBOX_SUPERVISORS.includes(me.role) ? {} : { manager: me.oid }
  const [row] = await ConversationModel.aggregate<{ total: number }>([
    { $match: { ...match, unread: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: 1 } } },
  ])
  return ok({ conversations: row?.total ?? 0 })
})
