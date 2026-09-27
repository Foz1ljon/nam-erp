import { z } from 'zod'
import { ITEM_TYPES } from '../../../shared/utils/constants'

const query = z.object({
  type: z.union([z.enum(ITEM_TYPES), z.array(z.enum(ITEM_TYPES))]).optional(),
  q: z.string().trim().optional(),
  active: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { type, q, active } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (type) filter.type = Array.isArray(type) ? { $in: type } : type
  if (active) filter.active = active === 'true'
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i')
    filter.$or = [{ name: rx }, { code: rx }]
  }
  const items = await ItemModel.find(filter).sort({ type: 1, code: 1 }).populate('bom.component', ITEM_REF).lean()
  return ok(items)
})
