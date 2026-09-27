import type { Types } from 'mongoose'
import { z } from 'zod'

const schema = z.object({ reason: z.string().trim().min(2, 'Sababni kiriting') })

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'transfers.use')
  const id = paramId(event)
  const { reason } = await parseBody(event, schema)
  const current = await TransferModel.findById(id).lean()
  if (!current) notFound('Topshirish hujjati topilmadi')
  if (!canReceive(me, current)) conflict('Bu topshirishni faqat qabul qiluvchi rad eta oladi')

  const doc = await TransferModel.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'rejected', acceptedBy: me.oid, rejectReason: reason, resolvedAt: new Date() },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict('Hujjat allaqachon yakunlangan')

  await applyMoves(
    doc.lines.map((l) => ({ item: l.item, location: doc.from, qty: l.qty })),
    { docType: 'transfer', docId: doc._id as Types.ObjectId, docNumber: doc.number, user: me.oid, note: `Rad etildi: ${reason}` },
  )
  return ok({ _id: doc._id })
})
