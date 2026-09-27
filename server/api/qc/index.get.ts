import { z } from 'zod'
import { STAGES } from '../../../shared/utils/stages'

const query = dateRangeQuery.extend({ stage: z.enum(STAGES).optional() })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'qc.manage', 'production.view', 'reports.view')
  const { stage, ...range } = parseQuery(event, query)
  const filter: Record<string, unknown> = {}
  if (stage) filter.stage = stage
  const created = dateFilter(range)
  if (created) filter.createdAt = created
  const rows = await QcInspectionModel.find(filter).sort({ createdAt: -1 }).limit(500).populate(QC_POPULATE).lean()
  return ok(rows)
})
