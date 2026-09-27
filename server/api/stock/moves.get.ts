import { Types } from 'mongoose'
import { z } from 'zod'
import { DOC_TYPES } from '../../../shared/utils/constants'

const query = dateRangeQuery.extend({
  location: objectId.optional(),
  item: objectId.optional(),
  docType: z.enum(DOC_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'stock.view')
  const { location, item, docType, page, pageSize, ...range } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (location) filter.location = new Types.ObjectId(location)
  if (item) filter.item = new Types.ObjectId(item)
  if (docType) filter.docType = docType
  const created = dateFilter(range)
  if (created) filter.createdAt = created

  const [items, total] = await Promise.all([
    StockMoveModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('item', ITEM_REF)
      .populate('location', LOCATION_REF)
      .populate('user', USER_REF)
      .lean(),
    StockMoveModel.countDocuments(filter),
  ])
  return ok({ items, total })
})
