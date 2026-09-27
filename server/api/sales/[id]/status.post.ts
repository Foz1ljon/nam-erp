import { z } from 'zod'

const schema = z.object({ action: z.enum(['confirm', 'cancel', 'complete']) })

const TRANSITIONS = {
  confirm: { from: ['draft'], to: 'confirmed' },
  cancel: { from: ['draft', 'confirmed'], to: 'cancelled' },
  complete: { from: ['shipped'], to: 'completed' },
} as const

export default defineEventHandler(async (event) => {
  await requireAuth(event, 'sales.manage')
  const { action } = await parseBody(event, schema)
  const rule = TRANSITIONS[action]
  const doc = await SalesOrderModel.findOneAndUpdate(
    { _id: paramId(event), status: { $in: rule.from } },
    { status: rule.to },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict("Buyurtma holatini bu amal bilan o'zgartirib bo'lmaydi")
  if (action === 'cancel' && doc.lead) await LeadModel.updateOne({ _id: doc.lead, status: 'proposal' }, { status: 'qualified' })
  return ok({ _id: doc._id, status: doc.status })
})
