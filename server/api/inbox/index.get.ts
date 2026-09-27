import { z } from 'zod'

const query = z.object({ q: z.string().trim().optional(), channel: objectId.optional(), unread: z.enum(['true', 'false']).optional() })

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'crm.use', 'channels.use')
  const { q, channel, unread } = parseQuery(event, query)
  const filter: Record<string, unknown> = INBOX_SUPERVISORS.includes(me.role) ? {} : { manager: me.oid }
  if (channel) filter.channel = channel
  if (unread === 'true') filter.unread = { $gt: 0 }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ contactName: rx }, { contactUsername: rx }, { contactPhone: rx }, { lastMessageText: rx }]
  }
  return ok(await ConversationModel.find(filter).sort({ lastMessageAt: -1 }).limit(300).populate(CONVERSATION_POPULATE).lean())
})
