import { Types } from 'mongoose'
import { z } from 'zod'
import { ITEM_TYPES } from '../../../shared/utils/constants'

const query = z.object({
  location: objectId.optional(),
  item: objectId.optional(),
  type: z.enum(ITEM_TYPES).optional(),
  includeZero: z.enum(['true', 'false']).optional(),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'stock.view', 'transfers.use', 'sales.manage')
  const { location, item, type, includeZero } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (location) filter.location = new Types.ObjectId(location)
  if (item) filter.item = new Types.ObjectId(item)
  if (includeZero !== 'true') filter.qty = { $gt: 0.0000001 }
  if (type) filter.item = { $in: await ItemModel.find({ type }).distinct('_id') }

  const rows = await StockModel.find(filter)
    .populate('item', `${ITEM_REF} minStock cost price`)
    .populate('location', LOCATION_REF)
    .lean()
  rows.sort((a, b) => {
    const la = (a.location as unknown as { order: number }).order - (b.location as unknown as { order: number }).order
    if (la !== 0) return la
    return (a.item as unknown as { code: string }).code.localeCompare((b.item as unknown as { code: string }).code)
  })
  return ok(rows)
})
