import type { Types } from 'mongoose'

export default defineEventHandler(async (event) => {
  const me = await requireAuth(event, 'transfers.use')
  const id = paramId(event)
  const current = await TransferModel.findById(id).lean()
  if (!current) notFound('Topshirish hujjati topilmadi')
  if (!current.sender.equals(me.oid) && !SUPERVISOR_ROLES.includes(me.role)) conflict("Faqat jo'natuvchi bekor qila oladi")

  const doc = await TransferModel.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'cancelled', resolvedAt: new Date() },
    { returnDocument: 'after' },
  ).lean()
  if (!doc) conflict('Hujjat allaqachon yakunlangan')

  await applyMoves(
    doc.lines.map((l) => ({ item: l.item, location: doc.from, qty: l.qty })),
    { docType: 'transfer', docId: doc._id as Types.ObjectId, docNumber: doc.number, user: me.oid, note: 'Bekor qilindi' },
  )
  return ok({ _id: doc._id })
})
