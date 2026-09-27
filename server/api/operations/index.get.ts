import { z } from 'zod'
import { QC_STATUSES } from '../../../shared/utils/constants'
import { STAGES } from '../../../shared/utils/stages'

const query = dateRangeQuery.extend({
  stage: z.enum(STAGES).optional(),
  worker: objectId.optional(),
  qcStatus: z.enum(QC_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(300),
})

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'production.view', 'reports.view')
  const { stage, worker, qcStatus, limit, ...range } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (stage) filter.stage = stage
  if (worker) filter.worker = worker
  if (qcStatus) filter.qcStatus = qcStatus
  const created = dateFilter(range)
  if (created) filter.createdAt = created
  const rows = await OperationModel.find(filter).sort({ createdAt: -1 }).limit(limit).populate(OPERATION_POPULATE).lean()
  return ok(rows)
})
