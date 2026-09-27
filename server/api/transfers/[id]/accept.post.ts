import type { Types } from 'mongoose'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'transfers.use')
  const id = paramId(event)
  const current = await TransferModel.findById(id).lean()
  if (!current) notFound('Topshirish hujjati topilmadi')
  if (!canReceive(me, current)) conflict('Bu topshirishni faqat qabul qiluvchi tasdiqlaydi')

  // Status flip is the lock: only one request can move it out of "pending".
  const doc = await TransferModel.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'accepted', acceptedBy: me.oid, resolvedAt: new Date() },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict('Hujjat allaqachon yakunlangan')

  await applyMoves(
    doc.lines.map((l) => ({ item: l.item, location: doc.to, qty: l.qty })),
    { docType: 'transfer', docId: doc._id as Types.ObjectId, docNumber: doc.number, user: me.oid, note: 'Qabul qilindi' },
  )
  return ok({ _id: doc._id })
})
