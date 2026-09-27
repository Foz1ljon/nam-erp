import { z } from 'zod'
import { COUNTERPARTY_TYPES } from '../../../shared/utils/constants'

const query = z.object({ type: z.enum(COUNTERPARTY_TYPES).optional(), q: z.string().trim().optional() })

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { type, q } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (type) filter.type = { $in: [type, 'both'] }
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { phone: rx }, { inn: rx }]
  }
  return ok(await CounterpartyModel.find(filter).sort({ name: 1 }).lean())
})
