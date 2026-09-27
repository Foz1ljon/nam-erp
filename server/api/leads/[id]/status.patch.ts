import { z } from 'zod'
import { LEAD_STATUSES } from '../../../../shared/utils/constants'

const schema = z.object({ status: z.enum(LEAD_STATUSES), lostReason: z.string().trim().optional() })

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'crm.use')
  const body = await parseBody(event, schema)
  const doc = await LeadModel.findByIdAndUpdate(paramId(event), body, { returnDocument: 'after' }).lean()
  if (!doc) notFound('Lid topilmadi')
  return ok({ _id: doc._id, status: doc.status })
})
