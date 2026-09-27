import { z } from 'zod'
import { SALES_STATUSES } from '../../../shared/utils/constants'

const query = dateRangeQuery.extend({ status: z.enum(SALES_STATUSES).optional(), customer: objectId.optional() })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'sales.view')
  const { status, customer, ...range } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (status) filter.status = status
  if (customer) filter.customer = customer
  const created = dateFilter(range)
  if (created) filter.createdAt = created
  return ok(await SalesOrderModel.find(filter).sort({ createdAt: -1 }).limit(500).populate(SALES_POPULATE).lean())
})
