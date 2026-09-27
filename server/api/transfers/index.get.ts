import { Types } from 'mongoose'
import { z } from 'zod'
import { TRANSFER_STATUSES } from '../../../shared/utils/constants'

const query = dateRangeQuery.extend({
  status: z.enum(TRANSFER_STATUSES).optional(),
  scope: z.enum(['incoming', 'outgoing', 'all']).default('all'),
})

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'transfers.use')
  const { status, scope, ...range } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  const created = dateFilter(range)
  if (created) filter.createdAt = created

  const myLocation = me.locationId ? new Types.ObjectId(me.locationId) : null
  const incoming = [{ receiver: me.oid }, ...(myLocation ? [{ to: myLocation, receiver: null }] : [])]
  const outgoing = [{ sender: me.oid }, ...(myLocation ? [{ from: myLocation }] : [])]
  const supervisor = SUPERVISOR_ROLES.includes(me.role)

  if (scope === 'incoming') filter.$or = incoming
  else if (scope === 'outgoing') filter.$or = outgoing
  else if (!supervisor) filter.$or = [...incoming, ...outgoing]

  const rows = await TransferModel.find(filter).sort({ createdAt: -1 }).limit(500).populate(TRANSFER_POPULATE).lean()
  return ok(rows)
})
