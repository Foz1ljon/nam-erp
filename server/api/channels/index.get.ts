export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'channels.use')
  const filter = INBOX_SUPERVISORS.includes(me.role) ? {} : { owner: me.oid }
  const [channels, counts] = await Promise.all([
    ChannelModel.find(filter).sort({ active: -1, createdAt: -1 }).populate('owner', USER_REF).lean(),
    ConversationModel.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$channel', n: { $sum: 1 } } }]),
  ])
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]))
  return ok(channels.map((c) => ({ ...c, conversations: countMap.get(String(c._id)) ?? 0 })))
})
