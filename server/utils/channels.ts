import type { Types } from 'mongoose'
import { z } from 'zod'

export const channelUpdateSchema = z.object({
  greeting: z.string().trim().max(1000).optional(),
  capture: z.enum(['new_contacts', 'all']),
})

export async function loadOwnChannel(me: { oid: Types.ObjectId; role: string }, id: Types.ObjectId) {
  const channel = await ChannelModel.findById(id)
  if (!channel) notFound('Profil topilmadi')
  if (!INBOX_SUPERVISORS.includes(me.role) && !channel.owner.equals(me.oid)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Bu profil sizga tegishli emas' })
  }
  return channel
}
