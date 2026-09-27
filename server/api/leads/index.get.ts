import { z } from 'zod'
import { LEAD_STATUSES } from '../../../shared/utils/constants'

const query = z.object({ status: z.enum(LEAD_STATUSES).optional(), manager: objectId.optional(), q: z.string().trim().optional() })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const { status, manager, q } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (manager) filter.manager = manager
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ title: rx }, { contactName: rx }, { phone: rx }, { company: rx }]
  }
  return ok(await LeadModel.find(filter).sort({ updatedAt: -1 }).limit(1000).populate(LEAD_POPULATE).lean())
})
