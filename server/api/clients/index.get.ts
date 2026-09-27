import { z } from 'zod'
import { CLIENT_KINDS, CLIENT_SEGMENTS } from '../../../shared/utils/constants'

const query = z.object({
  q: z.string().trim().optional(),
  kind: z.enum(CLIENT_KINDS).optional(),
  segment: z.enum(CLIENT_SEGMENTS).optional(),
  manager: objectId.optional(),
  debtOnly: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use', 'sales.view')
  const { q, kind, segment, manager, debtOnly } = parseQuery(event, query)
  const filter: Record<string, unknown> = { type: { $in: ['customer', 'both'] } }
  // Older records have no `kind`; they are treated as B2B.
  if (kind === 'b2b') filter.kind = { $in: ['b2b', null] }
  else if (kind) filter.kind = kind
  if (segment) filter.segment = segment
  if (manager) filter.manager = manager
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { legalName: rx }, { inn: rx }, { phone: rx }, { contactPerson: rx }, { region: rx }]
  }
  const clients = await CounterpartyModel.find(filter).sort({ name: 1 }).limit(2000).populate('manager', USER_REF).lean()
  const stats = await clientStats(clients.map((c) => c._id))
  let rows = clients.map((c) => ({ ...c, kind: c.kind ?? 'b2b', stats: stats(c._id) }))
  if (debtOnly === 'true') rows = rows.filter((r) => r.stats.debt > 0)
  return ok(rows)
})
