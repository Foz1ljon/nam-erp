import { z } from 'zod'
import { PRODUCT_UNIT_STATUSES } from '../../../shared/utils/constants'

const query = z.object({
  q: z.string().trim().optional(),
  status: z.enum(PRODUCT_UNIT_STATUSES).optional(),
  operation: objectId.optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const { q, status, operation } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (operation) filter.operation = operation
  if (q) filter.serial = new RegExp(escapeRegex(q), 'i')
  const units = await ProductUnitModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('item', ITEM_REF)
    .populate('operation', 'number')
    .populate('salesOrder', 'number')
    .lean()
  return ok(units)
})
